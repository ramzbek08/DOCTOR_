// Firebase Service Worker - push notifikatsiyalari uchun
// App yopiq bo'lganda ham notifikatsiya chiqadi

importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js");

// Firebase sozlamasi
firebase.initializeApp({
  apiKey: "AIzaSyBy4RAT15tXlWuWhlGSHUoBjNI7bXLdvLU",
  projectId: "doctors-appointment-2ff3f",
  messagingSenderId: "132095757038",
  appId: "1:132095757038:web:906c4a29d1ebcd9d9b81ff",
});

// Messaging sozlash
const messaging = firebase.messaging();

// Background notifikatsiyalarni qabul qilish (app yopiq bo'lganda)
messaging.onBackgroundMessage((payload) => {
  console.log("Background notifikatsiya:", payload);

  const notificationTitle = payload.notification?.title || "Yangi xabar";
  const notificationOptions = {
    body: payload.notification?.body || "Sizga yangi xabar keldi",
    icon: "/favicon.ico",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
