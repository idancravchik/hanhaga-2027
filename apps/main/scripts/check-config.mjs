import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCx7BmNiBLy9OU-tlWRB7oyt6c49MHEIfw",
  authDomain: "hanhaga-2027.firebaseapp.com",
  projectId: "hanhaga-2027",
  storageBucket: "hanhaga-2027.firebasestorage.app",
  messagingSenderId: "156191791138",
  appId: "1:156191791138:web:30b0010e0d18b17204927b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function checkConfig() {
    await signInAnonymously(auth);
    const d = await getDoc(doc(db, 'artifacts', 'hanhaga-2027', 'public', 'config'));
    console.log('CONFIG DATA:', d.exists() ? d.data() : 'NOT FOUND');
    process.exit(0);
}

checkConfig();
