import { db, auth } from '@/lib/firebase';
import { isFirebaseConfigured } from '@/lib/firebase/firestore';

export function isDbConfigured(): boolean {
  return isFirebaseConfigured();
}

export function getDb() {
  return db;
}

export function getAuthInstance() {
  return auth;
}

export { db, auth };
