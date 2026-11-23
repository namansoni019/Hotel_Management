import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { HeroSection } from '@/components/home/hero-section';
import { roomsService } from '@/lib/services/rooms-service';
import { formatMoney } from '@/lib/utils/money';
import { ArrowRight, BedDouble, Users } from 'lucide-react';
import { InstaLookbook } from '@/components/home/insta-lookbook';
import { EventMemories } from '@/components/home/event-memories';
import { Testimonials } from '@/components/home/testimonials';
import { Promotions } from '@/components/home/promotions';
import { RestaurantReservationCTA } from '@/components/restaurant/restaurant-reservation-cta';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rajmahal Heritage Hotel | A Royal Stay Rooted in Rajasthan',
  description:
    'Experience the royal heritage of Rajasthan at Rajmahal Heritage Hotel. Six authentic heritage suites, traditional Rajasthani restaurant, café & lounge, and grand party hall.',
};

type HeritageIconName = 'arch' | 'dining' | 'cafe' | 'pavilion' | 'wedding' | 'menu' | 'booking' | 'calendar';

function HeritageQuickIcon({ name }: { name: HeritageIconName }) {
  const common = {
    className:
      'w-9 h-9 min-[400px]:w-10 min-[400px]:h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 shrink-0 transition-transform duration-300 group-hover:scale-110 text-[#d8aa67]',
    viewBox: '0 0 72 72',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.35,
    'aria-hidden': true,
  };

  if (name === 'arch') {
    return (
      <svg {...common}>
        <path d="M11 62V29L36 8l25 21v33M16 62V31l20-17 20 17v31M22 62V34l14-13 14 13v28" />
        <path d="M28 62V43c0-6 3.3-10.3 8-13 4.7 2.7 8 7 8 13v19M8 62h56M17 29 36 12l19 17" />
        <path d="M24 52h24M31 52v-7h10v7M14 58h8M50 58h8" />
      </svg>
    );
  }

  if (name === 'dining') {
    return (
      <svg {...common}>
        <ellipse cx="36" cy="49" rx="27" ry="10" />
        <ellipse cx="36" cy="46" rx="21" ry="7" />
        <path d="M20 43v-8h12v9M22 35c0-4 8-4 8 0M40 44v-9h12v8M42 35c0-4 8-4 8 0" />
        <circle cx="36" cy="42" r="5" />
        <path d="M9 58h54M14 54c6 5 38 5 44 0M13 24v14M9 24v8c0 4 8 4 8 0v-8M58 24v14M63 24v14" />
      </svg>
    );
  }

  if (name === 'menu') {
    return (
      <svg {...common}>
        <ellipse cx="36" cy="52" rx="26" ry="8" />
        <path d="M12 52h48" />
        <path d="M16 50c0-14 9-24 20-24s20 10 20 24" />
        <path d="M22 47c2-9 7-16 14-16s12 7 14 16" strokeDasharray="3 3" />
        <circle cx="36" cy="22" r="4" />
        <path d="M36 18v-5M33 13h6" />
        <path d="M26 18c-2-3 2-4 0-7M46 18c2-3-2-4 0-7" strokeWidth="1.1" />
        <path d="M10 58h52" />
      </svg>
    );
  }

  if (name === 'booking' || name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="14" y="18" width="44" height="42" rx="5" />
        <path d="M14 28h44M24 12v10M48 12v10" />
        <path d="m36 34 2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8 2.5-5Z" />
        <path d="M20 54h32M10 64h52" />
      </svg>
    );
  }

  if (name === 'cafe') {
    return (
      <svg {...common}>
        <path d="M17 30h34v12c0 10-6.5 16-17 16S17 52 17 42V30Z" />
        <path d="M51 35h5c8 0 8 12 0 12h-6M12 62h48M18 57h32" />
        <path d="M27 24c-4-5 4-7 0-12M36 24c-4-5 4-7 0-12M45 24c-4-5 4-7 0-12" />
      </svg>
    );
  }

  if (name === 'pavilion') {
    return (
      <svg {...common}>
        <path d="M8 62h56M13 58h46M16 58V31h40v27M11 31h50L36 9 11 31Z" />
        <path d="M20 31 36 14l16 17M25 31 36 19l11 12M36 9v22" />
        <path d="M22 58V39l7 7 7-8 7 8 7-7v19M16 35h40" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M36 61c-16 0-25-10-25-22 0-9 7-16 16-16 5 0 9 2 12 6 3-4 7-6 12-6 8 0 14 6 14 14 0 13-13 24-29 24Z" />
      <path d="M29 45c-6-1-10-5-10-10 0-4 3-7 7-7 5 0 8 5 10 10M43 45c6-1 10-5 10-10 0-4-3-7-7-7-5 0-8 5-10 10" />
      <circle cx="36" cy="43" r="10" />
      <path d="m36 33 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6ZM32 18l4-7 4 7-4 5-4-5Z" />
      <path d="M19 53c-4 0-8-2-11-5M53 53c4 0 8-2 11-5" />
    </svg>
  );
}

