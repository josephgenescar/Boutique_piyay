-- Restore row-level security on tables previously opened for the admin panel.
-- Existing policies become active again when RLS is enabled.

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.referral_keys ENABLE ROW LEVEL SECURITY;

ALTER VIEW IF EXISTS public.affiliate_stats SET (security_invoker = true);

SELECT
	c.relname AS table_name,
	c.relrowsecurity AS rls_enabled,
	count(p.policyname) AS policy_count
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN pg_policies AS p
	ON p.schemaname = n.nspname
	AND p.tablename = c.relname
WHERE n.nspname = 'public'
	AND c.relname IN (
		'profiles', 'user_products', 'orders', 'affiliates',
		'admin_notifications', 'admin_commissions', 'affiliate_transactions',
		'affiliate_withdrawals', 'wallets', 'transactions', 'site_traffic', 'referral_keys'
	)
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;
