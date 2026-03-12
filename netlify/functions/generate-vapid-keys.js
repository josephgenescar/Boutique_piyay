// ============================================================
//  PiyayChat — Netlify Function: generate-vapid-keys.js
//  Rele fonksyon sa a YON SÈL FWA pou jwenn VAPID keys ou yo
//  URL: /.netlify/functions/generate-vapid-keys
//  Aprè jwenn keys yo — mete yo nan Netlify Environment Variables
//  Epi EFASE fonksyon sa a (pa kite li an piblik!)
// ============================================================

const webpush = require("web-push");

exports.handler = async (event) => {
  // Pwoteksyon — sèlman kle sekrè ka jwenn keys
  if (event.headers["x-internal-secret"] !== process.env.INTERNAL_SECRET) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const vapidKeys = webpush.generateVAPIDKeys();

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Kopye keys sa yo nan Netlify Environment Variables ou a!",
      VAPID_PUBLIC_KEY: vapidKeys.publicKey,
      VAPID_PRIVATE_KEY: vapidKeys.privateKey,
      instructions: {
        step1: "Ajoute VAPID_PUBLIC_KEY nan Netlify → Site → Environment Variables",
        step2: "Ajoute VAPID_PRIVATE_KEY nan Netlify → Site → Environment Variables",
        step3: "Ajoute NEXT_PUBLIC_VAPID_PUBLIC_KEY = menm valè ak VAPID_PUBLIC_KEY",
        step4: "EFASE fonksyon generate-vapid-keys.js sa a apre!",
      },
    }, null, 2),
  };
};
