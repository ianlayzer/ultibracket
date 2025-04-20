// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

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

console.log('Firebase initialized successfully');

export const auth = getAuth(app);
export const db = getDatabase(app);
