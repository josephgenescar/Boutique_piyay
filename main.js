// ============================================================
//  BOUTIQUE PIYAY — main.js
// ============================================================

const CART_STORAGE_KEY = 'boutique_piyay_cart';
let cartItems = [];
try { cartItems = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || []; } catch(e) { cartItems = []; }

// ── SUPABASE ──
const SUP_URL = "https://letyferfjpxmstohvgcj.supabase.co";
const SUP_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldHlmZXJmanB4bXN0b2h2Z2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjcwMDIsImV4cCI6MjA4OTgwMzAwMn0.Y5BVX8ewoEyiVfyy5AZRNXdn-phbhBWqwfYuWmSBjKg";

// ✅ FIX: itilize window.supabase pou evite "supabase is not defined"
const supabaseMain = (typeof window !== 'undefined' && window.supabase)
  ? window.supabase.createClient(SUP_URL, SUP_KEY)
  : null;

// ── AFILIASYON ──
let currentAffiliateId = null;
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');

if (refCode && supabaseMain) {
    supabaseMain
        .from('affiliates')
        .select('user_id')
        .eq('referral_code', refCode)
        .single()
        .then(({ data }) => { if (data) currentAffiliateId = data.user_id; });
}

// ============================================================
//  PANYE
// ============================================================

function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
}

function updateCartUI() {
    const total = cartItems.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

function orderProduct(title, price, id, image) {
    const existing = cartItems.find(i => i.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cartItems.push({
            id,
            title,
            price: parseFloat(price),
            quantity: 1,
            image: image || '/assets/images/logo.png'
        });
    }
    saveCart();
    updateCartUI();

    // Feedback vizèl sou bouton
    const btn = event?.target?.closest('button');
    if (btn) {
        const oldHTML = btn.innerHTML;
        btn.innerHTML = "✅ Ajoute!";
        btn.disabled = true;
        setTimeout(() => { btn.innerHTML = oldHTML; btn.disabled = false; }, 1500);
    }

    // Ouvri panye otomatikman si modal disponib
    const modal = document.getElementById('order-modal');
    if (modal) { modal.style.display = 'flex'; renderCart(); }
}

function removeFromCart(index) {
    cartItems.splice(index, 1);
    saveCart(); updateCartUI(); renderCart();
}

function chgQty(index, val) {
    cartItems[index].quantity = Math.max(1, cartItems[index].quantity + val);
    saveCart(); updateCartUI(); renderCart();
}

function openOrderModal() {
    const m = document.getElementById('order-modal');
    if (m) { m.style.display = 'flex'; renderCart(); }
}

function closeOrderModal() {
    const m = document.getElementById('order-modal');
    if (m) m.style.display = 'none';
}

function openCart() { openOrderModal(); }

function renderCart() {
    const summary = document.getElementById('order-summary');
    const footer  = document.getElementById('order-form-container');
    if (!summary) return;

    if (cartItems.length === 0) {
        summary.innerHTML = `
            <div style="text-align:center; padding:50px 20px;">
                <div style="font-size:52px; margin-bottom:14px;">🛍️</div>
                <div style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:6px;">Panye w la vid</div>
                <div style="font-size:13px; color:#64748b;">Ajoute pwodwi pou kòmanse</div>
            </div>`;
        if (footer) footer.style.display = 'none';
        return;
    }

    if (footer) footer.style.display = 'block';

    let rows = '';
    let total = 0;

    cartItems.forEach((item, i) => {
        const sub = item.price * item.quantity;
        total += sub;
        rows += `
            <tr>
                <td style="padding:8px; width:52px;">
                    <img src="${item.image}" style="width:48px; height:48px; object-fit:cover; border-radius:10px;">
                </td>
                <td style="font-size:12px; font-weight:700; color:#0f172a;">${item.title}</td>
                <td style="text-align:center;">
                    <div style="display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; border-radius:8px; padding:3px 6px;">
                        <button onclick="chgQty(${i}, -1)" style="border:none; background:none; font-size:14px; font-weight:900; cursor:pointer; color:#64748b; line-height:1;">−</button>
                        <span style="font-size:13px; font-weight:900; min-width:18px; text-align:center;">${item.quantity}</span>
                        <button onclick="chgQty(${i}, 1)"  style="border:none; background:none; font-size:14px; font-weight:900; cursor:pointer; color:#64748b; line-height:1;">+</button>
                    </div>
                </td>
                <td style="text-align:right; font-weight:900; font-size:13px; color:#ff4747;">${sub} HTG</td>
                <td style="text-align:center;">
                    <button onclick="removeFromCart(${i})" style="border:none; background:#fee2e2; color:#ef4444; border-radius:8px; width:28px; height:28px; cursor:pointer; font-size:14px; font-weight:900;">✕</button>
                </td>
            </tr>`;
    });

    summary.innerHTML = `
        <table style="width:100%; border-collapse:collapse;">
            <thead>
                <tr style="border-bottom:2px solid #f1f5f9;">
                    <th style="padding:10px 8px; font-size:10px; color:#64748b; text-align:left;">IMG</th>
                    <th style="font-size:10px; color:#64748b; text-align:left;">PWODWI</th>
                    <th style="font-size:10px; color:#64748b; text-align:center;">KTE</th>
                    <th style="font-size:10px; color:#64748b; text-align:right;">TOTAL</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
                <tr style="border-top:2px solid #f1f5f9;">
                    <td colspan="3" style="padding:14px 8px; font-size:13px; font-weight:800; color:#0f172a;">TOTAL FINAL:</td>
                    <td colspan="2" style="text-align:right; padding:14px 8px; font-size:20px; font-weight:900; color:#ff4747;">${total} HTG</td>
                </tr>
            </tfoot>
        </table>`;
}

// ============================================================
//  SOUMÈT KÒMAND
// ============================================================

async function submitOrder() {
    const name    = document.getElementById('customer-name')?.value.trim();
    const phone   = document.getElementById('customer-phone')?.value.trim();
    const zone    = document.getElementById('delivery-zone')?.value;
    const payment = document.getElementById('payment-method')?.value;

    if (!name || !phone || !zone || !payment) {
        return showToastMain("⚠️ Tanpri ranpli tout chan yo!", "error");
    }

    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = "⏳ Preparasyon Resi..."; }

    try {
        const orderId = "BP-" + Math.floor(1000 + Math.random() * 9000);
        const merchantOrders = {};
        let grandTotal = 0;

        for (const item of cartItems) {
            let whatsappTo = "50948868964";
            let sellerName = "Boutique Piyay";
            let sellerId   = null;

            // Chèche info machann si se yon pwodwi Supabase
            if (item.id && item.id.length > 20 && supabaseMain) {
                const { data: prod } = await supabaseMain
                    .from('user_products')
                    .select('seller_id, profiles(full_name, whatsapp)')
                    .eq('id', item.id)
                    .single();

                if (prod?.profiles) {
                    sellerId   = prod.seller_id;
                    sellerName = prod.profiles.full_name || sellerName;
                    if (prod.profiles.whatsapp) {
                        whatsappTo = prod.profiles.whatsapp.replace(/[^0-9]/g, '');
                    }
                }
            }

            if (!merchantOrders[whatsappTo]) {
                merchantOrders[whatsappTo] = { name: sellerName, items: [] };
            }
            merchantOrders[whatsappTo].items.push(item);

            const itemTotal    = item.price * item.quantity;
            grandTotal        += itemTotal;
            const systemFee    = itemTotal * 0.03;
            const affiliateFee = currentAffiliateId ? itemTotal * 0.05 : 0;
            const sellerNet    = itemTotal - systemFee - affiliateFee;

            // Sove nan Supabase
            if (supabaseMain) {
                await supabaseMain.from('orders').insert([{
                    seller_id:             sellerId,
                    customer_name:         name,
                    customer_phone:        phone,
                    delivery_zone:         zone,
                    amount:                itemTotal,
                    total_price:           itemTotal,
                    payment_method:        payment,
                    ref_code:              refCode || null,
                    status:                'pending'
                }]);
            }
        }

        showReceiptView(orderId, name, phone, zone, payment, merchantOrders, grandTotal);
        cartItems = [];
        saveCart();
        updateCartUI();

    } catch (err) {
        console.error(err);
        showToastMain("❌ Erè: " + err.message, "error");
        if (btn) { btn.disabled = false; btn.innerHTML = "Konfime Kòmand ✅"; }
    }
}

