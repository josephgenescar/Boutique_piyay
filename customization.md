# 🎨 GUIDE DE PERSONNALISATION - Boutique Piyay

Guide rapid pou customization avèk exemp pratik

---

## 🌈 Changer les Couleurs

### Méthode 1: Variables CSS (Recommandé)

Créez ou modifiez `assets/css/custom.css`:

```css
:root {
  /* Couleurs principales */
  --primary-color: #4facfe;      /* Bleu principal */
  --accent-color: #00f2fe;       /* Accent clair */
  --primary-dark: #2563eb;       /* Bleu foncé */
  
  /* Couleurs secondaires */
  --success-color: #10b981;      /* Vert succès */
  --warning-color: #f59e0b;      /* Orange alerte */
  --danger-color: #ef4444;       /* Rouge erreur */
  --info-color: #3b82f6;         /* Bleu info */
  
  /* Couleurs neutres */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-500: #6b7280;
  --gray-900: #111827;
  
  /* Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-dark: #1f2937;
}
```

### Exemples de Thèmes Prédéfinis

**Thème Vert/Nature:**
```css
:root {
  --primary-color: #10b981;
  --accent-color: #34d399;
  --primary-dark: #059669;
}
```

**Thème Rouge/Passion:**
```css
:root {
  --primary-color: #ef4444;
  --accent-color: #f87171;
  --primary-dark: #dc2626;
}
```

**Thème Orange/Énergique:**
```css
:root {
  --primary-color: #f97316;
  --accent-color: #fb923c;
  --primary-dark: #ea580c;
}
```

**Thème Violet/Luxe:**
```css
:root {
  --primary-color: #8b5cf6;
  --accent-color: #a78bfa;
  --primary-dark: #7c3aed;
}
```

---

## 🖼️ Personnaliser le Logo

### Option 1: Via Admin
1. Admin → Paramètres → Configuration Générale
2. Logo → Upload votre image
3. Dimensions recommandées: 200x80px (PNG transparent)

### Option 2: Manuellement
Remplacez `/assets/images/logo.png` avec votre logo

Dans le header, modifiez si nécessaire:
```html
<img src="{{ site.data.settings.logo }}" alt="Logo" class="site-logo">

<!-- Ou version SVG pour meilleure qualité -->
<svg class="site-logo">
  <!-- Votre code SVG ici -->
</svg>
```

CSS pour le logo:
```css
.site-logo {
  height: 50px;
  width: auto;
  transition: transform 0.3s;
}

.site-logo:hover {
  transform: scale(1.05);
}
```

---

## 📝 Modifier les Textes

### Slogan/Tagline

**Via Admin:** Paramètres → Description

**Ou dans** `_data/settings.yml`:
```yaml
tagline: "Votre boutique de confiance en Haïti 🇭🇹"
```

**Dans le code:**
```html
<!-- _includes/header.html -->
<p class="tagline">{{ site.data.settings.tagline }}</p>
```

### Messages de Bienvenue

Dans `index.html` ou page d'accueil:
```html
<h1>🛍️ Bienvenue chez Boutique Piyay</h1>
<p>Découvrez nos produits de qualité aux meilleurs prix!</p>
```

Changez selon votre style:
```html
<!-- Style professionnel -->
<h1>Excellence et Qualité depuis 2020</h1>
<p>Votre partenaire shopping de confiance</p>

<!-- Style fun -->
<h1>🎉 Shopping n kè kontan!</h1>
<p>Pwodui kalite, pri imbatab!</p>

<!-- Style moderne -->
<h1>Shop Smart, Shop Piyay</h1>
<p>L'avenir du shopping en Haïti</p>
```

---

## 🎯 Personnaliser les Badges

### Badges Produits

Dans `_layouts/product.html`:

```html
<!-- Badge Vente Flash (rouge) -->
<div class="badge sale-badge">-{{ discount_percent }}%</div>

<!-- Badge Nouveau (vert) -->
<div class="badge new-badge">Nouveau</div>

<!-- Badge Populaire (orange) -->
<div class="badge popular-badge">⭐ Populaire</div>

<!-- Badge Épuisé (gris) -->
<div class="badge sold-out-badge">Épuisé</div>
```

