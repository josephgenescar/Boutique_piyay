// ============================================================
//  BOUTIQUE PIYAY — main.js
// ============================================================

const CART_STORAGE_KEY = 'boutique_piyay_cart';
let cartItems = [];
try { cartItems = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || []; } catch(e) { cartItems = []; }

// ── SUPABASE ──
const SUP_URL = "https://letyferfjpxmstohvgcj.supabase.co";
const SUP_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldHlmZXJmanB4bXN0b2h2Z2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjcwMDIsImV4cCI6MjA4OTgwMzAwMn0.Y5BVX8ewoEyiVfyy5AZRNXdn-phbhBWqwfYuWmSBjKg";

window.supabaseMain = (typeof window !== 'undefined' && window.supabase)
  ? window.supabase.createClient(SUP_URL, SUP_KEY)
  : null;

const supabaseMain = window.supabaseMain;

// ── AFILIASYON ──
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode) {
    localStorage.setItem('ref_code', refCode);
}

// ============================================================
//  PANYE
// ============================================================
function saveCart() { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems)); }
function updateCartUI() {
    const total = cartItems.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) { badge.innerText = total; badge.style.display = total > 0 ? 'flex' : 'none'; }
}

function orderProduct(title, price, id, image, seller_id = null) {
    const existing = cartItems.find(i => i.id === id);
    if (existing) { existing.quantity++; } else {
        cartItems.push({ id, title, price: parseFloat(price), quantity: 1, image: image || '/assets/images/logo.png', seller_id: seller_id });
    }
    saveCart(); updateCartUI();
    const btn = event?.target?.closest('button');
    if (btn) {
        const oldHTML = btn.innerHTML; btn.innerHTML = "✅ Ajoute!"; btn.disabled = true;
        setTimeout(() => { btn.innerHTML = oldHTML; btn.disabled = false; }, 1500);
    }
    const modal = document.getElementById('order-modal');
    if (modal) { modal.style.display = 'flex'; renderCart(); }
}

function removeFromCart(index) { cartItems.splice(index, 1); saveCart(); updateCartUI(); renderCart(); }
function chgQty(index, val) { cartItems[index].quantity = Math.max(1, cartItems[index].quantity + val); saveCart(); updateCartUI(); renderCart(); }
function openOrderModal() { const m = document.getElementById('order-modal'); if (m) { m.style.display = 'flex'; renderCart(); } }
function closeOrderModal() { const m = document.getElementById('order-modal'); if (m) m.style.display = 'none'; }
function openCart() { openOrderModal(); }

function renderCart() {
    const summary = document.getElementById('order-summary');
    const footer  = document.getElementById('order-form-container');
    if (!summary) return;
    if (cartItems.length === 0) {
        summary.innerHTML = `<div style="text-align:center; padding:50px 20px;"><div style="font-size:52px;">🛍️</div><div style="font-weight:800;">Panye w la vid</div></div>`;
        if (footer) footer.style.display = 'none'; return;
    }
    if (footer) footer.style.display = 'block';
    let rows = ''; let total = 0;
    cartItems.forEach((item, i) => {
        const sub = item.price * item.quantity; total += sub;
        rows += `<tr><td style="padding:8px;"><img src="${item.image}" style="width:40px; height:40px; border-radius:8px;"></td><td>${item.title}</td><td style="text-align:center;">${item.quantity}</td><td style="text-align:right;">${sub} HTG</td></tr>`;
    });
    summary.innerHTML = `<table style="width:100%;"><tbody>${rows}</tbody><tfoot><tr><td colspan="3">TOTAL:</td><td style="text-align:right; font-weight:900; color:#ff4747;">${total} HTG</td></tr></tfoot></table>`;
}

// ============================================================
//  RECHÈCH (LIVE SEARCH)
// ============================================================
let staticSearchData = [];

async function initSearch() {
    try {
        const resp = await fetch('/search.json');
        if (resp.ok) staticSearchData = await resp.json();
    } catch(e) { console.error("Search Data Load Error:", e); }
}

// ✅ DEFINE GLOBAL SEARCH FUNCTION
window.liveSearch = async function() {
    const input = document.getElementById('search-input');
    const resultsDiv = document.getElementById('search-results');
    if (!input || !resultsDiv) return;

    const query = input.value.toLowerCase().trim();
    if (query.length < 2) { resultsDiv.style.display = 'none'; return; }

    // Matches from Static JSON
    let matches = staticSearchData.filter(p => p.title.toLowerCase().includes(query));

    // Matches from Supabase
    if (window.supabaseMain) {
        try {
            const { data: dbMatches } = await window.supabaseMain
                .from('user_products')
                .select('id, title, price, image_url')
                .ilike('title', `%${query}%`)
                .limit(5);

            if (dbMatches) {
                dbMatches.forEach(dm => {
                    if (!matches.find(m => m.url && m.url.includes(dm.id))) {
                        matches.push({
                            title: dm.title,
                            url: `/pwodwi-machann.html?id=${dm.id}`,
                            price: dm.price,
                            image: dm.image_url
                        });
                    }
                });
            }
        } catch(err) { console.error("Supabase Search Error:", err); }
    }

    if (matches.length === 0) {
        resultsDiv.innerHTML = `<div style="padding:15px; text-align:center; color:#64748b; font-size:13px;">😔 Okenn rezilta</div>`;
    } else {
        resultsDiv.innerHTML = matches.slice(0, 8).map(p => `
            <a href="${p.url}" style="display:flex; align-items:center; gap:10px; padding:10px; text-decoration:none; border-bottom:1px solid #f1f5f9;">
                <img src="${p.image || '/assets/images/logo.png'}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
                <div style="flex:1;">
                    <div style="font-weight:700; color:#111; font-size:13px;">${p.title}</div>
                    <div style="color:#ff4747; font-weight:800; font-size:12px;">${p.price} HTG</div>
                </div>
            </a>
        `).join('');
    }
    resultsDiv.style.display = 'block';
};

// Close search on click outside
document.addEventListener('click', (e) => {
    const box = document.getElementById('search-results');
    const inp = document.getElementById('search-input');
    if (box && !box.contains(e.target) && e.target !== inp) box.style.display = 'none';
});

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();
    initSearch();
});

// EXPOSE FUNCTIONS
window.openCart = openCart;
window.closeOrderModal = closeOrderModal;
