// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDL2_Sfp6iblJp4bFUDxJQvSFiZVXcZwQg",
  authDomain: "alias-game-b5ad0.firebaseapp.com",
  projectId: "alias-game-b5ad0",
  storageBucket: "alias-game-b5ad0.firebasestorage.app",
  messagingSenderId: "133695323849",
  appId: "1:133695323849:web:c27defa3b7599a511c9718",
  measurementId: "G-W8L8WSGPJJ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