function showReceiptView(orderId, name, phone, zone, payment, orders, grandTotal) {
    const summary = document.getElementById('order-summary');
    const footer  = document.getElementById('order-form-container');
    if (!summary) return;
    if (footer) footer.style.display = 'none';

    let rows = '';
    for (const data of Object.values(orders)) {
        data.items.forEach(it => {
            rows += `
                <tr>
                    <td style="padding:8px;">${it.title}</td>
                    <td style="text-align:center;">${it.quantity}</td>
                    <td style="text-align:right; font-weight:800;">${it.price * it.quantity} HTG</td>
                </tr>`;
        });
    }

    const waButtons = Object.entries(orders).map(([wa, data]) => {
        const msg = `*🧾 RESI ACHTE — BOUTIQUE PIYAY*\n*ID:* ${orderId}\n👤 *Kliyan:* ${name}\n📞 *Telefòn:* ${phone}\n📍 *Zòn:* ${zone}\n💳 *Peman:* ${payment}\n💰 *TOTAL: ${grandTotal} HTG*\n\nMèsi pou kòmand ou! 🙏`;
        return `<a href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank"
                   style="display:flex; align-items:center; justify-content:center; gap:8px;
                          background:#25D366; color:white; padding:14px; border-radius:14px;
                          text-decoration:none; font-weight:800; font-size:14px;">
                    💬 Voye bay ${data.name}
                </a>`;
    }).join('');

    summary.innerHTML = `
        <div style="text-align:center; margin-bottom:20px;">
            <div style="font-size:44px; margin-bottom:10px;">🎉</div>
            <div style="font-size:18px; font-weight:900; color:#0f172a;">Kòmand Konfime!</div>
            <div style="font-size:12px; color:#64748b; margin-top:4px;">ID: ${orderId} • ${new Date().toLocaleDateString('fr-HT')}</div>
        </div>

        <div id="receipt-to-download" style="background:#f8fafc; border-radius:16px; padding:18px; margin-bottom:20px;">
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <th style="padding:8px; text-align:left; font-size:11px; color:#64748b;">PWODWI</th>
                        <th style="font-size:11px; color:#64748b; text-align:center;">KTE</th>
                        <th style="font-size:11px; color:#64748b; text-align:right;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr style="border-top:2px solid #e2e8f0;">
                        <td colspan="2" style="padding:10px 8px; font-weight:800;">TOTAL FINAL</td>
                        <td style="text-align:right; font-weight:900; font-size:16px; color:#ff4747;">${grandTotal} HTG</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px;">
            ${waButtons}
        </div>

        <button onclick="closeOrderModal(); location.reload();"
                style="background:none; border:1px solid #e2e8f0; color:#64748b; cursor:pointer;
                       font-size:13px; font-weight:700; width:100%; margin-top:14px;
                       padding:12px; border-radius:12px;">
            ← Fè yon lòt kòmand
        </button>`;
}

