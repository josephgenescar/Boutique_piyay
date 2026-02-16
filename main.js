// ==========================================
// BOUTIQUE PIYAY - CORE JAVASCRIPT (VERSION FRANÇAISE)
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
    console.log("Ouverture du panier...");
    const modal = document.getElementById('order-modal');
    if (modal) {
        modal.style.display = 'flex';
        renderOrderSummary();
    } else {
        alert("Votre panier contient " + cart.length + " article(s).");
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

    let html = '<div class="summary-list">';
    let total = 0;
    cart.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        html += `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;">
                <span>${item.quantity}x ${item.title}</span>
                <span>${subtotal} HTG</span>
            </div>
        `;
        total += subtotal;
    });
    html += `</div><div style="text-align:right; font-weight:800; font-size:20px; color:#ff4747; margin-top:15px;">TOTAL : ${total} HTG</div>`;
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

    // Vider le panier
    cart = [];
    saveCart();
    updateCartUI();
    closeOrderModal();
}

// 4. RECHERCHE EN DIRECT
function liveSearch() {
    let input = document.getElementById('search-input');
    if (!input) return;
    let term = input.value.toLowerCase();
    let resultsDiv = document.getElementById('search-results');

    if (term.length < 2) {
        if (resultsDiv) resultsDiv.style.display = 'none';
        return;
    }

    if (typeof searchData !== 'undefined') {
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
}

// INITIALISATION
document.addEventListener('DOMContentLoaded', () => {
    console.log("Boutique Piyay JS Loaded");
    updateCartUI();
});
