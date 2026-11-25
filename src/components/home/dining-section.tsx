'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Coffee, Sparkles, UtensilsCrossed } from 'lucide-react';
import { RestaurantReservationCTA } from '@/components/restaurant/restaurant-reservation-cta';

interface DiningVenueCard {
  id: 'restaurant' | 'cafe';
  badge: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  imageAlt: string;
  timing: string;
  highlights: string[];
  menuHref: string;
  menuLabel: string;
}

const DINING_VENUES: DiningVenueCard[] = [
  {
    id: 'restaurant',
    badge: 'Royal Dining Hall',
    eyebrow: '56-Bhog Mewar Kitchen',
    title: 'Rajasthani Restaurant',
    subtitle: 'Heirloom Thalis & Live Evening Sitar',
    description:
      'Savor traditional Rajputana recipes crafted with slow-churned pure desi ghee, saffron, and desert spices in sunlit palace arches overlooking Lake Pichola.',
    image: '/images/dining/rajasthani-restaurant.png',
    imageAlt: 'Rajasthani restaurant dining hall at Rajmahal Heritage Hotel',
    timing: 'Lunch & Dinner • 12:00 PM – 10:45 PM',
    highlights: ['Maharaja 56-Bhog Thali', 'Dal Baati Churma', 'Brassware Service'],
    menuHref: '/restaurant',
    menuLabel: 'Explore Dining',
  },
  {
    id: 'cafe',
    badge: 'Courtyard Lounge',
    eyebrow: 'All-Day Artisanal Brews',
    title: 'Jharokha Café & Lounge',
    subtitle: 'Single-Origin Coffee & Crisp South Indian Fare',
    description:
      'Unwind across airy jharokha alcoves with 18-hour cold-steeped Araku coffee, stone-baked flatbreads, gourmet sliders, and golden masala dosa feasts.',
    image: '/images/dining/cafe-lounge.png',
    imageAlt: 'Jharokha Café and Lounge overlooking marble courtyard',
    timing: 'Open Daily • 8:00 AM – 11:00 PM',
    highlights: ['Araku Cold Brew', 'Mysore Masala Dosa', 'Courtyard Seating'],
    menuHref: '/restaurant#cafe',
    menuLabel: 'Explore Café',
  },
];

