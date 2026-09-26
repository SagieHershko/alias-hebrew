import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase project settings, from environment variables (see README → "Online play").
 * They are public client settings, not secrets; access is protected by the
 * Firestore security rules in firestore.rules.
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
/** host:port of the local Firebase emulators, for development and tests only. */
export const EMULATOR_HOST = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
/**
 * reCAPTCHA v3 site key for App Check (optional). With App Check enforced in the
 * Firebase console, only this site can use the project: scripts that reuse the public
 * config to guess room codes or burn the quota are refused.
 */
const APP_CHECK_SITE_KEY = process.env.EXPO_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;

/** Online play needs a configured Firebase project. */
export const onlineConfigured = !!(config.apiKey && config.projectId && config.appId);

let services: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export function firebase() {
  if (!onlineConfigured) throw new Error('Firebase is not configured');
  if (!services) {
    const fresh = !getApps().length;
    const app = fresh ? initializeApp(config) : getApp();
    // App Check must start before Auth / Firestore. Web only (online play is web-only).
    if (fresh && APP_CHECK_SITE_KEY && !EMULATOR_HOST && typeof document !== 'undefined') {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    }
    const auth = getAuth(app);
    const db = getFirestore(app);
    if (EMULATOR_HOST) {
      const [host, port] = EMULATOR_HOST.split(':');
      connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, host, Number(port || 8080));
    }
    services = { app, auth, db };
  }
  return services;
}
