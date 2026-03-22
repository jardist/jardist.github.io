importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// 🔥 CONFIG FIREBASE (ISI PUNYA KAMU)
firebase.initializeApp({
    apiKey: "AIzaSyCxMWBYV9RUWdLDlZQoXyQIE2lBOGRUw5g",
    authDomain: "ansor-notif.firebaseapp.com",
    projectId: "ansor-notif",
    messagingSenderId: "791336805563",
    appId: "1:791336805563:web:50b54d51b721112ffaf59e"  
});

// 🔥 INIT MESSAGING
const messaging = firebase.messaging();

// ======================
// BACKGROUND NOTIFICATION
// ======================
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Background message ', payload);

  const title = payload.notification.title || 'Notifikasi';
  const options = {
    body: payload.notification.body || 'Ada update baru',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: payload.notification.click_action || '/'
    },
    vibrate: [100, 50, 100],
    tag: 'firebase-notif'
  };

  self.registration.showNotification(title, options);
});

// ======================
// CLICK NOTIFICATION
// ======================
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const targetUrl = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (let client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});
