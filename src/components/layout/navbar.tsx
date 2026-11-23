'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  Globe,
  ChevronDown,
  ArrowRight,
  User as UserIcon,
  LogOut,
  Sparkles,
  BedDouble,
  UtensilsCrossed,
  ShieldCheck,
  Calendar,
  PhoneCall,
  Home as HomeIcon,
} from 'lucide-react';
import { subscribeToAuth, signOutUser, getUserProfile, checkAdminInDb } from '@/lib/firebase/auth';
import type { FirebaseUser } from '@/lib/firebase/auth';

function PalaceMark() {
  return (
<svg
  className="palace-mark w-1 h-1 sm:w-1 sm:h-1 shrink-0"
  viewBox="0 0 52 58"
  aria-hidden="true"
  fill="none"
  stroke="#D8AA67"
  strokeWidth="1"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <path d="M5 53V24L26 5l21 19v29" />
  <path d="M11 53V27L26 13l15 14v26M17 53V30l9-9 9 9v23" />
  <path d="M22 53V36c0-4 1.8-6.7 4-8.8 2.2 2.1 4 4.8 4 8.8v17M2 53h48" />
  <path d="M9 22 26 7l17 15M13 20 26 9l13 11" />
</svg>
  );
}

export interface NavbarProps {
  isScrolled?: boolean;
  className?: string;
}

interface DropdownItem {
  label: string;
  href: string;
  desc?: string;
}

interface NavLinkItem {
  label: string;
  href: string;
  hasDropdown?: boolean;
  dropdownItems?: DropdownItem[];
}

