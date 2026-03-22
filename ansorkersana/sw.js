const CACHE_NAME = 'ansor-notification-v1';

// Install & Activate (Sangat sederhana agar tidak merusak loading blog)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Fetch Event (DIBUAT PASIF)
// Kita biarkan permintaan lewat ke jaringan secara normal (Network Only)
// Ini akan memperbaiki masalah "Blog can't be reached"
self.addEventListener('fetch', (event) => {
  return; 
});

// --- FITUR UTAMA: PUSH NOTIFICATIONS ---
self.addEventListener('push', (event) => {
  let data = { 
    title: 'Ansor Kersana', 
    body: 'Ada informasi terbaru untuk Anda.',
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
    clients.openWindow(event.notification.data.url)
  );
});
