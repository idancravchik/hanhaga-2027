import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function inspectUsers() {
    try {
        await signInAnonymously(auth);
        const snap = await getDocs(collection(db, 'artifacts', 'hanhaga-2027', 'public', 'data', 'users'));
        console.log(`Total users in Firestore: ${snap.docs.length}`);
        const staffDocs = snap.docs
            .map(d => ({ docId: d.id, ...d.data() }))
            .filter(u => u.role && u.role !== 'student');
        console.log('Staff users found:', staffDocs.map(s => ({ docId: s.docId, name: s.name, phone: s.phone, role: s.role })));
        process.exit(0);
    } catch (err) {
        console.error('Inspect users failed:', err);
        process.exit(1);
    }
}

inspectUsers();
