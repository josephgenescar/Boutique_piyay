const ws = require('ws');
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { transport: ws })
  : null;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  if (!supabase) {
    console.error("Push registration missing Supabase configuration", {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_KEY: !!SUPABASE_KEY,
    });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server misconfiguration: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const subscription = body.subscription;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return { statusCode: 400, body: "Missing push subscription payload." };
  }

  const payload = {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_id: body.user_id || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(payload, { onConflict: ["endpoint"] });

    if (error) {
      console.error("Push registration error:", error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ saved: true }) };
  } catch (err) {
    console.error("Push registration unexpected error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err?.message || 'Unexpected error during push registration.' }),
    };
  }
};
