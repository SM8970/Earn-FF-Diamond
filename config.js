<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCR96FXvw6tpEqx8uOWV90xC02Ln-8WJEw",
    authDomain: "earn-ff-diamond.firebaseapp.com",
    projectId: "earn-ff-diamond",
    storageBucket: "earn-ff-diamond.firebasestorage.app",
    messagingSenderId: "864313846671",
    appId: "1:864313846671:web:3604104e56a587b82db9fa",
    measurementId: "G-1MRSZHDJB0"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
