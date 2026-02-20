import { initializeApp } from "firebase/app";
// Import the specific parts of Firebase we need
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCEUTZUsdtl6TCjy0ZXjikOBvKAbZvjDD4",
  authDomain: "to-do-list-cd485.firebaseapp.com",
  projectId: "to-do-list-cd485",
  storageBucket: "to-do-list-cd485.firebasestorage.app",
  messagingSenderId: "556613260295",
  appId: "1:556613260295:web:fa890d5a3fa6e52954c6a2",
  measurementId: "G-TPLC5H1L1W"
};

// Initialize the Firebase App
const app = initializeApp(firebaseConfig);

// THIS IS THE IMPORTANT PART: 
// We must add 'export' so other files like App.jsx can see them.
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
