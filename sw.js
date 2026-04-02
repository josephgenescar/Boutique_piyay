const CACHE_NAME = 'piyay-v2'; // Chanje vèsyon pou fòse update
const ASSETS = [
  '/',
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/images/logo.png'
];

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
