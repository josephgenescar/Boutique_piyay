const { createHmac } = require('crypto');
const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://letyferfjpxmstohvgcj.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = serviceKey ? createClient(supabaseUrl, serviceKey, { transport: ws }) : null;

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' }, headers);
  if (!supabase) return respond(503, { error: 'Affiliate tracking is not configured' }, headers);

  let referralCode;
  let visitorId;
  try {
    const body = JSON.parse(event.body || '{}');
    referralCode = String(body.referral_code || '').trim();
    visitorId = String(body.visitor_id || '').trim();
  } catch {
    return respond(400, { error: 'Invalid request body' }, headers);
  }
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(referralCode) || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(visitorId)) {
    return respond(202, { ok: true }, headers);
  }

  const ipAddress = event.headers['x-nf-client-connection-ip'] || event.requestContext?.identity?.sourceIp;
  const userAgent = event.headers['user-agent'] || '';
  if (!ipAddress || !userAgent) return respond(202, { ok: true }, headers);

  const visitorFingerprint = createHmac('sha256', serviceKey)
    .update(`${ipAddress}\n${userAgent}\n${visitorId}`)
    .digest('hex');
  const { error } = await supabase.rpc('record_affiliate_click', {
    p_referral_code: referralCode,
    p_visitor_fingerprint: visitorFingerprint
  });
  if (error) {
    console.error('Affiliate visit could not be recorded:', error.message);
    return respond(202, { ok: false }, headers);
  }

  return respond(202, { ok: true }, headers);
};

function respond(statusCode, body, headers) {
  return { statusCode, headers, body: JSON.stringify(body) };
}