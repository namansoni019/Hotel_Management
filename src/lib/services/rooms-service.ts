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
import { serializeRoomDoc, sortRoomsByNumber } from '@/lib/utils/room-serializer';

export const roomsService = {
  async getRoomTypes(): Promise<RoomType[]> {
    // Derive room types directly from live `rooms` collection (all room type details live inside `rooms`)
    try {
      const liveRooms = await this.getRoomsFromDbOnly();
      if (liveRooms.length > 0) {
        const grouped = new Map<string, RoomType>();
        for (const room of liveRooms) {
          const rtId = room.room_type_id || room.id;
          const existing = grouped.get(rtId);
          if (existing) {
            existing.total_rooms = (existing.total_rooms || 0) + 1;
          } else if (room.room_type) {
            grouped.set(rtId, {
              ...room.room_type,
              id: rtId,
              total_rooms: 1,
            });
          }
        }
        if (grouped.size > 0) {
          return Array.from(grouped.values());
        }
      }
    } catch (err) {
      console.warn('Derived room types from rooms collection error:', err);
    }

    return dataRepository.getRoomTypes();
  },

  async getRoomTypeById(id: string): Promise<RoomType | null> {
    const roomMatch = await this.getRoomById(id);
    if (roomMatch?.room_type) {
      return roomMatch.room_type;
    }

    const all = dataRepository.getRoomTypes();
    return all.find((r) => r.id === id) || null;
  },

  async getRoomsFromDbOnly(): Promise<Room[]> {
    const colRef = collection(db, 'rooms');
    const snap = await getDocs(colRef);
    if (snap.empty) return [];
    const list = snap.docs
      .map((d) => serializeRoomDoc(d.id, d.data() as Record<string, unknown>))
      .filter((r) => r.is_active !== false);
    return sortRoomsByNumber(list);
  },

  async getRooms(): Promise<Room[]> {
    try {
      const dbRooms = await this.getRoomsFromDbOnly();
      if (dbRooms.length > 0) {
        return dbRooms;
      }
    } catch (err) {
      console.warn('Firestore getRooms fallback:', err);
    }

    const repoRooms = dataRepository.getRooms();
    if (repoRooms.length > 0) {
      return repoRooms.map((r) =>
        serializeRoomDoc(r.id, r as unknown as Record<string, unknown>)
      );
    }

    // Map repository room types as fallback chamber entries if rooms state is empty
    return dataRepository.getRoomTypes().map((rt, idx) =>
      serializeRoomDoc(rt.id, {
        id: rt.id,
        room_number: String(101 + idx),
        room_type_id: rt.id,
        room_category: rt.name,
        room_type_name: rt.name,
        name: rt.name,
        description: rt.description,
        capacity: rt.capacity,
        base_rate_minor: rt.base_rate_minor,
        amenities: rt.amenities,
        photos: rt.photos,
        housekeeping_state: 'available',
        room_type: rt,
      })
    );
  },

  async getRoomById(id: string): Promise<Room | null> {
    try {
      // 1. Direct lookup on `rooms/{id}`
      const docRef = doc(db, 'rooms', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return serializeRoomDoc(snap.id, snap.data() as Record<string, unknown>);
      }

      // 2. Fallback lookup inside `rooms` collection (matches internal `id`, `room_type_id`, or `room_number`)
      const dbRooms = await this.getRoomsFromDbOnly();
      const matched = dbRooms.find(
        (r) => r.id === id || r.room_type_id === id || r.room_number === id
      );
      if (matched) return matched;
    } catch (err) {
      console.warn('Firestore getRoomById fallback:', err);
    }

    // 3. Fallback to repository
    const fallbackRooms = await this.getRooms();
    return fallbackRooms.find((r) => r.id === id || r.room_type_id === id) || null;
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
