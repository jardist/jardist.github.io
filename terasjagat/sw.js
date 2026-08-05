// Versi cache — naikkan setiap perubahan
const CACHE_NAME = 'tj-v9-final'; // v9: stop caching HTML to prevent redirect loop

// Aset statis yang akan di-pre-cache
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
      .then(cache => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(PRE_CACHE_ASSETS);
      })
      .catch(err => console.error('[SW] Pre-cache error:', err))
  );
  self.skipWaiting();
});

// ======================
// ACTIVATE
// ======================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        }
      })
    ))
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

  // 🧭 Navigasi (halaman HTML) -> TIDAK disimpan ke cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => response) // langsung kembalikan respons, tanpa simpan
        .catch(() => {
          // OFFLINE: langsung tampilkan halaman offline buatan
          console.log('[SW] Offline, tampilkan halaman offline');
          return getOfflinePage();
        })
    );
    return;
  }

  // 📦 File statis -> Cache First, Network Fallback
  const isStatic =
    PRE_CACHE_ASSETS.includes(request.url) ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico');

  if (!isStatic) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true })
      .then(cached => {
        if (cached) return cached;

        return fetch(request)
          .then(response => {
            if (!response || (response.status !== 200 && response.status !== 0)) {
              return response;
            }
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            return response;
          })
          .catch(() => caches.match(request, { ignoreSearch: true }))
      })
      .catch(() => new Response('', { status: 503 }))
  );
});

// ======================
// HALAMAN OFFLINE BUATAN
// ======================
function getOfflinePage() {
  const offlineHtml = `
<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Offline - TerasJagat.ID</title>
<style>body{font-family:system-ui,sans-serif;padding:0;margin:0;background:#000;position:relative;width:100%;height:100vh;color:#333;background:#f9f9f9}div{display:flex;width:100%;text-align:center;height:auto;position:absolute;gap:15px;max-width:357px;top:calc(50% - 20px);margin:20px;left:calc(50% - 20px);transform:translate(-50%, -50%);flex-direction:column;align-items:center}svg{width:100%;max-width:70px}a svg{max-width:20px}h1{font-size:1.5rem;margin:0}p{color:#666;line-height:1.5;margin:0}a{display:flex;padding:10px 20px 12px 20px;background:#13634b;color:#fff;text-decoration:none;border-radius:999px;font-weight:bold}</style></head><body>
<div><svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M73 39.1C63.6 29.7 48.4 29.7 39.1 39.1C29.8 48.5 29.7 63.7 39 73.1L567 601.1C576.4 610.5 591.6 610.5 600.9 601.1C610.2 591.7 610.3 576.5 600.9 567.2L478.9 445.2C483.1 441.8 487.2 438.1 491 434.3L562.1 363.2C591.4 333.9 607.9 294.1 607.9 252.6C607.9 166.2 537.9 96.1 451.4 96.1C414.1 96.1 378.3 109.4 350.1 133.3C370.4 143.4 388.8 156.8 404.6 172.8C418.7 164.5 434.8 160.1 451.4 160.1C502.5 160.1 543.9 201.5 543.9 252.6C543.9 277.1 534.2 300.6 516.8 318L445.7 389.1C441.8 393 437.6 396.5 433.1 399.6L385.6 352.1C402.1 351.2 415.3 337.7 415.8 321C415.8 319.7 415.8 318.4 415.8 317.1C415.8 230.8 345.9 160.2 259.3 160.2C240.1 160.2 221.4 163.7 203.8 170.4L73 39.1zM257.9 224C258.5 224 259 224 259.6 224C274.7 224 289.1 227.7 301.7 234.2C303.5 235.4 305.3 236.5 307.2 237.3C334 253.6 352 283.2 352 316.9C352 317.3 352 317.7 352 318.1L257.9 224zM378.2 480L224 325.8C225.2 410.4 293.6 478.7 378.1 479.9zM171.7 273.5L126.4 228.2L77.8 276.8C48.5 306.1 32 345.9 32 387.4C32 473.8 102 543.9 188.5 543.9C225.7 543.9 261.6 530.6 289.8 506.7C269.5 496.6 251 483.2 235.2 467.2C221.2 475.4 205.1 479.8 188.5 479.8C137.4 479.8 96 438.4 96 387.3C96 362.8 105.7 339.3 123.1 321.9L171.7 273.3z"/></svg><h1>Anda Sedang Offline</h1><p>Halaman ini belum tersimpan di perangkat Anda.<br>Silakan nyalakan koneksi internet untuk membaca.</p><a href="javascript:window.location.reload()" class="btn"><svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M552 256L408 256C398.3 256 389.5 250.2 385.8 241.2C382.1 232.2 384.1 221.9 391 215L437.7 168.3C362.4 109.7 253.4 115 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C233.3 44.7 382.7 39.4 483.3 122.8L535 71C541.9 64.1 552.2 62.1 561.2 65.8C570.2 69.5 576 78.3 576 88L576 232C576 245.3 565.3 256 552 256z"/></svg>oba Muat Ulang</a></div></body></html>
`;
  return new Response(offlineHtml, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// ======================
// PUSH & NOTIFICATION (tidak diubah)
// ======================
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
