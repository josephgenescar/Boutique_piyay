const CART_STORAGE_KEY = 'boutique_piyay_cart';
let cartItems = [];
try { cartItems = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || []; } catch(e) { cartItems = []; }

const supabaseMain = typeof supabase !== 'undefined' ? supabase.createClient("https://lsyjnhqjssirtgrdfgcu.supabase.co", "sb_publishable_yoALXcRyaiBnSieRF7MSpA_bB5DGT13") : null;

// --- DETEKTE AFILIASYON ---
let currentAffiliateId = null;
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');

if (refCode && supabaseMain) {
    supabaseMain.from('affiliates').select('user_id').eq('referral_code', refCode).eq('status', 'active').single()
        .then(({ data }) => { if (data) currentAffiliateId = data.user_id; });
}

// --- FONKSYON PANYE ---
function saveCart() { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems)); }
function updateCartUI() {
    const total = cartItems.reduce((s, i) => s + i.quantity, 0);
    const cartCount = document.getElementById('cart-count');
    if (cartCount) { cartCount.innerText = total; cartCount.style.display = total > 0 ? 'flex' : 'none'; }
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
        setTimeout(() => { btn.innerHTML = oldText; }, 1500);
    }
}

function removeFromCart(index) { cartItems.splice(index, 1); saveCart(); updateCartUI(); renderCart(); }
function chgQty(index, val) {
    cartItems[index].quantity += val;
    if (cartItems[index].quantity < 1) cartItems[index].quantity = 1;
    saveCart(); updateCartUI(); renderCart();
}

function openOrderModal() { const m = document.getElementById('order-modal'); if (m) { m.style.display = 'flex'; renderCart(); } }
function closeOrderModal() { const m = document.getElementById('order-modal'); if (m) m.style.display = 'none'; }
function openCart() { openOrderModal(); }

function renderCart() {
    const summary = document.getElementById('order-summary');
    const footer = document.getElementById('order-form-container');
    if (!summary) return;

    if (cartItems.length === 0) {
        summary.innerHTML = `<div style="text-align:center; padding:40px;"><span style="font-size:50px;">🛍️</span><p>Panye w la vid</p></div>`;
        if (footer) footer.style.display = 'none';
        return;
    }

    if (footer) footer.style.display = 'block';

    let tableRows = '';
    let total = 0;

    cartItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        tableRows += `
            <tr>
                <td style="padding: 5px; width: 50px;"><img src="${item.image}" style="width:45px; height:45px; object-fit:cover; border-radius:8px;"></td>
                <td style="font-size:11px; font-weight:700;">${item.title}</td>
                <td style="text-align:center;">
                    <div style="display:flex; align-items:center; gap:5px; justify-content:center;">
                        <button onclick="chgQty(${index}, -1)" style="border:none; background:#eee; padding:2px 6px; border-radius:4px; cursor:pointer;">-</button>
                        <span style="font-size:12px; font-weight:800;">${item.quantity}</span>
                        <button onclick="chgQty(${index}, 1)" style="border:none; background:#eee; padding:2px 6px; border-radius:4px; cursor:pointer;">+</button>
                    </div>
                </td>
                <td style="text-align:right; font-weight:800; font-size:11px;">${subtotal} HTG</td>
                <td style="text-align:center;"><button onclick="removeFromCart(${index})" style="border:none; background:none; color:#ff4747; cursor:pointer;">✕</button></td>
            </tr>`;
    });

    summary.innerHTML = `
        <table class="receipt-table" style="width:100%; border-collapse:collapse;">
            <thead>
                <tr>
                    <th>Foto</th>
                    <th>Pwodwi</th>
                    <th style="text-align:center;">Kte</th>
                    <th style="text-align:right;">Total</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
                <tr class="total-row">
                    <td colspan="3" style="padding:12px; font-weight:800;">TOTAL:</td>
                    <td colspan="2" style="text-align:right; padding:12px; font-weight:900; font-size:16px; color:#ff4747;">${total} HTG</td>
                </tr>
            </tfoot>
        </table>`;
}

