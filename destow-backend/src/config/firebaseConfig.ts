// services/firebaseConfig.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
    apiKey: "AIzaSyBWEs37VutPrYHNbL41l60rv8EsBD77vMA",
    projectId: "destow-696df",
    storageBucket: "destow-696df.firebasestorage.app",
    appId: "1:100130640486:android:d7eb84e1cb38c7c1d493a7",
    messagingSenderId: "100130640486"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with AsyncStorage
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

export { app, auth };
