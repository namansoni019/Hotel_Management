import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './index';

export type { FirebaseUser };

/**
 * Sign in using email and password
 */
export async function signInWithEmail(email: string, password: string) {
  return await signInWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Register a new user with email, password, and profile metadata
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string,
  phone?: string
) {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = userCredential.user;

  if (fullName) {
    await updateProfile(user, {
      displayName: fullName.trim(),
    });
  }

  // Save user document in Firestore users collection
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email?.toLowerCase(),
        name: fullName ? fullName.trim() : email.split('@')[0],
        phone: phone ? phone.trim() : null,
        role: 'guest',
        is_active: true,
        created_at: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
  }

  return userCredential;
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;

  // Ensure user profile document exists in Firestore
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email?.toLowerCase(),
        name: user.displayName || user.email?.split('@')[0] || 'Royal Guest',
        phone: user.phoneNumber || null,
        photo_url: user.photoURL || null,
        role: user.email?.toLowerCase() === 'soninamanp7@gmail.com' ? 'admin' : 'guest',
        is_staff: user.email?.toLowerCase() === 'soninamanp7@gmail.com',
        is_active: true,
        created_at: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error('Error saving Google user in Firestore:', err);
  }

  return userCredential;
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  return await signOut(auth);
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string) {
  return await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Subscribe to authentication state changes
 */
export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Fetch user document from Firestore
 */
export async function getUserProfile(uid: string) {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.error('Failed to get user profile from Firestore:', err);
    return null;
  }
}

/**
 * Check if user is registered in the Admins collection in Firestore
 */
export async function checkAdminInDb(user: { uid: string; email?: string | null }) {
  try {
    // 1. Check Admins collection by doc ID, uid, or email
    for (const col of ['Admins', 'admins']) {
      try {
        // Direct doc by uid
        const docSnap = await getDoc(doc(db, col, user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          return { isAdmin: true, adminData: data };
        }

        // Query by uid
        const qUid = query(collection(db, col), where('uid', '==', user.uid));
        const snapUid = await getDocs(qUid);
        if (!snapUid.empty) {
          return { isAdmin: true, adminData: snapUid.docs[0].data() };
        }

        // Query by email
        if (user.email) {
          const qEmail = query(collection(db, col), where('email', '==', user.email.toLowerCase()));
          const snapEmail = await getDocs(qEmail);
          if (!snapEmail.empty) {
            return { isAdmin: true, adminData: snapEmail.docs[0].data() };
          }
        }
      } catch (colErr) {
        // Continue to next check
      }
    }

    // 2. Check users collection
    const userDoc = await getUserProfile(user.uid);
    if (userDoc && (userDoc.role === 'admin' || userDoc.role === 'administrator')) {
      return { isAdmin: true, adminData: userDoc };
    }

    // 3. Fallback for owner email
    if (user.email && user.email.toLowerCase() === 'soninamanp7@gmail.com') {
      return { isAdmin: true, adminData: { email: user.email, role: 'admin', name: 'Naman Soni' } };
    }

    return { isAdmin: false, adminData: null };
  } catch (err) {
    console.warn('Error checking admin status in DB:', err);
    return { isAdmin: false, adminData: null };
  }
}
