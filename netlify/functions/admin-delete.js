const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://letyferfjpxmstohvgcj.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldHlmZXJmanB4bXN0b2h2Z2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjcwMDIsImV4cCI6MjA4OTgwMzAwMn0.Y5BVX8ewoEyiVfyy5AZRNXdn-phbhBWqwfYuWmSBjKg";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { transport: ws });

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
    console.log('Admin delete function called with action:', action);
    console.log('Body:', body);

    if (action === 'delete_product') {
      const productId = body.productId;
      if (!productId) {
        console.error('Missing productId');
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing productId' }) };
      }

      console.log('Deleting product:', productId);
      const { error } = await supabase.from('user_products').delete().eq('id', productId);
      if (error) {
        console.error('Error deleting product:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Failed to delete product' }) };
      }

      console.log('Product deleted successfully');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Pwodwi efase avèk siksè.' })
      };
    }

    if (action === 'delete_shop') {
      const shopId = body.shopId;
      if (!shopId) {
        console.error('Missing shopId');
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing shopId' }) };
      }

      console.log('Deleting shop products for shop:', shopId);
      const { error: prodError } = await supabase.from('user_products').delete().eq('seller_id', shopId);
      if (prodError) {
        console.error('Error deleting shop products:', prodError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: prodError.message || 'Failed to delete shop products' }) };
      }

      console.log('Deleting referral keys for shop:', shopId);
      const { error: referralError } = await supabase.from('referral_keys').delete().eq('used_by', shopId);
      if (referralError) {
        console.error('Error deleting referral keys:', referralError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: referralError.message || 'Failed to delete referral keys' }) };
      }

      console.log('Deleting orders for seller or buyer shop:', shopId);
      const { error: sellerOrderError } = await supabase.from('orders').delete().eq('seller_id', shopId);
      if (sellerOrderError) {
        console.error('Error deleting seller orders:', sellerOrderError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: sellerOrderError.message || 'Failed to delete seller orders' }) };
      }
      const { error: buyerOrderError } = await supabase.from('orders').delete().eq('buyer_id', shopId);
      if (buyerOrderError) {
        console.error('Error deleting buyer orders:', buyerOrderError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: buyerOrderError.message || 'Failed to delete buyer orders' }) };
      }

      console.log('Deleting site traffic for shop:', shopId);
      const { error: trafficError } = await supabase.from('site_traffic').delete().eq('seller_id', shopId);
      if (trafficError) {
        console.error('Error deleting site traffic:', trafficError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: trafficError.message || 'Failed to delete site traffic' }) };
      }

      console.log('Deleting wallet and transactions for shop:', shopId);
      const { data: walletData, error: walletFetchError } = await supabase.from('wallets').select('id').eq('user_id', shopId).single();
      if (walletFetchError && walletFetchError.code !== 'PGRST116') {
        console.error('Error fetching wallet:', walletFetchError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: walletFetchError.message || 'Failed to fetch wallet' }) };
      }
      if (walletData && walletData.id) {
        const { error: transactionError } = await supabase.from('transactions').delete().eq('wallet_id', walletData.id);
        if (transactionError) {
          console.error('Error deleting wallet transactions:', transactionError);
          return { statusCode: 500, headers, body: JSON.stringify({ error: transactionError.message || 'Failed to delete wallet transactions' }) };
        }
        const { error: walletDeleteError } = await supabase.from('wallets').delete().eq('id', walletData.id);
        if (walletDeleteError) {
          console.error('Error deleting wallet:', walletDeleteError);
          return { statusCode: 500, headers, body: JSON.stringify({ error: walletDeleteError.message || 'Failed to delete wallet' }) };
        }
      }

      console.log('Deleting affiliate data for shop:', shopId);
      const { data: affiliateData, error: affiliateFetchError } = await supabase.from('affiliates').select('id').eq('user_id', shopId).single();
      if (affiliateFetchError && affiliateFetchError.code !== 'PGRST116') {
        console.error('Error fetching affiliate:', affiliateFetchError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: affiliateFetchError.message || 'Failed to fetch affiliate' }) };
      }
      if (affiliateData && affiliateData.id) {
        const { error: withdrawalError } = await supabase.from('affiliate_withdrawals').delete().eq('affiliate_id', affiliateData.id);
        if (withdrawalError) {
          console.error('Error deleting affiliate withdrawals:', withdrawalError);
          return { statusCode: 500, headers, body: JSON.stringify({ error: withdrawalError.message || 'Failed to delete affiliate withdrawals' }) };
        }
        const { error: transactionError2 } = await supabase.from('affiliate_transactions').delete().eq('affiliate_id', affiliateData.id);
        if (transactionError2) {
          console.error('Error deleting affiliate transactions:', transactionError2);
          return { statusCode: 500, headers, body: JSON.stringify({ error: transactionError2.message || 'Failed to delete affiliate transactions' }) };
        }
        const { error: affiliateDeleteError } = await supabase.from('affiliates').delete().eq('id', affiliateData.id);
        if (affiliateDeleteError) {
          console.error('Error deleting affiliate record:', affiliateDeleteError);
          return { statusCode: 500, headers, body: JSON.stringify({ error: affiliateDeleteError.message || 'Failed to delete affiliate record' }) };
        }
      }

      console.log('Deleting shop profile for shop:', shopId);
      const { error: shopError } = await supabase.from('profiles').delete().eq('id', shopId);
      if (shopError) {
        console.error('Error deleting shop profile:', shopError);
        return { statusCode: 500, headers, body: JSON.stringify({ error: shopError.message || 'Failed to delete shop profile' }) };
      }

      console.log('Shop deleted successfully');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Boutik efase avèk siksè.' })
      };
    }

    console.error('Unknown action:', action);
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (error) {
    console.error('Internal server error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || 'Internal server error' }) };
  }
};
