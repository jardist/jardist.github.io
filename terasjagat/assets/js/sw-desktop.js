// sw-desktop.js III

self.addEventListener('install', performInstall);

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await clearOldCaches();
      // Pre-cache halaman utama dengan key bersih (tanpa query)
      try {
        const response = await fetch('https://www.terasjagat.id/', { cache: 'no-store' });
        if (response.ok && !response.redirected) {
          const cache = await caches.open(CACHE_NAME);
          const cleanURL = 'https://www.terasjagat.id/'; // sudah bersih
          await cache.put(cleanURL, response.clone());
          console.log('[SW] Pre-cached / (desktop, clean URL)');
        }
      } catch (err) {
        console.warn('[SW] Pre-cache / gagal:', err);
      }
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
          // Dapatkan URL final (setelah redirect)
          const finalURL = new URL(networkResponse.url || request.url);
          // Buat kunci cache bersih: origin + pathname (tanpa query)
          const cacheKey = finalURL.origin + finalURL.pathname;

          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(cacheKey, cloned).catch(err =>
              console.warn('[SW] Cache put error:', err)
            );
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline: coba cari dengan ignoreSearch agar tetap cocok
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
