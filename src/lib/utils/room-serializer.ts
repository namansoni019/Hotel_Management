import type { HousekeepingState, Room, RoomType } from '@/lib/types';

function toPlainIsoDate(value: unknown): string {
  if (!value) return '2026-01-01T00:00:00Z';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const maybeTs = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTs.toDate === 'function') {
      try {
        return maybeTs.toDate().toISOString();
      } catch {
        return '2026-01-01T00:00:00Z';
      }
    }
    if (typeof maybeTs.seconds === 'number') {
      return new Date(maybeTs.seconds * 1000).toISOString();
    }
  }
  return String(value);
}

function normalizePhotosList(raw: Record<string, unknown>, nestedType?: Partial<RoomType>): string[] {
  const candidates: string[] = [];
  const pushAll = (arr: unknown) => {
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === 'string' && item.trim() && !candidates.includes(item.trim())) {
          candidates.push(item.trim());
        }
      }
    }
  };

  pushAll(raw.photos);
  pushAll(raw.images);
  if (typeof raw.default_photo === 'string' && raw.default_photo.trim() && !candidates.includes(raw.default_photo.trim())) {
    candidates.push(raw.default_photo.trim());
  }
  pushAll(nestedType?.photos);

  return candidates.length > 0 ? candidates : ['/images/rooms/deluxe-garden.jpg'];
}

function normalizeAmenitiesList(raw: Record<string, unknown>, nestedType?: Partial<RoomType>): string[] {
  const source = Array.isArray(raw.amenities)
    ? raw.amenities
    : Array.isArray(nestedType?.amenities)
    ? nestedType.amenities
    : [];

  const cleaned = source.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return cleaned.length > 0
    ? cleaned
    : ['Complimentary Wi-Fi', 'Air Conditioning (AC)', '24x7 Room Service', 'In-room Dining', 'Valet Parking'];
}

/**
 * Normalizes a raw Firestore `rooms` document (converting Firestore Timestamps to ISO strings)
 * into a serializable `Room` object usable in both Server and Client Components.
 */
export function serializeRoomDoc(docId: string, raw: Record<string, unknown>): Room {
  const nestedRaw = (typeof raw.room_type === 'object' && raw.room_type !== null
    ? raw.room_type
    : {}) as Record<string, unknown>;

  const nestedTypePartial: Partial<RoomType> = {
    id: typeof nestedRaw.id === 'string' ? nestedRaw.id : undefined,
    name: typeof nestedRaw.name === 'string' ? nestedRaw.name : undefined,
    description: typeof nestedRaw.description === 'string' ? nestedRaw.description : undefined,
    capacity: typeof nestedRaw.capacity === 'number' ? nestedRaw.capacity : undefined,
    base_rate_minor: typeof nestedRaw.base_rate_minor === 'number' ? nestedRaw.base_rate_minor : undefined,
    amenities: Array.isArray(nestedRaw.amenities) ? (nestedRaw.amenities as string[]) : undefined,
    photos: Array.isArray(nestedRaw.photos) ? (nestedRaw.photos as string[]) : undefined,
  };

  const roomNumber = String(raw.room_number ?? '').trim();
  const displayName = String(
    raw.name ||
      raw.room_category ||
      raw.room_type_name ||
      nestedTypePartial.name ||
      (roomNumber ? `Chamber ${roomNumber}` : 'Royal Deluxe Chamber')
  );

  const description = String(
    raw.description ||
      nestedTypePartial.description ||
      'Handcrafted Rajasthani sanctuary adorned with carved archways, fine textiles, and modern comforts.'
  );

  const capacity =
    typeof raw.capacity === 'number' && raw.capacity > 0
      ? raw.capacity
      : typeof nestedTypePartial.capacity === 'number' && nestedTypePartial.capacity > 0
      ? nestedTypePartial.capacity
      : 2;

  const baseRateMinor =
    typeof raw.base_rate_minor === 'number' && raw.base_rate_minor > 0
      ? raw.base_rate_minor
      : typeof nestedTypePartial.base_rate_minor === 'number' && nestedTypePartial.base_rate_minor > 0
      ? nestedTypePartial.base_rate_minor
      : typeof raw.price_per_night === 'number' && raw.price_per_night > 0
      ? Math.round(raw.price_per_night * 100)
      : 650000;

  const pricePerNight =
    typeof raw.price_per_night === 'number' && raw.price_per_night > 0
      ? raw.price_per_night
      : Math.round(baseRateMinor / 100);

  const photos = normalizePhotosList(raw, nestedTypePartial);
  const amenities = normalizeAmenitiesList(raw, nestedTypePartial);
  const createdAt = toPlainIsoDate(raw.created_at);
  const roomTypeId = String(raw.room_type_id || nestedTypePartial.id || docId);

  const normalizedRoomType: RoomType = {
    id: roomTypeId,
    property_id: String(nestedRaw.property_id || raw.property_id || 'd0000000-0000-0000-0000-000000000001'),
    name: String(nestedTypePartial.name || raw.room_type_name || raw.room_category || displayName),
    description,
    capacity,
    total_rooms: typeof nestedRaw.total_rooms === 'number' ? nestedRaw.total_rooms : 1,
    base_rate_minor: baseRateMinor,
    amenities,
    photos,
    is_active: nestedRaw.is_active !== false,
    created_at: toPlainIsoDate(nestedRaw.created_at || createdAt),
  };

  return {
    id: docId,
    room_type_id: roomTypeId,
    room_number: roomNumber,
    housekeeping_state: (raw.housekeeping_state as HousekeepingState) || 'available',
    notes: typeof raw.notes === 'string' ? raw.notes : null,
    name: displayName,
    room_category: String(raw.room_category || normalizedRoomType.name),
    room_type_name: String(raw.room_type_name || normalizedRoomType.name),
    category_badge: typeof raw.category_badge === 'string' ? raw.category_badge : undefined,
    bed_type: typeof raw.bed_type === 'string' ? raw.bed_type : undefined,
    capacity,
    base_rate_minor: baseRateMinor,
    price_per_night: pricePerNight,
    description,
    amenities,
    default_photo: typeof raw.default_photo === 'string' ? raw.default_photo : photos[0],
    images: Array.isArray(raw.images) ? (raw.images as string[]) : photos,
    photos,
    is_active: raw.is_active !== false,
    created_at: createdAt,
    room_type: normalizedRoomType,
  };
}

/** Sort rooms consistently by numeric/natural room_number order. */
export function sortRoomsByNumber(rooms: Room[]): Room[] {
  return [...rooms].sort((a, b) =>
    (a.room_number || a.name || a.id).localeCompare(b.room_number || b.name || b.id, undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );
}
