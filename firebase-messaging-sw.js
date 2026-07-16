importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Duplicated from index.html's FIREBASE_CONFIG — service workers can't import
// from the main script, so this literal must be kept in sync by hand if the
// Firebase project config ever changes.
firebase.initializeApp({
  apiKey: "AIzaSyBew3tqZ2obdi3o86FHZXhhEe4HHLSAWsE",
  authDomain: "www.showupapp.io",
  databaseURL: "https://show-up-33b6a-default-rtdb.firebaseio.com",
  projectId: "show-up-33b6a",
  storageBucket: "show-up-33b6a.firebasestorage.app",
  messagingSenderId: "631975241080",
  appId: "1:631975241080:web:483fce00a0ee5563c4d48d"
});

const messaging = firebase.messaging();

// Fires when a push arrives while no tab has focus. The foreground case
// (a tab is open and focused) is handled separately by onMessage() in
// index.html — FCM suppresses this handler in that case.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Show Up';
  const body = payload.notification?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/icon.svg',
    tag: payload.data?.tag || 'show-up-notification',
  });
});
