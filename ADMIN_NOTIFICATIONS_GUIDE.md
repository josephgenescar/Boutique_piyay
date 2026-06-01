# Guide d'Installation - Système de Notifications Admin pour Boutique Piyay

Ce guide explique comment configurer le système de notifications email automatiques pour l'admin de Boutique Piyay.

## Vue d'ensemble

Le système envoie automatiquement des emails à l'admin (josephgenescar@gmail.com) lorsque:
- 🛒 Une nouvelle commande est passée
- 🏪 Un nouveau vendeur s'inscrit
- 📦 Un nouveau produit est ajouté
- ✋ Un produit demande une approbation
- 💰 Un vendeur demande un retrait
- 💳 Un vendeur paie son abonnement

## Étapes d'Installation

### 1. Exécuter le script SQL dans Supabase

1. Allez sur votre dashboard Supabase: https://supabase.com/dashboard
2. Sélectionnez votre projet Boutique Piyay
3. Cliquez sur "SQL Editor" dans le menu de gauche
4. Cliquez sur "New Query"
5. Copiez et collez le contenu du fichier `supabase-schema-admin-notifications.sql`
6. Cliquez sur "Run" pour exécuter le script

Cela va créer:
- La table `admin_notifications` pour stocker les notifications
- Les triggers automatiques pour détecter les nouveaux événements

### 2. Déployer les fonctions Supabase

Vous avez deux fonctions à déployer:

#### Option A: Via Supabase Dashboard (Recommandé)

1. Dans le dashboard Supabase, cliquez sur "Edge Functions" dans le menu
2. Cliquez sur "New Edge Function"
3. Nommez la fonction: `admin-notification`
4. Copiez le contenu de `supabase/functions/admin-notification/index.ts`
5. Collez-le dans l'éditeur
6. Cliquez sur "Deploy"
7. Répétez pour la fonction `admin-notification-listener`

#### Option B: Via CLI (Supabase CLI)

Si vous avez le Supabase CLI installé:

```bash
# Déployer toutes les fonctions
supabase functions deploy

# Ou déployer individuellement
supabase functions deploy admin-notification
supabase functions deploy admin-notification-listener
```

### 3. Configurer les variables d'environnement

Assurez-vous que ces variables d'environnement sont configurées dans Supabase:

- `SUPABASE_URL`: Votre URL Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Votre service role key
- `RESEND_API_KEY`: Votre clé API Resend pour envoyer les emails

Pour configurer dans Supabase Dashboard:
1. Allez dans "Settings" > "Edge Functions"
2. Ajoutez les variables d'environnement

### 4. Configurer le cron job pour le listener

Pour que les notifications soient envoyées automatiquement, vous devez configurer un cron job qui appelle la fonction `admin-notification-listener` régulièrement (par exemple toutes les 5 minutes).

#### Option A: Via Supabase Dashboard

1. Allez dans "Edge Functions" > "Cron Jobs"
2. Cliquez sur "New Cron Job"
3. Nom: `admin-notification-listener`
4. Schedule: `*/5 * * * *` (toutes les 5 minutes)
5. Function: `admin-notification-listener`
6. Cliquez sur "Create"

#### Option B: Via un service externe (cron-job.org, etc.)

Si Supabase n'a pas de cron jobs, utilisez un service externe:
1. Allez sur https://cron-job.org
2. Créez un nouveau compte
3. Ajoutez un nouveau cron job
4. URL: `https://votre-projet.supabase.co/functions/v1/admin-notification-listener`
5. Schedule: toutes les 5 minutes
6. Headers: `Authorization: Bearer VOTRE_SERVICE_ROLE_KEY`

### 5. Tester le système

Pour tester que tout fonctionne:

1. Créez une nouvelle commande dans votre application
2. Attendez 5 minutes (ou appelez manuellement la fonction listener)
3. Vérifiez votre email josephgenescar@gmail.com

#### Appel manuel du listener:

```bash
curl -X POST 'https://votre-projet.supabase.co/functions/v1/admin-notification-listener' \
  -H 'Authorization: Bearer VOTRE_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

## Types de Notifications

### new_order
Déclenché quand une nouvelle commande est créée dans la table `orders`.

### new_seller
Déclenché quand un vendeur est activé (is_active_seller = true).

### new_product
Déclenché quand un nouveau produit est ajouté dans `user_products`.

### product_approval_request
Déclenché quand un produit est ajouté sans approbation (is_approved = false).

### withdrawal_request
Déclenché quand un vendeur demande un retrait dans `affiliate_withdrawals`.

### subscription_payment
Déclenché quand la date d'expiration d'abonnement est mise à jour.

## Personnalisation

### Changer l'email de l'admin

Modifiez la constante `ADMIN_EMAIL` dans les fichiers:
- `supabase/functions/admin-notification/index.ts`
- `supabase/functions/admin-notification-listener/index.ts`

```typescript
const ADMIN_EMAIL = 'votre-email@example.com'
```

### Modifier le design des emails

Les templates HTML sont dans les fonctions `generate*Email()` dans `admin-notification/index.ts`. Vous pouvez modifier le CSS et le contenu selon vos préférences.

## Dépannage

### Emails ne sont pas envoyés

1. Vérifiez que `RESEND_API_KEY` est correctement configuré
2. Vérifiez les logs dans Supabase Edge Functions
3. Testez manuellement la fonction `send-email`

### Triggers ne fonctionnent pas

1. Vérifiez que le script SQL a été exécuté sans erreur
2. Vérifiez que les triggers existent dans la base de données
3. Testez en insérant manuellement une donnée dans la table concernée

### Notifications ne sont pas marquées comme lues

1. Vérifiez que la fonction listener a les permissions nécessaires
2. Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est utilisé (pas la key anon)

## Support

Pour toute question ou problème, contactez:
- Email: josephgenescar@gmail.com
- WhatsApp: +509 4886-8964
