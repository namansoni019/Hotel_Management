'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Wifi,
  Wind,
  BellRing,
  Utensils,
  Car,
  Users,
  BedDouble,
  Maximize2,
  X,
  ArrowRight,
} from 'lucide-react';

interface DeluxeRoomItem {
  id: string;
  name: string;
  tag: string;
  shortDesc: string;
  fullDesc: string;
  guests: string;
  bed: string;
  size: string;
  price: string;
  image: string;
}

const DELUXE_ROOMS: DeluxeRoomItem[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    name: 'Heritage Deluxe Room',
    tag: 'Popular',
    shortDesc: 'A perfect blend of traditional Rajasthani decor, stone jalis and modern luxury.',
    fullDesc:
      'Immerse yourself in authentic royal heritage. The Heritage Deluxe Room features carved stone jharokhas, handcrafted teakwood furnishings, fine Rajasthani textiles, and modern comforts.',
    guests: '2 Guests',
    bed: '1 King Bed',
    size: '350 sq.ft',
    price: '₹ 6,500',
    image: '/images/rooms/deluxe-garden.jpg',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    name: 'Royal Deluxe Room',
    tag: 'Deluxe',
    shortDesc: 'Spacious deluxe room featuring authentic stone carvings and arched ceilings.',
    fullDesc:
      'Experience royal tranquility in this exquisitely appointed chamber. Designed with warm gold tones, an artisan four-poster king bed, and modern luxury comforts.',
    guests: '2 Guests',
    bed: '1 King Bed',
    size: '380 sq.ft',
    price: '₹ 6,800',
    image: '/images/rooms/jharokha-room.jpg',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    name: 'Grand Deluxe Room',
    tag: 'Deluxe',
    shortDesc: 'Sun-drenched deluxe room with fine Rajput textiles and artisanal accents.',
    fullDesc:
      'Sunlit and grand, the Grand Deluxe Room captures the romance of Rajputana with handcrafted lanterns, plush king bed, and round-the-clock bespoke hospitality.',
    guests: '2 Guests',
    bed: '1 King Bed',
    size: '360 sq.ft',
    price: '₹ 7,200',
    image: '/images/rooms/lakeview-suite.jpg',
  },
];

const ROOM_FACILITIES = [
  { name: 'Wi-Fi (High-Speed Internet)', icon: Wifi },
  { name: 'Air Conditioning (AC)', icon: Wind },
  { name: '24x7 Room Services Available', icon: BellRing },
  { name: 'In-room Dining', icon: Utensils },
  { name: 'Valet Parking', icon: Car },
];

