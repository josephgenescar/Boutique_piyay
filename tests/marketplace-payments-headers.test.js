const test = require('node:test');
const assert = require('node:assert/strict');
const { getHeaderValue } = require('../netlify/functions/marketplace-payments');

test('marketplace function reads authorization headers regardless of casing', () => {
  assert.equal(getHeaderValue({ authorization: 'Bearer lower' }, 'authorization'), 'Bearer lower');
  assert.equal(getHeaderValue({ Authorization: 'Bearer upper' }, 'authorization'), 'Bearer upper');
  assert.equal(getHeaderValue({ AUTHORIZATION: 'Bearer caps' }, 'authorization'), 'Bearer caps');
});

test('marketplace function returns an empty value when a header is missing', () => {
  assert.equal(getHeaderValue({}, 'authorization'), '');
});
