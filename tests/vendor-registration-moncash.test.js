const test = require('node:test');
const assert = require('node:assert/strict');
const { isVerifiedMoncashPayment } = require('../netlify/functions/_moncash-client');

const successfulTransaction = {
  payment: {
    order_id: 'VND-12345678-1234-4234-8234-123456789abc',
    cost: 1000,
    transaction_id: 'TXN-123456',
    message: 'successful'
  }
};

test('accepts only a successful MonCash transaction for the expected amount and order', () => {
  assert.equal(isVerifiedMoncashPayment(successfulTransaction, successfulTransaction.payment.order_id, 1000), true);
});

test('rejects transactions with a mismatched order, amount, status, or missing transaction id', () => {
  assert.equal(isVerifiedMoncashPayment(successfulTransaction, 'VND-another-order', 1000), false);
  assert.equal(isVerifiedMoncashPayment(successfulTransaction, successfulTransaction.payment.order_id, 999), false);
  assert.equal(isVerifiedMoncashPayment({
    payment: { ...successfulTransaction.payment, message: 'pending' }
  }, successfulTransaction.payment.order_id, 1000), false);
  assert.equal(isVerifiedMoncashPayment({
    payment: { ...successfulTransaction.payment, transaction_id: '' }
  }, successfulTransaction.payment.order_id, 1000), false);
});
