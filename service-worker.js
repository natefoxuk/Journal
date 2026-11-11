
/* Journal offline support — version 10.
   Navigation uses the saved app shell first to avoid waiting for a stalled network.
   Entries and photos stored by the app are not modified by this worker. */

const CACHE_NAME = 'journal-app-v10';

const APP_SHELL = ['./index.html'];

const OPTIONAL_FILES = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  ...Array.from(
    { length: 24 },
    (_, i) =>
      `./artwork/artwork-${String(i + 1).padStart(2, '0')}.jpg`
  )
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Only the entry page is required;
    // optional images cannot break installation.
    await cache.addAll(APP_SHELL);

    await Promise.allSettled(
      OPTIONAL_FILES.map(async path => {
        try {
          const response = await fetch(path);
          if (response.ok) {
            await cache.put(path, response);
          }
        } catch (_) {
          // Optional asset unavailable.
        }
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();

    await Promise.all(
      names
        .filter(
          name =>
            name.startsWith('journal-app-') &&
            name !== CACHE_NAME
        )
        .map(name => caches.delete(name))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match('./index.html');

      if (cached) return cached;

      try {
        const response = await fetch(event.request);

        if (response.ok) {
          await cache.put(
            './index.html',
            response.clone()
          );
        }

        return response;
      } catch (_) {
        return Response.error();
      }
    })());

    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);

    if (cached) return cached;

    try {
      const response = await fetch(event.request);

      if (response.ok) {
        await cache.put(
          event.request,
          response.clone()
        );
      }

      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
