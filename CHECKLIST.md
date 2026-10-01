# ✅ CHECKLIST D'INSTALLATION - Boutique Piyay

## 📋 Avant de Commencer

- [ ] Backup du site actuel
- [ ] Ruby 2.7+ installé
- [ ] Jekyll 4.0+ installé
- [ ] Compte GitHub créé
- [ ] Compte Netlify créé

---

## 🚀 ÉTAPE 1: Préparation (15 min)

### 1.1 Backup
```bash
# Créez une sauvegarde complète
cp -r votre-site/ votre-site-backup/

# Ou via Git
git branch backup-avant-amelioration
git checkout -b amelioration-v2
```

### 1.2 Structure de Dossiers
```bash
# Créez les dossiers nécessaires
mkdir -p admin
mkdir -p assets/js
mkdir -p _products
mkdir -p _categories
mkdir -p _data
```

---

## 📁 ÉTAPE 2: Installation des Fichiers (30 min)

### 2.1 Fichiers Admin
- [ ] Vérifiez `admin/login.html`, `admin/admin.html` et `admin/finance.html`

### 2.2 Layouts et Pages
- [ ] Copiez `_layouts/product.html` → `_layouts/product.html`
- [ ] Copiez `checkout.html` → `checkout.html`
- [ ] Copiez `shop.html` → `shop.html`

### 2.3 JavaScript
- [ ] Copiez `assets/js/cart.js` → `assets/js/cart.js`

### 2.4 Documentation
- [ ] Copiez `README.md` → `README.md`
- [ ] Copiez ce fichier `CHECKLIST.md`

---

## ⚙️ ÉTAPE 3: Configuration Jekyll (15 min)

### 3.1 Modifier `_config.yml`

Ajouterz ou modifiez:

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
  - scope:
      path: ""
      type: "categories"
    values:
      layout: "category"

```

- [ ] Collections ajoutées
- [ ] Defaults configurés
- [ ] Les pages admin restent incluses dans `_site`

### 3.2 Créer `_data/settings.yml`

```yaml
site_name: "Boutique Piyay"
description: "Votre boutique en ligne de confiance"
logo: "/assets/images/logo.png"
email: "josephgenescar@gmail.com"
phone1: "+509 4886-8964"
phone2: "+509 4068-3108"
whatsapp: "50948868964"
address: "Port-au-Prince, Haïti"

social:
  facebook: ""
  instagram: ""
  twitter: ""

payment:
  moncash: "4886-8964"
  natcash: "4068-3108"
  cash_enabled: true

shipping:
  pap_fee: 0
  province_fee: 100
  free_shipping_threshold: 1000
```

- [ ] Fichier créé
- [ ] Informations mises à jour

---

## 🎨 ÉTAPE 4: Intégration Frontend (20 min)

### 4.1 Vérifier la connexion Supabase

- [ ] Le layout charge le SDK Supabase et les scripts du site une seule fois
- [ ] `SUPABASE_URL` pointe vers le même projet que les données produits
- [ ] `SUPABASE_SERVICE_ROLE_KEY` est configurée seulement dans Netlify Functions
- [ ] `SITE_ORIGIN` correspond au domaine publié
- [ ] L'admin se connecte via `/admin/login.html` avec un profil Supabase `admin`

### 4.2 Ajouterr le Panier au Header

Dans votre header/navigation:

```html
<a href="/cart" class="cart-icon">
  🛒
  <span class="cart-count" id="cartCount">0</span>
</a>
```

CSS associé:
```css
.cart-icon {
  position: relative;
  font-size: 24px;
  text-decoration: none;
}

.cart-count {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}
```

- [ ] Icône panier ajoutée
- [ ] CSS appliqué
- [ ] Compteur configuré

---

## 🌐 ÉTAPE 5: Déploiement Netlify (30 min)

### 5.1 Connecter GitHub

1. Push votre code sur GitHub:
```bash
git add .
git commit -m "Amélioration v2.0 - Admin Panel + Cart System"
git push origin main
```

- [ ] Code pushé sur GitHub

### 5.2 Créer Site Netlify

1. Allez sur [netlify.com](https://netlify.com)
2. Cliquez "Add new site" → "Import from Git"
3. Sélectionnez votre repo
4. Configuration build:
   - Build command: `jekyll build`
   - Publish directory: `_site`
5. Cliquez "Deploy"

- [ ] Site créé sur Netlify
- [ ] Premier déploiement réussi

### 5.3 Configurer les fonctions admin

1. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Netlify environment variables.
2. Set `SITE_ORIGIN` to the deployed site origin.
3. Confirm admin users have the `admin` role in Supabase.
4. Open `/admin/login.html` and verify `/admin/finance.html` loads for an admin account.

---

## 🧪 ÉTAPE 6: Tests (30 min)

### 6.1 Test du Site

- [ ] Page d'accueil charge correctement
- [ ] Navigation fonctionne
- [ ] Images s'affichent
- [ ] Responsive (mobile/tablette)

### 6.2 Test Admin Panel

1. Allez sur `https://votre-site.netlify.app/admin/login.html`
2. Connectez-vous avec votre compte Supabase administrateur

- [ ] Admin panel accessible
- [ ] Interface charge
- [ ] Login fonctionne

### 6.3 Test Création Produit

1. Dans Admin: Produits → New Product
2. Remplissez tous les champs
3. Uploadez images
4. Ajouterz variants
5. Publiez

- [ ] Produit créé
- [ ] Images uploadées
- [ ] Variants fonctionnent
- [ ] Produit visible sur site

