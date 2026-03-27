const CART_KEY = 'bp_cart';

function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
}

document.addEventListener('DOMContentLoaded', () => {
  refreshBadge();
});

function orderProduct(title, price, id, image, sellerId, sellerPhone) {
  let currentCart = getCart();
  let key = id || title.replace(/\s+/g,'-').toLowerCase();
  let found = false;

  for (let i = 0; i < currentCart.length; i++) {
    if (currentCart[i].id === key) { currentCart[i].qty += 1; found = true; break; }
  }

  if (!found) {
    currentCart.push({
      id: key, title: title, price: parseFloat(price) || 0,
      img: image || '', qty: 1, sellerId: sellerId || null, sellerPhone: sellerPhone || '50948868964'
    });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
  refreshBadge();
  alert('✅ ' + title + ' ajoute nan panye!');
}

function openCart() {
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
    box.innerHTML = `<div style="text-align:center;padding:40px;color:#999;"><div style="font-size:50px;">🛒</div><p>Panye a vid</p></div>`;
    document.getElementById('order-form-container').style.display = 'none';
    return;
  }

  document.getElementById('order-form-container').style.display = 'block';

  let totalHTG = 0;
  let html = `<style>.cart-item { display: flex; align-items: center; gap: 15px; padding: 10px 0; border-bottom: 1px solid #eee; }.cart-img { width: 50px; height: 50px; object-fit: cover; border-radius: 8px; }.cart-info { flex: 1; }.cart-title { font-weight: 700; font-size: 14px; }.cart-price { color: #ff4747; font-weight: 800; }</style>`;

  currentCart.forEach(it => {
    let sub = it.price * it.qty;
    totalHTG += sub;
    html += `
      <div class="cart-item">
        <img class="cart-img" src="${it.img}" onerror="this.src='/assets/images/logo.png'">
        <div class="cart-info">
            <div class="cart-title">${it.title}</div>
            <div class="cart-price">${it.price.toLocaleString()} HTG x ${it.qty}</div>
        </div>
        <button onclick="removeItem('${it.id}')" style="background:none; border:none; color:#ff4747; cursor:pointer; font-weight:bold; padding:10px;">✕</button>
      </div>`;
  });

  html += `<div style="margin-top:20px; text-align:right; font-size:18px; font-weight:900;">TOTAL: ${totalHTG.toLocaleString()} HTG</div>`;
  box.innerHTML = html;
}

function removeItem(id) {
  let currentCart = getCart().filter(it => it.id !== id);
  localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
  refreshBadge(); drawCart();
}

function refreshBadge() {
  const b = document.getElementById('cart-count');
  if (!b) return;
  let count = getCart().reduce((s, it) => s + it.qty, 0);
  b.textContent = count; b.style.display = count > 0 ? 'flex' : 'none';
}

function generateReceipt(data) {
  const serial = "BP-" + Date.now().toString().slice(-6);
  let itemsHtml = "";
  data.cart.forEach(it => {
    itemsHtml += `<tr><td style="padding:10px; border-bottom:1px solid #eee;">${it.title}</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:center;">${it.qty}</td><td style="padding:10px; border-bottom:1px solid #eee; text-align:right;">${(it.price * it.qty).toLocaleString()} HTG</td></tr>`;
  });

  const win = window.open('', '_blank');
  win.document.write(`<html><body style="font-family:Arial;padding:40px;"><div style="text-align:center;"><img src="/assets/images/logo.png" style="width:80px;"><h1 style="color:#ff4747;">BOUTIQUE PIYAY</h1><p>Resi Kòmand #${serial}</p></div><p>Kliyan: ${data.name}</p><p>Tèl: ${data.phone}</p><table style="width:100%;border-collapse:collapse;">${itemsHtml}</table><h2 style="text-align:right;">TOTAL: ${data.cart.reduce((s,i)=>s+(i.price*i.qty),0).toLocaleString()} HTG</h2><script>window.print();</script></body></html>`);
  win.document.close();
}

