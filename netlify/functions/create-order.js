const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { getPaymentProvider } = require('./_payment-provider');

const supabaseUrl = process.env.SUPABASE_URL || 'https://letyferfjpxmstohvgcj.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = serviceKey ? createClient(supabaseUrl, serviceKey, { transport: ws }) : null;
const allowedOrigins = (process.env.SITE_ORIGIN || 'https://boutique-piyay.netlify.app').split(',').map((origin) => origin.trim());

exports.handler = async (event) => {
  const requestOrigin = event.headers.origin || event.headers.Origin || '';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' }, headers);
  if (!supabase) return respond(500, { error: 'Payment service is not configured' }, headers);

  try {
    const body = JSON.parse(event.body || '{}');
    const items = normalizeItems(body.items);
    if (body.action === 'quote') {
      const quote = await getOrderQuote(items);
      return respond(200, { quote }, headers);
    }

    const idempotencyKey = String(body.idempotency_key || '');
    if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) return respond(400, { error: 'A valid request ID is required' }, headers);

    const auth = await getIdentity(event.headers.authorization);
    if (auth.error) return respond(401, { error: 'Invalid login session' }, headers);
    const { data, error } = await supabase.rpc('create_marketplace_order', {
      p_items: items,
      p_customer_name: String(body.customer?.name || '').trim(),
      p_customer_phone: String(body.customer?.phone || '').trim(),
      p_customer_email: auth.user?.email || null,
      p_delivery_zone: String(body.customer?.zone || '').trim(),
      p_delivery_address: String(body.customer?.address || '').trim(),
      p_payment_method: String(body.payment_method || '').toLowerCase(),
      p_referral_code: typeof body.referral_code === 'string' ? body.referral_code.trim() : null,
      p_customer_id: auth.user?.id || null,
      p_idempotency_key: idempotencyKey
    });
    if (error) return respond(400, { error: error.message }, headers);
    let payment = null;
    if (['moncash', 'natcash'].includes(String(body.payment_method).toLowerCase())) {
      const { data: settings, error: settingsError } = await supabase.from('payment_settings')
        .select('moncash_number,moncash_qr_url,natcash_number,natcash_qr_url').eq('id', true).single();
      if (settingsError) throw settingsError;
      payment = await getPaymentProvider(body.payment_method).createPayment({
        payment_method: String(body.payment_method).toLowerCase(),
        total_amount: data.total_amount,
        currency: data.currency,
        payment_reference: data.payment_reference,
        expires_at: data.expires_at
      }, settings);
    }
    return respond(201, { data, payment }, headers);
  } catch (error) {
    console.error('Create marketplace order failed:', error.message);
    return respond(400, { error: 'Unable to create order' }, headers);
  }
};

async function getIdentity(authorization = '') {
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { user: null, error: false };
  const { data, error } = await supabase.auth.getUser(token);
  return { user: data?.user || null, error: Boolean(error || !data?.user) };
}

function respond(statusCode, payload, headers) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw new Error('At least one valid order item is required');
  }
  const normalized = items.map((item) => ({
    product_id: String(item?.product_id || ''),
    quantity: Number(item?.quantity)
  }));
  if (normalized.some((item) => !/^[0-9a-f-]{36}$/i.test(item.product_id)
    || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
    throw new Error('Only product IDs and valid quantities are accepted');
  }
  const aggregated = new Map();
  normalized.forEach((item) => {
    aggregated.set(item.product_id, (aggregated.get(item.product_id) || 0) + item.quantity);
  });
  const result = [...aggregated].map(([product_id, quantity]) => ({ product_id, quantity }));
  if (result.some((item) => item.quantity > 99)) throw new Error('Quantity exceeds the per-product limit');
  return result;
}

async function getOrderQuote(items) {
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for price quotes');
  const productIds = items.map((item) => item.product_id);
  const { data: products, error } = await supabase.from('user_products')
    .select('id,title,price,image_url,stock,is_approved,seller_id')
    .in('id', productIds);
  if (error) throw error;

  const productsById = new Map((products || []).map((product) => [product.id, product]));
  if (productIds.some((id) => !productsById.has(id))) throw new Error('One or more products are unavailable');

  const lines = items.map((item) => {
    const product = productsById.get(item.product_id);
    const price = Number(product.price);
    const stock = Number(product.stock);
    if (product.is_approved !== true || !product.seller_id || !Number.isFinite(price) || price < 0 || stock < item.quantity) {
      throw new Error(`Product unavailable or insufficient stock: ${item.product_id}`);
    }
    const unitPriceCents = Math.round(price * 100);
    return {
      product_id: product.id,
      seller_id: product.seller_id,
      title: String(product.title || 'Produit'),
      image_url: safeQuoteImage(product.image_url),
      quantity: item.quantity,
      unit_price: (unitPriceCents / 100).toFixed(2),
      line_total: (unitPriceCents * item.quantity / 100).toFixed(2)
    };
  });

  const sellerIds = [...new Set(lines.map((line) => line.seller_id).filter(Boolean))];
  let sellersById = {};
  if (sellerIds.length) {
    const { data: sellers, error: sellerError } = await supabase.from('profiles')
      .select('id,shop_name,full_name').in('id', sellerIds);
    if (sellerError) throw sellerError;
    sellersById = Object.fromEntries((sellers || []).map((seller) => [seller.id, seller]));
  }
  lines.forEach((line) => {
    const seller = sellersById[line.seller_id];
    line.seller_name = seller?.shop_name || seller?.full_name || 'Boutique Piyay';
  });

  return {
    currency: 'HTG',
    items: lines,
    total_amount: (lines.reduce((total, line) => total + Math.round(Number(line.line_total) * 100), 0) / 100).toFixed(2)
  };
}

function safeQuoteImage(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const imageUrl = value.trim();
  if (imageUrl.startsWith('/assets/') && !imageUrl.startsWith('//')) return imageUrl;
  try {
    const parsed = new URL(imageUrl);
    return parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    return '';
  }
}

exports.normalizeItems = normalizeItems;
exports.getOrderQuote = getOrderQuote;
