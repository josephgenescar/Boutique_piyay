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

CREATE TABLE IF NOT EXISTS public.registration_email_notifications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registration_email_notifications ENABLE ROW LEVEL SECURITY;

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
    CASE WHEN requested_role = 'seller' THEN NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'shop_name'), '') ELSE NULL END,
    CASE WHEN requested_role = 'seller' THEN NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'whatsapp_number'), '') ELSE NULL END,
    CASE WHEN requested_role = 'seller' THEN NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'address'), '') ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active_seller = false,
    shop_name = EXCLUDED.shop_name,
    whatsapp_number = EXCLUDED.whatsapp_number,
    address = EXCLUDED.address;

  IF requested_role = 'seller' THEN
    DELETE FROM public.affiliates WHERE user_id = NEW.id;

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
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      shop_name = EXCLUDED.shop_name,
      whatsapp_number = EXCLUDED.whatsapp_number,
      address = EXCLUDED.address,
      product_categories = EXCLUDED.product_categories,
      product_description = EXCLUDED.product_description,
      status = 'pending',
      admin_message = NULL,
      reviewed_at = NULL,
      reviewed_by = NULL;
  ELSE
    DELETE FROM public.vendor_applications WHERE user_id = NEW.id;

    IF NOT EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = NEW.id) THEN
      INSERT INTO public.affiliates (user_id, referral_code, balance, total_referrals)
      VALUES (
        NEW.id,
        'AFF-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 12)),
        0,
        0
      );
    END IF;
  END IF;

  IF requested_role = 'seller' THEN
    UPDATE auth.users
    SET banned_until = now() + interval '100 years'
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_boutique_signup() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_boutique_piyay ON auth.users;
DROP TRIGGER IF EXISTS zzzzzzzzzzzzzz_boutique_signup_role_guard ON auth.users;
CREATE TRIGGER zzzzzzzzzzzzzz_boutique_signup_role_guard
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_boutique_signup();

DELETE FROM public.vendor_applications AS application
USING auth.users AS auth_user, public.profiles AS profile
WHERE application.user_id = auth_user.id
  AND profile.id = auth_user.id
  AND auth_user.raw_user_meta_data ->> 'role' = 'affiliate'
  AND profile.role IN ('pending_seller', 'seller')
  AND COALESCE(profile.is_active_seller, false) = false;

UPDATE public.profiles AS profile
SET role = 'affiliate',
    is_active_seller = false,
    shop_name = NULL,
    whatsapp_number = NULL,
    address = NULL
FROM auth.users AS auth_user
WHERE profile.id = auth_user.id
  AND auth_user.raw_user_meta_data ->> 'role' = 'affiliate'
  AND profile.role IN ('pending_seller', 'seller')
  AND COALESCE(profile.is_active_seller, false) = false;

INSERT INTO public.affiliates (user_id, referral_code, balance, total_referrals)
SELECT profile.id,
       'AFF-' || UPPER(SUBSTRING(REPLACE(profile.id::text, '-', ''), 1, 12)),
       0,
       0
FROM public.profiles AS profile
JOIN auth.users AS auth_user ON auth_user.id = profile.id
WHERE profile.role = 'affiliate'
  AND auth_user.raw_user_meta_data ->> 'role' = 'affiliate'
  AND NOT EXISTS (
    SELECT 1 FROM public.affiliates AS affiliate WHERE affiliate.user_id = profile.id
  );

UPDATE public.profiles AS profile
SET shop_name = COALESCE(
  NULLIF(BTRIM(application.shop_name), ''),
  NULLIF(BTRIM(auth_user.raw_user_meta_data ->> 'shop_name'), '')
)
FROM auth.users AS auth_user
LEFT JOIN public.vendor_applications AS application ON application.user_id = auth_user.id
WHERE profile.id = auth_user.id
  AND profile.role IN ('seller', 'pending_seller')
  AND COALESCE(
    NULLIF(BTRIM(application.shop_name), ''),
    NULLIF(BTRIM(auth_user.raw_user_meta_data ->> 'shop_name'), '')
  ) IS NOT NULL
  AND (
    NULLIF(BTRIM(profile.shop_name), '') IS NULL
    OR BTRIM(profile.shop_name) = BTRIM(COALESCE(profile.full_name, ''))
  );

UPDATE auth.users AS auth_user
SET banned_until = now() + interval '100 years'
FROM public.profiles AS profile
WHERE profile.id = auth_user.id
  AND profile.role = 'pending_seller';

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
  application_user_id uuid;
BEGIN
  IF NOT public.is_boutique_admin() THEN
    RAISE EXCEPTION 'Only administrators can review vendor applications.';
  END IF;

  IF p_status NOT IN ('approved', 'needs_info', 'rejected') THEN
    RAISE EXCEPTION 'Invalid vendor application status.';
  END IF;

  SELECT user_id INTO application_user_id
  FROM public.vendor_applications AS application
  WHERE application.id = p_application_id
  FOR UPDATE;

  IF application_user_id IS NULL THEN
    RAISE EXCEPTION 'Vendor application not found.';
  END IF;

  UPDATE public.vendor_applications AS application
  SET status = p_status,
      admin_message = NULLIF(BTRIM(p_admin_message), ''),
      reviewed_at = pg_catalog.now(),
      reviewed_by = auth.uid()
  WHERE application.id = p_application_id;

  UPDATE auth.users
  SET banned_until = CASE
    WHEN p_status = 'approved' THEN NULL
    ELSE pg_catalog.now() + interval '100 years'
  END
  WHERE id = application_user_id;

  IF p_status = 'approved' THEN
    UPDATE public.profiles AS profile
    SET role = 'seller', is_active_seller = true
    WHERE profile.id = application_user_id;
  ELSE
    UPDATE public.profiles AS profile
    SET role = 'pending_seller', is_active_seller = false
    WHERE profile.id = application_user_id;
  END IF;
END;
$$;

GRANT SELECT, UPDATE ON public.vendor_applications TO authenticated;
REVOKE ALL ON FUNCTION public.review_vendor_application(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_vendor_application(uuid, text, text) TO authenticated;