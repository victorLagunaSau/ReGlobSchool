import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // ◄ 1. Importamos Firestore

// Tu configuración actual de Firebase (deja las llaves de tu proyecto tal cual las tienes)
const firebaseConfig = {
  apiKey: "AIzaSyB8AOKGZdR_t12AUdRAYpjO2M_6s5ESRro",
  authDomain: "backendpathbooks.firebaseapp.com",
  databaseURL: "https://backendpathbooks.firebaseio.com",
  projectId: "backendpathbooks",
  storageBucket: "backendpathbooks.firebasestorage.app",
  messagingSenderId: "746565644409",
  appId: "1:746565644409:web:aac3c24e6155da1ecde4a8"
};

// Inicialización segura para evitar duplicados en Next.js durante recargas en caliente
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 2. Exportamos las instancias para todo el proyecto
export const auth = getAuth(app);
export const db = getFirestore(app); // ◄ 3. Inicializamos y exportamos 'db' obligatoriamente