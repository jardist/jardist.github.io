// sw-desktop.js II

self.addEventListener('install', performInstall);

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Bersihkan cache lama
      await clearOldCaches();

      // Pre-cache halaman utama desktop (tanpa ?m=1)
      try {
        const response = await fetch('https://www.terasjagat.id/', { cache: 'no-store' });
        if (response.ok && !response.redirected) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('https://www.terasjagat.id/', response.clone());
          console.log('[SW] Pre-cached / (desktop)');
        }
      } catch (err) {
        console.warn('[SW] Pre-cache / gagal:', err);
      }

      // Klaim klien
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.pathname.includes('sw.js')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(networkResponse => {
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
        return caches.match(request, { ignoreSearch: true })
          .then(cached => cached || getOfflinePage())
          .catch(() => getOfflinePage());
      })
    );
    return;
  }

  if (isStaticOrImage(request)) {
    event.respondWith(cacheStaticOrImage(request));
  }
});

self.addEventListener('push', handlePush);
self.addEventListener('notificationclick', handleNotificationClick);
