-- Fix RLS Policies for Admin Panel - Boutique Piyay
-- This script enables RLS and creates proper policies for admin operations

-- ============================
-- 1) PROFILES TABLE - RLS
-- ============================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow admin to see all profiles
CREATE POLICY "Admin can view all profiles" ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Allow admin to update all profiles
CREATE POLICY "Admin can update all profiles" ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Allow admin to delete profiles
CREATE POLICY "Admin can delete profiles" ON profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT
USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE
USING (id = auth.uid());

-- ============================
-- 2) USER_PRODUCTS TABLE - RLS
-- ============================
ALTER TABLE user_products ENABLE ROW LEVEL SECURITY;

-- Allow admin to see all products
CREATE POLICY "Admin can view all products" ON user_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Allow admin to delete products
CREATE POLICY "Admin can delete products" ON user_products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Allow admin to update products
CREATE POLICY "Admin can update products" ON user_products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Allow sellers to view their own products
CREATE POLICY "Sellers can view their own products" ON user_products
FOR SELECT
USING (seller_id = auth.uid());

-- Allow sellers to update their own products
CREATE POLICY "Sellers can update their own products" ON user_products
FOR UPDATE
USING (seller_id = auth.uid());

-- Allow sellers to delete their own products
CREATE POLICY "Sellers can delete their own products" ON user_products
FOR DELETE
USING (seller_id = auth.uid());

-- ============================
-- 3) ORDERS TABLE - RLS
-- ============================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow admin to view all orders
CREATE POLICY "Admin can view all orders" ON orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Allow admin to update orders
CREATE POLICY "Admin can update orders" ON orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Allow sellers to view their own orders
CREATE POLICY "Sellers can view their own orders" ON orders
FOR SELECT
USING (seller_id = auth.uid());

-- Allow sellers to update their own orders
CREATE POLICY "Sellers can update their own orders" ON orders
FOR UPDATE
USING (seller_id = auth.uid());

-- ============================
-- 4) AFFILIATES TABLE - RLS
-- ============================
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own affiliate record
CREATE POLICY "Users can view their own affiliate record" ON affiliates
FOR SELECT
USING (user_id = auth.uid());

-- ============================
-- IMPORTANT: If RLS blocks everything, you can also:
-- 1) Use Service Role Key in admin.html (NOT recommended for public)
-- 2) Or disable RLS temporarily while debugging
-- ============================

-- To DISABLE RLS (if you need to debug):
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE affiliates DISABLE ROW LEVEL SECURITY;
