import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { Reservation, ReservationStatus, GuestAadhaarDetail } from '@/lib/types';

export const reservationsService = {
  async getReservations(): Promise<Reservation[]> {
    try {
      const colRef = collection(db, 'reservations');
      const q = query(colRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Reservation[];
      }
    } catch (err) {
      console.warn('Firestore getReservations fallback:', err);
    }
    return dataRepository.getReservations();
  },

  async getReservationByReference(reference: string): Promise<Reservation | undefined> {
    try {
      const docRef = doc(db, 'reservations', reference);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Reservation;
      }

      const colRef = collection(db, 'reservations');
      const q = query(colRef, where('reference_code', '==', reference.toUpperCase()));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const d = qSnap.docs[0];
        return { id: d.id, ...d.data() } as Reservation;
      }
    } catch (err) {
      console.warn('Firestore getReservationByReference fallback:', err);
    }
    return (
      dataRepository.getReservationByReference(reference) ||
      dataRepository.getReservations().find((r) => r.id === reference || r.reference_code === reference.toUpperCase())
    );
  },

  async createReservation(data: {
    roomTypeId: string;
    roomId?: string;
    checkIn: string;
    checkOut: string;
    checkInTime?: string;
    checkOutTime?: string;
    partySize: number;
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    notes?: string;
    aadhaarDetails?: GuestAadhaarDetail[];
  }): Promise<Reservation> {
    const createdLocal = dataRepository.createReservation(data);

    try {
      const docRef = doc(db, 'reservations', createdLocal.id);
      await setDoc(docRef, {
        ...createdLocal,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore createReservation error (saved locally):', err);
    }

    return createdLocal;
  },

  async updateReservationStatus(id: string, status: ReservationStatus, roomId?: string): Promise<Reservation | null> {
    try {
      const docRef = doc(db, 'reservations', id);
      const updateData: Record<string, unknown> = {
        status,
        updated_at: serverTimestamp(),
      };
      if (roomId) updateData.room_id = roomId;
      await updateDoc(docRef, updateData);
    } catch (err) {
      console.warn('Firestore updateReservationStatus fallback:', err);
    }
    return dataRepository.updateReservationStatus(id, status, roomId);
  },
};
