// ============================================================
//  HEADER AUTHENTICATION - header-auth.js
//  Jere afichaj lyen otantifikasyon nan header la
// ============================================================

(() => {
  const SUP_URL_HEADER = "https://letyferfjpxmstohvgcj.supabase.co";
  const SUP_KEY_HEADER = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxldHlmZXJmanB4bXN0b2h2Z2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjcwMDIsImV4cCI6MjA4OTgwMzAwMn0.Y5BVX8ewoEyiVfyy5AZRNXdn-phbhBWqwfYuWmSBjKg";

  window.supabaseAuth = window.supabase.createClient(SUP_URL_HEADER, SUP_KEY_HEADER);
})();

const supabaseAuth = window.supabaseAuth;

// Fonksyon pou verifie etat koneksyon an epi mete ajou header la
async function updateHeaderAuth() {
    const authLinks = document.getElementById('authLinks');
    const userInfo = document.getElementById('userInfo');
    const btnCustomerAccount = document.getElementById('btn-customer-account');
    const btnMerchantDash = document.getElementById('btn-merchant-dash');
    const navSellLink = document.getElementById('nav-sell-link');

    if (!authLinks || !userInfo) return;

    try {
        const { data: { session } } = await supabaseAuth.auth.getSession();

        if (session) {
            // Itilizatè konekte
            const { data: profile } = await supabaseAuth
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            // Kache lyen login/signup
            authLinks.style.display = 'none';

            // Montre userInfo
            userInfo.style.display = 'flex';

            // Si se yon kliyan, montre bouton kont kliyan an
            if (profile && profile.role === 'client') {
                btnCustomerAccount.style.display = 'flex';
                btnMerchantDash.style.display = 'none';
                navSellLink.style.display = 'none';
            }
            // Si se yon vandè, montre bouton dashboard la epi lyen "Vann pa w"
            else if (profile && profile.role === 'seller') {
                btnCustomerAccount.style.display = 'none';
                btnMerchantDash.style.display = 'flex';
                navSellLink.style.display = 'inline-block';
            }
            // Si pa gen profile ou wòl pa defini, montre sèlman bouton kont kliyan an
            else {
                btnCustomerAccount.style.display = 'flex';
                btnMerchantDash.style.display = 'none';
                navSellLink.style.display = 'none';
            }
        } else {
            // Itilizatè pa konekte
            authLinks.style.display = 'flex';
            userInfo.style.display = 'none';
            navSellLink.style.display = 'none';
        }
    } catch (error) {
        console.error('Erè nan verifikasyon otantifikasyon:', error);
        // Nan ka erè, montre lyen login/signup pa defo
        authLinks.style.display = 'flex';
        userInfo.style.display = 'none';
        navSellLink.style.display = 'none';
        const menuSellLink = document.getElementById('menu-sell-link');
        if (menuSellLink) menuSellLink.style.display = 'none';
    }
}

// Fonksyon pou dekonekte
async function handleHeaderLogout() {
    try {
        await supabaseAuth.auth.signOut();
        // Rafrechi paj la
        window.location.reload();
    } catch (error) {
        console.error('Erè nan dekoneksyon:', error);
        alert('Erè nan dekoneksyon. Tanpri eseye ankò.');
    }
}

// Ekspoze fonksyon yo globalman
window.handleHeaderLogout = handleHeaderLogout;

// Mete ajou header la lè paj la chaje
document.addEventListener('DOMContentLoaded', () => {
    updateHeaderAuth();
});

// Ekoute chanjman nan etat otantifikasyon an
supabaseAuth.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        updateHeaderAuth();
    }
});
