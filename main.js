const CART_STORAGE_KEY = 'boutique_piyay_cart';
let cartItems = [];
try { cartItems = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || []; } catch(e) { cartItems = []; }

const supabaseMain = typeof supabase !== 'undefined' ? supabase.createClient("https://lsyjnhqjssirtgrdfgcu.supabase.co", "sb_publishable_yoALXcRyaiBnSieRF7MSpA_bB5DGT13") : null;

// --- FONKSYON PANYE ---
function saveCart() { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems)); }
function updateCartUI() {
    const total = cartItems.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('cart-badge');
    if (badge) { badge.innerText = total; badge.style.display = total > 0 ? 'flex' : 'none'; }
}

function orderProduct(title, price, id, image) {
    const existing = cartItems.find(i => i.id === id);
    if (existing) { existing.quantity++; } else {
        cartItems.push({ id, title, price: parseFloat(price), quantity: 1, image: image || '/assets/images/logo.png' });
    }
    saveCart(); updateCartUI();
    const btn = event?.target;
    if(btn && btn.tagName === 'BUTTON') {
        const oldText = btn.innerHTML;
        btn.innerHTML = "✅ Ajoute!";
        btn.style.background = "#22c55e"; btn.style.color = "white";
        setTimeout(() => { btn.innerHTML = oldText; btn.style.background = ""; btn.style.color = ""; }, 1500);
    }
}

function removeFromCart(index) { cartItems.splice(index, 1); saveCart(); updateCartUI(); renderCart(); }
function chgQty(index, val) { cartItems[index].quantity += val; if (cartItems[index].quantity < 1) cartItems[index].quantity = 1; saveCart(); updateCartUI(); renderCart(); }

// --- MODAL & RESI ---
function openOrderModal() { const m = document.getElementById('order-modal'); if (m) { m.style.display = 'flex'; renderCart(); } }
function closeOrderModal() { const m = document.getElementById('order-modal'); if (m) m.style.display = 'none'; }

function renderCart() {
    const summary = document.getElementById('order-summary');
    const footer = document.getElementById('order-form-container');
    if (!summary || !footer) return;
    footer.style.display = 'block';
    if (cartItems.length === 0) {
        summary.innerHTML = `<div style="text-align:center; padding:40px;"><span style="font-size:50px;">🛍️</span><p>Panye w la vid</p></div>`;
        footer.style.display = 'none'; return;
    }
    let html = '<div style="max-height: 280px; overflow-y: auto; padding-right: 5px; margin-bottom: 15px;">';
    let total = 0;
    cartItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        html += `<div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; background:#f8fafc; padding:12px; border-radius:12px;">
            <img src="${item.image}" style="width:50px; height:50px; object-fit:cover; border-radius:8px;">
            <div style="flex:1;">
                <h4 style="margin:0; font-size:13px;">${item.title}</h4>
                <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                    <div style="display:flex; align-items:center; background:white; border-radius:8px;">
                        <button onclick="chgQty(${index}, -1)" style="border:none; background:none; padding:2px 8px;">-</button>
                        <span style="font-weight:700; font-size:12px;">${item.quantity}</span>
                        <button onclick="chgQty(${index}, 1)" style="border:none; background:none; padding:2px 8px;">+</button>
                    </div>
                    <span style="color:#ff4747; font-weight:800; font-size:13px;">${subtotal} HTG</span>
                </div>
            </div>
            <button onclick="removeFromCart(${index})" style="background:#fee2e2; border:none; color:#ef4444; padding:8px; border-radius:8px;">🗑️</button>
        </div>`;
    });
    html += `</div><div style="padding:15px; background:#0f172a; border-radius:15px; color:white; display:flex; justify-content:space-between; align-items:center; font-weight:800;"><span>TOTAL:</span><span style="color:#ff4747; font-size:20px;">${total} HTG</span></div>`;
    summary.innerHTML = html;
}

