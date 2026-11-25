import type { Metadata } from 'next';
import { roomsService } from '@/lib/services/rooms-service';
import { BookRoomClient, type BookInitialParams } from '@/components/book/book-room-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Book Your Royal Chamber | Rajmahal Heritage Grand',
  description:
    'Direct reservation desk for Rajmahal Heritage Grand rooms & imperial suites with live availability and instant booking voucher.',
};

interface BookPageProps {
  searchParams?: Promise<BookInitialParams>;
}

export default async function BookPage({ searchParams }: BookPageProps) {
  const [resolvedParams, allRooms] = await Promise.all([
    searchParams ? searchParams : Promise.resolve({} as BookInitialParams),
    roomsService.getRooms(),
  ]);

  const matchedRoom =
    (resolvedParams.roomId
      ? allRooms.find((r) => r.id === resolvedParams.roomId) ||
        (await roomsService.getRoomById(resolvedParams.roomId))
      : null) ||
    (resolvedParams.roomTypeId
      ? allRooms.find(
          (r) =>
            (r.room_type_id === resolvedParams.roomTypeId || r.id === resolvedParams.roomTypeId) &&
            r.housekeeping_state === 'available'
        ) ||
        allRooms.find((r) => r.room_type_id === resolvedParams.roomTypeId) ||
        null
      : null) ||
    allRooms.find((r) => r.housekeeping_state === 'available') ||
    allRooms[0] ||
    null;

  return (
    <BookRoomClient
      initialRoom={matchedRoom}
      initialAllRooms={allRooms}
      initialParams={resolvedParams}
    />
  );
}
