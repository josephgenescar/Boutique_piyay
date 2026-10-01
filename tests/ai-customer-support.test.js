const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeMessage,
  safeImageUrl,
  searchCatalog,
  getSupportReply,
  loadSystemPrompt,
  handler
} = require('../netlify/functions/ai-chat');

test('customer payment guidance says pay Boutique Piyay, not the seller', () => {
  const creoleReply = getSupportReply('Kijan m peye ak MonCash?', 'ht').toLowerCase();
  const frenchReply = getSupportReply('Comment payer par NatCash ?', 'fr').toLowerCase();

  assert.match(creoleReply, /boutique piyay/);
  assert.match(creoleReply, /bp/);
  assert.match(creoleReply, /pa peye vandè a dirèkteman/);
  assert.match(frenchReply, /boutique piyay/);
  assert.match(frenchReply, /ne payez pas le vendeur directement/);
});

test('AI prompt file contains the current payment policy and safe-response rules', () => {
  const prompt = loadSystemPrompt();
  assert.match(prompt, /Pa janm di kliyan an peye vandè a dirèkteman/i);
  assert.match(prompt, /Pa voye HTML/i);
});

test('message normalization removes control characters and trims input', () => {
  assert.equal(normalizeMessage('  Bonjou\u0000\u0007  '), 'Bonjou');
  assert.equal(normalizeMessage({ message: 'no' }), '');
});

test('product image URLs allow HTTPS and same-site paths only', () => {
  assert.equal(safeImageUrl('https://ik.imagekit.io/bp/item.webp'), 'https://ik.imagekit.io/bp/item.webp');
  assert.equal(safeImageUrl('/assets/images/item.jpg'), '/assets/images/item.jpg');
  assert.equal(safeImageUrl('//evil.example/image.png'), '');
  assert.equal(safeImageUrl('javascript:alert(1)'), '');
  assert.equal(safeImageUrl('data:image/svg+xml,<svg/>'), '');
  assert.equal(safeImageUrl('http://example.com/image.png'), '');
});

test('server catalog search ranks real matches and returns only structured product data', () => {
  const catalog = [
    { id: 'one', title: 'Telephone Android', price: 12000, image_url: 'https://img.example/phone.webp', category: 'Electronique', seller_name: 'Boutik A' },
    { id: 'two', title: 'Robe rouge', price: 2500, image_url: 'https://img.example/dress.webp', category: 'Habillement', seller_name: 'Boutik B' }
  ];

  assert.deepEqual(searchCatalog('Mwen ap chèche telephone Android', catalog), [catalog[0]]);
  assert.deepEqual(searchCatalog('pwodwi ki pa egziste', catalog), []);
  assert.deepEqual(searchCatalog('Quels produits sont disponibles ?', catalog), catalog);
});

test('AI endpoint answers payment questions from verified policy without model or browser catalog', async () => {
  const response = await handler({
    httpMethod: 'POST',
    headers: {
      origin: 'https://boutique-piyay.netlify.app',
      'x-nf-client-connection-ip': 'ai-support-payment-test'
    },
    body: JSON.stringify({
      message: 'Kijan m ka peye ak MonCash?',
      lang: 'ht',
      catalog: [{ title: 'Fo pwodwi', price: 1, image: 'javascript:alert(1)' }]
    })
  });
  const result = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.match(result.reply, /Boutique Piyay/);
  assert.match(result.reply, /kòd BP/);
  assert.match(result.reply, /Pa peye vandè a dirèkteman/);
  assert.deepEqual(result.products, []);
});