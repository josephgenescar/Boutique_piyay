// ================================================
// BOUTIQUE PIYAY — cart.js (V4.1 - Sekirite & Kontwòl Total)
// ================================================

const CART_KEY = 'bp_cart';

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

document.addEventListener('DOMContentLoaded', function() {
  refreshBadge();
  prefillCustomerData();
});

// ─── PRE-RELI PWOFIL KLIYAN ──────────────────────
async function prefillCustomerData() {
  if (typeof supabase === 'undefined') return;
  const sup = window._supabaseClient || supabase.createClient("https://lsyjnhqjssirtgrdfgcu.supabase.co", "sb_publishable_yoALXcRyaiBnSieRF7MSpA_bB5DGT13");
  window._supabaseClient = sup;
  try {
    const { data: { user } } = await sup.auth.getUser();
    if (user) {
      if(document.getElementById('customer-name')) document.getElementById('customer-name').value = user.user_metadata.full_name || '';
      if(document.getElementById('customer-phone')) document.getElementById('customer-phone').value = user.user_metadata.phone || user.user_metadata.whatsapp || '';
    }
  } catch(e) {}
}

function orderProduct(title, price, id, image, sellerId, sellerPhone) {
  let currentCart = getCart();
  var key = id || title.replace(/\s+/g,'-').toLowerCase();
  var found = false;
  let cleanPhone = sellerPhone ? sellerPhone.replace(/[^0-9]/g, '') : '50948868964';

  for (var i = 0; i < currentCart.length; i++) {
    if (currentCart[i].id === key) { currentCart[i].qty += 1; found = true; break; }
  }

  if (!found) {
    currentCart.push({
      id: key, title: title, price: parseFloat(price) || 0,
      img: image || '', qty: 1, sellerId: sellerId || 'admin', sellerPhone: cleanPhone
    });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
  refreshBadge();
  toast('✅ ' + title + ' ajoute!');
}

function openCart() {
  var m = document.getElementById('order-modal');
  if (m) { m.style.display = 'flex'; drawCart(); }
}

function closeOrderModal() {
  var m = document.getElementById('order-modal');
  if (m) {
    m.style.display = 'none';
    document.getElementById('order-form-container').style.display = 'block';
    const sBox = document.getElementById('success-box');
    if(sBox) sBox.remove();
  }
}

function drawCart() {
  var box = document.getElementById('order-summary');
  if (!box) return;
  let currentCart = getCart();

  if (currentCart.length === 0) {
    box.innerHTML = `<div style="text-align:center;padding:40px;color:#999;"><div style="font-size:50px;">🛒</div><p>Panye a vid</p></div>`;
    document.getElementById('order-form-container').style.display = 'none';
    return;
  }

  document.getElementById('order-form-container').style.display = 'block';

  let totalHTG = 0;
  let html = '<table class="receipt-table"><thead><tr><th>Pwodwi</th><th>Kte</th><th>Total</th><th></th></tr></thead><tbody>';
  currentCart.forEach(it => {
    let sub = it.price * it.qty;
    totalHTG += sub;
    html += `<tr><td>${it.title}</td><td>${it.qty}</td><td>${sub} HTG</td><td><button onclick="removeItem('${it.id}')" style="background:none;border:none;cursor:pointer;color:#ff4747;">✕</button></td></tr>`;
  });
  html += `<tr class="total-row"><td colspan="2">TOTAL:</td><td>${totalHTG} HTG</td><td></td></tr></tbody></table>`;
  box.innerHTML = html;
}

function chgQty(id, d) {
  let currentCart = getCart();
  currentCart.forEach(it => { if (it.id === id) it.qty = Math.max(1, it.qty + d); });
  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
  refreshBadge(); drawCart();
}

function removeItem(id) {
  let currentCart = getCart();
  currentCart = currentCart.filter(it => it.id !== id);
  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
  refreshBadge(); drawCart();
  toast('🗑️ Retire');
}

function refreshBadge() {
  var b = document.getElementById('cart-count');
  if (!b) return;
  let count = getCart().reduce((s, it) => s + it.qty, 0);
  b.textContent = count; b.style.display = count > 0 ? 'flex' : 'none';
}

function downloadReceipt() {
  const data = JSON.parse(localStorage.getItem('last_order_full_data'));
  if(!data) return;
  const win = window.open('', '_blank');
  win.document.write(generateReceiptContent(data));
  win.document.close();
}

function generateReceiptContent(data) {
  let itemsHtml = "";
  let grandTotal = 0;
  data.cart.forEach(it => {
    itemsHtml += `<tr><td>${it.title}</td><td>${it.qty}</td><td>${it.price * it.qty} HTG</td></tr>`;
    grandTotal += (it.price * it.qty);
  });

  return `
    <html><head><meta charset="UTF-8"><style>
      body { font-family: 'Sora', sans-serif, Arial; padding: 30px; color: #1e293b; line-height: 1.5; }
      .receipt-card { max-width: 600px; margin: auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
      .header { text-align: center; border-bottom: 3px solid #ff4747; padding-bottom: 20px; margin-bottom: 30px; }
      .logo-img { height: 60px; margin-bottom: 10px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
      th { background: #f8fafc; font-weight: 800; text-transform: uppercase; font-size: 12px; }
      .total-box { background: #0f172a; color: white; padding: 20px; border-radius: 12px; text-align: right; font-size: 20px; font-weight: 900; }
      .receipt-footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      .sponsor { font-weight: 800; color: #0f172a; margin-top: 5px; }
      @media print { .no-print { display: none; } }
    </style></head><body>
      <div class="receipt-card">
        <div class="header">
          <img src="${window.location.origin}/assets/images/logo.png" class="logo-img">
          <h1 style="margin:0; font-size:24px; color:#ff4747;">BOUTIQUE PIYAY</h1>
          <p style="margin:5px 0 0; font-weight:700;">FICH KOMAND OFISYÈL</p>
        </div>
        <div class="info-grid">
          <div><p><strong>KLIYAN:</strong><br>${data.name}</p><p><strong>TEL:</strong><br>${data.phone}</p></div>
          <div style="text-align:right;"><p><strong>NIM KÒMAND:</strong><br>#${data.orderId}</p><p><strong>DAT:</strong><br>${new Date().toLocaleDateString('fr-FR')}</p></div>
        </div>
        <table><thead><tr><th>Pwodwi</th><th>Kte</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
        <div class="total-box">TOTAL JENERAL: ${grandTotal} HTG</div>
        <div class="receipt-footer"><p>Mèsi deske ou te achte sou Boutique Piyay!</p><div class="sponsor">🚀 Sponsorisé par Rvayo-tech entreprise</div></div>
      </div>
      <div style="text-align:center; margin-top:20px;" class="no-print"><button onclick="window.print()" style="padding:15px 30px; background:#ff4747; color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer;">Enprime oswa Sove fich la</button></div>
    </body></html>`;
}

// ─── SOU-MET KOMAND LAN ───────────────────────────
async function submitOrder() {
  const name    = document.getElementById('customer-name').value.trim();
  const phone   = document.getElementById('customer-phone').value.trim();
  const zone    = document.getElementById('delivery-zone').value;
  const payment = document.getElementById('payment-method').value;

  if (!name || !phone || !zone) { toast('⚠️ Ranpli tout chan yo!'); return; }

  const currentCart = getCart();
  const orderId = "BP-" + Math.floor(100000 + Math.random() * 900000);
  const orderData = { name, phone, zone, payment, cart: currentCart, orderId };
  localStorage.setItem('last_order_full_data', JSON.stringify(orderData));

  // ── Supabase — Sove kòmand + Notifikasyon ──────────
  try {
    const sup = window._supabaseClient || supabase.createClient(
      "https://lsyjnhqjssirtgrdfgcu.supabase.co",
      "sb_publishable_yoALXcRyaiBnSieRF7MSpA_bB5DGT13"
    );
    window._supabaseClient = sup;

    const { data: { user } } = await sup.auth.getUser();

    for (const item of currentCart) {
      const totalItem = item.price * item.qty;

      await sup.from('orders').insert({
        seller_id:       item.sellerId !== 'admin' ? item.sellerId : null,
        user_id:         user?.id || null,
        customer_name:   name,
        customer_phone:  phone,
        customer_address: zone,
        product_title:   item.title,
        total_price:     totalItem,
        status:          'pending',
        delivery_zone:   zone,
        platform_fee:    Math.round(totalItem * 0.03),
        seller_amount:   Math.round(totalItem * 0.92),
        source:          'boutique_piyay',
      });

      if (item.sellerId && item.sellerId !== 'admin') {
        await sup.from('notifications').insert({
          user_id: item.sellerId,
          type:    'new_order',
          title:   '🛍️ Nouvelle commande!',
          body:    `Vous avez une nouvelle commande pour: ${item.title} — ${totalItem} HTG`,
          read:    false
        });
      }
    }

    if (user) {
      await sup.from('notifications').insert({
        user_id: user.id,
        type:    'order_sent',
        title:   '✅ Commande envoyée!',
        body:    `Votre commande #${orderId} a été reçue. Suivez-la sur Konektem.`,
        read:    false
      });
    }

  } catch(err) {
    console.error('Supabase error:', err);
  }

  // ── Montre siksè ─────────────────
  document.getElementById('order-form-container').style.display = 'none';
  const sBox = document.createElement('div');
  sBox.id = "success-box";
  sBox.innerHTML = `
    <div style="text-align:center;padding:30px;">
      <div style="font-size:60px;margin-bottom:16px;">✅</div>
      <h2 style="font-weight:900;color:#0f172a;margin-bottom:8px;">Kòmand anrejistre!</h2>
      <p style="color:#64748b;margin-bottom:20px;">Kòmand ou an gentan nan sistèm nan. Kontakte machann nan kounye a.</p>

      <button onclick="contactWhatsApp()" style="width:100%;padding:18px;background:#25D366;color:white;border:none;border-radius:15px;font-weight:800;cursor:pointer;font-size:16px;margin-bottom:10px;">
        💬 Pale ak Machann nan (WhatsApp)
      </button>

      <button onclick="downloadReceipt()" style="width:100%;padding:14px;background:#f1f5f9;color:#0f172a;border:none;border-radius:15px;font-weight:700;cursor:pointer;margin-bottom:8px;">
        📥 Telechaje Fich ou an
      </button>

      <p style="font-size:11px; color:#ef4444; font-weight:700; margin-top:15px;">⚠️ PA JANM PEYE DEYÒ PLATFÒM NAN SI W VLE NOU GARANTI KÒB OU.</p>
    </div>`;

  document.getElementById('order-summary').innerHTML = "";
  document.getElementById('order-summary').appendChild(sBox);
  localStorage.removeItem(CART_KEY);
  refreshBadge();
}

// WhatsApp — Sekirize ak Mesaj Avètisman
function contactWhatsApp() {
  const data = JSON.parse(localStorage.getItem('last_order_full_data'));
  if (!data) return;
  const currentCart = data.cart || [];
  const sellerGroups = {};
  currentCart.forEach(item => {
    if (!sellerGroups[item.sellerPhone]) sellerGroups[item.sellerPhone] = [];
    sellerGroups[item.sellerPhone].push(item);
  });
  Object.keys(sellerGroups).forEach((sPhone, index) => {
    const items = sellerGroups[sPhone];
    let msg = `🛍️ *COMMANDE BOUTIQUE PIYAY* (Anrejistre ✅)\n\n`;
    msg += `👤 *Kliyan:* ${data.name}\n📱 *Tel:* ${data.phone}\n📍 *Zòn:* ${data.zone}\n\n`;
    msg += `📦 *ATIK YO:*\n`;
    items.forEach(it => msg += `• ${it.title} (x${it.qty})\n`);
    msg += `\n⚠️ *AVÈTISMAN:* Kòmand sa a pase nan sistèm ofisyèl la. Pa peye san w pa verifye fich Boutique Piyay la.`;

    setTimeout(() => window.open(`https://wa.me/${sPhone}?text=${encodeURIComponent(msg)}`, '_blank'), index * 1000);
  });
}

function toast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.style.display = 'block';
  setTimeout(() => { t.style.display='none'; }, 3000);
}

window.orderProduct    = orderProduct;
window.openCart        = openCart;
window.closeOrderModal = closeOrderModal;
window.submitOrder     = submitOrder;
window.contactWhatsApp = contactWhatsApp;
window.chgQty          = chgQty;
window.removeItem      = removeItem;
window.downloadReceipt = downloadReceipt;