/** Light Minimal Home Dining showcase with IntersectionObserver scroll reveal and subtle plate scroll state. */
export function DiningSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [activeVenueIndex, setActiveVenueIndex] = useState<number>(0);
  const [cardVisible, setCardVisible] = useState<[boolean, boolean]>([false, false]);
  const [scrollDepth, setScrollDepth] = useState(0);

  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) return;

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const rafId = window.requestAnimationFrame(() => {
        setHeaderVisible(true);
        setCardVisible([true, true]);
      });
      return () => window.cancelAnimationFrame(rafId);
    }

    const headerObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHeaderVisible(true);
      },
      { threshold: 0.08 }
    );
    headerObserver.observe(sectionEl);

    const cardEls = sectionEl.querySelectorAll<HTMLElement>('[data-dining-card-idx]');
    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute('data-dining-card-idx'));
          if (Number.isNaN(idx)) return;
          if (entry.isIntersecting) {
            setCardVisible((prev) => {
              const next: [boolean, boolean] = [...prev];
              next[idx] = true;
              return next;
            });
            if (entry.intersectionRatio >= 0.45) {
              setActiveVenueIndex(idx);
            }
          }
        });
      },
      { threshold: [0.1, 0.45] }
    );

    cardEls.forEach((el) => cardObserver.observe(el));

    return () => {
      headerObserver.disconnect();
      cardObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rafId = 0;
    const updateScrollState = () => {
      rafId = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      setScrollDepth(Number((progress - 0.5).toFixed(3)));
    };

    const onScroll = () => {
      if (!rafId) rafId = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      id="dining-overview"
      ref={sectionRef}
      className="relative py-16 sm:py-24 bg-[#FAF7F2] border-y border-[#E8DFCE]/80 overflow-x-clip"
    >
      {/* Subtle Light-Minimal Radial Heritage Glow (replaces harsh cropped side images) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[min(92vw,960px)] h-72 rounded-full bg-gradient-to-b from-[#F4EBD9]/75 to-transparent blur-3xl"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header + Scroll Reveal */}
        <div
          className={`text-center max-w-2xl mx-auto mb-10 sm:mb-14 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white border border-[#E8DFCE] text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#9C7A45] mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#D8AA67]" />
            <span>Culinary Heritage of Mewar</span>
          </span>

          <h2
            className="text-3xl sm:text-5xl font-bold text-[#4F0809] leading-tight"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            Royal Dining &amp; Courtyard Lounge
          </h2>

          <div className="flex items-center justify-center gap-2 w-40 mx-auto my-3.5">
            <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]" />
            <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
          </div>

          <p className="text-xs sm:text-sm text-[#5A4A3F] leading-relaxed">
            Two distinct culinary sanctuaries inside Rajmahal — imperial Rajasthani banquet dining
            and our sunlit jharokha café overlooking Lake Pichola.
          </p>

          {/* Compact Scroll-State Switcher */}
          <div className="mt-5 inline-flex items-center gap-1.5 p-1 rounded-full bg-white border border-[#E8DFCE] shadow-2xs">
            {DINING_VENUES.map((venue, i) => (
              <button
                key={venue.id}
                type="button"
                onClick={() => setActiveVenueIndex(i)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  activeVenueIndex === i
                    ? 'bg-[#4F0809] text-[#FFF8EB] shadow-2xs'
                    : 'text-[#6B533B] hover:text-[#4F0809]'
                }`}
              >
                {venue.id === 'restaurant' ? (
                  <UtensilsCrossed className="w-3 h-3 text-[#D8AA67]" />
                ) : (
                  <Coffee className="w-3 h-3 text-[#D8AA67]" />
                )}
                <span>{venue.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Light Minimal Split Venue Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {DINING_VENUES.map((venue, idx) => {
            const isRevealed = cardVisible[idx];
            const isFocused = activeVenueIndex === idx;
            const parallaxY = Math.round(scrollDepth * (idx === 0 ? -14 : 14));

            return (
              <article
                key={venue.id}
                data-dining-card-idx={idx}
                className={`scroll-view-reveal group relative flex flex-col sm:flex-row rounded-3xl overflow-hidden bg-white border transition-all duration-500 ${
                  isFocused
                    ? 'border-[#D8AA67] shadow-[0_18px_42px_-18px_rgba(79,8,9,0.16)]'
                    : 'border-[#E8DFCE] shadow-[0_8px_24px_-14px_rgba(79,8,9,0.08)] hover:border-[#D8AA67]/80'
                } ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{
                  transitionDelay: `${idx * 100}ms`,
                }}
              >
                {/* Media Column with Subtle Scroll Parallax */}
                <div className="sm:w-[44%] shrink-0 p-3 sm:p-4 sm:pr-0">
                  <div className="relative h-56 sm:h-full min-h-[240px] w-full overflow-hidden rounded-2xl bg-[#F3ECE0]">
                    <img
                      src={venue.image}
                      alt={venue.imageAlt}
                      style={{
                        transform: `translateY(${parallaxY}px) scale(1.06)`,
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 will-change-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#240607]/65 via-transparent to-transparent" />

                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 border border-[#E8DFCE] text-[10px] font-bold uppercase tracking-[0.14em] text-[#4F0809] shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D8AA67]" />
                      <span>{venue.badge}</span>
                    </span>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#FAF3E6]">
                        <Clock className="w-3.5 h-3.5 text-[#D8AA67] shrink-0" />
                        <span>{venue.timing}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Column */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#9C7A45] block">
                      {venue.eyebrow}
                    </span>

                    <div>
                      <h3
                        className="text-2xl sm:text-[28px] font-bold text-[#4F0809] leading-tight group-hover:text-[#7B1113] transition-colors"
                        style={{
                          fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                        }}
                      >
                        {venue.title}
                      </h3>
                      <p className="text-xs font-medium text-[#8C6D3B] mt-0.5">{venue.subtitle}</p>
                    </div>

                    <p className="text-xs sm:text-sm text-[#5A4A3F] leading-relaxed">
                      {venue.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {venue.highlights.map((item) => (
                        <span
                          key={item}
                          className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-[#FAF7F2] text-[#6B533B] border border-[#EDE5D8]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="pt-3.5 border-t border-[#EDE5D8] flex flex-wrap items-center gap-2.5">
                    <Link
                      href={venue.menuHref}
                      className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-[#FAF5EB] hover:bg-[#EFE4D0] text-[#4F0809] border border-[#E8DFCE] text-xs font-bold uppercase tracking-[0.1em] transition-colors"
                    >
                      <span>{venue.menuLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#9C7A45] shrink-0" />
                    </Link>

                    {venue.id === 'restaurant' ? (
                      <RestaurantReservationCTA
                        venue="restaurant"
                        variant="maroon"
                        label="Reserve Table"
                        className="!flex-1 !min-w-[130px] !h-10 !px-4 !py-0 !text-xs !tracking-[0.1em]"
                      />
                    ) : (
                      <Link
                        href="/menu?venue=cafe"
                        className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-xs font-bold uppercase tracking-[0.1em] transition-colors shadow-2xs"
                      >
                        <span>Order Online</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67] shrink-0" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Full Dining Page Callout Strip */}
        <div className="mt-8 sm:mt-10 rounded-2xl bg-white border border-[#E8DFCE] px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <p className="text-xs sm:text-sm text-[#5A4A3F] text-center sm:text-left">
            Explore our full culinary showcase with rotating Maharaja Thalis, South Indian platters,
            and courtyard fast-food classics.
          </p>
          <Link
            href="/restaurant"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-xs font-bold uppercase tracking-[0.12em] shrink-0 transition-colors"
          >
            <span>Open Culinary Experience</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
          </Link>
        </div>
      </div>
    </section>
  );
}