### 6.4 Test Système Panier

1. Ajouterz produit au panier
2. Modifiez quantité
3. Supprimez item
4. Rechargez page (persistance)

- [ ] Ajout panier OK
- [ ] Modification OK
- [ ] Suppression OK
- [ ] Persistance OK
- [ ] Compteur mis à jour

### 6.5 Test Checkout

1. Ajouterz plusieurs produits
2. Allez sur `/checkout`
3. Remplissez formulaire
4. Choisissez paiement
5. Soumettez commande

- [ ] Formulaire valide
- [ ] Calculs corrects
- [ ] WhatsApp fonctionne
- [ ] Confirmation affichée
- [ ] Panier vidé

---

## 🎯 ÉTAPE 7: Configuration Finale (20 min)

### 7.1 Paramètres du Site

Via Admin → Paramètres:

- [ ] Logo uploadé
- [ ] Informations contact mises à jour
- [ ] Numéros Moncash/Natcash corrects
- [ ] Réseaux sociaux configurés
- [ ] Frais livraison définis

### 7.2 Créer Catégories

Via Admin → Catégories:

- [ ] Électronique
- [ ] Habillement
- [ ] Maison
- [ ] Alimentation
- [ ] Beauté
- [ ] Accessoires

Pour chaque catégorie:
- Upload image
- Choisir icône
- Définir couleur
- Définir ordre

### 7.3 Migrer Produits Existants

Option 1: Manuellement via Admin (recommandé pour <20 produits)
Option 2: Script de migration (pour >20 produits)

- [ ] Produits migrés
- [ ] Images uploadées
- [ ] Prix vérifiés
- [ ] Stocks configurés

### 7.4 Pages Légales

Créez ou mettez à jour:

- [ ] Conditions générales (`/conditions`)
- [ ] Politique de confidentialité (`/politique`)
- [ ] Politique de retour (`/retours`)
- [ ] FAQ (`/faq`)

---

## 📊 ÉTAPE 8: Optimisation (Optionnel)

### 8.1 Performance

- [ ] Activer Netlify CDN
- [ ] Optimiser images (TinyPNG)
- [ ] Minifier CSS/JS
- [ ] Activer compression Gzip

### 8.2 SEO

- [ ] Ajouterr meta descriptions
- [ ] Configurer sitemap.xml
- [ ] Ajouterr robots.txt
- [ ] Google Search Console
- [ ] Google Analytics

### 8.3 Marketing

- [ ] Facebook Pixel
- [ ] Google Ads tracking
- [ ] Mailchimp integration
- [ ] WhatsApp Business

---

## 📈 ÉTAPE 9: Formation Équipe (Variable)

### 9.1 Documentation

- [ ] Partagez README.md
- [ ] Partagez ce checklist
- [ ] Créez guide vidéo (optionnel)

### 9.2 Formation Pratique

Sessions à prévoir:
1. **Admin de base** (30 min)
   - Login
   - Créer/modifier produit
   - Upload images

2. **Gestion commandes** (20 min)
   - Voir commandes
   - Exporter données
   - Contact clients

3. **Configuration avancée** (30 min)
   - Paramètres site
   - Catégories
   - Codes promo

- [ ] Session 1 complétée
- [ ] Session 2 complétée
- [ ] Session 3 complétée

---

## 🎉 ÉTAPE 10: Mise en Ligne

### 10.1 Vérification Finale

- [ ] Tous les tests passent
- [ ] Admin accessible
- [ ] Équipe formée
- [ ] Backup effectué
- [ ] Domaine personnalisé configuré (si applicable)

### 10.2 Communication

- [ ] Annoncer sur réseaux sociaux
- [ ] Email clients existants
- [ ] Update Google Business
- [ ] Update WhatsApp status

### 10.3 Monitoring

Première semaine:
- [ ] Vérifier commandes quotidiennement
- [ ] Monitorer erreurs (Netlify logs)
- [ ] Répondre aux feedbacks
- [ ] Noter améliorations nécessaires

---

## 🆘 Support Rapide

### Problèmes Communs

**Admin ne charge pas:**
```
1. Vérifiez la session Supabase et le rôle `admin`
2. Vérifiez les variables Netlify pour les fonctions
3. Videz le cache navigateur (Ctrl+Shift+R)
```

**Panier ne fonctionne pas:**
```
1. Vérifiez cart.js inclus dans layout
2. Ouvrez console (F12) → regardez erreurs
3. Testez localStorage: localStorage.setItem('test','1')
```

**Images ne s'affichent pas:**
```
1. Vérifiez chemins dans _config.yml
2. Utilisez /assets/images/ (pas ../assets/)
3. Rebuild site: netlify deploy --prod
```

---

## 📞 Contacts Support

- **Email:** josephgenescar@gmail.com
- **WhatsApp:** +509 4886-8964
- **GitHub Issues:** [Lien repo]

---

## 🎯 Temps Total Estimé

- Installation fichiers: 30 min
- Configuration: 45 min
- Netlify setup: 30 min
- Tests: 30 min
- Configuration finale: 20 min
- **TOTAL: ~2h30**

*Plus temps de migration produits (variable selon nombre)*

---

**Bon courage! 🚀**

Une fois terminé, votre site aura:
✅ Admin professionnel
✅ Panier avancé
✅ Checkout optimisé
✅ Recherche et filtres
✅ Système d'avis
✅ Design moderne

N'hésitez pas à demander de l'aide! 💪
