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
          return {
            id: d.id,
            room_number: data.room_number,
            room_type_id: typeId,
            housekeeping_state: data.housekeeping_state || 'available',
            notes: data.notes || null,
            images: roomImages,
            photos: roomImages,
            room_type: data.room_type || matchedType,
          } as Room;
        });
      }
    } catch (err) {
      console.warn('Firestore GET /api/rooms fallback to memory:', err);
    }

    if (rooms.length === 0) {
      rooms = dataRepository.getRooms();
    }

    // Ensure all rooms have valid room_type joined
    const populatedRooms = rooms.map((r) => {
      const typeId = r.room_type_id || roomTypes[0].id;
      const matchedType = roomTypes.find((rt) => rt.id === typeId) || roomTypes[0];
      return {
        ...r,
        room_type: r.room_type || matchedType,
      };
    });

    return NextResponse.json({ success: true, roomTypes, rooms: populatedRooms });
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

    const roomId = `room-${Date.now()}`;
    const cleanNumber = String(room_number).replace(/^(room|chamber)\s*/i, '').trim();

    const inputImages = Array.isArray(images) && images.length > 0
      ? images
      : (Array.isArray(photos) && photos.length > 0 ? photos : (matchedType.photos ? [...matchedType.photos] : []));

    const roomData: Room = {
      id: roomId,
      room_number: cleanNumber,
      room_type_id: matchedType.id,
      room_type: matchedType,
      housekeeping_state: housekeeping_state || 'available',
      notes: notes || null,
      images: inputImages,
      photos: inputImages,
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, 'rooms', roomId), {
        id: roomId,
        room_number: cleanNumber,
        room_type_id: matchedType.id,
        room_type_name: matchedType.name,
        housekeeping_state: housekeeping_state || 'available',
        notes: notes || null,
        images: inputImages,
        photos: inputImages,
        created_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore POST /api/rooms fallback to memory:', err);
    }

    // Save to memory repository
    const addedLocal = dataRepository.addRoom(roomData);
    addedLocal.id = roomId;
    addedLocal.room_type = matchedType;

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
