// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore'; // Ensure the correct import
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9gWm2_83F3Oo4nrUwDb9huAVxTlgVS5E",
  authDomain: "chessvsdeepseek.firebaseapp.com",
  projectId: "chessvsdeepseek",
  storageBucket: "chessvsdeepseek.firebasestorage.app",
  messagingSenderId: "216027094426",
  appId: "1:216027094426:web:68f63e653c955bda6f2e23",
  measurementId: "G-ECD6S6CR5R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const analytics = getAnalytics(app);

// Export firestore instance
export { firestore };
