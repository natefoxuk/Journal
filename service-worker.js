
const CACHE_NAME = "journal-app-v6";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  ...Array.from(
    { length: 24 },
    (_, i) => `./artwork/artwork-${String(i + 1).padStart(2, "0")}.jpg`
  )
];

// Install the new service worker and cache Journal's files.
self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_FILES);
      await self.skipWaiting();
    })()
  );
});

// Remove old caches and activate the updated worker.
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(name =>
            name.startsWith("journal-app-") &&
            name !== CACHE_NAME
          )
          .map(name => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

// Fetch fresh pages online, but keep offline access.
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Only handle requests belonging to Journal.
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);

          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, response.clone());
          }

          return response;
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);

          return (
            (await cache.match(event.request)) ||
            (await cache.match("./index.html")) ||
            Response.error()
          );
        }
      })()
    );

    return;
  }

  // Use cached artwork and other static files when available.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);

      if (cached) return cached;

      const response = await fetch(event.request);

      if (response.ok) {
        await cache.put(event.request, response.clone());
      }

      return response;
    })()
  );
});
