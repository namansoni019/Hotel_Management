'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room } from '@/lib/types';
import { serializeRoomDoc, sortRoomsByNumber } from '@/lib/utils/room-serializer';
import { formatMoney } from '@/lib/utils/money';
import {
  IconKingBed,
  IconGuests,
  IconCityView,
  IconFreeWiFi,
  IconAC,
  IconSmartTV,
  IconLuxuryBath,
  IconMiniBar,
  IconInRoomDining,
  IconWorkDesk,
  IconRoomService24,
} from '@/components/ui/heritage-art';
import {
  ToranJharokhaArch,
  HeritageDivider,
  LataJaaliRunner,
  MandalaOrnament,
} from '@/components/ui/heritage-ornaments';
import {
  Calendar,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Car,
  ShieldCheck,
  Clock,
  ZoomIn,
  X,
  MapPin,
  BedDouble,
} from 'lucide-react';

interface RoomDetailClientProps {
  initialRoom: Room;
  initialAllRooms: Room[];
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
}

function getAmenityIcon(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes('wi-fi') || lower.includes('wifi') || lower.includes('internet')) return IconFreeWiFi;
  if (lower.includes('air') || lower.includes('ac') || lower.includes('climate')) return IconAC;
  if (lower.includes('tv') || lower.includes('television')) return IconSmartTV;
  if (lower.includes('bath') || lower.includes('toiletries') || lower.includes('tub')) return IconLuxuryBath;
  if (lower.includes('mini') || lower.includes('bar') || lower.includes('tea') || lower.includes('coffee')) return IconMiniBar;
  if (lower.includes('dining') || lower.includes('breakfast')) return IconInRoomDining;
  if (lower.includes('desk') || lower.includes('work')) return IconWorkDesk;
  if (lower.includes('service') || lower.includes('butler')) return IconRoomService24;
  if (lower.includes('bed')) return IconKingBed;
  if (lower.includes('valet') || lower.includes('parking')) return Car;
  if (lower.includes('balcony') || lower.includes('view') || lower.includes('vista') || lower.includes('garden')) return IconCityView;
  return Check;
}

