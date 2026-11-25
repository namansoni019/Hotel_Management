import { Suspense } from 'react';
import { roomsService } from '@/lib/services/rooms-service';
import { RoomsPageClient } from '@/components/rooms/rooms-page-client';

export const dynamic = 'force-dynamic';

interface RoomsPageProps {
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  }>;
}

export const metadata = {
  title: 'Our Heritage Chambers & Rooms | Rajmahal Heritage Hotel',
  description:
    'Discover Rajmahal Heritage Hotel luxury Deluxe Chambers fetched live from our sanctuary inventory, complete with handcrafted Rajasthani stonework, Wi-Fi, 24x7 butler service, and in-room dining.',
};

function getOffsetDateYMD(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function RoomsContent({ searchParams }: RoomsPageProps) {
  const resolvedParams = await searchParams;
  const checkIn = resolvedParams.checkIn || getOffsetDateYMD(0);
  const checkOut = resolvedParams.checkOut || getOffsetDateYMD(3);
  const parsedGuests = parseInt(resolvedParams.guests || '2', 10);
  const guests = Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : 2;

  // Fetch live rooms from Firestore `rooms` collection
  const allRooms = await roomsService.getRooms();

  return (
    <RoomsPageClient
      initialRooms={allRooms}
      initialCheckIn={checkIn}
      initialCheckOut={checkOut}
      initialGuests={guests}
    />
  );
}

export default function RoomsPage(props: RoomsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[#FAF7F2] flex items-center justify-center text-[#4F0809] font-heritage text-lg">
          Preparing royal heritage chambers...
        </div>
      }
    >
      <RoomsContent {...props} />
    </Suspense>
  );
}
