-- SIMPLE FIX: Disable RLS pou Admin Panel
-- This allows admin to perform DELETE operations

-- ============================
-- DISABLE RLS ON ALL TABLES
-- ============================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_traffic DISABLE ROW LEVEL SECURITY;
ALTER TABLE referral_keys DISABLE ROW LEVEL SECURITY;

-- ============================
-- IMPORTANT NOTES:
-- ============================
-- 1. RLS now DISABLED on all tables - Admin can perform all operations
-- 2. If you want better security later, use policies with proper role checks
-- 3. For now, admin can DELETE, UPDATE, SELECT without restrictions
-- 4. To enable RLS again, use: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
