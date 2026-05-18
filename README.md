# 🛍️ Boutique Piyay - Amélioration Complète

Guide komplet pou amelyorasyon sit e-commerce Jekyll la

## 📋 Table des Matières

1. [Nouvelles Fonctionnalités](#nouvelles-fonctionnalités)
2. [Installation](#installation)
3. [Configuration Admin](#configuration-admin)
4. [Structure des Fichiers](#structure-des-fichiers)
5. [Utilisation](#utilisation)
6. [Personnalisation](#personnalisation)
7. [Support](#support)

---

## ✨ Nouvelles Fonctionnalités

### 🎨 Design Amélioré
- Interface moderne et professionnelle
- Animations fluides et micro-interactions
- Design responsive (mobile, tablette, desktop)
- Thème de couleurs personnalisable

### 👨‍💼 Panel Admin Professionnel
- **Netlify CMS** intégré avec interface intuitive
- Gestion complète des produits (images multiples, variants, stock)
- Gestion des catégories avec icônes
- Configuration du site centralisée
- Preview en temps réel des produits

### 🛒 Système de Panier Avancé
- Panier persistant (localStorage)
- Ajout/modification/suppression de produits
- Calcul automatique des frais de livraison
- Support des variants de produits
- Modal panier avec aperçu rapide

### 🔍 Recherche et Filtres
- Barre de recherche en temps réel
- Filtres par catégorie, prix, stock
- Tri par prix, nom, popularité, date
- Vue rapide des produits (Quick View)
- Liste de souhaits (wishlist)

### ⭐ Système d'Avis
- Notation par étoiles (1-5)
- Commentaires clients
- Stockage local des avis
- Calcul de moyenne automatique
- Affichage sur page produit

### 💳 Checkout Optimisé
- Formulaire multi-étapes avec validation
- Support Moncash, Natcash, Espèces
- Instructions de paiement claires
- Calcul automatique livraison
- Intégration WhatsApp pour confirmation

### 📱 Fonctionnalités Additionnelles
- Galerie d'images produits avec zoom
- Variants (couleurs, tailles, modèles)
- Gestion des stocks en temps réel
- Codes promo
- Partage sur réseaux sociaux
- Notifications toast élégantes

---

## 🚀 Installation

### Prérequis
```bash
- Ruby 2.7+
- Jekyll 4.0+
- Node.js 14+ (pour Netlify CMS)
- Git
```

### Étape 1: Télécharger les Fichiers

Copiez tous les fichiers fournis dans votre pwojè Jekyll existant:

```
votre-projet/
├── admin/
│   ├── config.yml          # Configuration Netlify CMS
│   └── index.html          # Interface admin
├── _layouts/
│   └── product.html        # Layout produit amélioré
├── assets/
│   └── js/
│       └── cart.js         # Système de panier
├── checkout.html           # Page checkout
├── shop.html              # Page boutique avec filtres
└── README.md              # Ce fichier
```

### Étape 2: Configuration Jekyll

Ajouterz dans votre `_config.yml`:

```yaml
# Collections
collections:
  products:
    output: true
    permalink: /pwodwi/:slug/
  categories:
    output: true
    permalink: /kategori/:slug/

# Defaults
defaults:
  - scope:
      path: ""
      type: "products"
    values:
      layout: "product"
      published: true
```

### Étape 3: Installer Netlify CMS

1. Créez un compte sur [Netlify](https://netlify.com)
2. Connectez votre repository GitHub
3. Activez Netlify Identity:
   - Site Settings → Identity → Enable Identity
   - Registration preferences → Invite only (recommandé)
   - External providers → Ajouterz Google/GitHub si désiré
4. Activez Git Gateway:
   - Settings → Identity → Services → Git Gateway → Enable

### Étape 4: Inviter Utilisateurs Admin

Dans Netlify Dashboard:
1. Identity → Invite users
2. Entrez les emails des administrateurs
3. Ils recevront un lien d'invitation
4. Accès admin: `https://votre-site.netlify.app/admin`

---

## 🎛️ Configuration Admin

### Accès au Panel Admin

```
URL: https://votre-site.com/admin
Ou localement: http://localhost:4000/admin
```

### Structure du Panel

#### 1. **Produits** 📦
Créer/modifier des produits avec:
- Titre, description, prix
- Images multiples (jusqu'à 10)
- Catégorie et sous-catégorie
- Variants (couleur, taille, modèle)
- Gestion du stock (quantité, disponibilité)
- Tags, poids, dimensions
- Options SEO

#### 2. **Catégories** 🏷️
Gérer les catégories:
- Nom et slug
- Image et icône
- Couleur de thème
- Ordre d'affichage

#### 3. **Pages** 📄
Modifier:
- Page d'accueil (hero, sections)
- À propos
- Contact

#### 4. **Paramètres** ⚙️
Configuration globale:
- Informations du site
- Coordonnées
- Réseaux sociaux
- Numéros de paiement (Moncash, Natcash)
- Frais de livraison

---

## 📁 Structure des Fichiers

### Fichiers Principaux

```
admin/
  config.yml          → Configuration CMS (produits, catégories, pages)
  index.html          → Interface admin avec loading screen

_layouts/
  product.html        → Template produit avec:
                        - Galerie images
                        - Système de variants
                        - Reviews et ratings
                        - Produits similaires

assets/
  js/
    cart.js          → Classe ShoppingCart complète:
                       - Gestion panier
                       - LocalStorage
                       - Notifications
                       - Checkout
                       - WhatsApp integration

checkout.html        → Page de finalisation:
                       - Formulaire multi-étapes
                       - Validation
                       - Résumé commande
                       - Choix paiement

shop.html           → Page boutique:
                      - Grille produits
                      - Recherche et filtres
                      - Quick view
                      - Wishlist
```

### Collections Jekyll

```
_products/          → Articles produits (Markdown + YAML)
_categories/        → Catégories (Markdown + YAML)
_orders/           → Commandes (généré automatiquement)
_data/
  settings.yml     → Configuration site
```

---

## 💡 Utilisation

### Ajouterr un Produit

#### Via l'Admin (Recommandé):
1. Allez sur `/admin`
2. Cliquez "Produits" → "New Produit"
3. Remplissez les champs:
   - Titre: "T-shirt Premium Coton"
   - Prix: 500
   - Catégorie: Habillement
   - Image principale
   - Images additionnelles
4. Ajouterz des variants si nécessaire:
   - Type: Taille
   - Options: S, M, L, XL
5. Définissez le stock
6. Cliquez "Publish"

#### Via Markdown:
Créez `_products/tshirt-premium.md`:

```yaml
---
title: "T-shirt Premium Coton"
price: 500
original_price: 650
discount_percent: 23
category: habillement
featured_image: /assets/images/tshirt-main.jpg
images:
  - image: /assets/images/tshirt-1.jpg
  - image: /assets/images/tshirt-2.jpg
excerpt: "T-shirt en coton 100% qualité supérieure"
in_stock: true
stock_quantity: 50
variants:
  - type: Taille
    name: S
    in_stock: true
  - type: Taille
    name: M
    in_stock: true
  - type: Taille
    name: L
    in_stock: true
  - type: Couleur
    name: Blanc
    in_stock: true
  - type: Couleur
    name: Noir
    in_stock: true
tags:
  - nouveau
  - populaire
featured: true
date: 2026-02-16
---

## Description

T-shirt premium en coton 100% doux et confortable.
Parfait pour un usage quotidien.

### Caractéristiques:
- Coton respirant
- Coupe moderne
- Facile d'entretien
```

### Personnaliser les Couleurs

Dans `assets/css/main.css` ou votre stylesheet:

```css
:root {
  --primary-color: #4facfe;    /* Couleur principale */
  --accent-color: #00f2fe;     /* Couleur accent */
  --success-color: #10b981;    /* Vert succès */
  --danger-color: #ef4444;     /* Rouge erreur */
  --gray-light: #f9fafb;       /* Fond clair */
  --gray-dark: #111827;        /* Texte foncé */
}
```

### Configuration des Paiements

Dans `_data/settings.yml` ou via Admin:

```yaml
payment:
  moncash: "4886-8964"
  natcash: "4068-3108"
  cash_enabled: true

shipping:
  pap_fee: 0              # Port-au-Prince
  province_fee: 100       # Autres villes
  free_shipping_threshold: 1000  # Livraison gratuite dès
```

### Codes Promo

Dans `checkout.html`, section `applyPromoCode()`:

```javascript
const validCodes = {
  'BIENVENUE10': 10,  // 10% réduction
  'PIYAY50': 50,      // 50 HTG réduction
  'VIP20': 20         // 20% réduction
};
```

---

## 🎨 Personnalisation

### Changer le Logo

1. Via Admin: Paramètres → Logo → Upload
2. Ou remplacez `/assets/images/logo.png`

### Modifier les Catégories

Admin → Catégories → Edit:
- Changez l'icône (emoji ou classe CSS)
- Modifiez la couleur de thème
- Réorganisez l'ordre

### Personnaliser les Emails

Dans `cart.js`, fonction `sendWhatsAppOrder()`:

```javascript
let message = `🛍️ *NOUVELLE COMMANDE*

📋 Commande: ${order.orderNumber}
👤 Client: ${order.customer.name}
...
`;
```

### Ajouterr des Sections Page d'Accueil

Dans Admin → Pages → Page d'accueil → Sections:
- Vente Flash
- Produits Vedettes
- Catégories
- Bannières personnalisées

---

## 🔧 Fonctions Avancées

### Exporter les Commandes

Dans la console navigateur:

```javascript
cart.exportOrders();
```

Télécharge un fichier JSON avec toutes les commandes.

### Analytics des Produits

Ajouterz Google Analytics ou créez votre système:

```javascript
// Dans cart.js, après addItem()
if (typeof gtag !== 'undefined') {
  gtag('event', 'add_to_cart', {
    'items': [{
      'id': product.id,
      'name': product.title,
      'price': product.price
    }]
  });
}
```

### Intégration avec Backend

Pour connecter à une vraie base de données, modifiez `cart.js`:

```javascript
async processCheckout(formData) {
  // Au lieu de localStorage
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {...},
      items: this.cart,
      total: this.getTotal()
    })
  });
  
  const order = await response.json();
  // ...
}
```

---

## 📱 Tests

### Test en Local

```bash
# Démarrez Jekyll
bundle exec jekyll serve

# Accédez:
# Site: http://localhost:4000
# Admin: http://localhost:4000/admin
```

### Test des Fonctionnalités

**Panier:**
1. Ajouterz produits
2. Modifiez quantités
3. Supprimez items
4. Vérifiez persistance (rechargez page)

**Checkout:**
1. Remplissez formulaire
2. Testez validation champs
3. Choisissez paiement
4. Vérifiez message WhatsApp

**Admin:**
1. Créez nouveau produit
2. Uploadez images
3. Ajouterz variants
4. Publiez et vérifiez sur site

---

## 🐛 Troubleshooting

### Le Panier ne Sauvegarde pas

**Cause:** Cookies/localStorage bloqués

**Solution:**
```javascript
// Testez dans console
localStorage.setItem('test', '1');
console.log(localStorage.getItem('test'));
```

### Admin ne Charge pas

**Cause:** Netlify Identity pas configuré

**Solution:**
1. Vérifiez `admin/config.yml`
2. Netlify Dashboard → Enable Identity
3. Enable Git Gateway

### Images ne S'affichent pas

**Cause:** Chemin incorrect

**Solution:**
- Vérifiez `baseurl` dans `_config.yml`
- Utilisez chemins absolus: `/assets/images/...`
- Ou chemins Jekyll: `{{ site.baseurl }}/assets/...`

### Erreur Build Jekyll

**Cause:** YAML invalide

**Solution:**
```bash
# Validez YAML
jekyll build --trace

# Vérifiez indentation
# Utilisez validateur: yamllint.com
```

---

## 📚 Ressources

### Documentation
- [Jekyll](https://jekyllrb.com/docs/)
- [Netlify CMS](https://www.netlifycms.org/docs/)
- [Liquid Template](https://shopify.github.io/liquid/)

### Support
- GitHub Issues: [Lien vers votre repo]
- Email: josephgenescar@gmail.com
- WhatsApp: +509 4886-8964

### Tutoriels Vidéo
Créez des tutoriels pour votre équipe:
1. Comment ajouter un produit
2. Comment gérer les commandes
3. Comment modifier les paramètres

---

## 🎯 Prochaines Étapes

### Fonctionnalités à Ajouterr
- [ ] Newsletter subscription
- [ ] Blog intégré
- [ ] Programme de fidélité
- [ ] Chatbot support client
- [ ] Comparaison de produits
- [ ] Historique de navigation
- [ ] Recommandations personnalisées

### Optimisations
- [ ] Lazy loading images
- [ ] Service Worker (PWA)
- [ ] Compression images
- [ ] CDN pour assets
- [ ] SEO optimization

### Marketing
- [ ] Pixel Facebook
- [ ] Google Ads tracking
- [ ] Email marketing (Mailchimp)
- [ ] SMS notifications
- [ ] Programme d'affiliation

---

## 📄 Licence

© 2026 Boutique Piyay - Tous droits réservés
Design by Rivayo-Tech

---

## 🙏 Crédits

- Jekyll Framework
- Netlify CMS
- Design inspiré par les meilleures pratiques e-commerce
- Icônes: Emojis natifs

---

**Dernière mise à jour:** 16 février 2026
**Version:** 2.0.0

Pour toute question ou assistance, contactez-nous! 🚀
