// ==========================================
// BOUTIQUE PIYAY - CORE JAVASCRIPT (VERSION FINALE)
// ==========================================

let cart = [];
try {
    cart = JSON.parse(localStorage.getItem('piyay_cart')) || [];
} catch(e) {
    cart = [];
}

// 1. AJOUTER AU PANIER
function orderProduct(title, price, id) {
    console.log("Ajout du produit :", title);
    let quantity = 1;

    // Si nous sommes sur la page produit, nous prenons la quantité dans l'input
    const qtyInput = document.getElementById('prod-qty');
    if (qtyInput) {
        quantity = parseInt(qtyInput.value) || 1;
    }

    const existingItem = cart.find(item => item.title === title);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ title, price: parseFloat(price), quantity });
    }
    
    saveCart();
    updateCartUI();

    // Feedback visuel
    alert("✅ " + title + " a été ajouté au panier !");
}

// CHANGER LA QUANTITÉ DANS LE PANIER
function updateCartQty(index, val) {
    if (cart[index]) {
        cart[index].quantity += val;
        if (cart[index].quantity < 1) {
            cart.splice(index, 1); // Retirer si < 1
        }
        saveCart();
        updateCartUI();
        renderOrderSummary(); // Rafraîchir l'affichage du modal
    }
}

// RETIRER UN ARTICLE
function removeItem(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    renderOrderSummary();
}

function saveCart() {
    localStorage.setItem('piyay_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.innerText = totalItems;
        badge.style.display = 'block';
    }
}

// 2. OUVRIR LE MODAL DU PANIER
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

// 3. CONFIRMER LA COMMANDE
function submitOrder() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const payment = document.getElementById('payment-method').value;

    if (!name || !phone || !payment) {
        alert("Veuillez remplir toutes les informations !");
        return;
    }

    if (cart.length === 0) {
        alert("Votre panier est vide !");
        return;
    }

    let message = `*🛒 NOUVELLE COMMANDE - BOUTIQUE PIYAY*\n\n`;
    message += `👤 *Client :* ${name}\n`;
    message += `📱 *Téléphone :* ${phone}\n`;
    message += `💳 *Paiement :* ${payment}\n\n`;
    message += `*📦 ARTICLES :*\n`;
    
    let total = 0;
    cart.forEach(item => {
        message += `- ${item.quantity}x ${item.title} (${item.price * item.quantity} HTG)\n`;
        total += (item.price * item.quantity);
    });
    
    message += `\n*💰 TOTAL : ${total} HTG*`;

    const whatsappUrl = `https://wa.me/50948868964?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');

    // Optionnel: Vider le panier après commande
    // cart = []; saveCart(); updateCartUI(); closeOrderModal();
}

// 4. RECHERCHE EN DIRECT
let searchData = [];
fetch('/search.json').then(res => res.json()).then(data => searchData = data);

function liveSearch() {
    let input = document.getElementById('search-input');
    if (!input) return;
    let term = input.value.toLowerCase();
    let resultsDiv = document.getElementById('search-results');

    if (term.length < 2) {
        if (resultsDiv) resultsDiv.style.display = 'none';
        return;
    }

    let filtered = searchData.filter(item =>
        item.title.toLowerCase().includes(term) ||
        (item.category && item.category.toLowerCase().includes(term))
    ).slice(0, 10);

    if (resultsDiv) {
        if (filtered.length > 0) {
            resultsDiv.innerHTML = filtered.map(item => `
                <a href="${item.url}" class="search-item" style="display:flex; align-items:center; padding:10px; text-decoration:none; color:#333; border-bottom:1px solid #eee;">
                    <img src="${item.image}" style="width:40px; height:40px; object-fit:cover; margin-right:10px; border-radius:5px;">
                    <div>
                        <div style="font-weight:bold; font-size:14px;">${item.title}</div>
                        <div style="font-size:12px; color:#ff4747;">${item.price} HTG</div>
                    </div>
                </a>
            `).join('');
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.innerHTML = '<div style="padding:15px; text-align:center; color:#888;">Aucun résultat trouvé 😕</div>';
            resultsDiv.style.display = 'block';
        }
    }
}

// INITIALISATION
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    // Fermer le dropdown si on clique ailleurs
    document.addEventListener('click', (e) => {
        const searchBox = document.querySelector('.search-box');
        if (searchBox && !searchBox.contains(e.target)) {
            const res = document.getElementById('search-results');
            if(res) res.style.display = 'none';
        }
    });
});
