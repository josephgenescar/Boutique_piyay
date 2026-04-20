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

  // Group items by seller
  let bySeller = {};
  currentCart.forEach(it => {
    const sid = it.sellerId || 'boutique-piyay';
    if (!bySeller[sid]) bySeller[sid] = { items: [], phone: it.sellerPhone };
    bySeller[sid].items.push(it);
  });

  let totalHTG = 0;
  let html = `<style>
    .seller-group { background: #f8fafc; border-radius: 12px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #ff4747; }
    .seller-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-weight: 800; color: #0f172a; padding-bottom: 10px; border-bottom: 2px solid #fbbf24; }
    .seller-wa { font-size: 12px; }
    .seller-wa a { color: #25d366; text-decoration: none; font-weight: 700; }
    .cart-item { display: flex; align-items: center; gap: 15px; padding: 10px 0; }
    .cart-img { width: 50px; height: 50px; object-fit: cover; border-radius: 8px; }
    .cart-info { flex: 1; }
    .cart-title { font-weight: 700; font-size: 14px; }
    .cart-price { color: #ff4747; font-weight: 800; }
  </style>`;

  Object.entries(bySeller).forEach(([sellerId, group]) => {
    const phone = (group.phone || '50948868964').toString().replace(/[^0-9]/g, '');
    html += `<div class="seller-group">
      <div class="seller-header">
        <span>🏪 Boutique Piyay</span>
        <div class="seller-wa">
          <a href="https://wa.me/${phone}" target="_blank">📱 WhatsApp</a>
        </div>
      </div>`;
    
    group.items.forEach(it => {
      let sub = it.price * it.qty;
      totalHTG += sub;
      html += `
        <div class="cart-item">
          <img class="cart-img" src="${it.img}" onerror="this.src='/assets/images/logo.png'">
          <div class="cart-info">
            <div class="cart-title">${it.title}</div>
            <div class="cart-price">${it.price.toLocaleString()} HTG × ${it.qty}</div>
          </div>
          <button onclick="removeItem('${it.id}')" style="background:none; border:none; color:#ff4747; cursor:pointer; font-weight:bold; padding:10px;">✕</button>
        </div>`;
    });
    html += `</div>`;
  });

  html += `<div style="margin-top:20px; text-align:right; font-size:18px; font-weight:900; padding: 15px 0; border-top: 3px solid #ff4747;">💰 TOTAL: ${totalHTG.toLocaleString()} HTG</div>`;
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
  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const zoneInput = document.getElementById('delivery-zone');
  const paymentSelect = document.getElementById('payment-method-select');

  if (!nameInput || !phoneInput || !zoneInput || !paymentSelect) {
    alert('⚠️ Erè: Fòm nan pa jwenn nan paj la.'); return;
  }

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const zone = zoneInput.value;
  const paymentMethod = paymentSelect.value;

  if (!name || !phone || !zone) { alert('⚠️ Ranpli tout chan yo!'); return; }

  const cart = getCart();
  if (cart.length === 0) return;

  const totalAmount = cart.reduce((s, i) => s + (i.price * i.qty), 0);
  const orderGroupId = "BP-" + Date.now();
  const btn = document.getElementById('submitOrderBtn');

  btn.disabled = true;
  btn.innerText = paymentMethod === 'MonCash' ? "⏳ Koneksyon MonCash..." : "⏳ Anrejistreman...";

  try {
    const sup = (typeof supabaseMain !== 'undefined') ? supabaseMain : null;

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

        // Pran body kòm text anvan
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

        // Sove nan DB anvan nou redireksyon
        if (sup) {
            for (const item of cart) {
                await sup.from('orders').insert({
                  seller_id: item.sellerId,
                  customer_name: name,
                  customer_phone: phone,
                  delivery_zone: zone,
                  product_title: item.title,
                  total_price: (item.price * item.qty),
                  status: 'pending_payment',
                  payment_method: 'MonCash',
                  order_group_id: orderGroupId
                });
            }
        }

        localStorage.removeItem(CART_KEY);
        refreshBadge();
        window.location.href = data.redirectURL;
        return;
    }

    // Lojik nòmal pou Cash/Natcash
    if (sup) {
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
            order_group_id: orderGroupId
          });
        }
    }

    const orderData = { name, phone, zone, cart, payment: paymentMethod };
    const modalContent = document.querySelector('.modal-content');
    modalContent.innerHTML = `
      <div style="text-align:center; padding:40px;">
          <div style="font-size:60px; margin-bottom:20px;">✅</div>
          <h2 style="color:#ff4747; margin-bottom:15px;">Kòmand Voye!</h2>
          <p style="margin-bottom:25px; color:#666;">Mèsi ${name}, kòmand ou an anrejistre avèk siksè.</p>
          <button onclick='contactWhatsApp(${JSON.stringify(orderData)})' style="width:100%; padding:18px; background:#25D366; color:white; border:none; border-radius:15px; font-weight:bold; cursor:pointer; margin-bottom:15px; font-size:16px;">💬 Voye sou WhatsApp</button>
          <button onclick='generateReceipt(${JSON.stringify(orderData)})' style="width:100%; padding:15px; background:#f1f5f9; color:#334155; border:none; border-radius:15px; font-weight:bold; cursor:pointer; margin-bottom:10px;">📄 Telechaje Resi</button>
          <button onclick="location.href='/'" style="width:100%; padding:12px; background:none; color:#999; border:none; cursor:pointer;">Retounen nan Akèy</button>
      </div>`;

    localStorage.removeItem(CART_KEY);
    refreshBadge();

  } catch (err) {
    alert("❌ " + err.message);
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
