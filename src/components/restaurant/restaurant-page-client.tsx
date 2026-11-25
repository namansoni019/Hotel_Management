'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  HeritageDivider,
  LataJaaliRunner,
  MandalaOrnament,
} from '@/components/ui/heritage-ornaments';
import {
  IconTraditionalCuisine,
  IconIndoorOutdoor,
  IconLiveFolkMusic,
  IconSpecialThali,
} from '@/components/ui/heritage-art';
import {
  ArrowRight,
  QrCode,
  Clock,
  Coffee,
  UtensilsCrossed,
  Sparkles,
  ChevronRight,
  Star,
} from 'lucide-react';
import { RestaurantReservationCTA } from '@/components/restaurant/restaurant-reservation-cta';

interface ThaliItem {
  id: string;
  title: string;
  badge: string;
  price: string;
  image: string;
  desc: string;
  highlights: string[];
  menuUrl: string;
}

interface CafeItem {
  id: string;
  title: string;
  badge: string;
  price: string;
  image: string;
  desc: string;
  highlights: string[];
  menuUrl: string;
}

const THALIS: ThaliItem[] = [
  {
    id: 'thali-maharaja',
    title: 'Maharaja 56-Bhog Grand Thali',
    badge: 'Imperial 56-Bhog Feast',
    price: '₹1,499',
    image: '/images/restaurant/thali-maharaja-grand.png',
    desc: 'An opulent royal feast of 56 delicacies — Dal Baati Churma, Gatte ki Sabzi, Ker Sangri, Shahi Paneer, saffron pulao, hand-rolled rotis, and sacred palace sweets.',
    highlights: ['56 Royal Delicacies', 'Pure Desi Ghee', 'Chef’s Crown Jewel'],
    menuUrl: '/menu?venue=restaurant',
  },
  {
    id: 'thali-brass',
    title: 'Rajmahal Royal Brass Thali',
    badge: 'Heirloom Kansa Heritage',
    price: '₹899',
    image: '/images/restaurant/thali-royal-brass.png',
    desc: 'Served on restorative kansa brassware with 8 regional curries, tempered dal tadka, fragrant cumin basmati, hot phulkas, crisp papad, and churned sweet lassi.',
    highlights: ['8 Regional Curries', 'Restorative Kansa Metal', 'Signature Favorite'],
    menuUrl: '/menu?venue=restaurant',
  },
  {
    id: 'dish-chhole-rice',
    title: 'Amritsari Chhole & Basmati Rice',
    badge: 'Palace Comfort Classic',
    price: '₹450',
    image: '/images/restaurant/dish-chhole-rice-bowl.png',
    desc: 'White chickpeas slow-simmered in 16 ground spices, crowned with pickled shallots, fresh green chilli, cilantro, and fragrant ghee-tempered long grain rice.',
    highlights: ['16-Spice Gravy', 'Aged Jeera Basmati', 'Heritage Recipe'],
    menuUrl: '/menu?venue=restaurant',
  },
];

const CAFE_FAVORITES: CafeItem[] = [
  {
    id: 'cafe-south-indian',
    title: 'Mysore Masala Dosa & Idli Platter',
    badge: 'South Indian Special',
    price: '₹320',
    image: '/images/restaurant/cafe-south-indian-feast.png',
    desc: 'Crisp golden fermented rice crepe filled with spiced potato mash, served with steamed idlis, medu vada, fresh coconut & roasted tomato chutneys, and hot sambar.',
    highlights: ['Crispy Masala Dosa', 'Steamed Idlis & Vada', '3 Chutneys & Sambar'],
    menuUrl: '/menu?venue=cafe',
  },
  {
    id: 'cafe-pizza',
    title: 'Wood-Fired Garden Herb Pizza',
    badge: 'Artisan Stone Oven',
    price: '₹520',
    image: '/images/restaurant/cafe-artisan-pizza.png',
    desc: '48-hour slow-fermented sourdough crust topped with charred bell peppers, sun-ripened tomatoes, kalamata olives, molten fresh mozzarella, and sweet basil.',
    highlights: ['Sourdough Crust', 'Charred Garden Veggies', 'Molten Mozzarella'],
    menuUrl: '/menu?venue=cafe',
  },
  {
    id: 'cafe-burger',
    title: 'Palace Brioche Burger & Golden Fries',
    badge: 'Gourmet Fast Food',
    price: '₹380',
    image: '/images/restaurant/cafe-burger-fries.png',
    desc: 'Herb-crusted gourmet patty with smoked cheddar, crisp romaine, garden tomatoes, and house truffle aioli on a toasted butter brioche, served with salted fries.',
    highlights: ['Butter Brioche Bun', 'Smoked Cheddar', 'Crisp Sea Salt Fries'],
    menuUrl: '/menu?venue=cafe',
  },
  {
    id: 'cafe-coffee',
    title: 'Araku Valley Iced Cold Coffee',
    badge: 'Signature Cold Brew',
    price: '₹240',
    image: '/images/restaurant/cafe-iced-coffee.png',
    desc: '18-hour cold steeped single-origin Araku Valley coffee poured over crystalline ice with a velvety cream float, accompanied by roasted almond biscotti.',
    highlights: ['Single-Origin Beans', '18-Hour Cold Steep', 'Almond Biscotti'],
    menuUrl: '/menu?venue=cafe',
  },
];

