const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeItems } = require('../netlify/functions/create-order');

test('checkout accepts product IDs and quantities, discarding client money fields', () => {
  const result = normalizeItems([{
    product_id: '123e4567-e89b-12d3-a456-426614174000',
    quantity: 2,
    price: 0.01,
    unit_price: 0.01,
    total_amount: 0.02,
    commission_rate: 0,
    commission_amount: 0,
    affiliate_amount: 999999,
    supplier_net: 999999,
    balance: 999999
  }]);

  assert.deepEqual(result, [{
    product_id: '123e4567-e89b-12d3-a456-426614174000',
    quantity: 2
  }]);
});

test('checkout rejects invalid quantities and non-UUID product identifiers', () => {
  assert.throws(() => normalizeItems([{ product_id: 'product-1', quantity: 1 }]), /product IDs/);
  assert.throws(() => normalizeItems([{ product_id: '123e4567-e89b-12d3-a456-426614174000', quantity: 0 }]), /product IDs/);
  assert.throws(() => normalizeItems([]), /order item/);
});