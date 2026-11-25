import { NextResponse } from 'next/server';
import { reservationsService } from '@/lib/services/reservations-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const reservations = uid
      ? await reservationsService.getReservationsForUser(uid)
      : await reservationsService.getReservations();
    return NextResponse.json({ success: true, reservations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reservations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      roomTypeId,
      roomId,
      roomNumber,
      rateMinor,
      checkIn,
      checkOut,
      checkInTime,
      checkOutTime,
      check_in_time,
      check_out_time,
      earlyCheckInOpted,
      lateCheckOutOpted,
      idSubmissionMode,
      partySize,
      guestName,
      guestPhone,
      guestEmail,
      primaryGuestUid,
      notes,
      guestsDetails,
      aadhaarDetails,
      depositAmountMinor,
      paymentMethod,
      paymentStatus,
      paymentReference,
    } = body;

    const resolvedRoomTypeId = roomTypeId || roomId;

    if (!resolvedRoomTypeId || !checkIn || !checkOut || !guestName || !guestPhone) {
      return NextResponse.json(
        { success: false, error: 'Missing required reservation fields' },
        { status: 400 }
      );
    }

    const reservation = await reservationsService.createReservation({
      roomTypeId: resolvedRoomTypeId,
      roomId,
      roomNumber,
      rateMinor: typeof rateMinor === 'number' ? rateMinor : undefined,
      checkIn,
      checkOut,
      checkInTime: checkInTime || check_in_time || '12:00 PM',
      checkOutTime: checkOutTime || check_out_time || '11:00 AM',
      earlyCheckInOpted: Boolean(earlyCheckInOpted),
      lateCheckOutOpted: Boolean(lateCheckOutOpted),
      idSubmissionMode: idSubmissionMode === 'submit_at_counter' ? 'submit_at_counter' : 'upload_now',
      partySize: Number(partySize) || 2,
      guestName,
      guestPhone,
      guestEmail,
      primaryGuestUid: typeof primaryGuestUid === 'string' && primaryGuestUid.trim() ? primaryGuestUid.trim() : null,
      notes,
      guestsDetails,
      aadhaarDetails,
      depositAmountMinor: typeof depositAmountMinor === 'number' ? depositAmountMinor : undefined,
      paymentMethod,
      paymentStatus,
      paymentReference,
    });

    return NextResponse.json({ success: true, reservation, data: reservation }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error creating reservation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
