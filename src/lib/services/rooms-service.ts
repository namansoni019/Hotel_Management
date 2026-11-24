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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { Room, RoomType, HousekeepingState, AvailabilityResult } from '@/lib/types';

export const roomsService = {
  async getRoomTypes(): Promise<RoomType[]> {
    const defaultTypes = dataRepository.getRoomTypes();
    try {
      const colRef = collection(db, 'room_types');
      const q = query(colRef, where('is_active', '==', true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const live = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as RoomType[];
        // Only allow Deluxe Room and Non-Deluxe Room
        const filtered = live.filter(
          (rt) => rt.name === 'Deluxe Room' || rt.name === 'Non-Deluxe Room'
        );
        if (filtered.length >= 2) {
          return filtered;
        }
      }
      // Ensure Firestore has the 2 standard types
      for (const rt of defaultTypes) {
        setDoc(doc(db, 'room_types', rt.id), rt).catch(() => {});
      }
    } catch (err) {
      console.warn('Firestore getRoomTypes fallback:', err);
    }
    return defaultTypes;
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
    const roomTypes = dataRepository.getRoomTypes();
    try {
      const colRef = collection(db, 'rooms');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        return snap.docs.map((d) => {
          const data = d.data();
          const typeId = data.room_type_id || roomTypes[0]?.id;
          const matchedType = roomTypes.find((rt) => rt.id === typeId) || roomTypes[0];
          return {
            id: d.id,
            room_number: data.room_number,
            room_type_id: typeId,
            housekeeping_state: data.housekeeping_state || 'available',
            notes: data.notes || null,
            room_type: data.room_type || matchedType,
          } as Room;
        });
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
    const roomTypes = dataRepository.getRoomTypes();
    const matchedType = roomTypes.find((rt) => rt.id === roomData.room_type_id) || roomTypes[0];

    try {
      const colRef = collection(db, 'rooms');
      const docRef = await addDoc(colRef, {
        ...roomData,
        room_type_id: matchedType.id,
        room_type_name: matchedType.name,
        created_at: serverTimestamp(),
      });
      const local = dataRepository.addRoom({ ...roomData, room_type_id: matchedType.id, room_type: matchedType });
      return { ...local, id: docRef.id, room_type: matchedType };
    } catch (err) {
      console.warn('Firestore addRoom error:', err);
      const local = dataRepository.addRoom({ ...roomData, room_type_id: matchedType.id, room_type: matchedType });
      return { ...local, room_type: matchedType };
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

  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'rooms', roomId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore deleteRoom fallback:', err);
    }
    return dataRepository.deleteRoom(roomId);
  },

  async searchAvailability(checkIn: string, checkOut: string, guests: number): Promise<AvailabilityResult[]> {
    return dataRepository.searchAvailability(checkIn, checkOut, guests);
  },
};
