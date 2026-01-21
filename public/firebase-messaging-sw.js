importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyC5zBiLm_0cE7IwgAzYtBnq533oLwsazTY",
  authDomain: "realtime-chat-app-a3b39.firebaseapp.com",
  projectId: "realtime-chat-app-a3b39",
  storageBucket: "realtime-chat-app-a3b39.firebasestorage.app",
  messagingSenderId: "1012260686994",
  appId: "1:1012260686994:web:e9378dcd9e426823e6aa4b"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = 'New Message';
  const notificationOptions = {
    body: 'You have received a new message',
    icon: '/vite.svg', // Ensure this path is correct
    tag: 'new-message' // Tag to avoid duplicates if needed, or distinct for each
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
