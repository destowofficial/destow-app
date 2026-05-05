import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// Firebase configuration using your new project values
const firebaseConfig = {
  apiKey: "AIzaSyCmwwB_S6iep9OS27UH1mhahbLPoZDYbXk",
  authDomain: "destow-65f48.firebaseapp.com",
  projectId: "destow-65f48",
  storageBucket: "destow-65f48.firebasestorage.app",
  messagingSenderId: "996806677429",
  appId: "1:996806677429:web:ec5c9095ef25ce411abffc",
  measurementId: "G-FZWJH26KXW"
};

// Initialize Firebase compat
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export default firebase;
