# 🛍️ Boutique Universelle - Système de Commande

## ✨ Fonctionnalités Implémentées

### 1. **Panier Dynamique** 🛒
- ✅ Ajout de produits avec quantités
- ✅ Compteur de panier en temps réel
- ✅ Stockage local (localStorage)
- ✅ Suppression d'articles

### 2. **Formulaire de Commande Professionnel** 📋
- ✅ Modal élégante avec animations
- ✅ Champ nom du client
- ✅ Champ numéro de téléphone
- ✅ Sélection méthode de paiement
- ✅ Résumé de commande détaillé

### 3. **Méthodes de Paiement** 💳
- 💸 Moncash
- 💳 Natcash
- 🏦 Virement Bancaire
- 💵 Espèces à la Livraison

### 4. **Intégration WhatsApp** 📱
- ✅ Envoi automatique de commandes complètes
- ✅ Format professionnel du message
- ✅ Détails produits et total
- ✅ Informations client incluses

### 5. **Design Professionnel** 🎨
- ✅ Gradient moderne (purple/blue)
- ✅ Animations fluides
- ✅ Mode responsive (mobile/desktop)
- ✅ Effet glassmorphism
- ✅ Buttons avec hover effects

---

## 🔧 Configuration Requise

### 1. **Numéro WhatsApp**
Remplacez dans `main.js` ligne ~110:
```javascript
let whatsappNumber = "50948868964"; // ← Mettez votre numéro ici
```

Format: `+50948868964` ou `50948868964`

### 2. **Numéros Paiement**
Mettez à jour dans `index.html` les numéros Moncash/Natcash:
```html
<p>📲 <strong>Moncash:</strong> +509 48868964</p>
<p>💳 <strong>Natcash:</strong> +509 48868964</p>
```

### 3. **Ajouterr des Produits**
Créez un dossier `_products` et ajoutez des fichiers markdown:

**Exemple: _products/t-shirt.md**
```markdown
---
id: 1
title: T-Shirt Noir
description: T-Shirt de qualité, confortable
price: 350
image: /assets/images/tshirt.jpg
category: Vetements Homme
---
```

---

## 📱 Flux Utilisateur

1. **Client ajoute produits** → Panier se met à jour
2. **Client clique sur panier** 🛒 → Modal s'ouvre
3. **Client remplit le formulaire**:
   - Nom complet
   - Numéro téléphone
   - Méthode paiement
4. **Client confirme** ✅ → Envoi WhatsApp automatique
5. **Panier vidé** → Notification de succès

---

## 🎯 Messages WhatsApp Générés

Format professionnel automatique:
```
🛒 NOUVELLE COMMANDE

👤 Nom: Jean Duviré
📱 Téléphone: +509 48868964
💳 Paiement: Moncash

📦 ARTICLES:
• T-Shirt Noir x2 = 700 HTG
• Jean Bleu x1 = 600 HTG

💰 TOTAL: 1300 HTG

Merci pour votre commande! ✨
```

---

## 🚀 Déployer sur Netlify

1. Git commit et push:
```bash
git add .
git commit -m "Ajout système de commande professionnel"
git push
```

2. Netlify reconstruit automatiquement 🎉

---

## 💡 Conseils d'Utilisation

✅ **À faire:**
- Mettre à jour les vraies informations de paiement
- Tester le formulaire avant de publier
- Créer des produits attrayants avec images
- Répondre rapidement aux commandes WhatsApp

❌ **À éviter:**
- Laisser les numéros d'exemple
- Oublier de créer le dossier `_products`
- Ne pas tester sur mobile

---

## 📞 Support

Pour toute question concernant le système de commande:
- Vérifiez les numéros WhatsApp/Paiement
- Testez sur différents navigateurs
- Vérifiez la console navigateur (F12) pour les erreurs

**Site: Boutique Universelle**
**Dernière mise à jour: 2026** 🎉
