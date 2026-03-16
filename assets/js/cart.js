// ================================================
// BOUTIQUE PIYAY — cart.js (V4.2 - FIX FINAL ERÈ)
// ================================================

const CART_KEY = 'bp_cart';

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

document.addEventListener('DOMContentLoaded', function() {
  refreshBadge();
  prefillCustomerData();
});

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
      img: image || '', qty: 1, sellerId: sellerId || null, sellerPhone: cleanPhone
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
  if (m) { m.style.display = 'none'; }
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

  return `<html><body style="font-family:sans-serif; padding:40px;"><h2>RESI BOUTIQUE PIYAY</h2><p>ID: #${data.orderId}</p><p>Kliyan: ${data.name}</p><table>${itemsHtml}</table><h3>TOTAL: ${grandTotal} HTG</h3></body></html>`;
}

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

  try {
    const sup = window._supabaseClient || supabase.createClient("https://lsyjnhqjssirtgrdfgcu.supabase.co", "sb_publishable_yoALXcRyaiBnSieRF7MSpA_bB5DGT13");
    window._supabaseClient = sup;

    const { data: { user } } = await sup.auth.getUser();

    for (const item of currentCart) {
      const totalItem = item.price * item.qty;
      // ✅ ENSÈSYON SENPLIFYE NAN DATABASE (Pou evite erè)
      await sup.from('orders').insert({
        seller_id:       item.sellerId,
        customer_name:   name,
        customer_phone:  phone,
        product_title:   item.title,
        total_price:     totalItem,
        delivery_zone:   zone
      });

      if (item.sellerId) {
        await sup.from('notifications').insert({
          user_id: item.sellerId,
          type: 'new_order',
          title: '🛍️ Nouvo Kòmand!',
          body: `Ou gen yon nouvo kòmand pou: ${item.title}`,
          read: false
        });
      }
    }
  } catch(err) { console.error('Supabase error:', err); }

  document.getElementById('order-form-container').style.display = 'none';
  document.getElementById('order-summary').innerHTML = `
    <div style="text-align:center;padding:30px;">
      <div style="font-size:60px;margin-bottom:16px;">✅</div>
      <h2 style="font-weight:900;color:#0f172a;margin-bottom:8px;">Kòmand anrejistre!</h2>
      <p style="color:#64748b;margin-bottom:20px;">Kòmand ou an gentan nan sistèm nan. Kontakte machann nan kounye a.</p>
      <button onclick="contactWhatsApp()" style="width:100%;padding:18px;background:#25D366;color:white;border:none;border-radius:15px;font-weight:800;cursor:pointer;font-size:16px;margin-bottom:10px;">💬 Pale ak Machann nan</button>
      <p style="font-size:11px; color:#ef4444; font-weight:700; margin-top:15px;">⚠️ PA JANM PEYE DEYÒ PLATFÒM NAN SI W VLE NOU GARANTI KÒB OU.</p>
    </div>`;

  localStorage.removeItem(CART_KEY);
  refreshBadge();
}

function contactWhatsApp() {
  const data = JSON.parse(localStorage.getItem('last_order_full_data'));
  if (!data) return;
  const sellerGroups = {};
  data.cart.forEach(item => {
    if (!sellerGroups[item.sellerPhone]) sellerGroups[item.sellerPhone] = [];
    sellerGroups[item.sellerPhone].push(item);
  });
  Object.keys(sellerGroups).forEach((sPhone, index) => {
    const items = sellerGroups[sPhone];
    let msg = `🛍️ *COMMANDE BOUTIQUE PIYAY*\n\n👤 *Client:* ${data.name}\n📍 *Zòn:* ${data.zone}\n\n*ATIK YO:*`;
    items.forEach(it => msg += `\n• ${it.title} (x${it.qty})`);
    setTimeout(() => window.open(`https://wa.me/${sPhone}?text=${encodeURIComponent(msg)}`, '_blank'), index * 1000);
  });
}

function toast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.style.display = 'block';
  setTimeout(() => { t.style.display='none'; }, 3000);
}

window.orderProduct = orderProduct;
window.openCart = openCart;
window.closeOrderModal = closeOrderModal;
window.submitOrder = submitOrder;
window.contactWhatsApp = contactWhatsApp;
window.chgQty = chgQty;
window.removeItem = removeItem;
window.downloadReceipt = downloadReceipt;
