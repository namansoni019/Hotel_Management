'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { BookingBar } from '@/components/home/booking-bar';

export function HeroSection() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const maxDistanceRef = useRef<number>(380);

  useEffect(() => {
    const calculateMetrics = () => {
      setIsMobile(window.innerWidth < 768);
      if (trackRef.current) {
        const scrollDistance = trackRef.current.offsetHeight - window.innerHeight;
        maxDistanceRef.current = scrollDistance > 50 ? scrollDistance : 380;
      }
    };

    calculateMetrics();
    window.addEventListener('resize', calculateMetrics, { passive: true });

    const updateScrollProgress = () => {
      if (!trackRef.current) {
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const progress = Math.min(1, Math.max(0, scrollY / 380));
        setScrollProgress(progress);
        return;
      }

      // Read only rect.top on frame tick (metrics are cached on resize, eliminating layout reflow)
      const rect = trackRef.current.getBoundingClientRect();
      const scrolled = -rect.top;
      const progress = Math.min(1, Math.max(0, scrolled / maxDistanceRef.current));
      setScrollProgress(progress);
    };

    const handleScroll = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(() => {
        updateScrollProgress();
        rafIdRef.current = null;
      });
    };

    // Initial update
    updateScrollProgress();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', calculateMetrics);
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // Compute dynamic insets & radius based on scrollProgress
  // At scrollProgress = 0: Full Screen Edge-to-Edge (0 insets, 0 radius, 0 border, 0 shadow)
  // At scrollProgress = 1: Framed Card (padded insets, rounded corners, gold border, luxury shadow)
  const insetX = scrollProgress * (isMobile ? 16 : 6); // px
  const insetTop = scrollProgress * (isMobile ? 16 : 10); // px
  const insetBottom = scrollProgress * (isMobile ? 115 : 10); // px
  const borderRadius = scrollProgress * (isMobile ? 35 : 40); // px
  const borderOpacity = scrollProgress * 0.45;
  const shadowOpacity = scrollProgress * 0.28;

  // Text content subtle upward parallax & fade
  const textTranslateY = scrollProgress * -25;
  const textOpacity = 1 - scrollProgress * 0.2;

  return (
    // ── Outer Sticky Scroll Runway Track ──
    // Height provides the scroll runway (100dvh + 380px) over which the sticky hero shrinks in-place
    <section
      ref={trackRef}
      className="relative z-20 w-full h-[calc(100vh+380px)] sm:h-[calc(100dvh+400px)] mt-0"
    >
      {/* ── Sticky Full-Screen Viewport Container (Locks to top: 0 while scrolling) ── */}
      <div className="sticky top-0 left-0 right-[0] w-full h-screen sm:h-[100dvh] min-h-[520px] sm:min-h-[640px] flex flex-col justify-between overflow-visible">
        {/* ── Scroll-Aware Background Image Frame (Sticks & Shrinks in Viewport) ── */}
        <div
          className="absolute z-0 overflow-hidden will-change-[top,left,right,bottom,border-radius]"
          style={{
            top: `${insetTop}px`,
            left: `${insetX}px`,
            right: `${insetX}px`,
            bottom: `${insetBottom}px`,
            borderRadius: `${borderRadius}px`,
            borderColor: `rgba(216, 170, 103, ${borderOpacity})`,
            transform: 'translateZ(0)',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
            WebkitMaskImage: '-webkit-radial-gradient(white, black)',
            transition:
              'top 0.1s cubic-bezier(0.25, 1, 0.5, 1), left 0.1s cubic-bezier(0.25, 1, 0.5, 1), right 0.1s cubic-bezier(0.25, 1, 0.5, 1), bottom 0.1s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.1s cubic-bezier(0.25, 1, 0.5, 1), border-color 0.1s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          <Image
            src="/images/palace-interior.jpg"
            alt="Rajmahal Heritage Hotel Grand Palace Courtyard and Lakeview"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center will-change-transform"
            style={{
              transform: isMobile
                ? `scale(${1.28 - scrollProgress * 0.25}) translateZ(0)`
                : `scale(${1.08 - scrollProgress * 0.25}) translateZ(0)`,
              borderRadius: `${borderRadius}px`,
              filter: 'saturate(0.8) sepia(0.08)',
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              transition:
                'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.1s cubic-bezier(0.25, 1, 0.5, 1)',
            }}
          />

          {/* Hero Warmth overlay */}
        </div>

        {/* ── Hero Content (Typography & Luxury Badges) ── */}
        <div
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-36 sm:pt-32 md:pt-40 pb-2 sm:pb-4 w-full will-change-transform"
          style={{
            transform: `translateY(${textTranslateY}px)`,
            opacity: textOpacity,
          }}
        >
          <div className="max-w-2xl mx-auto sm:mx-0 text-center sm:text-left flex flex-col items-center sm:items-start">
            {/* 1. Majestic Title */}
            <h1
              className="text-5xl min-[400px]:text-7xl sm:text-8xl md:text-7xl lg:text-[96px] font-semibold tracking-tight text-[#FFF8EB] mb-2 sm:mb-4 mt-2 sm:mt-6 leading-[0.94] drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)]"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              Rooted in{' '}
              <span className="italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#F7E5C3] via-[#E1B46F] to-[#C99A52]">
                Rajasthan
              </span>
            </h1>

            {/* 3. Refined Palace Description */}
            <p className="text-2sm sm:text-sm lg:text-base text-[#FFF8EB]/95 mb-2.5 sm:mb-5 font-light leading-relaxed max-w-xl mx-auto sm:mx-0 drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
              Where four centuries of regal Rajputana grandeur embrace Lake Pichola&apos;s serene waters. Six restored imperial suites, candlelit dining courtyards, and timeless palace hospitality.
            </p>

            {/* 4. Luxury Micro-Badges / Trust Affordances */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F0809] backdrop-blur-lg text-[13px] min-[400px]:text-xs font-medium text-[#FFF8EB] shadow-xs">
                6 Imperial Suites
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F0809] backdrop-blur-lg text-[13px] min-[400px]:text-xs font-medium text-[#FFF8EB] shadow-xs">
                Lake Pichola Vistas
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F0809] backdrop-blur-lg text-[13px] min-[400px]:text-xs font-medium text-[#FFF8EB] shadow-xs">
                Aristocratic Dining
              </span>
            </div>
          </div>
        </div>

        {/* ── 5. Overlapping Floating Booking Widget (Maintains complete operability) ── */}
        <div className="relative z-30 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full pb-28 sm:pb-6">
          <BookingBar />
        </div>
      </div>
    </section>
  );
}
