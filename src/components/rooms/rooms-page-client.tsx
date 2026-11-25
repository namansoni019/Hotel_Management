'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room } from '@/lib/types';
import { serializeRoomDoc, sortRoomsByNumber } from '@/lib/utils/room-serializer';
import { formatMoney } from '@/lib/utils/money';
import {
  IconKingBed,
  IconGuests,
  IconFreeWiFi,
  IconCityView,
  IconInRoomDining,
  IconRoomService24,
} from '@/components/ui/heritage-art';
import {
  LataJaaliRunner,
  HeritageDivider,
  MandalaOrnament,
} from '@/components/ui/heritage-ornaments';
import { RoomsFilterBar } from '@/components/rooms/rooms-filter-bar';
import {
  ArrowRight,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Wifi,
  Wind,
  Utensils,
  Car,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface RoomsPageClientProps {
  initialRooms: Room[];
  initialCheckIn: string;
  initialCheckOut: string;
  initialGuests: number;
}

type SortOrder = 'curated' | 'price_asc' | 'price_desc';

/** Observe when an element enters the viewport for scroll-driven staggered reveal. */
function useInView(forceVisible = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(forceVisible);

  useEffect(() => {
    if (forceVisible) return;

    const el = ref.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const rafId = requestAnimationFrame(() => setIsInView(true));
      return () => cancelAnimationFrame(rafId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.02, rootMargin: '0px 0px 40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [forceVisible]);

  return [ref, forceVisible || isInView] as const;
}

const SANCTUARY_PRIVILEGES = [
  {
    label: 'Royal Morning Feast',
    desc: 'Complimentary breakfast buffet served daily in our courtyard dining hall',
    icon: IconInRoomDining,
  },
  {
    label: '24×7 Palace Butler',
    desc: 'Attentive round-the-clock hospitality & private in-chamber dining',
    icon: IconRoomService24,
  },
  {
    label: 'Heritage Jharokha Vistas',
    desc: 'Hand-carved sandstone balconies overlooking serene palace gardens',
    icon: IconCityView,
  },
  {
    label: 'High-Speed Wi-Fi & Valet',
    desc: 'Seamless palace-wide connectivity and chauffeur-driven valet arrival',
    icon: IconFreeWiFi,
  },
];

function getRoomDisplayName(room: Room): string {
  return (
    room.name ||
    room.room_category ||
    room.room_type_name ||
    room.room_type?.name ||
    (room.room_number ? `Chamber ${room.room_number}` : 'Royal Deluxe Chamber')
  );
}

function getRoomBadge(room: Room): string {
  if (room.category_badge && room.category_badge.trim()) {
    return room.category_badge.trim();
  }
  const lower = getRoomDisplayName(room).toLowerCase();
  const cap = room.capacity ?? room.room_type?.capacity ?? 2;
  if (cap >= 3) return 'Family Sanctuary';
  if (lower.includes('non-deluxe') || lower.includes('classic') || lower.includes('standard')) {
    return 'Heritage Chamber';
  }
  if (lower.includes('suite')) return 'Royal Suite';
  return 'Royal Deluxe';
}

function getBedLabel(room: Room): string {
  if (room.bed_type && room.bed_type.trim()) {
    return room.bed_type.trim();
  }
  const text = `${getRoomDisplayName(room)} ${room.description || ''}`.toLowerCase();
  if (text.includes('double bed')) return 'Double Bed';
  if (text.includes('twin')) return 'Twin Beds';
  return 'Plush King Bed';
}

function getRoomStatusInfo(state: Room['housekeeping_state']) {
  if (state === 'available') {
    return {
      label: 'Available',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-800',
    };
  }
  if (state === 'unavailable') {
    return {
      label: 'Unavailable',
      dotClass: 'bg-rose-500',
      textClass: 'text-rose-800',
    };
  }
  if (state === 'occupied') {
    return {
      label: 'Reserved',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-800',
    };
  }
  return {
    label: 'Preparing',
    dotClass: 'bg-[#D8AA67]',
    textClass: 'text-[#856B4D]',
  };
}

function ChamberCard({
  room,
  index,
  columnsCount,
  checkIn,
  checkOut,
  guests,
  forceReveal,
}: {
  room: Room;
  index: number;
  columnsCount: 2 | 3;
  checkIn: string;
  checkOut: string;
  guests: number;
  forceReveal: boolean;
}) {
  const [cardRef, isInView] = useInView(forceReveal);

  const displayName = getRoomDisplayName(room);
  const badgeLabel = getRoomBadge(room);
  const bedLabel = getBedLabel(room);
  const statusInfo = getRoomStatusInfo(room.housekeeping_state);
  const capacity = room.capacity ?? room.room_type?.capacity ?? 2;
  const baseRateMinor =
    room.base_rate_minor ??
    room.room_type?.base_rate_minor ??
    (room.price_per_night ? room.price_per_night * 100 : 650000);

  const roomImage =
    room.photos?.[0] ||
    room.images?.[0] ||
    room.default_photo ||
    room.room_type?.photos?.[0] ||
    '/images/rooms/deluxe-garden.jpg';

  const queryParams = `checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(
    checkOut
  )}&guests=${encodeURIComponent(String(guests))}`;
  const detailHref = `/rooms/${encodeURIComponent(room.id)}?${queryParams}`;
  const bookHref = `/book/${encodeURIComponent(room.id)}?${queryParams}`;

  const rawAmenities =
    room.amenities && room.amenities.length > 0
      ? room.amenities
      : room.room_type?.amenities && room.room_type.amenities.length > 0
      ? room.room_type.amenities
      : ['Complimentary Wi-Fi', 'Air Conditioning (AC)', '24x7 Room Service'];
  const visibleAmenities = rawAmenities.slice(0, 3);
  const staggerDelay = (index % columnsCount) * 60;

  return (
    <article
      ref={cardRef}
      className={`group bg-white rounded-3xl p-4 sm:p-5 border border-[#E8DFCE] shadow-[0_4px_20px_rgba(79,8,9,0.03)] hover:shadow-[0_20px_35px_rgba(79,8,9,0.08)] hover:border-[#D8AA67]/80 hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-full min-w-0 ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{
        transitionDelay: forceReveal ? '0ms' : `${staggerDelay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Inset Framed Chamber Image */}
      <Link
        href={detailHref}
        className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[#FAF5EB] mb-4 block shrink-0"
      >
        <Image
          src={roomImage}
          alt={room.room_number ? `${displayName} — Room ${room.room_number}` : displayName}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#241F1A]/30 via-transparent to-transparent pointer-events-none" />

        {/* Category Badge (from `category_badge` in DB) */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/92 backdrop-blur-md text-[#4F0809] border border-[#E8DFCE]/90 text-[10px] font-bold uppercase tracking-[0.14em] px-3 py-1 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D8AA67]" />
          {badgeLabel}
        </span>

        {/* Room Number Pill (from `room_number` in DB) */}
        {room.room_number && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-white/92 backdrop-blur-md text-[#4F0809] border border-[#E8DFCE]/90 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full shadow-2xs">
            Room #{room.room_number}
          </span>
        )}
      </Link>

      {/* Card Body */}
      <div className="flex-1 flex flex-col justify-between min-w-0 px-1">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <Link href={detailHref} className="block min-w-0">
              <h2
                className="text-xl sm:text-2xl font-bold text-[#4F0809] group-hover:text-[#9C7A45] transition-colors leading-snug"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                {displayName}
              </h2>
            </Link>

            <span
              className={`inline-flex items-center gap-1.5 shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E8DFCE]/80 mt-1 ${statusInfo.textClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
              <span>{statusInfo.label}</span>
            </span>
          </div>

          <p className="text-xs text-[#6B533B] leading-relaxed font-normal line-clamp-2 mb-4">
            {room.description ||
              room.room_type?.description ||
              'Handcrafted Rajasthani sanctuary adorned with carved archways, fine textiles, and modern comforts.'}
          </p>

          {/* Clean Light Minimal Specs Strip */}
          <div className="flex items-center justify-around gap-2.5 text-[11px] font-medium text-[#5A4A3F] bg-[#FAF7F2] rounded-2xl px-3.5 py-2.5 border border-[#E8DFCE]/70 mb-3.5">
            <span className="inline-flex items-center min-w-0">
              <IconKingBed className="w-3.5 h-3.5 text-[#9C7A45] mr-1.5 shrink-0" />
              <span className="truncate">{bedLabel}</span>
            </span>
            <span className="text-[#D8AA67] text-[9px] shrink-0" aria-hidden="true">
              &#9830;
            </span>
            <span className="inline-flex items-center min-w-0">
              <IconGuests className="w-3.5 h-3.5 text-[#9C7A45] mr-1.5 shrink-0" />
              <span className="truncate">Up to {capacity} Guests</span>
            </span>
          </div>

          {/* Amenity Chips */}
          <div className="flex-wrap-balance gap-1.5 mb-4">
            {visibleAmenities.map((amenity, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#FAF5EB] text-[#8C6D3B] border border-[#EBE3D5]"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>

        {/* Tariff & Rounded Pill CTAs */}
        <div className="pt-3.5 border-t border-[#E8DFCE]/80 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-[0.16em] text-[#856B4D] font-bold block">
              Royal Tariff
            </span>
            <div className="flex items-baseline gap-1">
              <span
                className="text-xl font-bold text-[#4F0809] leading-none"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                {formatMoney(baseRateMinor)}
              </span>
              <span className="text-[11px] text-[#6B533B] font-normal">/ night</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={detailHref}
              className="px-3.5 py-2 rounded-full bg-[#FAF5EB] hover:bg-[#F2E7D2] border border-[#E8DFCE] text-[#4F0809] text-xs font-bold transition-colors"
            >
              Details
            </Link>
            <Link
              href={bookHref}
              className="inline-flex items-center space-x-1 px-4 py-2 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-xs font-bold tracking-wide transition-all shadow-2xs active:scale-[0.98]"
            >
              <span>Book Stay</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function RoomsPageClient({
  initialRooms,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
}: RoomsPageClientProps) {
  const [rooms, setRooms] = useState<Room[]>(() => sortRoomsByNumber(initialRooms));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('curated');
  const [hasInteractedFilter, setHasInteractedFilter] = useState(false);

  const [privilegesRef, privilegesInView] = useInView(false);
  const [conciergeRef, conciergeInView] = useInView(false);

  // Real-time subscription directly to Firestore `rooms` collection
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          const live = snap.docs
            .map((d) => serializeRoomDoc(d.id, d.data() as Record<string, unknown>))
            .filter((r) => r.is_active !== false);
          if (live.length > 0) {
            setRooms(sortRoomsByNumber(live));
          }
        }
      },
      (err) => {
        console.warn('Firestore rooms snapshot fallback:', err);
      }
    );
    return () => unsub();
  }, []);

  const nightsCount = useMemo(() => {
    try {
      const d1 = new Date(`${initialCheckIn}T00:00:00`);
      const d2 = new Date(`${initialCheckOut}T00:00:00`);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  }, [initialCheckIn, initialCheckOut]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const r of rooms) {
      const cat = (r.room_category || r.room_type_name || r.name || '').trim();
      if (cat) unique.add(cat);
    }
    return Array.from(unique);
  }, [rooms]);

  const filteredAndSortedRooms = useMemo(() => {
    let list = [...rooms];

    if (selectedCategory !== 'all') {
      list = list.filter((r) => {
        const cat = (r.room_category || r.room_type_name || r.name || '').trim();
        return cat === selectedCategory;
      });
    }

    if (onlyAvailable) {
      list = list.filter((r) => r.housekeeping_state === 'available');
    }

    const rateOf = (r: Room) =>
      r.base_rate_minor ??
      r.room_type?.base_rate_minor ??
      (r.price_per_night ? r.price_per_night * 100 : 650000);

    if (sortOrder === 'price_asc') {
      list.sort((a, b) => rateOf(a) - rateOf(b));
    } else if (sortOrder === 'price_desc') {
      list.sort((a, b) => rateOf(b) - rateOf(a));
    } else {
      // Curated: available first, then room number order
      list = sortRoomsByNumber(list).sort((a, b) => {
        const aAvail = a.housekeeping_state === 'available' ? 0 : 1;
        const bAvail = b.housekeeping_state === 'available' ? 0 : 1;
        return aAvail - bAvail;
      });
    }

    return list;
  }, [rooms, selectedCategory, onlyAvailable, sortOrder]);

  const cycleSortOrder = () => {
    setHasInteractedFilter(true);
    setSortOrder((prev) =>
      prev === 'curated' ? 'price_asc' : prev === 'price_asc' ? 'price_desc' : 'curated'
    );
  };

  const sortLabel =
    sortOrder === 'curated'
      ? 'Sort: Curated'
      : sortOrder === 'price_asc'
      ? 'Tariff: Low to High'
      : 'Tariff: High to Low';

  const useTwoColumns =
    filteredAndSortedRooms.length === 2 || filteredAndSortedRooms.length === 4;
  const columnsCount: 2 | 3 = useTwoColumns ? 2 : 3;

  return (
    <div className="relative bg-[#FAF7F2] min-h-dvh pt-24 sm:pt-28 lg:pt-32 pb-32 sm:pb-24 text-[#241F1A] overflow-x-clip selection:bg-[#4F0809] selection:text-[#FFF8EB]">
      {/* ── Delicate Architectural Jaali Side Runners ── */}
      <LataJaaliRunner side="left" opacity={0.1} color="#B08D57" className="hidden xl:block" />
      <LataJaaliRunner side="right" opacity={0.1} color="#B08D57" className="hidden xl:block" />

      {/* ── Subtle Corner Mandalas ── */}
      <MandalaOrnament position="top-left" opacity={0.05} color="#B08D57" size="420px" />
      <MandalaOrnament position="top-right" opacity={0.05} color="#B08D57" size="420px" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-14">
        {/* ── 1. LIGHT MINIMAL EDITORIAL HEADER ── */}
        <header className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] text-[#9C7A45] text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#D8AA67]" />
            <span>Rajputana Sanctuary &amp; Suites</span>
          </div>

          <h1
            className="font-bold text-[#4F0809] tracking-tight leading-[1.08]"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              fontSize: 'clamp(2.1rem, 1.4rem + 2.6vw, 3.75rem)',
            }}
          >
            Our Heritage <span className="text-[#9C7A45] italic font-normal">Chambers</span>
          </h1>

          {/* Diamond-Tipped Antique Gold Rule */}
          <div className="flex items-center justify-center gap-2 w-36 mx-auto">
            <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]" />
            <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
          </div>

          <p className="text-xs sm:text-base text-[#5A4A3F] font-normal leading-relaxed">
            Every sanctuary chamber harmonizes heirloom Rajasthani stonework with contemporary comfort,
            complimentary palace Wi-Fi, 24×7 butler service, and private in-room dining.
          </p>

          {/* Compact Complimentary Highlights Strip */}
          <div className="flex-wrap-balance items-center justify-center gap-x-5 gap-y-2 pt-1 text-[11px] sm:text-xs text-[#6B533B]">
            <span className="inline-flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-[#9C7A45]" />
              <span className="font-medium">High-Speed Wi-Fi</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-[#9C7A45]" />
              <span className="font-medium">Climate Control</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-[#9C7A45]" />
              <span className="font-medium">24×7 In-Room Dining</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-[#9C7A45]" />
              <span className="font-medium">Royal Valet</span>
            </span>
          </div>
        </header>

        {/* ── 2. FLOATING LIGHT MINIMAL SEARCH & AVAILABILITY BAR ── */}
        <RoomsFilterBar
          initialCheckIn={initialCheckIn}
          initialCheckOut={initialCheckOut}
          initialGuests={initialGuests}
        />

        {/* ── 3. CHAMBER COLLECTION FILTER STRIP & GRID ── */}
        <section aria-label="Heritage Chambers Collection" className="space-y-6">
          {/* Light Minimal Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-4 border-b border-[#E8DFCE]/80">
            <div className="flex items-center flex-wrap gap-2 text-xs text-[#5A4A3F]">
              <span className="inline-flex items-center gap-1.5 font-bold text-[#4F0809]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#9C7A45]" />
                <span>
                  {filteredAndSortedRooms.length}{' '}
                  {filteredAndSortedRooms.length === 1 ? 'Chamber' : 'Chambers'} Found
                </span>
              </span>
              <span className="text-[#D8AA67]" aria-hidden="true">
                &bull;
              </span>
              <span className="inline-flex items-center gap-1 text-[#856B4D]">
                <Calendar className="w-3.5 h-3.5 text-[#9C7A45]" />
                <span>
                  {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'} &middot; {initialGuests}{' '}
                  {initialGuests === 1 ? 'Guest' : 'Guests'}
                </span>
              </span>
            </div>

            {/* Category, Availability & Sort Pills */}
            <div className="flex-wrap-balance items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setHasInteractedFilter(true);
                  setSelectedCategory('all');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                  selectedCategory === 'all'
                    ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-2xs'
                    : 'bg-white text-[#4F0809] border-[#E8DFCE] hover:bg-[#FAF5EB] hover:border-[#D8AA67]'
                }`}
              >
                All Chambers ({rooms.length})
              </button>

              {categories.length > 1 &&
                categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setHasInteractedFilter(true);
                        setSelectedCategory(cat);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                        active
                          ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-2xs'
                          : 'bg-white text-[#4F0809] border-[#E8DFCE] hover:bg-[#FAF5EB] hover:border-[#D8AA67]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}

              <button
                type="button"
                onClick={() => {
                  setHasInteractedFilter(true);
                  setOnlyAvailable((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                  onlyAvailable
                    ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-2xs'
                    : 'bg-white text-[#4F0809] border-[#E8DFCE] hover:bg-[#FAF5EB] hover:border-[#D8AA67]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    onlyAvailable ? 'bg-emerald-400' : 'bg-emerald-500'
                  }`}
                />
                <span>Available Only</span>
              </button>

              <button
                type="button"
                onClick={cycleSortOrder}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FAF5EB] hover:bg-[#F2E7D2] border border-[#E8DFCE] text-xs font-semibold text-[#4F0809] transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3 h-3 text-[#9C7A45]" />
                <span>{sortLabel}</span>
              </button>
            </div>
          </div>

          {/* Dynamic Balanced Grid */}
          {filteredAndSortedRooms.length > 0 ? (
            <div
              className={`grid gap-6 sm:gap-8 items-stretch ${
                filteredAndSortedRooms.length === 1
                  ? 'grid-cols-1 max-w-lg mx-auto'
                  : useTwoColumns
                  ? 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {filteredAndSortedRooms.map((room, idx) => (
                <ChamberCard
                  key={room.id}
                  room={room}
                  index={idx}
                  columnsCount={columnsCount}
                  checkIn={initialCheckIn}
                  checkOut={initialCheckOut}
                  guests={initialGuests}
                  forceReveal={hasInteractedFilter}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-[#E8DFCE] p-10 text-center space-y-3 shadow-[0_4px_20px_rgba(79,8,9,0.03)]">
              <p
                className="text-xl font-bold text-[#4F0809]"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                No chambers match the active filter
              </p>
              <p className="text-xs text-[#6B533B] max-w-md mx-auto">
                Reset filters to view all palace chambers, or contact our concierge for tailored availability.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setOnlyAvailable(false);
                }}
                className="inline-flex items-center px-5 py-2 rounded-full bg-[#4F0809] text-[#FFF8EB] text-xs font-bold cursor-pointer hover:bg-[#680b0c] transition-colors"
              >
                Show All Chambers
              </button>
            </div>
          )}
        </section>

        {/* ── HERITAGE DIVIDER ── */}
        <div className="py-2">
          <HeritageDivider className="opacity-35" color="#B08D57" />
        </div>

        {/* ── 4. INCLUDED ROYAL SANCTUARY PRIVILEGES (LIGHT MINIMAL CARDS) ── */}
        <section ref={privilegesRef} aria-label="Included Sanctuary Privileges" className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#9C7A45] block">
              &#10022; Every Stay Includes &#10022;
            </span>
            <h2
              className="text-2xl sm:text-3xl font-bold text-[#4F0809]"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              Royal Hospitality &amp; Included Privileges
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {SANCTUARY_PRIVILEGES.map((priv, idx) => {
              const Icon = priv.icon;
              return (
                <div
                  key={priv.label}
                  className={`bg-white rounded-2xl p-6 border border-[#E8DFCE] shadow-[0_4px_16px_rgba(79,8,9,0.03)] hover:shadow-[0_10px_25px_rgba(79,8,9,0.06)] hover:-translate-y-1 transition-all duration-500 flex flex-col items-center text-center group ${
                    privilegesInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}
                  style={{
                    transitionDelay: `${idx * 60}ms`,
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-[#FAF5EB] border border-[#E8DFCE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-[#9C7A45]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[#4F0809] mb-1.5">
                    {priv.label}
                  </h3>
                  <p className="text-xs text-[#6B533B] leading-relaxed font-normal">
                    {priv.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 5. LIGHT MINIMAL CONCIERGE INVITATION BANNER ── */}
        <section
          ref={conciergeRef}
          className={`relative bg-gradient-to-r from-[#FAF5EB] via-white to-[#FAF5EB] rounded-3xl border border-[#E8DFCE] p-7 sm:p-10 shadow-[0_8px_30px_rgba(79,8,9,0.04)] flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-700 ${
            conciergeInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="text-center md:text-left max-w-xl space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9C7A45]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#D8AA67]" />
              <span>Bespoke Palace Concierge</span>
            </span>
            <h3
              className="text-2xl sm:text-3xl font-bold text-[#4F0809]"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              Not sure which chamber suits your stay?
            </h3>
            <p className="text-xs sm:text-sm text-[#5A4A3F] font-normal leading-relaxed">
              Let our palace hosts tailor suite recommendations, interconnecting family chambers, or lake-vista preferences for your arrival.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <Link
              href="/hotel"
              className="inline-flex items-center space-x-1.5 px-5 py-3 rounded-full bg-white hover:bg-[#FAF5EB] border border-[#E8DFCE] text-[#4F0809] text-xs font-bold uppercase tracking-[0.12em] transition-colors shadow-2xs"
            >
              <span>Explore Hotel &amp; Hall</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#9C7A45]" />
            </Link>
            <Link
              href="/#contact"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-xs font-bold uppercase tracking-[0.12em] transition-all shadow-sm hover:shadow-md"
            >
              <span>Contact Concierge</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
