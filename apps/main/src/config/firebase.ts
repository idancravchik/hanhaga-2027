import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from 'firebase/app-check';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
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
        const siteKey = import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY;
        if (siteKey && siteKey.trim() !== '') {
            try {
                if (import.meta.env.DEV) {
                    // @ts-ignore - self.FIREBASE_APPCHECK_EXECUTE_IN_GLOBAL_SCOPE
                    self.FIREBASE_APPCHECK_EXECUTE_IN_GLOBAL_SCOPE = true;
                }
                appCheck = initializeAppCheck(app, {
                    provider: new ReCaptchaV3Provider(siteKey.trim()),
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
