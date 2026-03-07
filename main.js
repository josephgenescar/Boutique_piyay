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

const SUP_URL_MAIN = "https://lsyjnhqjssirtgrdfgcu.supabase.co";
const SUP_KEY_MAIN = "sb_publishable_yoALXcRyaiBnSieRF7MSpA_bB5DGT13";
const supabaseMain = typeof supabase !== 'undefined' ? supabase.createClient(SUP_URL_MAIN, SUP_KEY_MAIN) : null;

// --- FONKSYON PANYE ---
function saveCart() { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems)); }

function updateCartUI() {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.innerText = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

function orderProduct(title, price, id, image) {
    const existingItem = cartItems.find(item => item.id === id || item.title === title);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItems.push({
            id: id,
            title: title,
            price: parseFloat(price),
            quantity: 1,
            image: image || '/assets/images/logo.png'
        });
    }
    saveCart();
    updateCartUI();
    alert("✅ " + title + " ajoute nan panye a!");
}

function removeFromCart(index) {
    cartItems.splice(index, 1);
    saveCart();
    updateCartUI();
    renderCart();
}

// --- MODAL ETAJ ---
function openOrderModal() {
    const modal = document.getElementById('order-modal');
    if (modal) {
        modal.style.display = 'flex';
        renderCart();
    }
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    if (modal) modal.style.display = 'none';
}

function renderCart() {
    const summary = document.getElementById('order-summary');
    if (!summary) return;

    if (cartItems.length === 0) {
        summary.innerHTML = '<p style="text-align:center; padding:20px;">Panye w la vid 🛍️</p>';
        return;
    }

    let html = '<div style="max-height: 300px; overflow-y: auto;">';
    let total = 0;

    cartItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        html += `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <img src="${item.image}" style="width:50px; height:50px; object-fit:cover; border-radius:8px;">
                <div style="flex:1;">
                    <h4 style="margin:0; font-size:14px;">${item.title}</h4>
                    <p style="margin:0; color:#ff4747; font-weight:bold;">${item.price} HTG x ${item.quantity}</p>
                </div>
                <button onclick="removeFromCart(${index})" style="background:none; border:none; color:#ff4747; cursor:pointer; font-size:18px;">🗑️</button>
            </div>
        `;
    });

    html += `</div><div style="margin-top:15px; text-align:right; font-weight:800; font-size:18px;">TOTAL: ${total} HTG</div>`;
    summary.innerHTML = html;
}