export function RoomDetailClient({
  initialRoom,
  initialAllRooms,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
}: RoomDetailClientProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [allRooms, setAllRooms] = useState<Room[]>(() => sortRoomsByNumber(initialAllRooms));

  const images = useMemo(() => {
    const candidates: string[] = [];
    const add = (arr?: string[]) => {
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (typeof item === 'string' && item.trim() && !candidates.includes(item.trim())) {
            candidates.push(item.trim());
          }
        }
      }
    };
    add(room.photos);
    add(room.images);
    if (room.default_photo && !candidates.includes(room.default_photo)) {
      candidates.push(room.default_photo);
    }
    add(room.room_type?.photos);
    return candidates.length > 0 ? candidates : ['/images/rooms/deluxe-garden.jpg'];
  }, [room]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'amenities' | 'gallery' | 'policies'>('overview');

  const [checkIn, setCheckIn] = useState(() => {
    if (initialCheckIn) return initialCheckIn;
    return new Date().toISOString().split('T')[0];
  });
  const [checkOut, setCheckOut] = useState(() => {
    if (initialCheckOut) return initialCheckOut;
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [guests, setGuests] = useState(() => {
    const safeGuests = Math.max(1, Math.min(6, initialGuests || 2));
    return String(safeGuests);
  });

  // Real-time Firestore listener for this room document and sibling rooms
  useEffect(() => {
    const unsubRoom = onSnapshot(
      doc(db, 'rooms', initialRoom.id),
      (snap) => {
        if (snap.exists()) {
          setRoom(serializeRoomDoc(snap.id, snap.data() as Record<string, unknown>));
        }
      },
      () => {}
    );

    const unsubAll = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          const live = snap.docs
            .map((d) => serializeRoomDoc(d.id, d.data() as Record<string, unknown>))
            .filter((r) => r.is_active !== false);
          if (live.length > 0) {
            setAllRooms(sortRoomsByNumber(live));
          }
        }
      },
      () => {}
    );

    return () => {
      unsubRoom();
      unsubAll();
    };
  }, [initialRoom.id]);

  // Escape key closes lightbox modal
  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLightboxOpen]);

  const safeIndex = selectedIndex >= images.length ? 0 : selectedIndex;
  const activeImage = images[safeIndex];

  const nights = useMemo(() => {
    try {
      const d1 = new Date(`${checkIn}T00:00:00`);
      const d2 = new Date(`${checkOut}T00:00:00`);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  }, [checkIn, checkOut]);

  const displayName =
    room.name ||
    room.room_category ||
    room.room_type_name ||
    room.room_type?.name ||
    (room.room_number ? `Chamber ${room.room_number}` : 'Heritage Deluxe Chamber');
  const categoryBadge = room.category_badge || 'ROYAL LUXURY';
  const bedType = room.bed_type || 'Plush King Bed';
  const capacity = room.capacity ?? room.room_type?.capacity ?? 2;
  const baseRateMinor =
    room.base_rate_minor ??
    room.room_type?.base_rate_minor ??
    (room.price_per_night ? room.price_per_night * 100 : 650000);
  const description =
    room.description ||
    room.room_type?.description ||
    'A regal escape inspired by traditional Rajasthani havelis, featuring carved arches and contemporary palace luxury.';

  const amenities =
    room.amenities && room.amenities.length > 0
      ? room.amenities
      : room.room_type?.amenities && room.room_type.amenities.length > 0
      ? room.room_type.amenities
      : [
          'Complimentary Wi-Fi',
          'Air Conditioning (AC)',
          '24x7 Room Service',
          'In-room Dining',
          'Valet Parking',
          bedType,
          'Luxury Toiletries',
          '4K Smart TV',
        ];

  const isAvailable = room.housekeeping_state === 'available';
  const statusLabel = isAvailable
    ? 'Available Now'
    : room.housekeeping_state === 'unavailable'
    ? 'Currently Unavailable'
    : room.housekeeping_state === 'occupied'
    ? 'Currently Reserved'
    : 'Preparing Sanctuary';

  const estimatedTotal = baseRateMinor * nights;

  const otherRooms = allRooms.filter((r) => r.id !== room.id).slice(0, 3);
  const otherColsClass =
    otherRooms.length === 1
      ? 'grid-cols-1 max-w-md mx-auto'
      : otherRooms.length === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const guestOptionsCount = Math.max(4, capacity);
  const reserveHref = `/book/${encodeURIComponent(
    room.id
  )}?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(
    checkOut
  )}&guests=${encodeURIComponent(guests)}`;

  return (
    <div className="relative bg-[#FAF7F2] min-h-dvh pt-24 sm:pt-28 lg:pt-32 pb-32 sm:pb-24 text-[#241F1A] overflow-x-clip selection:bg-[#4F0809] selection:text-[#FFF8EB]">
      <LataJaaliRunner side="left" opacity={0.09} color="#B08D57" className="hidden xl:block" />
      <LataJaaliRunner side="right" opacity={0.09} color="#B08D57" className="hidden xl:block" />
      <MandalaOrnament position="top-right" opacity={0.05} color="#B08D57" size="420px" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Navigation & Breadcrumb Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
          <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-2 text-xs text-[#856B4D]">
            <Link href="/" className="hover:text-[#4F0809] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#D8AA67]" />
            <Link href="/rooms" className="hover:text-[#4F0809] transition-colors">
              Chambers
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#D8AA67]" />
            <span className="text-[#4F0809] font-semibold">
              {displayName}
              {room.room_number ? ` (#${room.room_number})` : ''}
            </span>
          </nav>

          <Link
            href={`/rooms?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(
              checkOut
            )}&guests=${encodeURIComponent(guests)}`}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#FAF5EB] border border-[#E8DFCE] text-xs font-bold text-[#4F0809] transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#9C7A45]" />
            <span>All Chambers</span>
          </Link>
        </div>

        {/* Light Minimal Editorial Header */}
        <header className="mb-8 space-y-4">
          <div className="flex-wrap-balance items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8DFCE] text-[#9C7A45] text-[10px] font-bold uppercase tracking-[0.18em] shadow-2xs">
              <Sparkles className="w-3 h-3 text-[#D8AA67]" />
              <span>{categoryBadge}</span>
            </span>

            {room.room_number && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EB] border border-[#E8DFCE] text-[#4F0809] text-[10px] font-bold uppercase tracking-[0.16em]">
                <span>Chamber No. {room.room_number}</span>
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.14em] ${
                isAvailable
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>{statusLabel}</span>
            </span>
          </div>

          <h1
            className="font-bold text-[#4F0809] leading-[1.08]"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              fontSize: 'clamp(2.1rem, 1.4rem + 2.4vw, 3.5rem)',
            }}
          >
            {displayName}
            {room.room_number && (
              <span className="text-[#9C7A45] italic font-normal"> &mdash; Room {room.room_number}</span>
            )}
          </h1>

          {/* Diamond Gold Divider */}
          <div className="flex items-center gap-2 w-32">
            <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]" />
            <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
          </div>

          <p className="text-sm sm:text-base text-[#5A4A3F] font-normal max-w-2xl leading-relaxed">
            {description}
          </p>

          {/* Compact Signature Spec Pills */}
          <div className="flex-wrap-balance items-center gap-2.5 text-xs font-semibold text-[#4F0809] pt-1">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] shadow-2xs">
              <IconKingBed className="w-4 h-4 text-[#9C7A45] mr-1.5" />
              <span>{bedType}</span>
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] shadow-2xs">
              <IconGuests className="w-4 h-4 text-[#9C7A45] mr-1.5" />
              <span>Up to {capacity} Guests</span>
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] shadow-2xs">
              <IconCityView className="w-4 h-4 text-[#9C7A45] mr-1.5" />
              <span>Palace &amp; Courtyard Vistas</span>
            </span>
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] shadow-2xs">
              <IconFreeWiFi className="w-4 h-4 text-[#9C7A45] mr-1.5" />
              <span>{amenities.length} Included Amenities</span>
            </span>
          </div>
        </header>

        {/* Main 12-Col Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Showcase Image Card with Controls & Expand Lightbox */}
            <div className="bg-white rounded-3xl p-2.5 sm:p-3 border border-[#E8DFCE] shadow-[0_8px_30px_rgba(79,8,9,0.04)]">
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[#FAF5EB] group">
                <Image
                  src={activeImage}
                  alt={room.room_number ? `${displayName} Room ${room.room_number}` : displayName}
                  fill
                  priority
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedIndex((prev) => (prev - 1 + images.length) % images.length)
                      }
                      aria-label="Previous photo"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center shadow-sm transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIndex((prev) => (prev + 1) % images.length)}
                      aria-label="Next photo"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center shadow-sm transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-white/92 backdrop-blur-md border border-[#E8DFCE] text-[10px] font-bold uppercase tracking-wider text-[#4F0809] shadow-2xs">
                    {safeIndex + 1} / {images.length} {images.length === 1 ? 'View' : 'Views'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/92 hover:bg-white backdrop-blur-md border border-[#E8DFCE] text-[11px] font-bold text-[#4F0809] shadow-xs transition cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-[#9C7A45]" />
                    <span>Expand View</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex items-center space-x-3 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-2xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      safeIndex === idx
                        ? 'border-[#4F0809] ring-2 ring-[#D8AA67]/60'
                        : 'border-[#E8DFCE] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image src={img} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Pill Navigation Tabs */}
            <div className="flex-wrap-balance items-center gap-2 pt-2">
              {(
                [
                  { id: 'overview', label: 'Overview & Story' },
                  { id: 'amenities', label: `Amenities (${amenities.length})` },
                  { id: 'gallery', label: 'Gallery' },
                  { id: 'policies', label: 'Stay Policies & Location' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer border ${
                    activeTab === tab.id
                      ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-2xs'
                      : 'bg-white text-[#4F0809] border-[#E8DFCE] hover:bg-[#FAF5EB]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Light Minimal Details Card */}
            <div className="relative bg-white rounded-3xl border border-[#E8DFCE] p-6 sm:p-8 shadow-[0_4px_20px_rgba(79,8,9,0.03)] overflow-hidden">
              <div className="absolute -top-4 right-2 w-56 sm:w-72 h-[640px] pointer-events-none opacity-10 hidden md:block">
                <ToranJharokhaArch
                  className="w-full h-full"
                  color="#B08D57"
                  opacity={0.25}
                  showContentArea={false}
                />
              </div>

              {activeTab === 'overview' && (
                <div className="relative z-10 space-y-6 text-left">
                  <div className="space-y-3">
                    <h2
                      className="text-xl sm:text-2xl font-bold text-[#4F0809]"
                      style={{
                        fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                      }}
                    >
                      Inside the Sanctuary
                    </h2>
                    <p className="text-sm sm:text-base text-[#5A4A3F] leading-relaxed font-normal">
                      Step into a serene haven of Rajputana heritage.{' '}
                      {room.room_number ? `Chamber ${room.room_number} (${displayName})` : displayName} pairs handcrafted architectural details and tranquil natural light with bespoke hospitality.
                    </p>
                    {room.notes && (
                      <div className="p-3.5 rounded-2xl bg-[#FAF5EB] border border-[#EBE3D5] text-xs text-[#6B533B]">
                        <span className="font-bold text-[#4F0809] mr-1.5">Host Note:</span>
                        {room.notes}
                      </div>
                    )}
                  </div>

                  {/* 4 Key Chamber Facts */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE]/80">
                      <span className="text-[10px] uppercase tracking-wider text-[#856B4D] font-bold block mb-1">
                        Chamber No.
                      </span>
                      <span className="text-sm font-bold text-[#4F0809]">
                        {room.room_number ? `#${room.room_number}` : 'Signature'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE]/80">
                      <span className="text-[10px] uppercase tracking-wider text-[#856B4D] font-bold block mb-1">
                        Bed Type
                      </span>
                      <span className="text-sm font-bold text-[#4F0809] truncate block">
                        {bedType}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE]/80">
                      <span className="text-[10px] uppercase tracking-wider text-[#856B4D] font-bold block mb-1">
                        Occupancy
                      </span>
                      <span className="text-sm font-bold text-[#4F0809]">Up to {capacity} Guests</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE]/80">
                      <span className="text-[10px] uppercase tracking-wider text-[#856B4D] font-bold block mb-1">
                        Category
                      </span>
                      <span className="text-sm font-bold text-[#4F0809] truncate block">
                        {categoryBadge}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Included Amenities from Firestore doc */}
                  <div className="pt-5 border-t border-[#E8DFCE]/80">
                    <h3
                      className="text-lg font-bold text-[#4F0809] mb-4"
                      style={{
                        fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                      }}
                    >
                      Curated Chamber Amenities
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {amenities.map((label, idx) => {
                        const Icon = getAmenityIcon(label);
                        return (
                          <div
                            key={`${label}-${idx}`}
                            className="flex items-center space-x-3 p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE]/70 text-xs text-[#4F0809]"
                          >
                            <div className="w-8 h-8 rounded-full bg-white border border-[#E8DFCE] flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-[#9C7A45]" />
                            </div>
                            <span className="font-semibold">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'amenities' && (
                <div className="relative z-10 space-y-6">
                  <div>
                    <h2
                      className="text-xl font-bold text-[#4F0809] mb-1"
                      style={{
                        fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                      }}
                    >
                      All Chamber Amenities
                    </h2>
                    <p className="text-xs text-[#6B533B]">
                      Every modern luxury thoughtfully integrated within {displayName}.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {amenities.map((label, idx) => {
                      const Icon = getAmenityIcon(label);
                      return (
                        <div
                          key={`${label}-${idx}`}
                          className="flex items-center space-x-3 p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE]/70 text-xs text-[#4F0809]"
                        >
                          <div className="w-8 h-8 rounded-full bg-white border border-[#E8DFCE] flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-[#9C7A45]" />
                          </div>
                          <span className="font-semibold">{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-[#E8DFCE]/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { title: 'Royal Breakfast', sub: 'Included every morning' },
                      { title: 'Evening Turndown', sub: 'Rosewater & linen service' },
                      { title: 'Express Concierge', sub: '24×7 WhatsApp & butler' },
                    ].map((inc) => (
                      <div
                        key={inc.title}
                        className="p-3.5 rounded-2xl bg-[#FAF5EB] border border-[#EBE3D5]"
                      >
                        <span className="text-xs font-bold text-[#4F0809] block">{inc.title}</span>
                        <span className="text-[11px] text-[#6B533B]">{inc.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'gallery' && (
                <div className="relative z-10 space-y-4">
                  <h2
                    className="text-xl font-bold text-[#4F0809]"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    Chamber Visual Tour
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedIndex(idx);
                          setIsLightboxOpen(true);
                        }}
                        className="group relative aspect-[16/10] rounded-2xl overflow-hidden border border-[#E8DFCE] bg-[#FAF5EB] cursor-pointer text-left"
                      >
                        <Image
                          src={img}
                          alt={`${displayName} view ${idx + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-white/90 text-[10px] font-bold text-[#4F0809] border border-[#E8DFCE]">
                          Preview
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'policies' && (
                <div className="relative z-10 space-y-5 text-xs sm:text-sm text-[#5A4A3F]">
                  <h2
                    className="text-xl font-bold text-[#4F0809]"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    Stay Policies &amp; Palace Arrival
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE]/80 space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F0809]">
                        <Clock className="w-3.5 h-3.5 text-[#9C7A45]" />
                        <span>Check-In &amp; Check-Out</span>
                      </span>
                      <p className="text-xs text-[#6B533B]">
                        Check-In from <strong>2:00 PM</strong> &bull; Check-Out until{' '}
                        <strong>11:00 AM</strong>. Early palace courtyard lounge access included.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE]/80 space-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F0809]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#9C7A45]" />
                        <span>Flexible Cancellation</span>
                      </span>
                      <p className="text-xs text-[#6B533B]">
                        Complimentary date modifications and full cancellation up to 48 hours prior to arrival.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF5EB] border border-[#EBE3D5] flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#9C7A45] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-[#4F0809] block">
                        Rajmahal Palace Road, Lake Pichola Precinct, Udaipur
                      </span>
                      <p className="text-xs text-[#6B533B] leading-relaxed">
                        Complimentary chauffeur-driven airport/station pickups and royal valet arrival can be scheduled when reserving your chamber.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (4 cols): Sticky Light Minimal Booking Summary Card */}
          <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
            <div className="bg-white rounded-3xl border border-[#E8DFCE] p-6 sm:p-7 shadow-[0_12px_36px_rgba(79,8,9,0.06)] text-left">
              <div className="flex items-baseline justify-between mb-4 pb-4 border-b border-[#E8DFCE]">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#856B4D] font-bold block mb-0.5">
                    Royal Tariff
                  </span>
                  <span
                    className="text-3xl font-bold text-[#4F0809]"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    {formatMoney(baseRateMinor)}
                  </span>
                  <span className="text-xs text-[#6B533B] ml-1.5 font-normal">/ night</span>
                </div>
                <span
                  className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                    isAvailable
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      : 'text-amber-800 bg-amber-50 border-amber-200'
                  }`}
                >
                  {isAvailable ? 'Available' : statusLabel}
                </span>
              </div>

              {/* Selected Chamber Pill */}
              <div className="mb-4 px-3.5 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE]/80 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-[#4F0809]">
                  <BedDouble className="w-3.5 h-3.5 text-[#9C7A45]" />
                  <span>{room.room_number ? `Room #${room.room_number}` : displayName}</span>
                </span>
                <span className="text-[#856B4D] font-medium truncate max-w-[140px]">
                  {bedType}
                </span>
              </div>

              {/* Interactive Date & Guest Selectors */}
              <div className="space-y-3 mb-5">
                <div className="p-3.5 rounded-2xl border border-[#E8DFCE] bg-[#FAF7F2]/80">
                  <label
                    htmlFor="detail-check-in"
                    className="block text-[10px] uppercase tracking-wider text-[#856B4D] font-bold mb-1"
                  >
                    Check In
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      id="detail-check-in"
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="bg-transparent text-xs sm:text-sm text-[#4F0809] font-semibold focus:outline-hidden w-full"
                    />
                    <Calendar className="w-4 h-4 text-[#9C7A45] shrink-0 pointer-events-none" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-[#E8DFCE] bg-[#FAF7F2]/80">
                  <label
                    htmlFor="detail-check-out"
                    className="block text-[10px] uppercase tracking-wider text-[#856B4D] font-bold mb-1"
                  >
                    Check Out
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      id="detail-check-out"
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="bg-transparent text-xs sm:text-sm text-[#4F0809] font-semibold focus:outline-hidden w-full"
                    />
                    <Calendar className="w-4 h-4 text-[#9C7A45] shrink-0 pointer-events-none" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-[#E8DFCE] bg-[#FAF7F2]/80">
                  <label
                    htmlFor="detail-guests"
                    className="block text-[10px] uppercase tracking-wider text-[#856B4D] font-bold mb-1"
                  >
                    Guests
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <select
                      id="detail-guests"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="bg-transparent text-xs sm:text-sm text-[#4F0809] font-semibold focus:outline-hidden w-full cursor-pointer"
                    >
                      {Array.from({ length: guestOptionsCount }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={String(num)}>
                          {num} {num === 1 ? 'Adult' : 'Adults'}
                        </option>
                      ))}
                    </select>
                    <Users className="w-4 h-4 text-[#9C7A45] shrink-0 pointer-events-none" />
                  </div>
                </div>

                {/* Transparent Tariff Breakdown */}
                <div className="p-4 rounded-2xl bg-[#FAF5EB] border border-[#EBE3D5] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#6B533B]">
                    <span>
                      {formatMoney(baseRateMinor)} &times; {nights}{' '}
                      {nights === 1 ? 'Night' : 'Nights'}
                    </span>
                    <span className="font-semibold text-[#4F0809]">
                      {formatMoney(estimatedTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#6B533B]">
                    <span>Morning Breakfast &amp; Wi-Fi</span>
                    <span className="font-semibold text-emerald-800">Complimentary</span>
                  </div>
                  <div className="pt-2 border-t border-[#E8DFCE] flex items-center justify-between">
                    <span className="font-bold text-[#4F0809]">Estimated Total</span>
                    <span
                      className="text-lg font-bold text-[#4F0809]"
                      style={{
                        fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                      }}
                    >
                      {formatMoney(estimatedTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pill Action Buttons */}
              <div className="space-y-2.5">
                <Link
                  href={reserveHref}
                  className="w-full py-3.5 px-5 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] font-bold text-xs uppercase tracking-[0.14em] transition-all shadow-sm hover:shadow-md flex items-center justify-center space-x-2"
                >
                  <span>
                    {room.room_number ? `Reserve Room #${room.room_number}` : 'Reserve Chamber'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
                </Link>
                <Link
                  href="/#contact"
                  className="w-full py-3 px-5 rounded-full border border-[#E8DFCE] bg-[#FAF7F2] hover:bg-[#FAF5EB] text-[#4F0809] font-bold text-xs uppercase tracking-[0.12em] transition-all block text-center"
                >
                  Enquire with Concierge
                </Link>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E8DFCE]/80 text-[11px] text-[#6B533B] space-y-1.5">
                <p className="flex items-center">
                  <Check className="w-3.5 h-3.5 text-emerald-700 mr-2 shrink-0" />
                  Free cancellation up to 48 hours
                </p>
                <p className="flex items-center">
                  <Check className="w-3.5 h-3.5 text-emerald-700 mr-2 shrink-0" />
                  Royal courtyard breakfast included
                </p>
                <p className="flex items-center">
                  <Check className="w-3.5 h-3.5 text-emerald-700 mr-2 shrink-0" />
                  Direct palace check-in guarantee
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Other Heritage Chambers from DB */}
        {otherRooms.length > 0 && (
          <section className="mt-16 pt-10 space-y-8">
            <HeritageDivider className="opacity-35" color="#B08D57" />

            <div className="text-center space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9C7A45] block">
                Continue Exploring
              </span>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#4F0809]"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                Other Heritage Chambers
              </h2>
            </div>

            <div className={`grid gap-6 ${otherColsClass}`}>
              {otherRooms.map((other) => {
                const otherName =
                  other.name ||
                  other.room_category ||
                  other.room_type_name ||
                  other.room_type?.name ||
                  `Chamber ${other.room_number}`;
                const otherImg =
                  other.photos?.[0] ||
                  other.images?.[0] ||
                  other.default_photo ||
                  other.room_type?.photos?.[0] ||
                  '/images/rooms/deluxe-garden.jpg';
                const otherRate =
                  other.base_rate_minor ??
                  other.room_type?.base_rate_minor ??
                  (other.price_per_night ? other.price_per_night * 100 : 650000);

                return (
                  <Link
                    key={other.id}
                    href={`/rooms/${encodeURIComponent(other.id)}?checkIn=${encodeURIComponent(
                      checkIn
                    )}&checkOut=${encodeURIComponent(checkOut)}&guests=${encodeURIComponent(guests)}`}
                    className="group bg-white rounded-3xl p-4 border border-[#E8DFCE] shadow-[0_4px_20px_rgba(79,8,9,0.03)] hover:shadow-[0_16px_30px_rgba(79,8,9,0.08)] hover:-translate-y-1 transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-[#FAF5EB] mb-3.5">
                      <Image
                        src={otherImg}
                        alt={otherName}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      {other.room_number && (
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-white/92 border border-[#E8DFCE] text-[10px] font-bold text-[#4F0809]">
                          Room #{other.room_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="min-w-0">
                        <h3
                          className="text-lg font-bold text-[#4F0809] group-hover:text-[#9C7A45] transition-colors truncate"
                          style={{
                            fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                          }}
                        >
                          {otherName}
                        </h3>
                        <span className="text-xs text-[#856B4D]">
                          {formatMoney(otherRate)} / night &bull; {other.bed_type || 'King Bed'}
                        </span>
                      </div>
                      <span className="w-8 h-8 rounded-full bg-[#FAF5EB] border border-[#E8DFCE] flex items-center justify-center text-[#4F0809] group-hover:bg-[#4F0809] group-hover:text-[#FFF8EB] transition-colors shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Full-Screen Lightbox Viewer */}
      {isLightboxOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLightboxOpen(false);
          }}
          className="fixed inset-0 z-[160] bg-[#241F1A]/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-4xl bg-white rounded-3xl p-3 sm:p-4 border border-[#E8DFCE] shadow-2xl">
            <div className="flex items-center justify-between px-2 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C7A45] block">
                  {categoryBadge}
                </span>
                <p
                  className="text-lg font-bold text-[#4F0809]"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  {displayName}
                  {room.room_number ? ` — Room #${room.room_number}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="Close photo preview"
                className="p-2 rounded-full bg-[#FAF7F2] hover:bg-[#FAF5EB] border border-[#E8DFCE] text-[#4F0809] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[#FAF5EB]">
              <Image
                src={activeImage}
                alt={displayName}
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