async function HomeContent() {
  const roomTypes = await roomsService.getRoomTypes();

  const quickLinks: { label: string; href: string; icon: HeritageIconName }[] = [
    { label: 'Heritage Rooms', href: '/rooms', icon: 'arch' },
    { label: 'Hotel & Celebrations', href: '/hotel', icon: 'pavilion' },
    { label: 'Restaurant & Café', href: '/restaurant', icon: 'dining' },
    { label: 'Palace Menu', href: '/menu', icon: 'menu' },
    { label: 'Book Your Stay', href: '/book', icon: 'booking' },
  ];

  return (
    <div className="flex flex-col w-full text-[#151c1a]" style={{ backgroundColor: 'var(--cream, #fbf5e9)' }}>
      {/* ── 1. HERO SECTION (SCROLL-AWARE FULL-SCREEN & SHRINKING FRAME) ── */}
      <HeroSection />

      {/* ── 2. QUICK LINKS WITH HERITAGE ORNAMENTS ── */}
      <section
        className="relative z-10 pt-10 sm:pt-14 md:pt-16 pb-16 overflow-hidden"
        style={{ backgroundColor: 'var(--cream, #fbf5e9)' }}
      >
        {/* Left and Right Floral Artworks */}
        <img
          className="floral-artwork left opacity-15 sm:opacity-25"
          src="/images/ornaments/floral-left.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className="floral-artwork right opacity-15 sm:opacity-25"
          src="/images/ornaments/floral-right.png"
          alt=""
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-6xl mx-auto px-2 sm:px-6 lg:px-8">
          {/* Unified Common Background Container (Single Border) */}
          <div className="rounded-2xl bg-[#FDF8EE] border border-[#C99A52]/60 py-1 sm:py-4 overflow-hidden">
            {/* 5-Column Grid with Vertical Dividers Between All Cards */}
            <div className="grid grid-cols-5 divide-x divide-[#C99A52]/35 text-center">
              {quickLinks.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  className="group flex flex-col items-center justify-start py-2 px-1 min-[400px]:px-2 sm:py-3 sm:px-4 hover:bg-[#4F0809]/[0.03] transition-colors cursor-pointer"
                >
                  <div className="mb-1.5 sm:mb-3 transition-transform duration-200 group-hover:-translate-y-0.5">
                    <HeritageQuickIcon name={item.icon} />
                  </div>
                  <span
                    className="text-[10px] min-[360px]:text-[11px] min-[400px]:text-xs sm:text-base md:text-lg font-semibold text-[#4f0809] tracking-normal leading-[1.15] sm:leading-snug group-hover:text-[#9C7A45] transition-colors"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Border and Lotus Artwork at section bottom */}
        <img
          className="border-artwork opacity-20"
          src="/images/ornaments/border-line.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className="lotus-artwork opacity-25"
          src="/images/ornaments/center-lotus.png"
          alt=""
          aria-hidden="true"
        />
      </section>

      {/* ── 3. EXPERIENCE THE ROYAL HERITAGE OF RAJASTHAN ── */}
<section
        className="relative py-16 sm:py-20 lg:py-24 overflow-hidden"
        style={{ backgroundColor: 'var(--heritage-ivory, #fff7e8)' }}
      >
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center">
            {/* Left: Jharokha-Framed Heritage Bedroom */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="group relative w-full max-w-[440px] sm:max-w-[480px] p-2.5 sm:p-3 rounded-t-[36px] rounded-b-2xl bg-[#FDF8EE] border border-[#C99A52]/70">
                <div className="relative w-full overflow-hidden rounded-t-[28px] rounded-b-xl bg-[#EFE6D5]">
                  <img
                    src="/images/heritage-reference/framed-bedroom.png"
                    alt="Warmly lit Rajputana bedroom overlooking lake"
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <img
                    src="/images/heritage-reference/frame-softener.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40"
                  />
                </div>
              </div>
            </div>

            {/* Right: Heritage Story Copy (Centered on Mobile, Left-Aligned on Desktop) */}
            <div className="lg:col-span-7 lg:pl-6 flex flex-col items-center lg:items-start text-center lg:text-left">
              {/* Royal Eyebrow */}
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#9C7A45] inline-flex items-center justify-center lg:justify-start gap-2.5 sm:gap-3 mb-3">
                <span className="w-6 sm:w-8 h-[1px] bg-[#C99A52] lg:hidden" />
                <span>Authentic Rajputana Grandeur</span>
                <span className="w-6 sm:w-10 h-[1px] bg-[#C99A52]" />
              </span>

              {/* Heading */}
              <h2
                className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 leading-[0.98] text-[#4F0809]"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                Experience the Royal <br className="hidden sm:inline" />
                Heritage of Rajasthan
              </h2>

              {/* Ornamental Diamond-Tipped Gold Rule */}
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-5 sm:mb-6 w-40 sm:w-52">
                <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
                <span className="w-2 h-2 rotate-45 border border-[#C99A52] bg-[#D8AA67]/40" />
                <span className="h-[1px] flex-1 bg-[#C99A52]/60 lg:hidden" />
              </div>

              {/* Story Description */}
              <p className="text-sm sm:text-base text-[#4F0809]/85 mb-7 sm:mb-8 leading-relaxed font-normal max-w-xl mx-auto lg:mx-0">
                A blend of traditional Rajasthani architecture and modern luxury, designed for a truly memorable stay. From handcrafted interiors to breathtaking views, every moment at Rajmahal reflects the rich heritage and timeless charm of Udaipur.
              </p>

              {/* Shadow-Free Royal Pill CTA */}
              <Link
                href="/rooms"
                className="inline-flex items-center justify-center space-x-2.5 px-7 sm:px-8 py-3 sm:py-3.5 rounded-full bg-[#4F0809] hover:bg-[#680b0c] border border-[#D8AA67] text-[#FFF8EB] text-xs sm:text-sm font-bold uppercase tracking-[0.14em] transition-colors duration-200 cursor-pointer group"
              >
                <span>Discover Our Heritage</span>
                <ArrowRight className="w-4 h-4 text-[#D8AA67] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Palace Line Art in background */}
        <img
          className="heritage-palace-art opacity-25"
          src="/images/heritage-reference/palace-art.png"
          alt=""
          aria-hidden="true"
        />

        {/* Bottom Decorative Divider */}
        <img
          className="heritage-bottom-divider opacity-60"
          src="/images/heritage-reference/bottom-divider.png"
          alt=""
          aria-hidden="true"
        />
      </section>

      {/* ── 4. OUR HERITAGE ROOMS (DYNAMIC DATA FROM DATABASE) ── */}
<section className="relative py-20 overflow-hidden" style={{ backgroundColor: 'var(--cream, #fbf5e9)' }}>
        {/* Left and Right Palace Trees Art */}
        <img
          className="room-side-art left opacity-15"
          src="/images/room-art/left-palace-tree.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className="room-side-art right opacity-15"
          src="/images/room-art/right-palace-tree.png"
          alt=""
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d8aa67] block mb-2">
              Royal Comforts, Timeless Stories
            </span>
            <h2
              className="text-3xl sm:text-5xl font-bold mb-3 text-[#781c1c]"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              Our Heritage Rooms
            </h2>
            <p className="text-sm sm:text-base text-[#5a4334]">
              Six unique Rajasthani experiences, each with its own story, architecture and charm.
            </p>
          </div>

{/* Dynamic Rooms Grid: Compact 2x on Mobile, 4x on Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
            {roomTypes.map((room) => {
              const roomImage = room.photos?.[0] || '/images/rooms/lakeview-palace-suite.png';
              return (
                <Link
                  key={room.id}
                  href={`/rooms/${room.id}`}
                  className="group flex flex-col justify-between rounded-t-2xl sm:rounded-t-3xl rounded-b-xl overflow-hidden bg-[#FDF8EE] border border-[#C99A52]/70 hover:border-[#4F0809] hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer"
                >
                  {/* Compact Image Header */}
                  <div className="p-1.5 sm:p-2.5 pb-0">
                    <div className="relative h-24 min-[400px]:h-28 sm:h-48 lg:h-44 xl:h-48 w-full overflow-hidden rounded-t-xl sm:rounded-t-2xl rounded-b-md bg-[#EFE6D5]">
                      <Image
                        src={roomImage}
                        alt={room.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#2B0507]/50 via-transparent to-transparent" />

                      {/* Floating Royal Crest Pill */}
                      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2 rounded-full bg-[#4F0809]/95 text-[7px] sm:text-[9px] font-semibold uppercase tracking-[0.14em] text-[#F7E5C3]">
                          <span className="w-1 h-1 rounded-full bg-[#D8AA67]" />
                          Rajputana
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Compact Card Body */}
                  <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        className="text-sm sm:text-xl font-bold mb-1 text-[#4F0809] group-hover:text-[#9C7A45] transition-colors duration-200 line-clamp-1"
                        style={{
                          fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                        }}
                      >
                        {room.name}
                      </h3>

                      {/* Ornamental Gold Divider */}
                      <div className="flex items-center gap-1 mb-1.5 sm:mb-2">
                        <span className="h-[1px] w-4 sm:w-6 bg-[#C99A52]" />
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rotate-45 border border-[#C99A52] bg-[#D8AA67]/40" />
                        <span className="h-[1px] flex-1 bg-[#C99A52]/30" />
                      </div>

                      {/* Single-Line Amenities Row on Mobile */}
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-xs text-[#6B533B] mb-1.5 sm:mb-2 font-medium whitespace-nowrap">
                        <span className="inline-flex items-center">
                          <BedDouble className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-[#9C7A45] mr-0.5 sm:mr-1 shrink-0" />
                          <span>King</span>
                        </span>
                        <span className="text-[#C99A52] text-[8px]">&#9830;</span>
                        <span className="inline-flex items-center">
                          <Users className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-[#9C7A45] mr-0.5 sm:mr-1 shrink-0" />
                          <span>{room.capacity} Guests</span>
                        </span>
                      </div>

                      {/* Hidden on tiny mobile screens to save vertical height, visible from sm+ */}
                      <p className="hidden sm:line-clamp-2 text-xs text-[#4F0809]/85 mb-3 leading-relaxed font-light">
                        {room.description ||
                          'Experience authentic royal heritage comforts with handcrafted furnishings and scenic views.'}
                      </p>
                    </div>

                    {/* Footer: Tariff & Compact Reserve CTA */}
                    <div className="pt-2 border-t border-[#C99A52]/40 flex items-center justify-between gap-1.5">
                      <div className="flex flex-col text-left min-w-0">
                        <span className="hidden sm:block text-[9px] uppercase tracking-[0.16em] text-[#856B4D] font-semibold">
                          Royal Tariff
                        </span>
                        <span
                          className="text-sm sm:text-lg font-bold text-[#4F0809] leading-none truncate"
                          style={{
                            fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                          }}
                        >
                          {formatMoney(room.base_rate_minor)}
                          <span className="text-[9px] sm:text-[10px] font-normal text-[#6B533B] block sm:inline">
                            {' '}/ night
                          </span>
                        </span>
                      </div>

                      <span className="shrink-0 inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 sm:px-3 rounded-full bg-[#4F0809] text-[#FFF8EB] text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.1em] transition-colors duration-200 group-hover:bg-[#680b0c]">
                        <span>Reserve</span>
                        <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#D8AA67] stroke-[2.2] group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. DINING SECTION (FIGMA SPEC) ── */}
<section className="relative sm:py-20 overflow-hidden" style={{ backgroundColor: 'var(--heritage-ivory, #fff7e8)' }}>
        <img
          className="dining-side-art left opacity-20"
          src="/images/dining/edge-left.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className="dining-side-art right opacity-20"
          src="/images/dining/edge-right.png"
          alt=""
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#9C7A45] block mb-1.5 sm:mb-2">
              Culinary Heritage of Mewar
            </span>
            <h2
              className="text-3xl sm:text-5xl font-bold mb-2.5 text-[#4F0809] leading-tight"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              Royal Dining &amp; Lounge
            </h2>

            {/* Ornamental Gold Divider */}
            <div className="flex items-center justify-center gap-2 w-36 sm:w-44 mx-auto mb-3">
              <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
              <span className="w-1.5 h-1.5 rotate-45 border border-[#C99A52] bg-[#D8AA67]/40" />
              <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
            </div>

            <p className="text-xs sm:text-sm text-[#4F0809]/80 leading-relaxed font-normal">
              Savor time-honored Rajputana delicacies and artisanal brews overlooking Lake Pichola.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-5 lg:gap-7">
            {/* Feature 1: Rajasthani Restaurant */}
            <article className="group flex flex-col lg:flex-row rounded-t-2xl sm:rounded-t-3xl rounded-b-xl lg:rounded-2xl overflow-hidden bg-[#FDF8EE] border border-[#C99A52]/70 hover:border-[#4F0809] hover:-translate-y-1 transition-all duration-300 ease-out">
              {/* Image Section: Compact Landscape on Mobile, Left Split on Desktop */}
              <div className="p-1.5 sm:p-2.5 pb-0 lg:pb-2.5 lg:pr-0 w-full lg:w-[44%] shrink-0">
                <div className="relative h-24 min-[400px]:h-28 sm:h-48 lg:h-full lg:min-h-[260px] w-full overflow-hidden rounded-t-xl sm:rounded-t-2xl rounded-b-md lg:rounded-xl bg-[#EFE6D5]">
                  <img
                    src="/images/dining/rajasthani-restaurant.png"
                    alt="Rajasthani restaurant dining room overlooking the lake"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2B0507]/50 via-transparent to-transparent" />

                  {/* Floating Royal Crest Pill */}
                  <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#4F0809]/95 text-[7px] sm:text-[9px] font-semibold uppercase tracking-[0.14em] text-[#F7E5C3]">
                      <span className="w-1 h-1 rounded-full bg-[#D8AA67]" />
                      Royal Dining
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-2.5 sm:p-5 lg:p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[8px] sm:text-[11px] font-bold tracking-[0.16em] uppercase text-[#9C7A45] block mb-0.5 sm:mb-1">
                    Authentic Flavors
                  </span>
                  <h3
                    className="text-sm sm:text-2xl lg:text-[26px] font-bold mb-1 sm:mb-1.5 text-[#4F0809] group-hover:text-[#9C7A45] transition-colors duration-200 leading-tight line-clamp-1 sm:line-clamp-none"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    Rajasthani Restaurant
                  </h3>

                  {/* Ornamental Gold Divider */}
                  <div className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-3">
                    <span className="h-[1px] w-4 sm:w-8 bg-[#C99A52]" />
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rotate-45 border border-[#C99A52] bg-[#D8AA67]/40" />
                    <span className="h-[1px] flex-1 bg-[#C99A52]/30" />
                  </div>

                  <p className="text-[10px] sm:text-xs lg:text-sm text-[#4F0809]/85 leading-snug sm:leading-relaxed mb-2.5 sm:mb-5 font-light line-clamp-2 sm:line-clamp-3 lg:line-clamp-none">
                    Experience the true taste of Rajasthan with traditional recipes, fresh local ingredients and a heritage dining atmosphere.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 sm:pt-3.5 border-t border-[#C99A52]/40 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2.5">
                  <Link
                    href="/restaurant"
                    className="flex items-center justify-center space-x-1 h-7 sm:h-10 px-2 sm:px-2.5 rounded-full bg-[#D8AA67] text-[#2B0507] text-[9px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.1em] transition-colors duration-200 hover:bg-[#E1B46F]"
                  >
                    <span>View Menu</span>
                    <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                  </Link>
                  <div className="[&>*]:w-full [&>*]:h-7 sm:[&>*]:h-10 [&>*]:rounded-full [&>*]:shadow-none [&>*]:text-[9px] sm:[&>*]:text-xs [&>*]:uppercase [&>*]:tracking-[0.08em] sm:[&>*]:tracking-[0.1em]">
                    <RestaurantReservationCTA
                      venue="restaurant"
                      variant="card"
                      label="Reserve Table"
                    />
                  </div>
                </div>
              </div>
            </article>

            {/* Feature 2: Café & Lounge */}
            <article className="group flex flex-col lg:flex-row rounded-t-2xl sm:rounded-t-3xl rounded-b-xl lg:rounded-2xl overflow-hidden bg-[#FDF8EE] border border-[#C99A52]/70 hover:border-[#4F0809] hover:-translate-y-1 transition-all duration-300 ease-out">
              {/* Image Section: Compact Landscape on Mobile, Left Split on Desktop */}
              <div className="p-1.5 sm:p-2.5 pb-0 lg:pb-2.5 lg:pr-0 w-full lg:w-[44%] shrink-0">
                <div className="relative h-24 min-[400px]:h-28 sm:h-48 lg:h-full lg:min-h-[260px] w-full overflow-hidden rounded-t-xl sm:rounded-t-2xl rounded-b-md lg:rounded-xl bg-[#EFE6D5]">
                  <img
                    src="/images/dining/cafe-lounge.png"
                    alt="Heritage café and lounge with lake views"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2B0507]/50 via-transparent to-transparent" />

                  {/* Floating Royal Crest Pill */}
                  <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#4F0809]/95 text-[7px] sm:text-[9px] font-semibold uppercase tracking-[0.14em] text-[#F7E5C3]">
                      <span className="w-1 h-1 rounded-full bg-[#D8AA67]" />
                      Palace Lounge
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-2.5 sm:p-5 lg:p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[8px] sm:text-[11px] font-bold tracking-[0.16em] uppercase text-[#9C7A45] block mb-0.5 sm:mb-1">
                    Relax, Sip &amp; Unwind
                  </span>
                  <h3
                    className="text-sm sm:text-2xl lg:text-[26px] font-bold mb-1 sm:mb-1.5 text-[#4F0809] group-hover:text-[#9C7A45] transition-colors duration-200 leading-tight line-clamp-1 sm:line-clamp-none"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    Café &amp; Lounge
                  </h3>

                  {/* Ornamental Gold Divider */}
                  <div className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-3">
                    <span className="h-[1px] w-4 sm:w-8 bg-[#C99A52]" />
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rotate-45 border border-[#C99A52] bg-[#D8AA67]/40" />
                    <span className="h-[1px] flex-1 bg-[#C99A52]/30" />
                  </div>

                  <p className="text-[10px] sm:text-xs lg:text-sm text-[#4F0809]/85 leading-snug sm:leading-relaxed mb-2.5 sm:mb-5 font-light line-clamp-2 sm:line-clamp-3 lg:line-clamp-none">
                    A cozy space to enjoy freshly brewed coffee, Rajasthani snacks and a relaxed ambience with beautiful views.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 sm:pt-3.5 border-t border-[#C99A52]/40 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2.5">
                  <Link
                    href="/restaurant#cafe"
                    className="flex items-center justify-center space-x-1 h-7 sm:h-10 px-2 sm:px-2.5 rounded-full bg-[#D8AA67] text-[#2B0507] text-[9px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.1em] transition-colors duration-200 hover:bg-[#E1B46F]"
                  >
                    <span>Café Menu</span>
                    <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                  </Link>
                  <Link
                    href="/restaurant"
                    className="flex items-center justify-center h-7 sm:h-10 px-2 sm:px-2.5 rounded-full bg-[#4F0809] text-[#FFF8EB] text-[9px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.1em] transition-colors duration-200 hover:bg-[#680b0c]"
                  >
                    <span>Order Now</span>
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── 6. EVENT MEMORIES GALLERY (FIGMA EXACT RECREATION) ── */}
      <EventMemories />

      {/* ── 6.5 PROMOTIONS — CURRENT OFFERS ── */}
      <Promotions />

      {/* ── 7. INSTA LOOKBOOK & REELS SECTION ── */}
      <InstaLookbook />

      {/* ── 8. GUEST EXPERIENCES — WHAT OUR GUESTS SAY ── */}
      <Testimonials />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbf5e9]" />}>
      <HomeContent />
    </Suspense>
  );
}
