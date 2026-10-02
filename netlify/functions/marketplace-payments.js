const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { getPaymentProvider } = require('./_payment-provider');

const supabaseUrl = process.env.SUPABASE_URL || 'https://letyferfjpxmstohvgcj.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = serviceKey ? createClient(supabaseUrl, serviceKey, { transport: ws }) : null;
const maxProofBytes = 4 * 1024 * 1024;
const allowedOrigins = (process.env.SITE_ORIGIN || 'https://boutique-piyay.netlify.app').split(',').map((origin) => origin.trim());

exports.handler = async (event) => {
  const requestOrigin = event.headers.origin || event.headers.Origin || '';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (!supabase) return respond(500, { error: 'Payment service is not configured' }, headers);

  try {
    if (event.httpMethod === 'GET') return await getRequest(event, headers);
    if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' }, headers);

    const body = JSON.parse(event.body || '{}');
    const action = String(body.action || '');
    const identity = await getIdentity(event.headers.authorization);

    if (action === 'submit-payment') return await submitPayment(body, headers);
    if (!identity.user) return respond(401, { error: 'Login required' }, headers);

    if (action === 'review-payment' || action === 'review-payout' || action === 'save-settings' || action === 'save-commission' || action === 'refund-order') {
      if (!await isAdmin(identity.user.id)) return respond(403, { error: 'Admin access required' }, headers);
    }

    if (action === 'review-payment') {
      if (!['confirm', 'reject'].includes(body.decision)) return respond(400, { error: 'Invalid payment decision' }, headers);
      const { error } = await supabase.rpc('review_marketplace_payment', {
        p_order_group_id: String(body.order_group_id || ''),
        p_admin_id: identity.user.id,
        p_action: body.decision,
        p_reason: String(body.reason || '').slice(0, 500) || null
      });
      if (error) throw error;
      return respond(200, { ok: true }, headers);
    }

    if (action === 'refund-order') {
      const { error } = await supabase.rpc('reverse_marketplace_order', {
        p_order_group_id: String(body.order_group_id || ''),
        p_admin_id: identity.user.id,
        p_reason: String(body.reason || '').trim().slice(0, 500)
      });
      if (error) throw error;
      return respond(200, { ok: true }, headers);
    }

    if (action === 'set-order-status') {
      if (!['shipped', 'delivered'].includes(body.status)) return respond(400, { error: 'Invalid order status' }, headers);
      const { error } = await supabase.rpc('set_marketplace_order_status', {
        p_order_id: body.order_id,
        p_supplier_id: identity.user.id,
        p_status: body.status
      });
      if (error) throw error;
      return respond(200, { ok: true }, headers);
    }

    if (action === 'confirm-customer-delivery') {
      const { error } = await supabase.rpc('confirm_marketplace_delivery', {
        p_order_id: body.order_id,
        p_customer_id: identity.user.id
      });
      if (error) throw error;
      return respond(200, { ok: true }, headers);
    }

    if (action === 'save-payout-settings') {
      const { data: profile } = await supabase.from('profiles').select('role,is_active_seller').eq('id', identity.user.id).maybeSingle();
      if (profile?.role !== 'seller' || profile.is_active_seller !== true) return respond(403, { error: 'Active supplier account required' }, headers);
      const method = String(body.method || '').toLowerCase();
      if (!['moncash', 'natcash', 'bank'].includes(method)) return respond(400, { error: 'Invalid payout method' }, headers);
      const values = {
        supplier_id: identity.user.id,
        method,
        account_name: String(body.account_name || '').trim().slice(0, 120),
        account_number: String(body.account_number || '').trim().slice(0, 120),
        updated_at: new Date().toISOString()
      };
      if (!values.account_name || !values.account_number) return respond(400, { error: 'Destination details are required' }, headers);
      const { error } = await supabase.from('supplier_payout_settings').upsert(values);
      if (error) throw error;
      return respond(200, { ok: true }, headers);
    }

    if (action === 'save-affiliate-payout-settings') {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', identity.user.id).maybeSingle();
      const { data: affiliate } = await supabase.from('affiliates').select('id').eq('user_id', identity.user.id).maybeSingle();
      const method = String(body.method || '').toLowerCase();
      if (profile?.role !== 'affiliate' || !affiliate || !['moncash', 'natcash', 'bank'].includes(method)) return respond(403, { error: 'Affiliate account or method is invalid' }, headers);
      const values = {
        affiliate_id: affiliate.id, method,
        account_name: String(body.account_name || '').trim().slice(0, 120),
        account_number: String(body.account_number || '').trim().slice(0, 120),
        updated_at: new Date().toISOString()
      };
      if (!values.account_name || !values.account_number) return respond(400, { error: 'Destination details are required' }, headers);
      const { error } = await supabase.from('affiliate_payout_settings').upsert(values);
      if (error) throw error;
      return respond(200, { ok: true }, headers);
    }

    if (action === 'request-payout') {
      const { data: profile } = await supabase.from('profiles').select('role,is_active_seller').eq('id', identity.user.id).maybeSingle();
      let accountType = 'supplier';
      let accountId = identity.user.id;
      let settings;
      if (profile?.role === 'seller' && profile.is_active_seller === true) {
        const { data } = await supabase.from('supplier_payout_settings').select('*').eq('supplier_id', identity.user.id).maybeSingle();
        settings = data;
      } else if (profile?.role === 'affiliate') {
        accountType = 'affiliate';
        const { data: affiliate } = await supabase.from('affiliates').select('id').eq('user_id', identity.user.id).maybeSingle();
        accountId = affiliate?.id;
        if (accountId) {
          const { data } = await supabase.from('affiliate_payout_settings').select('*').eq('affiliate_id', accountId).maybeSingle();
          settings = data;
        }
      } else return respond(403, { error: 'Active supplier or affiliate account required' }, headers);
      if (!settings || !accountId) return respond(400, { error: 'Configure your payout destination first' }, headers);
      const { data, error } = await supabase.rpc('request_marketplace_payout', {
        p_account_type: accountType,
        p_account_id: accountId,
        p_amount: Number(body.amount),
        p_method: settings.method,
        p_destination: settings.account_number,
        p_actor_id: identity.user.id
      });
      if (error) throw error;
      return respond(201, { request_id: data }, headers);
    }

    if (action === 'review-payout') {
      const { error } = await supabase.rpc('review_marketplace_payout', {
        p_request_id: body.request_id,
        p_admin_id: identity.user.id,
        p_action: body.decision,
        p_payment_reference: String(body.payment_reference || '').trim() || null,
        p_note: String(body.note || '').slice(0, 500) || null
      });
      if (error) throw error;
      return respond(200, { ok: true }, headers);
    }

    if (action === 'save-settings') {
      const allowed = ['moncash_number', 'moncash_qr_url', 'natcash_number', 'natcash_qr_url', 'payment_expiry_hours', 'refund_hold_days', 'minimum_payout', 'default_commission_rate', 'default_affiliate_rate'];
      const update = {};
      for (const key of allowed) if (body.settings?.[key] !== undefined) update[key] = body.settings[key];
      for (const key of ['payment_expiry_hours', 'refund_hold_days', 'minimum_payout', 'default_commission_rate', 'default_affiliate_rate']) {
        if (update[key] !== undefined && !Number.isFinite(Number(update[key]))) return respond(400, { error: `Invalid ${key}` }, headers);
        if (update[key] !== undefined) update[key] = Number(update[key]);
      }
      if (update.payment_expiry_hours !== undefined && (update.payment_expiry_hours < 1 || update.payment_expiry_hours > 168)) return respond(400, { error: 'Expiry must be between 1 and 168 hours' }, headers);
      if (update.refund_hold_days !== undefined && (update.refund_hold_days < 0 || update.refund_hold_days > 90)) return respond(400, { error: 'Refund hold must be between 0 and 90 days' }, headers);
      if (update.minimum_payout !== undefined && update.minimum_payout < 0) return respond(400, { error: 'Minimum payout cannot be negative' }, headers);
      if (['default_commission_rate', 'default_affiliate_rate'].some((key) => update[key] !== undefined && (update[key] < 0 || update[key] > 1))) return respond(400, { error: 'Commission rates must be between 0 and 100 percent' }, headers);
      update.updated_at = new Date().toISOString();
      update.updated_by = identity.user.id;
      const { error } = await supabase.from('payment_settings').update(update).eq('id', true);
      if (error) throw error;
      return respond(200, { ok: true }, headers);
    }

    if (action === 'save-commission') {
      const scope = String(body.scope || '');
      const scopeId = String(body.scope_id || '').trim();
      const rate = Number(body.commission_rate);
      if (!['category', 'product', 'supplier'].includes(scope) || !scopeId || !Number.isFinite(rate) || rate < 0 || rate > 1) {
        return respond(400, { error: 'Invalid commission rule' }, headers);
      }
      const { error } = await supabase.from('commission_settings').upsert({
        scope, scope_id: scopeId, commission_rate: rate, updated_by: identity.user.id, updated_at: new Date().toISOString()
      }, { onConflict: 'scope,scope_id' });
      if (error) throw error;
      return respond(200, { ok: true }, headers);
    }

    return respond(400, { error: 'Unknown action' }, headers);
  } catch (error) {
    console.error('Marketplace payment request failed:', error.message || error);
    return respond(400, { error: error.message || 'Unable to process request' }, headers);
  }
};

