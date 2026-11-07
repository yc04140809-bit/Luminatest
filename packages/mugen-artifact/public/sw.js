// MUGEN ZERO offline shell.
// Caches game ASSETS only. WORLD MEMORY lives in IndexedDB and is never
// touched here — a cache purge must never cost a player their world.

const CACHE = 'mugen-zero-shell-v1';

self.addEventListener('install', (event) => {
  // Take over promptly; the app shell is small.
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      // Precache the entry document so the very next start works offline
      // even if the player never reloads while online.
      const cache = await caches.open(CACHE);
      await cache.addAll(['./', './index.html']).catch(() => {});
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop only OUR older shell caches. IndexedDB is untouched.
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('mugen-zero-shell-') && n !== CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first so an update is picked up, cache as the
  // offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await caches.match(request);
          return cached ?? (await caches.match('./index.html')) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Static assets: cache first (they are content-hashed by Vite).
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return cached ?? Response.error();
      }
    })(),
  );
});
