// ============================================================
//  PiyayChat — Netlify Function: send-notification.js
//  Voye notifikasyon push SANS Firebase
//  Itilize: web-push (VAPID) + Supabase sèlman
//  Enstale: npm install web-push @supabase/supabase-js
// ============================================================

const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

// Konfigirasyon VAPID
webpush.setVapidDetails(
  "mailto:josephgenescar@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Modèl mesaj pa tip ──────────────────────────────────────
const TEMPLATES = {
  new_order: (d) => ({
    title: "🛍️ Nouvo Kòmand!",
    body: `Kòmand #${d.order_id} — ${d.product_name} — ${d.amount} HTG`,
    click_url: `/dashboard/orders/${d.order_id}`,
  }),
  order_confirmed: (d) => ({
    title: "✅ Kòmand Konfime!",
    body: `Machann konfime. Livrezon nan ${d.delivery_time ?? "24h"}.`,
    click_url: `/orders/${d.order_id}`,
  }),
  order_delivered: (d) => ({
    title: "📦 Pwodwi Livre!",
    body: `Kòmand #${d.order_id} livre. Konfime resepsyon.`,
    click_url: `/orders/${d.order_id}`,
  }),
  delivery_coming: (d) => ({
    title: "🛵 Livrè ap vini!",
    body: `Livrè ap rive nan ${d.eta ?? "15 min"}. Prepare ou!`,
    click_url: `/orders/${d.order_id}`,
  }),
  commission_earned: (d) => ({
    title: "💰 Komisyon Resevwa!",
    body: `+${d.amount} HTG — Vant #${d.order_id}`,
    click_url: `/dashboard/wallet`,
  }),
  payment_received: (d) => ({
    title: "💳 Peman Resevwa!",
    body: `${d.amount} HTG nan wallet ou. Total: ${d.balance} HTG`,
    click_url: `/dashboard/wallet`,
  }),
  new_message: (d) => ({
    title: `💬 ${d.sender_name}`,
    body: d.message_preview,
    click_url: `/chat/${d.conversation_id}`,
  }),
  flash_sale: (d) => ({
    title: "⚡ Vant Flash!",
    body: `${d.product_name} — ${d.discount}% rabè pou ${d.duration} sèlman!`,
    click_url: `/produit/${d.product_id}`,
  }),
  withdrawal_success: (d) => ({
    title: "✅ Retrè Reyisi!",
    body: `${d.amount} HTG voye nan ${d.method}.`,
    click_url: `/dashboard/wallet`,
  }),
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Sekirite — sèlman kòd entèn ka rele fonksyon sa a
  if (event.headers["x-internal-secret"] !== process.env.INTERNAL_SECRET) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { user_id, type, data = {} } = body;
  if (!user_id || !type) {
    return { statusCode: 400, body: "user_id ak type obligatwa" };
  }

  try {
    // 1. Jwenn subscriptions itilizatè a
    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (subErr || !subs?.length) {
      // Pa gen subscription — sove notifikasyon nan baz de done kanmèm
      await saveNotification(user_id, type, data);
      return { statusCode: 200, body: JSON.stringify({ sent: 0, saved: true }) };
    }

    // 2. Prepare payload
    const template = TEMPLATES[type]?.(data) ?? {
      title: "Boutique Piyay",
      body: "",
      click_url: "/",
    };

    const payload = JSON.stringify({
      title: template.title,
      body: template.body,
      type,
      data: { ...data, click_url: `https://boutique-piyay.netlify.app${template.click_url}` },
    });

    // 3. Voye bay tout aparèy
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 86400 } // Kenbe 24h si aparèy la oflayn
        )
      )
    );

    // 4. Efase subscription ki echwe (410 = itilizatè dezabòne)
    const failedEndpoints = [];
    results.forEach((result, i) => {
      if (result.status === "rejected") {
        const status = result.reason?.statusCode;
        if (status === 410 || status === 404) {
          failedEndpoints.push(subs[i].endpoint);
        }
      }
    });

    if (failedEndpoints.length) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
    }

    // 5. Sove notifikasyon nan istwa
    await saveNotification(user_id, type, data, template);

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return {
      statusCode: 200,
      body: JSON.stringify({ sent, failed: results.length - sent }),
    };
  } catch (err) {
    console.error("Erè voye notifikasyon:", err);
    return { statusCode: 500, body: err.message };
  }
};

// ── Sove nan istwa notifications ────────────────────────────
async function saveNotification(userId, type, data, template) {
  const t = template ?? TEMPLATES[type]?.(data) ?? { title: "Boutique Piyay", body: "" };
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title: t.title,
    body: t.body,
    data,
    read: false,
  });
}