async function getRequest(event, headers) {
  const params = event.queryStringParameters || {};
  if (params.view === 'instructions') {
    const { data, error } = await supabase.from('payment_settings')
      .select('moncash_number,moncash_qr_url,natcash_number,natcash_qr_url,payment_expiry_hours,refund_hold_days,minimum_payout').eq('id', true).single();
    if (error) throw error;
    return respond(200, { settings: data }, headers);
  }
  const identity = await getIdentity(event.headers.authorization);
  if (!identity.user) return respond(401, { error: 'Login required' }, headers);

  if (params.view === 'supplier') {
    const { data: profile } = await supabase.from('profiles').select('role,is_active_seller').eq('id', identity.user.id).maybeSingle();
    if (profile?.role !== 'seller' || profile.is_active_seller !== true) return respond(403, { error: 'Active supplier account required' }, headers);
    const [{ data: balance }, { data: payoutSettings }, { data: payouts }, { data: sales }, { data: paymentSettings }] = await Promise.all([
      supabase.from('supplier_balances').select('*').eq('supplier_id', identity.user.id).maybeSingle(),
      supabase.from('supplier_payout_settings').select('method,account_name,account_number').eq('supplier_id', identity.user.id).maybeSingle(),
      supabase.from('payout_requests').select('*').eq('supplier_id', identity.user.id).order('requested_at', { ascending: false }).limit(50),
      supabase.from('order_items').select('id,order_id,order_group_id,product_id,quantity,unit_price,line_total,commission_amount,supplier_net,item_status,created_at').eq('supplier_id', identity.user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('payment_settings').select('minimum_payout').eq('id', true).single()
    ]);
    return respond(200, { balance: balance || { pending_balance: 0, available_balance: 0, total_paid_out: 0 }, payout_settings: payoutSettings, payouts: payouts || [], sales: sales || [], minimum_payout: Number(paymentSettings?.minimum_payout || 100) }, headers);
  }
  if (params.view === 'affiliate') {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', identity.user.id).maybeSingle();
    if (profile?.role !== 'affiliate') return respond(403, { error: 'Affiliate account required' }, headers);
    const { data: affiliate } = await supabase.from('affiliates').select('id,referral_code').eq('user_id', identity.user.id).maybeSingle();
    if (!affiliate) return respond(403, { error: 'Affiliate account required' }, headers);
    const [{ data: balance }, { data: payoutSettings }, { data: payouts }, { count: clickCount, error: clickError }, { data: paymentSettings }] = await Promise.all([
      supabase.from('affiliate_balances').select('*').eq('affiliate_id', affiliate.id).maybeSingle(),
      supabase.from('affiliate_payout_settings').select('method,account_name,account_number').eq('affiliate_id', affiliate.id).maybeSingle(),
      supabase.from('payout_requests').select('*').eq('affiliate_id', affiliate.id).order('requested_at', { ascending: false }).limit(50),
      supabase.from('affiliate_click_visitors').select('affiliate_id', { count: 'exact', head: true }).eq('affiliate_id', affiliate.id),
      supabase.from('payment_settings').select('minimum_payout').eq('id', true).single()
    ]);
    if (clickError) console.error('Affiliate visit count unavailable:', clickError.message);
    const [transactions, referredOrders] = await Promise.all([
      fetchAllRows((offset, end) => supabase.from('ledger_reporting')
        .select('id,amount,entry_type,reverses_entry_type,effective_status,created_at,note')
        .eq('account_type', 'affiliate').eq('account_id', affiliate.id)
        .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, end)),
      fetchAllRows((offset, end) => supabase.from('order_items').select('id,order_group_id')
        .eq('affiliate_id', affiliate.id).order('id', { ascending: true }).range(offset, end))
    ]);
    const totalCommission = (transactions || []).reduce((sum, entry) => {
      if (entry.entry_type === 'affiliate_commission') return sum + Number(entry.amount);
      if (entry.entry_type === 'refund' && entry.reverses_entry_type === 'affiliate_commission') return sum + Number(entry.amount);
      return sum;
    }, 0);
    const pendingWithdrawal = (payouts || []).filter((payout) => ['requested', 'approved'].includes(payout.status))
      .reduce((sum, payout) => sum + Number(payout.amount), 0);
    const sales = new Set(referredOrders.map((item) => item.order_group_id)).size;
    return respond(200, { affiliate, balance: balance || { pending_balance: 0, available_balance: 0, total_paid_out: 0 }, payout_settings: payoutSettings, payouts: payouts || [], transactions: transactions.slice(0, 50), total_commission: totalCommission, pending_withdrawal: pendingWithdrawal, sales, clicks: clickError ? null : (clickCount || 0), minimum_payout: Number(paymentSettings?.minimum_payout || 100) }, headers);
  }

  if (!await isAdmin(identity.user.id)) return respond(403, { error: 'Admin access required' }, headers);
  if (params.view === 'admin') {
    const [{ data: payments, error: paymentError }, { data: settings }, { data: payoutHistory, error: historyError }, supplierBalanceRows, affiliateBalanceRows] = await Promise.all([
      supabase.from('marketplace_payments').select('*').or('payment_status.eq.pending_verification,and(payment_status.eq.pending_payment,payment_method.eq.cash)').order('created_at', { ascending: true }).limit(100),
      supabase.from('payment_settings').select('*').eq('id', true).single(),
      supabase.from('payout_requests').select('*').in('status', ['paid', 'rejected']).order('requested_at', { ascending: false }).limit(100),
      fetchAllRows((offset, end) => supabase.from('supplier_balances').select('supplier_id,pending_balance,available_balance,total_paid_out').order('supplier_id').range(offset, end)),
      fetchAllRows((offset, end) => supabase.from('affiliate_balances').select('affiliate_id,pending_balance,available_balance,total_paid_out').order('affiliate_id').range(offset, end))
    ]);
    if (paymentError) throw paymentError;
    if (historyError) throw historyError;

    const payouts = await fetchAllRows((offset, end) => supabase.from('payout_requests')
      .select('*').in('status', ['requested', 'approved']).order('requested_at', { ascending: true }).order('id').range(offset, end));
    const supplierIds = [...new Set([...payouts, ...(payoutHistory || [])].map((payout) => payout.supplier_id).filter(Boolean))];
    const affiliateIds = [...new Set([...payouts, ...(payoutHistory || [])].map((payout) => payout.affiliate_id).filter(Boolean))];
    const [supplierProfilesResult, affiliateAccountsResult] = await Promise.all([
      supplierIds.length
        ? supabase.from('profiles').select('id,full_name,email,shop_name').in('id', supplierIds)
        : Promise.resolve({ data: [], error: null }),
      affiliateIds.length
        ? supabase.from('affiliates').select('id,user_id,referral_code').in('id', affiliateIds)
        : Promise.resolve({ data: [], error: null })
    ]);
    if (supplierProfilesResult.error) throw supplierProfilesResult.error;
    if (affiliateAccountsResult.error) throw affiliateAccountsResult.error;

    const affiliateAccounts = affiliateAccountsResult.data || [];
    const affiliateUserIds = [...new Set(affiliateAccounts.map((affiliate) => affiliate.user_id).filter(Boolean))];
    const affiliateProfilesResult = affiliateUserIds.length
      ? await supabase.from('profiles').select('id,full_name,email').in('id', affiliateUserIds)
      : { data: [], error: null };
    if (affiliateProfilesResult.error) throw affiliateProfilesResult.error;

    const supplierProfilesById = new Map((supplierProfilesResult.data || []).map((profile) => [profile.id, profile]));
    const affiliateAccountsById = new Map(affiliateAccounts.map((affiliate) => [affiliate.id, affiliate]));
    const affiliateProfilesById = new Map((affiliateProfilesResult.data || []).map((profile) => [profile.id, profile]));
    const supplierBalancesById = new Map((supplierBalanceRows || []).map((balance) => [balance.supplier_id, balance]));
    const affiliateBalancesById = new Map((affiliateBalanceRows || []).map((balance) => [balance.affiliate_id, balance]));
    const payoutTotals = {
      supplier: { pending_balance: 0, available_balance: 0, total_paid_out: 0, requested_payouts: 0, approved_payouts: 0, open_payouts: 0, total_owed: 0 },
      affiliate: { pending_balance: 0, available_balance: 0, total_paid_out: 0, requested_payouts: 0, approved_payouts: 0, open_payouts: 0, total_owed: 0 }
    };
    for (const balance of supplierBalanceRows || []) {
      payoutTotals.supplier.pending_balance += Number(balance.pending_balance || 0);
      payoutTotals.supplier.available_balance += Number(balance.available_balance || 0);
      payoutTotals.supplier.total_paid_out += Number(balance.total_paid_out || 0);
    }
    for (const balance of affiliateBalanceRows || []) {
      payoutTotals.affiliate.pending_balance += Number(balance.pending_balance || 0);
      payoutTotals.affiliate.available_balance += Number(balance.available_balance || 0);
      payoutTotals.affiliate.total_paid_out += Number(balance.total_paid_out || 0);
    }
    const enrichPayout = (payout) => {
      const isAffiliate = payout.account_type === 'affiliate';
      const affiliate = isAffiliate ? affiliateAccountsById.get(payout.affiliate_id) : null;
      const profile = isAffiliate
        ? affiliateProfilesById.get(affiliate?.user_id)
        : supplierProfilesById.get(payout.supplier_id);
      const balance = isAffiliate
        ? affiliateBalancesById.get(payout.affiliate_id)
        : supplierBalancesById.get(payout.supplier_id);
      return {
        ...payout,
        owner_name: profile?.full_name || profile?.shop_name || profile?.email || null,
        owner_email: profile?.email || null,
        shop_name: profile?.shop_name || null,
        referral_code: affiliate?.referral_code || null,
        pending_balance: Number(balance?.pending_balance || 0),
        available_balance: Number(balance?.available_balance || 0),
        total_paid_out: Number(balance?.total_paid_out || 0)
      };
    };
    const detailedPayouts = payouts.map(enrichPayout);
    const detailedPayoutHistory = (payoutHistory || []).map(enrichPayout);
    for (const payout of detailedPayouts) {
      const totals = payoutTotals[payout.account_type];
      if (!totals) continue;
      const amount = Number(payout.amount || 0);
      totals.open_payouts += amount;
      if (payout.status === 'requested') totals.requested_payouts += amount;
      if (payout.status === 'approved') totals.approved_payouts += amount;
    }
    for (const totals of Object.values(payoutTotals)) {
      totals.total_owed = totals.pending_balance + totals.available_balance + totals.open_payouts;
    }

    const rows = await Promise.all((payments || []).map(async (payment) => {
      if (!payment.payment_proof_path) return { ...payment, proof_url: null };
      const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(payment.payment_proof_path, 300);
      return { ...payment, proof_url: data?.signedUrl || null };
    }));
    return respond(200, { payments: rows, payouts: detailedPayouts, payout_history: detailedPayoutHistory, payout_totals: payoutTotals, settings }, headers);
  }
  if (params.view === 'report') return await getReport(params, headers);
  return respond(400, { error: 'Unknown view' }, headers);
}

