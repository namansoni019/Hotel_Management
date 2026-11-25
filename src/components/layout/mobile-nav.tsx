'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BedDouble, Utensils, Coffee, User } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const [isStuckToFooter, setIsStuckToFooter] = useState<boolean>(false);

  // Dynamic boundary tracking: ends sticky behavior at footer boundary and docks at the start of the footer
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

      // When the top edge of the footer reaches or enters the viewport,
      // sticky positioning ends, and the bar stays docked at the start of the footer.
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

  // Hide on staff dashboard and dedicated auth pages
  if (pathname.startsWith('/dashboard') || pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth')) {
    return null;
  }

  const items = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Hotel', href: '/hotel', icon: BedDouble },
    { label: 'Menu', href: '/menu', icon: Utensils },
    { label: 'Dining', href: '/restaurant', icon: Coffee },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
<nav
      className={`md:hidden ${
        isStuckToFooter ? 'absolute bottom-full mb-3' : 'fixed bottom-3'
      } left-4 right-4 max-w-md mx-auto z-40 rounded-full bg-[#FDF8EE]/95 backdrop-blur-md border border-[#C99A52]/70 px-1 py-1.5 flex items-center justify-around`}
      aria-label="Mobile Navigation"
    >
      {items.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-2 px-5 rounded-full text-[10px] tracking-wide transition-all duration-200 active:scale-95 ${
              isActive
                ? 'bg-[#4F0809] text-[#FFF8EB] font-bold'
                : 'text-[#6B533B] font-medium hover:text-[#4F0809]'
            }`}
          >
            <Icon
              className={`w-4 h-4 mb-0.5 transition-colors ${
                isActive ? 'text-[#D8AA67]' : 'text-[#6B533B]'
              }`}
            />
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
