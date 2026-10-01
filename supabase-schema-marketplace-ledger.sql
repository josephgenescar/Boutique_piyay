-- Marketplace payment and accounting foundation. Apply after supabase-schema.sql.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_group_id_key;
CREATE INDEX IF NOT EXISTS idx_orders_order_group_id_nonunique ON public.orders(order_group_id);

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS total_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_proof_path text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS order_status text DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider_transaction_id_unique
  ON public.orders(provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_payment_review
  ON public.orders(payment_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  moncash_number text,
  moncash_qr_url text,
  natcash_number text,
  natcash_qr_url text,
  payment_expiry_hours integer NOT NULL DEFAULT 24 CHECK (payment_expiry_hours BETWEEN 1 AND 168),
  refund_hold_days integer NOT NULL DEFAULT 5 CHECK (refund_hold_days BETWEEN 0 AND 90),
  minimum_payout numeric(12,2) NOT NULL DEFAULT 100 CHECK (minimum_payout >= 0),
  default_commission_rate numeric(7,4) NOT NULL DEFAULT 0.1500 CHECK (default_commission_rate BETWEEN 0 AND 1),
  default_affiliate_rate numeric(7,4) NOT NULL DEFAULT 0.1000 CHECK (default_affiliate_rate BETWEEN 0 AND 1),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);
INSERT INTO public.payment_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.commission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('category', 'product', 'supplier')),
  scope_id text NOT NULL,
  commission_rate numeric(7,4) NOT NULL CHECK (commission_rate BETWEEN 0 AND 1),
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, scope_id)
);

