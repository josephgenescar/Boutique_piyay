const CART_KEY = 'boutique_piyay_cart';

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
    order_items: JSON.stringify(group.items),
    product_id: group.items.length === 1 ? group.items[0].product_id : null,
    product_name: group.items.map(i => i.title).join(' | '),
    amount: group.amount,
    status: 'pending',
    created_at: createdAt,
    updated_at: createdAt
  }));
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
      img: image || '', qty: 1, sellerId: sellerId || null, sellerPhone: sellerPhone || '50948868964', sellerName: sellerName || 'Boutique Piyay'
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
    .seller-group { background: #f8fafc; border-radius: 12px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #ff4747; }
    .seller-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-weight: 800; color: #0f172a; padding-bottom: 10px; border-bottom: 2px solid #fbbf24; }
    .seller-name { display: flex; align-items: center; gap: 8px; }
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
    const sellerName = group.sellerName || 'Boutique Piyay';

    // Kreye mesaj ak lis pwodwi yo
    let sellerMessage = `Bonjour ${sellerName}, je suis intéressé par ces produits :\n\n`;
    group.items.forEach(it => {
      sellerMessage += `• ${it.title} (x${it.qty}) - ${it.price} HTG\n`;
    });
    const sellerTotal = group.items.reduce((sum, it) => sum + (it.price * it.qty), 0);
    sellerMessage += `\n💰 Total: ${sellerTotal.toLocaleString()} HTG`;
    const encodedMessage = encodeURIComponent(sellerMessage);

    html += `<div class="seller-group">
      <div class="seller-header">
        <span class="seller-name">🏪 ${sellerName}</span>
        <div class="seller-wa">
          <a href="https://wa.me/${phone}?text=${encodedMessage}" target="_blank">📱 WhatsApp</a>
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
  win.document.write(`<html><body style="font-family:Arial;padding:40px;"><div style="text-align:center;"><img src="/assets/images/logo.png" style="width:80px;"><h1 style="color:#ff4747;">BOUTIQUE PIYAY</h1><p>Resi Commande #${serial}</p></div><p>Client: ${data.name}</p><p>Tèl: ${data.phone}</p><table style="width:100%;border-collapse:collapse;">${itemsHtml}</table><h2 style="text-align:right;">TOTAL: ${data.cart.reduce((s,i)=>s+(i.price*i.qty),0).toLocaleString()} HTG</h2><script>window.print();</script></body></html>`);
  win.document.close();
}

function contactWhatsApp(data) {
  const sPhone = data.cart[0].sellerPhone || '50948868964';
  let msg = `🛍️ *NOUVO KÒMAND BOUTIQUE PIYAY*\n\n👤 *Client:* ${data.name}\n📞 *Tèl:* ${data.phone}\n📍 *Zone:* ${data.zone}\n📝 *Peman:* ${data.payment || 'Non précisé'}\n🔑 *Trans ID:* ${data.transactionId || 'N/A'}\n\n*ATIK YO:*`;
  data.cart.forEach(it => msg += `\n• ${it.title} (x${it.qty})`);
  msg += `\n\n💰 *TOTAL:* ${data.cart.reduce((s,i)=>s+(i.price*i.qty),0)} HTG`;
  window.open(`https://wa.me/${sPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}

window.contactSellersWhatsApp = function() {
  console.log('📱 contactSellersWhatsApp appelé');
  const cart = getCart();
  if (!cart || cart.length === 0) {
    alert('Le panier est vide. Ajouterz un produit avant de contacter un vendeur.');
    return;
  }
  console.log('🛒 Panier:', cart);

  const sellers = {};
  cart.forEach(item => {
    const sellerId = item.sellerId || 'boutique-piyay';
    if (!sellers[sellerId]) {
      sellers[sellerId] = {
        phone: item.sellerPhone || '50948868964',
        sellerName: item.sellerName || 'Boutique Piyay',
        items: []
      };
    }
    sellers[sellerId].items.push(item);
  });

  const sellerKeys = Object.keys(sellers);
  if (sellerKeys.length === 1) {
    const group = sellers[sellerKeys[0]];
    const phone = group.phone.toString().replace(/[^0-9]/g, '');
    let msg = `Bonjour ${group.sellerName}, je suis intéressé par ces produits :`;
    group.items.forEach(it => msg += `\n• ${it.title} (x${it.qty})`);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    return;
  }

  let sellerList = 'Il y a plusieurs vendeurs dans le panier. Choisissez un vendeur à contacter :\n\n';
  sellerKeys.forEach((key, index) => {
    const group = sellers[key];
    sellerList += `${index + 1}. ${group.sellerName} - ${group.phone}\n`;
  });
  sellerList += '\nEntrez le numéro du vendeur à contacter.';

  const choice = prompt(sellerList, '1');
  const selectedIndex = parseInt(choice, 10) - 1;
  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= sellerKeys.length) {
    alert('Choix invalide. Action annulée.');
    return;
  }

  const selectedGroup = sellers[sellerKeys[selectedIndex]];
  const phone = selectedGroup.phone.toString().replace(/[^0-9]/g, '');
  let msg = `Bonjour ${selectedGroup.sellerName}, je souhaite commander ces produits :`;
  selectedGroup.items.forEach(it => msg += `\n• ${it.title} (x${it.qty})`);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
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
  const zone = zoneInput.value;
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
