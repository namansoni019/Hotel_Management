import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './index';

export {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
};

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  return true;
}

/**
 * Fetch all documents from a Firestore collection
 */
export async function getCollection<T = DocumentData>(collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return [];
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as T[];
  } catch (err) {
    console.error(`Error fetching collection ${collectionName}:`, err);
    return [];
  }
}

/**
 * Fetch a single document by ID from a Firestore collection
 */
export async function getDocument<T = DocumentData>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as T;
  } catch (err) {
    console.error(`Error fetching document ${collectionName}/${docId}:`, err);
    return null;
  }
}

/**
 * Save or merge a document in a Firestore collection with a specific ID
 */
export async function saveDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, { ...data, updated_at: serverTimestamp() }, { merge: true });
}

/**
 * Create a new document in a Firestore collection with an auto-generated ID
 */
export async function createDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update specific fields of an existing document
 */
export async function updateDocumentFields(
  collectionName: string,
  docId: string,
  fields: DocumentData
): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, { ...fields, updated_at: serverTimestamp() });
}

/**
 * Delete a document from a Firestore collection
 */
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}
