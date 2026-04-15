import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
apiKey: "AIzaSyBwdopUPgCwfhmbVl5rulUba9a4Uej6iI8",
authDomain: "finlab-76e47.firebaseapp.com",
projectId: "finlab-76e47",
storageBucket: "finlab-76e47.firebasestorage.app",
messagingSenderId: "258928243023",
appId: "1:258928243023:web:86a40d0b7a28b9c3bed53a"
};

const app = initializeApp(firebaseConfig);

// 🔥 экспортируем auth
export const auth = getAuth(app);
export const db = getFirestore(app);