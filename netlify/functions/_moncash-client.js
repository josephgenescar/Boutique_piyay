const axios = require('axios');

function getMoncashConfig(env = process.env) {
  const isProduction = String(env.MONCASH_ENV || 'sandbox').toLowerCase() === 'production';
  const apiBaseUrl = String(env.MONCASH_API_BASE_URL || (isProduction ? '' : 'https://sandbox.moncashbutton.digicelgroup.com/Api')).replace(/\/+$/, '');
  const checkoutBaseUrl = String(env.MONCASH_CHECKOUT_BASE_URL || (isProduction ? '' : 'https://sandbox.moncashbutton.digicelgroup.com/MonCash-middleware/Checkout')).replace(/\/+$/, '');
  const clientId = String(env.MONCASH_CLIENT_ID || '').trim();
  const clientSecret = String(env.MONCASH_CLIENT_SECRET || '').trim();

  if (!clientId || !clientSecret) throw new Error('MonCash credentials are not configured');
  if (!apiBaseUrl || !checkoutBaseUrl) throw new Error('Production MonCash URLs must be configured');
  return { apiBaseUrl, checkoutBaseUrl, clientId, clientSecret };
}

async function getAccessToken(config) {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const response = await axios.post(`${config.apiBaseUrl}/oauth/token`, null, {
    params: { grant_type: 'client_credentials' },
    headers: { Authorization: `Basic ${credentials}`, Accept: 'application/json' },
    timeout: 15000
  });
  if (!response.data?.access_token) throw new Error('MonCash did not return an access token');
  return response.data.access_token;
}

async function createMoncashPayment({ amount, orderId }) {
  const config = getMoncashConfig();
  const accessToken = await getAccessToken(config);
  const response = await axios.post(`${config.apiBaseUrl}/v1/CreatePayment`, {
    amount,
    orderId
  }, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 15000
  });
  const token = response.data?.payment_token?.token || response.data?.token;
  if (!token) throw new Error('MonCash did not return a checkout token');
  return `${config.checkoutBaseUrl}/${encodeURIComponent(String(token))}`;
}

async function retrieveMoncashTransaction(orderId) {
  const config = getMoncashConfig();
  const accessToken = await getAccessToken(config);
  const response = await axios.post(`${config.apiBaseUrl}/v1/RetrieveTransactionByOrderId`, { orderId }, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: 15000
  });
  return response.data;
}

function getTransactionDetails(payload) {
  const root = payload?.payment || payload?.data?.payment || payload?.data || payload || {};
  return {
    orderId: String(root.order_id ?? root.orderId ?? payload?.order_id ?? payload?.orderId ?? ''),
    amount: Number(root.amount ?? root.cost ?? payload?.amount ?? payload?.cost),
    transactionId: String(root.transaction_id ?? root.transactionId ?? root.reference ?? payload?.transaction_id ?? ''),
    status: String(root.status ?? root.message ?? root.transaction_status ?? root.transactionStatus ?? '').toLowerCase()
  };
}

function isVerifiedMoncashPayment(payload, expectedOrderId, expectedAmount) {
  const details = getTransactionDetails(payload);
  return details.orderId === expectedOrderId
    && details.amount === expectedAmount
    && details.transactionId.length >= 4
    && ['success', 'successful', 'completed', 'approved'].includes(details.status);
}

module.exports = {
  createMoncashPayment,
  retrieveMoncashTransaction,
  getTransactionDetails,
  isVerifiedMoncashPayment
};
