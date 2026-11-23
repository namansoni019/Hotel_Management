'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconPalaceCrest } from '@/components/ui/heritage-art';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Sparkles, Compass } from 'lucide-react';

export const Footer: React.FC = () => {
  const pathname = usePathname();

  // Only display footer on the homepage
  if (pathname !== '/') {
    return null;
  }

  return (
<footer
      className="relative min-h-[100dvh] sm:pt-15 flex flex-col justify-between rounded-t-0xl sm:rounded-t-[0px] bg-[#3B0507] text-[#FDF8EE] mt-auto overflow-hidden selection:bg-[#FDF8EE] selection:text-[#3B0507]"
    >
      {/* Background Subtle Floral Ornaments */}
      <div className="absolute top-0 left-0 w-40 sm:w-64 opacity-10 pointer-events-none select-none z-0">
        <img src="/images/ornaments/floral-left.png" alt="" aria-hidden="true" className="w-full h-auto" />
      </div>
      <div className="absolute top-0 right-0 w-40 sm:w-64 opacity-10 pointer-events-none select-none z-0">
        <img src="/images/ornaments/floral-right.png" alt="" aria-hidden="true" className="w-full h-auto" />
      </div>

      {/* ── 1. TOP & MIDDLE: CORE CONTENT GRID ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-8">
          {/* Mobile-Only: Connect With The Palace (Shown Above Explore on Mobile) */}
          <div className="md:hidden space-y-3">
            <h5 className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#FDF8EE] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rotate-45 bg-[#FDF8EE]" />
              <span>Connect With The Palace</span>
            </h5>
            <div className="flex items-center space-x-2.5">
              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-[#4F0809] flex items-center justify-center text-[#FDF8EE] hover:bg-[#FDF8EE] hover:text-[#3B0507] transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-[#4F0809] flex items-center justify-center text-[#FDF8EE] hover:bg-[#FDF8EE] hover:text-[#3B0507] transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/919829012345"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-9 h-9 rounded-full bg-[#4F0809] flex items-center justify-center text-[#FDF8EE] hover:bg-[#25D366] hover:text-white transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 3.67C14.24 3.67 16.31 4.53 17.87 6.09C19.42 7.64 20.28 9.71 20.28 11.91C20.28 16.46 16.58 20.16 12.04 20.16C10.61 20.16 9.22 19.79 8 19.07L7.71 18.9L4.59 19.72L5.42 16.68L5.23 16.37C4.43 15.1 4.01 13.53 4.01 11.92C4.01 7.37 7.71 3.67 12.04 3.67ZM8.94 7.33C8.76 7.33 8.47 7.4 8.23 7.66C7.99 7.92 7.31 8.56 7.31 9.86C7.31 11.16 8.26 12.41 8.39 12.59C8.52 12.76 10.25 15.43 12.9 16.57C13.53 16.84 14.02 17 14.41 17.12C15.04 17.32 15.62 17.29 16.07 17.23C16.58 17.15 17.63 16.59 17.85 15.97C18.07 15.36 18.07 14.83 18.01 14.73C17.94 14.62 17.77 14.56 17.5 14.43C17.24 14.3 15.95 13.66 15.71 13.57C15.47 13.49 15.3 13.44 15.12 13.7C14.95 13.97 14.44 14.56 14.29 14.73C14.14 14.91 13.99 14.93 13.72 14.8C13.46 14.67 12.61 14.39 11.61 13.5C10.83 12.8 10.3 11.94 10.15 11.68C10 11.41 10.13 11.27 10.27 11.14C10.39 11.02 10.53 10.83 10.66 10.68C10.79 10.53 10.84 10.42 10.92 10.25C11.01 10.07 10.97 9.92 10.9 9.79C10.84 9.66 10.25 8.23 10.03 7.71C9.82 7.2 9.6 7.27 9.44 7.26C9.29 7.26 9.11 7.33 8.94 7.33Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 1: Explore The Palace Links */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#FDF8EE] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rotate-45 bg-[#FDF8EE]" />
              <span>Explore</span>
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-[13px] text-[#FDF8EE]/85">
              <li>
                <Link href="/rooms" className="hover:text-[#FDF8EE] hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                  <span className="text-[#FDF8EE]/60">&rsaquo;</span>
                  <span>Heritage Chambers</span>
                </Link>
              </li>
              <li>
                <Link href="/restaurant" className="hover:text-[#FDF8EE] hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                  <span className="text-[#FDF8EE]/60">&rsaquo;</span>
                  <span>Restaurant &amp; Dining</span>
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-[#FDF8EE] hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                  <span className="text-[#FDF8EE]/60">&rsaquo;</span>
                  <span>Palace Menu &amp; Order</span>
                </Link>
              </li>
              <li>
                <Link href="/hotel" className="hover:text-[#FDF8EE] hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                  <span className="text-[#FDF8EE]/60">&rsaquo;</span>
                  <span>Weddings &amp; Banquets</span>
                </Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-[#FDF8EE] hover:translate-x-1 inline-flex items-center gap-1.5 transition-all">
                  <span className="text-[#FDF8EE]/60">&rsaquo;</span>
                  <span>Reserve Direct</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Contact & Address + Connect With The Palace (Desktop) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#FDF8EE] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rotate-45 bg-[#FDF8EE]" />
                <span>Concierge</span>
              </h4>
              <ul className="space-y-3 text-xs sm:text-[13px] text-[#FDF8EE]/85">
                <li className="flex items-start">
                  <MapPin className="w-4 h-4 text-[#FDF8EE] mr-2.5 mt-0.5 shrink-0" />
                  <span className="leading-snug">Lake Palace Road, Pichola, Udaipur, Rajasthan 313001</span>
                </li>
                <li className="flex items-center">
                  <Phone className="w-4 h-4 text-[#FDF8EE] mr-2.5 shrink-0" />
                  <span>+91 98765 43210</span>
                </li>
                <li className="flex items-center">
                  <Mail className="w-4 h-4 text-[#FDF8EE] mr-2.5 shrink-0" />
                  <span>info@rajmahalhotel.in</span>
                </li>
                <li className="flex items-center">
                  <Clock className="w-4 h-4 text-[#FDF8EE] mr-2.5 shrink-0" />
                  <span>Desk: 24&times;7 &bull; Dining: 12:30 PM &ndash; 11 PM</span>
                </li>
              </ul>
            </div>

            {/* Desktop-Only: Connect With The Palace Below Concierge */}
            <div className="hidden md:block pt-1">
              <h5 className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#FDF8EE]/75 mb-3">
                Connect With The Palace
              </h5>
              <div className="flex items-center space-x-2.5">
                {/* Instagram */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 rounded-full bg-[#4F0809] flex items-center justify-center text-[#FDF8EE] hover:bg-[#FDF8EE] hover:text-[#3B0507] transition-colors duration-200 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>

                {/* Facebook */}
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 rounded-full bg-[#4F0809] flex items-center justify-center text-[#FDF8EE] hover:bg-[#FDF8EE] hover:text-[#3B0507] transition-colors duration-200 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/919829012345"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-9 h-9 rounded-full bg-[#4F0809] flex items-center justify-center text-[#FDF8EE] hover:bg-[#25D366] hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 3.67C14.24 3.67 16.31 4.53 17.87 6.09C19.42 7.64 20.28 9.71 20.28 11.91C20.28 16.46 16.58 20.16 12.04 20.16C10.61 20.16 9.22 19.79 8 19.07L7.71 18.9L4.59 19.72L5.42 16.68L5.23 16.37C4.43 15.1 4.01 13.53 4.01 11.92C4.01 7.37 7.71 3.67 12.04 3.67ZM8.94 7.33C8.76 7.33 8.47 7.4 8.23 7.66C7.99 7.92 7.31 8.56 7.31 9.86C7.31 11.16 8.26 12.41 8.39 12.59C8.52 12.76 10.25 15.43 12.9 16.57C13.53 16.84 14.02 17 14.41 17.12C15.04 17.32 15.62 17.29 16.07 17.23C16.58 17.15 17.63 16.59 17.85 15.97C18.07 15.36 18.07 14.83 18.01 14.73C17.94 14.62 17.77 14.56 17.5 14.43C17.24 14.3 15.95 13.66 15.71 13.57C15.47 13.49 15.3 13.44 15.12 13.7C14.95 13.97 14.44 14.56 14.29 14.73C14.14 14.91 13.99 14.93 13.72 14.8C13.46 14.67 12.61 14.39 11.61 13.5C10.83 12.8 10.3 11.94 10.15 11.68C10 11.41 10.13 11.27 10.27 11.14C10.39 11.02 10.53 10.83 10.66 10.68C10.79 10.53 10.84 10.42 10.92 10.25C11.01 10.07 10.97 9.92 10.9 9.79C10.84 9.66 10.25 8.23 10.03 7.71C9.82 7.2 9.6 7.27 9.44 7.26C9.29 7.26 9.11 7.33 8.94 7.33Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Column 3: Google Maps Location */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#FDF8EE] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rotate-45 bg-[#FDF8EE]" />
                <span>Palace Location</span>
              </h4>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Lake+Palace+Road,+Pichola,+Udaipur,+Rajasthan+313001"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold uppercase tracking-wider text-[#FDF8EE]/80 hover:text-[#FDF8EE] flex items-center gap-0.5 transition-colors"
              >
                <span>Full Map</span>
                <span>&nearr;</span>
              </a>
            </div>

            <div className="relative rounded-t-2xl rounded-b-xl overflow-hidden h-[170px] sm:h-[195px] w-full bg-[#4F0809]">
              <iframe
                title="Rajmahal Heritage Hotel Location"
                src="https://maps.google.com/maps?q=Lake+Palace+Road,+Pichola,+Udaipur,+Rajasthan+313001&t=&z=14&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'contrast(1.05) saturate(1.1)' }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />
            </div>

            <p className="text-[11px] text-[#FDF8EE]/80 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#FDF8EE] shrink-0" />
              <span>24.5764&deg; N, 73.6835&deg; E &bull; Waterfront Pichola</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. LOWER FOOTER BAND: METADATA ROW ABOVE WATERMARK ── */}
{/* ── 2. LOWER FOOTER BAND: CENTERED METADATA ROW ABOVE WATERMARK ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-28 sm:pb-42 lg:pb-64">
        <div className="flex flex-col lg:flex-row lg:flex-wrap items-center justify-center text-center gap-y-2.5 lg:gap-x-4 text-xs text-[#FDF8EE]">
          <div className="flex items-center justify-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#FDF8EE] shrink-0" />
            <span>Preserved Living Heritage &bull; Udaipur, Rajasthan</span>
          </div>

          <span className="hidden lg:inline text-[#FDF8EE]/40">|</span>

          <p className="text-xs text-[#FDF8EE]/75 font-light">
            &copy; {new Date().getFullYear()} Rajmahal Heritage Hotel. All rights reserved.
          </p>

          <span className="hidden lg:inline text-[#FDF8EE]/40">|</span>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[#FDF8EE]/85">
            <Link href="/privacy" className="hover:text-[#FDF8EE] transition-colors">
              Privacy Charter
            </Link>
            <span className="text-[#FDF8EE]/50">&#9830;</span>
            <Link href="/terms" className="hover:text-[#FDF8EE] transition-colors">
              Terms &amp; Tariffs
            </Link>
            <span className="text-[#FDF8EE]/50">&#9830;</span>
            <span>Mewar Sanctuary</span>
          </div>
        </div>
      </div>

      {/* ── 3. ABSOLUTE BOTTOM-RIGHT MONUMENTAL "RAJMAHAL" WORDMARK ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute bottom-[-25] right-[-30px] z-0 flex flex-col items-end leading-none"
      >
        <div className="mb-2 pr-8 sm:pr-10">
          <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-[#4F0809] text-[9px] sm:text-[10px] font-semibold tracking-[0.24em] uppercase text-[#FDF8EE]">
            <span className="w-1.5 h-1.5 rotate-45 bg-[#FDF8EE]" />
            <span>Mewar Royalty &bull; Estd 1842</span>
          </span>
        </div>

        <span
          role="presentation"
          className="block text-[54px] min-[380px]:text-[78px] sm:text-[116px] md:text-[184px] lg:text-[192px] xl:text-[226px] font-bold uppercase tracking-[0.04em] leading-[0.75] text-right text-[#FDF8EE]/12"
          style={{
            fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
          }}
        >
          RAJMAHAL
        </span>
      </div>
    </footer>
  );
};
