let auth, db;
let firebaseInitialized = false;

// Your Firebase configuration – replace with real values later
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "YOUR_APP_ID"
};

export async function login() {
  if (!firebaseInitialized) {
    try {
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      firebaseInitialized = true;
    } catch (e) {
      console.warn('Firebase config missing. Auth disabled.');
      return null;
    }
  }
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (err) {
    console.error('Login failed:', err);
    return null;
  }
}

export function sendMessage(roomId, text, user) {
  if (!db) return;
  db.collection('rooms').doc(roomId).collection('messages').add({
    text, user, timestamp: Date.now()
  });
}

export function listenToChat(roomId, callback) {
  if (!db) return;
  db.collection('rooms').doc(roomId).collection('messages')
    .orderBy('timestamp')
    .onSnapshot(snap => {
      const msgs = snap.docs.map(d => d.data());
      callback(msgs);
    });
}