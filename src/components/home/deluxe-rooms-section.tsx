'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  ArrowRight,
  BedDouble,
  Calendar,
  Check,
  Eye,
  KeyRound,
  PawPrint,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import type { Room } from '@/lib/types';
import { serializeRoomDoc, sortRoomsByNumber } from '@/lib/utils/room-serializer';
import {
  buildRoomBookHref,
  calcNightsCount,
  formatStayDate,
  getRoomAmenities,
  getRoomBedType,
  getRoomCapacity,
  getRoomCategoryBadge,
  getRoomDescription,
  getRoomHousekeepingMeta,
  getRoomPhoto,
  getRoomRateMinor,
  getRoomTitle,
} from '@/lib/utils/room-display';
import { formatMoney } from '@/lib/utils/money';
import { MandalaOrnament } from '@/components/ui/heritage-ornaments';

export interface HotelSearchState {
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  adults?: string;
  children?: string;
  pets?: string;
  rooms?: string;
  search?: string;
}

interface DeluxeRoomsSectionProps {
  initialRooms?: Room[];
  searchState?: HotelSearchState;
}

type SortOption = 'room_number' | 'price_asc' | 'price_desc' | 'capacity_desc';

export function DeluxeRoomsSection({
  initialRooms = [],
  searchState,
}: DeluxeRoomsSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [liveRooms, setLiveRooms] = useState<Room[]>(() => sortRoomsByNumber(initialRooms));
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>('room_number');
  const [modalRoom, setModalRoom] = useState<Room | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  // Subscribe to live Firestore `rooms` updates so room states/tariffs stay synchronized
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) =>
            serializeRoomDoc(d.id, d.data() as Record<string, unknown>)
          );
          setLiveRooms(sortRoomsByNumber(docs));
        }
      },
      (err) => {
        console.warn('Hotel chambers live sync error:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Derive active hotel search parameters from URL or SSR props
  const activeSearch = useMemo(() => {
    const checkIn = searchParams.get('checkIn') || searchState?.checkIn || '';
    const checkOut = searchParams.get('checkOut') || searchState?.checkOut || '';
    const adultsRaw = parseInt(searchParams.get('adults') || searchState?.adults || '2', 10);
    const childrenRaw = parseInt(searchParams.get('children') || searchState?.children || '0', 10);
    const petsRaw = parseInt(searchParams.get('pets') || searchState?.pets || '0', 10);
    const roomsRaw = parseInt(searchParams.get('rooms') || searchState?.rooms || '1', 10);
    const isSearchFlag =
      searchParams.get('search') === '1' ||
      searchState?.search === '1' ||
      Boolean(checkIn || searchParams.get('adults') || searchState?.adults);

    const adults = Number.isFinite(adultsRaw) && adultsRaw > 0 ? adultsRaw : 2;
    const children = Number.isFinite(childrenRaw) && childrenRaw >= 0 ? childrenRaw : 0;
    const pets = Number.isFinite(petsRaw) && petsRaw >= 0 ? petsRaw : 0;
    const roomsRequested = Number.isFinite(roomsRaw) && roomsRaw > 0 ? roomsRaw : 1;
    const totalGuests = Math.max(1, adults + children);
    const perChamberCapacityNeeded = Math.ceil(totalGuests / roomsRequested);
    const nights = checkIn && checkOut ? calcNightsCount(checkIn, checkOut) : 1;

    return {
      isActive: isSearchFlag,
      checkIn,
      checkOut,
      adults,
      children,
      pets,
      roomsRequested,
      totalGuests,
      perChamberCapacityNeeded,
      nights,
    };
  }, [searchParams, searchState]);

  // Unique room categories extracted dynamically from Firestore rooms
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const room of liveRooms) {
      set.add(getRoomTitle(room));
    }
    return ['ALL', ...Array.from(set)];
  }, [liveRooms]);

  // Filter and sort rooms according to active hotel search & local filters
  const filteredRooms = useMemo(() => {
    const base = liveRooms.filter((room) => {
      if (room.is_active === false) return false;

      if (selectedCategory !== 'ALL' && getRoomTitle(room) !== selectedCategory) {
        return false;
      }

      if (availableOnly && room.housekeeping_state !== 'available') {
        return false;
      }

      if (activeSearch.isActive) {
        const cap = getRoomCapacity(room);
        if (cap < activeSearch.perChamberCapacityNeeded) {
          return false;
        }
      }

      return true;
    });

    const sorted = [...base];
    switch (sortBy) {
      case 'price_asc':
        sorted.sort((a, b) => getRoomRateMinor(a) - getRoomRateMinor(b));
        break;
      case 'price_desc':
        sorted.sort((a, b) => getRoomRateMinor(b) - getRoomRateMinor(a));
        break;
      case 'capacity_desc':
        sorted.sort((a, b) => getRoomCapacity(b) - getRoomCapacity(a));
        break;
      case 'room_number':
      default:
        // In active search mode, lift available chambers ahead of occupied ones cleanly
        if (activeSearch.isActive) {
          sorted.sort((a, b) => {
            const aAvail = a.housekeeping_state === 'available' ? 0 : 1;
            const bAvail = b.housekeeping_state === 'available' ? 0 : 1;
            if (aAvail !== bAvail) return aAvail - bAvail;
            return sortRoomsByNumber([a, b])[0] === a ? -1 : 1;
          });
        } else {
          return sortRoomsByNumber(sorted);
        }
        break;
    }
    return sorted;
  }, [liveRooms, selectedCategory, availableOnly, activeSearch, sortBy]);

  // Native <dialog> modal lifecycle + progressive light-dismiss fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (modalRoom) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [modalRoom]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      setModalRoom(null);
    };

    dialog.addEventListener('close', handleClose);

    // Fallback for browsers without native `closedby="any"` support
    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if ('closedBy' in HTMLDialogElement.prototype) return;
      pressedOutside = isOutside(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if ('closedBy' in HTMLDialogElement.prototype) return;
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const stayQueryString = useMemo(() => {
    const qs = new URLSearchParams();
    if (activeSearch.checkIn) qs.set('checkIn', activeSearch.checkIn);
    if (activeSearch.checkOut) qs.set('checkOut', activeSearch.checkOut);
    qs.set('guests', String(activeSearch.totalGuests));
    return qs.toString();
  }, [activeSearch]);

  const handleResetFilters = () => {
    setSelectedCategory('ALL');
    setAvailableOnly(false);
    setSortBy('room_number');
    if (activeSearch.isActive) {
      router.push('/hotel#hotel-chambers');
    }
  };

  return (
    <section
      id="hotel-chambers"
      className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#FAF7F2] text-[#2B2018] scroll-mt-24 overflow-hidden"
    >
      {/* Subtle Heritage Watermark */}
      <MandalaOrnament
        position="top-right"
        className="w-[460px] h-[460px] -top-24 -right-24 text-[#D8AA67]/10"
        opacity={0.45}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* ── Light-Minimal Editorial Section Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9C7A45] shadow-2xs mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#D8AA67]" />
              <span>
                {activeSearch.isActive ? 'Live Search Availability' : 'Heritage Accommodations'}
              </span>
            </div>

            <h2
              className="text-3xl sm:text-5xl font-semibold text-[#4F0809] leading-[1.06] tracking-tight"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              {activeSearch.isActive ? (
                <>
                  Available Palace{' '}
                  <span className="italic font-normal text-[#9C7A45]">Chambers</span>
                </>
              ) : (
                <>
                  Curated Suites &amp;{' '}
                  <span className="italic font-normal text-[#9C7A45]">Chambers</span>
                </>
              )}
            </h2>

            <p className="mt-3 text-sm sm:text-base text-[#6A5A4E] leading-relaxed font-light">
              {activeSearch.isActive
                ? 'Live sanctuary inventory fetched directly from the palace registry for your selected dates and party configuration.'
                : 'Each chamber blends centuries-old Rajasthani craftsmanship with serene, minimalist comfort and direct courtyard access.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E8DFCE] text-xs font-medium text-[#5A483A] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {filteredRooms.length} {filteredRooms.length === 1 ? 'Chamber' : 'Chambers'} Live
              </span>
            </span>
            <Link
              href="/rooms"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#D8AA67]/70 bg-white text-xs font-semibold uppercase tracking-[0.12em] text-[#4F0809] hover:bg-[#FFF9EF] transition-colors"
            >
              <span>Full Catalogue</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#9C7A45]" />
            </Link>
          </div>
        </div>

        {/* ── Active Search Summary Banner (shown when searching from BookingBar) ── */}
        {activeSearch.isActive && (
          <div className="mb-8 rounded-3xl bg-white border border-[#E8DFCE] shadow-[0_10px_32px_-16px_rgba(79,8,9,0.12)] p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {activeSearch.checkIn && activeSearch.checkOut && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] text-xs sm:text-sm font-medium text-[#4F0809]">
                    <Calendar className="w-4 h-4 text-[#9C7A45]" />
                    <span>
                      {formatStayDate(activeSearch.checkIn)} &rarr;{' '}
                      {formatStayDate(activeSearch.checkOut)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-[#E8DFCE] text-[11px] font-semibold text-[#9C7A45]">
                      {activeSearch.nights} {activeSearch.nights === 1 ? 'Night' : 'Nights'}
                    </span>
                  </div>
                )}

                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] text-xs sm:text-sm font-medium text-[#4F0809]">
                  <Users className="w-4 h-4 text-[#9C7A45]" />
                  <span>
                    {activeSearch.adults} {activeSearch.adults === 1 ? 'Adult' : 'Adults'}
                    {activeSearch.children > 0
                      ? `, ${activeSearch.children} ${
                          activeSearch.children === 1 ? 'Child' : 'Children'
                        }`
                      : ''}
                  </span>
                </div>

                {activeSearch.pets > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] text-xs sm:text-sm font-medium text-[#4F0809]">
                    <PawPrint className="w-3.5 h-3.5 text-[#9C7A45]" />
                    <span>
                      {activeSearch.pets} {activeSearch.pets === 1 ? 'Pet' : 'Pets'}
                    </span>
                  </div>
                )}

                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] text-xs sm:text-sm font-medium text-[#4F0809]">
                  <BedDouble className="w-4 h-4 text-[#9C7A45]" />
                  <span>
                    {activeSearch.roomsRequested}{' '}
                    {activeSearch.roomsRequested === 1 ? 'Chamber' : 'Chambers'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetFilters}
                className="self-start lg:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E8DFCE] bg-[#FAF7F2] hover:bg-white hover:border-[#D8AA67] text-xs font-semibold text-[#6A5A4E] hover:text-[#4F0809] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Search</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Light-Minimal Filter & Sort Strip ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-[#E8DFCE]">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter rooms by category">
            {categoryOptions.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#4F0809] text-[#FAF7F2] border-[#4F0809] shadow-xs'
                      : 'bg-white text-[#5C4E42] border-[#E8DFCE] hover:border-[#D8AA67] hover:text-[#4F0809]'
                  }`}
                >
                  {cat === 'ALL' ? 'All Chambers' : cat}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setAvailableOnly((prev) => !prev)}
              aria-pressed={availableOnly}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                availableOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-[#E8DFCE] text-[#5C4E42] hover:border-[#D8AA67]'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${availableOnly ? 'opacity-100' : 'opacity-40'}`} />
              <span>Available Only</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E8DFCE] text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#9C7A45]" />
              <label htmlFor="hotel-room-sort" className="sr-only">
                Sort chambers
              </label>
              <select
                id="hotel-room-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs font-semibold text-[#4F0809] focus:outline-none cursor-pointer pr-1"
              >
                <option value="room_number">Room Number</option>
                <option value="price_asc">Tariff: Low to High</option>
                <option value="price_desc">Tariff: High to Low</option>
                <option value="capacity_desc">Guest Capacity</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Chambers Grid (Fetched live from Firestore `rooms` docs) ── */}
        {filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
            {filteredRooms.map((room) => {
              const title = getRoomTitle(room);
              const photo = getRoomPhoto(room);
              const badge = getRoomCategoryBadge(room);
              const bedType = getRoomBedType(room);
              const capacity = getRoomCapacity(room);
              const rateMinor = getRoomRateMinor(room);
              const amenities = getRoomAmenities(room);
              const hk = getRoomHousekeepingMeta(room.housekeeping_state);
              const bookHref = buildRoomBookHref(room.id, {
                checkIn: activeSearch.checkIn,
                checkOut: activeSearch.checkOut,
                guests: activeSearch.totalGuests,
              });
              const detailHref = `/rooms/${encodeURIComponent(room.id)}${
                stayQueryString ? `?${stayQueryString}` : ''
              }`;
              const totalStayMinor =
                rateMinor * activeSearch.nights * (activeSearch.isActive ? activeSearch.roomsRequested : 1);

              return (
                <article
                  key={room.id}
                  className="group rounded-3xl bg-white border border-[#E8DFCE] shadow-[0_10px_30px_-16px_rgba(79,8,9,0.1)] hover:border-[#D8AA67] hover:shadow-[0_22px_45px_-18px_rgba(79,8,9,0.16)] transition-all duration-300 flex flex-col overflow-hidden"
                >
                  {/* Top Media Container (Fixed aspect ratio prevents CLS) */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F3EDE2]">
                    <Image
                      src={photo}
                      alt={`${title} - Room ${room.room_number}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/15 pointer-events-none" />

                    {/* Top Floating Badges */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#FAF7F2]/95 backdrop-blur-sm border border-[#E8DFCE] text-[10px] font-bold uppercase tracking-[0.16em] text-[#4F0809] shadow-2xs">
                        {badge}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-sm text-[11px] font-semibold shadow-2xs ${hk.pillClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${hk.dotClass}`} />
                        <span>{hk.label}</span>
                      </span>
                    </div>

                    {/* Room Number Pill */}
                    <div className="absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm border border-[#E8DFCE] text-xs font-semibold text-[#4F0809] shadow-xs">
                      <KeyRound className="w-3 h-3 text-[#9C7A45]" />
                      <span>Room #{room.room_number}</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                    <div className="space-y-3">
                      <div>
                        <h3
                          className="text-2xl font-semibold text-[#4F0809] leading-tight"
                          style={{
                            fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                          }}
                        >
                          {title}
                        </h3>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#8C755C]">
                          <span className="inline-flex items-center gap-1">
                            <BedDouble className="w-3.5 h-3.5 text-[#9C7A45]" />
                            {bedType}
                          </span>
                          <span aria-hidden="true">•</span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#9C7A45]" />
                            Up to {capacity} {capacity === 1 ? 'Guest' : 'Guests'}
                          </span>
                        </p>
                      </div>

                      <p className="text-sm text-[#6E6053] leading-relaxed font-light line-clamp-2">
                        {getRoomDescription(room)}
                      </p>

                      {/* Minimal Amenities Strip */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {amenities.slice(0, 3).map((amenity) => (
                          <span
                            key={amenity}
                            className="px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#EDE5D8] text-[11px] font-medium text-[#5C4E42]"
                          >
                            {amenity}
                          </span>
                        ))}
                        {amenities.length > 3 && (
                          <span className="px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#EDE5D8] text-[11px] font-medium text-[#9C7A45]">
                            +{amenities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Pricing & Actions */}
                    <div className="pt-4 border-t border-[#EDE5D8] space-y-4">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span
                              className="text-2xl font-bold text-[#4F0809]"
                              style={{
                                fontFamily:
                                  "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                              }}
                            >
                              {formatMoney(rateMinor)}
                            </span>
                            <span className="text-xs text-[#8C755C]">/ night</span>
                          </div>
                          {activeSearch.isActive && (
                            <p className="text-[11px] font-semibold text-[#9C7A45]">
                              Est. {formatMoney(totalStayMinor)} for {activeSearch.nights}N
                              {activeSearch.roomsRequested > 1
                                ? ` × ${activeSearch.roomsRequested}`
                                : ''}
                            </p>
                          )}
                        </div>

                        <Link
                          href={detailHref}
                          className="text-xs font-semibold text-[#9C7A45] hover:text-[#4F0809] underline-offset-4 hover:underline transition-colors"
                        >
                          Full Specs
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setModalRoom(room)}
                          className="h-11 px-3 rounded-full border border-[#DFD3C3] bg-[#FAF7F2] hover:bg-white hover:border-[#D8AA67] text-xs font-semibold text-[#4F0809] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#9C7A45]" />
                          <span>Quick View</span>
                        </button>

                        <Link
                          href={bookHref}
                          className="h-11 px-3 rounded-full bg-[#4F0809] hover:bg-[#670E10] text-[#FAF7F2] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <span>Book Stay</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* ── Helpful Empty Search State ── */
          <div className="rounded-3xl bg-white border border-[#E8DFCE] p-10 sm:p-14 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[#E8DFCE] flex items-center justify-center mx-auto mb-4 text-[#9C7A45]">
              <BedDouble className="w-5 h-5" />
            </div>
            <h3
              className="text-2xl font-semibold text-[#4F0809]"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              No Chambers Match This Configuration
            </h3>
            <p className="mt-2 text-sm text-[#6E6053] font-light leading-relaxed">
              Our heritage rooms comfortably host up to{' '}
              {Math.max(2, ...liveRooms.map((r) => getRoomCapacity(r)))} guests per chamber. Try
              adding an extra chamber in the search bar or resetting filters to view all suites.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#4F0809] text-[#FAF7F2] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#670E10] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D8AA67]" />
              <span>Show All Chambers</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Accessible Native Modal Dialog for Quick View ── */}
      <dialog
        ref={dialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="hotel-room-dialog-title"
        className="m-auto w-[calc(100vw-2rem)] max-w-2xl rounded-3xl border border-[#D8AA67]/70 bg-[#FAF7F2] p-0 text-[#2B2018] shadow-[0_32px_90px_-15px_rgba(35,10,14,0.42)] backdrop:bg-[#241F1A]/60 backdrop:backdrop-blur-xs backdrop:overflow-hidden backdrop:overscroll-contain modal:overscroll-contain"
      >
        {modalRoom && (
          <div className="flex flex-col">
            <div className="relative aspect-[16/9] w-full bg-[#EFE6D8] overflow-hidden">
              <Image
                src={getRoomPhoto(modalRoom)}
                alt={`${getRoomTitle(modalRoom)} - Room ${modalRoom.room_number}`}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
              />
              <button
                type="button"
                autoFocus
                onClick={() => setModalRoom(null)}
                aria-label="Close room preview"
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#FAF7F2]/95 border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center hover:bg-white transition-colors shadow-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-3.5 py-1 rounded-full bg-[#FAF7F2]/95 border border-[#E8DFCE] text-xs font-semibold text-[#4F0809]">
                  Room #{modalRoom.room_number}
                </span>
                <span className="px-3.5 py-1 rounded-full bg-[#4F0809] text-[#FAF7F2] text-[10px] font-bold uppercase tracking-[0.16em]">
                  {getRoomCategoryBadge(modalRoom)}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h1
                    id="hotel-room-dialog-title"
                    className="text-3xl font-semibold text-[#4F0809] leading-tight"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    {getRoomTitle(modalRoom)}
                  </h1>
                  <p className="mt-1 text-xs font-medium text-[#8C755C]">
                    {getRoomBedType(modalRoom)} • Max {getRoomCapacity(modalRoom)} Guests
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <div
                    className="text-2xl font-bold text-[#4F0809]"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    {formatMoney(getRoomRateMinor(modalRoom))}
                    <span className="text-xs font-normal text-[#8C755C]"> / night</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-[#5C4E42] leading-relaxed font-light">
                {getRoomDescription(modalRoom)}
              </p>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9C7A45] mb-2.5">
                  Included Chamber Amenities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {getRoomAmenities(modalRoom).map((amenity) => (
                    <span
                      key={amenity}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8DFCE] text-xs text-[#4F0809]"
                    >
                      <Check className="w-3 h-3 text-[#9C7A45]" />
                      <span>{amenity}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E8DFCE] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <Link
                  href={`/rooms/${encodeURIComponent(modalRoom.id)}${
                    stayQueryString ? `?${stayQueryString}` : ''
                  }`}
                  onClick={() => setModalRoom(null)}
                  className="px-5 py-2.5 rounded-full border border-[#DFD3C3] bg-white text-xs font-semibold text-[#4F0809] hover:border-[#D8AA67] text-center transition-colors"
                >
                  Open Full Chamber Page
                </Link>
                <Link
                  href={buildRoomBookHref(modalRoom.id, {
                    checkIn: activeSearch.checkIn,
                    checkOut: activeSearch.checkOut,
                    guests: activeSearch.totalGuests,
                  })}
                  onClick={() => setModalRoom(null)}
                  className="px-6 py-2.5 rounded-full bg-[#4F0809] text-[#FAF7F2] text-xs font-semibold hover:bg-[#670E10] text-center inline-flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <span>Reserve Room #{modalRoom.room_number}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
