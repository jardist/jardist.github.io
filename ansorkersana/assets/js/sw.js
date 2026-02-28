
        const CACHE_NAME = 'ansor-cache-v7';
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
      
