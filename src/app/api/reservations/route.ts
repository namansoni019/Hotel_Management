import { NextResponse } from 'next/server';
import { reservationsService } from '@/lib/services/reservations-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reservations = await reservationsService.getReservations();
    return NextResponse.json({ success: true, reservations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomTypeId, checkIn, checkOut, partySize, guestName, guestPhone, guestEmail, notes, aadhaarDetails } = body;

    if (!roomTypeId || !checkIn || !checkOut || !guestName || !guestPhone) {
      return NextResponse.json({ success: false, error: 'Missing required reservation fields' }, { status: 400 });
    }

    const reservation = await reservationsService.createReservation({
      roomTypeId,
      checkIn,
      checkOut,
      partySize: Number(partySize) || 2,
      guestName,
      guestPhone,
      guestEmail,
      notes,
      aadhaarDetails,
    });

    return NextResponse.json({ success: true, reservation }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error creating reservation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
