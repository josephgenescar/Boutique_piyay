// ================================================
// BOUTIQUE PIYAY — cart.js
// Konpatib 100% ak index.html (orderProduct)
// ================================================

var cart = JSON.parse(localStorage.getItem('bp_cart') || '[]');

document.addEventListener('DOMContentLoaded', function() {
  refreshBadge();
  initPaymentListener();
});

// ─── FONKSYON RELE NAN HTML ──────────────────────
// Fonksyon sa a deja nan bouton "Ajouter" ou yo
function orderProduct(title, price, id) {
  var key = id || title.replace(/\s+/g,'-').toLowerCase();
  var found = false;

  for (var i = 0; i < cart.length; i++) {
    if (cart[i].id === key) { cart[i].qty += 1; found = true; break; }
  }

  if (!found) {
    // Chèche imaj pwodwi a nan DOM
    var img = '';
    var cards = document.querySelectorAll('.product-card, .flash-card');
    cards.forEach(function(c) {
      var t = (c.querySelector('h3 a')||c.querySelector('h3')||{}).textContent || '';
      if (t.trim() === title.trim()) {
        img = (c.querySelector('img')||{}).src || '';
      }
    });
    cart.push({ id: key, title: title, price: parseFloat(price)||0, img: img, qty: 1 });
  }

  save();
  refreshBadge();
  toast('✅ ' + title + ' ajouté!');
  openCart();
}

// ─── PANIER ─────────────────────────────────────

function toggleCart() {
  var m = document.getElementById('cart-modal');
  if (!m) return;
  m.style.display = (m.style.display === 'none' || !m.style.display) ? 'block' : 'none';
  if (m.style.display === 'block') drawCart();
}

function openCart() {
  var m = document.getElementById('cart-modal');
  if (m) { m.style.display = 'block'; drawCart(); }
}

function closeCart() {
  var m = document.getElementById('cart-modal');
  if (m) m.style.display = 'none';
}

function drawCart() {
  var box = document.getElementById('cart-items');
  var foot = document.getElementById('cart-footer');
  if (!box) return;

  if (cart.length === 0) {
    box.innerHTML =
      '<div style="text-align:center;padding:50px 20px;color:#999;">' +
      '<div style="font-size:56px;margin-bottom:15px;">🛒</div>' +
      '<p style="font-size:15px;margin-bottom:20px;">Votre panier est vide</p>' +
      '<a href="/" onclick="closeCart()" style="display:inline-block;padding:11px 24px;background:#ff4747;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-family:Poppins,sans-serif;">Voir les produits</a>' +
      '</div>';
    if (foot) foot.style.display = 'none';
    return;
  }

  if (foot) foot.style.display = 'block';

  box.innerHTML = cart.map(function(it) {
    var sub = (it.price * it.qty).toFixed(0);
    return '<div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #f5f5f5;">' +
      '<div style="width:65px;height:65px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#f5f5f5;display:flex;align-items:center;justify-content:center;">' +
        (it.img ? '<img src="'+it.img+'" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML=\'🛍️\'">' : '<span style="font-size:28px;">🛍️</span>') +
      '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;font-weight:600;margin-bottom:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+it.title+'</div>' +
        '<div style="color:#ff4747;font-weight:800;margin-bottom:8px;font-size:15px;">'+sub+' HTG</div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<button onclick="chgQty(\''+it.id+'\',-1)" style="width:26px;height:26px;border:1px solid #eee;background:white;border-radius:50%;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;line-height:1;">−</button>' +
          '<span style="font-weight:700;min-width:18px;text-align:center;">'+it.qty+'</span>' +
          '<button onclick="chgQty(\''+it.id+'\',1)" style="width:26px;height:26px;border:1px solid #eee;background:white;border-radius:50%;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;line-height:1;">+</button>' +
        '</div>' +
      '</div>' +
      '<button onclick="delItem(\''+it.id+'\')" style="background:none;border:none;font-size:18px;cursor:pointer;color:#ddd;padding:0;align-self:flex-start;transition:.3s;" onmouseover="this.style.color=\'#ff4747\'" onmouseout="this.style.color=\'#ddd\'">🗑️</button>' +
    '</div>';
  }).join('');

  var tot = document.getElementById('cart-total');
  if (tot) tot.textContent = total() + ' HTG';
}

function chgQty(id, d) {
  cart.forEach(function(it) { if (it.id === id) it.qty = Math.max(1, it.qty + d); });
  save(); refreshBadge(); drawCart();
}

function delItem(id) {
  cart = cart.filter(function(it) { return it.id !== id; });
  save(); refreshBadge(); drawCart();
  toast('🗑️ Produit retiré');
}

function total() {
  return cart.reduce(function(s,it){ return s + it.price*it.qty; }, 0).toFixed(0);
}

function count() {
  return cart.reduce(function(s,it){ return s + it.qty; }, 0);
}

