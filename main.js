// ==========================================
// BOUTIQUE PIYAY - CORE JAVASCRIPT
// ==========================================

const CART_STORAGE_KEY = 'boutique_piyay_cart';
let cartItems = [];

try {
    cartItems = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
} catch(e) {
    cartItems = [];
}

// Pour compatibilité avec checkout.html
window.cart = {
    get items() { return cartItems; },
    processCheckout: function(formData) {
        const name = formData.get('name');
        const phone = formData.get('phone');
        const address = formData.get('address');
        const city = formData.get('city');
        const payment = formData.get('payment_method');
        const notes = formData.get('notes');

        let message = `*🛒 NOUVELLE COMMANDE - BOUTIQUE PIYAY*\n\n`;
        message += `👤 *Client :* ${name}\n`;
        message += `📱 *Tél :* ${phone}\n`;
        message += `📍 *Adresse :* ${address}, ${city}\n`;
        message += `💳 *Paiement :* ${payment.toUpperCase()}\n`;
        if(notes) message += `📝 *Note :* ${notes}\n`;
        message += `\n*📦 ARTICLES :*\n`;

        let total = 0;
        cartItems.forEach(item => {
            message += `- ${item.quantity}x ${item.title} (${item.price * item.quantity} HTG)\n`;
            total += (item.price * item.quantity);
        });

        const shipping = total >= 1000 ? 0 : 100;
        if(shipping > 0) message += `🚚 *Livraison :* ${shipping} HTG\n`;
        message += `\n*💰 TOTAL À PAYER : ${total + shipping} HTG*`;

        window.open(`https://wa.me/50948868964?text=${encodeURIComponent(message)}`, '_blank');

        // Optionnel: Vider le panier après succès
        // cartItems = [];
        // saveCart();
        // updateCartUI();
    }
};

function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
}

function updateCartUI() {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.innerText = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function orderProduct(title, price, id, image) {
    let quantity = 1;
    const qtyInput = document.getElementById('prod-qty');
    if (qtyInput) quantity = parseInt(qtyInput.value) || 1;

    const existingItem = cartItems.find(item => item.title === title);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        // Fallback pour l'image si absente
        if (!image && window.event) {
            const btn = window.event.target;
            const card = btn.closest('.product-card') || btn.closest('.flash-card');
            if (card) {
                const imgElement = card.querySelector('img');
                if (imgElement) image = imgElement.getAttribute('src');
            }
        }
        cartItems.push({
            id,
            title,
            price: parseFloat(price),
            quantity,
            image: image || '/assets/img/default.jpg'
        });
    }
    
    saveCart();
    updateCartUI();
    alert("✅ " + title + " ajouté au panier !");
}

function updateCartQty(index, val) {
    if (cartItems[index]) {
        cartItems[index].quantity += val;
        if (cartItems[index].quantity < 1) cartItems.splice(index, 1);
        saveCart();
        updateCartUI();
        renderOrderSummary();
    }
}

function removeItem(index) {
    cartItems.splice(index, 1);
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

    if (cartItems.length === 0) {
        summaryDiv.innerHTML = '<p style="text-align:center; padding:20px;">Votre panier est vide ! 🛒</p>';
        return;
    }

    let html = '<div class="summary-list" style="max-height: 300px; overflow-y: auto;">';
    let total = 0;
    cartItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div style="display:flex; align-items:center; gap:10px; flex: 1;">
                    <img src="${item.image}" style="width:40px; height:40px; object-fit:cover; border-radius:5px;">
                    <div>
                        <div style="font-weight:bold; font-size:14px;">${item.title}</div>
                        <div style="font-size:12px; color:#888;">${item.price} HTG</div>
                    </div>
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
    html += `</div>
    <div style="text-align:right; font-weight:800; font-size:22px; color:#ff4747; margin-top:20px; border-top:2px solid #eee; padding-top:10px;">TOTAL : ${total} HTG</div>
    <div style="margin-top:15px; display:grid; gap:10px;">
        <a href="/checkout" class="btn-checkout" style="background:#ff4747; color:white; text-align:center; padding:12px; border-radius:8px; text-decoration:none; font-weight:bold;">Finaliser la commande</a>
        <button onclick="closeOrderModal()" style="background:#f3f4f6; border:none; padding:10px; border-radius:8px; cursor:pointer;">Continuer les achats</button>
    </div>`;
    summaryDiv.innerHTML = html;
}

// 2. RECHERCHE EN DIRECT (Globale via search.json)
async function liveSearch() {
    let input = document.getElementById('search-input');
    let drop = document.getElementById('search-results');
    if (!input || !drop) return;

    let val = input.value.toLowerCase().trim();
    if (val.length < 2) { drop.style.display = 'none'; return; }

    try {
        const response = await fetch('/search.json');
        const allProducts = await response.json();

        const results = allProducts.filter(p =>
            p.title.toLowerCase().includes(val) ||
            (p.category && p.category.toLowerCase().includes(val))
        );

        if (results.length === 0) {
            drop.innerHTML = '<div style="padding:15px; text-align:center; color:#888;">Aucun résultat trouvé</div>';
        } else {
            drop.innerHTML = results.slice(0, 8).map(r => `
                <a href="${r.url}" class="search-item" style="display:flex; align-items:center; padding:10px; text-decoration:none; color:#333; border-bottom:1px solid #eee;">
                    <img src="${r.image}" style="width:40px; height:40px; object-fit:cover; margin-right:10px; border-radius:5px;">
                    <div><strong>${r.title}</strong><br><span style="color:#ff4747; font-size:13px;">${r.price} HTG</span></div>
                </a>
            `).join('');
        }
        drop.style.display = 'block';
    } catch(e) {
        console.error("Search error:", e);
    }
}

// 3. FLASH SALE TIMER
function startFlashTimer(duration) {
    let timer = duration, hours, minutes, seconds;
    const countdown = document.getElementById('countdown');
    if (!countdown) return;

    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    setInterval(() => {
        hours = parseInt(timer / 3600, 10);
        minutes = parseInt((timer % 3600) / 60, 10);
        seconds = parseInt(timer % 60, 10);

        if(hoursEl) hoursEl.textContent = hours < 10 ? "0" + hours : hours;
        if(minutesEl) minutesEl.textContent = minutes < 10 ? "0" + minutes : minutes;
        if(secondsEl) secondsEl.textContent = seconds < 10 ? "0" + seconds : seconds;

        if (--timer < 0) timer = duration;
    }, 1000);
}

// INITIALISATION
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    startFlashTimer(3600 * 2.5);

    document.addEventListener('click', (e) => {
        const searchResults = document.getElementById('search-results');
        if (searchResults && !e.target.closest('.search-wrap')) {
            searchResults.style.display = 'none';
        }
    });
});