CSS personnalisé:
```css
.badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  position: absolute;
}

.sale-badge {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  top: 10px;
  right: 10px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.new-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  top: 10px;
  left: 10px;
}

.popular-badge {
  background: linear-gradient(135deg, #f97316, #ea580c);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

---

## 🔔 Personnaliser les Notifications

Dans `assets/js/cart.js`, méthode `showNotification()`:

### Style 1: Moderne avec Icon
```javascript
showNotification(message, type = 'success') {
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  };
  
  const notification = document.createElement('div');
  notification.innerHTML = `
    <span style="font-size: 24px; margin-right: 10px;">
      ${icons[type]}
    </span>
    <span>${message}</span>
  `;
  
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: colors[type],
    color: 'white',
    padding: '15px 25px',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    zIndex: '100000',
    animation: 'slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  });
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
```

### Style 2: Toast Bottom
```javascript
// Pour notification en bas
Object.assign(notification.style, {
  bottom: '20px',  // Au lieu de top
  right: '20px',
  // ... reste identique
});
```

### Style 3: Center Modal
```javascript
// Pour modal center
Object.assign(notification.style, {
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  // ... reste
});
```

---

## 🎨 Changer les Fonts

### Méthode 1: Google Fonts

Dans `<head>` de votre layout:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
```

Dans CSS:
```css
:root {
  --font-primary: 'Poppins', sans-serif;
  --font-heading: 'Playfair Display', serif;
}

body {
  font-family: var(--font-primary);
}

h1, h2, h3 {
  font-family: var(--font-heading);
}
```

### Combinaisons Populaires

**Moderne et Clean:**
```css
--font-primary: 'Inter', sans-serif;
--font-heading: 'Inter', sans-serif;
```

**Élégant et Raffiné:**
```css
--font-primary: 'Lato', sans-serif;
--font-heading: 'Playfair Display', serif;
```

**Fun et Dynamique:**
```css
--font-primary: 'Nunito', sans-serif;
--font-heading: 'Montserrat', sans-serif;
```

**Professionnel:**
```css
--font-primary: 'Open Sans', sans-serif;
--font-heading: 'Raleway', sans-serif;
```

---

## 📱 Personnaliser le Footer

Dans `_includes/footer.html`:

### Style 1: Minimaliste
```html
<footer class="footer-minimal">
  <div class="container">
    <p>&copy; 2026 {{ site.data.settings.site_name }}. Tous droits réservés.</p>
    <div class="social-links">
      <a href="{{ site.data.settings.social.facebook }}">📘</a>
      <a href="{{ site.data.settings.social.instagram }}">📸</a>
      <a href="https://wa.me/{{ site.data.settings.whatsapp }}">💬</a>
    </div>
  </div>
</footer>
```

### Style 2: Complet avec Colonnes
```html
<footer class="footer-complete">
  <div class="container">
    <div class="footer-grid">
      <!-- Colonne 1: À propos -->
      <div class="footer-col">
        <h4>{{ site.data.settings.site_name }}</h4>
        <p>{{ site.data.settings.description }}</p>
      </div>
      
      <!-- Colonne 2: Liens rapides -->
      <div class="footer-col">
        <h4>Liens Rapides</h4>
        <ul>
          <li><a href="/shop">Boutique</a></li>
          <li><a href="/about">À propos</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/faq">FAQ</a></li>
        </ul>
      </div>
      
      <!-- Colonne 3: Contact -->
      <div class="footer-col">
        <h4>Contactez-nous</h4>
        <p>📍 {{ site.data.settings.address }}</p>
        <p>📧 {{ site.data.settings.email }}</p>
        <p>📱 {{ site.data.settings.phone1 }}</p>
      </div>
      
      <!-- Colonne 4: Newsletter -->
      <div class="footer-col">
        <h4>Newsletter</h4>
        <form class="newsletter-form">
          <input type="email" placeholder="Votre email">
          <button type="submit">S'inscrire</button>
        </form>
      </div>
    </div>
    
    <div class="footer-bottom">
      <p>&copy; 2026 {{ site.data.settings.site_name }}</p>
      <div class="payment-methods">
        💸 Moncash • 💳 Natcash • 💵 Espèces
      </div>
    </div>
  </div>
</footer>
```

