const CACHE_NAME = 'ansor-static-v3';
const PRE_CACHE_ASSETS = [
  'https://www.ansorkersana.or.id/assets/css/tailwind.min.css',
  'https://www.ansorkersana.or.id/assets/css/daisyui.full.css',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap'
];

// Helper untuk cek ketersediaan Cache API
const isCacheAvailable = () => typeof caches !== 'undefined';

self.addEventListener('install', (event) => {
  if (isCacheAvailable()) {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Caching assets...');
        return cache.addAll(PRE_CACHE_ASSETS);
      }).catch(err => console.error('Cache Open Error:', err))
    );
  }
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (isCacheAvailable()) {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        }));
      })
    );
  }
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isStatic = PRE_CACHE_ASSETS.includes(event.request.url) || url.pathname.endsWith('.css') || url.pathname.endsWith('.js');

  if (isStatic && isCacheAvailable()) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((netRes) => {
          if (netRes.status === 200) {
            const clone = netRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return netRes;
        });
      }).catch(() => fetch(event.request))
    );
  }
});

// PUSH NOTIFICATION (Tetap di luar cek cache karena tidak butuh Cache API)
self.addEventListener('push', (event) => {
  let data = { title: 'Ansor Kersana', body: 'Update terbaru tersedia.', url: '/' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: data.url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
