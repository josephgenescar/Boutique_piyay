// ==========================================
// BOUTIQUE PIYAY - CORE JAVASCRIPT
// ==========================================

let cart = JSON.parse(localStorage.getItem('piyay_cart')) || [];

// 1. AJOUTE NAN PANYEN
function orderProduct(title, price, id) {
    // Tcheke si gen yon input kantite espesifik (paj pwodwi)
    let qtyInput = document.getElementById('prod-qty');
    let quantity = qtyInput ? parseInt(qtyInput.value) : 1;

    const existingItem = cart.find(item => item.title === title);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ title, price: parseFloat(price), quantity });
    }
    
    saveCart();
    updateCartUI();
    alert(`✅ ${quantity} ${title} ajoute nan panyen!`);
}

// 2. SOVE PANYEN LA
function saveCart() {
    localStorage.setItem('piyay_cart', JSON.stringify(cart));
}

// 3. MIZAJOU BADGE PANYEN
function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.innerText = totalItems;
        badge.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

// 4. OUVRI MODAL KÒMAND
function openOrderModal() {
    if (cart.length === 0) {
        alert("Panyen ou vid! Ajoute yon pwodwi anvan.");
        return;
    }
    const modal = document.getElementById('order-modal');
    if (modal) {
        modal.style.display = 'flex';
        renderOrderSummary();
    }
}

// 5. FÈMEN MODAL
function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    if (modal) modal.style.display = 'none';
}

// 6. REZIME KÒMAND LA
function renderOrderSummary() {
    const summaryDiv = document.getElementById('order-summary');
    if (!summaryDiv) return;

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
    html += `</div><div style="text-align:right; font-weight:800; font-size:20px; color:#ff4747; margin-top:15px;">TOTAL: ${total} HTG</div>`;
    summaryDiv.innerHTML = html;
}

// 7. KONFIME KÒMAND SOU WHATSAPP
function submitOrder() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const payment = document.getElementById('payment-method').value;

    if (!name || !phone || !payment) {
        alert("Tanpri ranpli tout enfòmasyon yo!");
        return;
    }

    let message = `*🛒 NOUVO KÒMAND - BOUTIQUE PIYAY*\n\n`;
    message += `👤 *Kliyan:* ${name}\n`;
    message += `📱 *Telefòn:* ${phone}\n`;
    message += `💳 *Peman:* ${payment}\n\n`;
    message += `*📦 ATIK YO:*\n`;
    
    let total = 0;
    cart.forEach(item => {
        message += `- ${item.quantity}x ${item.title} (${item.price * item.quantity} HTG)\n`;
        total += (item.price * item.quantity);
    });
    
    message += `\n*💰 TOTAL: ${total} HTG*`;

    const whatsappUrl = `https://wa.me/50948868964?text=${encodeURIComponent(message)}`;
    
    // Klere panyen an apre kòmand lan
    cart = [];
    saveCart();
    updateCartUI();
    closeOrderModal();

    window.open(whatsappUrl, '_blank');
}

// 8. LIVE SEARCH LOGIC
let searchData = [];
fetch('/search.json').then(res => res.json()).then(data => searchData = data);

function liveSearch() {
    let input = document.getElementById('search-input').value.toLowerCase();
    let resultsDiv = document.getElementById('search-results');

    if (input.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    let filtered = searchData.filter(item =>
        item.title.toLowerCase().includes(input) ||
        (item.category && item.category.toLowerCase().includes(input))
    ).slice(0, 10);

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
        resultsDiv.innerHTML = '<div style="padding:15px; text-align:center; color:#888;">Pa jwenn anyen 😕</div>';
        resultsDiv.style.display = 'block';
    }
}

// INITYALIZASYON
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();

    // Fèmen dropdown rechèch si moun nan klike deyò
    document.addEventListener('click', (e) => {
        const searchBox = document.querySelector('.search-box');
        const resultsDiv = document.getElementById('search-results');
        if (searchBox && !searchBox.contains(e.target) && resultsDiv) {
            resultsDiv.style.display = 'none';
        }
    });
});
