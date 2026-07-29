// ✅ 1. Naikkan versi cache agar browser memperbarui sistem
const CACHE_NAME = 'tj-v5'; // Naikkan versi menjadi v5 untuk menimpa yang gagal

// ✅ 2. Tambahkan URL Utama dan Manifest ke dalam pre-cache
// PERBAIKAN: Hapus URL beranda utama dari sini karena menyebabkan error Redirect 302 di Blogger HP
const PRE_CACHE_ASSETS = [
  'https://www.terasjagat.id/manifest.json',
  'https://www.terasjagat.id/assets/css/tailwind2219min.css',
  'https://www.terasjagat.id/assets/css/daisyui4419min.css'
];

// ======================
// INSTALL
// ======================
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
// FETCH (OFFLINE SUPPORT FIXED)
// ======================
self.addEventListener('fetch', (event) => {

  // Hanya proses metode GET
  if (event.request.method !== 'GET') return;

  const requestURL = new URL(event.request.url);

  // Hanya http/https
  if (requestURL.protocol !== 'http:' && requestURL.protocol !== 'https:') return;

  // Jangan handle service worker sendiri
  if (requestURL.pathname.includes('sw.js')) return;


  // ✅ STRATEGI A: Tangani Request HTML / Navigasi Halaman
  // Menggunakan strategi "Network First, Fallback to Cache"
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // PERBAIKAN: Jika online, simpan halaman yang dibuka ke cache 
          // (Berguna agar artikel yang pernah dibaca bisa dibuka saat offline)
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
          return networkResponse;
        })
        .catch(() => {
          // Jika offline (fetch gagal)
          console.log('[SW] Offline mode: Mencari halaman di cache');
          
          // 1. Coba berikan halaman artikel yang diminta dari cache (jika pernah dibaca)
          return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // 2. ULTIMATE FAILSAFE: Jika halaman belum pernah dibaca, berikan UI Offline Buatan Sendiri
            // Mencegah munculnya icon dinosaurus atau layar offline bawaan browser HP
            const offlineHtml = `
              <!DOCTYPE html>
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
              </html>
            `;
            
            return new Response(offlineHtml, {
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return; // Stop eksekusi di sini untuk navigasi
  }


  // ✅ STRATEGI B: Tangani Request File Statis
  // Menggunakan strategi "Cache First, Fallback to Network"
  const isStatic =
    PRE_CACHE_ASSETS.includes(event.request.url) ||
    requestURL.pathname.endsWith('.css') ||
    requestURL.pathname.endsWith('.js') ||
    requestURL.pathname.endsWith('.woff2') ||
    requestURL.pathname.endsWith('.png') ||
    requestURL.pathname.endsWith('.svg') ||
    requestURL.pathname.endsWith('.json') ||
    requestURL.pathname.endsWith('.jpg') || // Tambahan untuk gambar jpg
    requestURL.pathname.endsWith('.webp');  // Tambahan untuk gambar webp (format modern)

  if (!isStatic) return;

  event.respondWith(
    // PERBAIKAN: Tambahkan ignoreSearch pada file statis, jaga-jaga ada query string seperti ?v=1.0
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {

      if (cached) return cached; // Jika ada di cache, langsung berikan

      // Jika tidak ada di cache, ambil dari internet
      return fetch(event.request)
        .then((response) => {

          // PERBAIKAN: Hapus validasi response.type !== 'basic' 
          // Agar file statis dari CDN eksternal (seperti Google Fonts/Blogger image host) bisa tersimpan.
          // Hanya tolak jika status bukan 200 (OK) dan bukan 0 (Opaque response untuk resource cross-origin).
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

// ======================
// PUSH NOTIFICATION
// ======================
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
