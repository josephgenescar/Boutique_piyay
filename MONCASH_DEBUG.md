# 🔴 MONCASH ERROR: Unexpected token '<' JSON

## Kisa l di?
Lè ou klike btn "Koneksyon MonCash...", ou resevwa:
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

Sa vle di: **Sèvè a pa retounen JSON - li retounen HTML (erè paj)**.

---

## 🚨 REZON PRINCIPAL

### **1. NETLIFY ENVIRONMENT VARIABLES MANKE** (99% ka)

Fonksyon `moncash.js` bezwen 2 variables:
- `MONCASH_CLIENT_ID`
- `MONCASH_CLIENT_SECRET`

Si yo pa egziste → Netlify retounen HTML erè 500

---

## ✅ FIX: AJOUTE VARIABLES

### Etap 1: Ale Netlify Dashboard
```
https://app.netlify.com → Select your site → Site settings
```

### Etap 2: Build & Deploy → Environment
```
Search: "Environment variables"
```

### Etap 3: Ajoute variables
| Variable Name | Value |
|---|---|
| `MONCASH_CLIENT_ID` | [Your ID] |
| `MONCASH_CLIENT_SECRET` | [Your Secret] |

### Etap 4: DEPLOY SITE LA
- Change make Netlify rebuild
- Rantri sou site la
- Essaye MonCash pay button anko

---

## 🔍 COMMENT JWENN CREDENTIALS MONCASH?

1. Ale `https://sandbox.moncashbutton.digicelgroup.com` (Test)
2. Login oswa signup
3. Ale Settings → API Keys / Credentials
4. Copy `Client ID` + `Client Secret`
5. Paste nan Netlify environment variables

---

## 🛠️ ALTERNATIVE: LOCAL TEST

Si ou bezwen test locally:

### Create `.env` file:
```
# .env (NEVER commit this)
MONCASH_CLIENT_ID=your_client_id_here
MONCASH_CLIENT_SECRET=your_client_secret_here
```

### Run locally:
```bash
npm install -g netlify-cli
netlify dev
# Now http://localhost:8888 works with functions
```

---

## 📋 CHECKLIST DEBUGGAGE

- [ ] Credentials copied to Netlify environment
- [ ] Site redeployed after adding variables
- [ ] Netlify shows "Deployed" (green checkmark)
- [ ] Browser DevTools (F12) → Console tab open
- [ ] Click MonCash button
- [ ] Check console logs - should show:
  - `📤 Sending to MonCash: {amount: XX, orderId: "BP-..."}`
  - `📥 MonCash response status: 200` (or error details)

---

## 🔗 VERIFY FUNCTION EXISTS

Go to:
```
https://your-site.netlify.app/.netlify/functions/moncash
```

Should return something like:
```json
{"error": "Method Not Allowed"}
```

If you get 404 or HTML page → Function NOT deployed

---

## 📞 STILL BROKEN?

1. Check Netlify deploy logs:
   - Site settings → Deploys → Latest deploy → View logs
   - Look for errors during build

2. Check Function logs:
   - Functions tab → moncash → View logs

3. If still stuck:
   - Test with CURL:
   ```bash
   curl -X POST https://your-site.netlify.app/.netlify/functions/moncash \
     -H "Content-Type: application/json" \
     -d '{"amount": 100, "orderId": "TEST-123"}'
   ```

---

## ✅ SUCCESS SIGNS

When working:
- Console shows: `📥 MonCash response status: 200`
- You get redirected to MonCash checkout page
- URL changes to: `https://sandbox.moncashbutton.digicelgroup.com/MonCash-middleware/Checkout/...`

