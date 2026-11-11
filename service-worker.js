
/* Journal offline support — version 8.
   Navigation uses the saved app shell first.
   Journal entries and photos are not modified.
*/

const CACHE_NAME = 'journal-app-v8';

const APP_SHELL = [
  './index.html'
];

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

// Install the updated Journal.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    await cache.addAll(APP_SHELL);

    // Missing artwork cannot prevent installation.
    await Promise.allSettled(
      OPTIONAL_FILES.map(async path => {
        try {
          const response = await fetch(path);

          if (response.ok) {
            await cache.put(path, response);
          }
        } catch (_) {
          // Optional file unavailable.
        }
      })
    );

    await self.skipWaiting();
  })());
});

// Activate the update and remove old app caches.
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

// Handle Journal requests.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  // Open the cached Journal immediately.
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match('./index.html');

      if (cached) {
        return cached;
      }

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

  // Use saved artwork and other static files.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);

    if (cached) {
      return cached;
    }

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
