/* FoodDiary online sync settings.
   Uses the same free Firebase project as DS Family, so no new setup is needed:
   the existing Firestore rule (families/{code}/items/{id}) already allows it.
   FoodDiary keeps its data apart from DS Family under families/fd-<diary code> (saves)
   and families/fdimg-<diary code> (sticker pictures).
   Set "firebase" to null to keep everything on this phone only (shows LOCAL). */
window.FD_CONFIG = {
  version: '0.1.2',
  firebase: {
    apiKey: "AIzaSyB5W49ezBvVWbWPRaonMdFcS4nVFQPJy1M",
    authDomain: "ds-family-42ff8.firebaseapp.com",
    projectId: "ds-family-42ff8",
    storageBucket: "ds-family-42ff8.firebasestorage.app",
    messagingSenderId: "751021593070",
    appId: "1:751021593070:web:a412880c500e8ba6ff7eff"
  }
};
