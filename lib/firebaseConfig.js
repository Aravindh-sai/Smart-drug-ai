import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyArSNtkXqJwNQc6HDBMir2Pv6si-FzQVTk",
    authDomain: "smart-drug-ai.firebaseapp.com",
    projectId: "smart-drug-ai",
    storageBucket: "smart-drug-ai.firebasestorage.app",
    messagingSenderId: "564873777210",
    appId: "1:564873777210:web:57a2ffe585c42ca60a2503"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