CREATE TABLE IF NOT EXISTS public.marketplace_payments (
  order_group_id text PRIMARY KEY,
  payment_reference text NOT NULL UNIQUE,
  payment_method text NOT NULL CHECK (payment_method IN ('moncash', 'natcash', 'cash')),
  expected_amount numeric(12,2) NOT NULL CHECK (expected_amount > 0),
  currency text NOT NULL DEFAULT 'HTG',
  customer_id uuid REFERENCES public.profiles(id),
  customer_phone text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending_payment'
    CHECK (payment_status IN ('pending_payment', 'pending_verification', 'paid', 'failed', 'expired', 'refunded')),
  provider_transaction_id text UNIQUE,
  payment_proof_path text,
  expires_at timestamptz NOT NULL,
  paid_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.order_creation_requests (
  idempotency_key text PRIMARY KEY,
  request_fingerprint text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_payments_transaction_casefold
  ON public.marketplace_payments(lower(provider_transaction_id)) WHERE provider_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  order_group_id text NOT NULL REFERENCES public.marketplace_payments(order_group_id),
  product_id uuid NOT NULL REFERENCES public.user_products(id),
  supplier_id uuid NOT NULL REFERENCES public.profiles(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(12,2) NOT NULL CHECK (line_total >= 0),
  commission_rate numeric(7,4) NOT NULL,
  commission_amount numeric(12,2) NOT NULL,
  affiliate_id uuid REFERENCES public.affiliates(id),
  affiliate_rate numeric(7,4) NOT NULL DEFAULT 0,
  affiliate_amount numeric(12,2) NOT NULL DEFAULT 0,
  supplier_net numeric(12,2) NOT NULL,
  item_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (line_total = commission_amount + supplier_net),
  CHECK (affiliate_amount <= commission_amount)
);
CREATE INDEX IF NOT EXISTS idx_order_items_supplier ON public.order_items(supplier_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_group ON public.order_items(order_group_id);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL CHECK (entry_type IN ('sale', 'commission', 'affiliate_commission', 'supplier_credit', 'payout', 'refund', 'adjustment')),
  account_type text NOT NULL CHECK (account_type IN ('platform', 'supplier', 'affiliate')),
  account_id uuid,
  order_id uuid REFERENCES public.orders(id),
  order_item_id uuid REFERENCES public.order_items(id),
  payout_request_id uuid,
  reversal_of uuid REFERENCES public.ledger_entries(id),
  amount numeric(12,2) NOT NULL CHECK (amount <> 0),
  status text NOT NULL CHECK (status IN ('pending', 'available', 'paid', 'reversed')),
  idempotency_key text NOT NULL UNIQUE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS reversal_of uuid REFERENCES public.ledger_entries(id);
CREATE INDEX IF NOT EXISTS idx_ledger_account_status ON public.ledger_entries(account_type, account_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_order ON public.ledger_entries(order_id, order_item_id);

CREATE TABLE IF NOT EXISTS public.ledger_entry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_entry_id uuid NOT NULL REFERENCES public.ledger_entries(id),
  status text NOT NULL CHECK (status IN ('pending', 'available', 'paid', 'reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  note text
);
CREATE INDEX IF NOT EXISTS idx_ledger_events_latest ON public.ledger_entry_events(ledger_entry_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_event_refund_hold_once
  ON public.ledger_entry_events(ledger_entry_id) WHERE note = 'Refund hold elapsed';

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type text NOT NULL DEFAULT 'supplier' CHECK (account_type IN ('supplier', 'affiliate')),
  supplier_id uuid REFERENCES public.profiles(id),
  affiliate_id uuid REFERENCES public.affiliates(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('moncash', 'natcash', 'bank')),
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'paid', 'rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_by uuid REFERENCES public.profiles(id),
  processed_at timestamptz,
  payment_reference text,
  note text,
  CHECK ((account_type = 'supplier' AND supplier_id IS NOT NULL AND affiliate_id IS NULL)
      OR (account_type = 'affiliate' AND affiliate_id IS NOT NULL AND supplier_id IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_payout_requests_supplier ON public.payout_requests(supplier_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status, requested_at DESC);
ALTER TABLE public.ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_payout_request_id_fkey;
ALTER TABLE public.ledger_entries ADD CONSTRAINT ledger_entries_payout_request_id_fkey
  FOREIGN KEY (payout_request_id) REFERENCES public.payout_requests(id);

CREATE TABLE IF NOT EXISTS public.supplier_payout_settings (
  supplier_id uuid PRIMARY KEY REFERENCES public.profiles(id),
  method text NOT NULL CHECK (method IN ('moncash', 'natcash', 'bank')),
  account_name text NOT NULL,
  account_number text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_payout_settings (
  affiliate_id uuid PRIMARY KEY REFERENCES public.affiliates(id),
  method text NOT NULL CHECK (method IN ('moncash', 'natcash', 'bank')),
  account_name text NOT NULL,
  account_number text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.audit_marketplace_settings_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor uuid; v_entity text; v_action text;
BEGIN
  v_actor := NEW.updated_by;
  v_entity := TG_TABLE_NAME;
  v_action := CASE WHEN TG_OP='INSERT' THEN 'created' ELSE 'updated' END;
  INSERT INTO audit_log(actor_id,action,entity_type,entity_id,details)
  VALUES (v_actor,'marketplace_'||v_entity||'_'||v_action,v_entity,
    CASE WHEN TG_TABLE_NAME='payment_settings' THEN 'payment_settings' ELSE NEW.scope||':'||NEW.scope_id END,
    to_jsonb(NEW));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS audit_payment_settings_change ON public.payment_settings;
CREATE TRIGGER audit_payment_settings_change AFTER UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_marketplace_settings_change();
DROP TRIGGER IF EXISTS audit_commission_settings_change ON public.commission_settings;
CREATE TRIGGER audit_commission_settings_change AFTER INSERT OR UPDATE ON public.commission_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_marketplace_settings_change();

CREATE OR REPLACE FUNCTION public.reject_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only';
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_legacy_money_balances()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='affiliates' AND current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance THEN RAISE EXCEPTION 'Affiliate balances are ledger managed'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_wallet_balance ON public.profiles;
DROP TRIGGER IF EXISTS protect_affiliate_balance ON public.affiliates;
CREATE TRIGGER protect_affiliate_balance BEFORE UPDATE OF balance ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.protect_legacy_money_balances();
DROP TRIGGER IF EXISTS ledger_entries_append_only ON public.ledger_entries;
CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.reject_ledger_mutation();
DROP TRIGGER IF EXISTS ledger_entry_events_append_only ON public.ledger_entry_events;
CREATE TRIGGER ledger_entry_events_append_only
  BEFORE UPDATE OR DELETE ON public.ledger_entry_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_ledger_mutation();

CREATE OR REPLACE VIEW public.supplier_balances WITH (security_invoker = true) AS
WITH current_status AS (
  SELECT DISTINCT ON (e.ledger_entry_id) e.ledger_entry_id, e.status
  FROM public.ledger_entry_events e ORDER BY e.ledger_entry_id, e.created_at DESC, e.id DESC
), entries AS (
  SELECT l.account_id AS supplier_id,
    COALESCE(s.status, l.status) AS current_status,
    l.entry_type, l.amount
  FROM public.ledger_entries l
  LEFT JOIN current_status s ON s.ledger_entry_id = l.id
  WHERE l.account_type = 'supplier'
)
SELECT supplier_id,
  COALESCE(SUM(amount) FILTER (WHERE current_status = 'pending'), 0)::numeric(12,2) AS pending_balance,
  COALESCE(SUM(amount) FILTER (WHERE current_status = 'available' OR (entry_type='payout' AND current_status='paid')), 0)::numeric(12,2) AS available_balance,
  COALESCE(-SUM(amount) FILTER (WHERE entry_type = 'payout' AND current_status = 'paid'), 0)::numeric(12,2) AS total_paid_out
FROM entries GROUP BY supplier_id;

CREATE OR REPLACE VIEW public.ledger_reporting WITH (security_invoker = true) AS
SELECT l.id, l.entry_type, l.account_type, l.account_id, l.order_id, l.order_item_id,
  l.payout_request_id, l.reversal_of, original.entry_type AS reverses_entry_type, l.amount, l.status,
  COALESCE(latest.status, l.status) AS effective_status,
  COALESCE(mp.payment_method, pr.method) AS method,
  l.created_at, l.note
FROM public.ledger_entries l
LEFT JOIN LATERAL (
  SELECT e.status FROM public.ledger_entry_events e WHERE e.ledger_entry_id=l.id
  ORDER BY e.created_at DESC, e.id DESC LIMIT 1
) latest ON true
LEFT JOIN public.order_items oi ON oi.id=l.order_item_id
LEFT JOIN public.marketplace_payments mp ON mp.order_group_id=oi.order_group_id
LEFT JOIN public.payout_requests pr ON pr.id=l.payout_request_id
LEFT JOIN public.ledger_entries original ON original.id=l.reversal_of;

CREATE OR REPLACE VIEW public.affiliate_balances WITH (security_invoker = true) AS
WITH current_status AS (
  SELECT DISTINCT ON (e.ledger_entry_id) e.ledger_entry_id, e.status
  FROM public.ledger_entry_events e ORDER BY e.ledger_entry_id, e.created_at DESC, e.id DESC
), entries AS (
  SELECT l.account_id AS affiliate_id, COALESCE(s.status,l.status) AS current_status, l.entry_type, l.amount
  FROM public.ledger_entries l LEFT JOIN current_status s ON s.ledger_entry_id=l.id
  WHERE l.account_type='affiliate'
)
SELECT affiliate_id,
  COALESCE(sum(amount) FILTER (WHERE current_status='pending'),0)::numeric(12,2) AS pending_balance,
  COALESCE(sum(amount) FILTER (WHERE current_status='available' OR (entry_type='payout' AND current_status='paid')),0)::numeric(12,2) AS available_balance,
  COALESCE(-sum(amount) FILTER (WHERE entry_type='payout' AND current_status='paid'),0)::numeric(12,2) AS total_paid_out
FROM entries GROUP BY affiliate_id;

CREATE OR REPLACE FUNCTION public.create_marketplace_order(
  p_items jsonb, p_customer_name text, p_customer_phone text, p_customer_email text,
  p_delivery_zone text, p_delivery_address text, p_payment_method text,
  p_referral_code text DEFAULT NULL, p_customer_id uuid DEFAULT NULL, p_idempotency_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_group text := 'BP-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 10));
  v_expiry integer;
  v_default_rate numeric(7,4);
  v_default_affiliate_rate numeric(7,4);
  v_affiliate uuid;
  v_aff_rate numeric(7,4) := 0;
  v_method text := lower(p_payment_method);
  v_line record;
  v_order_id uuid;
  v_rate numeric(7,4);
  v_total numeric(12,2) := 0;
  v_supplier_total numeric(12,2);
  v_commission numeric(12,2);
  v_affiliate_amount numeric(12,2);
  v_supplier_net numeric(12,2);
  v_items jsonb;
  v_result jsonb := '[]'::jsonb;
  v_fingerprint text;
  v_saved_fingerprint text;
  v_response jsonb;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'At least one product is required';
  END IF;
  IF v_method NOT IN ('moncash', 'natcash', 'cash') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  IF length(trim(p_customer_name)) < 2 OR length(trim(p_customer_phone)) < 7 THEN RAISE EXCEPTION 'Customer details are invalid'; END IF;
  IF p_customer_id IS NOT NULL AND p_customer_id <> auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Customer identity mismatch';
  END IF;
  IF length(COALESCE(p_idempotency_key,'')) < 16 OR length(p_idempotency_key) > 100 THEN
    RAISE EXCEPTION 'Valid idempotency key required';
  END IF;
  v_fingerprint := encode(digest(jsonb_build_object('items',p_items,'customer_name',p_customer_name,
    'customer_phone',p_customer_phone,'customer_email',p_customer_email,'delivery_zone',p_delivery_zone,
    'delivery_address',p_delivery_address,'payment_method',v_method,'referral_code',p_referral_code,
    'customer_id',p_customer_id)::text,'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));
  SELECT request_fingerprint, response INTO v_saved_fingerprint, v_response
    FROM order_creation_requests WHERE idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_saved_fingerprint <> v_fingerprint THEN RAISE EXCEPTION 'Idempotency key was reused for different checkout data'; END IF;
    RETURN v_response;
  END IF;

  SELECT payment_expiry_hours, default_commission_rate, default_affiliate_rate
  INTO v_expiry, v_default_rate, v_default_affiliate_rate FROM payment_settings WHERE id = true;
  v_expiry := COALESCE(v_expiry, 24);
  v_default_rate := COALESCE(v_default_rate, 0.15);
  v_default_affiliate_rate := COALESCE(v_default_affiliate_rate, 0.10);

  IF p_referral_code IS NOT NULL THEN
    SELECT id INTO v_affiliate FROM affiliates WHERE referral_code = p_referral_code LIMIT 1;
    IF v_affiliate IS NOT NULL THEN v_aff_rate := v_default_affiliate_rate; END IF;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _cart_lines (
    product_id uuid, supplier_id uuid, title text, category text, quantity integer,
    unit_price numeric(12,2), line_total numeric(12,2), commission_rate numeric(7,4),
    commission_amount numeric(12,2), affiliate_amount numeric(12,2), supplier_net numeric(12,2)
  ) ON COMMIT DROP;
  TRUNCATE _cart_lines;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF COALESCE((v_line.value->>'quantity')::integer, 0) NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
    INSERT INTO _cart_lines (product_id, supplier_id, title, category, quantity, unit_price, line_total,
      commission_rate, commission_amount, affiliate_amount, supplier_net)
    SELECT p.id, p.seller_id, p.title, p.category, (v_line.value->>'quantity')::integer,
      p.price::numeric(12,2), round(p.price * (v_line.value->>'quantity')::integer, 2),
      COALESCE(product_rate.commission_rate, supplier_rate.commission_rate, category_rate.commission_rate, v_default_rate),
      0, 0, 0
    FROM user_products p
    LEFT JOIN commission_settings product_rate ON product_rate.scope = 'product' AND product_rate.scope_id = p.id::text
    LEFT JOIN commission_settings supplier_rate ON supplier_rate.scope = 'supplier' AND supplier_rate.scope_id = p.seller_id::text
    LEFT JOIN commission_settings category_rate ON category_rate.scope = 'category' AND category_rate.scope_id = p.category
    WHERE p.id = (v_line.value->>'product_id')::uuid AND p.is_approved = true
      AND p.seller_id IS NOT NULL AND p.stock >= (v_line.value->>'quantity')::integer
    FOR UPDATE OF p;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product unavailable or insufficient stock: %', v_line.value->>'product_id'; END IF;
    UPDATE _cart_lines c SET
      commission_amount = round(c.line_total * c.commission_rate, 2),
      affiliate_amount = round(c.line_total * c.commission_rate * v_aff_rate, 2),
      supplier_net = c.line_total - round(c.line_total * c.commission_rate, 2)
    WHERE c.product_id = (v_line.value->>'product_id')::uuid;
    UPDATE user_products SET stock = stock - (v_line.value->>'quantity')::integer WHERE id = (v_line.value->>'product_id')::uuid;
  END LOOP;

  SELECT round(sum(line_total), 2) INTO v_total FROM _cart_lines;
  INSERT INTO marketplace_payments(order_group_id, payment_reference, payment_method, expected_amount,
    customer_id, customer_phone, expires_at)
  VALUES (v_group, v_group, v_method, v_total, p_customer_id, p_customer_phone, now() + make_interval(hours => v_expiry));

  FOR v_line IN SELECT supplier_id, sum(line_total)::numeric(12,2) AS amount,
      jsonb_agg(jsonb_build_object('product_id', product_id, 'title', title, 'quantity', quantity, 'price', unit_price, 'line_total', line_total)) AS items
    FROM _cart_lines GROUP BY supplier_id
  LOOP
    v_order_id := gen_random_uuid();
    INSERT INTO orders(id, order_group_id, seller_id, product_id, buyer_id, product_title, customer_name,
      customer_email, customer_phone, amount, quantity, status, payment_method, payment_status, currency,
      shipping_address, delivery_zone, order_items, total_price, affiliate_id, referral_code,
      affiliate_commission, payment_reference, expires_at, order_status, total_amount)
    VALUES (v_order_id, v_group, v_line.supplier_id,
      CASE WHEN jsonb_array_length(v_line.items) = 1 THEN (v_line.items->0->>'product_id')::uuid END,
      p_customer_id, CASE WHEN jsonb_array_length(v_line.items) = 1 THEN v_line.items->0->>'title' ELSE 'Plizyè pwodwi' END,
      p_customer_name, p_customer_email, p_customer_phone, v_line.amount,
      (SELECT sum(quantity)::integer FROM _cart_lines WHERE supplier_id = v_line.supplier_id),
      'pending', v_method, 'pending_payment', 'HTG', p_delivery_address, p_delivery_zone,
      v_line.items, v_line.amount, v_affiliate, p_referral_code,
      (SELECT sum(affiliate_amount) FROM _cart_lines WHERE supplier_id = v_line.supplier_id),
      v_group, now() + make_interval(hours => v_expiry), 'pending', v_total);

    INSERT INTO order_items(order_id, order_group_id, product_id, supplier_id, quantity, unit_price,
      line_total, commission_rate, commission_amount, affiliate_id, affiliate_rate, affiliate_amount, supplier_net)
    SELECT v_order_id, v_group, product_id, supplier_id, quantity, unit_price, line_total, commission_rate,
      commission_amount, v_affiliate, v_aff_rate, affiliate_amount, supplier_net
    FROM _cart_lines WHERE supplier_id = v_line.supplier_id;
    v_result := v_result || jsonb_build_array(jsonb_build_object('id', v_order_id, 'seller_id', v_line.supplier_id, 'amount', v_line.amount));
  END LOOP;
  v_response := jsonb_build_object('order_group_id', v_group, 'payment_reference', v_group,
    'total_amount', v_total, 'currency', 'HTG', 'expires_at', now() + make_interval(hours => v_expiry), 'orders', v_result);
  INSERT INTO order_creation_requests(idempotency_key,request_fingerprint,response)
    VALUES (p_idempotency_key,v_fingerprint,v_response);
  RETURN v_response;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_manual_payment(
  p_order_group_id text, p_customer_phone text, p_provider_transaction_id text, p_payment_proof_path text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_payment marketplace_payments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM marketplace_payments WHERE order_group_id = p_order_group_id FOR UPDATE;
  IF NOT FOUND OR v_payment.customer_phone <> p_customer_phone THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_payment.payment_method NOT IN ('moncash', 'natcash') THEN RAISE EXCEPTION 'Payment cannot be submitted'; END IF;
  IF length(trim(p_provider_transaction_id)) < 4 THEN RAISE EXCEPTION 'Invalid transaction ID'; END IF;
  IF v_payment.payment_status='pending_verification' AND v_payment.provider_transaction_id=trim(p_provider_transaction_id) THEN RETURN; END IF;
  IF v_payment.payment_status <> 'pending_payment' THEN RAISE EXCEPTION 'Payment cannot be submitted'; END IF;
  IF v_payment.expires_at <= now() THEN
    UPDATE marketplace_payments SET payment_status = 'expired', updated_at = now() WHERE order_group_id = p_order_group_id;
    UPDATE orders SET payment_status = 'expired', status = 'expired' WHERE order_group_id = p_order_group_id;
    RAISE EXCEPTION 'Payment window expired';
  END IF;
  UPDATE marketplace_payments SET provider_transaction_id = trim(p_provider_transaction_id),
    payment_proof_path = p_payment_proof_path, payment_status = 'pending_verification', updated_at = now()
  WHERE order_group_id = p_order_group_id;
  UPDATE orders SET provider_transaction_id = trim(p_provider_transaction_id), payment_proof_path = p_payment_proof_path,
    payment_status = 'pending_verification', status = 'pending_verification', updated_at = now()
  WHERE id = (SELECT id FROM orders WHERE order_group_id = p_order_group_id ORDER BY created_at LIMIT 1);
  UPDATE orders SET payment_status = 'pending_verification', status = 'pending_verification', updated_at = now()
    WHERE order_group_id = p_order_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_marketplace_payment(
  p_order_group_id text, p_admin_id uuid, p_action text, p_reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_payment marketplace_payments%ROWTYPE; v_item record; v_order_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  SELECT * INTO v_payment FROM marketplace_payments WHERE order_group_id = p_order_group_id FOR UPDATE;
  IF NOT FOUND OR NOT (
    (v_payment.payment_status = 'pending_verification' AND v_payment.payment_method IN ('moncash', 'natcash'))
    OR (v_payment.payment_status = 'pending_payment' AND v_payment.payment_method = 'cash')
  ) THEN RAISE EXCEPTION 'Payment is not awaiting review'; END IF;
  IF p_action = 'reject' THEN
    IF length(trim(COALESCE(p_reason,''))) < 3 THEN RAISE EXCEPTION 'Rejection reason is required'; END IF;
    UPDATE marketplace_payments SET payment_status = 'failed', rejection_reason = p_reason, updated_at = now() WHERE order_group_id = p_order_group_id;
    UPDATE orders SET payment_status = 'failed', status = 'payment_failed', updated_at = now() WHERE order_group_id = p_order_group_id;
      UPDATE order_items SET item_status='failed' WHERE order_group_id=p_order_group_id;
    UPDATE user_products p SET stock=p.stock + totals.quantity
    FROM (SELECT product_id,sum(quantity)::integer quantity FROM order_items WHERE order_group_id=p_order_group_id GROUP BY product_id) totals
    WHERE p.id=totals.product_id;
    INSERT INTO audit_log(actor_id, action, entity_type, entity_id, details)
      VALUES (p_admin_id, 'payment_rejected', 'payment', p_order_group_id, jsonb_build_object('reason', p_reason));
    RETURN;
  END IF;
  IF p_action <> 'confirm' THEN RAISE EXCEPTION 'Invalid review action'; END IF;
  UPDATE marketplace_payments SET payment_status = 'paid', paid_at = now(), updated_at = now() WHERE order_group_id = p_order_group_id;
  UPDATE orders SET payment_status = 'paid',
    status = CASE WHEN order_status IN ('shipped','delivered') THEN order_status ELSE 'paid' END,
    order_status = CASE WHEN order_status IN ('shipped','delivered') THEN order_status ELSE 'paid' END,
    paid_at = now(), updated_at = now() WHERE order_group_id = p_order_group_id;
  UPDATE order_items SET item_status='paid' WHERE order_group_id=p_order_group_id;
  FOR v_item IN SELECT oi.*, o.id AS item_order_id FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE oi.order_group_id = p_order_group_id LOOP
    v_order_id := v_item.item_order_id;
    INSERT INTO ledger_entries(entry_type, account_type, account_id, order_id, order_item_id, amount, status, idempotency_key, note)
      VALUES ('sale', 'platform', NULL, v_order_id, v_item.id, -v_item.line_total, 'available', 'sale:'||v_item.id, 'Gross sale clearing entry');
    IF v_item.commission_amount - v_item.affiliate_amount > 0 THEN
      INSERT INTO ledger_entries(entry_type, account_type, account_id, order_id, order_item_id, amount, status, idempotency_key, note)
        VALUES ('commission', 'platform', NULL, v_order_id, v_item.id, v_item.commission_amount-v_item.affiliate_amount, 'available', 'commission:'||v_item.id, 'Platform commission net of affiliate share');
    END IF;
    IF v_item.supplier_net > 0 THEN
      INSERT INTO ledger_entries(entry_type, account_type, account_id, order_id, order_item_id, amount, status, idempotency_key, note)
        VALUES ('supplier_credit', 'supplier', v_item.supplier_id, v_order_id, v_item.id, v_item.supplier_net, 'pending', 'supplier:'||v_item.id, 'Held until delivery and refund window');
    END IF;
    IF v_item.affiliate_id IS NOT NULL AND v_item.affiliate_amount > 0 THEN
      INSERT INTO ledger_entries(entry_type, account_type, account_id, order_id, order_item_id, amount, status, idempotency_key, note)
        VALUES ('affiliate_commission', 'affiliate', v_item.affiliate_id, v_order_id, v_item.id, v_item.affiliate_amount, 'pending', 'affiliate:'||v_item.id, 'Held until delivery and refund window');
    END IF;
  END LOOP;
  INSERT INTO audit_log(actor_id, action, entity_type, entity_id, details)
    VALUES (p_admin_id, 'payment_confirmed', 'payment', p_order_group_id,
      jsonb_build_object('provider_transaction_id', v_payment.provider_transaction_id, 'amount', v_payment.expected_amount));
END;
$$;

CREATE OR REPLACE FUNCTION public.set_marketplace_order_status(p_order_id uuid, p_supplier_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_group text;
BEGIN
  IF p_status NOT IN ('shipped', 'delivered') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE orders SET order_status = p_status, status = p_status, updated_at = now()
    WHERE id = p_order_id AND seller_id = p_supplier_id
      AND ((p_status='shipped' AND order_status='paid' AND payment_status='paid')
        OR (p_status='shipped' AND order_status='pending' AND payment_method='cash' AND payment_status='pending_payment')
        OR (p_status='delivered' AND order_status='shipped' AND (payment_status='paid' OR (payment_method='cash' AND payment_status='pending_payment'))))
    RETURNING order_group_id INTO v_group;
  IF v_group IS NULL THEN RAISE EXCEPTION 'Order not found or unpaid'; END IF;
  UPDATE order_items SET item_status=p_status WHERE order_id=p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_marketplace_delivery(p_order_id uuid, p_customer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_group text;
BEGIN
  IF p_customer_id <> auth.uid() AND auth.role() <> 'service_role' THEN RAISE EXCEPTION 'Customer identity mismatch'; END IF;
  UPDATE orders SET order_status='delivered', status='delivered', updated_at=now()
    WHERE id=p_order_id AND buyer_id=p_customer_id AND order_status='shipped'
      AND (payment_status='paid' OR (payment_method='cash' AND payment_status='pending_payment'))
    RETURNING order_group_id INTO v_group;
  IF v_group IS NULL THEN RAISE EXCEPTION 'Order not found or not shipped'; END IF;
    UPDATE order_items SET item_status='delivered' WHERE order_id=p_order_id;
  INSERT INTO audit_log(actor_id,action,entity_type,entity_id,details)
    VALUES (p_customer_id,'delivery_confirmed','order',p_order_id::text,jsonb_build_object('order_group_id',v_group));
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_unpaid_marketplace_orders()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_count integer;
BEGIN
  WITH expired AS (
    UPDATE marketplace_payments SET payment_status='expired', updated_at=now()
    WHERE payment_status IN ('pending_payment','pending_verification') AND expires_at <= now()
    RETURNING order_group_id
  ), restored AS (
    UPDATE user_products p SET stock=p.stock + totals.quantity
    FROM (
      SELECT oi.product_id, sum(oi.quantity)::integer quantity
      FROM order_items oi JOIN expired e ON e.order_group_id=oi.order_group_id GROUP BY oi.product_id
    ) totals WHERE p.id=totals.product_id
    RETURNING p.id
  )
  UPDATE orders SET payment_status='expired', status='expired', order_status='expired', updated_at=now()
  WHERE order_group_id IN (SELECT order_group_id FROM expired);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_delivered_ledger_entries()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_days integer; v_count integer;
BEGIN
  SELECT refund_hold_days INTO v_days FROM payment_settings WHERE id = true;
  WITH released AS (
    INSERT INTO ledger_entry_events(ledger_entry_id, status, note)
    SELECT l.id, 'available', 'Refund hold elapsed'
    FROM ledger_entries l
    JOIN order_items oi ON oi.id = l.order_item_id
    JOIN orders o ON o.id = oi.order_id
    WHERE l.status = 'pending' AND l.account_type IN ('supplier', 'affiliate')
      AND o.order_status = 'delivered' AND o.updated_at <= now() - make_interval(days => COALESCE(v_days, 5))
      AND NOT EXISTS (SELECT 1 FROM ledger_entry_events e WHERE e.ledger_entry_id = l.id)
    ON CONFLICT DO NOTHING RETURNING id
  ) SELECT count(*) INTO v_count FROM released;
  RETURN v_count;
END;
$$;

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
      WHERE l.account_type='affiliate' AND l.account_id=p_account_id AND l.entry_type IN ('affiliate_commission','payout')
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

CREATE OR REPLACE FUNCTION public.review_marketplace_payout(
  p_request_id uuid, p_admin_id uuid, p_action text, p_payment_reference text DEFAULT NULL, p_note text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_request payout_requests%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id=p_admin_id AND role='admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  SELECT * INTO v_request FROM payout_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR v_request.status NOT IN ('requested','approved') THEN RAISE EXCEPTION 'Payout cannot be reviewed'; END IF;
  IF p_action='reject' THEN
    UPDATE payout_requests SET status='rejected', processed_by=p_admin_id, processed_at=now(), note=p_note WHERE id=p_request_id;
    INSERT INTO ledger_entry_events(ledger_entry_id,status,created_by,note)
      SELECT id,'reversed',p_admin_id,'Payout rejected; reservation released' FROM ledger_entries WHERE payout_request_id=p_request_id;
  ELSIF p_action='approve' THEN
    UPDATE payout_requests SET status='approved', processed_by=p_admin_id, note=p_note WHERE id=p_request_id;
  ELSIF p_action='paid' THEN
    IF p_payment_reference IS NULL OR length(trim(p_payment_reference)) < 3 THEN RAISE EXCEPTION 'Payment reference required'; END IF;
    UPDATE payout_requests SET status='paid', processed_by=p_admin_id, processed_at=now(), payment_reference=trim(p_payment_reference), note=p_note WHERE id=p_request_id;
    INSERT INTO ledger_entry_events(ledger_entry_id,status,created_by,note)
      SELECT id,'paid',p_admin_id,'Payout paid' FROM ledger_entries WHERE payout_request_id=p_request_id;
  ELSE RAISE EXCEPTION 'Invalid payout action'; END IF;
  INSERT INTO audit_log(actor_id,action,entity_type,entity_id,details)
    VALUES (p_admin_id,'payout_'||p_action,'payout',p_request_id::text,jsonb_build_object('amount',v_request.amount,'reference',p_payment_reference,'note',p_note));
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_marketplace_order(p_order_group_id text, p_admin_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_entry record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id=p_admin_id AND role='admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  UPDATE marketplace_payments SET payment_status='refunded', updated_at=now() WHERE order_group_id=p_order_group_id AND payment_status='paid';
  IF NOT FOUND THEN RAISE EXCEPTION 'Paid order not found'; END IF;
  UPDATE orders SET payment_status='refunded', status='refunded', order_status='cancelled', updated_at=now() WHERE order_group_id=p_order_group_id;
    UPDATE order_items SET item_status='refunded' WHERE order_group_id=p_order_group_id;
  FOR v_entry IN SELECT l.* FROM ledger_entries l JOIN order_items oi ON oi.id=l.order_item_id WHERE oi.order_group_id=p_order_group_id LOOP
    INSERT INTO ledger_entries(entry_type,account_type,account_id,order_id,order_item_id,reversal_of,amount,status,idempotency_key,note)
      VALUES ('refund',v_entry.account_type,v_entry.account_id,v_entry.order_id,v_entry.order_item_id,v_entry.id,-v_entry.amount,'reversed',
        'refund:'||v_entry.id,'Refund reversal: '||p_reason);
    INSERT INTO ledger_entry_events(ledger_entry_id,status,created_by,note) VALUES (v_entry.id,'reversed',p_admin_id,'Order refunded');
  END LOOP;
  INSERT INTO audit_log(actor_id,action,entity_type,entity_id,details)
    VALUES (p_admin_id,'order_refunded','order',p_order_group_id,jsonb_build_object('reason',p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.run_marketplace_ledger_jobs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public.expire_unpaid_marketplace_orders();
  PERFORM public.release_delivered_ledger_entries();
END;
$$;

ALTER TABLE public.marketplace_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_creation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.orders FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.orders TO anon, authenticated;

DROP POLICY IF EXISTS "supplier reads own order items" ON public.order_items;
CREATE POLICY "supplier reads own order items" ON public.order_items FOR SELECT TO authenticated
  USING (supplier_id = auth.uid());
DROP POLICY IF EXISTS "supplier reads own ledger" ON public.ledger_entries;
CREATE POLICY "supplier reads own ledger" ON public.ledger_entries FOR SELECT TO authenticated
  USING (account_type='supplier' AND account_id=auth.uid());
DROP POLICY IF EXISTS "affiliate reads own ledger" ON public.ledger_entries;
CREATE POLICY "affiliate reads own ledger" ON public.ledger_entries FOR SELECT TO authenticated
  USING (account_type='affiliate' AND account_id IN (SELECT id FROM public.affiliates WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "account owner reads payout requests" ON public.payout_requests;
CREATE POLICY "account owner reads payout requests" ON public.payout_requests FOR SELECT TO authenticated
  USING (supplier_id=auth.uid() OR affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "supplier manages own payout destination" ON public.supplier_payout_settings;
CREATE POLICY "supplier manages own payout destination" ON public.supplier_payout_settings FOR ALL TO authenticated
  USING (supplier_id=auth.uid()) WITH CHECK (supplier_id=auth.uid());
DROP POLICY IF EXISTS "affiliate manages own payout destination" ON public.affiliate_payout_settings;
CREATE POLICY "affiliate manages own payout destination" ON public.affiliate_payout_settings FOR ALL TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id=auth.uid()))
  WITH CHECK (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id=auth.uid()));
DROP POLICY IF EXISTS "public reads payment instructions" ON public.payment_settings;
CREATE POLICY "public reads payment instructions" ON public.payment_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin manages payment settings" ON public.payment_settings;
CREATE POLICY "admin manages payment settings" ON public.payment_settings FOR UPDATE TO authenticated
  USING (public.is_boutique_admin())
  WITH CHECK (public.is_boutique_admin());
DROP POLICY IF EXISTS "admin manages commission settings" ON public.commission_settings;
CREATE POLICY "admin manages commission settings" ON public.commission_settings FOR ALL TO authenticated
  USING (public.is_boutique_admin())
  WITH CHECK (public.is_boutique_admin());
DROP POLICY IF EXISTS "admin reads audit log" ON public.audit_log;
CREATE POLICY "admin reads audit log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_boutique_admin());

REVOKE ALL ON public.marketplace_payments, public.order_creation_requests, public.ledger_entries, public.ledger_entry_events, public.audit_log FROM anon, authenticated;
GRANT SELECT ON public.order_items, public.ledger_entries, public.payout_requests, public.supplier_payout_settings, public.affiliate_payout_settings, public.supplier_balances, public.affiliate_balances TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items, public.ledger_entries, public.ledger_entry_events, public.payout_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.marketplace_payments, public.order_items, public.ledger_entries, public.ledger_entry_events,
  public.order_creation_requests, public.payout_requests, public.supplier_payout_settings, public.audit_log, public.payment_settings,
  public.affiliate_payout_settings, public.commission_settings TO service_role;
GRANT SELECT ON public.ledger_reporting TO service_role;
GRANT SELECT ON public.supplier_balances, public.affiliate_balances TO service_role;

REVOKE ALL ON FUNCTION public.create_marketplace_order(jsonb,text,text,text,text,text,text,text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_manual_payment(text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_marketplace_payment(text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_marketplace_order_status(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_marketplace_delivery(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_delivered_ledger_entries() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_unpaid_marketplace_orders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_marketplace_ledger_jobs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_marketplace_payout(text,uuid,numeric,text,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_marketplace_payout(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_marketplace_order(text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_marketplace_order(jsonb,text,text,text,text,text,text,text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_manual_payment(text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_marketplace_payment(text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_marketplace_order_status(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_marketplace_delivery(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_delivered_ledger_entries() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_marketplace_orders() TO service_role;
GRANT EXECUTE ON FUNCTION public.run_marketplace_ledger_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.request_marketplace_payout(text,uuid,numeric,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_marketplace_payout(uuid,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_marketplace_order(text,uuid,text) TO service_role;

-- Create a private bucket for payment proofs; access is proxied by the authenticated server.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', false, 5242880, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false, file_size_limit=5242880,
  allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp'];

-- In Supabase, enable pg_cron and schedule hourly:
DO $$
DECLARE v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname='marketplace-ledger-hourly';
  IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;
  PERFORM cron.schedule('marketplace-ledger-hourly', '0 * * * *', 'SELECT public.run_marketplace_ledger_jobs();');
END;
$$;