const CACHE_NAME = 'piyay-v2'; // Chanje vèsyon pou fòse update
const ASSETS = [
  '/',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/images/logo.png'
];

const TYPE_ICONS = {
  new_product: '/icons/icon-192.png',
  product_updated: '/icons/icon-192.png',
};

const TYPE_ACTIONS = {
  new_product: [{ action: 'view', title: 'Wè pwodwi' }],
  product_updated: [{ action: 'view', title: 'Wè pwodwi' }],
};

// Install: Sere asèt yo
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Fòse nouvo SW la pran plas imedyatman
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: Netwaye vye kach
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Boutique Piyay', body: event.data.text(), type: 'general' };
  }

  const { title, body, type, data = {} } = payload;
  const options = {
    body: body ?? '',
    icon: TYPE_ICONS[type] ?? '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: type ?? 'general',
    data: { url: data.click_url ?? 'https://boutique-piyay.netlify.app', ...data },
    actions: TYPE_ACTIONS[type] ?? [],
    requireInteraction: ['new_product', 'product_updated'].includes(type),
    vibrate: [200, 100, 200],
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title ?? 'Boutique Piyay', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? 'https://boutique-piyay.netlify.app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('boutique-piyay') && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Fetch: Lojik "Network First" (Chèche nan entènèt anvan)
self.addEventListener('fetch', (event) => {
  // Nou pa sere apèl Supabase yo nan kach
  if (event.request.url.includes('supabase.co')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Si entènèt mache, nou sere yon kopi nan kach la
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request)) // Si pa gen entènèt, pran nan kach
  );
});