export const Navbar: React.FC<NavbarProps> = ({
  isScrolled: propIsScrolled,
  className = '',
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const [internalScrolled, setInternalScrolled] = useState(false);
  const isScrolled = propIsScrolled !== undefined ? propIsScrolled : internalScrolled;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState<'Eng' | 'हिन्दी'>('Eng');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Swipe gesture state for mobile bottom drawer
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaY, setTouchDeltaY] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMobileMenu = () => {
    setIsMenuClosing(true);
    setTimeout(() => {
      setMobileMenuOpen(false);
      setIsMenuClosing(false);
      setTouchDeltaY(0);
      setTouchStartY(null);
    }, 200);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchDeltaY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY;
    if (diff > 0) {
      setTouchDeltaY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (touchDeltaY > 70) {
      closeMobileMenu();
    } else {
      setTouchDeltaY(0);
    }
    setTouchStartY(null);
  };

  // Window scroll event listener to track scrolled status
  useEffect(() => {
    if (propIsScrolled !== undefined) return;

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setInternalScrolled(scrollY > 15);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [propIsScrolled]);

  // Subscribe to auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsStaff(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Check if authenticated user is registered staff
  useEffect(() => {
    if (!user || !user.email) {
      return;
    }

    let isMounted = true;
    const verifyStaffRole = async () => {
      const staffRoles = [
        'admin',
        'administrator',
        'manager',
        'receptionist',
        'kitchen',
        'waiter',
        'housekeeping',
        'accountant',
        'staff',
      ];

      // 1. Check Admins doc in Firestore
      try {
        const adminCheck = await checkAdminInDb({ uid: user.uid, email: user.email });
        if (adminCheck.isAdmin) {
          if (isMounted) setIsStaff(true);
          return;
        }
      } catch {
        // Fallback
      }

      // 2. Check owner email
      if (user.email === 'soninamanp7@gmail.com') {
        if (isMounted) setIsStaff(true);
        return;
      }

      // 3. Check Firestore user profile
      try {
        const profile = await getUserProfile(user.uid);
        const role = (profile?.role || '').toLowerCase();
        if (profile?.is_staff || staffRoles.includes(role)) {
          if (isMounted) setIsStaff(true);
          return;
        }
      } catch {
        // Fallback
      }

      try {
        const res = await fetch(`/api/staff/check?email=${encodeURIComponent(user.email!)}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setIsStaff(Boolean(data.isStaff));
        }
      } catch {
        // Fallback
      }
    };

    verifyStaffRole();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Hide public header on dashboard and dedicated auth pages
  if (
    pathname.startsWith('/dashboard') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth')
  ) {
    return null;
  }

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setProfileOpen(false);
    setMobileMenuOpen(false);
    router.refresh();
    router.push('/');
  };

  const displayName =
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Royal Guest';
  const initial = displayName.charAt(0).toUpperCase();

  const navLinks: NavLinkItem[] = [
    { label: 'HOME', href: '/' },
    {
      label: 'HOTEL',
      href: '/hotel',
    },
    {
      label: 'RESTAURANT & CAFÉ',
      href: '/restaurant',
    },
    { label: 'MENU', href: '/menu' },
    { label: 'CONTACT', href: '/contact' },
  ];

  return (
    <>
      <header
        data-scrolled={isScrolled}
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ease-in-out flex items-center ${
          isScrolled
            ? 'h-[66px] sm:h-[70px] bg-[#4F0809]/00'
            : 'h-[62px] sm:h-[100px] bg-[#FFF7E8]/00'
        } px-3.5 sm:px-6 lg:px-8 xl:px-10 ${className}`}
      >
<div className="w-full max-w-xxl mx-auto flex items-center justify-between px-4 py-2.5 rounded-full">
          {/* ── 1. Left: Brand Capsule Pill ── */}
          <Link
            href="/"
            className="inline-flex items-center space-x-2.5 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white text-[#4F0809] border border-[#4F0809]/15 hover:border-[#D8AA67] transition-all shadow-xs group shrink-0 active:scale-95"
          >
            {/* <PalaceMark /> */}
            <div className="flex flex-col text-left">
              <span
                className="font-bold tracking-[0.1em] sm:text-[15px] uppercase text-xs sm:text-base text-[#4F0809] group-hover:text-[#D8AA67] transition-colors leading-none"
                style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
              >
                Rajmahal
              </span>
              <span className="text-[5.5px] sm:text-[7px] font-semibold tracking-[0.28em] uppercase text-[#4F0809]/80 leading-none mt-0.5">
                Heritage Hotel
              </span>
            </div>
          </Link>

          {/* ── 2. Center: Nav Island Capsule ── */}
          <nav className="hidden lg:inline-flex items-center p-1 rounded-full bg-white border border-[#4F0809]/15 shadow-xs space-x-1 transition-colors">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname === link.href || pathname.startsWith(link.href + '/');

              return (
                <div key={link.label} className="relative group">
                  <Link
                    href={link.href}
                    className={`flex items-center space-x-1 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#4F0809] text-[#FFF8EB] shadow-xs'
                        : 'text-[#4F0809]/80 hover:text-[#4F0809] hover:bg-[#4F0809]/10'
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.hasDropdown && (
                      <ChevronDown
                        className={`w-3 h-3 transition-transform group-hover:rotate-180 duration-200 ml-0.5 ${
                          isActive
                            ? 'text-[#D8AA67]'
                            : 'text-[#4F0809]/60 group-hover:text-[#4F0809]'
                        }`}
                      />
                    )}
                  </Link>

                  {/* Dropdown Menu on Hover */}
                  {link.hasDropdown && link.dropdownItems && (
                    <div className="absolute top-full left-0 mt-2.5 w-64 rounded-2xl bg-white border border-[#4F0809]/15 shadow-[0_16px_40px_rgba(0,0,0,0.12)] p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
                      {link.dropdownItems.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="flex flex-col p-2.5 rounded-xl hover:bg-[#4F0809]/5 text-left transition-colors group/item"
                        >
                          <span className="text-xs font-bold text-[#4F0809] group-hover/item:text-[#9C7A45] transition-colors flex items-center justify-between">
                            <span>{item.label}</span>
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover/item:opacity-100 -translate-x-1 group-hover/item:translate-x-0 transition-all text-[#9C7A45]" />
                          </span>
                          {item.desc && (
                            <span className="text-[10px] text-[#6B5E51] mt-0.5 line-clamp-1">
                              {item.desc}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* ── 3. Right: Desktop Action Pills ── */}
          <div className="hidden sm:flex items-center space-x-2.5 md:space-x-3 shrink-0">

            {/* Language Selector Pill */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'Eng' ? 'हिन्दी' : 'Eng')}
              className="hidden xl:inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white hover:bg-[#cccccc]/95 border border-[#4F0809]/15 text-xs font-semibold text-[#4F0809] transition cursor-pointer"
              title="Toggle Language"
            >
              <Globe className="w-3 h-3 text-[#4F0809]" />
              <span>{language}</span>
            </button>

            {/* Staff Admin Panel Badge Button */}
            {user && isStaff && (
              <Link
                href="/dashboard"
                id="navbar-admin-panel-btn"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#D8AA67] to-[#B78A48] text-[#2B0507] font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-105 transition shrink-0"
                title="Enter Staff Admin Panel"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#2B0507]" />
                <span>Admin</span>
              </Link>
            )}

            {/* Secondary Capsule Pill: Sign In / Profile */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white hover:bg-[#4F0809]/5 border border-[#4F0809]/15 hover:border-[#D8AA67] text-xs font-bold uppercase tracking-wider text-[#4F0809] transition cursor-pointer"
                  aria-label="User profile menu"
                  aria-expanded={profileOpen}
                >
                  <div className="w-5 h-5 rounded-full bg-[#D8AA67] text-[#2B0507] font-bold text-[10px] flex items-center justify-center">
                    {initial}
                  </div>
                  <span className="max-w-[85px] truncate text-[11px] font-medium capitalize text-[#4F0809]">
                    {displayName}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-[#4F0809] transition-transform duration-200 ${
                      profileOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-[0_12px_40px_rgba(20,5,5,0.15)] border border-[#E8DFCE] py-2 z-50 animate-fade-in-up divide-y divide-[#EFE7D8]">
                    <div className="px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest text-[#9C7A45] font-semibold">
                        {isStaff ? 'Rajmahal Staff Member' : 'Rajmahal Guest'}
                      </p>
                      <p className="text-sm font-bold text-[#380506] truncate mt-0.5">
                        {displayName}
                      </p>
                      <p className="text-xs text-[#6B5E51] truncate mt-0.5">
                        {user.email || 'Verified User'}
                      </p>
                    </div>

                    {isStaff && (
                      <div className="p-2 bg-gradient-to-r from-[#4F0809]/10 via-[#D8AA67]/15 to-[#4F0809]/10">
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#4F0809] text-[#D8AA67] hover:bg-[#680b0c] font-semibold text-xs transition shadow-sm group"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#D8AA67]" />
                            <span>Enter Admin Panel</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    )}

                    <div className="py-1.5 text-xs">
                      <Link
                        href="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-[#380506] hover:bg-[#F5EFE6] transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-[#D8AA67]" />
                        <span className="font-medium">My Profile &amp; Account</span>
                      </Link>

                      <Link
                        href="/rooms"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-[#380506] hover:bg-[#F5EFE6] transition-colors"
                      >
                        <BedDouble className="w-4 h-4 text-[#D8AA67]" />
                        <span className="font-medium">Book a Suite</span>
                      </Link>

                      <Link
                        href="/restaurant"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center space-x-3 px-4 py-2.5 text-[#380506] hover:bg-[#F5EFE6] transition-colors"
                      >
                        <UtensilsCrossed className="w-4 h-4 text-[#D8AA67]" />
                        <span className="font-medium">Dining &amp; Table Booking</span>
                      </Link>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50/80 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-600" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#cccccc]/95 border border-[#4F0809]/15 text-[#4F0809] font-bold text-xs uppercase tracking-wider transition-all hover:border-[#D8AA67] active:scale-95 cursor-pointer shrink-0"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#4F0809]" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* ── 4. Mobile Displays: Show Login Button AND Menu Button with Menu Icon ── */}
          <div className="flex sm:hidden items-center space-x-2">
            {/* Mobile Login / Profile Button Capsule */}
            {user ? (
              <Link
                href="/profile"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#cccccc]/95 border border-[#4F0809]/15 text-[11px] font-bold text-[#4F0809] active:scale-95 transition"
              >
                <div className="w-4 h-4 rounded-full bg-[#D8AA67] text-[#2B0507] font-bold text-[9px] flex items-center justify-center">
                  {initial}
                </div>
                <span className="text-[10px] uppercase font-bold text-[#4F0809]">
                  Profile
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center px-3 py-1.5 rounded-full bg-white hover:bg-[#cccccc]/95 border border-[#4F0809]/15 text-[11px] font-bold uppercase tracking-wider text-[#4F0809] active:scale-95 transition cursor-pointer"
              >
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Menu Button with Menu Icon Capsule */}
            <button
              type="button"
              onClick={() => {
                if (mobileMenuOpen) {
                  closeMobileMenu();
                } else {
                  setMobileMenuOpen(true);
                }
              }}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white hover:bg-[#cccccc]/95 border border-[#4F0809]/15 text-[11px] font-bold uppercase tracking-wider text-[#4F0809] active:scale-95 transition cursor-pointer focus:outline-none"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <>
                  <X className="w-3.5 h-3.5 text-[#4F0809]" />
                </>
              ) : (
                <>
                  <Menu className="w-3.5 h-3.5 text-[#4F0809]" />
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── 5. Mobile Swipeable Bottom Floating Drawer ── */}
{mounted &&
        mobileMenuOpen &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) closeMobileMenu();
            }}
            className={`fixed inset-0 z-[150] sm:hidden bg-black/50 backdrop-blur-xs flex items-end justify-center p-3 transition-opacity ${
              isMenuClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'
            }`}
          >
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: touchDeltaY > 0 ? `translateY(${touchDeltaY}px)` : undefined,
                transition: touchStartY !== null ? 'none' : 'transform 0.2s ease-out',
              }}
              className={`relative w-full max-h-[85vh] rounded-[28px] border-t-2 border-x border-[#4F0809]/15 bg-white shadow-[0_-15px_50px_rgba(79,8,9,0.18)] flex flex-col overflow-hidden ${
                isMenuClosing ? 'animate-slide-down-modal' : 'animate-slide-up-modal'
              }`}
            >
              {/* Top Drag Handle Bar (Swipe down affordance) */}
              <div className="pt-3 pb-2 cursor-grab active:cursor-grabbing flex justify-center items-center">
                <div className="w-12 h-1.5 bg-[#4F0809]/25 rounded-full" />
              </div>

              {/* Drawer Header */}
              <div className="px-5 py-2.5 border-b border-[#4F0809]/10 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-[#D8AA67] animate-pulse" />
                  <span
                    className="font-bold uppercase tracking-wider text-[#4F0809]"
                    style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)", fontSize: '18px' }}
                  >
                    Palace Navigation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="p-1.5 rounded-full bg-[#4F0809]/5 hover:bg-[#4F0809]/10 text-[#4F0809] transition cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4 text-[#4F0809]" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="p-4 overflow-y-auto max-h-[calc(85vh-130px)] space-y-3">
                {/* Staff Admin Panel Link */}
                {user && isStaff && (
                  <div>
                    <Link
                      href="/dashboard"
                      onClick={closeMobileMenu}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#D8AA67] via-[#E1B46F] to-[#B78A48] text-[#2B0507] font-bold text-xs uppercase tracking-wider shadow-md transition group"
                    >
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-[#2B0507]" />
                        <span>Access Admin Panel</span>
                      </div>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                )}

                {/* User Profile Quick Info */}
                {user && (
                  <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#4F0809]/10 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#4F0809] text-[#FFF8EB] font-bold text-xs flex items-center justify-center">
                        {initial}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#4F0809] leading-tight">{displayName}</p>
                        <p className="text-[10px] text-[#6B5E51] truncate max-w-[190px]">{user.email}</p>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={closeMobileMenu}
                      className="text-xs text-[#9C7A45] hover:text-[#4F0809] underline font-semibold transition-colors"
                    >
                      Profile
                    </Link>
                  </div>
                )}

                {/* Primary Action Button on Mobile */}
                <div>
                  <Link
                    href="/rooms"
                    onClick={closeMobileMenu}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D8AA67] via-[#E1B46F] to-[#C89B55] text-[#2B0507] font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-md active:scale-98 transition"
                  >
                    <BedDouble className="w-4 h-4 text-[#2B0507]" />
                    <span>Book A Stay &bull; Suites &amp; Rooms</span>
                  </Link>
                </div>

                {/* Nav Links Stack */}
                <div className="space-y-1">
                  {navLinks.map((link) => {
                    const isActive =
                      link.href === '/'
                        ? pathname === '/'
                        : pathname === link.href || pathname.startsWith(link.href + '/');

                    return (
                      <div key={link.label} className="flex flex-col">
                        <Link
                          href={link.href}
                          onClick={closeMobileMenu}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                            isActive
                              ? 'bg-[#4F0809] text-[#FFF8EB] shadow-xs'
                              : 'text-[#4F0809]/85 hover:bg-[#4F0809]/5 hover:text-[#4F0809]'
                          }`}
                        >
                          <span>{link.label}</span>
                          <ArrowRight
                            className={`w-3.5 h-3.5 ${
                              isActive ? 'text-[#D8AA67]' : 'text-[#4F0809]/50'
                            }`}
                          />
                        </Link>
                        {link.hasDropdown && link.dropdownItems && (
                          <div className="pl-4 pr-1 py-1 space-y-1">
                            {link.dropdownItems.map((sub) => (
                              <Link
                                key={sub.label}
                                href={sub.href}
                                onClick={closeMobileMenu}
                                className="block px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#6B5E51] hover:text-[#4F0809] hover:bg-[#4F0809]/5 transition"
                              >
                                {sub.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer in Mobile Menu */}
                <div className="mt-3.5 pt-3.5 border-t border-[#4F0809]/10 flex items-center justify-between text-xs px-2">
                  <button
                    type="button"
                    onClick={() => setLanguage(language === 'Eng' ? 'हिन्दी' : 'Eng')}
                    className="flex items-center space-x-1.5 text-[#4F0809]/80 hover:text-[#4F0809] font-medium py-1 cursor-pointer transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#4F0809]" />
                    <span>Language: {language}</span>
                  </button>

                  {user ? (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="text-red-700 hover:text-red-800 font-semibold flex items-center py-1 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={closeMobileMenu}
                      className="text-[#4F0809] hover:text-[#9C7A45] font-bold flex items-center py-1 transition-colors"
                    >
                      <span>Sign Up / Login</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 text-[#9C7A45]" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