const DINING_FEATURES = [
  {
    label: 'Traditional Rajasthani Cuisine',
    desc: 'Centuries-old recipes passed down by palace khansamas',
    icon: IconTraditionalCuisine,
  },
  {
    label: 'Courtyard & Jharokha Seating',
    desc: 'Al-fresco marble dining under open sky or private alcoves',
    icon: IconIndoorOutdoor,
  },
  {
    label: 'Live Folk Music & Sitar',
    desc: 'Enchanting evening melodies by master classical artistes',
    icon: IconLiveFolkMusic,
  },
  {
    label: 'Royal Thali Feasts',
    desc: 'Full-course banquets served on kansa and gold-leaf brassware',
    icon: IconSpecialThali,
  },
];

/** Custom hook to observe scroll entry with safe initial visibility option */
function useInView(options?: {
  threshold?: number;
  rootMargin?: string;
  initialInView?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState<boolean>(() => Boolean(options?.initialInView));

  useEffect(() => {
    const el = ref.current;
    if (!el || isInView) return;

    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      const rafId = window.requestAnimationFrame(() => setIsInView(true));
      return () => window.cancelAnimationFrame(rafId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      {
        threshold: options?.threshold ?? 0.05,
        rootMargin: options?.rootMargin ?? '0px 0px -20px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isInView, options?.threshold, options?.rootMargin]);

  return [ref, isInView] as const;
}

/** Individual Thali Card with Scroll Reveal & Inner Content Cascade */
function ThaliFoodCard({
  thali,
  index,
}: {
  thali: ThaliItem;
  index: number;
}) {
  const [cardRef, isInView] = useInView({ threshold: 0.05, rootMargin: '0px 0px -15px 0px' });
  const staggerDelay = Math.min(index * 70, 210);

  return (
    <div
      ref={cardRef}
      className={`group relative bg-white rounded-3xl p-6 sm:p-7 border border-[#E8DFCE] shadow-[0_4px_20px_rgba(79,8,9,0.03)] hover:shadow-[0_20px_35px_rgba(79,8,9,0.08)] hover:-translate-y-1.5 transition-all duration-500 flex flex-col justify-between ${
        isInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-7 scale-[0.97]'
      }`}
      style={{
        transitionDelay: `${staggerDelay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── STEP 1: Floating Food Image (Plate) with Compositor Scroll Rotation ── */}
      <div
        className={`relative w-full aspect-square max-w-[260px] mx-auto mb-6 flex items-center justify-center transition-all duration-500 ${
          isInView ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
        }`}
        style={{
          transitionDelay: `${staggerDelay + 40}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="absolute inset-4 rounded-full bg-gradient-to-b from-[#F9F5EC] to-[#EFE7D8]/60 blur-md group-hover:scale-105 transition-transform duration-500" />

        <div className="relative w-full h-full transform group-hover:scale-105 transition-transform duration-500">
          <div className="relative w-full h-full will-change-transform food-scroll-rotate">
            <Image
              src={thali.image}
              alt={thali.title}
              fill
              className="object-contain drop-shadow-[0_16px_25px_rgba(45,10,12,0.16)]"
            />
          </div>
        </div>

        {/* ── STEP 2: Badge Pop-In ── */}
        <div
          className={`absolute top-0 left-0 bg-[#4F0809] text-[#FFF8EB] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm transition-all duration-400 ${
            isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-85'
          }`}
          style={{
            transitionDelay: `${staggerDelay + 80}ms`,
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {thali.badge}
        </div>
      </div>

      {/* ── STEP 3: Title & Description Entrance ── */}
      <div className="space-y-3 text-center flex-1 flex flex-col justify-between">
        <div
          className={`transition-all duration-500 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{
            transitionDelay: `${staggerDelay + 110}ms`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <h3
            className="text-xl sm:text-2xl font-bold text-[#4F0809] leading-snug group-hover:text-[#9C7A45] transition-colors"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            {thali.title}
          </h3>
          <p className="text-xs text-[#6B533B] font-normal leading-relaxed mt-2 line-clamp-3">
            {thali.desc}
          </p>
        </div>

        {/* ── STEP 4: Ingredient Highlight Pills ── */}
        <div
          className={`flex flex-wrap items-center justify-center gap-1.5 pt-1 transition-all duration-500 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
          style={{
            transitionDelay: `${staggerDelay + 150}ms`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {thali.highlights.map((h, i) => (
            <span
              key={i}
              className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#FAF5EB] text-[#8C6D3B] border border-[#EBE3D5]"
            >
              {h}
            </span>
          ))}
        </div>

        {/* ── STEP 5: Price & Action CTA Button ── */}
        <div
          className={`pt-4 border-t border-[#E8DFCE]/80 flex items-center justify-between transition-all duration-500 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{
            transitionDelay: `${staggerDelay + 180}ms`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div>
            <span className="text-[10px] text-[#8C6D3B] uppercase tracking-wider block">Price</span>
            <span className="text-lg font-bold text-[#4F0809]">{thali.price}</span>
          </div>

          <Link
            href={thali.menuUrl}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#FAF5EB] hover:bg-[#4F0809] text-[#4F0809] hover:text-[#FFF8EB] border border-[#E8DFCE] hover:border-[#4F0809] text-xs font-bold transition-all shadow-sm"
          >
            <span>Order in Menu</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Individual Café Card with Scroll Reveal & Inner Content Cascade */
function CafeFoodCard({
  dish,
  index,
}: {
  dish: CafeItem;
  index: number;
}) {
  const [cardRef, isInView] = useInView({ threshold: 0.05, rootMargin: '0px 0px -15px 0px' });
  const staggerDelay = Math.min(index * 65, 200);

  return (
    <div
      ref={cardRef}
      className={`group relative bg-white rounded-3xl p-5 sm:p-6 border border-[#E8DFCE] shadow-[0_4px_20px_rgba(79,8,9,0.03)] hover:shadow-[0_20px_35px_rgba(79,8,9,0.08)] hover:-translate-y-1.5 transition-all duration-500 flex flex-col justify-between ${
        isInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-7 scale-[0.97]'
      }`}
      style={{
        transitionDelay: `${staggerDelay}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* ── STEP 1: Floating Food Image with Compositor Scroll Rotation ── */}
      <div
        className={`relative w-full aspect-square max-w-[210px] mx-auto mb-5 flex items-center justify-center transition-all duration-500 ${
          isInView ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
        }`}
        style={{
          transitionDelay: `${staggerDelay + 40}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="absolute inset-2 rounded-full bg-gradient-to-b from-[#F9F5EC] to-[#EFE7D8]/60 blur-md group-hover:scale-105 transition-transform duration-500" />

        <div className="relative w-full h-full transform group-hover:scale-105 transition-transform duration-500">
          <div className="relative w-full h-full will-change-transform food-scroll-rotate">
            <Image
              src={dish.image}
              alt={dish.title}
              fill
              className="object-contain drop-shadow-[0_14px_20px_rgba(45,10,12,0.15)]"
            />
          </div>
        </div>

        {/* ── STEP 2: Badge Pop-In ── */}
        <div
          className={`absolute top-0 left-0 bg-[#9C7A45] text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm transition-all duration-400 ${
            isInView ? 'opacity-100 scale-100' : 'opacity-0 scale-85'
          }`}
          style={{
            transitionDelay: `${staggerDelay + 80}ms`,
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {dish.badge}
        </div>
      </div>

      {/* ── STEP 3: Content Details with Staggered Entrance ── */}
      <div className="space-y-3 text-center flex-1 flex flex-col justify-between">
        <div
          className={`transition-all duration-500 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{
            transitionDelay: `${staggerDelay + 110}ms`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <h3
            className="text-lg sm:text-xl font-bold text-[#4F0809] leading-snug group-hover:text-[#9C7A45] transition-colors"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            {dish.title}
          </h3>
          <p className="text-xs text-[#6B533B] font-normal leading-relaxed mt-2 line-clamp-3">
            {dish.desc}
          </p>
        </div>

        {/* ── STEP 4: Feature Highlights ── */}
        <div
          className={`flex flex-wrap items-center justify-center gap-1 pt-1 transition-all duration-500 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
          style={{
            transitionDelay: `${staggerDelay + 150}ms`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {dish.highlights.map((h, i) => (
            <span
              key={i}
              className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-[#FAF5EB] text-[#8C6D3B] border border-[#EBE3D5]"
            >
              {h}
            </span>
          ))}
        </div>

        {/* ── STEP 5: Price & Order Action ── */}
        <div
          className={`pt-3.5 border-t border-[#E8DFCE]/80 flex items-center justify-between transition-all duration-500 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{
            transitionDelay: `${staggerDelay + 180}ms`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div>
            <span className="text-[9px] text-[#8C6D3B] uppercase tracking-wider block">Price</span>
            <span className="text-base font-bold text-[#4F0809]">{dish.price}</span>
          </div>

          <Link
            href={dish.menuUrl}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-[#FAF5EB] hover:bg-[#4F0809] text-[#4F0809] hover:text-[#FFF8EB] border border-[#E8DFCE] hover:border-[#4F0809] text-xs font-semibold transition-all shadow-sm"
          >
            <span>Order</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

type RestaurantSectionId = 'restaurant' | 'thalis' | 'cafe' | 'cafe-favorites';

const RESTAURANT_NAV_ITEMS: Array<{ id: RestaurantSectionId; label: string }> = [
  { id: 'restaurant', label: 'Royal Dining' },
  { id: 'thalis', label: "What's on our Plate" },
  { id: 'cafe', label: 'Jharokha Café' },
  { id: 'cafe-favorites', label: 'Fast Foods & Southern' },
];

export function RestaurantPageClient() {
  const [activeSection, setActiveSection] = useState<RestaurantSectionId>('restaurant');
  const [isStickyStuck, setIsStickyStuck] = useState(false);
  const stickySentinelRef = useRef<HTMLDivElement>(null);

  // ── 1. Smooth Compositor Scroll Rotation + Page Scroll Progress ──
  // Anti-clockwise when scrolling down, clockwise when scrolling up (-0.075 deg per px scrolled)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let targetRot = -window.scrollY * 0.075;
    let currentRot = targetRot;
    let isTicking = false;
    let rafId: number | null = null;

    const updateProgress = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      document.documentElement.style.setProperty(
        '--restaurant-scroll-progress',
        progress.toFixed(3)
      );
    };

    document.documentElement.style.setProperty(
      '--food-scroll-rot',
      `${currentRot.toFixed(2)}deg`
    );
    updateProgress();

    const updateLoop = () => {
      const diff = targetRot - currentRot;

      if (Math.abs(diff) < 0.005) {
        currentRot = targetRot;
        document.documentElement.style.setProperty(
          '--food-scroll-rot',
          `${currentRot.toFixed(2)}deg`
        );
        isTicking = false;
        rafId = null;
        return;
      }

      currentRot += diff * 0.15;
      document.documentElement.style.setProperty(
        '--food-scroll-rot',
        `${currentRot.toFixed(2)}deg`
      );

      rafId = requestAnimationFrame(updateLoop);
    };

    const handleScroll = () => {
      targetRot = -window.scrollY * 0.075;
      updateProgress();
      if (!isTicking) {
        isTicking = true;
        rafId = requestAnimationFrame(updateLoop);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // ── 2. Sticky State Fallback + Scroll-Spy Active Section Tracking ──
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const sentinel = stickySentinelRef.current;
    let sentinelObserver: IntersectionObserver | null = null;
    if (sentinel) {
      sentinelObserver = new IntersectionObserver(
        ([entry]) => {
          setIsStickyStuck(!entry.isIntersecting && entry.boundingClientRect.top < 110);
        },
        { threshold: [0, 1], rootMargin: '-88px 0px 0px 0px' }
      );
      sentinelObserver.observe(sentinel);
    }

    const sectionIds: RestaurantSectionId[] = ['restaurant', 'thalis', 'cafe', 'cafe-favorites'];
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const nextId = visible[0].target.id as RestaurantSectionId;
          if (sectionIds.includes(nextId)) {
            setActiveSection(nextId);
          }
        }
      },
      { threshold: [0.15, 0.4, 0.65], rootMargin: '-22% 0px -38% 0px' }
    );

    sectionIds.forEach((id) => {
      const node = document.getElementById(id);
      if (node) sectionObserver.observe(node);
    });

    return () => {
      sentinelObserver?.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  // Above-the-fold Hero starts visible immediately (no initial blank flash on desktop/mobile)
  const [heroRef, heroInView] = useInView({ initialInView: true });
  const [thalisHeaderRef, thalisHeaderInView] = useInView({ threshold: 0.05 });
  const [cafeHeroRef, cafeHeroInView] = useInView({ threshold: 0.05 });
  const [cafeHeaderRef, cafeHeaderInView] = useInView({ threshold: 0.05 });
  const [featuresRef, featuresInView] = useInView({ threshold: 0.05 });
  const [invitationRef, invitationInView] = useInView({ threshold: 0.05 });

  return (
    <div
      className="relative bg-[#FAF7F2] min-h-screen pt-20 sm:pt-24 pb-32 sm:pb-24 text-[#241F1A] overflow-x-clip"
      style={{ overflowAnchor: 'none' }}
    >
      {/* ── BESPOKE VERTICAL LATA JAALI BORDERS ── */}
      <LataJaaliRunner side="left" opacity={0.12} color="#B08D57" className="hidden xl:block" />
      <LataJaaliRunner side="right" opacity={0.12} color="#B08D57" className="hidden xl:block" />

      {/* ── SUBTLE PALACE CORNER MANDALAS ── */}
      <MandalaOrnament position="top-left" opacity={0.06} color="#B08D57" size="420px" />
      <MandalaOrnament position="top-right" opacity={0.06} color="#B08D57" size="420px" />

      {/* Sentinel marking where the sticky culinary nav bar engages */}
      <div ref={stickySentinelRef} aria-hidden="true" className="h-px w-full pointer-events-none" />

      {/* ── STATE-AWARE STICKY QUICK NAVIGATION PILL BAR ── */}
      <div
        className={`restaurant-sticky-nav-wrapper max-w-5xl mx-auto px-3 sm:px-4 pt-3 pb-2 ${
          isStickyStuck ? 'is-stuck' : ''
        }`}
      >
        <div className="restaurant-sticky-pillbar relative overflow-hidden rounded-full bg-white/85 backdrop-blur-md border border-[#E8DFCE] shadow-[0_4px_20px_rgba(79,8,9,0.05)]">
          <nav
            aria-label="Restaurant sections"
            className="flex items-center md:justify-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar whitespace-nowrap p-1.5 sm:p-2"
          >
            {RESTAURANT_NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={() => setActiveSection(item.id)}
                  className={`inline-flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold tracking-wide shrink-0 transition-all ${
                    isActive
                      ? 'bg-[#4F0809] text-[#FFF8EB] shadow-sm'
                      : 'bg-[#FAF5EB] hover:bg-[#F0E3CC] text-[#4F0809] border border-[#E8DFCE]/70'
                  }`}
                >
                  {item.id === 'restaurant' && (
                    <UtensilsCrossed
                      className={`w-3.5 h-3.5 ${isActive ? 'text-[#D8AA67]' : 'text-[#9C7A45]'}`}
                    />
                  )}
                  {item.id === 'cafe' && (
                    <Coffee
                      className={`w-3.5 h-3.5 ${isActive ? 'text-[#D8AA67]' : 'text-[#9C7A45]'}`}
                    />
                  )}
                  <span>{item.label}</span>
                </a>
              );
            })}
            <RestaurantReservationCTA
              variant="light"
              label="Reserve a Table"
              className="!shrink-0"
            />
          </nav>

          {/* Subtle scroll-progress hairline driven by scroll state */}
          <div
            aria-hidden="true"
            className="h-[2px] w-full origin-left bg-gradient-to-r from-[#D8AA67] via-[#9C7A45] to-[#4F0809]"
            style={{ transform: 'scaleX(var(--restaurant-scroll-progress, 0))' }}
          />
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24 sm:space-y-32 mt-6 sm:mt-10">

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 1: THE ROYAL RESTAURANT HERO
        ═══════════════════════════════════════════════════════════════ */}
        <section id="restaurant" ref={heroRef} className="relative scroll-mt-36">
          {/* Scattered Vegetable / Herb Accents Floating — outside pill column */}
          <div className="absolute -top-6 -left-16 pointer-events-none z-10 animate-float-gentle opacity-80 hidden xl:block">
            <Image
              src="/images/restaurant/veggie-tomatoes.png"
              alt="Fresh Tomatoes"
              width={80}
              height={66}
              className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] rotate-[-12deg]"
            />
          </div>
          <div className="absolute top-1/2 -right-8 pointer-events-none z-10 animate-float-reverse opacity-80 hidden xl:block">
            <Image
              src="/images/restaurant/veggie-peppers.png"
              alt="Fresh Peppers"
              width={85}
              height={70}
              className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] rotate-[18deg]"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Typography & CTAs */}
            <div
              className={`lg:col-span-6 space-y-6 text-center lg:text-left transition-all duration-500 ${
                heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] text-[#9C7A45] text-[11px] font-bold uppercase tracking-[0.2em] shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#D8AA67]" />
                <span>Authentic Rajasthani Heritage Dining</span>
              </div>

              <div className="space-y-2">
                <h1
                  className="text-4xl sm:text-6xl font-bold text-[#4F0809] tracking-tight leading-[1.1]"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  Take a royal taste.
                  <br />
                  <span className="text-[#9C7A45] italic font-normal">Come join us.</span>
                </h1>
                <p
                  className="text-xl sm:text-2xl text-[#6B533B] font-light italic"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  Heritage is so endlessly delicious.
                </p>
              </div>

              {/* Gold Divider */}
              <div className="flex items-center justify-center lg:justify-start gap-2 w-32 mx-auto lg:mx-0">
                <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
                <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]" />
                <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
              </div>

              <p className="text-sm sm:text-base text-[#5A4A3F] font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
                Indulge in time-honored recipes perfected over generations by royal khansama masters. 
                Prepared with slow-churned pure desi ghee, hand-ground desert spices, and served in heirloom brassware under palace archways.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                <RestaurantReservationCTA
                  venue="restaurant"
                  variant="maroon"
                  label="Reserve a Table"
                />

                <Link
                  href="/menu?venue=restaurant"
                  className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-full bg-white hover:bg-[#F5ECDC] text-[#4F0809] border border-[#E8DFCE] text-xs font-bold uppercase tracking-[0.14em] transition-all shadow-sm hover:shadow"
                >
                  <span>Explore Menu</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#9C7A45]" />
                </Link>

                <Link
                  href="/menu?qr=r&table=T-42"
                  className="inline-flex items-center space-x-1.5 px-4 py-3.5 rounded-full bg-[#FAF3E6] hover:bg-[#F2E7D2] text-[#4F0809] text-xs font-semibold tracking-wide transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#9C7A45]" />
                  <span>Dine-In QR</span>
                </Link>
              </div>

              {/* Highlights Strip */}
              <div className="pt-4 border-t border-[#E8DFCE]/80 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-[#6B533B]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D8AA67]" />
                  <span className="font-medium">56-Bhog Tradition</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D8AA67]" />
                  <span className="font-medium">100% Desi Ghee</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D8AA67]" />
                  <span className="font-medium">Evening Live Sitar</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Floating Thali with Compositor Scroll Rotation */}
            <div
              className={`lg:col-span-6 relative flex items-center justify-center transition-all duration-500 ${
                heroInView ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-6'
              }`}
            >
              <div className="absolute w-[320px] sm:w-[460px] h-[320px] sm:h-[460px] rounded-full bg-gradient-to-tr from-[#EFE5D3]/60 via-[#FDFBF7]/80 to-[#FAF5EC]/40 blur-xl pointer-events-none" />

              <div className="relative z-10 w-[290px] sm:w-[440px] h-[290px] sm:h-[440px]">
                <div className="relative w-full h-full will-change-transform food-scroll-rotate">
                  <Image
                    src="/images/restaurant/thali-maharaja-grand.png"
                    alt="Maharaja 56-Bhog Grand Thali"
                    fill
                    priority
                    className="object-contain drop-shadow-[0_25px_35px_rgba(45,10,12,0.18)]"
                  />
                </div>
              </div>

              {/* Floating Chef Recommendation Badge */}
              <div className="absolute bottom-2 left-4 sm:left-8 z-20 bg-white/95 backdrop-blur-md border border-[#E8DFCE] rounded-2xl p-3 sm:p-4 shadow-[0_10px_25px_rgba(79,8,9,0.08)] flex items-center gap-3 max-w-[240px] sm:max-w-[270px]">
                <div className="w-10 h-10 rounded-full bg-[#FAF5EB] flex items-center justify-center shrink-0 border border-[#D8AA67]/40">
                  <Star className="w-5 h-5 text-[#9C7A45] fill-[#D8AA67]/40" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C7A45] block">
                    Chef&apos;s Crown Jewel
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[#4F0809] leading-snug">
                    Maharaja 56-Bhog Thali
                  </p>
                  <span className="text-xs font-bold text-[#9C7A45]">₹1,499</span>
                </div>
              </div>

              {/* Decorative Corner Vegetables */}
              <div className="absolute -bottom-6 right-2 sm:right-6 pointer-events-none z-20 animate-float-gentle opacity-85">
                <Image
                  src="/images/restaurant/veggie-peppers.png"
                  alt="Bell Peppers"
                  width={80}
                  height={65}
                  className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.1)] rotate-[-8deg]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 2: "WHAT'S ON OUR PLATE" - 3 THALIS SHOWCASE
        ═══════════════════════════════════════════════════════════════ */}
        <section id="thalis" className="space-y-12 scroll-mt-36">
          <div
            ref={thalisHeaderRef}
            className={`relative text-center max-w-2xl mx-auto space-y-3 transition-all duration-500 ${
              thalisHeaderInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <div className="absolute -left-24 top-0 pointer-events-none animate-float-reverse opacity-75 hidden xl:block">
              <Image
                src="/images/restaurant/veggie-carrots.png"
                alt="Carrot Garnish"
                width={85}
                height={60}
                className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.1)] rotate-[-15deg]"
              />
            </div>
            <div className="absolute -right-24 top-0 pointer-events-none animate-float-gentle opacity-75 hidden xl:block">
              <Image
                src="/images/restaurant/veggie-tomatoes.png"
                alt="Tomato Garnish"
                width={80}
                height={65}
                className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.1)] rotate-[15deg]"
              />
            </div>

            <span className="text-[10px] sm:text-xs font-bold tracking-[0.24em] uppercase text-[#9C7A45] block">
              ✦ What&apos;s on our Plate ✦
            </span>
            <h2
              className="text-3xl sm:text-5xl font-bold text-[#4F0809] tracking-tight"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              Imperial Thalis &amp; Heritage Feasts
            </h2>
            <p className="text-xs sm:text-sm text-[#6B533B] font-light max-w-lg mx-auto">
              Please serve yourself without hesitation — curated master thalis crafted to immerse you in Rajasthan&apos;s royal dining heritage.
            </p>

            {/* Diamond Rule */}
            <div className="flex items-center justify-center gap-2 w-36 mx-auto pt-1">
              <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
              <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]" />
              <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-6 lg:gap-8 items-stretch">
            {THALIS.map((thali, idx) => (
              <ThaliFoodCard
                key={thali.id}
                thali={thali}
                index={idx}
              />
            ))}
          </div>
        </section>

        {/* ── HERITAGE DIVIDER WITH FLOURISH ── */}
        <div className="py-2">
          <HeritageDivider className="opacity-35" color="#B08D57" />
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 3: JHAROKHA CAFÉ & LOUNGE HERO
        ═══════════════════════════════════════════════════════════════ */}
        <section id="cafe" ref={cafeHeroRef} className="relative scroll-mt-36">
          <div className="absolute -top-6 -left-16 pointer-events-none z-10 animate-float-gentle opacity-80 hidden xl:block">
            <Image
              src="/images/restaurant/veggie-carrots.png"
              alt="Carrots Garnish"
              width={85}
              height={65}
              className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] rotate-[14deg]"
            />
          </div>
          <div className="absolute bottom-4 -right-6 pointer-events-none z-10 animate-float-reverse opacity-80 hidden xl:block">
            <Image
              src="/images/restaurant/veggie-peppers.png"
              alt="Peppers Garnish"
              width={90}
              height={70}
              className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)] rotate-[-12deg]"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Typography & CTAs for Café */}
            <div
              className={`lg:col-span-6 space-y-6 text-center lg:text-left order-2 lg:order-1 transition-all duration-500 ${
                cafeHeroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] text-[#9C7A45] text-[11px] font-bold uppercase tracking-[0.2em] shadow-sm">
                <Coffee className="w-3.5 h-3.5 text-[#9C7A45]" />
                <span>Jharokha Courtyard Café &amp; Lounge</span>
              </div>

              <div className="space-y-2">
                <h2
                  className="text-4xl sm:text-6xl font-bold text-[#4F0809] tracking-tight leading-[1.1]"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  Sun-drenched sips
                  <br />
                  <span className="text-[#9C7A45] italic font-normal">&amp; artisan quick bites.</span>
                </h2>
                <p
                  className="text-xl sm:text-2xl text-[#6B533B] font-light italic"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  Relax in the marble palace courtyard.
                </p>
              </div>

              {/* Gold Divider */}
              <div className="flex items-center justify-center lg:justify-start gap-2 w-32 mx-auto lg:mx-0">
                <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
                <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]" />
                <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
              </div>

              <p className="text-sm sm:text-base text-[#5A4A3F] font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
                Escape to our airy courtyard for single-origin cold brews, stone-baked herb pizzas, 
                juicy gourmet brioche burgers, and crispy South Indian masala dosas accompanied by coconut &amp; tomato chutneys.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
                <RestaurantReservationCTA
                  venue="cafe"
                  variant="maroon"
                  label="Reserve Café Table"
                />

                <Link
                  href="/menu?venue=cafe"
                  className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-full bg-white hover:bg-[#F5ECDC] text-[#4F0809] border border-[#E8DFCE] text-xs font-bold uppercase tracking-[0.14em] transition-all shadow-sm hover:shadow"
                >
                  <span>Explore Café Menu</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#9C7A45]" />
                </Link>

                <div className="inline-flex items-center space-x-2 px-4 py-3.5 rounded-full bg-[#FAF5EB] text-[#6B533B] text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[#9C7A45]" />
                  <span>8:00 AM – 11:00 PM</span>
                </div>
              </div>

              {/* Features Tag Strip */}
              <div className="pt-4 border-t border-[#E8DFCE]/80 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-[#6B533B]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9C7A45]" />
                  <span className="font-medium">Single-Origin Araku Brews</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9C7A45]" />
                  <span className="font-medium">Crispy South Indian Dosas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9C7A45]" />
                  <span className="font-medium">High-Speed Wi-Fi &amp; Workspaces</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Floating Café Dish with Compositor Scroll Rotation */}
            <div
              className={`lg:col-span-6 relative flex items-center justify-center order-1 lg:order-2 transition-all duration-500 ${
                cafeHeroInView ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-6'
              }`}
            >
              <div className="absolute w-[320px] sm:w-[460px] h-[320px] sm:h-[460px] rounded-full bg-gradient-to-tr from-[#FAF5EC]/70 via-[#FDFBF7]/90 to-[#EFE5D3]/50 blur-xl pointer-events-none" />

              <div className="relative z-10 w-[290px] sm:w-[440px] h-[250px] sm:h-[360px]">
                <div className="relative w-full h-full will-change-transform food-scroll-rotate">
                  <Image
                    src="/images/restaurant/cafe-south-indian-feast.png"
                    alt="Mysore Masala Dosa Feast"
                    fill
                    className="object-contain drop-shadow-[0_25px_35px_rgba(45,10,12,0.16)]"
                  />
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute bottom-2 right-4 sm:right-8 z-20 bg-white/95 backdrop-blur-md border border-[#E8DFCE] rounded-2xl p-3 sm:p-4 shadow-[0_10px_25px_rgba(79,8,9,0.08)] flex items-center gap-3 max-w-[240px] sm:max-w-[270px]">
                <div className="w-10 h-10 rounded-full bg-[#FAF5EB] flex items-center justify-center shrink-0 border border-[#D8AA67]/40">
                  <Coffee className="w-5 h-5 text-[#9C7A45]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C7A45] block">
                    Courtyard Special
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[#4F0809] leading-snug">
                    Crispy Mysore Dosa Feast
                  </p>
                  <span className="text-xs font-bold text-[#9C7A45]">₹320</span>
                </div>
              </div>

              {/* Tomato Garnish */}
              <div className="absolute -top-4 right-6 pointer-events-none z-20 animate-float-gentle opacity-85 hidden sm:block">
                <Image
                  src="/images/restaurant/veggie-tomatoes.png"
                  alt="Fresh Tomatoes"
                  width={75}
                  height={60}
                  className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.1)] rotate-[-10deg]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 4: CAFÉ FAVORITES SHOWCASE
        ═══════════════════════════════════════════════════════════════ */}
        <section id="cafe-favorites" className="space-y-12 scroll-mt-36">
          <div
            ref={cafeHeaderRef}
            className={`relative text-center max-w-2xl mx-auto space-y-3 transition-all duration-500 ${
              cafeHeaderInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <div className="absolute -left-24 top-0 pointer-events-none animate-float-reverse opacity-75 hidden xl:block">
              <Image
                src="/images/restaurant/veggie-tomatoes.png"
                alt="Fresh Tomatoes Garnish"
                width={80}
                height={65}
                className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.1)] rotate-[12deg]"
              />
            </div>
            <div className="absolute -right-24 top-0 pointer-events-none animate-float-gentle opacity-75 hidden xl:block">
              <Image
                src="/images/restaurant/veggie-peppers.png"
                alt="Peppers Garnish"
                width={80}
                height={65}
                className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.1)] rotate-[-15deg]"
              />
            </div>

            <span className="text-[10px] sm:text-xs font-bold tracking-[0.24em] uppercase text-[#9C7A45] block">
              ✦ What&apos;s in our Courtyard Café ✦
            </span>
            <h2
              className="text-3xl sm:text-5xl font-bold text-[#4F0809] tracking-tight"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              Fast Foods, Southern Flavors &amp; Artisan Sips
            </h2>
            <p className="text-xs sm:text-sm text-[#6B533B] font-light max-w-lg mx-auto">
              Wood-fired stone oven pizzas, gourmet butter brioche burgers, crispy dosa feasts, and 18-hour cold steeped coffees.
            </p>

            {/* Diamond Rule */}
            <div className="flex items-center justify-center gap-2 w-36 mx-auto pt-1">
              <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
              <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]" />
              <span className="h-[1px] flex-1 bg-[#D8AA67]/60" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {CAFE_FAVORITES.map((dish, idx) => (
              <CafeFoodCard
                key={dish.id}
                dish={dish}
                index={idx}
              />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            SECTION 5: DINING EXPERIENCES & HOSPITALITY AMENITIES
        ═══════════════════════════════════════════════════════════════ */}
        <section ref={featuresRef} className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {DINING_FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              const delay = `${Math.min(idx * 70, 210)}ms`;

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl p-6 border border-[#E8DFCE] shadow-[0_4px_16px_rgba(79,8,9,0.03)] hover:shadow-[0_10px_25px_rgba(79,8,9,0.06)] hover:-translate-y-1 transition-all duration-500 flex flex-col items-center text-center group ${
                    featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}
                  style={{
                    transitionDelay: featuresInView ? delay : '0ms',
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-[#FAF5EB] border border-[#E8DFCE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-[#9C7A45]" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-[#4F0809] mb-1.5">
                    {feat.label}
                  </h4>
                  <p className="text-xs text-[#6B533B] leading-relaxed font-normal">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── LIGHT MINIMAL ROYAL INVITATION BANNER ── */}
          <div
            ref={invitationRef}
            className={`relative bg-gradient-to-r from-[#FAF5EB] via-white to-[#FAF5EB] rounded-3xl border border-[#E8DFCE] p-8 sm:p-12 text-center shadow-[0_8px_30px_rgba(79,8,9,0.04)] overflow-hidden transition-all duration-500 ${
              invitationInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.24em] uppercase text-[#9C7A45] block">
                ✦ An Unforgettable Royal Affair ✦
              </span>
              <h3
                className="text-3xl sm:text-4xl font-bold text-[#4F0809]"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                Reserve Your Table at Rajmahal
              </h3>
              <p className="text-xs sm:text-sm text-[#5A4A3F] leading-relaxed">
                Whether dining inside the regal AC banquet hall, under the starlit open courtyard with live sitar music, or in a sunlit jharokha alcove — we look forward to welcoming you with traditional royal warmth.
              </p>

              <div className="pt-3 flex flex-wrap items-center justify-center gap-3.5">
                <RestaurantReservationCTA
                  venue="restaurant"
                  variant="maroon"
                  label="Reserve a Dining Table"
                />

                <RestaurantReservationCTA
                  venue="cafe"
                  variant="light"
                  label="Reserve Café Table"
                  className="!px-6 !py-3.5 !bg-white hover:!bg-[#F5ECDC]"
                />

                <Link
                  href="/menu?qr=r&table=T-42"
                  className="inline-flex items-center space-x-1.5 px-5 py-3.5 rounded-full bg-[#FAF5EB] hover:bg-[#F2E7D2] text-[#4F0809] text-xs font-semibold tracking-wide transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#9C7A45]" />
                  <span>Dine-In QR Scan</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