async function submitOrder() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    let zone = document.getElementById('delivery-zone').value;
    const payment = document.getElementById('payment-method').value;
    if (zone === 'Lòt Zòn') zone = document.getElementById('other-zone').value.trim();
    if (!name || !phone || !zone) return alert("Tanpri ranpli tout enfòmasyon yo.");
    const btn = event.target;
    btn.disabled = true; btn.innerHTML = "⏳ Preparasyon Resi...";
    try {
        const orderId = "BP-" + Math.floor(1000 + Math.random() * 9000);
        const merchantOrders = {};
        let grandTotal = 0;
        for (const item of cartItems) {
            let whatsappTo = "50948868964";
            let sellerName = "Boutique Piyay";
            let sellerId = null;
            if (item.id && item.id.length > 20) {
                const { data: prod } = await supabaseMain.from('user_products').select('seller_id, profiles(full_name, whatsapp)').eq('id', item.id).single();
                if (prod && prod.profiles) {
                    sellerId = prod.seller_id; sellerName = prod.profiles.full_name;
                    if (prod.profiles.whatsapp) whatsappTo = prod.profiles.whatsapp.replace(/[^0-9]/g, '');
                }
            }
            if (!merchantOrders[whatsappTo]) merchantOrders[whatsappTo] = { name: sellerName, items: [] };
            merchantOrders[whatsappTo].items.push(item);
            grandTotal += (item.price * item.quantity);
            await supabaseMain.from('orders').insert([{ seller_id: sellerId, customer_name: name, customer_phone: phone, product_title: item.title, total_price: item.price * item.quantity, payment_method: payment, delivery_zone: zone }]);
        }
        showReceiptView(orderId, name, phone, zone, payment, merchantOrders, grandTotal);
        cartItems = []; saveCart(); updateCartUI();
    } catch (err) { console.error(err); btn.disabled = false; btn.innerHTML = "Konfime Kòmand ✅"; }
}

