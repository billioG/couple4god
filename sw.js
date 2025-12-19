const CACHE_NAME = 'couple-garden-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/auth.js',
  './js/challenges.js',
  './js/config.js',
  './js/gamification.js'
];

// Instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Activación
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones (Offline first)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// Preparado para Notificaciones Push
self.addEventListener('push', function(event) {
  const title = 'Couple Garden';
  const options = {
    body: event.data ? event.data.text() : '¡Tienes una novedad en tu relación!',
    icon: 'https://cdn-icons-png.flaticon.com/512/616/616490.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/616/616490.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