async function submitPayment(body, headers) {
  const groupId = String(body.order_group_id || '').trim();
  const phone = String(body.customer_phone || '').trim();
  const transactionId = String(body.provider_transaction_id || '').trim();
  if (!/^BP-[A-F0-9]{10}$/i.test(groupId) || !phone || !transactionId || transactionId.length > 120) {
    return respond(400, { error: 'Order reference, phone, and transaction ID are required' }, headers);
  }
  let proofPath = null;
  if (body.proof?.data) {
    const proof = readProof(body.proof.data);
    if (proof.error) return respond(400, { error: proof.error }, headers);
    proofPath = `${groupId}/${require('crypto').randomUUID()}.${proof.extension}`;
    const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(proofPath, proof.buffer, {
      contentType: proof.mime, upsert: false
    });
    if (uploadError) throw uploadError;
  }
  const { error } = await supabase.rpc('submit_manual_payment', {
    p_order_group_id: groupId,
    p_customer_phone: phone,
    p_provider_transaction_id: transactionId,
    p_payment_proof_path: proofPath
  });
  if (error) {
    if (proofPath) await supabase.storage.from('payment-proofs').remove([proofPath]);
    throw error;
  }
  if (proofPath) {
    const { data: savedPayment } = await supabase.from('marketplace_payments').select('payment_proof_path')
      .eq('order_group_id', groupId).maybeSingle();
    if (savedPayment?.payment_proof_path !== proofPath) await supabase.storage.from('payment-proofs').remove([proofPath]);
  }
  return respond(200, { ok: true, payment_status: 'pending_verification' }, headers);
}

