const { createClient } = require('@supabase/supabase-js');

const SUP_URL = "https://letyferfjpxmstohvgcj.supabase.co";
const SUP_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUP_KEY ? createClient(SUP_URL, SUP_KEY) : null;

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Méthode non autorisée. Utilisez POST.' })
    };
  }

  if (!supabase) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Serveur mal configuré : SUPABASE_SERVICE_ROLE_KEY manquant.' })
    };
  }

  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    const orders = Array.isArray(payload.orders) ? payload.orders : null;

    if (!orders || orders.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Payload invalide : orders est requis.' })
      };
    }

    const { data, error } = await supabase
      .from('orders')
      .insert(orders);

    if (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message, details: error.details })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