function showReceiptView(orderId, name, phone, zone, payment, orders, grandTotal) {
    const summary = document.getElementById('order-summary');
    const footer = document.getElementById('order-form-container');
    if (!summary || !footer) return;
    footer.style.display = 'none';
    let tableRows = '';
    for (const data of Object.values(orders)) {
        data.items.forEach(it => {
            tableRows += `<tr><td>${it.title}</td><td style="text-align:center;">${it.quantity}</td><td style="text-align:right;">${it.price * it.quantity} HTG</td></tr>`;
        });
    }
    summary.innerHTML = `
        <div id="receipt-to-download" style="background:white; padding:20px; border:1px solid #eee;">
            <div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:15px;">
                <img src="/assets/images/logo.png" style="width:60px;">
                <h2 style="margin:5px 0 0 0; font-size:18px;">RESI ACHTE / INVOICE</h2>
                <p style="font-size:10px; color:#666; margin:0;">ID: ${orderId} | Dat: ${new Date().toLocaleDateString()}</p>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:11px; margin-bottom:15px;">
                <div><strong>KLIYAN:</strong><br>${name}<br>${phone}</div>
                <div style="text-align:right;"><strong>LIVREZON:</strong><br>${zone}<br>Peman: ${payment}</div>
            </div>
            <table class="receipt-table">
                <thead><tr><th>Atik</th><th style="text-align:center;">Kantite</th><th style="text-align:right;">Pri</th></tr></thead>
                <tbody>${tableRows}</tbody>
                <tfoot><tr class="total-row"><td colspan="2">TOTAL FINAL</td><td style="text-align:right;">${grandTotal} HTG</td></tr></tfoot>
            </table>
            <div style="text-align:center; font-size:9px; color:#aaa; margin-top:20px;">Sponsorisé par: Rivayot-Tech Entreprise</div>
        </div>
        <div style="display:grid; gap:10px; margin-top:20px;">
            ${Object.entries(orders).map(([wa, data]) => {
                let msg = `*🧾 RESI ACHTE - BOUTIQUE PIYAY*\n*ID:* ${orderId}\n\n👤 *Kliyan:* ${name}\n📍 *Zòn:* ${zone}\n💳 *Peman:* ${payment}\n\n*🛒 ATIK YO:*\n`;
                data.items.forEach(it => { msg += `- ${it.quantity}x ${it.title} (${it.price * it.quantity} HTG)\n`; });
                msg += `\n*💰 TOTAL : ${grandTotal} HTG*`;
                return `<a href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" style="display:block; text-align:center; background:#25D366; color:white; padding:15px; border-radius:12px; text-decoration:none; font-weight:800;">💬 Voye bay ${data.name}</a>`;
            }).join('')}
            <button onclick="downloadReceipt()" style="width:100%; padding:15px; background:#0f172a; color:white; border:none; border-radius:12px; font-weight:700; cursor:pointer;">📥 Telechaje Resi (PNG)</button>
        </div>
        <button onclick="location.reload()" style="background:none; border:none; color:#64748b; cursor:pointer; font-size:12px; text-decoration:underline;">Nouvo Kòmand</button>`;
}

async function downloadReceipt(){
    const receipt = document.getElementById('receipt-to-download');
    const canvas = await html2canvas(receipt, { scale: 2 });
    const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = `Resi-Boutique-Piyay-${Date.now()}.png`; link.click();
}

// --- ✅ REMETE KONTÈ VANTE FLASH ---
function startFlashTimers() {
    const hEl = document.getElementById('hours');
    const mEl = document.getElementById('minutes');
    const sEl = document.getElementById('seconds');
    if (!hEl || !mEl || !sEl) return;

    let time = 3600 * 2.5; // 2.5 èdtan pa defo
    setInterval(() => {
        let h = Math.floor(time / 3600);
        let m = Math.floor((time % 3600) / 60);
        let s = time % 60;
        hEl.innerText = h < 10 ? '0' + h : h;
        mEl.innerText = m < 10 ? '0' + m : m;
        sEl.innerText = s < 10 ? '0' + s : s;
        if (time > 0) time--; else time = 3600 * 2.5;
    }, 1000);
}

// --- SEARCH ---
async function liveSearch() {
    let input = document.getElementById('search-input'); let drop = document.getElementById('search-results');
    if (!input || !drop) return;
    let val = input.value.toLowerCase().trim();
    if (val.length < 2) { drop.style.display = 'none'; return; }
    try {
        let results = [];
        if (supabaseMain) {
            const { data: prods } = await supabaseMain.from('user_products').select('*').ilike('title', `%${val}%`).limit(10);
            if (prods) results = prods.map(p => ({ title: p.title, price: p.price, image: p.image_url, url: `/pwodwi-machann.html?id=${p.id}` }));
        }
        if (results.length === 0) drop.innerHTML = '<div style="padding:15px; text-align:center;">Pa jwenn anyen.</div>';
        else drop.innerHTML = results.map(r => `<a href="${r.url}" style="display:flex; align-items:center; padding:10px; text-decoration:none; color:#333; border-bottom:1px solid #eee;"><img src="${r.image}" style="width:40px; height:40px; object-fit:cover; margin-right:10px;"><div style="flex:1;"><strong>${r.title}</strong><br><span style="color:#ff4747; font-size:12px;">${r.price} HTG</span></div></a>`).join('');
        drop.style.display = 'block';
    } catch(e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    startFlashTimers(); // ✅ Aktivasyon kontè a
    document.addEventListener('click', (e) => {
        const res = document.getElementById('search-results');
        if (res && !e.target.closest('.search-wrap')) res.style.display = 'none';
    });
    if(!window.html2canvas) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        document.head.appendChild(script);
    }
});

window.orderProduct=orderProduct; window.openOrderModal=openOrderModal; window.closeOrderModal=closeOrderModal; window.submitOrder=submitOrder; window.removeFromCart=removeFromCart; window.chgQty=chgQty; window.liveSearch=liveSearch; window.downloadReceipt=downloadReceipt;
