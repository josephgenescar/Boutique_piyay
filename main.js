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
    const existingItem = cartItems.find(item => item.id === id);
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

    const btn = event?.target;
    if(btn && btn.tagName === 'BUTTON') {
        const oldText = btn.innerHTML;
        btn.innerHTML = "✅ Ajoute!";
        btn.style.background = "#00C853";
        setTimeout(() => { btn.innerHTML = oldText; btn.style.background = ""; }, 2000);
    }
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
    if (modal) { modal.style.display = 'flex'; renderCart(); }
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    if (modal) {
        modal.style.display = 'none';
        const content = document.querySelector('.modal-content');
        if(content && content.classList.contains('order-success-view')) {
            setTimeout(() => window.location.reload(), 500);
        }
    }
}

function renderCart() {
    const summary = document.getElementById('order-summary');
    if (!summary) return;
    if (cartItems.length === 0) {
        summary.innerHTML = '<div style="text-align:center; padding:40px;"><span style="font-size:50px;">🛍️</span><p style="margin-top:15px; font-weight:700; color:#64748b;">Panye w la vid</p></div>';
        return;
    }
    let html = '<div style="max-height: 250px; overflow-y: auto; padding-right: 5px;">';
    let total = 0;
    cartItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        html += `
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; background:#f8fafc; padding:10px; border-radius:12px; border:1px solid #f1f5f9;">
                <img src="${item.image}" style="width:45px; height:45px; object-fit:cover; border-radius:8px;">
                <div style="flex:1;">
                    <h4 style="margin:0; font-size:13px; font-weight:800;">${item.title}</h4>
                    <p style="margin:0; color:#ff4747; font-weight:800; font-size:12px;">${item.price} HTG <small style="color:#64748b;">x${item.quantity}</small></p>
                </div>
                <button onclick="removeFromCart(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:16px; padding:5px;">🗑️</button>
            </div>`;
    });
    html += `</div><div style="margin-top:15px; padding-top:15px; border-top:2px dashed #eee; text-align:right; font-weight:900; font-size:20px; color:#0f172a;">TOTAL: <span style="color:#ff4747;">${total} HTG</span></div>`;
    summary.innerHTML = html;
}

async function submitOrder() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const payment = document.getElementById('payment-method').value;
    if (!name || !phone) return alert("Tanpri ranpli non w ak telefòn ou.");
    const btn = event.target;
    btn.disabled = true; btn.innerHTML = "⏳ N ap prepare kòmand lan...";
    try {
        const merchantOrders = {};
        for (const item of cartItems) {
            let whatsappTo = "50948868964";
            let sellerName = "Admin";
            let sellerId = null;
            if (item.id && item.id.length > 20) {
                const { data: prod } = await supabaseMain.from('user_products').select('seller_id, profiles(full_name, whatsapp)').eq('id', item.id).single();
                if (prod && prod.profiles) {
                    sellerId = prod.seller_id;
                    sellerName = prod.profiles.full_name;
                    if (prod.profiles.whatsapp) whatsappTo = prod.profiles.whatsapp;
                }
            }
            if (!merchantOrders[whatsappTo]) merchantOrders[whatsappTo] = { name: sellerName, items: [] };
            merchantOrders[whatsappTo].items.push(item);
            await supabaseMain.from('orders').insert([{ seller_id: sellerId, customer_name: name, customer_phone: phone, product_title: item.title, total_price: item.price * item.quantity, payment_method: payment }]);
        }
        showSuccessView(name, merchantOrders, payment);
        cartItems = []; saveCart(); updateCartUI();
    } catch (err) { console.error(err); btn.disabled = false; }
}

