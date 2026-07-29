const CACHE_NAME = 'tj-v4'; 

const PRE_CACHE_ASSETS = [
  'https://www.terasjagat.id/',
  'https://www.terasjagat.id/manifest.json',
  'https://www.terasjagat.id/assets/css/tailwind2219min.css',
  'https://www.terasjagat.id/assets/css/daisyui4419min.css'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core assets');
        return cache.addAll(PRE_CACHE_ASSETS);
      })
      .catch((err) => console.error('[SW] Cache failed:', err))
  );

  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {

  if (event.request.method !== 'GET') return;

  const requestURL = new URL(event.request.url);

  if (requestURL.protocol !== 'http:' && requestURL.protocol !== 'https:') return;

  if (requestURL.pathname.includes('sw.js')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {

          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return networkResponse;
        })
        .catch(() => {

          console.log('[SW] Offline mode: Mencari halaman di cache');
          
          return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match('https://www.terasjagat.id/', { ignoreSearch: true });
          });
        })
    );
    return;
  }

  const isStatic =
    PRE_CACHE_ASSETS.includes(event.request.url) ||
    requestURL.pathname.endsWith('.css') ||
    requestURL.pathname.endsWith('.js') ||
    requestURL.pathname.endsWith('.woff2') ||
    requestURL.pathname.endsWith('.png') ||
    requestURL.pathname.endsWith('.svg') ||
    requestURL.pathname.endsWith('.json') ||
    requestURL.pathname.endsWith('.jpg') ||
    requestURL.pathname.endsWith('.webp'); 

  if (!isStatic) return;

  event.respondWith(

    caches.match(event.request, { ignoreSearch: true }).then((cached) => {

      if (cached) return cached; 

      return fetch(event.request)
        .then((response) => {

          if (!response || (response.status !== 200 && response.status !== 0)) {
            return response;
          }

          const clone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });

          return response;
        })
        .catch(() => {
          // Fallback statis jika offline
          return caches.match(event.request, { ignoreSearch: true });
        });

    })
  );
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'TerasJagat',
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
      icon: 'https://www.terasjagat.id/favicon.ico',
      badge: 'https://www.terasjagat.id/favicon.ico',
      data: {
        url: data.url
      },
      vibrate: [100, 50, 100],
      tag: 'tj-notif',
      renotify: true
    })
  );
});

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
