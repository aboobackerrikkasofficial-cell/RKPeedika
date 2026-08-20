importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
  apiKey: new URL(location).searchParams.get('apiKey'), // Fallback if needed, but best is to hardcode or get via query params, but SW can't easily read ENV vars.
  // In a real scenario you need to inject this at build time, or fetch it.
  // For Vercel/Vite, we can fetch from a config JSON if needed. 
  // Let's use a placeholder that the user must fill in, since it's a static file.
};

// Workaround for Vercel: We need to somehow pass the env vars to this public script.
// One approach is to write the config here directly, but the prompt says the user will do manual setup.
// We'll leave placeholders and tell the user to fill them.

firebase.initializeApp({
  apiKey: "REPLACE_WITH_API_KEY",
  authDomain: "REPLACE_WITH_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_PROJECT_ID",
  messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
