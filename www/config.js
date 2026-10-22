/* DS Family online sync settings.
   Leave "firebase" as null to run on this phone only (shows LOCAL at the top right).
   To share between your two phones, create a free Firebase project and paste its web config here, like:

   window.DS_CONFIG = {
     firebase: {
       apiKey: "...",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project",
       appId: "..."
     }
   };

   Steps are in README.md. */
window.DS_CONFIG = {
  // SHA-256 of the 6-digit login code, so a mistyped code on the second phone is rejected.
  loginCodeHash: '6d4477fc7cec933b61c558b251edd65d735de383c5f978094d3be705be677a34',
  firebase: {
    apiKey: "AIzaSyB5W49ezBvVWbWPRaonMdFcS4nVFQPJy1M",
    authDomain: "ds-family-42ff8.firebaseapp.com",
    projectId: "ds-family-42ff8",
    storageBucket: "ds-family-42ff8.firebasestorage.app",
    messagingSenderId: "751021593070",
    appId: "1:751021593070:web:a412880c500e8ba6ff7eff"
  }
};