CSS Footer:
```css
.footer-complete {
  background: #1f2937;
  color: white;
  padding: 60px 0 20px;
  margin-top: 80px;
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  margin-bottom: 40px;
}

.footer-col h4 {
  margin-bottom: 20px;
  color: var(--primary-color);
}

.footer-col ul {
  list-style: none;
  padding: 0;
}

.footer-col a {
  color: #d1d5db;
  text-decoration: none;
  display: block;
  margin-bottom: 10px;
  transition: color 0.3s;
}

.footer-col a:hover {
  color: var(--primary-color);
}

.newsletter-form {
  display: flex;
  gap: 10px;
}

.newsletter-form input {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
}

.newsletter-form button {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 30px;
  border-top: 1px solid #374151;
  flex-wrap: wrap;
  gap: 20px;
}
```

---

## 🎁 Ajouter un Système de Points/Fidélité

Dans `assets/js/loyalty.js`:

```javascript
class LoyaltySystem {
  constructor() {
    this.pointsPerHTG = 1; // 1 point par HTG dépensé
    this.init();
  }
  
  init() {
    this.loadPoints();
  }
  
  loadPoints() {
    return parseInt(localStorage.getItem('loyalty_points') || '0');
  }
  
  addPoints(orderTotal) {
    const currentPoints = this.loadPoints();
    const newPoints = Math.floor(orderTotal * this.pointsPerHTG);
    const totalPoints = currentPoints + newPoints;
    
    localStorage.setItem('loyalty_points', totalPoints);
    
    this.showPointsEarned(newPoints, totalPoints);
    this.checkRewards(totalPoints);
  }
  
  checkRewards(points) {
    const rewards = [
      { points: 100, discount: 50, name: 'Bronze' },
      { points: 500, discount: 100, name: 'Argent' },
      { points: 1000, discount: 200, name: 'Or' }
    ];
    
    for (let reward of rewards) {
      if (points >= reward.points) {
        this.unlockReward(reward);
      }
    }
  }
  
  showPointsEarned(earned, total) {
    const notification = `
      🎉 Vous avez gagné ${earned} points!
      💎 Total: ${total} points
    `;
    // Utilisez votre système de notification
  }
}

const loyalty = new LoyaltySystem();
```

Intégrez dans checkout:
```javascript
// Après commande confirmée
loyalty.addPoints(order.total);
```

---

## 🔥 Créer des Ventes Flash Dynamiques

Dans `_includes/flash-sale.html`:

```html
<div class="flash-sale-banner" id="flashSale">
  <div class="container">
    <div class="flash-content">
      <div class="flash-icon">⚡</div>
      <div class="flash-text">
        <h3>VENTE FLASH!</h3>
        <p>Jusqu'à -50% sur une sélection de produits</p>
      </div>
      <div class="flash-timer">
        <div class="timer-block">
          <span id="hours">00</span>
          <label>Heures</label>
        </div>
        <div class="timer-sep">:</div>
        <div class="timer-block">
          <span id="minutes">00</span>
          <label>Minutes</label>
        </div>
        <div class="timer-sep">:</div>
        <div class="timer-block">
          <span id="seconds">00</span>
          <label>Secondes</label>
        </div>
      </div>
      <a href="/flash-sale" class="flash-cta">Voir les offres →</a>
    </div>
  </div>
</div>

<script>
// Définir fin de vente (24h à partir de maintenant)
const saleEnd = new Date();
saleEnd.setHours(saleEnd.getHours() + 24);

function updateTimer() {
  const now = new Date();
  const diff = saleEnd - now;
  
  if (diff <= 0) {
    document.getElementById('flashSale').style.display = 'none';
    return;
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
  document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
  document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
}

setInterval(updateTimer, 1000);
updateTimer();
</script>

<style>
.flash-sale-banner {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  padding: 20px 0;
  animation: flashPulse 2s infinite;
}

.flash-content {
  display: flex;
  align-items: center;
  gap: 30px;
  flex-wrap: wrap;
  justify-content: space-between;
}

.flash-icon {
  font-size: 48px;
  animation: bounce 1s infinite;
}

.flash-timer {
  display: flex;
  gap: 10px;
  align-items: center;
}

.timer-block {
  background: rgba(255,255,255,0.2);
  padding: 10px 15px;
  border-radius: 8px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.timer-block span {
  display: block;
  font-size: 32px;
  font-weight: bold;
  line-height: 1;
}

.timer-block label {
  font-size: 12px;
  opacity: 0.8;
}

.flash-cta {
  background: white;
  color: #ef4444;
  padding: 12px 30px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: bold;
  transition: transform 0.3s;
}

.flash-cta:hover {
  transform: scale(1.05);
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes flashPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.95; }
}
</style>
```

---

## 💬 Chat en Direct Simple

Ajoutez avant `</body>`:

