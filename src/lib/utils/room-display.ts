import type { HousekeepingState, Room } from '@/lib/types';

export interface HousekeepingBadgeMeta {
  label: string;
  isAvailable: boolean;
  dotClass: string;
  pillClass: string;
}

const HOUSEKEEPING_META: Record<HousekeepingState, HousekeepingBadgeMeta> = {
  available: {
    label: 'Available',
    isAvailable: true,
    dotClass: 'bg-emerald-500',
    pillClass: 'border-emerald-200 bg-emerald-50/90 text-emerald-800',
  },
  unavailable: {
    label: 'Unavailable',
    isAvailable: false,
    dotClass: 'bg-rose-500',
    pillClass: 'border-rose-200 bg-rose-50/90 text-rose-800',
  },
  occupied: {
    label: 'Occupied',
    isAvailable: false,
    dotClass: 'bg-rose-500',
    pillClass: 'border-rose-200 bg-rose-50/90 text-rose-800',
  },
  dirty: {
    label: 'Preparing',
    isAvailable: false,
    dotClass: 'bg-amber-500',
    pillClass: 'border-amber-200 bg-amber-50/90 text-amber-800',
  },
  cleaning: {
    label: 'Refreshing',
    isAvailable: false,
    dotClass: 'bg-sky-500',
    pillClass: 'border-sky-200 bg-sky-50/90 text-sky-800',
  },
  maintenance: {
    label: 'Maintenance',
    isAvailable: false,
    dotClass: 'bg-stone-400',
    pillClass: 'border-stone-200 bg-stone-100/90 text-stone-700',
  },
};

/** Resolve clean display title for a Firestore room document. */
export function getRoomTitle(room: Room): string {
  return (
    room.room_type_name ||
    room.room_category ||
    room.name ||
    room.room_type?.name ||
    `Palace Chamber ${room.room_number}`
  );
}

/** Resolve primary photo URL for a room with curated fallback. */
export function getRoomPhoto(room: Room): string {
  return (
    room.default_photo ||
    room.images?.[0] ||
    room.photos?.[0] ||
    room.room_type?.photos?.[0] ||
    '/images/rooms/deluxe-room-hero.png'
  );
}

/** Resolve full deduplicated gallery URLs for a room. */
export function getRoomGallery(room: Room): string[] {
  const urls = [
    room.default_photo,
    ...(room.images || []),
    ...(room.photos || []),
    ...(room.room_type?.photos || []),
  ].filter((u): u is string => Boolean(u && u.trim()));

  if (urls.length === 0) {
    return ['/images/rooms/deluxe-room-hero.png'];
  }
  return Array.from(new Set(urls));
}

/** Resolve nightly tariff in minor currency units (paise). */
export function getRoomRateMinor(room: Room): number {
  if (typeof room.base_rate_minor === 'number' && room.base_rate_minor > 0) {
    return room.base_rate_minor;
  }
  if (typeof room.price_per_night === 'number' && room.price_per_night > 0) {
    return Math.round(room.price_per_night * 100);
  }
  if (typeof room.room_type?.base_rate_minor === 'number' && room.room_type.base_rate_minor > 0) {
    return room.room_type.base_rate_minor;
  }
  return 650000;
}

/** Resolve guest capacity for a room. */
export function getRoomCapacity(room: Room): number {
  return room.capacity || room.room_type?.capacity || 2;
}

/** Resolve category badge label for a room. */
export function getRoomCategoryBadge(room: Room): string {
  return room.category_badge || 'ROYAL LUXURY';
}

/** Resolve bed type label for a room. */
export function getRoomBedType(room: Room): string {
  return room.bed_type || 'Plush King Bed';
}

/** Resolve room narrative description. */
export function getRoomDescription(room: Room): string {
  return (
    room.description ||
    room.room_type?.description ||
    'Handcrafted heritage chamber featuring bespoke teak furnishings, marble bath appointments, and tranquil palace courtyard ambiance.'
  );
}

/** Resolve curated amenities list. */
export function getRoomAmenities(room: Room): string[] {
  const list =
    room.amenities && room.amenities.length > 0
      ? room.amenities
      : room.room_type?.amenities || [];
  return list.length > 0
    ? list
    : ['Complimentary Wi-Fi', 'Air Conditioning (AC)', '24x7 Room Service', 'Valet Parking'];
}

/** Resolve housekeeping / availability badge metadata. */
export function getRoomHousekeepingMeta(state: Room['housekeeping_state']): HousekeepingBadgeMeta {
  return HOUSEKEEPING_META[state] || HOUSEKEEPING_META.available;
}

/** Calculate nights between two YYYY-MM-DD dates (minimum 1). */
export function calcNightsCount(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff);
}

/** Format YYYY-MM-DD date string for readable editorial UI display. */
export function formatStayDate(ymd: string): string {
  if (!ymd) return '';
  const dt = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return ymd;
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Build `/book/<firebase-room-uid>` href with active stay parameters. */
export function buildRoomBookHref(
  roomId: string,
  params?: { checkIn?: string; checkOut?: string; guests?: string | number }
): string {
  const qs = new URLSearchParams();
  if (params?.checkIn) qs.set('checkIn', params.checkIn);
  if (params?.checkOut) qs.set('checkOut', params.checkOut);
  if (params?.guests !== undefined && params.guests !== '') {
    qs.set('guests', String(params.guests));
  }
  const query = qs.toString();
  return `/book/${encodeURIComponent(roomId)}${query ? `?${query}` : ''}`;
}
