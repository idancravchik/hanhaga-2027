import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, AppCheck } from 'firebase/app-check';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCx7BmNiBLy9OU-tlWRB7oyt6c49MHEIfw",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hanhaga-2027.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hanhaga-2027",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hanhaga-2027.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "156191791138",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:156191791138:web:30b0010e0d18b17204927b",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

const appIdString = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'hanhaga-2027';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let appCheck: AppCheck | undefined;

try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);

    // Initialize App Check with reCAPTCHA v3 (optional)
    if (typeof window !== 'undefined') {
        const siteKey = import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || "6LdbB6ktAAAAAGjTdkZAEDZPLfo1dkfviDJ6x-vU";
        if (siteKey && siteKey.trim() !== '') {
            try {
                if (import.meta.env.DEV) {
                    // @ts-ignore - self.FIREBASE_APPCHECK_EXECUTE_IN_GLOBAL_SCOPE
                    self.FIREBASE_APPCHECK_EXECUTE_IN_GLOBAL_SCOPE = true;
                }
                appCheck = initializeAppCheck(app, {
                    provider: new ReCaptchaEnterpriseProvider(siteKey.trim()),
                    isTokenAutoRefreshEnabled: true
                });
            } catch (acErr) {
                console.warn('App Check initialization bypassed:', acErr);
            }
        }
    }
} catch (e) {
    console.error("Firebase initialization error:", e);
}

export { app, db, auth, appCheck, appIdString as appId };
