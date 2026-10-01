-- Run after supabase-schema-marketplace-ledger.sql in Supabase SQL Editor.
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

  IF has_function_privilege('anon', 'public.create_marketplace_order(jsonb,text,text,text,text,text,text,text,uuid,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.create_marketplace_order(jsonb,text,text,text,text,text,text,text,uuid,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.request_marketplace_payout(text,uuid,numeric,text,text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Browser roles can execute privileged money RPCs';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.create_marketplace_order(jsonb,text,text,text,text,text,text,text,uuid,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.request_marketplace_payout(text,uuid,numeric,text,text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Service role is missing required server RPC access';
  END IF;
END;
$$;