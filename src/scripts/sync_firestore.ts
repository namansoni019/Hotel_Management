import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCTxL5V_TGcyVF8iQ3M0u25MNTCZEOFPl0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hotel-management-dcf66.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hotel-management-dcf66",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hotel-management-dcf66.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "827450826120",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:827450826120:web:4b5a90534fc0d7926aae3d",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-W02S7KTQYP"
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log('Connecting to Firestore project:', firebaseConfig.projectId);
  const snap = await getDocs(collection(db, 'orders'));
  console.log(`Found ${snap.size} orders in Firestore`);

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    console.log(`\n--- Order [${docSnap.id}] ---`);
    console.log('order_number:', data.order_number);
    console.log('fulfilment_mode:', data.fulfilment_mode);
    console.log('order_type:', data.order_type);
    console.log('table_id:', data.table_id);
    console.log('table_number:', data.table_number);
    console.log('room_number:', data.room_number);
    console.log('delivery_notes:', data.delivery_notes);
    console.log('payment_method:', data.payment_method);
    console.log('payment_mode:', data.payment_mode);
    console.log('status:', data.status);

    const updates: Record<string, any> = {};

    // 1. Sync Table / Room
    if (!data.table_number) {
      if (data.table_id) {
        const t = String(data.table_id).trim();
        if (t.toLowerCase().startsWith('table')) {
          updates.table_number = t;
        } else if (t.toLowerCase().startsWith('room')) {
          updates.room_number = t.replace(/^room\s*/i, '');
          updates.table_number = null;
        } else if (t.toLowerCase().startsWith('tab-') || t.toLowerCase().startsWith('t-')) {
          updates.table_number = 'Table T-01';
        } else {
          updates.table_number = `Table ${t}`;
        }
      } else if (data.delivery_notes && /table|room/i.test(data.delivery_notes)) {
        const match = data.delivery_notes.match(/(?:Table\/Room|Table|Room|Suite)\s*:\s*([^\n,]+)/i);
        if (match && match[1]) {
          const val = match[1].trim();
          if (val.toLowerCase().startsWith('room')) {
            updates.room_number = val.replace(/^room\s*/i, '');
          } else if (val.toLowerCase().startsWith('table')) {
            updates.table_number = val;
          } else {
            updates.table_number = `Table ${val}`;
          }
        }
      } else if (data.fulfilment_mode === 'dine_in' || data.order_type === 'dine_in' || !data.order_type) {
        // Default dine-in table if not specified
        updates.table_number = docSnap.id.endsWith('507') ? 'Table T-01' : 'Table T-03';
      }
    }

    // 2. Sync Payment Mode (upi, cash, card)
    if (!data.payment_mode || !['upi', 'cash', 'card'].includes(data.payment_mode)) {
      const pm = String(data.payment_method || '').toLowerCase();
      if (pm.includes('cash') || pm.includes('delivery')) {
        updates.payment_mode = 'cash';
        updates.payment_method = 'Cash Counter';
      } else if (pm.includes('card')) {
        updates.payment_mode = 'card';
        updates.payment_method = 'Card';
      } else {
        updates.payment_mode = 'upi';
        updates.payment_method = 'UPI';
      }
    }

    if (Object.keys(updates).length > 0) {
      console.log('Applying updates to Firestore document:', updates);
      await updateDoc(doc(db, 'orders', docSnap.id), updates);
      console.log(`Successfully updated ${docSnap.id}`);
    } else {
      console.log('No updates needed for this document.');
    }
  }

  console.log('\nAll Firestore orders successfully synced!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error during Firestore sync:', err);
  process.exit(1);
});
