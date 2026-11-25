import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { roomsService } from '@/lib/services/rooms-service';
import { RoomDetailClient } from './room-detail-client';

export const dynamic = 'force-dynamic';

interface RoomDetailPageProps {
  params: Promise<{ roomTypeId: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    guests?: string;
  }>;
}

function getOffsetDateYMD(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function generateMetadata({ params }: RoomDetailPageProps) {
  const resolved = await params;
  const room = await roomsService.getRoomById(resolved.roomTypeId);
  if (!room) return { title: 'Chamber Not Found | Rajmahal Heritage Hotel' };

  const titleName = room.name || room.room_category || `Room ${room.room_number}`;
  return {
    title: `${titleName}${room.room_number ? ` (#${room.room_number})` : ''} | Rajmahal Heritage Hotel`,
    description: room.description || room.room_type?.description,
  };
}

async function RoomDetailLoader({ params, searchParams }: RoomDetailPageProps) {
  const [resolved, resolvedSearch] = await Promise.all([params, searchParams]);
  const [room, allRooms] = await Promise.all([
    roomsService.getRoomById(resolved.roomTypeId),
    roomsService.getRooms(),
  ]);

  if (!room) {
    notFound();
  }

  const checkIn = resolvedSearch.checkIn || getOffsetDateYMD(0);
  const checkOut = resolvedSearch.checkOut || getOffsetDateYMD(3);
  const parsedGuests = parseInt(resolvedSearch.guests || '2', 10);
  const guests = Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : 2;

  return (
    <RoomDetailClient
      initialRoom={room}
      initialAllRooms={allRooms}
      initialCheckIn={checkIn}
      initialCheckOut={checkOut}
      initialGuests={guests}
    />
  );
}

export default function RoomDetailPage(props: RoomDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-[#FAF7F2] flex items-center justify-center text-[#4F0809] font-heritage text-lg">
          Loading chamber details...
        </div>
      }
    >
      <RoomDetailLoader {...props} />
    </Suspense>
  );
}
