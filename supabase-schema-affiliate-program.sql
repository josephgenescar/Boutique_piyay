-- Apply after supabase-schema.sql, supabase-schema-vendor-applications.sql,
-- and supabase-schema-marketplace-ledger.sql.

CREATE OR REPLACE FUNCTION public.audit_marketplace_settings_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor uuid; v_entity text; v_entity_id text; v_action text;
BEGIN
  v_actor := NEW.updated_by;
  v_entity := TG_TABLE_NAME;
  v_action := CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END;
  IF TG_TABLE_NAME = 'payment_settings' THEN
    v_entity_id := 'payment_settings';
  ELSE
    v_entity_id := NEW.scope || ':' || NEW.scope_id;
  END IF;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, details)
  VALUES (v_actor, 'marketplace_' || v_entity || '_' || v_action, v_entity,
    v_entity_id, to_jsonb(NEW));
  RETURN NEW;
END;
$$;

ALTER TABLE public.payment_settings
  ALTER COLUMN default_commission_rate SET DEFAULT 0.0750,
  ALTER COLUMN default_affiliate_rate SET DEFAULT 0.1000;
UPDATE public.payment_settings
SET default_commission_rate = 0.0750,
    default_affiliate_rate = 0.1000
WHERE id = true;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_fee_allocation_check,
  DROP CONSTRAINT IF EXISTS order_items_commission_amount_nonnegative,
  DROP CONSTRAINT IF EXISTS order_items_affiliate_amount_nonnegative,
  DROP CONSTRAINT IF EXISTS order_items_supplier_net_nonnegative;
DO $$
DECLARE constraint_row record;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) LIKE '%line_total = commission_amount + supplier_net%'
        OR pg_get_constraintdef(oid) LIKE '%affiliate_amount <= commission_amount%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END;
$$;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_fee_allocation_check
    CHECK (line_total = commission_amount + affiliate_amount + supplier_net),
  ADD CONSTRAINT order_items_commission_amount_nonnegative CHECK (commission_amount >= 0),
  ADD CONSTRAINT order_items_affiliate_amount_nonnegative CHECK (affiliate_amount >= 0),
  ADD CONSTRAINT order_items_supplier_net_nonnegative CHECK (supplier_net >= 0);

CREATE OR REPLACE FUNCTION public.allocate_marketplace_item_commissions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE v_affiliate_rate numeric(7,4);
BEGIN
  SELECT default_affiliate_rate INTO v_affiliate_rate
  FROM public.payment_settings WHERE id = true;
  v_affiliate_rate := COALESCE(v_affiliate_rate, 0.10);
  NEW.affiliate_rate := CASE WHEN NEW.affiliate_id IS NULL THEN 0 ELSE v_affiliate_rate END;
  NEW.affiliate_amount := CASE
    WHEN NEW.affiliate_id IS NULL THEN 0
    ELSE round(NEW.line_total * v_affiliate_rate, 2)
  END;
  NEW.supplier_net := NEW.line_total - NEW.commission_amount - NEW.affiliate_amount;
  IF NEW.supplier_net < 0 THEN
    RAISE EXCEPTION 'Platform and affiliate fees exceed the product amount';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS allocate_marketplace_item_commissions ON public.order_items;
CREATE TRIGGER allocate_marketplace_item_commissions
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.allocate_marketplace_item_commissions();

CREATE OR REPLACE FUNCTION public.sync_order_affiliate_commission()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.orders
  SET affiliate_commission = (
    SELECT COALESCE(sum(affiliate_amount), 0)
    FROM public.order_items WHERE order_id = NEW.order_id
  )
  WHERE id = NEW.order_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_order_affiliate_commission ON public.order_items;
CREATE TRIGGER sync_order_affiliate_commission
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_affiliate_commission();

ALTER TABLE public.ledger_entries
  DROP CONSTRAINT IF EXISTS ledger_entries_entry_type_check;
ALTER TABLE public.ledger_entries
  ADD CONSTRAINT ledger_entries_entry_type_check
  CHECK (entry_type IN ('sale', 'commission', 'affiliate_commission', 'vendor_referral_commission', 'supplier_credit', 'payout', 'refund', 'adjustment'));

