// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAovksTTeyENNuw2H3MNS0G7wN-upiEUrM",
  authDomain: "sunorank.firebaseapp.com",
  projectId: "sunorank",
  storageBucket: "sunorank.firebasestorage.app",
  messagingSenderId: "624060241796",
  appId: "1:624060241796:web:5a14d86c3427b41c6b6fd1",
  measurementId: "G-S8SJLGPCWL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Setup emulator connections when in development mode
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('🔥 Connected to Firebase emulators');
}

// Create Google auth provider
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, functions, googleProvider };
