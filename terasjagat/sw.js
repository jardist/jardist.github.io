// Versi cache (mobile, ?m=1, gambar otomatis)
const CACHE_NAME = 'tj-v13';

const PRE_CACHE_ASSETS = [
  'https://www.terasjagat.id/manifest.json',
  'https://www.terasjagat.id/assets/js/tailwind430.js',
  'https://www.terasjagat.id/assets/css/awesome730.css'
];

// ======================
// INSTALL
// ======================
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRE_CACHE_ASSETS))
      .catch(err => console.error('[SW] Pre-cache error:', err))
  );
  self.skipWaiting();
});

// ======================
// ACTIVATE + PRE-CACHE /?m=1
// ======================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    (async () => {
      // Hapus cache lama
      const keys = await caches.keys();
      await Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        }
      }));

      // Pre-cache halaman utama mobile
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
  self.clients.claim();
});

// ======================
// FETCH
// ======================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.pathname.includes('sw.js')) return;

  // 🧭 Navigasi: cache hanya jika final URL mengandung ?m=1
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
        // Offline: jika root "/", layani /?m=1 dari cache
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

  // 📦 File statis + GAMBAR (berdasarkan destination & ekstensi)
  const isStatic =
    PRE_CACHE_ASSETS.includes(request.url) ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.ico') ||
    // Gambar (destination + ekstensi sebagai fallback)
    request.destination === 'image' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.gif');

  if (!isStatic) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true })
      .then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          // Terima opaque response (status 0) untuk cross-origin
          if (!response || (response.status !== 200 && response.status !== 0)) {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone).catch(err => {
              console.warn('[SW] Gagal cache:', request.url, err);
            });
          });
          return response;
        }).catch(() => caches.match(request, { ignoreSearch: true }));
      })
      .catch(() => new Response('', { status: 503 }))
  );
});

// Halaman offline
function getOfflinePage() {
  const offlineHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anda Offline - TerasJagat</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 15% 5%; color: #333; background: #f9f9f9; }
    h1 { font-size: 1.5rem; margin-bottom: 10px; }
    p { color: #666; margin-bottom: 25px; line-height: 1.5; }
    .btn { display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; }
  </style>
</head>
<body>
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 15px;"><path d="M10.74 5.09A6 6 0 0 1 21.03 12m-2.43 2.12a6 6 0 0 1-10.9-4.8M1.93 1.93l20.14 20.14"/></svg>
  <h1>Anda Sedang Offline</h1>
  <p>Halaman ini belum tersimpan di perangkat Anda.<br>Silakan nyalakan koneksi internet untuk membaca.</p>
  <a href="javascript:window.location.reload()" class="btn">Coba Muat Ulang</a>
</body>
</html>`;
  return new Response(offlineHtml, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Push & Notification (tidak berubah)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  let data = { title: 'TerasJagat', body: 'Update terbaru tersedia.', url: '/' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://www.terasjagat.id/favicon.ico',
      badge: 'https://www.terasjagat.id/favicon.ico',
      data: { url: data.url },
      vibrate: [100, 50, 100],
      tag: 'tj-notif',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (let client of clientList) {
          if (client.url === targetUrl && 'focus' in client) return client.focus();
        }
        return clients.openWindow(targetUrl);
      })
  );
});
