const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://letyferfjpxmstohvgcj.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const action = body.action;

  if (!action) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing action' }) };
  }

  try {
    if (action === 'delete_product') {
      const productId = body.productId;
      if (!productId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing productId' }) };
      }

      const { error } = await supabase.from('user_products').delete().eq('id', productId);
      if (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Failed to delete product' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Pwodwi efase avèk siksè.' })
      };
    }

    if (action === 'delete_shop') {
      const shopId = body.shopId;
      if (!shopId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing shopId' }) };
      }

      const { error: prodError } = await supabase.from('user_products').delete().eq('seller_id', shopId);
      if (prodError) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: prodError.message || 'Failed to delete shop products' }) };
      }

      const { error: shopError } = await supabase.from('profiles').delete().eq('id', shopId);
      if (shopError) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: shopError.message || 'Failed to delete shop profile' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Boutik efase avèk siksè.' })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
};
