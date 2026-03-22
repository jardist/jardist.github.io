const CACHE_NAME = 'ansor-cache-v9'; // Naikkan versi untuk refresh
const PRE_CACHE_ASSETS = [
  'https://www.ansorkersana.or.id/assets/css/tailwind.min.css',
  'https://www.ansorkersana.or.id/assets/css/daisyui.full.css',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap'
];

// 1. Event Install - Simpan aset ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets...');
      return cache.addAll(PRE_CACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Event Activate - Hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Event Fetch - Strategi Cache First / Network Fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!url.protocol.startsWith('http')) return;
  if (event.request.method !== 'GET') return;
  if (url.pathname.includes('cdn-cgi/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then((networkResponse) => {
        // Hanya simpan ke cache jika respon valid (status 200 atau 0 untuk opaque/CDN)
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Jika gagal (offline), coba fallback ke navigasi utama
        if (event.request.mode === 'navigate') {
          return caches.match('/') || caches.match('/?m=1');
        }
      });
    })
  );
});

// 4. PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  let data = { 
    title: 'Update Baru', 
    body: 'Cek kabar terbaru dari Ansor Kersana!',
    url: '/'
  };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://www.ansorkersana.or.id/favicon.ico',
    badge: 'https://www.ansorkersana.or.id/favicon.ico',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === event.notification.data.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url);
    })
  );
});
