const webpush = require("web-push");
const { createClient } = require("@supabase/supabase-js");

webpush.setVapidDetails(
  "mailto:genescarmike@gmail.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEMPLATES = {
  new_product: (d) => ({
    title: "🆕 Nouvo pwodwi sou Boutique Piyay!",
    body: `${d.product_name} kounye a disponib sou boutik la. Wè li kounye a!`,
    click_url: `/pwodwi-machann.html?id=${d.product_id}`,
  }),
  product_updated: (d) => ({
    title: "✍️ Pwodwi modifye!",
    body: `${d.product_name} jwenn yon nouvo ajou. Gade nouvo detay yo.`,
    click_url: `/pwodwi-machann.html?id=${d.product_id}`,
  }),
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const type = body.type;
  const data = body.data || {};
  if (!type || !TEMPLATES[type]) {
    return { statusCode: 400, body: "Invalid or missing notification type." };
  }

  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) {
    return { statusCode: 401, body: "Unauthorized: missing bearer token." };
  }

  const { data: currentUser, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !currentUser?.user) {
    return { statusCode: 401, body: "Unauthorized: invalid token." };
  }

  if (!data.product_id) {
    return { statusCode: 400, body: "product_id is required." };
  }

  const { data: product, error: productErr } = await supabase
    .from("user_products")
    .select("id, seller_id")
    .eq("id", data.product_id)
    .single();

  if (productErr || !product) {
    return { statusCode: 404, body: "Produit pa jwenn." };
  }

  if (product.seller_id !== currentUser.user.id) {
    return { statusCode: 403, body: "Ou pa otorize pou voye notifikasyon sa." };
  }

  const { data: subs, error: subErr } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (subErr) {
    console.error("Failed to load subscriptions:", subErr);
    return { statusCode: 500, body: "Pa ka jwenn abonnés notifikasyon." };
  }

  if (!subs || subs.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ sent: 0, message: "Pa gen abonnés pou voye notifikasyon." }),
    };
  }

  const template = TEMPLATES[type](data);
  const payload = JSON.stringify({
    title: template.title,
    body: template.body,
    type,
    data: { ...data, click_url: `https://boutique-piyay.netlify.app${template.click_url}` },
  });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: 86400 }
      )
    )
  );

  const failedEndpoints = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const statusCode = result.reason?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        failedEndpoints.push(subs[index].endpoint);
      }
    }
  });

  if (failedEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", failedEndpoints);
  }

  const sent = results.filter((result) => result.status === "fulfilled").length;
  return {
    statusCode: 200,
    body: JSON.stringify({ sent, failed: results.length - sent }),
  };
};
