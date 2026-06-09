import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Firebase sozlamasi - credentials bilan
const firebaseConfig = {
  apiKey: "AIzaSyBy4RAT15tXlWuWhlGSHUoBjNI7bXLdvLU",
  projectId: "doctors-appointment-2ff3f",
  messagingSenderId: "132095757038",
  appId: "1:132095757038:web:906c4a29d1ebcd9d9b81ff",
};

const VAPID_KEY = "BCYjCdsb3yKk6UvwJoNbPYs3eAnG0ImGBnmzLixg7Q1ljxjrX2Q08ksvjTyUhPLbA-Ro0TyPwPEouvrvNjOlgZw";

// Firebase initialize qilish
const app = initializeApp(firebaseConfig);

// Messaging objekti - bu doktor notifikatsiyalari uchun kerak
export const messaging = getMessaging(app);

// Doktor notifikatsiyalarini qabul qilish (app ochiqligi vaqtida)
onMessage(messaging, (payload) => {
  console.log("Doktor notifikatsiyasi:", payload);
  if (payload.notification) {
    alert(`${payload.notification.title}: ${payload.notification.body}`);
  }
});

// Ruxsat so'rash va token olish
export const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      if (token) {
        console.log("FCM Token olingan:", token);
        return token;
      }
    } else {
      console.log("Notifikatsiya ruxsati berilmadi");
      return null;
    }
  } catch (error) {
    console.error("Xatolik:", error);
    return null;
  }
};