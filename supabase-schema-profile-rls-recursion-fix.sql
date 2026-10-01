-- Repair recursive profile/product admin policies without disabling RLS.
CREATE OR REPLACE FUNCTION public.is_boutique_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

ALTER FUNCTION public.is_boutique_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_boutique_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_boutique_admin() TO authenticated;

DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_boutique_admin());

DROP POLICY IF EXISTS "Tout moun ka we machann" ON public.profiles;
DROP POLICY IF EXISTS "Tout moun ka wè machann" ON public.profiles;
DROP POLICY IF EXISTS "lek_piblik_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "Public can view active seller profiles" ON public.profiles;
CREATE POLICY "Public can view active seller profiles" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (is_active_seller = true OR id = auth.uid());

DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
CREATE POLICY "Admin can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_boutique_admin()) WITH CHECK (public.is_boutique_admin());

DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
CREATE POLICY "Admin can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.is_boutique_admin());

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

DROP POLICY IF EXISTS "Admin can view all products" ON public.user_products;
CREATE POLICY "Admin can view all products" ON public.user_products
  FOR SELECT TO authenticated USING (public.is_boutique_admin());

DROP POLICY IF EXISTS "Admin can update products" ON public.user_products;
CREATE POLICY "Admin can update products" ON public.user_products
  FOR UPDATE TO authenticated
  USING (public.is_boutique_admin()) WITH CHECK (public.is_boutique_admin());

DROP POLICY IF EXISTS "Admin can delete products" ON public.user_products;
DROP POLICY IF EXISTS "Admin ka efase nenpòt pwodwi" ON public.user_products;
CREATE POLICY "Admin can delete products" ON public.user_products
  FOR DELETE TO authenticated USING (public.is_boutique_admin());

DROP POLICY IF EXISTS "Moun loge ka ajoute pwodwi" ON public.user_products;
CREATE POLICY "Moun loge ka ajoute pwodwi" ON public.user_products
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() OR public.is_boutique_admin());