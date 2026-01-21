importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Parse query parameters for configuration
const urlParams = new URLSearchParams(self.location.search);
const firebaseConfig = Object.fromEntries(urlParams);

if (!firebaseConfig.apiKey) {
  // Fallback or error if config is missing (e.g. direct file access)
  console.error('Firebase config missing in service worker URL parameters.');
} else {
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
      tag: 'new_message' // Tag to avoid duplicates if needed, or distinct for each
    };
  
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}
