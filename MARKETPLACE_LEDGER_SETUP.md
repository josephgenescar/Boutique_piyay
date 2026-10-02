# Marketplace Payment and Ledger Setup

## Deployment

1. Apply `supabase-schema.sql` to the intended Supabase project if it has not already been applied.
2. Apply `supabase-schema-profile-rls-recursion-fix.sql` before the ledger migration. It replaces recursive admin RLS checks and removes unrestricted profile insert/update policies without disabling RLS.
3. Apply `supabase-schema-vendor-applications.sql`. Its auth signup trigger creates the profile and affiliate record from the selected signup role; without it, affiliate accounts will not be linked to their dashboard.
4. Apply `supabase-schema-marketplace-ledger.sql` in the same project's SQL editor. It creates the ledger tables, RLS policies, private `payment-proofs` storage bucket, security-definer RPCs, and the hourly `pg_cron` job.
5. Apply `supabase-schema-affiliate-clicks.sql` after the affiliate and ledger schemas. It enables unique browser-profile visitor counts without storing raw IP addresses.
6. In Netlify, set `SUPABASE_URL` to that exact project URL, `SUPABASE_SERVICE_ROLE_KEY` to that project's service-role key, `GROQ_API_KEY` for general AI answers, and `SITE_ORIGIN` to the deployed site origin (comma-separated if more than one origin is needed). Keep every key server-side only, then redeploy the functions.
7. Sign in as an admin and open `/admin/finance.html`. Configure platform MonCash/NatCash numbers or QR image URLs, expiry hours, refund hold days, minimum payout, and commission rates.
8. The hourly job is named `marketplace-ledger-hourly`. For an immediate test, an authorized database administrator can run `SELECT public.run_marketplace_ledger_jobs();`.

## Money Rules

- Amounts are HTG `numeric(12,2)`. PostgreSQL `round(numeric, 2)` rounds half away from zero.
- Product price and commission rules are read from the database when the order is created and snapshotted on each `order_items` row. Rule precedence is product, supplier, category, then default.
- Affiliate commission is a percentage of the platform commission, not an extra charge to the supplier. For every item: `line_total = supplier_net + platform_commission_net + affiliate_amount`.
- Ledger rows are append-only. Current pending/available/paid/reversed state is derived from append-only ledger events. Refunds add exact opposite entries and mark the source entries reversed.
- A payout request reserves available balance immediately. The database locks the supplier or affiliate row, checks the ledger balance and configured minimum, writes paired ledger entries, and audits the request in one transaction.
- Checkout retries reuse a UUID idempotency key; changing the cart under the same key is rejected. Resubmitting the same transaction ID for the same order is idempotent.

## Manual Acceptance Test

1. Create or use two active suppliers. Add one approved product per supplier with known prices and sufficient stock. Set the platform default commission to 15% and affiliate share to 10% of that commission.
2. In admin finance settings, set a test MonCash number and optionally a QR URL. For a quick release test, temporarily set the refund hold to 0 days and minimum payout to a small test amount.
3. Open checkout with one item from each supplier, choose MonCash, and submit. Confirm the displayed total comes from the server, the `BP-...` reference is shown, and no client price or commission is sent in the create-order request.
4. Submit a transaction ID and a valid optional image. Confirm the order becomes `pending_verification`, and try that same transaction ID on another order; the second submission must fail.
5. In `/admin/finance.html`, verify the transaction in the Boutique Piyay account, then confirm. Check that each product generated its own supplier and commission ledger entries. With prices 100 and 200 HTG, the expected snapshots are supplier net 85 and 170 HTG, platform commission net 13.50 and 27 HTG, and affiliate commission 1.50 and 3 HTG. The signed entries for each item sum to zero.
6. In the supplier dashboards, each supplier should see only their own items. Mark each paid order as shipped, then sign in as the customer and confirm receipt. A COD order can ship before collection, but remains uncredited until admin confirms the cash reached the platform.
7. Run `SELECT public.run_marketplace_ledger_jobs();` in the Supabase SQL editor. Supplier and affiliate credits should move to available after the configured hold. Request a payout at or below available balance; request more than available and confirm it is rejected. In admin finance, verify vendor and affiliate totals separately, inspect the requester's identity, earnings source, destination, and balances, approve the request, then mark it paid with a payment reference. Confirm the history records the payment and total paid out increases.
8. Use the admin refund action on a paid order. Confirm new reversal ledger rows exist, original rows remain intact, supplier/affiliate balances and net report totals reverse, and audit entries are present.
9. In admin finance, filter the report by date and payment method, export CSV, and compare sales, net platform commission, affiliate commission, supplier due, and paid payouts against ledger entries.
10. As supplier A, request supplier B's balance, items, or payout history through the API; it must return only supplier A's data. Try direct browser inserts/updates to `orders`, `order_items`, `ledger_entries`, and `payout_requests`; they must be denied. Tamper with checkout JSON to include price, commission, or balance fields; those fields must have no effect.
11. Run `node --test tests/marketplace-money-security.test.js`. Run `supabase/tests/marketplace-ledger-security.sql` in Supabase SQL Editor; it must finish without raising an exception.
12. Open an affiliate referral link in a fresh browser profile and confirm its visitor count increases. Reopen the same link from that profile and confirm it is still counted once; open it from another profile and confirm the count increases again.
13. Register an affiliate and verify `profiles.role = 'affiliate'` and an `affiliates.user_id` row for the same user. Sign in with an affiliate redirect parameter and confirm the affiliate dashboard still opens. Confirm an affiliate is redirected away from `/dashboard.html` and an active seller is redirected away from `/affiliate-dashboard.html` to the seller dashboard.

For an expiry test, create an unpaid order and set `payment_expiry_hours` to 1, then run the scheduled job after its `expires_at`; verify its status becomes `expired` and reserved stock is restored.