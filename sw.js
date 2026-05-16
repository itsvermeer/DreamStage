self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('dreamstage-v1').then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './css/overlay.css',
        './js/main.js',
        // add other essential files
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});