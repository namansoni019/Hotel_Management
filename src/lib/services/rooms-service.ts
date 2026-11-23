import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { Room, RoomType, HousekeepingState, AvailabilityResult } from '@/lib/types';

export const roomsService = {
  async getRoomTypes(): Promise<RoomType[]> {
    try {
      const colRef = collection(db, 'room_types');
      const q = query(colRef, where('is_active', '==', true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as RoomType[];
      }
    } catch (err) {
      console.warn('Firestore getRoomTypes fallback:', err);
    }
    return dataRepository.getRoomTypes();
  },

  async getRoomTypeById(id: string): Promise<RoomType | null> {
    try {
      const docRef = doc(db, 'room_types', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as RoomType;
      }
    } catch (err) {
      console.warn('Firestore getRoomTypeById fallback:', err);
    }
    const all = dataRepository.getRoomTypes();
    return all.find((r) => r.id === id) || null;
  },

  async getRooms(): Promise<Room[]> {
    try {
      const colRef = collection(db, 'rooms');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Room[];
      }
    } catch (err) {
      console.warn('Firestore getRooms fallback:', err);
    }
    return dataRepository.getRooms();
  },

  async addRoom(roomData: {
    room_number: string;
    room_type_id: string;
    housekeeping_state: HousekeepingState;
    notes?: string | null;
  }): Promise<Room> {
    try {
      const colRef = collection(db, 'rooms');
      const docRef = await addDoc(colRef, {
        ...roomData,
        created_at: serverTimestamp(),
      });
      const local = dataRepository.addRoom(roomData);
      return { ...local, id: docRef.id };
    } catch (err) {
      console.warn('Firestore addRoom error:', err);
      return dataRepository.addRoom(roomData);
    }
  },

  async updateRoomHousekeeping(roomId: string, state: HousekeepingState): Promise<Room | null> {
    try {
      const docRef = doc(db, 'rooms', roomId);
      await updateDoc(docRef, {
        housekeeping_state: state,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore updateRoomHousekeeping fallback:', err);
    }
    return dataRepository.updateRoomHousekeeping(roomId, state);
  },

  async searchAvailability(checkIn: string, checkOut: string, guests: number): Promise<AvailabilityResult[]> {
    return dataRepository.searchAvailability(checkIn, checkOut, guests);
  },
};
