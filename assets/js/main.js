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
function formatCurrency(value) {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + ' HTG';
}

function saveCart() { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems)); }
function updateCartUI() {
    const total = cartItems.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.innerText = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
        badge.setAttribute('aria-label', `${total} produit${total > 1 ? 's' : ''} dans le panier`);
    }
}

function orderProduct(title, price, id, image, seller_id = null, sellerPhone = null, sellerName = null) {
    const existing = cartItems.find(i => i.id === id);
    if (existing) { existing.quantity++; } else {
        cartItems.push({ id, title, price: parseFloat(price), quantity: 1, image: image || '/assets/images/logo.png', sellerId: seller_id, sellerPhone: sellerPhone || null, sellerName: sellerName || null });
    }
    saveCart(); updateCartUI();
    const btn = event?.target?.closest('button');
    if (btn) {
        const oldHTML = btn.innerHTML; btn.innerHTML = "✅ Ajoute"; btn.disabled = true;
        setTimeout(() => { btn.innerHTML = oldHTML; btn.disabled = false; }, 1500);
    }
    const modal = document.getElementById('order-modal');
    if (modal) { modal.style.display = 'flex'; renderCart(); }
}

function removeFromCart(index) { cartItems.splice(index, 1); saveCart(); updateCartUI(); renderCart(); }
function chgQty(index, val) { cartItems[index].quantity = Math.max(1, cartItems[index].quantity + val); saveCart(); updateCartUI(); renderCart(); }
function clearCart() { cartItems = []; saveCart(); updateCartUI(); renderCart(); }
function openOrderModal() { const m = document.getElementById('order-modal'); if (m) { m.style.display = 'flex'; renderCart(); } }
function closeOrderModal() { const m = document.getElementById('order-modal'); if (m) m.style.display = 'none'; }
function openCart() { openOrderModal(); }

