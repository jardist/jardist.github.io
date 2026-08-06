// sw-mobile.js - Service worker untuk perangkat mobile (fokus ?m=1)

self.addEventListener('install', performInstall);

self.addEventListener('activate', (event) => {
  // Panggil aktivasi umum, lalu pre-cache halaman utama mobile
  performActivate(event);
  event.waitUntil(
    (async () => {
      // Pre-cache /?m=1
      try {
        const response = await fetch('https://www.terasjagat.id/?m=1', { cache: 'no-store' });
        if (response.ok && !response.redirected) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('https://www.terasjagat.id/?m=1', response.clone());
          console.log('[SW] Pre-cached /?m=1');
        }
      } catch (err) {
        console.warn('[SW] Pre-cache /?m=1 gagal:', err);
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.pathname.includes('sw.js')) return;

  // Navigasi: hanya cache jika final URL mengandung ?m=1
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(networkResponse => {
        const finalURL = new URL(networkResponse.url || request.url);
        if (finalURL.searchParams.get('m') === '1' &&
            networkResponse.status >= 200 && networkResponse.status < 300) {

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
            cache.put(finalURL.href, responseToCache).catch(err =>
              console.warn('[SW] Cache put error:', err)
            );
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline
        if (url.pathname === '/' && !url.search) {
          return caches.match('https://www.terasjagat.id/?m=1', { ignoreSearch: true })
            .then(cached => cached || getOfflinePage())
            .catch(() => getOfflinePage());
        }
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
