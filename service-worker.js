/* service-worker.js */
const APP_VERSION = 'v1.0.3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== APP_VERSION) ? caches.delete(k) : null)))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // App shell: cache-first
  if (event.request.mode === 'navigate' || APP_SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
        const copy = resp.clone();
        caches.open(APP_VERSION).then(cache => cache.put(event.request, copy));
        return resp;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // Tile runtime caching – be considerate
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open('tiles-' + APP_VERSION).then(cache =>
        cache.match(event.request).then(res => res || fetch(event.request).then(networkRes => {
          if (networkRes.status === 200) cache.put(event.request, networkRes.clone());
          return networkRes;
        }))
      )
    );
    return;
  }

  // Default: cache, then network
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
