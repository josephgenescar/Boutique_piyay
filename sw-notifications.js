// ============================================================
//  PiyayChat — Service Worker (sw-notifications.js)
//  Mete nan public/ — jere notifikasyon background
//  PAS GEN FIREBASE — Web Push API natif sèlman
// ============================================================

const CACHE_NAME = "piyaychat-v1";
const CACHE_FILES = ["/", "/index.html", "/icons/icon-192.png", "/icons/badge-72.png"];

// ── Ikonn pa tip ────────────────────────────────────────────
const TYPE_ICONS = {
  new_order:          "/icons/order.png",
  order_confirmed:    "/icons/confirmed.png",
  order_delivered:    "/icons/delivered.png",
  delivery_coming:    "/icons/delivery.png",
  commission_earned:  "/icons/commission.png",
  payment_received:   "/icons/payment.png",
  new_message:        "/icons/chat.png",
  flash_sale:         "/icons/flash.png",
  withdrawal_success: "/icons/wallet.png",
};

// ── Aksyon pa tip ────────────────────────────────────────────
const TYPE_ACTIONS = {
  new_order:       [{ action: "view",    title: "📋 Wè Kòmand" }, { action: "later", title: "Pita" }],
  delivery_coming: [{ action: "track",   title: "🗺️ Swiv Livrè" }],
  new_message:     [{ action: "reply",   title: "💬 Reponn" }],
  flash_sale:      [{ action: "buy",     title: "⚡ Achte Kounye a" }],
};

// ── Enstale ak cache fichye ──────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Resevwa notifikasyon push (app fèmen) ────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Boutique Piyay", body: event.data.text(), type: "general" };
  }

  const { title, body, type, data = {} } = payload;

  const options = {
    body: body ?? "",
    icon: TYPE_ICONS[type] ?? "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: type ?? "general",
    data: { url: data.click_url ?? "https://boutique-piyay.netlify.app", ...data },
    actions: TYPE_ACTIONS[type] ?? [],
    requireInteraction: ["new_order", "delivery_coming"].includes(type),
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(title ?? "Boutique Piyay", options)
  );
});

// ── Klike sou notifikasyon ───────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "https://boutique-piyay.netlify.app";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si app la deja ouvè — ba li fokis
        for (const client of clientList) {
          if (client.url.includes("boutique-piyay") && "focus" in client) {
            client.focus();
            client.postMessage({ type: "NOTIFICATION_CLICK", url });
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

// ── Cache pou oflayn ─────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
