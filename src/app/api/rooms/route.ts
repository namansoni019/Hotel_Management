import { NextResponse } from 'next/server';
import { roomsService } from '@/lib/services/rooms-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [roomTypes, rooms] = await Promise.all([
      roomsService.getRoomTypes(),
      roomsService.getRooms(),
    ]);
    return NextResponse.json({ success: true, roomTypes, rooms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { room_number, room_type_id, housekeeping_state, notes } = body;

    if (!room_number || !room_type_id) {
      return NextResponse.json(
        { success: false, error: 'room_number and room_type_id are required' },
        { status: 400 }
      );
    }

    const room = await roomsService.addRoom({
      room_number,
      room_type_id,
      housekeeping_state: housekeeping_state || 'available',
      notes: notes || null,
    });

    return NextResponse.json({ success: true, room }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
