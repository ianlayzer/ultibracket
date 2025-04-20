// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyBidqGv121tuSkNb8H4acyr4sNKzp8xqac',
  authDomain: 'ultibracket.firebaseapp.com',
  databaseURL: 'https://ultibracket-default-rtdb.firebaseio.com',
  projectId: 'ultibracket',
  storageBucket: 'ultibracket.firebasestorage.app',
  messagingSenderId: '210033848428',
  appId: '1:210033848428:web:4850ae16edf028b858e849',
  measurementId: 'G-E6KV0V288D',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
