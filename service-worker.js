
const CACHE_NAME = "journal-app-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Save the app files for offline use.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cache the main app files.
      await cache.addAll([
        "./",
        "./index.html",
        "./manifest.json"
      ]);

      // Cache icons when they are available.
      for (const icon of [
        "./icons/icon-192.png",
        "./icons/icon-512.png"
      ]) {
        try {
          await cache.add(icon);
        } catch (error) {
          console.log("Icon not available yet:", icon);
        }
      }
    })
  );

  self.skipWaiting();
});

// Remove old versions of the app cache.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// Load cached app files when offline.
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request);
      })
    );
  }
});