async function submitOrder() {
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    let zone = document.getElementById('delivery-zone').value;
    const payment = document.getElementById('payment-method').value;
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

            const itemTotal = item.price * item.quantity;
            grandTotal += itemTotal;

            // --- KALKIL KOMISYON OTOMATIK ---
            const systemFee = itemTotal * 0.03; // 3% pou Boutique Piyay
            let affiliateFee = 0;
            if (currentAffiliateId) {
                affiliateFee = itemTotal * 0.05; // 5% pou Afilye
            }
            const sellerNet = itemTotal - systemFee - affiliateFee; // Res la pou Machann nan (92% oswa 97%)

            await supabaseMain.from('orders').insert([{
                seller_id: sellerId,
                customer_name: name,
                customer_phone: phone,
                product_title: item.title,
                total_price: itemTotal,
                commission_system: systemFee,
                commission_affiliate: affiliateFee,
                seller_net_amount: sellerNet,
                payment_method: payment,
                delivery_zone: zone,
                affiliate_id: currentAffiliateId,
                status: 'pending'
            }]);
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
            <table class="receipt-table">
                <thead><tr><th>Atik</th><th style="text-align:center;">Kantite</th><th style="text-align:right;">Pri</th></tr></thead>
                <tbody>${tableRows}</tbody>
                <tfoot><tr class="total-row"><td colspan="2">TOTAL FINAL</td><td style="text-align:right;">${grandTotal} HTG</td></tr></tfoot>
            </table>
        </div>
        <div style="display:grid; gap:10px; margin-top:20px;">
            ${Object.entries(orders).map(([wa, data]) => {
                let msg = `*🧾 RESI ACHTE - BOUTIQUE PIYAY*\n*ID:* ${orderId}\n👤 *Kliyan:* ${name}\n📍 *Zòn:* ${zone}\n💳 *Peman:* ${payment}\n💰 *TOTAL : ${grandTotal} HTG*`;
                return `<a href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" style="display:block; text-align:center; background:#25D366; color:white; padding:15px; border-radius:12px; text-decoration:none; font-weight:800;">💬 Voye bay ${data.name}</a>`;
            }).join('')}
        </div>
        <button onclick="location.reload()" style="background:none; border:none; color:#64748b; cursor:pointer; font-size:12px; text-decoration:underline; width:100%; margin-top:15px;">Fè yon lòt kòmand</button>`;
}

// --- SEARCH ENGINE FIX ---
let staticSearchData = [];
async function initSearch() {
    try {
        const resp = await fetch('/search.json');
        staticSearchData = await resp.json();
    } catch (e) { console.error("Static search load error", e); }
}

window.liveSearch = async function() {
    const input = document.getElementById('search-input');
    const resultsDiv = document.getElementById('search-results');
    if (!input || !resultsDiv) return;

    const query = input.value.toLowerCase().trim();
    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    // 1. Chèche nan Static Data (Fichye yo)
    let matches = staticSearchData.filter(p =>
        p.title.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query))
    );

    // 2. Chèche nan Supabase (Pwodwi Machann yo)
    if (supabaseMain) {
        const { data: dbMatches } = await supabaseMain
            .from('user_products')
            .select('id, title, price, image_url, category')
            .ilike('title', `%${query}%`)
            .limit(5);

        if (dbMatches) {
            dbMatches.forEach(dm => {
                // Evite kopi si pwodwi a ta nan de kote yo
                if (!matches.find(m => m.id === dm.id)) {
                    matches.push({
                        title: dm.title,
                        url: `/pwodwi-machann.html?id=${dm.id}`,
                        price: dm.price,
                        image: dm.image_url,
                        category: dm.category
                    });
                }
            });
        }
    }

    matches = matches.slice(0, 8); // Limite rezilta yo

    if (matches.length === 0) {
        resultsDiv.innerHTML = '<div style="padding:15px; text-align:center; color:#666; font-size:13px;">Okenn pwodwi yo pa jwenn 🧐</div>';
    } else {
        resultsDiv.innerHTML = matches.map(p => `
            <a href="${p.url}" style="display:flex; align-items:center; gap:12px; padding:10px; text-decoration:none; border-bottom:1px solid #f8fafc;">
                <img src="${p.image}" style="width:45px; height:45px; object-fit:cover; border-radius:8px;">
                <div style="flex:1;">
                    <div style="font-weight:700; color:#0f172a; font-size:13px; line-height:1.2;">${p.title}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                        <span style="color:#ff4747; font-weight:900; font-size:12px;">${p.price} HTG</span>
                        <span style="font-size:10px; color:#94a3b8; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${p.category || 'Piyay'}</span>
                    </div>
                </div>
            </a>
        `).join('');
    }
    resultsDiv.style.display = 'block';
};

// Fermer les résultats si on clique ailleurs
document.addEventListener('click', (e) => {
    const res = document.getElementById('search-results');
    const input = document.getElementById('search-input');
    if (res && !res.contains(e.target) && e.target !== input) {
        res.style.display = 'none';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    initSearch();
    if(!window.html2canvas) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        document.head.appendChild(script);
    }
});

window.orderProduct=orderProduct; window.openOrderModal=openOrderModal; window.closeOrderModal=closeOrderModal; window.openCart=openCart; window.submitOrder=submitOrder; window.removeFromCart=removeFromCart; window.chgQty=chgQty; window.downloadReceipt=() => {};
