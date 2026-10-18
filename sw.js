const CACHE_NAME = 'piyay-v3';
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/images/logo.png',
  '/assets/images/pwa-192.png',
  '/assets/images/pwa-512.png'
];

const TYPE_ICONS = {
  new_product: '/assets/images/pwa-192.png',
  product_updated: '/assets/images/pwa-192.png',
};

const TYPE_ACTIONS = {
  new_product: [{ action: 'view', title: 'Wè pwodwi' }],
  product_updated: [{ action: 'view', title: 'Wè pwodwi' }],
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      const oldCaches = keys.filter((key) => key.startsWith('piyay-') && key !== CACHE_NAME);
      return Promise.all(oldCaches.map((key) => caches.delete(key)));
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
    icon: TYPE_ICONS[type] ?? '/assets/images/pwa-192.png',
    badge: '/assets/images/pwa-192.png',
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

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const offlinePage = await caches.match('/offline.html');
        return offlinePage ?? Response.error();
      })
    );
    return;
  }

  if (!['style', 'script', 'image', 'font'].includes(request.destination)) return;

  const cacheKey = `${requestUrl.origin}${requestUrl.pathname}`;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(cacheKey);

      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          event.waitUntil(cache.put(cacheKey, response.clone()));
        }
        return response;
      } catch (error) {
        if (cachedResponse) return cachedResponse;
        throw error;
      }
    })
  );
});
