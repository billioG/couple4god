const CACHE_NAME = "c4g-v5-fix"; // Cambiamos versión para limpiar caché
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js"];

self.addEventListener("install", (e) => {
  self.skipWaiting(); // Obliga a instalarse de inmediato
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key); // Borra caché vieja
        })
      );
    })
  );
  self.clients.claim(); // Toma control inmediato
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
