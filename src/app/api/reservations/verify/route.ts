import { NextResponse } from 'next/server';
import { reservationsService } from '@/lib/services/reservations-service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const reservationIdOrRef = String(body.reservationIdOrRef || body.reference || '').trim();
    const verificationCode = String(body.verificationCode || body.code || '').trim();
    const userUid = String(body.userUid || body.uid || '').trim();

    if (!reservationIdOrRef || !verificationCode || !userUid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking reference, verification code, and signed-in user UID are required.',
        },
        { status: 400 }
      );
    }

    const reservation = await reservationsService.verifyGuestBookingCode({
      reservationIdOrRef,
      verificationCode,
      userUid,
    });

    return NextResponse.json({ success: true, reservation }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify booking code.';
    const status = message.toLowerCase().includes('invalid verification code') ? 403 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
