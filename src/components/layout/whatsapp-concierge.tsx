'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Sparkles } from 'lucide-react';

const CONCIERGE_PHONE = '919829012345'; // Rajmahal Palace Front Desk & Concierge WhatsApp

export const WhatsAppConcierge: React.FC = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isStuckToFooter, setIsStuckToFooter] = useState<boolean>(false);

  // Dynamic boundary tracking: stops floating when reaching the footer and docks at the start of the footer
  useEffect(() => {
    let rafId: number | null = null;

    const updatePosition = () => {
      const footer = document.querySelector('footer');

      if (!footer) {
        setIsStuckToFooter(false);
        return;
      }

      const footerRect = footer.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // When the top of the footer reaches or enters the viewport:
      // Sticky positioning ends, and the button docks right at the start of the footer
      setIsStuckToFooter(footerRect.top <= viewportHeight);
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updatePosition();
        rafId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    updatePosition();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  // Hide on staff dashboard and dedicated auth screens
  if (
    pathname.startsWith('/dashboard') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth')
  ) {
    return null;
  }

  const getContextualMessage = (): string => {
    if (pathname.startsWith('/rooms/')) {
      return 'Namaste! I am currently viewing room suites at Rajmahal and would like to check availability and direct booking packages.';
    }
    if (pathname === '/rooms') {
      return 'Namaste! I am exploring heritage chambers at Rajmahal Heritage Hotel and would like assistance choosing a room.';
    }
    if (pathname === '/book') {
      return 'Namaste! I am booking a stay at Rajmahal and have a quick question regarding check-in timings and payment options.';
    }
    if (pathname === '/hotel') {
      return 'Namaste! I would like to inquire about hosting a royal wedding/celebration banquet at Rajmahal Palace Hall.';
    }
    if (pathname === '/restaurant' || pathname === '/menu') {
      return 'Namaste! I would like to reserve a table / ask about today’s traditional Rajasthani thali and Jharokha Café menu.';
    }
    return 'Namaste! I am planning a visit to Rajmahal Heritage Hotel, Udaipur and would like royal concierge assistance.';
  };

  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(getContextualMessage());
    const url = `https://wa.me/${CONCIERGE_PHONE}?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
<div
      className={`${
        isStuckToFooter
          ? 'absolute bottom-[calc(100%+84px)] md:bottom-[calc(100%+28px)]'
          : 'fixed bottom-[84px] md:bottom-7'
      } right-4 sm:right-7 z-40 flex flex-col items-end`}
    >
      {/* Expanded Royal Concierge Card */}
      {isOpen && (
<div className="mb-3 w-[calc(100vw-2rem)] max-w-[310px] sm:w-80 rounded-t-3xl rounded-b-2xl bg-[#FDF8EE] border border-[#C99A52]/80 overflow-hidden text-[#4F0809] animate-fade-in-up">
          {/* Header Banner (Unified Background) */}
          <div className="px-4 py-3.5 flex items-center justify-between border-b border-[#C99A52]/30">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-full bg-[#25D366]/15 border border-[#25D366]/40 flex items-center justify-center text-[#15803D] shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4
                  className="font-bold text-base text-[#4F0809] leading-tight tracking-wide"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  Royal Concierge Desk
                </h4>
                <p className="text-[10px] text-[#15803D] font-semibold tracking-wider uppercase flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                  Palace Steward &bull; Online
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full bg-[#4F0809]/10 hover:bg-[#4F0809]/15 text-[#4F0809] transition-colors cursor-pointer"
              aria-label="Close concierge preview"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card Body */}
          <div className="p-4">
            <div className="mb-3.5">
              <p
                className="text-base font-bold text-[#4F0809] mb-1"
                style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
              >
                Padharo Mhare Desh
              </p>

              {/* Ornamental Gold Divider */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="h-[1px] w-6 bg-[#C99A52]" />
                <span className="w-1.5 h-1.5 rotate-45 border border-[#C99A52] bg-[#D8AA67]/40" />
                <span className="h-[1px] flex-1 bg-[#C99A52]/30" />
              </div>

              <p className="text-xs text-[#6B533B] leading-relaxed font-normal">
                Direct assistance with imperial suite reservations, lakeside dining, royal banquets, or Udaipur heritage excursions.
              </p>
            </div>

            {/* WhatsApp Action Pill */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full py-2.5 px-4 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs uppercase tracking-[0.12em] flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white text-white" />
              <span>Chat on WhatsApp</span>
            </button>
          </div>
        </div>
      )}

{/* Floating Light WhatsApp Concierge Capsule Button with Hover Text Reveal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center p-2.5 sm:p-2 rounded-full bg-[#25D366] hover:bg-[#E2F6E9] text-[#14532D] active:scale-95 transition-all duration-300 cursor-pointer"
        aria-label="Chat on WhatsApp"
      >
        <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
          <MessageCircle className="w-5.5 h-5.5 text-white fill-white" />
        </div>

        {/* Smooth Hover Reveal Text */}
        <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[160px] group-hover:opacity-100 group-hover:ml-2.5 group-hover:pr-1 whitespace-nowrap font-bold text-xs uppercase tracking-[0.12em] text-[#14532D] transition-all duration-300 ease-out">
          Chat on WhatsApp
        </span>

        {/* Static Online Status Dot */}
        <span className="!ml-0 absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#25D366] border-2 border-white rounded-full" />
      </button>
    </div>
  );
};