function renderCart() {
    const summary = document.getElementById('order-summary');
    const footer  = document.getElementById('order-form-container');
    if (!summary) return;

    if (cartItems.length === 0) {
        summary.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:40px 20px; background:#fffaf5; border:1px solid #ffe2cf; border-radius:24px;">
                <div style="font-size:56px; margin-bottom:12px;">🛍️</div>
                <div style="font-size:20px; font-weight:900; color:#111827; margin-bottom:8px;">Panier w la vid</div>
                <div style="color:#64748b; font-size:14px; line-height:1.5; max-width:320px;">Ajoute kèk pwodwi pou wè yo isit epi kontinye avèk la komande.</div>
                <a href="/shop/" style="margin-top:16px; display:inline-flex; align-items:center; justify-content:center; padding:12px 16px; border-radius:999px; background:#ff4747; color:white; text-decoration:none; font-weight:800;">🛒 Kontinye achte</a>
            </div>
        `;
        if (footer) footer.style.display = 'none';
        return;
    }

    if (footer) footer.style.display = 'block';

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const itemsHtml = cartItems.map((item, index) => {
        const lineTotal = item.price * item.quantity;
        return `
            <div style="display:grid; grid-template-columns:72px 1fr auto; gap:12px; align-items:center; padding:14px 12px; border-radius:18px; border:1px solid #e5e7eb; background:#fff; box-shadow:0 2px 10px rgba(15,23,42,0.05); margin-bottom:12px;">
                <img src="${item.image || '/assets/images/logo.png'}" alt="${item.title}" style="width:72px; height:72px; object-fit:cover; border-radius:14px; background:#f8fafc;" onerror="this.src='/assets/images/logo.png'">
                <div style="min-width:0;">
                    <div style="font-size:14px; font-weight:800; color:#111827; margin-bottom:4px;">${item.title}</div>
                    <div style="font-size:12px; color:#64748b; margin-bottom:8px;">${formatCurrency(item.price)} chak</div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button type="button" onclick="chgQty(${index}, -1)" style="border:none; border-radius:999px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; color:#1e293b; cursor:pointer; font-weight:900;">−</button>
                        <span style="min-width:22px; text-align:center; font-weight:800; color:#111827;">${item.quantity}</span>
                        <button type="button" onclick="chgQty(${index}, 1)" style="border:none; border-radius:999px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:#ff4747; color:white; cursor:pointer; font-weight:900;">+</button>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:10px;">
                    <div style="font-size:15px; font-weight:900; color:#ff4747;">${formatCurrency(lineTotal)}</div>
                    <button type="button" onclick="removeFromCart(${index})" style="border:none; border-radius:999px; padding:6px 10px; background:#fee2e2; color:#b91c1c; font-size:11px; font-weight:800; cursor:pointer;">Retire</button>
                </div>
            </div>
        `;
    }).join('');

    summary.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-radius:18px; background:#fff7ed; border:1px solid #fed7aa;">
                <div>
                    <div style="font-size:13px; color:#9a3412; font-weight:800; text-transform:uppercase; letter-spacing:0.08em;">Resume</div>
                    <div style="font-size:16px; font-weight:900; color:#111827; margin-top:4px;">${totalItems} artik</div>
                </div>
                <div style="font-size:18px; font-weight:900; color:#ff4747;">${formatCurrency(totalValue)}</div>
            </div>
            <div>${itemsHtml}</div>
            <div style="display:grid; grid-template-columns:1fr auto; gap:12px; align-items:center; padding:14px 16px; border-radius:20px; background:#111827; color:white;">
                <div>
                    <div style="font-size:12px; color:rgba(255,255,255,0.75); text-transform:uppercase; letter-spacing:0.08em;">Total a peye</div>
                    <div style="font-size:24px; font-weight:900; margin-top:4px;">${formatCurrency(totalValue)}</div>
                </div>
                <button type="button" onclick="clearCart()" style="border:none; border-radius:999px; padding:10px 12px; background:#fff; color:#111827; font-size:11px; font-weight:900; cursor:pointer;">🗑️ Vide panier</button>
            </div>
            <div style="padding:12px 14px; border-radius:16px; background:#f8fafc; color:#64748b; font-size:12px; line-height:1.5; border:1px solid #e2e8f0;">
                💡 Konsèy: verifye <strong>nòm</strong>, <strong>nimewo WhatsApp</strong>, ak <strong>zon livrezon</strong> anvan ou valide l.
            </div>
        </div>
    `;
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
    let matches = staticSearchData.filter(p => {
        const titleMatch = p.title && p.title.toLowerCase().includes(query);
        const categoryValue = Array.isArray(p.category) ? p.category.join(' ') : (p.category || '');
        const categoryMatch = categoryValue.toLowerCase().includes(query);
        const descMatch = p.desc && p.desc.toLowerCase().includes(query);
        return titleMatch || categoryMatch || descMatch;
    });

    // Matches from Supabase
    if (window.supabaseMain) {
        try {
            const fields = ['title', 'category', 'description'];
            for (const field of fields) {
                const { data: dbMatches } = await window.supabaseMain
                    .from('user_products')
                    .select('id, title, price, image_url, category')
                    .ilike(field, `%${query}%`)
                    .limit(5);

                if (!dbMatches) continue;
                dbMatches.forEach(dm => {
                    if (!matches.find(m => m.url && m.url.includes(dm.id))) {
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
        } catch(err) { console.error("Supabase Search Error:", err); }
    }

    if (matches.length === 0) {
        resultsDiv.innerHTML = `<div style="padding:15px; text-align:center; color:#64748b; font-size:13px;">😔 Okenn rezilta</div>`;
    } else {
        resultsDiv.innerHTML = matches.slice(0, 8).map(p => {
            const categoryValue = Array.isArray(p.category) ? p.category.join(', ') : (p.category || '');
            return `
            <a href="${p.url}" style="display:flex; align-items:center; gap:10px; padding:10px; text-decoration:none; border-bottom:1px solid #f1f5f9;">
                <img src="${p.image || '/assets/images/logo.png'}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
                <div style="flex:1;">
                    <div style="font-weight:700; color:#111; font-size:13px;">${p.title}</div>
                    ${categoryValue ? `<div style="color:#64748b; font-size:12px; margin-top:2px;">Catégorie: ${categoryValue}</div>` : ''}
                    <div style="color:#ff4747; font-weight:800; font-size:12px; margin-top:4px;">${p.price} HTG</div>
                </div>
            </a>
        `;
        }).join('');
    }
    resultsDiv.style.display = 'block';
};

function initHeaderAutoHide() {
    const header = document.querySelector('.main-header');
    if (!header) return;
    let lastScrollY = window.scrollY;
    let isHidden = false;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY < 60) {
            header.classList.remove('header-hidden');
            isHidden = false;
        } else if (currentScrollY > lastScrollY + 5) {
            if (!isHidden) {
                header.classList.add('header-hidden');
                isHidden = true;
            }
        } else if (currentScrollY < lastScrollY - 5) {
            if (isHidden) {
                header.classList.remove('header-hidden');
                isHidden = false;
            }
        }
        lastScrollY = currentScrollY;
    }, { passive: true });
}

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
    initHeaderAutoHide();
});

// EXPOSE FUNCTIONS
window.openCart = openCart;
window.closeOrderModal = closeOrderModal;
