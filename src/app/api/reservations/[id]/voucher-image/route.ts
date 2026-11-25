import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { reservationsService } from '@/lib/services/reservations-service';

export const dynamic = 'force-dynamic';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatShortDate(ymd: string): string {
  if (!ymd) return '';
  const dt = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return ymd;
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const reservation = await reservationsService.getReservationByReference(decodeURIComponent(id));
    if (!reservation) {
      return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });
    }

    const guestName = escapeXml(reservation.guest?.name || 'Royal Guest');
    const refCode = escapeXml(reservation.reference_code);
    const verifyCode = escapeXml(reservation.verification_code || reservation.reference_code);
    const chamberTitle = escapeXml(
      `${reservation.room_type_name || 'Royal Chamber'}${
        reservation.room_number ? ` • Room #${reservation.room_number}` : ''
      }`
    );
    const stayDates = escapeXml(
      `${formatShortDate(reservation.check_in)} to ${formatShortDate(reservation.check_out)}`
    );
    const timings = escapeXml(
      `${reservation.check_in_time || 'After 12:00 Noon'} | ${
        reservation.check_out_time || 'Before 11:00 AM'
      }`
    );

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
      <defs>
        <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#D8AA67"/>
          <stop offset="50%" stop-color="#9C7A45"/>
          <stop offset="100%" stop-color="#D8AA67"/>
        </linearGradient>
      </defs>
      <rect width="900" height="520" fill="#FAF7F2"/>
      <rect x="20" y="20" width="860" height="480" rx="28" fill="#FFFFFF" stroke="url(#goldBorder)" stroke-width="2.5"/>
      <rect x="34" y="34" width="832" height="452" rx="22" fill="none" stroke="#E8DFCE" stroke-width="1"/>

      <!-- Decorative subtle lotus halo -->
      <circle cx="810" cy="95" r="145" fill="none" stroke="#D8AA67" stroke-opacity="0.2" stroke-width="1.5"/>
      <circle cx="810" cy="95" r="105" fill="none" stroke="#D8AA67" stroke-opacity="0.22" stroke-dasharray="4 6" stroke-width="1.5"/>

      <!-- Header -->
      <text x="58" y="80" font-family="Georgia, serif" font-size="13" font-weight="bold" letter-spacing="3" fill="#9C7A45">RAJMAHAL HERITAGE GRAND PALACE • UDAIPUR</text>
      <text x="58" y="124" font-family="Georgia, serif" font-size="38" font-weight="bold" fill="#4F0809">Official Stay Invitation Pass</text>
      <line x1="58" y1="146" x2="842" y2="146" stroke="#EDE5D8" stroke-width="1.5"/>

      <!-- Details Grid -->
      <text x="58" y="186" font-family="sans-serif" font-size="12" font-weight="bold" letter-spacing="1.8" fill="#8C755C">CHAMBER RESERVED</text>
      <text x="58" y="216" font-family="Georgia, serif" font-size="25" font-weight="bold" fill="#4F0809">${chamberTitle}</text>

      <text x="58" y="264" font-family="sans-serif" font-size="12" font-weight="bold" letter-spacing="1.8" fill="#8C755C">STAY SCHEDULE</text>
      <text x="58" y="292" font-family="sans-serif" font-size="20" font-weight="bold" fill="#2B2018">${stayDates}</text>
      <text x="58" y="318" font-family="sans-serif" font-size="13" fill="#6A5A4E">${timings}</text>

      <text x="58" y="366" font-family="sans-serif" font-size="12" font-weight="bold" letter-spacing="1.8" fill="#8C755C">PRIMARY GUEST &amp; PARTY</text>
      <text x="58" y="396" font-family="sans-serif" font-size="20" font-weight="bold" fill="#2B2018">${guestName} • ${reservation.party_size} Guest${reservation.party_size > 1 ? 's' : ''}</text>

      <!-- Reference & Verification Box -->
      <rect x="570" y="172" width="272" height="232" rx="20" fill="#FAF7F2" stroke="#D8AA67" stroke-width="1.5"/>
      <text x="706" y="206" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" letter-spacing="2" fill="#9C7A45">BOOKING REF</text>
      <text x="706" y="242" text-anchor="middle" font-family="monospace" font-size="28" font-weight="bold" fill="#4F0809">${refCode}</text>

      <line x1="600" y1="264" x2="812" y2="264" stroke="#E8DFCE" stroke-width="1"/>

      <text x="706" y="296" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" letter-spacing="2" fill="#9C7A45">GUEST VERIFY CODE</text>
      <rect x="616" y="312" width="180" height="48" rx="12" fill="#4F0809"/>
      <text x="706" y="344" text-anchor="middle" font-family="monospace" font-size="24" font-weight="bold" letter-spacing="4" fill="#FAF7F2">${verifyCode}</text>
      <text x="706" y="384" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#6A5A4E">Enter on /bookings to claim pass</text>

      <!-- Footer -->
      <line x1="58" y1="432" x2="842" y2="432" stroke="#EDE5D8" stroke-width="1.5"/>
      <text x="58" y="462" font-family="sans-serif" font-size="13" fill="#7A6A5B">Open the shared booking link to add this stay to "Your Bookings" on Rajmahal</text>
      <text x="842" y="462" text-anchor="end" font-family="Georgia, serif" font-size="14" font-style="italic" fill="#9C7A45">Padharo Mhare Desh</text>
    </svg>`;

    const png = await sharp(Buffer.from(svg)).png().toBuffer();

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Voucher image generation error:', err);
    return NextResponse.json({ success: false, error: 'Failed to generate voucher image' }, { status: 500 });
  }
}
