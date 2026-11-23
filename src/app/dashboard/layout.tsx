'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  CalendarCheck,
  BedDouble,
  UtensilsCrossed,
  ShoppingBag,
  ChefHat,
  Armchair,
  QrCode,
  Package,
  Users,
  IdCard,
  Sparkles,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Search,
  Calendar,
  Bell,
  ExternalLink,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Percent,
  Star,
  Receipt,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react';
import { subscribeToAuth, signOutUser, getUserProfile, checkAdminInDb } from '@/lib/firebase/auth';

function PalaceGatewayLogo() {
  return (
    <svg
      className="w-6 h-7 text-[#D8AA67] shrink-0"
      viewBox="0 0 52 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="26" cy="4" r="2" fill="#D8AA67" />
      <path d="M 6 56 V 30 C 6 16 16 8 26 8 C 36 8 46 16 46 30 V 56" />
      <path d="M 12 56 V 32 C 12 26 16 22 20 18 C 24 14 26 11 26 11 C 26 11 28 14 32 18 C 36 22 40 26 40 32 V 56" />
      <path d="M 18 56 V 36 C 18 32 21 28 26 23 C 31 28 34 32 34 36 V 56" />
      <line x1="3" y1="56" x2="49" y2="56" strokeWidth="2" />
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ordersExpanded, setOrdersExpanded] = useState(true);
  const [selectedRole, setSelectedRole] = useState('Administrator');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Staff Authorization State
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [staffInfo, setStaffInfo] = useState<{ name: string; role: string; email: string } | null>(null);

  const roleRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Remove any legacy saved localStorage content for admin dashboard
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove = [
          'admin_dashboard_data',
          'dashboard_orders',
          'dashboard_bookings',
          'dashboard_rooms',
          'dashboard_tables',
          'hotel_orders',
          'hotel_reservations',
          'hotel_staff',
          'hotel_menu',
          'hotel_inventory',
        ];
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // Ignored
      }
    }
  }, []);

  // Verify staff access and fetch admin from DB
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      try {
        if (!currentUser) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }

        const email = (currentUser.email || '').toLowerCase();
        const profile = await getUserProfile(currentUser.uid);
        const metaRole = (profile?.role || '').toLowerCase();
        const isStaffMeta = Boolean(profile?.is_staff);
        const isOwner = email === 'soninamanp7@gmail.com';

        // Fetch admin status directly from Admins doc in the database
        const adminCheck = await checkAdminInDb({ uid: currentUser.uid, email });

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

        let isStaff = adminCheck.isAdmin || isOwner || isStaffMeta || staffRoles.includes(metaRole);
        let resolvedRole = adminCheck.isAdmin || isOwner ? 'admin' : (metaRole || 'staff');
        let resolvedName =
          profile?.name ||
          adminCheck.adminData?.name ||
          currentUser.displayName ||
          (isOwner ? 'Naman Soni (Owner)' : email.split('@')[0]) ||
          'Staff Member';

        if (!isStaff) {
          try {
            const res = await fetch(`/api/staff/check?email=${encodeURIComponent(email)}`);
            const json = await res.json();
            if (json.isStaff) {
              isStaff = true;
              resolvedName = json.name || resolvedName;
              resolvedRole = json.role || resolvedRole;
            }
          } catch {
            // Fallback
          }
        }

        if (isStaff) {
          setStaffInfo({
            name: resolvedName,
            role: resolvedRole,
            email,
          });
          setSelectedRole(resolvedRole.charAt(0).toUpperCase() + resolvedRole.slice(1));
          setCheckingAuth(false);
        } else {
          setAccessDenied(true);
          setCheckingAuth(false);
        }
      } catch {
        setCheckingAuth(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [pathname, router]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/dashboard/orders?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const isOrdersActive = pathname.startsWith('/dashboard/orders');

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBF6EF] text-[#4F0809]">
        <div className="w-10 h-10 border-2 border-[#D8AA67] border-t-[#4F0809] rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold tracking-wider uppercase text-[#81736D]">
          Verifying Palace Staff Credentials...
        </p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF6EF] p-4 text-[#302421]">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E8DCD2] p-6 sm:p-8 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2
              className="text-2xl font-bold text-[#4F0809]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Staff Access Required
            </h2>
            <p className="text-xs text-[#81736D] mt-2 leading-relaxed">
              The Rajmahal Grand Admin Panel is exclusively accessible to registered staff personnel. Your signed-in account does not currently hold staff privileges.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center text-xs font-semibold">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl border border-[#E8DCD2] text-[#4F0809] hover:bg-[#FBF6EF] transition"
            >
              Return to Hotel Website
            </Link>
            <button
              onClick={async () => {
                await signOutUser();
                router.replace('/login?redirect=/dashboard');
              }}
              className="px-4 py-2.5 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] text-white transition cursor-pointer"
            >
              Sign in with Staff Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FBF6EF] text-[#302421] font-sans">
      {/* ── Left Sidebar (Deep Royal Maroon) ── */}
      <aside
        className={`bg-gradient-to-b from-[#4F0809] to-[#350506] text-[#F6EAE0] flex flex-col justify-between shrink-0 transition-all duration-300 z-30 shadow-xl ${
          sidebarOpen ? 'w-[204px]' : 'w-[64px]'
        }`}
      >
        {/* Top: Logo & Title */}
        <div className="flex flex-col">
          <Link href="/" className="h-[60px] border-b border-[#D8AA67]/20 flex items-center px-4 space-x-2.5 hover:bg-[#6B1518]/30 transition-colors" title="Back to Hotel Website">
            <PalaceGatewayLogo />
            {sidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <span
                  className="text-base font-bold tracking-[0.14em] text-[#E1B46F] leading-tight uppercase truncate"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Rajmahal
                </span>
                <span className="text-[8px] font-bold tracking-[0.22em] text-[#D8AA67]/80 uppercase leading-none mt-0.5">
                  HERITAGE GRAND
                </span>
              </div>
            )}
          </Link>

          {/* Navigation Links */}
          <nav className="p-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-110px)] select-none">
            {/* 1. Dashboard */}
            <Link
              href="/dashboard"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname === '/dashboard'
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Dashboard"
            >
              <LayoutGrid className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Dashboard</span>}
            </Link>

            {/* 2. POS / Billing (2nd position) */}
            <Link
              href="/dashboard/pos"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/pos')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="POS / Billing"
            >
              <Receipt className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">POS / Billing</span>}
            </Link>

            {/* 3. Room Bookings */}
            <Link
              href="/dashboard/bookings"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/bookings')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Room Bookings"
            >
              <CalendarCheck className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Room Bookings</span>}
            </Link>

            {/* 3. Rooms & Availability */}
            <Link
              href="/dashboard/rooms"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/rooms')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Rooms & Availability"
            >
              <BedDouble className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Rooms &amp; Availability</span>}
            </Link>

            {/* 4. Restaurant & Café */}
            <Link
              href="/dashboard/outlets"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/outlets')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Restaurant & Café"
            >
              <UtensilsCrossed className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Restaurant &amp; Café</span>}
            </Link>

            {/* 5. Orders (Collapsible Group) */}
            <div>
              <button
                type="button"
                onClick={() => setOrdersExpanded(!ordersExpanded)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                  isOrdersActive
                    ? 'bg-[#6B1518]/70 text-white font-semibold'
                    : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
                }`}
                title="Orders"
              >
                <div className="flex items-center truncate">
                  <ShoppingBag className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
                  {sidebarOpen && <span className="truncate">Orders</span>}
                </div>
                {sidebarOpen && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#E1B46F]/80 transition-transform ${
                      ordersExpanded ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {/* Sub-items */}
              {sidebarOpen && ordersExpanded && (
                <div className="pl-7 pr-1 py-1 space-y-0.5">
                  {[
                    { label: 'All Orders', href: '/dashboard/orders?tab=all' },
                    { label: 'Dine-in Orders', href: '/dashboard/orders?tab=dine_in' },
                    { label: 'Room Service Orders', href: '/dashboard/orders?tab=room_service' },
                    { label: 'Online Delivery', href: '/dashboard/orders?tab=delivery' },
                    { label: 'Pickup Orders', href: '/dashboard/orders?tab=pickup' },
                    { label: 'Completed Orders', href: '/dashboard/orders?tab=completed' },
                  ].map((sub) => {
                    return (
                      <Link
                        key={sub.label}
                        href={sub.href}
                        className="block px-2 py-1 rounded text-[11px] text-[#F6EAE0]/70 hover:text-white hover:bg-[#6B1518]/30 transition-colors truncate"
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 6. Kitchen (KOT) with Live Badge */}
            <Link
              href="/dashboard/kitchen"
              className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/kitchen')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Kitchen (KOT)"
            >
              <div className="flex items-center truncate">
                <ChefHat className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
                {sidebarOpen && <span className="truncate">Kitchen (KOT)</span>}
              </div>
              {sidebarOpen && (
                <span className="bg-[#2E7D32] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ml-1">
                  Live
                </span>
              )}
            </Link>

            {/* 7. Tables & Reservations */}
            <Link
              href="/dashboard/tables"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/tables')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Tables & Reservations"
            >
              <Armchair className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Tables &amp; Reservations</span>}
            </Link>

            {/* 8. QR Code Management */}
            <Link
              href="/dashboard/qr"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/qr')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="QR Code Management"
            >
              <QrCode className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">QR Code Management</span>}
            </Link>

            {/* 9. Inventory & Stock */}
            <Link
              href="/dashboard/inventory"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/inventory')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Inventory & Stock"
            >
              <Package className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Inventory &amp; Stock</span>}
            </Link>

            {/* 10. Menu Builder (Replaces Housekeeping as requested) */}
            <Link
              href="/dashboard/menu"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                (pathname.startsWith('/dashboard/menu') || pathname.startsWith('/dashboard/housekeeping')) && !pathname.includes('tab=')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Menu Builder"
            >
              <UtensilsCrossed className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Menu Builder</span>}
            </Link>

            {/* 11. Modifiers */}
            <Link
              href="/dashboard/modifiers"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/modifiers') || pathname.includes('tab=modifiers')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Modifiers"
            >
              <Sparkles className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Modifiers</span>}
            </Link>

            {/* 12. Promotions */}
            <Link
              href="/dashboard/promotions"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/promotions') || pathname.includes('tab=promotions')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Promotions"
            >
              <Percent className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Promotions</span>}
            </Link>

            {/* 13. Reviews */}
            <Link
              href="/dashboard/reviews"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/reviews') || pathname.includes('tab=reviews')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Reviews"
            >
              <Star className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Reviews</span>}
            </Link>

            {/* 14. Customers */}
            <Link
              href="/dashboard/customers"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/customers')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Customers"
            >
              <Users className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Customers</span>}
            </Link>

            {/* 15. Staff & Roles */}
            <Link
              href="/dashboard/staff"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/staff')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Staff & Roles"
            >
              <IdCard className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Staff &amp; Roles</span>}
            </Link>

            {/* 16. Reports & Analytics */}
            <Link
              href="/dashboard/reports"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/reports')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Reports & Analytics"
            >
              <BarChart3 className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Reports &amp; Analytics</span>}
            </Link>

            {/* 17. Media */}
            <Link
              href="/dashboard/media"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/media')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Media"
            >
              <ImageIcon className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Media</span>}
            </Link>

            {/* 18. Settings */}
            <Link
              href="/dashboard/settings"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/settings')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Settings"
            >
              <Settings className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Settings</span>}
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer matching Screenshot */}
        <div className="h-[46px] border-t border-[#D8AA67]/20 flex items-center justify-between px-3 text-[9px] uppercase tracking-widest text-[#D8AA67]/75 font-semibold">
          {sidebarOpen ? (
            <>
              <span>PALACE OPS V4.2</span>
              <span className="w-2 h-2 rounded-full bg-[#B78A48] shadow-sm animate-pulse" />
            </>
          ) : (
            <span className="mx-auto text-[10px]">V4.2</span>
          )}
        </div>
      </aside>

      {/* ── Main Panel Area (Top Nav + Scrollable Content) ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* ── Top Navigation Bar matching Screenshot ── */}
        <header className="h-[58px] bg-white border-b border-[#E8DCD2] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          {/* Left: Sidebar Toggle + Global Search */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Back to Home */}
            <Link
              href="/"
              className="p-1.5 rounded-md text-stone-500 hover:text-[#4F0809] hover:bg-[#FBF6EF] transition-colors flex items-center gap-1"
              title="Back to Hotel Website"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="w-px h-5 bg-[#E8DCD2]" />

            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md text-stone-600 hover:text-[#4F0809] hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Input Pill */}
            <form onSubmit={handleGlobalSearch} className="relative">
              <div className="flex items-center bg-[#FAF6EF] border border-[#E8DCD2] rounded-full px-3.5 py-1.5 w-60 sm:w-72 md:w-88 transition-all focus-within:ring-1 focus-within:ring-[#4F0809] focus-within:border-[#4F0809] focus-within:bg-white">
                <Search className="w-3.5 h-3.5 text-stone-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reservation, guest, bill, or KOT..."
                  className="w-full text-xs text-[#302421] placeholder:text-stone-400 bg-transparent focus:outline-none"
                />
              </div>
            </form>
          </div>

          {/* Right: Date + Role Selector + Notifications + User Avatar */}
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            {/* Date Display */}
            <div className="hidden md:flex items-center space-x-1.5 bg-[#FAF6EF] border border-[#E8DCD2] px-3 py-1.5 rounded-lg text-xs text-stone-700 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#B78A48]" />
              <span>Mon, 19 Oct 2026</span>
            </div>

            {/* Role Selector Dropdown */}
            <div className="relative" ref={roleRef}>
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center space-x-1.5 bg-[#FAF6EF] border border-[#E8DCD2] hover:border-[#B78A48] px-3 py-1.5 rounded-lg text-xs text-stone-700 font-medium transition-colors cursor-pointer"
              >
                <span>Role: <strong className="text-[#302421]">{selectedRole}</strong></span>
                <ChevronDown className="w-3 h-3 text-stone-500" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#E8DCD2] rounded-xl shadow-lg py-1.5 z-50 text-xs">
                  {['Administrator', 'Duty Manager', 'Kitchen Chef', 'Floor Steward', 'Housekeeping Head'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 hover:bg-[#FAF6EF] transition-colors flex items-center justify-between ${
                        selectedRole === role ? 'font-bold text-[#4F0809]' : 'text-stone-700'
                      }`}
                    >
                      <span>{role}</span>
                      {selectedRole === role && <CheckCircle2 className="w-3.5 h-3.5 text-[#4F0809]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg text-stone-600 hover:text-[#4F0809] hover:bg-[#FAF6EF] transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#A81D24] text-white text-[9px] font-bold flex items-center justify-center">
                  2
                </span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-1.5 w-80 bg-white border border-[#E8DCD2] rounded-xl shadow-xl py-2 z-50 divide-y divide-[#EFE7D8]">
                  <div className="px-3.5 py-1.5 flex items-center justify-between">
                    <span className="font-bold text-xs text-[#302421]">Operational Alerts</span>
                    <span className="text-[10px] text-[#A81D24] font-semibold">2 New</span>
                  </div>
                  <div className="p-2 space-y-1.5 text-xs">
                    <div className="p-2 rounded-lg bg-red-50/70 border border-red-100 flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-[#A81D24] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-stone-800 text-[11px]">Low Stock Alert: 5 Items</p>
                        <p className="text-[10px] text-stone-500">Kashmiri Saffron &amp; Cream below minimum reserve.</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100 flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-stone-800 text-[11px]">VIP Check-in Arrival</p>
                        <p className="text-[10px] text-stone-500">Vikramaditya Rathore arriving for Haveli Suite 101.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar matching Screenshot */}
            <div className="relative" ref={userRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center space-x-2.5 pl-1.5 pr-2 py-1 rounded-full hover:bg-[#FAF6EF] transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-[#4F0809] text-[#E1B46F] font-bold text-xs flex items-center justify-center ring-1 ring-[#B78A48] shadow-sm">
                  {(staffInfo?.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none">
                  <span className="text-xs font-bold text-[#302421] truncate max-w-[120px]">
                    {staffInfo?.name || 'Staff'}
                  </span>
                  <span className="text-[10px] text-stone-500 mt-0.5 capitalize">
                    {staffInfo?.role || selectedRole}
                  </span>
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#E8DCD2] rounded-xl shadow-xl py-1.5 z-50 text-xs divide-y divide-[#EFE7D8]">
                  <div className="px-3.5 py-2">
                    <p className="font-bold text-[#302421] truncate">
                      {staffInfo?.name || 'Staff Member'}
                    </p>
                    <p className="text-[10px] text-stone-500 truncate mt-0.5">
                      {staffInfo?.email || 'Registered Staff'} • <span className="capitalize">{staffInfo?.role || selectedRole}</span>
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-3.5 py-1.5 text-stone-700 hover:bg-[#FAF6EF] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#B78A48]" />
                      <span>Return to Hotel Website</span>
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center space-x-2.5 px-3.5 py-1.5 text-stone-700 hover:bg-[#FAF6EF] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#B78A48]" />
                      <span>Settings &amp; Property</span>
                    </Link>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await signOutUser();
                        router.refresh();
                        router.push('/login');
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-1.5 text-red-700 hover:bg-red-50 text-left transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Scrollable Main Content Container ── */}
        <main className="flex-1 overflow-y-auto bg-[#FBF6EF] p-3 sm:p-5 lg:p-6">
          <div className="max-w-[1440px] mx-auto space-y-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