function readProof(data) {
  const encoded = String(data).replace(/^data:[^;]+;base64,/, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length > Math.ceil(maxProofBytes * 4 / 3)) {
    return { error: 'Payment image is too large or malformed' };
  }
  const buffer = Buffer.from(encoded, 'base64');
  if (!buffer.length || buffer.length > maxProofBytes) return { error: 'Payment image must be 4 MB or smaller' };
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { buffer, mime: 'image/png', extension: 'png' };
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { buffer, mime: 'image/jpeg', extension: 'jpg' };
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { buffer, mime: 'image/webp', extension: 'webp' };
  return { error: 'Only valid PNG, JPG, or WEBP images are accepted' };
}

async function getReport(params, headers) {
  const from = params.from ? new Date(params.from).toISOString() : '1970-01-01T00:00:00.000Z';
  const to = params.to ? new Date(params.to).toISOString() : new Date().toISOString();
  const data = [];
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from('ledger_reporting').select('id,entry_type,reverses_entry_type,account_type,account_id,amount,effective_status,method,created_at')
      .gte('created_at', from).lte('created_at', to).order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 999);
    if (['moncash', 'natcash', 'cash', 'bank'].includes(params.method)) query = query.eq('method', params.method);
    const { data: page, error } = await query;
    if (error) throw error;
    data.push(...(page || []));
    if (!page || page.length < 1000) break;
  }
  const totals = (data || []).reduce((result, entry) => {
    const amount = Number(entry.amount);
    if (entry.entry_type === 'sale') result.total_sales -= amount;
    if (entry.entry_type === 'refund' && entry.reverses_entry_type === 'sale') result.total_sales -= amount;
    if (entry.entry_type === 'commission') result.platform_commission += amount;
    if (entry.entry_type === 'refund' && entry.reverses_entry_type === 'commission') result.platform_commission += amount;
    if (entry.entry_type === 'affiliate_commission') result.affiliate_commission += amount;
    if (entry.entry_type === 'refund' && entry.reverses_entry_type === 'affiliate_commission') result.affiliate_commission += amount;
    if (entry.account_type === 'supplier' && ['pending', 'available'].includes(entry.effective_status)) result.supplier_due += amount;
    if (entry.entry_type === 'payout' && entry.account_type !== 'platform' && entry.effective_status === 'paid') result.paid_out += Math.abs(amount);
    return result;
  }, { total_sales: 0, platform_commission: 0, affiliate_commission: 0, supplier_due: 0, paid_out: 0 });
  if (params.format === 'csv') {
    headers['Content-Type'] = 'text/csv; charset=utf-8';
    headers['Content-Disposition'] = 'attachment; filename="boutique-piyay-ledger.csv"';
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = ['created_at,entry_type,account_type,account_id,amount,status,method'];
    for (const row of data || []) lines.push([row.created_at, row.entry_type, row.account_type, row.account_id || '', row.amount, row.effective_status, row.method].map(escape).join(','));
    return { statusCode: 200, headers, body: lines.join('\n') };
  }
  return respond(200, { from, to, totals, entries: data || [] }, headers);
}

async function getIdentity(authorization = '') {
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { user: null };
  const { data, error } = await supabase.auth.getUser(token);
  return { user: error ? null : data?.user || null };
}

async function isAdmin(userId) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role === 'admin';
}

function respond(statusCode, payload, headers) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

async function fetchAllRows(buildQuery) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await buildQuery(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}