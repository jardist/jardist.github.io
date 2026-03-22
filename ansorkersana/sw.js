const CACHE_NAME = 'ansor-static-v2';
const PRE_CACHE_ASSETS = [
  'https://www.ansorkersana.or.id/assets/css/tailwind.min.css',
  'https://www.ansorkersana.or.id/assets/css/daisyui.full.css',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap'
];

// 1. Install: Simpan aset wajib ke dalam cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets...');
      return cache.addAll(PRE_CACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activate: Bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch: Ambil dari Cache jika ada, jika tidak ambil dari Network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // HANYA CEGAT PERMINTAAN UNTUK ASET STATIS (CSS, JS, FONTS)
  const isStaticAsset = PRE_CACHE_ASSETS.includes(event.request.url) || 
                        url.pathname.endsWith('.css') || 
                        url.pathname.endsWith('.js') ||
                        url.hostname.includes('gstatic.com') ||
                        url.hostname.includes('googleapis.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((networkResponse) => {
          // Simpan ke cache secara dinamis jika belum ada
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
  // Untuk permintaan lain (Halaman blog/HTML), biarkan lewat secara normal (Default browser)
  return;
});

// 4. PUSH NOTIFICATIONS (Tetap Aktif)
self.addEventListener('push', (event) => {
  let data = { title: 'Ansor Kersana', body: 'Ada informasi terbaru.', url: '/' };
  if (event.data) {
    try { data = event.data.json(); } catch (e) { data.body = event.data.text(); }
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
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
