import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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

const phoneArg = process.argv[2];
if (!phoneArg) {
  console.error("❌ Please provide your phone number. Usage: node scripts/seed-admin.mjs 05XXXXXXXX");
  process.exit(1);
}

const cleanPhone = phoneArg.trim().replace(/[- ]/g, '');

async function seedAdmin() {
  try {
    console.log("🔐 Authenticating anonymously with Firebase...");
    await signInAnonymously(auth);

    console.log(`👤 Creating admin user for עידן קרבצ'יק (${cleanPhone})...`);
    // Document ID is the phone number (standard in Hanhaga system)
    const userRef = doc(db, 'artifacts', 'hanhaga-2027', 'public', 'data', 'users', cleanPhone);
    
    await setDoc(userRef, {
      id: cleanPhone,
      name: "עידן קרבצ'יק",
      fullName: "עידן קרבצ'יק",
      phone: cleanPhone,
      role: "admin",
      school: "מנהלה",
      tags: [],
      createdAt: new Date().toISOString()
    });

    console.log("✅ Admin user created successfully in hanhaga-2027!");
    console.log("You can now log in at https://hanhaga-2027.web.app using:");
    console.log("  - Name: עידן קרבצ'יק");
    console.log(`  - Phone: ${cleanPhone}`);
    console.log("  - Passcode: 2027");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin user:", err);
    process.exit(1);
  }
}

seedAdmin();
