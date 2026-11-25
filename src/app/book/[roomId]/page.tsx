import type { Metadata } from 'next';
import { roomsService } from '@/lib/services/rooms-service';
import { getRoomTitle } from '@/lib/utils/room-display';
import { BookRoomClient, type BookInitialParams } from '@/components/book/book-room-client';

export const dynamic = 'force-dynamic';

interface BookRoomByIdPageProps {
  params: Promise<{ roomId: string }>;
  searchParams?: Promise<BookInitialParams>;
}

export async function generateMetadata({ params }: BookRoomByIdPageProps): Promise<Metadata> {
  const { roomId } = await params;
  const decodedRoomId = decodeURIComponent(roomId);
  const room = await roomsService.getRoomById(decodedRoomId);
  const label = room ? `${getRoomTitle(room)} (Room #${room.room_number})` : 'Royal Chamber';
  return {
    title: `Reserve ${label} | Rajmahal Heritage Grand`,
    description: `Complete your direct palace reservation for ${label} at Rajmahal Heritage Grand, Udaipur.`,
  };
}

export default async function BookRoomByIdPage({ params, searchParams }: BookRoomByIdPageProps) {
  const [{ roomId }, resolvedSearchParams, allRooms] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve({} as BookInitialParams),
    roomsService.getRooms(),
  ]);

  const decodedRoomId = decodeURIComponent(roomId);
  const initialRoom =
    allRooms.find((r) => r.id === decodedRoomId) ||
    (await roomsService.getRoomById(decodedRoomId));

  return (
    <BookRoomClient
      initialRoom={initialRoom}
      initialAllRooms={allRooms}
      routeRoomId={decodedRoomId}
      initialParams={resolvedSearchParams}
    />
  );
}
