const CART_KEY = 'boutique_piyay_cart';

console.log('🛒 cart.js chaje - fonksyon orderProduct disponib:', typeof window.orderProduct);

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
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

function buildOrderPayload(cart, customerEmail, customerName, customerPhone, zone, paymentMethod, orderGroupId) {
  const grouped = {};
  cart.forEach(item => {
    const sellerId = item.sellerId || item.seller_id || 'boutique-piyay';
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
    grouped[sellerId].items.push({
      product_id: item.id || null,
      title: item.title || 'Produit',
      quantity: qty,
      price: price
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
    payment_method: paymentMethod,
    order_group_id: orderGroupId,
    order_items: group.items,
    product_id: group.items.length === 1 ? group.items[0].product_id : null,
    product_name: group.items.map(i => i.title).join(' | '),
    quantity: group.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
    amount: group.amount,
    status: 'pending',
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
    m.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    drawCart();
  }
}

function closeOrderModal() {
  const m = document.getElementById('order-modal');
  if (m) { m.style.display = 'none'; document.body.style.overflow = ''; }
}

function drawCart() {
  const box = document.getElementById('order-summary');
  if (!box) return;
  let currentCart = getCart();

  if (currentCart.length === 0) {
    box.innerHTML = `<div style="text-align:center;padding:40px;color:#999;"><div style="font-size:50px;">🛒</div><p>Panier vide</p></div>`;
    document.getElementById('order-form-container').style.display = 'none';
    return;
  }

  document.getElementById('order-form-container').style.display = 'block';

  // Group items by seller
  let bySeller = {};
  currentCart.forEach(it => {
    const sid = it.sellerId || 'boutique-piyay';
    if (!bySeller[sid]) bySeller[sid] = { items: [], phone: it.sellerPhone, sellerName: it.sellerName };
    bySeller[sid].items.push(it);
  });

  let totalHTG = 0;
  let html = `<style>
    .seller-group { background: #ffffff; border-radius: 18px; padding: 20px; margin-bottom: 18px; border: 1px solid #f1f5f9; box-shadow: 0 10px 30px rgba(15,23,42,0.06); }
    .seller-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; gap: 10px; }
    .seller-name { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 900; color: #111827; }
    .seller-wa a { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; background: #25d366; color: white; border-radius: 12px; text-decoration: none; font-weight: 800; transition: transform .2s; }
    .seller-wa a:hover { transform: translateY(-1px); }
    .cart-item { display: grid; grid-template-columns: 50px 1fr auto; gap: 14px; align-items: center; padding: 12px 0; border-top: 1px solid #f1f5f9; }
    .cart-item:first-child { border-top: none; }
    .cart-img { width: 50px; height: 50px; object-fit: cover; border-radius: 12px; background: #f8fafc; }
    .cart-info { min-width: 0; }
    .cart-title { font-weight: 800; font-size: 14px; color: #111827; margin-bottom: 4px; }
    .cart-desc { font-size: 13px; color: #475569; line-height: 1.4; }
    .cart-price { font-weight: 900; color: #ff4747; text-align: right; }
    .remove-btn { background:none; border:none; color:#ef4444; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center; }
    .group-total { display:flex; justify-content:space-between; align-items:center; margin-top: 16px; padding: 14px 16px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; font-weight: 900; color: #111827; }
    .receipt-footer { margin-top:20px; text-align:right; font-size:18px; font-weight:900; padding: 16px; border-top: 2px solid #f1f5f9; color: #111827; }
  </style>`;

  Object.entries(bySeller).forEach(([sellerId, group]) => {
    const phone = (group.phone || '50948868964').toString().replace(/[^0-9]/g, '');
    const sellerName = group.sellerName || 'Boutique Piyay';

    let sellerMessage = `Bonjou ${sellerName}, mwen swete ou byen. Mwen enterese nan kòmand sa a :\n\n`;
    group.items.forEach(it => {
      const lineTotal = (it.price * it.qty) || 0;
      sellerMessage += `• ${it.title} (x${it.qty}) — ${it.price.toLocaleString()} HTG chak — ${lineTotal.toLocaleString()} HTG total\n`;
    });
    const sellerTotal = group.items.reduce((sum, it) => sum + (it.price * it.qty), 0);
    sellerMessage += `\n💰 *TOTAL:* ${sellerTotal.toLocaleString()} HTG\n\nMèsi, tanpri konfime si pwodwi yo disponib.`;
    const encodedMessage = encodeURIComponent(sellerMessage);

    html += `<div class="seller-group">
      <div class="seller-header">
        <span class="seller-name">🏪 ${sellerName}</span>
        <div class="seller-wa">
          <a href="https://wa.me/${phone}?text=${encodedMessage}" target="_blank">📱 Voye sou WhatsApp</a>
        </div>
      </div>`;

    group.items.forEach(it => {
      const sub = it.price * it.qty;
      totalHTG += sub;
      html += `
        <div class="cart-item">
          <img class="cart-img" src="${it.img}" onerror="this.src='/assets/images/logo.png'" alt="${it.title}">
          <div class="cart-info">
            <div class="cart-title">${it.title}</div>
            <div class="cart-desc">${it.qty} x ${it.price.toLocaleString()} HTG</div>
          </div>
          <div class="cart-price">${sub.toLocaleString()} HTG</div>
          <button class="remove-btn" onclick="removeItem('${it.id}')">✕</button>
        </div>`;
    });

    const sellerTotalDisplay = group.items.reduce((sum, it) => sum + (it.price * it.qty), 0).toLocaleString();
    html += `<div class="group-total"><span>Total pou ${sellerName}</span><span>${sellerTotalDisplay} HTG</span></div></div>`;
  });

  html += `<div class="receipt-footer">💰 TOTAL KOMÈS: ${totalHTG.toLocaleString()} HTG</div>`;
  box.innerHTML = html;
}

function removeItem(id) {
  let currentCart = getCart().filter(it => it.id !== id);
  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
  refreshBadge(); drawCart();
}

function refreshBadge() {
  const b = document.getElementById('cart-count');
  console.log('🔄 refreshBadge apèle - eleman cart-count:', b);
  if (!b) {
    console.log('❌ Eleman cart-count pa jwenn!');
    return;
  }
  let count = getCart().reduce((s, it) => s + it.qty, 0);
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
          margin-top: 10px;
        }
        th {
          background:#f8fafc;
          padding: 12px;
          text-align: left;
          font-weight: 800;
          color:#64748b;
          font-size:11px;
          text-transform: uppercase;
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

function contactWhatsApp(data) {
  const sPhone = data.cart[0]?.sellerPhone || '50948868964';
  const customerName = data.name || '–';
  const customerPhone = data.phone || '–';
  const customerZone = data.zone || '–';
  const paymentMethod = data.payment || 'Pa defini';
  const transactionId = data.transactionId || 'N/A';
  const totalAmount = data.cart.reduce((s, i) => s + (i.price * i.qty), 0);

  let msg = `🛍️ *NOUVO KÒMAND BOUTIQUE PIYAY*\n\n`;
  msg += `👤 *Non:* ${customerName}\n`;
  msg += `📞 *WhatsApp:* ${customerPhone}\n`;
  msg += `📍 *Zòn:* ${customerZone}\n`;
  msg += `💳 *Peman:* ${paymentMethod}\n`;
  msg += `🔖 *Kòd:* ${transactionId}\n\n`;
  msg += `*ATIK YO:*\n`;

  data.cart.forEach(it => {
    const lineTotal = (it.price * it.qty) || 0;
    msg += `• ${it.title}\n  - Kantite: ${it.qty}\n  - Pri inite: ${it.price.toLocaleString()} HTG\n  - Total: ${lineTotal.toLocaleString()} HTG\n`;
  });

  msg += `\n*TOTAL KOMÈS:* ${totalAmount.toLocaleString()} HTG\n`;
  msg += `\nMèsi! Tanpri konfime disponiblite pwodwi yo ak pri a.`;

  window.open(`https://wa.me/${sPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

window.contactSellersWhatsApp = async function() {
  console.log('📱 contactSellersWhatsApp appelé');
  const cart = getCart();
  if (!cart || cart.length === 0) {
    alert('Panier la vid. Ajoute yon pwodwi avan ou kontakte vandè a.');
    return;
  }

  const { name, phone, zone } = getCustomerDetailsFromModal();
  const paymentMethod = document.getElementById('payment-method-select')?.value || 'Pa defini';
  if (!name || !phone || !zone) {
    alert('Tanpri ranpli non, telefòn ak zòn livrezon avan ou kontakte vandè a.');
    return;
  }

  console.log('🛒 Panier:', cart);

  const sellers = {};
  cart.forEach(item => {
    const sellerId = item.sellerId || 'boutique-piyay';
    if (!sellers[sellerId]) {
      sellers[sellerId] = {
        phone: item.sellerPhone || null,
        sellerName: item.sellerName || 'Boutique Piyay',
        items: []
      };
    }
    sellers[sellerId].items.push(item);
  });

  await resolveSellerPhoneFallbacks(sellers);

  const detailsHeader = `🛍️ *NOUVO KÒMAND*\n\n👤 *Client:* ${name}\n📞 *Tèl:* ${phone}\n📍 *Zone:* ${zone}\n💳 *Peman:* ${paymentMethod}\n\n*ATIK YO:*`;

  const sellerKeys = Object.keys(sellers);
  if (sellerKeys.length === 1) {
    const group = sellers[sellerKeys[0]];
    const phoneNumber = (group.phone || '50948868964').toString().replace(/[^0-9]/g, '');
    let msg = `${detailsHeader}`;
    group.items.forEach(it => {
      const lineTotal = (it.price * it.qty) || 0;
      msg += `\n• ${it.title}\n  - Kantite: ${it.qty}\n  - Pri inite: ${it.price.toLocaleString()} HTG\n  - Total: ${lineTotal.toLocaleString()} HTG\n`;
    });
    const total = group.items.reduce((sum, it) => sum + (it.price * it.qty), 0);
    msg += `\n*TOTAL:* ${total.toLocaleString()} HTG\n\nMèsi! Tanpri konfime disponiblite pwodwi yo.`;
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`, '_blank');
    return;
  }

  let sellerList = 'Gen plizyè vandè nan panie a. Chwazi vandè pou kontakte sou WhatsApp :\n\n';
  sellerKeys.forEach((key, index) => {
    const group = sellers[key];
    const displayPhone = (group.phone || '50948868964').toString().replace(/[^0-9]/g, '');
    sellerList += `${index + 1}. ${group.sellerName} - ${displayPhone}\n`;
  });
  sellerList += '\nAntre nimewo vandè a (egzanp 1, 2, ...).';

  const choice = prompt(sellerList, '1');
  const selectedIndex = parseInt(choice, 10) - 1;
  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= sellerKeys.length) {
    alert('Chwa enkòrèk. Aksyon an anile.');
    return;
  }

  const selectedGroup = sellers[sellerKeys[selectedIndex]];
  const phoneNumber = (selectedGroup.phone || '50948868964').toString().replace(/[^0-9]/g, '');
  let msg = `${detailsHeader}`;
  let groupTotal = 0;
  selectedGroup.items.forEach(it => {
    const lineTotal = (it.price * it.qty) || 0;
    groupTotal += lineTotal;
    msg += `\n• ${it.title}\n  - Kantite: ${it.qty}\n  - Pri inite: ${it.price.toLocaleString()} HTG\n  - Total: ${lineTotal.toLocaleString()} HTG\n`;
  });
  msg += `\n*TOTAL:* ${groupTotal.toLocaleString()} HTG\n\nMèsi! Tanpri konfime si pwodwi yo disponib.`;
  window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`, '_blank');
}

window.submitOrder = async function() {
  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const zoneInput = document.getElementById('delivery-zone');
  const paymentSelect = document.getElementById('payment-method-select');

  if (!nameInput || !phoneInput || !zoneInput || !paymentSelect) {
    alert('⚠️ Erreur : le formulaire est introuvable sur la page.'); return;
  }

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const rawZone = zoneInput.value;
  const otherZone = document.getElementById('other-zone')?.value.trim() || '';
  const zone = rawZone === 'Lòt Zone' && otherZone ? otherZone : rawZone;
  const paymentMethod = paymentSelect.value;

  if (!name || !phone || !zone) { alert('⚠️ Veuillez remplir tous les champs !'); return; }

  const cart = getCart();
  if (cart.length === 0) return;

  const totalAmount = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const orderGroupId = "BP-" + Date.now();
  const btn = document.getElementById('submitOrderBtn');

  btn.disabled = true;
  btn.innerText = "⏳ Anrejistreman...";

  try {
    const sup = getSupabaseClient();
    const customerEmail = await getCurrentCustomerEmail(sup);
    const orders = buildOrderPayload(cart, customerEmail, name, phone, zone, paymentMethod, orderGroupId);

    if (sup) {
      const { error: insertError } = await sup.from('orders').insert(orders);
      if (insertError) {
        throw new Error('Erreur en sauvegardant la commande: ' + insertError.message);
      }
      console.log('✅ Commande enregistrée dans Supabase', orders);
    } else {
      console.warn('⚠️ Supabase client introuvable : la commande ne pourra pas être enregistrée dans la base de données.');
    }

    const receiptData = {
      cart,
      name,
      phone,
      zone,
      payment: paymentMethod,
      sellerName: cart[0]?.sellerName || 'Boutique Piyay',
      transactionId: orderGroupId
    };
    generateReceipt(receiptData);

    if (paymentMethod === 'MonCash') {
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
      alert('Commande enregistrée! Contactez le vendeur sur WhatsApp pour finaliser le paiement.');
    } else if (paymentMethod === 'Cash') {
      alert('Commande enregistrée! Vous paierez à la livraison.');
    } else {
      alert('Commande enregistrée avec succès!');
    }

    localStorage.removeItem(CART_KEY);
    refreshBadge();
    drawCart();

    btn.disabled = false;
    btn.innerText = "Valider la commande ✅";

  } catch (err) {
    console.error('❌ Erè submitOrder:', err);
    alert('❌ Erè: ' + err.message);
    const btn = document.getElementById('submitOrderBtn');
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Valider la commande ✅";
    }
  }
}
window.contactWhatsApp = contactWhatsApp;
console.log('✅ cart.js chaje');
console.log('✅ orderProduct disponib:', typeof window.orderProduct);
console.log('✅ openCart disponib:', typeof window.openCart);
console.log('✅ contactSellersWhatsApp disponib:', typeof window.contactSellersWhatsApp);
