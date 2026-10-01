const CART_KEY = 'boutique_piyay_cart';

console.log('🛒 cart.js chaje - fonksyon orderProduct disponib:', typeof window.orderProduct);

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

function groupCartBySeller(cart) {
  return cart.reduce((groups, item) => {
    const sellerId = item.sellerId || item.seller_id || 'boutique-piyay';
    const qty = Number(item.qty || item.quantity || 1);
    const price = parseFloat(item.price) || 0;

    if (!groups[sellerId]) {
      groups[sellerId] = {
        sellerId,
        sellerName: item.sellerName || item.seller_name || 'Boutique Piyay',
        sellerPhone: item.sellerPhone || item.seller_phone || '50948868964',
        items: [],
        amount: 0,
      };
    }

    groups[sellerId].items.push({
      ...item,
      quantity: qty,
      price,
      total: qty * price,
    });
    groups[sellerId].amount += qty * price;

    return groups;
  }, {});
}

function getSupabaseClient() {
  if (typeof window === 'undefined') return null;
  if (window.supabaseMain) return window.supabaseMain;
  if (window.supabase) {
    const url = window.SUPABASE_URL || window.S_URL || window.SUP_URL || window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY || window.SUP_KEY || window.S_KEY || window.SUPABASE_KEY;
    if (url && key) {
      try {
        return window.supabase.createClient(url, key);
      } catch (err) {
        console.warn('Supabase client creation failed:', err);
      }
    }
  }
  return null;
}

async function getCurrentCustomerEmail(sup) {
  if (!sup || !sup.auth || typeof sup.auth.getUser !== 'function') return null;
  try {
    const { data } = await sup.auth.getUser();
    return data?.user?.email || null;
  } catch (err) {
    return null;
  }
}

function buildOrderPayload(cart, customerEmail, customerName, customerPhone, zone, paymentMethod, orderGroupId, affiliateId = null, referralCode = null, affiliateUserId = null, customerAddress = '') {
  const grouped = {};
  const affiliateRate = affiliateId ? 0.10 : 0;
  cart.forEach(item => {
    const sellerId = item.sellerId || item.seller_id;
    if (!sellerId) {
      throw new Error(`Cart item is missing sellerId: ${item.title || item.id || 'unknown item'}`);
    }
    if (!grouped[sellerId]) {
      grouped[sellerId] = {
        sellerId,
        sellerName: item.sellerName || item.seller_name || 'Boutique Piyay',
        sellerPhone: item.sellerPhone || item.seller_phone || '50948868964',
        items: [],
        amount: 0
      };
    }
    const qty = item.qty || item.quantity || 1;
    const price = parseFloat(item.price) || 0;
    const commission = parseFloat(((price * qty) * affiliateRate).toFixed(2));
    grouped[sellerId].items.push({
      product_id: item.id || null,
      title: item.title || 'Produit',
      quantity: qty,
      price: price,
      affiliate_commission: commission
    });
    grouped[sellerId].amount += price * qty;
  });

  const createdAt = new Date().toISOString();
  return Object.values(grouped).map(group => ({
    seller_id: group.sellerId,
    seller_name: group.sellerName,
    seller_phone: group.sellerPhone,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    delivery_zone: zone,
    delivery_address: customerAddress,
    payment_method: paymentMethod,
    order_group_id: orderGroupId,
    order_items: group.items,
    product_id: group.items.length === 1 ? group.items[0].product_id : null,
    quantity: group.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
    amount: group.amount,
    total_price: group.amount,
    affiliate_id: affiliateId,
    referral_code: referralCode,
    affiliate_user_id: affiliateUserId,
    affiliate_commission: group.items.reduce((sum, item) => sum + Number(item.affiliate_commission || 0), 0),
    status: 'pending',
    payment_status: 'pending',
    currency: 'HTG',
    created_at: createdAt,
    updated_at: createdAt
  }));
}

