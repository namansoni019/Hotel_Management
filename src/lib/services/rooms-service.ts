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
    // Room categories are kept streamlined directly with rooms; fallback to standard repository types
    return dataRepository.getRoomTypes();
  },

  async getRoomTypeById(id: string): Promise<RoomType | null> {
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
          const isNonDeluxe =
            typeId === 'd0000000-0000-0000-0000-000000000002' ||
            (data.room_type_name && data.room_type_name.toLowerCase().includes('non')) ||
            (data.room_category && data.room_category.toLowerCase().includes('non'));

          const categoryName = data.room_category || data.room_type_name || matchedType.name;
          const photos = data.images || data.photos || matchedType.photos || [];

          return {
            id: d.id,
            room_number: data.room_number,
            room_type_id: typeId,
            housekeeping_state: data.housekeeping_state || 'available',
            notes: data.notes || null,
            images: photos,
            photos: photos,
            room_category: categoryName,
            room_type_name: categoryName,
            category_badge: data.category_badge || (isNonDeluxe ? 'HERITAGE STANDARD' : 'ROYAL LUXURY'),
            base_rate_minor: data.base_rate_minor ?? matchedType.base_rate_minor,
            price_per_night: data.price_per_night ?? Math.round((data.base_rate_minor ?? matchedType.base_rate_minor) / 100),
            capacity: data.capacity ?? matchedType.capacity,
            bed_type: data.bed_type || (isNonDeluxe ? 'Classic Double Bed' : 'Plush King Bed'),
            amenities: data.amenities || matchedType.amenities,
            description: data.description || matchedType.description,
            room_type: data.room_type || {
              ...matchedType,
              name: categoryName,
              base_rate_minor: data.base_rate_minor ?? matchedType.base_rate_minor,
              amenities: data.amenities || matchedType.amenities,
              photos: photos,
            },
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
    images?: string[];
    photos?: string[];
  }): Promise<Room> {
    const roomTypes = dataRepository.getRoomTypes();
    const matchedType = roomTypes.find((rt) => rt.id === roomData.room_type_id) || roomTypes[0];
    const isNonDeluxe =
      matchedType.id === 'd0000000-0000-0000-0000-000000000002' ||
      matchedType.name.toLowerCase().includes('non');

    const cleanPhotos = roomData.images || roomData.photos || matchedType.photos || [];

    const fullRoomDoc = {
      room_number: roomData.room_number,
      room_type_id: matchedType.id,
      room_category: matchedType.name,
      room_type_name: matchedType.name,
      category_badge: isNonDeluxe ? 'HERITAGE STANDARD' : 'ROYAL LUXURY',
      base_rate_minor: matchedType.base_rate_minor,
      price_per_night: Math.round(matchedType.base_rate_minor / 100),
      capacity: matchedType.capacity,
      bed_type: isNonDeluxe ? 'Classic Double Bed' : 'Plush King Bed',
      amenities: matchedType.amenities,
      description: matchedType.description,
      housekeeping_state: roomData.housekeeping_state || 'available',
      notes: roomData.notes || null,
      images: cleanPhotos,
      photos: cleanPhotos,
      room_type: {
        id: matchedType.id,
        property_id: matchedType.property_id || 'd0000000-0000-0000-0000-000000000001',
        name: matchedType.name,
        description: matchedType.description,
        capacity: matchedType.capacity,
        total_rooms: matchedType.total_rooms || 20,
        base_rate_minor: matchedType.base_rate_minor,
        amenities: matchedType.amenities,
        photos: cleanPhotos,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    };

    try {
      const colRef = collection(db, 'rooms');
      const docRef = await addDoc(colRef, {
        ...fullRoomDoc,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      const local = dataRepository.addRoom({
        ...fullRoomDoc,
        id: docRef.id,
      });
      return { ...local, id: docRef.id };
    } catch (err) {
      console.warn('Firestore addRoom error:', err);
      const local = dataRepository.addRoom(fullRoomDoc);
      return local;
    }
  },

  async updateRoom(roomId: string, patch: Partial<Room>): Promise<Room | null> {
    try {
      const docRef = doc(db, 'rooms', roomId);
      await setDoc(
        docRef,
        {
          ...patch,
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore updateRoom fallback:', err);
    }
    return dataRepository.updateRoom(roomId, patch);
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
