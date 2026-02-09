// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // <--- ESTO ES LO QUE FALTA
import { getFirestore } from "firebase/firestore";         // <--- Y ESTO PARA LA BASE DE DATOS
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC0Rd0TQs4-whp9OA0ZgAN7m359saz4E3s",
  authDomain: "rutina-2bc1e.firebaseapp.com",
  projectId: "rutina-2bc1e",
  storageBucket: "rutina-2bc1e.firebasestorage.app",
  messagingSenderId: "916632561030",
  appId: "1:916632561030:web:00ec14fe6e84e14317f807",
  measurementId: "G-P4DMZQ41C4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Asegurate de que CADA línea tenga la palabra export adelante
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// OPCIONAL: Agregá esto al final del todo para forzar la salida
export default app;