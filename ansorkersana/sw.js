const CACHE_NAME = 'ansor-static-v4';
const PRE_CACHE_ASSETS = [
  'https://www.ansorkersana.or.id/assets/css/tailwind.min.css',
  'https://www.ansorkersana.or.id/assets/css/daisyui.full.css',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap'
];

// ======================
// INSTALL
// ======================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching assets');
        return cache.addAll(PRE_CACHE_ASSETS);
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err);
      })
  );

  self.skipWaiting();
});

// ======================
// ACTIVATE
// ======================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');

  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// ======================
// FETCH (Cache Strategy)
// ======================
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  const isStatic =
    PRE_CACHE_ASSETS.includes(event.request.url) ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2');

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200) return response;

            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });

            return response;
          })
          .catch(() => {
            return caches.match(event.request);
          });
      })
    );
  }
});

// ======================
// PUSH NOTIFICATION
// ======================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'Ansor Kersana',
    body: 'Update terbaru tersedia.',
    url: '/'
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://www.ansorkersana.or.id/favicon.ico',
      badge: 'https://www.ansorkersana.or.id/favicon.ico',
      data: {
        url: data.url
      },
      vibrate: [100, 50, 100],
      tag: 'ansor-notif'
    })
  );
});

// ======================
// CLICK NOTIFICATION
// ======================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  const targetUrl = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
