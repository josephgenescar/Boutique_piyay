CREATE TABLE IF NOT EXISTS public.vendor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  shop_name text NOT NULL,
  whatsapp_number text NOT NULL,
  address text,
  product_categories text NOT NULL,
  product_description text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'needs_info', 'approved', 'rejected')),
  admin_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_applications_status_created
  ON public.vendor_applications(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_boutique_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = 'off'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_boutique_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_boutique_admin() TO authenticated;

ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants can read their vendor application" ON public.vendor_applications;
CREATE POLICY "Applicants can read their vendor application"
  ON public.vendor_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage vendor applications" ON public.vendor_applications;
CREATE POLICY "Admins manage vendor applications"
  ON public.vendor_applications
  FOR ALL
  TO authenticated
  USING (public.is_boutique_admin())
  WITH CHECK (public.is_boutique_admin());

DROP POLICY IF EXISTS "Admins can activate approved vendors" ON public.profiles;
CREATE POLICY "Admins can activate approved vendors"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_boutique_admin())
  WITH CHECK (public.is_boutique_admin());

CREATE OR REPLACE FUNCTION public.prevent_vendor_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() = OLD.id
    AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active_seller IS DISTINCT FROM OLD.is_active_seller)
    AND NOT public.is_boutique_admin() THEN
    RAISE EXCEPTION 'Vendor access must be approved by an administrator.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_vendor_self_approval() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS prevent_vendor_self_approval ON public.profiles;
CREATE TRIGGER prevent_vendor_self_approval
  BEFORE UPDATE OF role, is_active_seller ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_vendor_self_approval();

CREATE OR REPLACE FUNCTION public.handle_boutique_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role text := NEW.raw_user_meta_data ->> 'role';
  applicant_name text := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'full_name'), '');
BEGIN
  IF requested_role IS NULL OR requested_role NOT IN ('seller', 'affiliate') THEN
    RAISE EXCEPTION 'Choose vendor or affiliate registration.';
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, is_active_seller, shop_name,
    whatsapp_number, address
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(applicant_name, NEW.email),
    CASE WHEN requested_role = 'seller' THEN 'pending_seller' ELSE 'affiliate' END,
    false,
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'shop_name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'whatsapp_number'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'address'), '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF requested_role = 'seller' THEN
    INSERT INTO public.vendor_applications (
      user_id, email, full_name, shop_name, whatsapp_number, address,
      product_categories, product_description
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(applicant_name, NEW.email),
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'shop_name'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'whatsapp_number'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'address'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'product_categories'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'product_description'), '')
    )
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.affiliates (user_id, referral_code, balance, total_referrals)
    VALUES (
      NEW.id,
      'AFF-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 12)),
      0,
      0
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_boutique_signup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_boutique_piyay ON auth.users;
CREATE TRIGGER on_auth_user_created_boutique_piyay
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_boutique_signup();

CREATE OR REPLACE FUNCTION public.review_vendor_application(
  p_application_id uuid,
  p_status text,
  p_admin_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  application_user_id uuid;
BEGIN
  IF p_status NOT IN ('approved', 'needs_info', 'rejected') THEN
    RAISE EXCEPTION 'Invalid vendor application status.';
  END IF;

  SELECT user_id INTO application_user_id
  FROM public.vendor_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF application_user_id IS NULL THEN
    RAISE EXCEPTION 'Vendor application not found.';
  END IF;

  UPDATE public.vendor_applications
  SET status = p_status,
      admin_message = NULLIF(BTRIM(p_admin_message), ''),
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = p_application_id;

  IF p_status = 'approved' THEN
    UPDATE public.profiles
    SET role = 'seller', is_active_seller = true
    WHERE id = application_user_id;
  ELSE
    UPDATE public.profiles
    SET role = 'pending_seller', is_active_seller = false
    WHERE id = application_user_id;
  END IF;
END;
$$;

GRANT SELECT, UPDATE ON public.vendor_applications TO authenticated;
REVOKE ALL ON FUNCTION public.review_vendor_application(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_vendor_application(uuid, text, text) TO authenticated;