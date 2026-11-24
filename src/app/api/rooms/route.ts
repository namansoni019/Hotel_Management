import { NextResponse } from 'next/server';
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { roomsService } from '@/lib/services/rooms-service';
import { dataRepository } from '@/lib/data/repository';
import type { Room, RoomType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const roomTypes: RoomType[] = dataRepository.getRoomTypes();
    let rooms: Room[] = [];

    try {
      const snap = await getDocs(collection(db, 'rooms'));
      if (!snap.empty) {
        rooms = snap.docs.map((d) => {
          const data = d.data();
          const typeId = data.room_type_id || roomTypes[0].id;
          const matchedType = roomTypes.find((rt) => rt.id === typeId) || roomTypes[0];
          const rawImages = data.images || data.photos;
          const roomImages = Array.isArray(rawImages) && rawImages.length > 0
            ? rawImages
            : (matchedType.photos ? [...matchedType.photos] : []);

          const isNonDeluxe =
            typeId === 'd0000000-0000-0000-0000-000000000002' ||
            (data.room_type_name && data.room_type_name.toLowerCase().includes('non')) ||
            (data.room_category && data.room_category.toLowerCase().includes('non'));

          const categoryName = data.room_category || data.room_type_name || matchedType.name;

          return {
            id: d.id,
            room_number: data.room_number,
            room_type_id: typeId,
            housekeeping_state: data.housekeeping_state || 'available',
            notes: data.notes || null,
            images: roomImages,
            photos: roomImages,
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
              photos: roomImages,
            },
          } as Room;
        });
      }
    } catch (err) {
      console.warn('Firestore GET /api/rooms fallback to memory:', err);
    }

    if (rooms.length === 0) {
      rooms = dataRepository.getRooms();
    }

    return NextResponse.json({ success: true, roomTypes, rooms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room_number, room_type_id, housekeeping_state, notes, images, photos } = body;

    if (!room_number) {
      return NextResponse.json(
        { success: false, error: 'room_number is required' },
        { status: 400 }
      );
    }

    const roomTypes = dataRepository.getRoomTypes();
    // Resolve type: if matching id or matching 'deluxe' / 'non-deluxe'
    let matchedType = roomTypes.find(
      (rt) =>
        rt.id === room_type_id ||
        (room_type_id === 'deluxe' && rt.name.toLowerCase().includes('deluxe') && !rt.name.toLowerCase().includes('non')) ||
        (room_type_id === 'non-deluxe' && rt.name.toLowerCase().includes('non'))
    );
    if (!matchedType) {
      matchedType = roomTypes[0];
    }

    const isNonDeluxe =
      matchedType.id === 'd0000000-0000-0000-0000-000000000002' ||
      matchedType.name.toLowerCase().includes('non');

    const roomId = `room-${Date.now()}`;
    const cleanNumber = String(room_number).replace(/^(room|chamber)\s*/i, '').trim();

    const inputImages: string[] = Array.isArray(images) && images.length > 0
      ? images
      : (Array.isArray(photos) && photos.length > 0 ? photos : (matchedType.photos ? [...matchedType.photos] : []));

    const roomData: Room = {
      id: roomId,
      room_number: cleanNumber,
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
      housekeeping_state: housekeeping_state || 'available',
      notes: notes || null,
      images: inputImages,
      photos: inputImages,
      room_type: {
        id: matchedType.id,
        property_id: matchedType.property_id || 'd0000000-0000-0000-0000-000000000001',
        name: matchedType.name,
        description: matchedType.description,
        capacity: matchedType.capacity,
        total_rooms: matchedType.total_rooms || 20,
        base_rate_minor: matchedType.base_rate_minor,
        amenities: matchedType.amenities,
        photos: inputImages,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    };

    // Save to Firestore rooms collection with ALL details embedded directly
    try {
      await setDoc(doc(db, 'rooms', roomId), {
        id: roomId,
        room_number: cleanNumber,
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
        housekeeping_state: housekeeping_state || 'available',
        notes: notes || null,
        images: inputImages,
        photos: inputImages,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore POST /api/rooms fallback to memory:', err);
    }

    // Save to memory repository
    const addedLocal = dataRepository.addRoom(roomData);
    addedLocal.id = roomId;

    return NextResponse.json({ success: true, room: roomData }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Room id is required' }, { status: 400 });
    }

    try {
      await deleteDoc(doc(db, 'rooms', id));
    } catch {
      // Ignored
    }

    dataRepository.deleteRoom(id);
    return NextResponse.json({ success: true, message: 'Room deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
