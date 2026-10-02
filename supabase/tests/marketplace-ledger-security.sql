-- Run after supabase-schema-marketplace-ledger.sql and supabase-schema-affiliate-clicks.sql.
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.orders', 'INSERT')
    OR has_table_privilege('authenticated', 'public.orders', 'INSERT')
    OR has_table_privilege('authenticated', 'public.orders', 'UPDATE') THEN
    RAISE EXCEPTION 'Browser roles can mutate orders';
  END IF;

  IF has_table_privilege('anon', 'public.ledger_entries', 'INSERT')
    OR has_table_privilege('authenticated', 'public.ledger_entries', 'INSERT')
    OR has_table_privilege('authenticated', 'public.ledger_entries', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.ledger_entries', 'DELETE') THEN
    RAISE EXCEPTION 'Browser roles can mutate the append-only ledger';
  END IF;

  IF has_table_privilege('anon', 'public.payout_requests', 'INSERT')
    OR has_table_privilege('authenticated', 'public.payout_requests', 'INSERT')
    OR has_table_privilege('authenticated', 'public.payout_requests', 'UPDATE') THEN
    RAISE EXCEPTION 'Browser roles can mutate payout requests';
  END IF;

  IF has_table_privilege('anon', 'public.affiliate_click_visitors', 'SELECT')
    OR has_table_privilege('authenticated', 'public.affiliate_click_visitors', 'SELECT')
    OR has_table_privilege('anon', 'public.affiliate_click_visitors', 'INSERT')
    OR has_table_privilege('authenticated', 'public.affiliate_click_visitors', 'INSERT') THEN
    RAISE EXCEPTION 'Browser roles can read or mutate affiliate visitor fingerprints';
  END IF;

  IF has_function_privilege('anon', 'public.create_marketplace_order(jsonb,text,text,text,text,text,text,text,uuid,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.create_marketplace_order(jsonb,text,text,text,text,text,text,text,uuid,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.request_marketplace_payout(text,uuid,numeric,text,text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Browser roles can execute privileged money RPCs';
  END IF;

  IF has_function_privilege('anon', 'public.record_affiliate_click(text,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.record_affiliate_click(text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Browser roles can execute the affiliate click tracking RPC';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.create_marketplace_order(jsonb,text,text,text,text,text,text,text,uuid,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.request_marketplace_payout(text,uuid,numeric,text,text,uuid)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.record_affiliate_click(text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Service role is missing required server RPC access';
  END IF;
END;
$$;