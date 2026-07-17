import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD479q3WrqGkT4Z0SERi2j0TaOqVDrmnno",
  authDomain: "backendpathbooks.firebaseapp.com",
  databaseURL: "https://backendpathbooks.firebaseio.com",
  projectId: "backendpathbooks",
  storageBucket: "backendpathbooks.firebasestorage.app",
  messagingSenderId: "746565644409",
  appId: "1:746565644409:web:16d29fa16c3098ae"
};

// Evitamos duplicidad de inicialización en desarrollo (HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);