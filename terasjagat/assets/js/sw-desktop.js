// sw-desktop.js - Service worker untuk desktop (tanpa ?m=1)

self.addEventListener('install', performInstall);

self.addEventListener('activate', performActivate);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.pathname.includes('sw.js')) return;

  // Navigasi: cache semua halaman HTML (tanpa syarat ?m=1)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(networkResponse => {
        // Simpan hanya jika bukan redirect (status 3xx) dan status 200
        if (networkResponse.status >= 200 && networkResponse.status < 300 && !networkResponse.redirected) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, cloned).catch(err =>
              console.warn('[SW] Cache put error:', err)
            );
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline: coba dari cache
        return caches.match(request, { ignoreSearch: true })
          .then(cached => cached || getOfflinePage())
          .catch(() => getOfflinePage());
      })
    );
    return;
  }

  // Static & gambar
  if (isStaticOrImage(request)) {
    event.respondWith(cacheStaticOrImage(request));
  }
});

self.addEventListener('push', handlePush);
self.addEventListener('notificationclick', handleNotificationClick);