function save() { localStorage.setItem('bp_cart', JSON.stringify(cart)); }

function refreshBadge() {
  var b = document.getElementById('cart-count');
  if (!b) return;
  var n = count();
  b.textContent = n;
  b.style.display = n > 0 ? 'flex' : 'none';
}

// ─── COMMANDE ────────────────────────────────────

function passerCommande() {
  closeCart();
  if (cart.length === 0) { toast('⚠️ Panier vide!'); return; }

  var lines = cart.map(function(it) {
    return '• '+it.title+' x'+it.qty+' = '+(it.price*it.qty).toFixed(0)+' HTG';
  }).join('<br>');

  var html = '<strong>📦 ' + count() + ' article(s):</strong><br>' + lines +
    '<hr style="border:1px solid #fecaca;margin:10px 0;">' +
    '<strong>💰 Total: ' + total() + ' HTG</strong>';

  openOrderModal(html, '', '');
}

function openOrderModal(summaryHTML, directTitle, directPrice) {
  var box = document.getElementById('order-summary');
  if (box) box.innerHTML = summaryHTML;

  var modal = document.getElementById('order-modal');
  if (!modal) return;

  modal.dataset.dt = directTitle || '';
  modal.dataset.dp = directPrice || '';
  modal.style.display = 'flex';
}

function closeOrderModal() {
  var m = document.getElementById('order-modal');
  if (m) m.style.display = 'none';
}

function submitOrder(e) {
  e.preventDefault();

  var name  = (document.getElementById('customer-name') ||{}).value || '';
  var phone = (document.getElementById('customer-phone')||{}).value || '';
  var pay   = (document.getElementById('payment-method')||{}).value || '';

  name = name.trim(); phone = phone.trim();

  if (!name || !phone || !pay) { toast('⚠️ Remplissez tous les champs!'); return; }

  var modal = document.getElementById('order-modal');
  var dt = modal ? modal.dataset.dt : '';
  var dp = modal ? modal.dataset.dp : '';

  var lines, tot;
  if (dt) {
    lines = '• '+dt+' — '+dp+' HTG';
    tot   = dp;
  } else {
    lines = cart.map(function(it){ return '• '+it.title+' x'+it.qty+' = '+(it.price*it.qty).toFixed(0)+' HTG'; }).join('\n');
    tot   = total();
  }

  var payLbl = { moncash:'💸 Moncash (4886-8964)', natcash:'💳 Natcash (4068-3108)', cash:'💵 Espèces à la livraison' };

  var msg =
    '🛍️ *NOUVELLE COMMANDE — BOUTIQUE PIYAY*\n\n' +
    '👤 *Client:* '+name+'\n' +
    '📱 *Téléphone:* '+phone+'\n' +
    '💳 *Paiement:* '+(payLbl[pay]||pay)+'\n\n' +
    '📦 *PRODUITS:*\n'+lines+'\n\n' +
    '💰 *TOTAL: '+tot+' HTG*\n\n' +
    '📅 '+new Date().toLocaleString('fr-FR');

  window.open('https://wa.me/50948868964?text='+encodeURIComponent(msg), '_blank');

  if (!dt) { cart=[]; save(); refreshBadge(); }
  closeOrderModal();
  e.target.reset();
  showPaymentInfo('');
  toast('🎉 Commande envoyée! Merci!');
}

function showPaymentInfo(val) {
  var box = document.getElementById('payment-info-box');
  if (!box) return;
  var msgs = {
    moncash: '📲 Envoyez le montant au <strong>4886-8964</strong> via Moncash, puis confirmez votre commande.',
    natcash: '💳 Envoyez le montant au <strong>4068-3108</strong> via Natcash, puis confirmez.',
    cash:    '💵 Préparez le montant exact. Notre livreur vous contactera avant d\'arriver.'
  };
  if (msgs[val]) { box.innerHTML = msgs[val]; box.style.display = 'block'; }
  else           { box.style.display = 'none'; }
}

function initPaymentListener() {
  var sel = document.getElementById('payment-method');
  if (sel) sel.addEventListener('change', function(){ showPaymentInfo(this.value); });
}

// ─── TOAST ──────────────────────────────────────

function toast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  t.style.animation = 'toastIn .3s ease';
  clearTimeout(t._tmr);
  t._tmr = setTimeout(function(){ t.style.display='none'; }, 3000);
}

// ─── EXPOSE GLOBAL ──────────────────────────────
window.orderProduct  = orderProduct;
window.toggleCart    = toggleCart;
window.openCart      = openCart;
window.closeCart     = closeCart;
window.chgQty        = chgQty;
window.delItem       = delItem;
window.passerCommande= passerCommande;
window.openOrderModal= openOrderModal;
window.closeOrderModal=closeOrderModal;
window.submitOrder   = submitOrder;
window.showPaymentInfo=showPaymentInfo;
window.toast         = toast;