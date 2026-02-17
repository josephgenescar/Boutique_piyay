# 🔐 Configuration Admin — Boutique Piyay

## 📋 Aksès Admin (Admin Access)

Tout paj admin yo proteje pa **password authentication**. Se SELMAN ou (the owner) ki gen drwa aksè.

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
4. Kopi-kole kòd sa a:
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

### Dashboard Admin (`/admin/dashboard.html`)
- Wè estatistik total pwodwi
- Gade kryaj Rekòmande
- Aksè rapid nan tout tool yo
- **Rekit:** Login

### Gestion Produits (`/admin/products.html`)
- ➕ **Ajoute pwodwi** (Fil form)
- 📦 **Lis pwodwi** (Sèch, efase)
- 🔍 **Filtre Real-time search**
- **Rekit:** Login

### CMS Netlify (`/admin/index.html`)
- Traditional CMS pou kòn, ofè, etc.
- Synkronizasyon otomatik
- **Rekit:** Login

### Kategori Pages (`/kategori.html`)
- Wè pwodwi aksè kategori
- Filtre pa pri, rekòmande, estòk
- Aksè ouvè (pa bezwen login)

---

## 🔒 Sigrite (Security)

✅ **Pwodèj Proteksyon:**
- Modpas check dèk login  
- Session token valid 8 èzè
- localStorage persistence
- Logout availab nan tout admin paj

⚠️ **Di Atansyon:**
- Modpas a stoke lo **client-side** (browser localStorage)
- Pou maksimòm sigrite, sevi ak HTTPS
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

## 🛠️ Fiyabilite (Troubleshooting)

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
**Version:** Admin v1.1 (Secured)