function contactWhatsApp(data) {
  const sPhone = data.cart[0].sellerPhone || '50948868964';
  let msg = `🛍️ *NOUVO KÒMAND BOUTIQUE PIYAY*\n\n👤 *Kliyan:* ${data.name}\n📞 *Tèl:* ${data.phone}\n📍 *Zòn:* ${data.zone}\n📝 *Peman:* ${data.payment || 'Non précisé'}\n🔑 *Trans ID:* ${data.transactionId || 'N/A'}\n\n*ATIK YO:*`;
  data.cart.forEach(it => msg += `\n• ${it.title} (x${it.qty})`);
  msg += `\n\n💰 *TOTAL:* ${data.cart.reduce((s,i)=>s+(i.price*i.qty),0)} HTG`;
  window.open(`https://wa.me/${sPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

async function submitOrder() {
  // Rekipere enfòmasyon nan checkout.html si yo la, sinon nan modal la
  const name = (document.getElementById('customerName') || document.getElementById('customer-name')).value.trim();
  const phone = (document.getElementById('customerPhone') || document.getElementById('customer-phone')).value.trim();
  const zone = (document.getElementById('customerCity') || document.getElementById('delivery-zone')).value;

  // Rekipere ID Tranzaksyon ak mwayen peman si se nan checkout.html
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || 'Cash';
  const transactionId = document.getElementById('transactionId')?.value || 'N/A';

  if (!name || !phone || !zone) { alert('⚠️ Ranpli tout chan yo!'); return; }

  const cart = getCart();
  if (cart.length === 0) return;

  const btn = document.getElementById('submitOrderBtn') || document.querySelector('.btn-confirm-order');
  btn.disabled = true; btn.innerText = "⏳ Anrejistreman...";

  try {
    const sup = (typeof supabaseMain !== 'undefined') ? supabaseMain : null;
    if (!sup) throw new Error("Supabase pa disponib!");

    for (const item of cart) {
      await sup.from('orders').insert({
        seller_id:      item.sellerId,
        customer_name:  name,
        customer_phone: phone,
        delivery_zone:  zone,
        product_title:  item.title,
        total_price:    (item.price * item.qty),
        status:         'pending',
        payment_method: paymentMethod,
        transaction_id: transactionId
      });
    }

    const orderData = { name, phone, zone, cart, payment: paymentMethod, transactionId };

    // Si nou nan paj checkout la
    const summaryBox = document.getElementById('order-summary') || document.querySelector('.checkout-forms');
    summaryBox.innerHTML = `
      <div style="text-align:center; padding:40px; background:white; border-radius:20px; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
          <div style="font-size:60px; margin-bottom:20px;">✅</div>
          <h2 style="color:#ff4747; margin-bottom:15px;">Kòmand Voye!</h2>
          <p style="margin-bottom:25px; color:#666;">Mèsi ${name}, kòmand ou an anrejistre avèk siksè.</p>
          <button onclick='contactWhatsApp(${JSON.stringify(orderData)})' style="width:100%; padding:18px; background:#25D366; color:white; border:none; border-radius:15px; font-weight:bold; cursor:pointer; margin-bottom:15px; font-size:16px;">💬 Voye kòmand lan sou WhatsApp</button>
          <button onclick='generateReceipt(${JSON.stringify(orderData)})' style="width:100%; padding:15px; background:#f1f5f9; color:#334155; border:none; border-radius:15px; font-weight:bold; cursor:pointer; margin-bottom:10px;">📄 Telechaje Resi (PDF)</button>
          <button onclick="location.href='/'" style="width:100%; padding:12px; background:none; color:#999; border:none; cursor:pointer; font-weight:600;">Retounen nan Akèy</button>
      </div>`;

    localStorage.removeItem(CART_KEY);
    refreshBadge();

  } catch (err) {
    alert("Erè: " + err.message);
    btn.disabled = false; btn.innerText = "Konfime Kòmand la ✅";
  }
}

window.orderProduct = orderProduct;
window.openCart = openCart;
window.closeOrderModal = closeOrderModal;
window.submitOrder = submitOrder;
window.removeItem = removeItem;
window.generateReceipt = generateReceipt;
window.contactWhatsApp = contactWhatsApp;