function showSuccessView(customerName, orders, payment) {
    const modalBody = document.querySelector('.modal-body');
    const modalContent = document.querySelector('.modal-content');
    if(!modalBody) return;
    modalContent.classList.add('order-success-view');
    let html = `<div style="text-align:center; padding:20px;"><div style="font-size:60px; margin-bottom:15px;">🎉</div><h2 style="font-weight:900;">Mèsi, ${customerName}!</h2><p>Kòmand ou anrejistre. Voye l bay machann yo kounye a :</p><div style="display:grid; gap:15px; text-align:left;">`;
    for (const [phone, data] of Object.entries(orders)) {
        let msg = `*🛒 NOUVELLE COMMANDE*\n👤 *Client :* ${customerName}\n* artículo :*\n`;
        data.items.forEach(it => { msg += `- ${it.quantity}x ${it.title}\n`; });
        const waLink = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
        html += `<div style="background:#f0fdf4; padding:15px; border-radius:15px;"><p style="font-weight:700;">Machann : ${data.name}</p><a href="${waLink}" target="_blank" style="display:block; text-align:center; background:#25D366; color:white; padding:12px; border-radius:10px; text-decoration:none; font-weight:800;">💬 Voye bay ${data.name}</a></div>`;
    }
    html += `</div><button onclick="closeOrderModal()" style="margin-top:20px; background:none; border:none; cursor:pointer; text-decoration:underline;">Fèmen</button></div>`;
    modalBody.innerHTML = html;
}

// --- SEARCH FIX ---
async function liveSearch() {
    let input = document.getElementById('search-input'); // Tcheke ID sa nan header la!
    let drop = document.getElementById('search-results');
    if (!input || !drop) return;
    let val = input.value.toLowerCase().trim();
    if (val.length < 2) { drop.style.display = 'none'; return; }
    try {
        let results = [];
        // 1. Chèche nan Marketplace (Supabase)
        if (supabaseMain) {
            const { data: userProds } = await supabaseMain.from('user_products').select('*').ilike('title', `%${val}%`).limit(10);
            if (userProds) {
                results = userProds.map(p => ({ title: p.title, price: p.price, image: p.image_url, url: `/pwodwi-machann.html?id=${p.id}` }));
            }
        }
        if (results.length === 0) drop.innerHTML = '<div style="padding:15px; text-align:center; color:#888;">Pa jwenn anyen.</div>';
        else drop.innerHTML = results.map(r => `
            <a href="${r.url}" class="search-item" style="display:flex; align-items:center; padding:10px; text-decoration:none; color:#333; border-bottom:1px solid #eee;">
                <img src="${r.image}" style="width:40px; height:40px; object-fit:cover; margin-right:10px; border-radius:5px;">
                <div style="flex:1;">
                    <strong style="font-size:13px;">${r.title}</strong><br>
                    <span style="color:#ff4747; font-size:11px;">${r.price} HTG</span>
                </div>
            </a>`).join('');
        drop.style.display = 'block';
    } catch(e) { console.error(e); }
}

function startFlashTimers() {
    const hEl = document.getElementById('hours');
    const mEl = document.getElementById('minutes');
    const sEl = document.getElementById('seconds');
    let time = 3600 * 2.5;
    setInterval(() => {
        let h = Math.floor(time / 3600); let m = Math.floor((time % 3600) / 60); let s = time % 60;
        if (hEl) hEl.innerText = h < 10 ? '0'+h : h;
        if (mEl) mEl.innerText = m < 10 ? '0'+m : m;
        if (sEl) sEl.innerText = s < 10 ? '0'+s : s;
        if (time > 0) time--; else time = 3600 * 2.5;
    }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI(); startFlashTimers();
    document.addEventListener('click', (e) => {
        const results = document.getElementById('search-results');
        if (results && !e.target.closest('.search-wrap')) results.style.display = 'none';
    });
});

window.orderProduct = orderProduct;
window.openOrderModal = openOrderModal;
window.closeOrderModal = closeOrderModal;
window.submitOrder = submitOrder;
window.removeFromCart = removeFromCart;
window.liveSearch = liveSearch;