// --- SOUMÈT KÒMAND (MARKETPLACE LOGIC) ---
async function submitOrder() {
    const name = document.getElementById('customer-name').value;
    const phone = document.getElementById('customer-phone').value;
    const payment = document.getElementById('payment-method').value;

    if (!name || !phone) return alert("Tanpri ranpli non w ak telefòn ou.");
    if (cartItems.length === 0) return alert("Panye w la vid!");

    // Nou gwoupe pwodwi yo pa machann
    alert("N ap prepare kòmand ou yo... Sa ka pran yon ti segonn.");

    for (const item of cartItems) {
        let whatsappTo = "50948868964"; // Nimewo Admin pa defo
        let sellerId = null;

        // Si se yon pwodwi ki soti nan Marketplace (UUID long)
        if (item.id && item.id.length > 20) {
            try {
                const { data: prod } = await supabaseMain.from('user_products').select('seller_id').eq('id', item.id).single();
                if (prod && prod.seller_id) {
                    sellerId = prod.seller_id;
                    const { data: prof } = await supabaseMain.from('profiles').select('whatsapp').eq('id', sellerId).single();
                    if (prof && prof.whatsapp) whatsappTo = prof.whatsapp;
                }
            } catch (err) { console.error("Error fetching seller:", err); }
        }

        // Voye nan Database si nou gen sellerId
        if (sellerId && supabaseMain) {
            await supabaseMain.from('orders').insert([{
                seller_id: sellerId,
                customer_name: name,
                customer_phone: phone,
                product_title: item.title,
                total_price: item.price * item.quantity,
                payment_method: payment
            }]);
        }

        // Prepare mesaj WhatsApp la
        let msg = `*🛒 NOUVELLE COMMANDE - BOUTIQUE PIYAY*\n\n`;
        msg += `👤 *Client :* ${name}\n`;
        msg += `📱 *Tél :* ${phone}\n`;
        msg += `💳 *Paiement :* ${payment}\n`;
        msg += `\n*📦 ARTICLE :*\n- ${item.quantity}x ${item.title} (${item.price * item.quantity} HTG)\n`;
        msg += `\n*💰 TOTAL À PAYER : ${item.price * item.quantity} HTG*`;

        window.open(`https://wa.me/${whatsappTo.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    }

    cartItems = [];
    saveCart();
    updateCartUI();
    closeOrderModal();
    alert("Kòmand ou yo voye bay machann yo! ✅");
}

// --- LÒT FONKSYON (SEARCH, TIMER, ETC.) ---
async function liveSearch() {
    let input = document.getElementById('search-input');
    let drop = document.getElementById('search-results');
    if (!input || !drop) return;
    let val = input.value.toLowerCase().trim();
    if (val.length < 2) { drop.style.display = 'none'; return; }
    try {
        const response = await fetch('/search.json');
        const staticProducts = await response.json();
        let results = staticProducts.filter(p => p.title.toLowerCase().includes(val)).map(p => ({ ...p, source: 'static' }));
        if (supabaseMain) {
            const { data: userProds } = await supabaseMain.from('user_products').select('*').ilike('title', `%${val}%`);
            if (userProds) {
                const mapped = userProds.map(p => ({ title: p.title, price: p.price, image: p.image_url, url: `/pwodwi-machann.html?id=${p.id}`, source: 'marketplace' }));
                results = [...results, ...mapped];
            }
        }
        if (results.length === 0) drop.innerHTML = '<div style="padding:15px; text-align:center; color:#888;">Aucun résultat trouvé</div>';
        else drop.innerHTML = results.slice(0, 10).map(r => `
            <a href="${r.url}" class="search-item" style="display:flex; align-items:center; padding:10px; text-decoration:none; color:#333; border-bottom:1px solid #eee;">
                <img src="${r.image}" style="width:40px; height:40px; object-fit:cover; margin-right:10px; border-radius:5px;">
                <div style="flex:1;">
                    <strong style="font-size:14px;">${r.title}</strong><br>
                    <span style="color:#ff4747; font-size:12px;">${r.price} HTG</span>
                </div>
            </a>
        `).join('');
        drop.style.display = 'block';
    } catch(e) { console.error(e); }
}

function startFlashTimers() {
    const hEl = document.getElementById('hours');
    const mEl = document.getElementById('minutes');
    const sEl = document.getElementById('seconds');
    let time = 3600 * 2.5;
    setInterval(() => {
        let h = Math.floor(time / 3600);
        let m = Math.floor((time % 3600) / 60);
        let s = time % 60;
        if (hEl) hEl.innerText = h < 10 ? '0'+h : h;
        if (mEl) mEl.innerText = m < 10 ? '0'+m : m;
        if (sEl) sEl.innerText = s < 10 ? '0'+s : s;
        if (time > 0) time--; else time = 3600 * 2.5;
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    startFlashTimers();
    document.addEventListener('click', (e) => {
        const searchResults = document.getElementById('search-results');
        if (searchResults && !e.target.closest('.search-wrap')) searchResults.style.display = 'none';
    });
});

// EXPOSE POU HTML KA RELE YO
window.orderProduct = orderProduct;
window.openOrderModal = openOrderModal;
window.closeOrderModal = closeOrderModal;
window.submitOrder = submitOrder;
window.removeFromCart = removeFromCart;
window.liveSearch = liveSearch;
