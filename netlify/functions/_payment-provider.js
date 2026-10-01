class PaymentProvider {
  async createPayment() {
    throw new Error('createPayment must be implemented');
  }

  async verifyPayment() {
    throw new Error('verifyPayment must be implemented');
  }

  async handleWebhook() {
    throw new Error('handleWebhook must be implemented');
  }
}

class ManualProvider extends PaymentProvider {
  async createPayment(order, settings) {
    const prefix = order.payment_method === 'moncash' ? 'moncash' : 'natcash';
    return {
      method: order.payment_method,
      destination: settings[`${prefix}_number`] || null,
      qr_url: settings[`${prefix}_qr_url`] || null,
      amount: order.total_amount,
      currency: order.currency,
      reference: order.payment_reference,
      expires_at: order.expires_at
    };
  }

  async verifyPayment() {
    return { verified: false, requires_admin_review: true };
  }

  async handleWebhook() {
    return { accepted: false, reason: 'Manual provider has no webhook' };
  }
}

function getPaymentProvider(method) {
  if (['moncash', 'natcash'].includes(String(method).toLowerCase())) return new ManualProvider();
  throw new Error('Unsupported payment provider');
}

module.exports = { PaymentProvider, ManualProvider, getPaymentProvider };