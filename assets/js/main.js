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
    console.log("Referral code saved:", refCode);
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

// Nou ajoute seller_id nan fonksyon sa a
function orderProduct(title, price, id, image, seller_id = null) {
    const existing = cartItems.find(i => i.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cartItems.push({
            id,
            title,
            price: parseFloat(price),
            quantity: 1,
            image: image || '/assets/images/logo.png',
            seller_id: seller_id // Trè enpòtan pou komisyon
        });
    }
    saveCart();
    updateCartUI();

    const btn = event?.target?.closest('button');
    if (btn) {
        const oldHTML = btn.innerHTML;
        btn.innerHTML = "✅ Ajoute!";
        btn.disabled = true;
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
        summary.innerHTML = `<div style="text-align:center; padding:50px 20px;"><div style="font-size:52px; margin-bottom:14px;">🛍️</div><div style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:6px;">Panye w la vid</div></div>`;
        if (footer) footer.style.display = 'none'; return;
    }
    if (footer) footer.style.display = 'block';
    let rows = ''; let total = 0;
    cartItems.forEach((item, i) => {
        const sub = item.price * item.quantity; total += sub;
        rows += `<tr><td style="padding:8px; width:52px;"><img src="${item.image}" style="width:48px; height:48px; object-fit:cover; border-radius:10px;"></td><td style="font-size:12px; font-weight:700; color:#0f172a;">${item.title}</td><td style="text-align:center;">${item.quantity}</td><td style="text-align:right; font-weight:900;">${sub} HTG</td></tr>`;
    });
    summary.innerHTML = `<table style="width:100%; border-collapse:collapse;"><tbody>${rows}</tbody><tfoot><tr><td colspan="3" style="padding:14px 8px; font-weight:800;">TOTAL:</td><td style="text-align:right; padding:14px 8px; font-size:20px; font-weight:900; color:#ff4747;">${total} HTG</td></tr></tfoot></table>`;
}

// Lojik soumèt kòmand nan checkout
async function submitOrder() {
    // Si nou nan paj checkout, nou pran enfòmasyon yo
    const name    = document.getElementById('customerName')?.value || document.getElementById('customer-name')?.value;
    const phone   = document.getElementById('customerPhone')?.value || document.getElementById('customer-phone')?.value;
    const zone    = document.getElementById('customerCity')?.value || document.getElementById('delivery-zone')?.value;
    const payment = document.querySelector('input[name="payment_method"]:checked')?.value || "cash";

    if (!name || !phone) return showToastMain("⚠️ Ranpli non ak telefòn", "error");

    const orderId = "BP-" + Date.now();

    try {
        if (supabaseMain) {
            for (const item of cartItems) {
                const itemTotal = item.price * item.quantity;
                const systemFee = itemTotal * 0.03; // 3% Komisyon Sit la
                const refCode = localStorage.getItem('ref_code');
                const affiliateFee = refCode ? (itemTotal * 0.05) : 0; // 5% Komisyon Afilye
                const sellerNet = itemTotal - systemFee - affiliateFee;

                await supabaseMain.from('orders').insert([{
                    order_group_id: orderId,
                    seller_id: item.seller_id,
                    customer_name: name,
                    customer_phone: phone,
                    delivery_zone: zone,
                    product_title: item.title,
                    amount: itemTotal,
                    system_commission: systemFee,
                    affiliate_commission: affiliateFee,
                    seller_amount: sellerNet,
                    payment_method: payment,
                    status: 'pending',
                    ref_code: refCode
                }]);
            }
        }

        // Redireksyon apre anrejistreman
        if (payment === 'moncash_api') {
            // Lojik MonCash la ap jere nan checkout.html
            return { success: true, orderId: orderId };
        } else {
            showToastMain("🎉 Kòmand anrejistre!");
            localStorage.removeItem(CART_STORAGE_KEY);
            setTimeout(() => window.location.href = "/merci.html?orderId=" + orderId, 2000);
        }
    } catch (err) {
        console.error(err);
        showToastMain("❌ Erè: " + err.message, "error");
    }
}

document.addEventListener('DOMContentLoaded', () => { updateCartUI(); });
window.orderProduct = orderProduct; window.submitOrder = submitOrder; window.openCart = openCart; window.showToastMain = showToastMain;