// ============================================================
//  RECHÈCH (SEARCH)
// ============================================================

let staticSearchData = [];

async function initSearch() {
    try {
        const resp = await fetch('/search.json');
        if (resp.ok) staticSearchData = await resp.json();
    } catch(e) { staticSearchData = []; }
}

window.liveSearch = async function() {
    const input      = document.getElementById('search-input');
    const resultsDiv = document.getElementById('search-results');
    if (!input || !resultsDiv) return;

    const query = input.value.toLowerCase().trim();
    if (query.length < 2) { resultsDiv.style.display = 'none'; return; }

    // Chèche nan JSON statik la
    let matches = staticSearchData.filter(p =>
        p.title.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query))
    );

    // Chèche nan Supabase tou
    if (supabaseMain) {
        const { data: dbMatches } = await supabaseMain
            .from('user_products')
            .select('id, title, price, image_url, category')
            .ilike('title', `%${query}%`)
            .limit(5);

        if (dbMatches) {
            dbMatches.forEach(dm => {
                if (!matches.find(m => m.url && m.url.includes(dm.id))) {
                    matches.push({
                        title:    dm.title,
                        url:      `/pwodwi-machann.html?id=${dm.id}`,
                        price:    dm.price,
                        image:    dm.image_url,
                        category: dm.category
                    });
                }
            });
        }
    }

    if (matches.length === 0) {
        resultsDiv.innerHTML = `<div style="padding:20px; text-align:center; color:#64748b; font-size:13px;">😔 Okenn rezilta pou "<b>${query}</b>"</div>`;
        resultsDiv.style.display = 'block';
        return;
    }

    resultsDiv.innerHTML = matches.slice(0, 8).map(p => `
        <a href="${p.url}" style="display:flex; align-items:center; gap:12px; padding:10px 14px;
                                  text-decoration:none; border-bottom:1px solid #f8fafc; transition:0.15s;"
           onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='none'">
            <img src="${p.image || '/assets/images/logo.png'}"
                 style="width:42px; height:42px; object-fit:cover; border-radius:10px; background:#f1f5f9;"
                 onerror="this.src='/assets/images/logo.png'">
            <div style="flex:1; min-width:0;">
                <div style="font-weight:700; color:#0f172a; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.title}</div>
                <div style="color:#ff4747; font-weight:900; font-size:12px;">${p.price} HTG</div>
            </div>
        </a>`).join('');

    resultsDiv.style.display = 'block';
};

// Fèmen rezilta rechèch si klike deyò
document.addEventListener('click', function(e) {
    const box = document.getElementById('search-results');
    const inp = document.getElementById('search-input');
    if (box && inp && !box.contains(e.target) && !inp.contains(e.target)) {
        box.style.display = 'none';
    }
});

// ============================================================
//  TOAST NOTIFIKASYON
// ============================================================

function showToastMain(msg, type = 'success') {
    let t = document.getElementById('main-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'main-toast';
        t.style.cssText = `
            position: fixed; bottom: 24px; left: 50%;
            transform: translateX(-50%) translateY(100px);
            padding: 13px 24px; border-radius: 50px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13px; font-weight: 700;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            transition: all 0.35s; z-index: 99999;
            white-space: nowrap; opacity: 0;
        `;
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = type === 'error' ? '#ff4747' : '#10b981';
    t.style.color = 'white';
    t.style.transform = 'translateX(-50%) translateY(0)';
    t.style.opacity = '1';
    setTimeout(() => {
        t.style.transform = 'translateX(-50%) translateY(100px)';
        t.style.opacity = '0';
    }, 3000);
}

// ============================================================
//  INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    initSearch();
});

// Ekspoze fonksyon yo globalman
window.orderProduct    = orderProduct;
window.openOrderModal  = openOrderModal;
window.closeOrderModal = closeOrderModal;
window.openCart        = openCart;
window.submitOrder     = submitOrder;
window.removeFromCart  = removeFromCart;
window.chgQty          = chgQty;
window.showToastMain   = showToastMain;