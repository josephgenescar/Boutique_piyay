const crypto = require('crypto');
const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');
const {
  createMoncashPayment,
  retrieveMoncashTransaction,
  getTransactionDetails,
  isVerifiedMoncashPayment
} = require('./_moncash-client');

const supabaseUrl = process.env.SUPABASE_URL || 'https://letyferfjpxmstohvgcj.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = serviceKey ? createClient(supabaseUrl, serviceKey, { realtime: { transport: ws } }) : null;
const allowedOrigins = (process.env.SITE_ORIGIN || 'https://boutique-piyay.netlify.app')
  .split(',').map((origin) => origin.trim());
const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const orderIdPattern = /^VND-[0-9a-f-]{36}$/i;

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' }, headers);
  if (!supabase) return respond(500, { error: 'Vendor registration payment service is not configured' }, headers);

  try {
    const body = JSON.parse(event.body || '{}');
    if (body.action === 'create') return await createPayment(body, headers);
    if (body.action === 'verify') return await verifyPayment(body, headers);
    return respond(400, { error: 'Invalid payment action' }, headers);
  } catch (error) {
    console.error('Vendor registration payment request failed:', error.message);
    return respond(500, { error: 'Unable to process the vendor registration payment request' }, headers);
  }
};

async function createPayment(body, headers) {
  const userId = String(body.user_id || '');
  const accessKey = String(body.access_key || '');
  if (!userIdPattern.test(userId) || accessKey.length < 24 || accessKey.length > 200) {
    return respond(400, { error: 'Vendor registration payment details are invalid' }, headers);
  }

  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError) throw userError;
  if (userResult.user?.user_metadata?.vendor_registration_payment_key !== accessKey) {
    return respond(403, { error: 'Vendor registration payment access is invalid' }, headers);
  }

  const { data: application, error: applicationError } = await supabase.from('vendor_applications')
    .select('id,user_id,status').eq('user_id', userId).maybeSingle();
  if (applicationError) throw applicationError;
  if (!application || application.status !== 'pending') {
    return respond(409, { error: 'This vendor application is not awaiting registration payment' }, headers);
  }

  const { data: previousPayments, error: previousPaymentsError } = await supabase.from('vendor_registration_payments')
    .select('id,order_id,status,payment_url,created_at')
    .eq('application_id', application.id)
    .order('created_at', { ascending: false })
    .limit(1);
  if (previousPaymentsError) throw previousPaymentsError;
  const previous = previousPayments?.[0];
  if (previous?.status === 'paid') return respond(200, { status: 'paid', order_id: previous.order_id }, headers);
  if (previous?.status === 'refund_due' || previous?.status === 'refunded') {
    return respond(409, { error: 'This vendor application has a registration refund in progress' }, headers);
  }
  if (previous?.status === 'pending') {
    return respond(200, { status: 'pending', order_id: previous.order_id, redirect_url: previous.payment_url }, headers);
  }
  if (previous?.status === 'creating' && Date.now() - new Date(previous.created_at).getTime() < 2 * 60 * 1000) {
    return respond(202, { status: 'creating', order_id: previous.order_id }, headers);
  }
  if (previous && ['pending', 'creating'].includes(previous.status)) {
    const { error } = await supabase.from('vendor_registration_payments')
      .update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', previous.id);
    if (error) throw error;
  }

  const orderId = `VND-${crypto.randomUUID()}`;
  const { data: payment, error: insertError } = await supabase.from('vendor_registration_payments')
    .insert({
      application_id: application.id,
      user_id: userId,
      order_id: orderId,
      expected_amount: 1000,
      currency: 'HTG',
      status: 'creating'
    })
    .select('id')
    .single();
  if (insertError) {
    if (insertError.code === '23505') return respond(202, { status: 'creating' }, headers);
    throw insertError;
  }

  try {
    const redirectUrl = await createMoncashPayment({ amount: 1000, orderId });
    const { error: updateError } = await supabase.from('vendor_registration_payments')
      .update({ status: 'pending', payment_url: redirectUrl, updated_at: new Date().toISOString() })
      .eq('id', payment.id).eq('status', 'creating');
    if (updateError) throw updateError;
    return respond(200, { status: 'pending', order_id: orderId, redirect_url: redirectUrl }, headers);
  } catch (error) {
    const { error: updateError } = await supabase.from('vendor_registration_payments')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', payment.id).eq('status', 'creating');
    if (updateError) throw updateError;
    console.error('Unable to create MonCash vendor payment:', error.message);
    return respond(502, { error: 'MonCash could not start the 1,000 HTG payment. Please try again later.' }, headers);
  }
}

async function verifyPayment(body, headers) {
  let orderId = String(body.order_id || '');
  if (!orderId) {
    const userId = String(body.user_id || '');
    const accessKey = String(body.access_key || '');
    if (!userIdPattern.test(userId) || accessKey.length < 24 || accessKey.length > 200) {
      return respond(400, { error: 'Vendor registration payment details are invalid' }, headers);
    }
    const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) throw userError;
    if (userResult.user?.user_metadata?.vendor_registration_payment_key !== accessKey) {
      return respond(403, { error: 'Vendor registration payment access is invalid' }, headers);
    }
    const { data: application, error: applicationError } = await supabase.from('vendor_applications')
      .select('id').eq('user_id', userId).maybeSingle();
    if (applicationError) throw applicationError;
    if (!application) return respond(404, { error: 'Vendor application not found' }, headers);
    const { data: payments, error: paymentsError } = await supabase.from('vendor_registration_payments')
      .select('order_id,status').eq('application_id', application.id)
      .order('created_at', { ascending: false }).limit(1);
    if (paymentsError) throw paymentsError;
    if (!payments?.[0]) return respond(404, { error: 'Vendor registration payment not found' }, headers);
    orderId = payments[0].order_id;
    if (payments[0].status === 'paid') return respond(200, { status: 'paid' }, headers);
  }
  if (!orderIdPattern.test(orderId)) return respond(400, { error: 'Invalid vendor payment reference' }, headers);
  const { data: payment, error: paymentError } = await supabase.from('vendor_registration_payments')
    .select('id,order_id,expected_amount,status,provider_transaction_id')
    .eq('order_id', orderId).maybeSingle();
  if (paymentError) throw paymentError;
  if (!payment) return respond(404, { error: 'Vendor registration payment not found' }, headers);
  if (payment.status === 'paid') return respond(200, { status: 'paid' }, headers);
  if (payment.status !== 'pending') return respond(409, { error: 'Vendor registration payment is not pending' }, headers);

  const transaction = await retrieveMoncashTransaction(orderId);
  if (!isVerifiedMoncashPayment(transaction, orderId, Number(payment.expected_amount))) {
    return respond(200, { status: 'pending' }, headers);
  }
  const details = getTransactionDetails(transaction);
  const { error: confirmError } = await supabase.rpc('confirm_vendor_registration_payment', {
    p_order_id: orderId,
    p_provider_transaction_id: details.transactionId
  });
  if (confirmError) throw confirmError;
  return respond(200, { status: 'paid' }, headers);
}

function respond(statusCode, body, headers) {
  return { statusCode, headers, body: JSON.stringify(body) };
}
