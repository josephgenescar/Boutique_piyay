# 🔐 Configuration Admin — Boutique Piyay

## 📋 Aksès Admin (Admin Access)

De (2) paj admin yo proteje pa **password authentication** (Dashboard + Products). CMS Netlify a pa proteje. Se SELMAN ou (the owner) ki gen drwa aksè.

---

## 🔑 Modpas Admin (Admin Password)

**📌 Modpas aktyèl (Current Password):**
```
boutique_piyay_2026
```

### Kijan yo konekte:
1. Ale sou: **`/admin/login.html`**
2. Antre modpas la: `boutique_piyay_2026`
3. Klike "Konekte"
4. Ou ap rive nan **Dashboard Admin**

---

## 🔐 Chanje Modpas (Changing the Password)

Pou chanje modpas ou:

### Metòd 1: Redirek Dirèk (Direct Redirect)
1. Lonje soti (logout) 
2. Ouvri **Developer Tools** (F12)
3. Ale nan **Console tab**
4. Kopi-kole code sa a:
```javascript
const LOGIN_PASSWORD = 'YOUR_NEW_PASSWORD_HERE';
console.log('Password updated. Reload /admin/login.html');
```
5. Ranje:
   - Ouvri fichye `/admin/login.html` 
   - Chèche liy `ADMIN_PASSWORD = 'boutique_piyay_2026'`
   - Ranplase ak nouvo modpas ou a

### Metòd 2: Pwofesyonèl (Professional) 
Kontakte develop la pou yo fè chanjman an, oswa:
1. Modifye direktman fichye `/admin/login.html`
2. Liy ~114: `const ADMIN_PASSWORD = 'YOUR_NEW_PASSWORD';`
3. Sove fichye a
4. Redepwi sit la

---

## 📧 Paj Admin

### Admin Panel (`/admin/admin.html`) 🔐 PROTEJE - **PRINCIPAL**
- Dashboard avèk estatistik
- Onglet Konfigirasyon
- Lyen rapid pou tout tool yo
- **Rekit:** Login avèk modpas
- **Lyen Rapid:** Products, CMS, Kategori, Compte Client

### Gestion Produits (`/admin/products.html`) 🔐 PROTEJE
- ➕ **Ajouter pwodwi** (Fil form)
- 📦 **Lis pwodwi** (Sèch, efase)
- 🔍 **Filtre Real-time search**
- **Rekit:** Login avèk modpas

### CMS Netlify (`/admin/index.html`) 🔓 LIBRE
- Traditional CMS pou kòn, ofè, etc.
- Synkronizasyon otomatik
- **Rekit:** Sèvi Netlify Identity
- **Di Atansyon:** Ou ka aksè direktman san modpas boutik

### Compte Client (`/admin/account.html`) 🔓 LIBRE
- Enfòmasyon kont kliyan
- Istorik komannd
- Paramèt sekirite ak preferans
- **Rekit:** Aksè direktman pou kliyan (pa bezwen admin login)

---

## 🔒 Sigrite (Security)

✅ **Pwodèj Proteksyon (2 Paj):**
- ✅ Admin Panel (`/admin/admin.html`) - Modpas oblije
- ✅ Products (`/admin/products.html`) - Modpas oblije
- ✅ CMS Netlify (`/admin/index.html`) - Sèvi Netlify Identity (pa modpas boutik)
- ✅ Compte Client (`/admin/account.html`) - Libre pou kliyan

**Mekanik Proteksyon:**
- Modpas check dèk login  
- Session token valid 8 èzè
- localStorage persistence
- Logout availab nan tout admin paj

⚠️ **Di Atansyon:**
- Modpas a stoke lo **client-side** (browser localStorage)
- Pou maksimòm sigrite, sèvi ak HTTPS
- Logout apre ou fini travay

---

## 🚪 Logout (Disconnect)

Klike bouton **"🚪 Lonje"** sou:
- Dashboard (`/admin/dashboard.html`)
- Gestion Produits (`/admin/products.html`)
- Ou ap renvwaye nan home page

Session ap ekspire otomatikman apre **8 èzè** san aktivite.

---

## 📱 localStorage Keys

Sistèm yo sèvi avèk **localStorage** pou rejis:

### `admin_auth_token`
- Tanba token k gneré apre login
- Itilize pou verifye sesyon

### `admin_auth_time`
- Timestamp koneksyon
- Teste pou expirason (8 èzè)

### `bp_products`
- JSON array tout pwodwi
- Dwe pa kapasite 5MB browser

---

## � Paj Proteje - Resume

| Paj | Modpas | Status |
|-----|--------|--------|
| Admin Panel | ✅ Rekit | 🔐 Pwoteje |
| Products | ✅ Rekit | 🔐 Pwoteje |
| CMS Netlify | ❌ Pa | 🔓 Libre |
| Compte Client | ❌ Pa | 🔓 Libre (Client) |
| Kategori | ❌ Pa | 🔓 Libre (Client) |

---

## �🛠️ Fiyabilite (Troubleshooting)

### Pwoblem: "Modpas yo pa kòrèk"
**Solisyon:**
- Verifye CAPS LOCK pa sou
- Kopi-kole modpas dirèk (san espas)
- Eseye ankò

### Pwoblem: "Pas aksè admin"
**Solisyon:**
- Verifye localStorage pa vide:
  - F12 → Application → localStorage
  - Chèche: `admin_auth_token` ak `admin_auth_time`
- Si poko la, logout ak rekonekte

### Pwoblem: "Session expired"
**Solisyon:**
- Normal apre 8 èzè
- Lanjin ankò: `/admin/login.html`
- Antre modpas

---

## 📞 Sipò (Support)

- 📧 Email: josephgenescar@gmail.com
- 💬 WhatsApp: +509 4886-8964
- 🌐 Site: https://boutique-piyay.netlify.app

---

**Last Updated:** Fevriye 17, 2026
**Version:** Admin v1.3 (Unified Admin Panel + Customer Account)
