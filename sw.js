/* Azores Portuguese — offline service worker
   Caches the page so it works with no signal once visited.
   Bump CACHE_VERSION whenever index.html changes to force an update. */

const CACHE_VERSION = 'azores-pt-v1';

// Files to pre-cache. './' covers the page when opened at the folder root
// (e.g. https://you.github.io/azores/), and 'index.html' covers the
// explicit filename — caching both keeps it robust either way.
const PRECACHE = ['./', 'index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => { /* if one path 404s, the other still caches */ })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET navigations/assets from our own origin.
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache same-origin successful responses for next time (offline).
          if (res && res.ok && new URL(req.url).origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => {
          // Offline and not cached: for a navigation, fall back to the page.
          if (req.mode === 'navigate') {
            return caches.match('index.html') || caches.match('./');
          }
        });
    })
  );
});
