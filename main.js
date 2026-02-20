// ==========================================
// BOUTIQUE PIYAY - CORE JAVASCRIPT
// ==========================================

// 1. GESTION DU PANIER
let cart = [];
try {
    cart = JSON.parse(localStorage.getItem('piyay_cart')) || [];
} catch(e) {
    cart = [];
}

function saveCart() {
    localStorage.setItem('piyay_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.innerText = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function orderProduct(title, price, id) {
    let quantity = 1;
    const qtyInput = document.getElementById('prod-qty');
    if (qtyInput) quantity = parseInt(qtyInput.value) || 1;

    const existingItem = cart.find(item => item.title === title);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ title, price: parseFloat(price), quantity });
    }
    
    saveCart();
    updateCartUI();
    alert("✅ " + title + " ajouté au panier !");
}

function updateCartQty(index, val) {
    if (cart[index]) {
        cart[index].quantity += val;
        if (cart[index].quantity < 1) cart.splice(index, 1);
        saveCart();
        updateCartUI();
        renderOrderSummary();
    }
}

function removeItem(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    renderOrderSummary();
}

function openOrderModal() {
    const modal = document.getElementById('order-modal');
    if (modal) {
        modal.style.display = 'flex';
        renderOrderSummary();
    }
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    if (modal) modal.style.display = 'none';
}

function renderOrderSummary() {
    const summaryDiv = document.getElementById('order-summary');
    if (!summaryDiv) return;

    if (cart.length === 0) {
        summaryDiv.innerHTML = '<p style="text-align:center; padding:20px;">Votre panier est vide ! 🛒</p>';
        return;
    }

    let html = '<div class="summary-list" style="max-height: 300px; overflow-y: auto;">';
    let total = 0;
    cart.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div style="flex: 1;">
                    <div style="font-weight:bold; font-size:14px;">${item.title}</div>
                    <div style="font-size:12px; color:#888;">${item.price} HTG / unité</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button onclick="updateCartQty(${index}, -1)" style="width:25px; height:25px; border-radius:50%; border:1px solid #ddd; background:white; cursor:pointer;">-</button>
                    <span style="font-weight:bold; min-width:20px; text-align:center;">${item.quantity}</span>
                    <button onclick="updateCartQty(${index}, 1)" style="width:25px; height:25px; border-radius:50%; border:1px solid #ddd; background:white; cursor:pointer;">+</button>
                    <button onclick="removeItem(${index})" style="margin-left:10px; background:none; border:none; color:#ff4747; cursor:pointer; font-size:18px;">🗑️</button>
                </div>
            </div>
        `;
        total += subtotal;
    });
    html += `</div><div style="text-align:right; font-weight:800; font-size:22px; color:#ff4747; margin-top:20px; border-top:2px solid #eee; padding-top:10px;">TOTAL : ${total} HTG</div>`;
    summaryDiv.innerHTML = html;
}

function submitOrder() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const payment = document.getElementById('payment-method').value;

    if (!name || !phone || !payment) {
        alert("Veuillez remplir toutes les informations !");
        return;
    }

    let message = `*🛒 NOUVELLE COMMANDE - BOUTIQUE PIYAY*\n\n👤 *Client :* ${name}\n📱 *Tél :* ${phone}\n💳 *Paiement :* ${payment}\n\n*📦 ARTICLES :*\n`;
    let total = 0;
    cart.forEach(item => {
        message += `- ${item.quantity}x ${item.title} (${item.price * item.quantity} HTG)\n`;
        total += (item.price * item.quantity);
    });
    message += `\n*💰 TOTAL : ${total} HTG*`;

    window.open(`https://wa.me/50948868964?text=${encodeURIComponent(message)}`, '_blank');
}

// 2. RECHERCHE EN DIRECT (Améliorée)
function liveSearch() {
    let input = document.getElementById('search-input');
    let drop = document.getElementById('search-results');
    if (!input || !drop) return;

    let val = input.value.toLowerCase();
    if (val.length < 2) { drop.style.display = 'none'; return; }

    let cards = document.querySelectorAll('.product-card, .flash-card');
    let results = [];

    cards.forEach(c => {
        let title = (c.querySelector('h3') || {}).innerText || "";
        let price = (c.querySelector('.price') || c.querySelector('.new-price') || {}).innerText || "";
        let img = (c.querySelector('img') || {}).src || "";
        let link = (c.querySelector('a') || {}).href || "#";

        if (title.toLowerCase().includes(val)) {
            results.push({ title, price, img, link });
        }
    });

    if (results.length === 0) {
        drop.innerHTML = '<div style="padding:15px; text-align:center; color:#888;">Aucun résultat trouvé</div>';
    } else {
        drop.innerHTML = results.slice(0, 6).map(r => `
            <a href="${r.link}" class="search-item" style="display:flex; align-items:center; padding:10px; text-decoration:none; color:#333; border-bottom:1px solid #eee;">
                <img src="${r.img}" style="width:40px; height:40px; object-fit:cover; margin-right:10px; border-radius:5px;">
                <div><strong>${r.title}</strong><br><span style="color:#ff4747;">${r.price}</span></div>
            </a>
        `).join('');
    }
    drop.style.display = 'block';
}

// INITIALISATION
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();

    // Fermer le dropdown de recherche si on clique ailleurs
    document.addEventListener('click', (e) => {
        const searchResults = document.getElementById('search-results');
        if (searchResults && !e.target.closest('.search-wrap')) {
            searchResults.style.display = 'none';
        }
    });
});
