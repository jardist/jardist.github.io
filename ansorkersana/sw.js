const CACHE_NAME = 'ansor-cache-v8';
const PRE_CACHE_ASSETS = [
  'https://www.ansorkersana.or.id/assets/css/tailwind.min.css',
  'https://www.ansorkersana.or.id/assets/css/daisyui.full.css',
  'https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!url.protocol.startsWith('http')) return;
  if (event.request.method !== 'GET') return;
  if (url.pathname.includes('cdn-cgi/')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // JIKA OFFLINE: Cari di cache, jika tidak ada berikan fallback beranda
          return caches.match(event.request) || caches.match('/') || caches.match('/?m=1');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      const isImage = event.request.destination === 'image' || 
                      url.hostname.includes('googleusercontent.com') || 
                      url.hostname.includes('blogspot.com');

      return fetch(event.request, { mode: isImage ? 'no-cors' : 'cors' })
        .then((networkResponse) => {
          // Simpan ke cache jika respon valid atau image (status 0)
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
          return networkResponse;
        }).catch(() => {

        });
    })
  );
});

// --- KODE BARU: PUSH NOTIFICATIONS ---

// Listener untuk menerima pesan push dari backend/server
self.addEventListener('push', (event) => {
  // Data default jika payload kosong
  let data = { 
    title: 'Update Baru', 
    body: 'Cek kabar terbaru dari Ansor Kersana!',
    url: '/'
  };
  
  // Jika ada data payload dari server, gunakan data tersebut
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // Fallback jika data bukan JSON
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://www.ansorkersana.or.id/favicon.ico', // Ikon notifikasi (pastikan URL valid)
    badge: 'https://www.ansorkersana.or.id/favicon.ico', // Ikon kecil di status bar (biasanya transparan putih)
    vibrate: [100, 50, 100], // Getaran HP
    data: {
      url: data.url || '/' // URL tujuan saat notifikasi diklik
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Listener saat notifikasi diklik oleh user
self.addEventListener('notificationclick', (event) => {
  // Tutup notifikasi setelah diklik
  event.notification.close();

  // Buka URL yang disematkan pada data notifikasi
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Cek apakah tab/window dengan URL tersebut sudah terbuka
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika belum terbuka, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