async function resolveSellerPhoneFallbacks(sellers) {
  if (!sellers || typeof sellers !== 'object') return;
  const sup = getSupabaseClient();
  if (!sup) return;

  const sellerIds = Object.entries(sellers)
    .filter(([sellerId, group]) => {
      const phone = (group.phone || '').toString().replace(/[^0-9]/g, '');
      return sellerId && sellerId !== 'boutique-piyay' && !phone;
    })
    .map(([sellerId]) => sellerId);

  if (sellerIds.length === 0) return;

  const { data: profiles, error } = await sup.from('profiles')
    .select('id, whatsapp_number, whatsapp, shop_name, full_name')
    .in('id', sellerIds);

  if (error || !profiles) return;

  profiles.forEach(prof => {
    const group = sellers[prof.id];
    if (!group) return;
    const resolvedPhone = (prof.whatsapp_number || prof.whatsapp || '').toString().replace(/[^0-9]/g, '');
    if (resolvedPhone) {
      group.phone = resolvedPhone;
    }
    if (!group.sellerName || group.sellerName === 'Boutique Piyay') {
      group.sellerName = prof.shop_name || prof.full_name || group.sellerName;
    }
  });

  Object.keys(sellers).forEach(key => {
    if (!sellers[key].phone) {
      sellers[key].phone = '50948868964';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  refreshBadge();
});

window.orderProduct = function(title, price, id, image, sellerId, sellerPhone, sellerName) {
  // Evite double appel
  if (window.orderProduct._adding) {
    console.log('⚠️ orderProduct deja ap ajoute, anile');
    return;
  }
  window.orderProduct._adding = true;
  setTimeout(() => window.orderProduct._adding = false, 500);

  let currentCart = getCart();
  let key = id || title.replace(/\s+/g,'-').toLowerCase();
  let found = false;

  for (let i = 0; i < currentCart.length; i++) {
    if (currentCart[i].id === key) { currentCart[i].qty += 1; found = true; break; }
  }

  if (!found) {
    currentCart.push({
      id: key, title: title, price: parseFloat(price) || 0,
      img: image || '', qty: 1, sellerId: sellerId || null, sellerPhone: sellerPhone || null, sellerName: sellerName || 'Boutique Piyay'
    });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
  refreshBadge();
  alert('✅ ' + title + ' ajouté au panier!');
}

window.openCart = function() {
  const m = document.getElementById('order-modal');
  if (m) {
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    drawCart();
  }
}

function closeOrderModal() {
  const m = document.getElementById('order-modal');
  if (m) {
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeOrderModal();
});

document.addEventListener('click', (event) => {
  if (event.target?.id === 'order-modal') closeOrderModal();
});

let cartQuoteSequence = 0;
window.cartQuoteReady = false;

function drawCart() {
  const box = document.getElementById('order-summary');
  const footer = document.getElementById('order-form-container');
  if (!box || !footer) return;
  const cart = getCart();
  const total = document.getElementById('cart-server-total');
  const status = document.getElementById('cart-quote-status');
  const checkoutButton = document.getElementById('cart-checkout-button');
  window.cartQuoteReady = false;

  if (!cart.length) {
    const empty = document.createElement('div');
    empty.className = 'cart-empty';
    empty.innerHTML = '<div><strong>Panier vid</strong><span>Ajoute pwodwi ou ta renmen achte yo.</span></div>';
    box.replaceChildren(empty);
    footer.hidden = true;
    if (total) total.textContent = '—';
    if (status) status.textContent = '';
    return;
  }

  footer.hidden = false;
  if (total) total.textContent = 'Ap verifye…';
  if (status) status.textContent = 'Pri ak disponibilite yo verifye sou sèvè a.';
  if (checkoutButton) checkoutButton.disabled = true;

  const fragment = document.createDocumentFragment();
  cart.forEach((item) => {
    const line = document.createElement('article');
    line.className = 'cart-line';
    line.dataset.productId = String(item.id || '');

    const image = document.createElement('img');
    image.className = 'cart-line-image';
    image.alt = '';
    image.loading = 'lazy';
    const imageUrl = String(item.img || item.image || '');
    if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) image.src = imageUrl;
    else {
      try {
        const parsed = new URL(imageUrl);
        if (parsed.protocol === 'https:') image.src = parsed.href;
      } catch { /* Keep the neutral empty image background. */ }
    }
    image.addEventListener('error', () => { image.src = '/assets/images/logo.png'; }, { once: true });

    const main = document.createElement('div');
    main.className = 'cart-line-main';
    const title = document.createElement('strong');
    title.className = 'cart-line-title';
    title.textContent = String(item.title || 'Pwodwi');
    const seller = document.createElement('span');
    seller.className = 'cart-line-seller';
    seller.textContent = String(item.sellerName || item.seller_name || 'Machann marketplace');
    const price = document.createElement('span');
    price.className = 'cart-line-price';
    price.textContent = 'Pri: ap verifye sou sèvè a…';

    const controls = document.createElement('div');
    controls.className = 'cart-line-controls';
    const minus = document.createElement('button');
    minus.className = 'cart-qty-button';
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', 'Retire youn');
    minus.disabled = Number(item.qty || 1) <= 1;
    minus.addEventListener('click', () => updateQty(item.id, -1));
    const quantity = document.createElement('span');
    quantity.className = 'cart-qty-value';
    quantity.textContent = String(Number(item.qty || 1));
    const plus = document.createElement('button');
    plus.className = 'cart-qty-button';
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', 'Ajoute youn');
    plus.disabled = Number(item.qty || 1) >= 99;
    plus.addEventListener('click', () => updateQty(item.id, 1));
    controls.append(minus, quantity, plus);
    main.append(title, seller, price, controls);

    const remove = document.createElement('button');
    remove.className = 'cart-remove-button';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Retire pwodwi a nan panier');
    remove.addEventListener('click', () => removeItem(item.id));
    line.append(image, main, remove);
    fragment.appendChild(line);
  });
  box.replaceChildren(fragment);
  refreshCartQuote(cart);
}

async function refreshCartQuote(cart) {
  const requestId = ++cartQuoteSequence;
  const status = document.getElementById('cart-quote-status');
  const total = document.getElementById('cart-server-total');
  const checkoutButton = document.getElementById('cart-checkout-button');
  try {
    const response = await fetch('/.netlify/functions/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'quote',
        items: cart.map((item) => ({
          product_id: item.id,
          quantity: Number(item.qty || item.quantity || 1)
        }))
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Nou pa ka verifye panier sa a.');
    if (requestId !== cartQuoteSequence) return;

    const quote = result.quote;
    const quotedLines = new Map((quote.items || []).map((line) => [line.product_id, line]));
    document.querySelectorAll('.cart-line').forEach((line) => {
      const quoted = quotedLines.get(line.dataset.productId);
      const title = line.querySelector('.cart-line-title');
      const seller = line.querySelector('.cart-line-seller');
      const price = line.querySelector('.cart-line-price');
      const image = line.querySelector('.cart-line-image');
      if (!quoted) return;
      if (title) title.textContent = quoted.title;
      if (seller) seller.textContent = quoted.seller_name;
      if (image && quoted.image_url) image.src = quoted.image_url;
      if (price) {
        price.textContent = `${quoted.quantity} × ${formatServerMoney(quoted.unit_price)} HTG · ${formatServerMoney(quoted.line_total)} HTG`;
      }
    });
    if (total) total.textContent = `${formatServerMoney(quote.total_amount)} HTG`;
    if (status) status.textContent = 'Total sa a sòti nan sèvè a; checkout ap verifye l ankò anvan kòmand lan.';
    if (checkoutButton) checkoutButton.disabled = false;
    window.cartQuoteReady = true;
  } catch (error) {
    if (requestId !== cartQuoteSequence) return;
    if (total) total.textContent = 'Pa disponib';
    if (status) status.textContent = 'Gen yon atik ki pa disponib oswa nou pa ka verifye pri yo. Retire atik la oswa eseye ankò.';
    if (checkoutButton) checkoutButton.disabled = true;
    window.cartQuoteReady = false;
  }
}

function formatServerMoney(value) {
  return Number(value).toLocaleString('fr-HT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function goToCheckout() {
  if (!getCart().length || !window.cartQuoteReady) return;
  closeOrderModal();
  window.location.href = '/checkout.html';
}

function removeItem(id) {
  let currentCart = getCart().filter(it => it.id !== id);
  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
  refreshBadge(); drawCart();
}

function updateQty(id, change) {
  let currentCart = getCart();
  const item = currentCart.find(it => it.id === id);
  if (item) {
    item.qty = Math.min(99, Math.max(1, Number(item.qty || 1) + change));
    localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
    refreshBadge(); drawCart();
  }
}

function refreshBadge() {
  const b = document.getElementById('cart-count');
  console.log('🔄 refreshBadge apèle - eleman cart-count:', b);
  if (!b) {
    console.log('❌ Eleman cart-count pa jwenn!');
    return;
  }
  const cart = getCart();
  console.log('🛒 Panier:', cart);
  let count = 0;
  cart.forEach(it => {
    const qty = parseInt(it.qty) || parseInt(it.quantity) || 1;
    count += qty;
  });
  console.log('📊 Kantite panier:', count);
  b.textContent = count;
  b.style.display = count > 0 ? 'flex' : 'none';
  console.log('✅ Badge mete ajou:', count);
}

function generateReceipt(data) {
  const serial = "BP-" + Date.now().toString().slice(-6);
  const now = new Date();
  const formattedDate = now.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const storeLogo = '/assets/images/logo.png';

  let itemsHtml = "";
  data.cart.forEach(it => {
    itemsHtml += `<tr><td style="padding:12px; border-bottom:1px solid #e5e7eb; font-weight:600;">${it.title}</td><td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:center;">${it.qty}</td><td style="padding:12px; border-bottom:1px solid #e5e7eb; text-align:right;">${(it.price * it.qty).toLocaleString()} HTG</td></tr>`;
  });

  const zone = data.zone || '—';
  const total = data.cart.reduce((s,i)=>s+(i.price*i.qty),0).toLocaleString();
  const sellerName = data.sellerName || data.cart[0]?.sellerName || 'Boutique Piyay';
  const storeLabel = sellerName || 'Boutique Piyay';
  const initials = storeLabel.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'BP';
  const paymentMethod = data.payment || '—';

  const win = window.open('', '_blank');
  if (!win) {
    alert('Le reçu s’ouvre dans une nouvelle fenêtre. Veuillez autoriser les popups pour l’imprimer.');
    return;
  }

  win.document.write(`
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body {
          font-family: 'Inter', Arial, sans-serif;
          padding: 24px;
          background: #f1f5f9;
          margin: 0;
          color: #1e293b;
        }
        .receipt-container {
          max-width: 780px;
          margin: 0 auto;
          background: white;
          border-radius: 24px;
          box-shadow: 0 18px 50px rgba(15,23,42,0.14);
          overflow: hidden;
        }
        .receipt-header {
          background: linear-gradient(135deg, #111827 0%, #1f2937 45%, #ff4747 100%);
          padding: 30px 32px;
          color: white;
        }
        .top-row {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          margin-bottom:18px;
        }
        .brand-badge {
          width:54px;
          height:54px;
          border-radius:16px;
          background: rgba(255,255,255,0.16);
          display:flex;
          align-items:center;
          justify-content:center;
          border:1px solid rgba(255,255,255,0.24);
          backdrop-filter: blur(2px);
          overflow:hidden;
          padding:0;
        }
        .brand-badge img {
          width:100%;
          height:100%;
          object-fit:contain;
          padding:6px;
          background:rgba(255,255,255,0.78);
        }
        .brand-copy h1 {
          margin: 0;
          font-size: 30px;
          line-height:1;
          font-weight:800;
          letter-spacing:-0.03em;
        }
        .brand-copy p {
          margin: 6px 0 0;
          font-size: 13px;
          color: rgba(255,255,255,0.78);
        }
        .receipt-meta {
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:18px;
        }
        .meta-chip {
          background: rgba(255,255,255,0.12);
          border:1px solid rgba(255,255,255,0.2);
          border-radius:999px;
          padding:8px 10px;
          font-size:11px;
          font-weight:700;
          letter-spacing:0.08em;
          text-transform:uppercase;
        }
        .receipt-body {
          padding: 30px 32px 12px;
        }
        .section-title {
          margin: 0 0 10px;
          font-size: 15px;
          font-weight:800;
          color: #111827;
          text-transform: uppercase;
          letter-spacing:0.08em;
        }
        .info-grid {
          display:grid;
          grid-template-columns: repeat(2, 1fr);
          gap:12px;
          margin-bottom:22px;
        }
        .info-card {
          border:1px solid #e2e8f0;
          border-radius:16px;
          padding:14px 15px;
          background:#fff;
        }
        .info-label {
          display:block;
          color:#64748b;
          font-size:11px;
          text-transform:uppercase;
          letter-spacing:0.08em;
          margin-bottom:6px;
          font-weight:800;
        }
        .info-value {
          color:#1e293b;
          font-weight:700;
          font-size:15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        th {
          background:#f8fafc;
          padding: 12px;
          font-weight: 800;
          color:#64748b;
          font-size:11px;
          document.getElementById('checkoutTotal').textContent = 'Kalkile sou sèvè nan pwochen etap la';
          letter-spacing:0.08em;
        }
        td {
          padding: 12px;
          border-bottom:1px solid #f1f5f9;
          font-size:14px;
          color:#1e293b;
        }
        .total-section {
          margin: 18px 0 8px;
          padding: 16px 18px;
          border-radius:18px;
          background: linear-gradient(135deg, #fff8f4 0%, #ffe7dc 100%);
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }
        .total-copy {
          display:flex;
          flex-direction:column;
          gap:4px;
        }
        .total-label {
          font-size:12px;
          font-weight:800;
          color:#9a3412;
          text-transform:uppercase;
          letter-spacing:0.08em;
        }
        .total-amount {
          font-size:30px;
          font-weight:900;
          color:#ff4747;
        }
        .receipt-footer {
          padding: 18px 32px 28px;
          border-top:1px solid #f1f5f9;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          color:#64748b;
          font-size:12px;
        }
        .receipt-footer .brand {
          color:#ff4747;
          font-weight:800;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">
          <div class="top-row">
            <div class="brand-copy">
              <h1>REÇU DE COMMANDE</h1>
              <p>Magasin · Détail de la commande</p>
            </div>
            <div class="brand-badge">
              <img src="${storeLogo}" alt="${storeLabel}" onerror="this.style.display='none'; this.parentElement.innerHTML='${initials}'">
            </div>
          </div>
          <div class="store-name" style="font-size:18px; font-weight:800; margin:8px 0 0;">${storeLabel}</div>
          <div class="receipt-meta">
            <div class="meta-chip">REÇU #${serial}</div>
            <div class="meta-chip">${formattedDate}</div>
            <div class="meta-chip">Paiement: ${paymentMethod}</div>
          </div>
        </div>
        <div class="receipt-body">
          <div class="section-title">Informations client</div>
          <div class="info-grid">
            <div class="info-card">
              <span class="info-label">Client</span>
              <div class="info-value">${data.name || '—'}</div>
            </div>
            <div class="info-card">
              <span class="info-label">Téléphone</span>
              <div class="info-value">${data.phone || '—'}</div>
            </div>
            <div class="info-card">
              <span class="info-label">Zone</span>
              <div class="info-value">${zone}</div>
            </div>
            <div class="info-card">
              <span class="info-label">Commande</span>
              <div class="info-value">${serial}</div>
            </div>
            <div class="info-card" style="grid-column: 1/-1;">
              <span class="info-label">Adresse Livraison</span>
              <div class="info-value">${data.address || '—'}</div>
            </div>
          </div>
          <div class="section-title">Articles commandés</div>
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th style="text-align:center;">Qté</th>
                <th style="text-align:right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total-section">
            <div class="total-copy">
              <span class="total-label">Total à payer</span>
              <span style="font-size:12px; color:#9a3412;">Paiement: ${paymentMethod}</span>
            </div>
            <div class="total-amount">${total} HTG</div>
          </div>
        </div>
        <div class="receipt-footer">
          <div>
            Merci pour votre commande. Vérifiez bien les articles avant livraison.
            <div style="margin-top:6px;">Créé par <span class="brand">Rivayo-techentreprise</span></div>
          </div>
          <div style="text-align:right;">Droits réservés · Reçu officiel</div>
        </div>
      </div>
      <script>window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
}

function getCustomerDetailsFromModal() {
  const name = document.getElementById('customer-name')?.value.trim() || '';
  const phone = document.getElementById('customer-phone')?.value.trim() || '';
  const zoneSelect = document.getElementById('delivery-zone');
  const otherZone = document.getElementById('other-zone')?.value.trim() || '';
  let zone = zoneSelect?.value || '';
  if (zone === 'Lòt Zone' && otherZone) zone = otherZone;
  return { name, phone, zone };
}

window.submitOrder = async function() {
  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const zoneInput = document.getElementById('delivery-zone');
  const addressInput = document.getElementById('customer-address');
  const paymentRadio = document.querySelector('input[name="payment-method"]:checked') || document.querySelector('input[name="payment_method"]:checked');
  const btn = document.getElementById('btn-pay') || document.getElementById('submitOrderBtn');

  if (!nameInput || !phoneInput || !zoneInput || !addressInput || !paymentRadio) {
    alert('⚠️ Erreur : le formulaire est introuvable sur la page ou ou poko chwazi metòd peman.'); return;
  }

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const rawZone = zoneInput.value;
  const address = addressInput.value.trim();
  const otherZone = document.getElementById('other-zone')?.value.trim() || '';
  const zone = rawZone === 'Lòt Zone' && otherZone ? otherZone : rawZone;
  const paymentMethod = paymentRadio.value;
  const originalButtonText = btn?.innerText;

  if (!name || !phone || !zone || !address) { alert('⚠️ Veuillez remplir tous les champs !'); return; }

  const cart = getCart();
  if (cart.length === 0) return;

  const totalAmount = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const orderGroupId = "BP-" + Date.now();
  const referralCode = localStorage.getItem('ref_code') || null;
  let affiliateId = null;
  let affiliateUserId = null;

  if (btn) {
    btn.disabled = true;
    btn.innerText = "⏳ Anrejistreman...";
  }

  try {
    const sup = getSupabaseClient();
    if (sup && referralCode) {
      const { data: affiliateMatch, error: affiliateMatchError } = await sup
        .from('affiliates')
        .select('id,user_id')
        .eq('referral_code', referralCode)
        .maybeSingle();
      if (!affiliateMatchError && affiliateMatch) {
        affiliateId = affiliateMatch.id;
        affiliateUserId = affiliateMatch.user_id;
      } else if (affiliateMatchError) {
        console.warn('⚠️ Erè rechèch affiliate referral:', affiliateMatchError);
      }
    }

    const customerEmail = await getCurrentCustomerEmail(sup);
    const orders = buildOrderPayload(
      cart,
      customerEmail,
      name,
      phone,
      zone,
      paymentMethod,
      orderGroupId,
      affiliateId,
      referralCode,
      affiliateUserId,
      address
    );

    if (sup) {
      const response = await fetch('/.netlify/functions/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders })
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error('Erreur en sauvegardant la commande: ' + (result.error || 'commande non enregistrée'));
      }
      console.log('✅ Commande enregistrée dans Supabase', result.data || orders);

      // Kreye notifikasyon pou admin
      try {
        await sup.from('admin_notifications').insert({
          type: 'new_order',
          title: '🛒 Nouvo Komand',
          message: `Yon nouvo komand fet pa ${name}`,
          data: {
            order_id: orderGroupId,
            customer_name: name,
            customer_phone: phone,
            delivery_zone: zone,
            payment_method: paymentMethod,
            total_amount: totalAmount,
            items_count: cart.length
          },
          is_read: false
        });
        console.log('✅ Notifikasyon kreye');
      } catch (notifError) {
        console.error('⚠️ Erè nan kreye notifikasyon:', notifError);
      }

      // Voye notifikasyon push ak email bay chak vandè nan panier an
      try {
        const sellerGroups = groupCartBySeller(cart);
        const sellerIds = Object.keys(sellerGroups).filter(id => id && id !== 'boutique-piyay');
        const { data: sellerProfiles = [] } = await sup.from('profiles')
          .select('id, email, whatsapp, shop_name, full_name')
          .in('id', sellerIds);
        const profilesById = sellerProfiles.reduce((map, profile) => {
          if (profile?.id) map[profile.id] = profile;
          return map;
        }, {});

        await Promise.all(Object.values(sellerGroups).map(async (group) => {
          if (!group.sellerId) return;

          const sellerProfile = profilesById[group.sellerId] || {};
          const sellerEmail = sellerProfile.email;
          const sellerPhone = sellerProfile.whatsapp || group.sellerPhone || '';
          const sellerName = sellerProfile.shop_name || sellerProfile.full_name || group.sellerName || 'Boutique Piyay';

          // Push notifications are handled server-side in `create-order`.
          // Do not call `send-notification` from client (would require exposing internal secret).

          if (!sellerEmail) return;

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ff4747 0%, #ff6b6b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .info-box { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #ff4747; }
                .btn { background: #ff4747; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
                .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🛒 Nouvo Komand</h1>
                </div>
                <div class="content">
                  <p><strong>Vandè:</strong> ${sellerName}</p>
                  <p><strong>Kliyan:</strong> ${name}</p>
                  <p><strong>Telefòn:</strong> ${phone}</p>
                  <p><strong>Zòn:</strong> ${zone}</p>
                  <p><strong>Adres Livrezon:</strong> ${address}</p>
                  <p><strong>Metòd Peman:</strong> ${paymentMethod}</p>
                  <p><strong>Total pou ou:</strong> ${group.amount.toLocaleString()} HTG</p>
                  <div class="info-box">
                    <p><strong>Artik:</strong></p>
                    ${group.items.map(item => `<p>• ${item.title} (${item.quantity} x ${item.price} HTG)</p>`).join('')}
                  </div>
                  <p style="margin-top: 20px;"><a href="https://wa.me/${sellerPhone.replace(/[^0-9+]/g, '')}?text=Salut,%20mwen%20gen%20yon%20nouvo%20komand%20#${orderGroupId}" class="btn">Kontakte Kliyan sou WhatsApp</a></p>
                </div>
                <div class="footer">
                  <p>Boutique Piyay - © 2026</p>
                </div>
              </div>
            </body>
            </html>
          `;

          try {
            const response = await fetch('/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: sellerEmail,
                subject: `🛒 Nouvo Komand #${orderGroupId}`,
                html: emailHtml,
                type: 'seller_new_order',
                data: {
                  order_id: orderGroupId,
                  customer_name: name,
                  customer_phone: phone,
                  delivery_zone: zone,
                  payment_method: paymentMethod,
                  total_amount: group.amount,
                  seller_items: group.items
                }
              })
            });
            if (response.ok) {
              console.log(`✅ Email voye bay vandè ${group.sellerId}`);
            } else {
              console.error(`⚠️ Erè nan voye email pou ${group.sellerId}:`, await response.text());
            }
          } catch (emailError) {
            console.error(`⚠️ Erè nan voye email pou ${group.sellerId}:`, emailError);
          }
        }));
      } catch (error) {
        console.error('⚠️ Erè nan lojik notifikasyon vandè pa gwoup:', error);
      }
    } else {
      console.warn('⚠️ Supabase client introuvable : la commande ne pourra pas être enregistrée dans la base de données.');
    }

    const receiptData = {
      cart,
      name,
      phone,
      zone,
      address,
      payment: paymentMethod,
      sellerName: cart[0]?.sellerName || 'Boutique Piyay',
      transactionId: orderGroupId
    };
    
    console.log('📄 Jeneren recu pou kòmand:', orderGroupId);
    generateReceipt(receiptData);

    if (paymentMethod === 'MonCash' || paymentMethod === 'moncash_api') {
        console.log('📤 Sending to MonCash:', { amount: totalAmount, orderId: orderGroupId });

        const moncashRes = await fetch('/.netlify/functions/moncash', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: totalAmount, orderId: orderGroupId })
        });

        console.log('📥 MonCash response status:', moncashRes.status);
        console.log('📥 MonCash response headers:', {
            contentType: moncashRes.headers.get('content-type'),
            status: moncashRes.status,
            statusText: moncashRes.statusText
        });

        const responseText = await moncashRes.text();
        console.log('📥 MonCash raw response:', responseText.substring(0, 200));

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ JSON Parse error:', parseError);
            console.error('Response was:', responseText.substring(0, 500));
            throw new Error(`❌ Sèvè a pa reponn korèkteman. Status: ${moncashRes.status}. Check Netlify logs.\n\nRepons: ${responseText.substring(0, 200)}`);
        }

        console.log('✅ MonCash parsed data:', data);

        if (!moncashRes.ok) {
            throw new Error(data.error || `Erè MonCash (${moncashRes.status}): ${data.message || 'Unknown error'}`);
        }

        if (!data.redirectURL) {
            throw new Error('❌ MonCash pa retounen lyen redireksyon. Check Netlify logs.');
        }

        window.location.href = data.redirectURL;
        return;
    }

    // Gid pou peman manyèl oswa cash
    if (paymentMethod === 'manual') {
      alert('Commande enregistrée! Contactez le vendeur pour finaliser le paiement.');
    } else if (paymentMethod === 'Cash') {
      alert('Commande enregistrée! Vous paierez à la livraison.');
    } else if (paymentMethod === 'NatCash') {
      alert('Kòmand lan anrejistre. Tanpri voye prèv peman NatCash bay vandè a pou validate.');
    } else {
      alert('Commande enregistrée avec succès!');
    }

    localStorage.removeItem(CART_KEY);
    refreshBadge();
    drawCart();

    if (btn) {
      btn.disabled = false;
      btn.innerText = originalButtonText || btn.innerText;
    }

    // Afiche fakti apre komand
    showInvoice(receiptData, totalAmount);

  } catch (err) {
    console.error('❌ Erè submitOrder:', err);
    alert('❌ Erè: ' + err.message);
    const fallbackBtn = document.getElementById('submitOrderBtn') || document.getElementById('btn-pay');
    if (fallbackBtn) {
      fallbackBtn.disabled = false;
      fallbackBtn.innerText = originalButtonText || fallbackBtn.innerText;
    }
  }
}
// Fonksyon pou afiche fakti
window.showInvoice = function(receiptData, totalAmount) {
  const invoiceContainer = document.getElementById('invoice-template');
  if (!invoiceContainer) return;

  // Date aktuel
  const now = new Date();
  const invoiceDate = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const invoiceNumber = 'INV-' + Date.now().toString().slice(-8);

  // Rempli enfòmasyon anlè
  document.getElementById('invoice-date').textContent = invoiceDate;
  document.getElementById('invoice-number').textContent = invoiceNumber;

  // Rempli enfòmasyon jeneral
  document.getElementById('account-no').textContent = receiptData.transactionId || '--';
  document.getElementById('customer-name').textContent = receiptData.sellerName || receiptData.name || '--';
  document.getElementById('invoice-date-info').textContent = invoiceDate;

  // Rempli balance
  document.getElementById('balance-total').textContent = totalAmount.toLocaleString() + ' HTG';
  document.getElementById('balance-paid').textContent = '0 HTG';
  document.getElementById('balance-due').textContent = totalAmount.toLocaleString() + ' HTG';

  // Rempli tablo pwodwi
  const itemsTable = document.getElementById('invoice-items');
  if (receiptData.cart && receiptData.cart.length > 0) {
    itemsTable.innerHTML = receiptData.cart.map((item, index) => {
      const lineTotal = (item.price * item.qty).toLocaleString();
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.title}</td>
          <td>${item.price.toLocaleString()} HTG</td>
          <td>${item.qty}</td>
          <td>${lineTotal} HTG</td>
        </tr>
      `;
    }).join('');
  } else {
    itemsTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucun article</td></tr>';
  }

  // Rempli total
  document.getElementById('subtotal').textContent = totalAmount.toLocaleString() + ' HTG';
  document.getElementById('tax-rate').textContent = '0%';
  document.getElementById('grand-total').textContent = totalAmount.toLocaleString() + ' HTG';

  // Afiche fakti
  invoiceContainer.style.display = 'flex';
};

// Fonksyon pou fèmen fakti
window.closeInvoice = function() {
  const invoiceContainer = document.getElementById('invoice-template');
  if (invoiceContainer) {
    invoiceContainer.style.display = 'none';
  }
};

window.submitOrder = async function() {
  const name = document.getElementById('customer-name')?.value.trim() || '';
  const phone = document.getElementById('customer-phone')?.value.trim() || '';
  const rawZone = document.getElementById('delivery-zone')?.value || '';
  const zone = rawZone === 'Lòt Zone' ? document.getElementById('other-zone')?.value.trim() || '' : rawZone;
  const address = document.getElementById('customer-address')?.value.trim() || '';
  const method = document.querySelector('input[name="payment-method"]:checked')?.value || '';
  const cart = getCart();
  const button = document.getElementById('btn-pay');
  if (!name || !phone || !zone || !address || !method || !cart.length) {
    alert('Tanpri ranpli enfòmasyon livrezon yo epi verifye panier an.');
    return;
  }
  if (window.marketplaceOrder) return;

  button.disabled = true;
  button.textContent = 'Ap kalkile epi anrejistre kòmand lan...';
  try {
    let idempotencyKey = localStorage.getItem('bp_checkout_idempotency');
    if (!idempotencyKey) {
      idempotencyKey = crypto.randomUUID();
      localStorage.setItem('bp_checkout_idempotency', idempotencyKey);
    }
    const supabaseClient = getSupabaseClient();
    const { data: { session } = {} } = supabaseClient?.auth?.getSession
      ? await supabaseClient.auth.getSession()
      : { data: {} };
    const headers = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    const response = await fetch('/.netlify/functions/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        items: cart.map((item) => ({ product_id: item.id, quantity: Number(item.qty || item.quantity || 1) })),
        customer: { name, phone, zone, address },
        payment_method: method.toLowerCase(),
        referral_code: localStorage.getItem('ref_code') || null
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Pa t kapab kreye kòmand lan.');

    const order = result.data;
    window.marketplaceOrder = order;
    document.getElementById('checkoutTotal').textContent = `${Number(order.total_amount).toLocaleString()} HTG`;
    document.getElementById('paymentSection').style.display = 'none';
    if (button) button.style.display = 'none';

    if (['moncash', 'natcash'].includes(method.toLowerCase())) {
      const details = result.payment || {};
      document.getElementById('manualPaymentPanel').style.display = 'block';
      document.getElementById('manualPaymentAmount').textContent = `${Number(order.total_amount).toLocaleString()} HTG`;
      document.getElementById('manualPaymentReference').textContent = order.payment_reference;
      document.getElementById('manualPaymentNumber').textContent = details.destination || 'Kontakte Boutique Piyay';
      document.getElementById('paymentInstructionText').textContent = `Voye peman an sou ${method}, epi mete referans lan kòm nòt peman an.`;
      document.getElementById('manualPaymentExpiry').textContent = `Kòmand lan ekspire: ${new Date(order.expires_at).toLocaleString()}`;
      if (details.qr_url) {
        const qr = document.getElementById('manualPaymentQr');
        qr.src = details.qr_url;
        qr.hidden = false;
      }
      window.scrollTo({ top: document.getElementById('manualPaymentPanel').offsetTop, behavior: 'smooth' });
    } else {
      document.getElementById('cashPaymentPanel').style.display = 'block';
      document.getElementById('cashPaymentReference').textContent = `Referans kòmand: ${order.payment_reference} · Total: ${Number(order.total_amount).toLocaleString()} HTG`;
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem('bp_checkout_idempotency');
      refreshBadge();
      drawCart();
    }
  } catch (error) {
    if (error.message.includes('Idempotency key was reused')) localStorage.removeItem('bp_checkout_idempotency');
    alert(`Erè: ${error.message}`);
    button.disabled = false;
    button.textContent = 'KONFIME & POURSUIVRE PEMAN →';
  }
};

console.log('✅ cart.js chaje');
console.log('✅ orderProduct disponib:', typeof window.orderProduct);
console.log('✅ openCart disponib:', typeof window.openCart);
console.log('✅ contactSellersWhatsApp disponib:', typeof window.contactSellersWhatsApp);
