
/* Journal offline support — version 7.
   Navigation uses the saved app shell first to avoid waiting for a stalled network.
   Entries and photos stored by the app are not modified by this worker. */

const CACHE_NAME = 'journal-app-v7';

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

// Install the service worker and cache the Journal page.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Only the main page is required for installation.
    await cache.addAll(APP_SHELL);

    // Optional images cannot prevent installation.
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

// Activate the new worker and remove old app caches.
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

  // Only handle requests from Journal's own website.
  if (url.origin !== self.location.origin) return;

  // Open the saved Journal page immediately when available.
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

  // Load cached images and other files where possible.
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