export function DeluxeRoomsSection() {
  const [selectedRoom, setSelectedRoom] = useState<DeluxeRoomItem | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedRoom) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedRoom]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedRoom(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
<section className="relative py-16 sm:py-20 overflow-hidden" style={{ backgroundColor: 'var(--heritage-ivory, #fff7e8)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase text-[#9C7A45] block mb-1.5">
            Our Rooms
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#4F0809] leading-tight mb-2.5"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            Stay in Timeless Elegance
          </h2>

          {/* Diamond-Tipped Gold Rule */}
          <div className="flex items-center justify-center gap-2 w-40 sm:w-48 mx-auto mb-3">
            <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
            <span className="w-1.5 h-1.5 rotate-45 border border-[#C99A52] bg-[#D8AA67]/40" />
            <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
          </div>

          <p className="text-xs sm:text-sm text-[#4F0809]/80 font-normal leading-relaxed">
            Experience a perfect blend of royal charm and modern luxury with our beautifully designed Deluxe Rooms.
          </p>
        </div>

        {/* 3 Jharokha-Styled Cards in a Single Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-7 mb-4">
          {DELUXE_ROOMS.map((room) => (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className="group flex flex-col justify-between bg-[#FDF8EE] rounded-t-3xl rounded-b-xl overflow-hidden border border-[#C99A52]/70 hover:border-[#4F0809] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer text-left"
            >
              {/* Framed Jharokha Image */}
              <div className="p-2.5 pb-0">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl rounded-b-md bg-[#EFE6D5]">
                  <Image
                    src={room.image}
                    alt={room.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2B0507]/55 via-transparent to-transparent" />

                  <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 bg-[#4F0809]/95 text-[#F7E5C3] text-[9px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-[0.16em]">
                    <span className="w-1 h-1 rounded-full bg-[#D8AA67]" />
                    {room.tag}
                  </span>

                  <span className="absolute bottom-2.5 right-2.5 bg-[#FDF8EE]/95 text-[#4F0809] text-[9px] font-bold uppercase tracking-[0.14em] px-2.5 py-0.5 rounded-full">
                    Deluxe Room
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    className="text-xl sm:text-2xl font-bold text-[#4F0809] mb-1.5 group-hover:text-[#9C7A45] transition-colors duration-200"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    {room.name}
                  </h3>

                  {/* Ornamental Gold Divider */}
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="h-[1px] w-6 bg-[#C99A52]" />
                    <span className="w-1.5 h-1.5 rotate-45 border border-[#C99A52] bg-[#D8AA67]/40" />
                    <span className="h-[1px] flex-1 bg-[#C99A52]/30" />
                  </div>

                  <p className="text-xs text-[#4F0809]/80 line-clamp-2 leading-relaxed mb-4 font-light">
                    {room.shortDesc}
                  </p>

                  {/* Clean Specs Row with Diamond Separators */}
                  <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#6B533B] font-medium pt-3 border-t border-[#C99A52]/30 mb-4">
                    <span className="inline-flex items-center">
                      <Users className="w-3.5 h-3.5 text-[#9C7A45] mr-1.5 shrink-0" />
                      {room.guests}
                    </span>
                    <span className="text-[#C99A52] text-[9px]">&#9830;</span>
                    <span className="inline-flex items-center">
                      <BedDouble className="w-3.5 h-3.5 text-[#9C7A45] mr-1.5 shrink-0" />
                      {room.bed}
                    </span>
                    <span className="text-[#C99A52] text-[9px]">&#9830;</span>
                    <span className="inline-flex items-center">
                      <Maximize2 className="w-3.5 h-3.5 text-[#9C7A45] mr-1.5 shrink-0" />
                      {room.size}
                    </span>
                  </div>
                </div>

                {/* Price and Pill Action Buttons */}
                <div className="pt-3 border-t border-[#C99A52]/40 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.16em] text-[#856B4D] font-semibold block">
                      Royal Tariff
                    </span>
                    <span
                      className="text-xl font-bold text-[#4F0809] leading-tight"
                      style={{
                        fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                      }}
                    >
                      {room.price}
                      <span className="text-[11px] font-normal text-[#6B533B]"> / night</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoom(room);
                      }}
                      className="px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.1em] text-[#4F0809] bg-[#D8AA67]/25 hover:bg-[#D8AA67]/45 transition-colors cursor-pointer"
                    >
                      Details
                    </button>
                    <Link
                      href={`/book?roomTypeId=${room.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center space-x-1 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] text-[#FFF8EB] bg-[#4F0809] hover:bg-[#680b0c] transition-colors cursor-pointer"
                    >
                      <span>Book</span>
                      <ArrowRight className="w-3 h-3 text-[#D8AA67]" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AMENITIES MODAL (SINGLE BORDER, SHADOW-FREE) ── */}
      {selectedRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedRoom(null)}
        >
          <div
            className="relative w-full max-w-xl bg-[#FDF8EE] rounded-t-3xl rounded-b-2xl border border-[#C99A52]/80 overflow-hidden max-h-[90vh] flex flex-col text-left text-[#4F0809]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Image */}
            <div className="relative h-52 sm:h-64 w-full shrink-0 bg-[#EFE6D5]">
              <Image
                src={selectedRoom.image}
                alt={selectedRoom.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2B0507]/90 via-[#2B0507]/35 to-transparent" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                aria-label="Close modal"
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[#4F0809]/85 hover:bg-[#4F0809] text-[#FFF8EB] flex items-center justify-center backdrop-blur-sm transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-[#D8AA67]" />
              </button>

              {/* Title & Badge */}
              <div className="absolute bottom-4 left-5 right-5 text-white">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-[#F7E5C3] bg-[#4F0809]/95 px-2.5 py-1 rounded-full mb-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#D8AA67]" />
                  Deluxe Room
                </span>
                <h3
                  className="text-2xl sm:text-3xl font-bold text-[#FFF8EB]"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  {selectedRoom.name}
                </h3>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Specs Strip */}
              <div className="flex items-center justify-between text-xs sm:text-sm text-[#4F0809] bg-[#F7EFE0] px-4 py-3 rounded-xl">
                <span className="flex items-center font-medium">
                  <Users className="w-4 h-4 text-[#9C7A45] mr-1.5 shrink-0" />
                  {selectedRoom.guests}
                </span>
                <span className="text-[#C99A52] text-[10px]">&#9830;</span>
                <span className="flex items-center font-medium">
                  <BedDouble className="w-4 h-4 text-[#9C7A45] mr-1.5 shrink-0" />
                  {selectedRoom.bed}
                </span>
                <span className="text-[#C99A52] text-[10px]">&#9830;</span>
                <span className="flex items-center font-medium">
                  <Maximize2 className="w-4 h-4 text-[#9C7A45] mr-1.5 shrink-0" />
                  {selectedRoom.size}
                </span>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs sm:text-sm text-[#4F0809]/85 leading-relaxed font-normal">
                  {selectedRoom.fullDesc}
                </p>
              </div>

              {/* Room Facilities */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-[11px] uppercase font-bold tracking-[0.18em] text-[#9C7A45]">
                    Room Facilities
                  </h4>
                  <span className="h-[1px] flex-1 bg-[#C99A52]/30" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROOM_FACILITIES.map((facility, idx) => {
                    const Icon = facility.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center space-x-3 p-2.5 rounded-xl bg-[#F7EFE0]/80"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#FDF8EE] flex items-center justify-center text-[#4F0809] shrink-0">
                          <Icon className="w-4 h-4 text-[#9C7A45]" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-[#4F0809]">
                          {facility.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="p-4 sm:p-5 bg-[#F7EFE0] border-t border-[#C99A52]/40 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[9px] uppercase tracking-[0.16em] text-[#856B4D] font-semibold block">
                  Royal Tariff
                </span>
                <span
                  className="text-xl sm:text-2xl font-bold text-[#4F0809]"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  {selectedRoom.price}
                  <span className="text-xs font-normal text-[#6B533B]"> / night</span>
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedRoom(null)}
                  className="px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-[0.1em] text-[#4F0809] bg-[#FDF8EE] hover:bg-[#EFE6D5] transition-colors cursor-pointer"
                >
                  Close
                </button>
                <Link
                  href={`/book?roomTypeId=${selectedRoom.id}`}
                  className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-[0.12em] text-[#FFF8EB] bg-[#4F0809] hover:bg-[#680b0c] transition-colors cursor-pointer"
                >
                  <span>Book Now</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
