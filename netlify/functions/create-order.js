const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const SUP_URL = 'https://letyferfjpxmstohvgcj.supabase.co';
const SUP_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUP_KEY ? createClient(SUP_URL, SUP_KEY, { transport: ws }) : null;

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:genescarmike@gmail.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
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

    const { data: insertedOrders, error } = await supabase
      .from('orders')
      .insert(orders)
      .select();

    if (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message, details: error.details })
      };
    }

    const orderGroupId = orders[0]?.order_group_id || null;
    const customerName = orders[0]?.customer_name || null;
    const customerPhone = orders[0]?.customer_phone || null;
    const customerEmail = orders[0]?.customer_email || null;
    const paymentMethod = orders[0]?.payment_method || null;
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const sellerOrderGroups = insertedOrders.reduce((groups, order) => {
      if (!order.seller_id) return groups;
      groups[order.seller_id] = groups[order.seller_id] || [];
      groups[order.seller_id].push(order);
      return groups;
    }, {});

    if (orderGroupId) {
      await createAdminNotification(orderGroupId, customerName, customerPhone, customerEmail, paymentMethod, totalAmount, insertedOrders);
    }

    await Promise.all(Object.entries(sellerOrderGroups).map(([sellerId, sellerOrders]) =>
      createSellerNotification(sellerId, orderGroupId, customerName, totalAmount, sellerOrders)
    ));

    await processAffiliateCommissions(insertedOrders);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ data: insertedOrders })
    };
  } catch (err) {
    console.error('Create order error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};

async function createAdminNotification(orderGroupId, customerName, customerPhone, customerEmail, paymentMethod, totalAmount, insertedOrders) {
  try {
    await supabase.from('admin_notifications').insert({
      type: 'new_order',
      title: `Nouvo Komann ${orderGroupId}`,
      message: `Nouvo komann pa ${customerName || 'yon kliyan'} pou ${totalAmount} HTG`,
      data: {
        order_group_id: orderGroupId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        payment_method: paymentMethod,
        total_amount: totalAmount,
        items: insertedOrders.map((order) => ({ seller_id: order.seller_id, amount: order.amount, quantity: order.quantity, order_id: order.id }))
      },
      is_read: false
    });
  } catch (err) {
    console.warn('Unable to create admin notification:', err.message || err);
  }
}

async function createSellerNotification(userId, orderGroupId, customerName, totalAmount, sellerOrders = []) {
  const sellerAmount = sellerOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const sellerItems = sellerOrders.flatMap(order => {
    try {
      return Array.isArray(order.order_items) ? order.order_items : [];
    } catch (err) {
      return [];
    }
  });

  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'new_order',
      title: `Nouvo komann ${orderGroupId}`,
      body: `Ou gen nouvo komann ${orderGroupId} pou ${sellerAmount} HTG soti nan ${customerName || 'yon kliyan'}.`,
      data: {
        order_group_id: orderGroupId,
        customer_name: customerName,
        amount: sellerAmount,
        seller_items: sellerItems
      },
      read: false
    });
  } catch (err) {
    console.warn('Unable to create seller notification record:', err.message || err);
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return;
  }

  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (error || !subscriptions || subscriptions.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      title: '🛍️ Nouvo Komann!',
      body: `Ou gen yon nouvo komann ${orderGroupId} pou ${totalAmount} HTG.`,
      type: 'new_order',
      data: { order_group_id: orderGroupId, amount: totalAmount }
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400 }
        )
      )
    );

    const failedEndpoints = subscriptions
      .filter((_, index) => results[index].status === 'rejected')
      .map((_, index) => subscriptions[index].endpoint);

    if (failedEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', failedEndpoints);
    }
  } catch (err) {
    console.warn('Unable to send push notification:', err.message || err);
  }
}

async function processAffiliateCommissions(insertedOrders) {
  const affiliateOrders = insertedOrders.filter(order => order.affiliate_id);
  if (!affiliateOrders.length) return;

  const ordersByAffiliate = affiliateOrders.reduce((groups, order) => {
    const affiliateId = order.affiliate_id;
    groups[affiliateId] = groups[affiliateId] || [];
    groups[affiliateId].push(order);
    return groups;
  }, {});

  for (const [affiliateId, orders] of Object.entries(ordersByAffiliate)) {
    const commissionTotal = orders.reduce((sum, order) => sum + Number(order.affiliate_commission || 0), 0);
    if (commissionTotal <= 0) continue;

    try {
      const { data: affiliateRow, error: affiliateRowError } = await supabase
        .from('affiliates')
        .select('id,user_id,balance')
        .eq('id', affiliateId)
        .single();

      if (affiliateRowError || !affiliateRow) {
        console.warn('⚠️ Pa jwenn affiliate pou komisyon:', affiliateId, affiliateRowError);
        continue;
      }

      const newBalance = Number(affiliateRow.balance || 0) + commissionTotal;
      await supabase.from('affiliates').update({ balance: newBalance }).eq('id', affiliateId);

      const transactions = orders.map(order => ({
        affiliate_id: affiliateId,
        amount: order.affiliate_commission,
        type: 'order_commission',
        description: `Komisyon pou komann ${order.order_group_id}`,
        created_at: new Date().toISOString()
      }));

      await supabase.from('affiliate_transactions').insert(transactions);

      await supabase.from('notifications').insert({
        user_id: affiliateRow.user_id,
        type: 'commission_earned',
        title: `💰 Ou touche ${commissionTotal.toLocaleString()} HTG`,
        body: `Yon komisyon te ajoute pou komann ${orders.map(o => o.order_group_id).join(', ')}.`,
        data: {
          order_group_ids: orders.map(o => o.order_group_id),
          amount: commissionTotal
        },
        read: false
      });
    } catch (err) {
      console.warn('⚠️ Erè processe komisyon affiliate:', err.message || err);
    }
  }
}
