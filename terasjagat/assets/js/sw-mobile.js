// sw-mobile.js III

self.addEventListener('install', performInstall);

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await clearOldCaches();
      // Pre-cache halaman utama mobile dengan key bersih
      try {
        const response = await fetch('https://www.terasjagat.id/?m=1', { cache: 'no-store' });
        if (response.ok && !response.redirected) {
          const cache = await caches.open(CACHE_NAME);
          // Key sudah bersih: hanya ?m=1
          await cache.put('https://www.terasjagat.id/?m=1', response.clone());
          console.log('[SW] Pre-cached /?m=1 (clean)');
        }
      } catch (err) {
        console.warn('[SW] Pre-cache /?m=1 gagal:', err);
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
        const finalURL = new URL(networkResponse.url || request.url);
        // Hanya cache jika ada parameter m=1
        if (finalURL.searchParams.get('m') === '1' &&
            networkResponse.status >= 200 && networkResponse.status < 300) {

          // Buat kunci cache bersih: origin + pathname + '?m=1'
          const cacheKey = finalURL.origin + finalURL.pathname + '?m=1';

          let responseToCache;
          if (networkResponse.redirected) {
            const cloned = networkResponse.clone();
            responseToCache = new Response(cloned.body, {
              headers: cloned.headers,
              status: cloned.status,
              statusText: cloned.statusText
            });
          } else {
            responseToCache = networkResponse.clone();
          }

          caches.open(CACHE_NAME).then(cache => {
            cache.put(cacheKey, responseToCache).catch(err =>
              console.warn('[SW] Cache put error:', err)
            );
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline: root "/" → coba /?m=1
        if (url.pathname === '/' && !url.search) {
          return caches.match('https://www.terasjagat.id/?m=1', { ignoreSearch: true })
            .then(cached => cached || getOfflinePage())
            .catch(() => getOfflinePage());
        }
        // Untuk URL lain, gunakan ignoreSearch agar cocok dengan key bersih yang kita simpan
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
