const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeWhatsAppNumber } = require('../netlify/functions/marketplace-payments');

test('WhatsApp contact numbers are normalized for chat links', () => {
  assert.equal(normalizeWhatsAppNumber('+509 4886-8964'), '50948868964');
  assert.equal(normalizeWhatsAppNumber('4886 8964'), '50948868964');
  assert.equal(normalizeWhatsAppNumber('001 202 555 0142'), '12025550142');
});

test('invalid or ambiguous WhatsApp contact numbers are not exposed', () => {
  assert.equal(normalizeWhatsAppNumber(''), null);
  assert.equal(normalizeWhatsAppNumber('123456789'), null);
  assert.equal(normalizeWhatsAppNumber('555-0100'), null);
});