CREATE OR REPLACE FUNCTION public.normalize_marketplace_commission_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.entry_type = 'commission' AND NEW.order_item_id IS NOT NULL THEN
    SELECT commission_amount INTO NEW.amount
    FROM public.order_items WHERE id = NEW.order_item_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS normalize_marketplace_commission_entry ON public.ledger_entries;
CREATE TRIGGER normalize_marketplace_commission_entry
  BEFORE INSERT ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.normalize_marketplace_commission_entry();

CREATE OR REPLACE FUNCTION public.record_platform_commission_for_affiliate()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.item_status = 'paid'
    AND OLD.item_status IS DISTINCT FROM NEW.item_status
    AND NEW.affiliate_id IS NOT NULL
    AND NEW.affiliate_amount >= NEW.commission_amount
    AND NEW.commission_amount > 0 THEN
    INSERT INTO public.ledger_entries(
      entry_type, account_type, account_id, order_id, order_item_id,
      amount, status, idempotency_key, note
    )
    VALUES (
      'commission', 'platform', NULL, NEW.order_id, NEW.id,
      NEW.commission_amount, 'available', 'commission:' || NEW.id,
      'Platform commission separate from affiliate commission'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS record_platform_commission_for_affiliate ON public.order_items;
CREATE TRIGGER record_platform_commission_for_affiliate
  AFTER UPDATE OF item_status ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.record_platform_commission_for_affiliate();

CREATE OR REPLACE FUNCTION public.request_marketplace_payout(
  p_account_type text, p_account_id uuid, p_amount numeric, p_method text, p_destination text, p_actor_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_min numeric(12,2); v_balance numeric(12,2); v_request uuid := gen_random_uuid(); v_locked uuid;
BEGIN
  IF p_amount <= 0 OR p_amount <> round(p_amount, 2) THEN RAISE EXCEPTION 'Invalid payout amount'; END IF;
  SELECT minimum_payout INTO v_min FROM payment_settings WHERE id = true;
  IF p_amount < COALESCE(v_min, 100) THEN RAISE EXCEPTION 'Below minimum payout'; END IF;
  IF p_method NOT IN ('moncash', 'natcash', 'bank') OR length(trim(p_destination)) < 4 THEN RAISE EXCEPTION 'Invalid payout destination'; END IF;

  IF p_account_type = 'supplier' THEN
    SELECT id INTO v_locked FROM profiles WHERE id = p_account_id FOR UPDATE;
    SELECT COALESCE(sum(l.amount), 0) INTO v_balance FROM ledger_entries l
      LEFT JOIN LATERAL (SELECT status FROM ledger_entry_events WHERE ledger_entry_id=l.id ORDER BY created_at DESC, id DESC LIMIT 1) e ON true
      WHERE l.account_type='supplier' AND l.account_id=p_account_id AND l.entry_type IN ('supplier_credit','payout')
        AND (COALESCE(e.status,l.status)='available' OR (l.entry_type='payout' AND COALESCE(e.status,l.status)='paid'));
    IF v_locked IS NULL THEN RAISE EXCEPTION 'Supplier not found'; END IF;
  ELSIF p_account_type = 'affiliate' THEN
    SELECT user_id INTO v_locked FROM affiliates WHERE id = p_account_id FOR UPDATE;
    SELECT COALESCE(sum(l.amount), 0) INTO v_balance FROM ledger_entries l
      LEFT JOIN LATERAL (SELECT status FROM ledger_entry_events WHERE ledger_entry_id=l.id ORDER BY created_at DESC, id DESC LIMIT 1) e ON true
      WHERE l.account_type='affiliate' AND l.account_id=p_account_id
        AND l.entry_type IN ('affiliate_commission','vendor_referral_commission','payout')
        AND (COALESCE(e.status,l.status)='available' OR (l.entry_type='payout' AND COALESCE(e.status,l.status)='paid'));
    IF v_locked IS NULL THEN RAISE EXCEPTION 'Affiliate not found'; END IF;
  ELSE RAISE EXCEPTION 'Invalid account type'; END IF;
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient available balance'; END IF;

  INSERT INTO payout_requests(id, account_type, supplier_id, affiliate_id, amount, method, destination)
  VALUES (v_request, p_account_type, CASE WHEN p_account_type='supplier' THEN p_account_id END,
    CASE WHEN p_account_type='affiliate' THEN p_account_id END, p_amount, p_method, trim(p_destination));
  INSERT INTO ledger_entries(entry_type, account_type, account_id, payout_request_id, amount, status, idempotency_key, note)
  VALUES ('payout', p_account_type, p_account_id, v_request, -p_amount, 'available', 'payout:owner:'||v_request, 'Payout requested; balance reserved'),
    ('payout', 'platform', NULL, v_request, p_amount, 'available', 'payout:platform:'||v_request, 'Platform payout clearing entry');
  INSERT INTO audit_log(actor_id,action,entity_type,entity_id,details)
    VALUES (p_actor_id,'payout_requested','payout',v_request::text,
      jsonb_build_object('account_type',p_account_type,'account_id',p_account_id,'amount',p_amount,'method',p_method));
  RETURN v_request;
END;
$$;
REVOKE ALL ON FUNCTION public.request_marketplace_payout(text,uuid,numeric,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_marketplace_payout(text,uuid,numeric,text,text,uuid) TO service_role;

ALTER TABLE public.vendor_applications
  ADD COLUMN IF NOT EXISTS referred_by_affiliate_id uuid REFERENCES public.affiliates(id);

CREATE OR REPLACE FUNCTION public.capture_vendor_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_affiliate_id uuid;
BEGIN
  IF NEW.raw_user_meta_data ->> 'role' = 'seller' THEN
    SELECT affiliate.id INTO v_affiliate_id
    FROM public.affiliates AS affiliate
    WHERE affiliate.referral_code = NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'referral_code'), '')
    LIMIT 1;
    IF v_affiliate_id IS NOT NULL THEN
      UPDATE public.vendor_applications
      SET referred_by_affiliate_id = v_affiliate_id
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_vendor_referral() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS zzzzzzzzzzzzzzzzzzzzzzzz_vendor_referral ON auth.users;
CREATE TRIGGER zzzzzzzzzzzzzzzzzzzzzzzz_vendor_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.capture_vendor_referral();

CREATE TABLE IF NOT EXISTS public.vendor_registration_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.vendor_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id text NOT NULL UNIQUE,
  expected_amount numeric(12,2) NOT NULL DEFAULT 1000 CHECK (expected_amount = 1000),
  currency text NOT NULL DEFAULT 'HTG' CHECK (currency = 'HTG'),
  status text NOT NULL DEFAULT 'creating'
    CHECK (status IN ('creating', 'pending', 'paid', 'refund_due', 'refunded', 'failed')),
  payment_url text,
  provider_transaction_id text UNIQUE,
  refund_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendor_registration_payment_application
  ON public.vendor_registration_payments(application_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_registration_one_open_payment
  ON public.vendor_registration_payments(application_id)
  WHERE status IN ('creating', 'pending');

ALTER TABLE public.vendor_registration_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendor_registration_payments FROM PUBLIC, anon;
GRANT SELECT ON public.vendor_registration_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.vendor_registration_payments TO service_role;
DROP POLICY IF EXISTS "Admins can view vendor registration payments" ON public.vendor_registration_payments;
CREATE POLICY "Admins can view vendor registration payments"
  ON public.vendor_registration_payments
  FOR SELECT TO authenticated
  USING (public.is_boutique_admin());

CREATE OR REPLACE FUNCTION public.confirm_vendor_registration_payment(
  p_order_id text, p_provider_transaction_id text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_payment public.vendor_registration_payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment
  FROM public.vendor_registration_payments
  WHERE order_id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor registration payment not found'; END IF;
  IF v_payment.status = 'paid' AND v_payment.provider_transaction_id = p_provider_transaction_id THEN RETURN; END IF;
  IF v_payment.status <> 'pending' THEN RAISE EXCEPTION 'Vendor registration payment is not pending'; END IF;
  IF v_payment.expected_amount <> 1000 OR length(trim(COALESCE(p_provider_transaction_id, ''))) < 4 THEN
    RAISE EXCEPTION 'Vendor registration payment details are invalid';
  END IF;
  UPDATE public.vendor_registration_payments
  SET status = 'paid', provider_transaction_id = trim(p_provider_transaction_id),
      paid_at = now(), updated_at = now()
  WHERE id = v_payment.id;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_vendor_registration_payment(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_vendor_registration_payment(text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.review_vendor_application(
  p_application_id uuid,
  p_status text,
  p_admin_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  application_row public.vendor_applications%ROWTYPE;
  latest_payment public.vendor_registration_payments%ROWTYPE;
BEGIN
  IF NOT public.is_boutique_admin() THEN
    RAISE EXCEPTION 'Only administrators can review vendor applications.';
  END IF;
  IF p_status NOT IN ('approved', 'needs_info', 'rejected') THEN
    RAISE EXCEPTION 'Invalid vendor application status.';
  END IF;

  SELECT * INTO application_row
  FROM public.vendor_applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Vendor application not found.'; END IF;
  IF application_row.status IN ('approved', 'rejected') AND application_row.status <> p_status THEN
    RAISE EXCEPTION 'A final vendor decision cannot be changed.';
  END IF;

  SELECT * INTO latest_payment
  FROM public.vendor_registration_payments
  WHERE application_id = p_application_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF p_status = 'approved' AND (
    latest_payment.id IS NULL
    OR latest_payment.status <> 'paid'
    OR latest_payment.expected_amount <> 1000
  ) THEN
    RAISE EXCEPTION 'The 1,000 HTG vendor registration fee must be verified before approval.';
  END IF;

  UPDATE public.vendor_applications
  SET status = p_status,
      admin_message = NULLIF(BTRIM(p_admin_message), ''),
      reviewed_at = pg_catalog.now(),
      reviewed_by = auth.uid()
  WHERE id = p_application_id;

  IF p_status = 'rejected' AND latest_payment.status = 'paid' THEN
    UPDATE public.vendor_registration_payments
    SET status = 'refund_due', updated_at = now()
    WHERE id = latest_payment.id;
  END IF;

  UPDATE auth.users
  SET banned_until = CASE
    WHEN p_status = 'approved' THEN NULL
    ELSE pg_catalog.now() + interval '100 years'
  END
  WHERE id = application_row.user_id;

  IF p_status = 'approved' THEN
    UPDATE public.profiles
    SET role = 'seller', is_active_seller = true
    WHERE id = application_row.user_id;

    IF application_row.referred_by_affiliate_id IS NOT NULL THEN
      INSERT INTO public.ledger_entries(
        entry_type, account_type, account_id, amount, status, idempotency_key, note
      )
      VALUES (
        'vendor_referral_commission', 'affiliate', application_row.referred_by_affiliate_id,
        250, 'available', 'vendor-referral:' || application_row.id,
        '250 HTG commission for an approved vendor with verified 1,000 HTG registration payment'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  ELSE
    UPDATE public.profiles
    SET role = 'pending_seller', is_active_seller = false
    WHERE id = application_row.user_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_vendor_application(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_vendor_application(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_vendor_registration_refunded(
  p_payment_id uuid, p_refund_reference text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_boutique_admin() THEN RAISE EXCEPTION 'Only administrators can record a vendor refund'; END IF;
  IF length(trim(COALESCE(p_refund_reference, ''))) < 4 THEN RAISE EXCEPTION 'Refund reference is required'; END IF;
  UPDATE public.vendor_registration_payments
  SET status = 'refunded', refund_reference = trim(p_refund_reference),
      refunded_at = now(), updated_at = now()
  WHERE id = p_payment_id AND status = 'refund_due';
  IF NOT FOUND THEN RAISE EXCEPTION 'No pending vendor refund was found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_vendor_registration_refunded(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_vendor_registration_refunded(uuid,text) TO authenticated;
