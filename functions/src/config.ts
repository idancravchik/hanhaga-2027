import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

export const APP_ID = process.env.FIREBASE_APP_ID_OVERRIDE || 'hanhaga-2027';

export const PATHS = {
  USERS: `artifacts/${APP_ID}/public/data/users`,
  EVENTS: `artifacts/${APP_ID}/public/data/events`,
  ATTENDANCE: `artifacts/${APP_ID}/public/data/attendance`,
  EXAMS: `artifacts/${APP_ID}/public/data/exams`,
  GRADES: `artifacts/${APP_ID}/public/data/grades`,
  API_KEYS: 'system_api_keys',
  IDEMPOTENCY: 'system_idempotency'
};

export const RATE_LIMIT = {
  MAX_REQUESTS: 60,
  WINDOW_MS: 60 * 1000 // 1 minute
};

let _app: App | null = null;
function getApp(): App {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp() : getApps()[0];
  }
  return _app;
}

let _db: Firestore | null = null;
function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getApp());
  }
  return _db;
}

// Lazy-loaded Firestore instance to prevent timeout during Firebase CLI analysis
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const firestoreInstance = getDb() as any;
    const value = firestoreInstance[prop];
    if (typeof value === 'function') {
      return value.bind(firestoreInstance);
    }
    return value;
  }
});