```html
<div id="chatWidget" class="chat-widget">
  <button class="chat-toggle" onclick="toggleChat()">
    💬
    <span class="chat-badge">1</span>
  </button>
  
  <div class="chat-window" id="chatWindow" style="display: none;">
    <div class="chat-header">
      <h4>💬 Support Client</h4>
      <button onclick="toggleChat()">×</button>
    </div>
    
    <div class="chat-body">
      <div class="chat-message bot">
        Bonjour! 👋 Comment puis-je vous aider?
      </div>
    </div>
    
    <div class="chat-footer">
      <button onclick="startWhatsApp()">
        💬 Démarrer sur WhatsApp
      </button>
    </div>
  </div>
</div>

<script>
function toggleChat() {
  const window = document.getElementById('chatWindow');
  window.style.display = window.style.display === 'none' ? 'block' : 'none';
}

function startWhatsApp() {
  const message = "Bonjour! J'ai besoin d'aide.";
  window.open(`https://wa.me/50948868964?text=${encodeURIComponent(message)}`);
}
</script>

<style>
.chat-widget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.chat-toggle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  border: none;
  font-size: 28px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  position: relative;
  transition: transform 0.3s;
}

.chat-toggle:hover {
  transform: scale(1.1);
}

.chat-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.chat-window {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 350px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  overflow: hidden;
  animation: slideUp 0.3s;
}

.chat-header {
  background: var(--primary-color);
  color: white;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-header button {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.chat-body {
  padding: 20px;
  height: 300px;
  overflow-y: auto;
}

.chat-message {
  padding: 10px 15px;
  border-radius: 12px;
  margin-bottom: 10px;
  max-width: 80%;
}

.chat-message.bot {
  background: #f3f4f6;
  margin-right: auto;
}

.chat-footer {
  padding: 15px;
  border-top: 1px solid #e5e7eb;
}

.chat-footer button {
  width: 100%;
  padding: 12px;
  background: #25d366;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
```

---

## 📊 Dashboard Simple pour Statistiques

Créez `admin-stats.html`:

```html
---
layout: default
title: Statistiques
---

<div class="admin-dashboard">
  <h1>📊 Dashboard</h1>
  
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon">🛒</div>
      <div class="stat-content">
        <h3 id="totalOrders">0</h3>
        <p>Commandes Totales</p>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">💰</div>
      <div class="stat-content">
        <h3 id="totalRevenue">0 HTG</h3>
        <p>Revenu Total</p>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">📦</div>
      <div class="stat-content">
        <h3 id="totalProducts">{{ site.products.size }}</h3>
        <p>Produits</p>
      </div>
    </div>
    
    <div class="stat-card">
      <div class="stat-icon">⭐</div>
      <div class="stat-content">
        <h3 id="avgRating">0.0</h3>
        <p>Note Moyenne</p>
      </div>
    </div>
  </div>
  
  <div class="recent-orders">
    <h2>Dernières Commandes</h2>
    <div id="ordersList"></div>
  </div>
</div>

<script>
// Charger statistiques
const orders = JSON.parse(localStorage.getItem('orders') || '[]');

document.getElementById('totalOrders').textContent = orders.length;

const revenue = orders.reduce((sum, order) => sum + order.payment.amount, 0);
document.getElementById('totalRevenue').textContent = revenue + ' HTG';

// Afficher dernières commandes
const ordersList = document.getElementById('ordersList');
ordersList.innerHTML = orders.slice(-10).reverse().map(order => `
  <div class="order-item">
    <div>
      <strong>${order.customer.name}</strong>
      <small>${new Date(order.date).toLocaleDateString()}</small>
    </div>
    <div class="order-amount">${order.payment.amount} HTG</div>
    <div class="order-status ${order.status}">${order.status}</div>
  </div>
`).join('');
</script>

<style>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  font-size: 48px;
}

.stat-content h3 {
  font-size: 32px;
  margin: 0;
  color: var(--primary-color);
}

.stat-content p {
  margin: 5px 0 0 0;
  color: #6b7280;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: white;
  border-radius: 8px;
  margin-bottom: 10px;
}

.order-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.order-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.order-status.completed {
  background: #d1fae5;
  color: #065f46;
}
</style>
```

---

Ak tout fichye sa yo, ou gen yon sistèm konplè epi fasil pou customizé! 🎉

Pou tout kesyon, kontakte m sou WhatsApp: +509 4886-8964
