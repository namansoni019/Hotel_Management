'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronLeft,
  Menu,
  X,
  Search,
  Calendar,
  Clock,
  Bell,
  ExternalLink,
  LogOut,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Percent,
  Star,
  Receipt,
  ArrowLeft,
  Image as ImageIcon,
  Trash2,
  Check,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToAuth, signOutUser, getUserProfile, checkAdminInDb } from '@/lib/firebase/auth';

const PALACE_ROLES = [
  { id: 'Admin', label: 'Admin', desc: 'Full Palace Operations', icon: ShieldCheck },
  { id: 'Manager', label: 'Manager', desc: 'Bookings & Guest Desk', icon: UserCheck },
  { id: 'Kitchen Chef', label: 'Kitchen Chef', desc: 'KOT & Culinary Pass', icon: ChefHat },
  { id: 'Waiter', label: 'Waiter', desc: 'Dining & Room Service', icon: UtensilsCrossed },
] as const;

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

function normalizeRoleLabel(raw: string): string {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('manager')) return 'Manager';
  if (lower.includes('kitchen') || lower.includes('chef')) return 'Kitchen Chef';
  if (lower.includes('waiter') || lower.includes('steward')) return 'Waiter';
  return 'Admin';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ordersExpanded, setOrdersExpanded] = useState(true);
  const [selectedRole, setSelectedRole] = useState('Admin');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Real-time Date & Clock State
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [calMonth, setCalMonth] = useState<number>(() => new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(() => new Date().getFullYear());

  // Live Data for Top Global Search & Operational Alerts
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [liveReservations, setLiveReservations] = useState<any[]>([]);
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [liveTables, setLiveTables] = useState<any[]>([]);
  const [liveInventory, setLiveInventory] = useState<any[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // Staff Authorization State
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [staffInfo, setStaffInfo] = useState<{ name: string; role: string; email: string } | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Live ticking clock & date updater (1s interval)
  useEffect(() => {
    setMounted(true);
    const current = new Date();
    setNow(current);
    setCalMonth(current.getMonth());
    setCalYear(current.getFullYear());

    try {
      const savedDismissed = window.sessionStorage.getItem('rajmahal_dismissed_alerts');
      if (savedDismissed) {
        setDismissedAlertIds(JSON.parse(savedDismissed));
      }
      const savedRole = window.localStorage.getItem('rajmahal_active_role');
      if (savedRole) {
        setSelectedRole(normalizeRoleLabel(savedRole));
      }
    } catch {
      // Ignored
    }

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
          const normalized = normalizeRoleLabel(resolvedRole);
          setStaffInfo({
            name: resolvedName,
            role: normalized,
            email,
          });
          setSelectedRole((prev) => {
            if (typeof window !== 'undefined' && window.localStorage.getItem('rajmahal_active_role')) {
              return prev;
            }
            return normalized;
          });
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

  // Subscribe to real-time Firestore collections for Global Search & Operational Alerts
  useEffect(() => {
    if (checkingAuth || accessDenied) return;

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => setLiveOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsubRes = onSnapshot(
      collection(db, 'reservations'),
      (snap) => setLiveReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snap) => setLiveRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsubTables = onSnapshot(
      collection(db, 'tables'),
      (snap) => setLiveTables(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );
    const unsubInv = onSnapshot(
      collection(db, 'inventory'),
      (snap) => setLiveInventory(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    );

    return () => {
      unsubOrders();
      unsubRes();
      unsubRooms();
      unsubTables();
      unsubInv();
    };
  }, [checkingAuth, accessDenied]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
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

  // Live multi-entity global search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { bookings: [], orders: [], rooms: [], tables: [], total: 0 };

    const bookings = liveReservations
      .filter(
        (b) =>
          (b.reference_code || '').toLowerCase().includes(q) ||
          (b.guest?.name || '').toLowerCase().includes(q) ||
          (b.guest?.phone || '').toLowerCase().includes(q) ||
          (b.room?.room_number || '').toLowerCase().includes(q)
      )
      .slice(0, 4);

    const orders = liveOrders
      .filter(
        (o) =>
          (o.order_number || '').toLowerCase().includes(q) ||
          (o.table_number || '').toLowerCase().includes(q) ||
          (o.room_number || '').toLowerCase().includes(q) ||
          (o.delivery_name || '').toLowerCase().includes(q) ||
          (o.pickup_name || '').toLowerCase().includes(q) ||
          (o.status || '').toLowerCase().includes(q)
      )
      .slice(0, 4);

    const rooms = liveRooms
      .filter(
        (r) =>
          String(r.room_number || '').toLowerCase().includes(q) ||
          (r.room_category || r.room_type_name || '').toLowerCase().includes(q) ||
          (r.housekeeping_state || '').toLowerCase().includes(q)
      )
      .slice(0, 3);

    const tables = liveTables
      .filter(
        (t) =>
          String(t.table_number || '').toLowerCase().includes(q) ||
          (t.outlet_name || '').toLowerCase().includes(q)
      )
      .slice(0, 3);

    return {
      bookings,
      orders,
      rooms,
      tables,
      total: bookings.length + orders.length + rooms.length + tables.length,
    };
  }, [searchQuery, liveReservations, liveOrders, liveRooms, liveTables]);

  // Real-time Operational Alerts derived from live collections
  const activeAlerts = useMemo(() => {
    const alerts: {
      id: string;
      type: 'warning' | 'info' | 'success';
      title: string;
      desc: string;
      href: string;
      time: string;
    }[] = [];

    const lowStock = liveInventory.filter((i) => i.status === 'low_stock');
    if (lowStock.length > 0) {
      alerts.push({
        id: `low-stock-${lowStock.length}`,
        type: 'warning',
        title: `Low Stock Alert: ${lowStock.length} Item${lowStock.length > 1 ? 's' : ''}`,
        desc: `${lowStock.slice(0, 2).map((i) => i.name).join(', ')} below reserve threshold.`,
        href: '/dashboard/inventory',
        time: 'Inventory Sync',
      });
    }

    const pendingOrders = liveOrders.filter(
      (o) => !['completed', 'cancelled', 'delivered'].includes((o.status || '').toLowerCase())
    );
    pendingOrders.slice(0, 2).forEach((ord) => {
      alerts.push({
        id: `ord-${ord.id}`,
        type: 'info',
        title: `Active Order ${ord.order_number || ''}`.trim(),
        desc: `${ord.table_number || (ord.room_number ? `Room ${ord.room_number}` : 'Dining')} • ${ord.status || 'New'}`,
        href: `/dashboard/orders?search=${encodeURIComponent(ord.order_number || '')}`,
        time: 'Live KOT',
      });
    });

    const recentBookings = liveReservations.filter((b) => b.status === 'confirmed' || b.status === 'checked_in');
    recentBookings.slice(0, 2).forEach((res) => {
      alerts.push({
        id: `res-${res.id}`,
        type: 'success',
        title: `${res.status === 'checked_in' ? 'Checked-In Guest' : 'Confirmed Arrival'}: ${res.guest?.name || res.reference_code}`,
        desc: `Ref ${res.reference_code} • ${res.room_type?.name || 'Deluxe Suite'}`,
        href: `/dashboard/bookings?search=${encodeURIComponent(res.reference_code || '')}`,
        time: res.check_in_time || '12:00 PM',
      });
    });

    // If no live alerts exist yet and user hasn't cleared welcome alerts, show default readiness alerts
    if (alerts.length === 0) {
      alerts.push(
        {
          id: 'sys-pms-ready',
          type: 'success',
          title: 'Palace PMS & KOT Synced',
          desc: 'All chambers, orders, and reservations connected in real time.',
          href: '/dashboard',
          time: 'Live Status',
        },
        {
          id: 'sys-checkins-ready',
          type: 'info',
          title: 'Front Desk Check-In Window',
          desc: 'Standard suite check-in begins at 12:00 PM IST.',
          href: '/dashboard/bookings',
          time: 'Daily Desk',
        }
      );
    }

    return alerts.filter((a) => !dismissedAlertIds.includes(a.id));
  }, [liveInventory, liveOrders, liveReservations, dismissedAlertIds]);

  const handleClearAllNotifications = () => {
    const allIds = activeAlerts.map((a) => a.id);
    const updated = Array.from(new Set([...dismissedAlertIds, ...allIds]));
    setDismissedAlertIds(updated);
    try {
      window.sessionStorage.setItem('rajmahal_dismissed_alerts', JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  const handleDismissSingleAlert = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = Array.from(new Set([...dismissedAlertIds, id]));
    setDismissedAlertIds(updated);
    try {
      window.sessionStorage.setItem('rajmahal_dismissed_alerts', JSON.stringify(updated));
    } catch {
      // Ignored
    }
  };

  const handleRoleSwitch = (roleId: string) => {
    setSelectedRole(roleId);
    setRoleDropdownOpen(false);
    try {
      window.localStorage.setItem('rajmahal_active_role', roleId);
      window.dispatchEvent(new CustomEvent('rajmahal_role_changed', { detail: roleId }));
    } catch {
      // Ignored
    }
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    if (searchResults.bookings.length > 0 && searchResults.orders.length === 0) {
      router.push(`/dashboard/bookings?search=${encodeURIComponent(q)}`);
    } else if (searchResults.rooms.length > 0 && searchResults.orders.length === 0 && searchResults.bookings.length === 0) {
      router.push(`/dashboard/rooms?search=${encodeURIComponent(q)}`);
    } else if (searchResults.tables.length > 0 && searchResults.orders.length === 0) {
      router.push(`/dashboard/tables?search=${encodeURIComponent(q)}`);
    } else if (searchResults.bookings.length > 0 && q.toUpperCase().startsWith('BK')) {
      router.push(`/dashboard/bookings?search=${encodeURIComponent(q)}`);
    } else {
      router.push(`/dashboard/orders?search=${encodeURIComponent(q)}`);
    }
    setSearchFocused(false);
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

            {/* 11. Taxes & Billing (Replaced Modifiers as requested) */}
            <Link
              href="/dashboard/taxes-billing"
              className={`flex items-center px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all ${
                pathname.startsWith('/dashboard/taxes-billing') || pathname.startsWith('/dashboard/billing')
                  ? 'bg-[#6B1518] text-white font-semibold shadow-sm'
                  : 'text-[#F6EAE0]/80 hover:text-white hover:bg-[#6B1518]/40'
              }`}
              title="Taxes & Billing"
            >
              <Receipt className="w-4 h-4 mr-2.5 shrink-0 text-[#E1B46F]" />
              {sidebarOpen && <span className="truncate">Taxes &amp; Billing</span>}
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

            {/* Working Global Search Input Pill + Live Results Dropdown */}
            <div className="relative" ref={searchRef}>
              <form onSubmit={handleGlobalSearch}>
                <div className="flex items-center bg-[#FAF6EF] border border-[#E8DCD2] rounded-full px-3.5 py-1.5 w-56 sm:w-64 md:w-80 transition-all focus-within:ring-1 focus-within:ring-[#4F0809] focus-within:border-[#4F0809] focus-within:bg-white">
                  <Search className="w-3.5 h-3.5 text-[#8F6628] mr-2 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setSearchFocused(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchFocused(true);
                    }}
                    placeholder="Search reservation, guest, bill, or KOT..."
                    className="w-full text-xs text-[#302421] placeholder:text-stone-400 bg-transparent focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchFocused(false);
                      }}
                      className="text-stone-400 hover:text-[#4F0809] ml-1 cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </form>

              {searchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-[#FDF8EE] border border-[#D8AA67]/60 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="bg-gradient-to-r from-[#4F0809] to-[#6B1518] px-3.5 py-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#E1B46F]">
                      Live Palace Search
                    </span>
                    <span className="text-[10px] text-[#F5ECDC] font-semibold">
                      {searchResults.total} result{searchResults.total !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {searchResults.total === 0 ? (
                    <div className="p-6 text-center">
                      <Search className="w-6 h-6 text-[#D8AA67] mx-auto mb-1.5" />
                      <p className="text-xs font-bold text-[#4F0809]">No matching records</p>
                      <p className="text-[11px] text-[#856B4D] mt-0.5">
                        Try searching by guest name, booking code (BK-...), order (#ORD-...), room or table number.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto p-2 space-y-2.5 text-xs">
                      {searchResults.bookings.length > 0 && (
                        <div>
                          <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#856B4D]">
                            Room Bookings &amp; Guests
                          </div>
                          <div className="space-y-1 mt-1">
                            {searchResults.bookings.map((b: any) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  router.push(`/dashboard/bookings?search=${encodeURIComponent(b.reference_code || b.guest?.name || searchQuery)}`);
                                  setSearchFocused(false);
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-xl bg-[#F5ECDC]/70 hover:bg-[#EFE2CC] border border-[#E8DFCE] flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <CalendarCheck className="w-4 h-4 text-[#4F0809] shrink-0" />
                                  <div className="truncate">
                                    <div className="font-bold text-[#4F0809] truncate">
                                      {b.guest?.name || 'Guest'} • {b.reference_code}
                                    </div>
                                    <div className="text-[10px] text-[#856B4D] truncate">
                                      {b.guest?.phone || 'No phone'} • {b.room_type?.name || 'Suite'}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#4F0809]/10 text-[#4F0809] shrink-0">
                                  {b.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.orders.length > 0 && (
                        <div>
                          <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#856B4D]">
                            Orders &amp; Bills / KOT
                          </div>
                          <div className="space-y-1 mt-1">
                            {searchResults.orders.map((o: any) => (
                              <button
                                key={o.id}
                                type="button"
                                onClick={() => {
                                  router.push(`/dashboard/orders?search=${encodeURIComponent(o.order_number || searchQuery)}`);
                                  setSearchFocused(false);
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-xl bg-[#F5ECDC]/70 hover:bg-[#EFE2CC] border border-[#E8DFCE] flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Receipt className="w-4 h-4 text-[#8F6628] shrink-0" />
                                  <div className="truncate">
                                    <div className="font-bold text-[#4F0809] truncate">
                                      {o.order_number}
                                    </div>
                                    <div className="text-[10px] text-[#856B4D] truncate">
                                      {o.table_number || (o.room_number ? `Room ${o.room_number}` : o.delivery_name || 'Counter')} • ₹{Math.round((o.total_amount_minor || o.total_minor || 0) / 100)}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#D8AA67]/25 text-[#4F0809] shrink-0">
                                  {o.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.rooms.length > 0 && (
                        <div>
                          <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#856B4D]">
                            Palace Chambers / Rooms
                          </div>
                          <div className="space-y-1 mt-1">
                            {searchResults.rooms.map((r: any) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  router.push(`/dashboard/rooms?search=${encodeURIComponent(r.room_number || searchQuery)}`);
                                  setSearchFocused(false);
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-xl bg-[#F5ECDC]/70 hover:bg-[#EFE2CC] border border-[#E8DFCE] flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <BedDouble className="w-4 h-4 text-[#4F0809]" />
                                  <div>
                                    <div className="font-bold text-[#4F0809]">Room {r.room_number}</div>
                                    <div className="text-[10px] text-[#856B4D]">
                                      {r.room_category || r.room_type_name || 'Deluxe Room'}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#2E7D32]/15 text-[#2E7D32]">
                                  {r.housekeeping_state || 'available'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.tables.length > 0 && (
                        <div>
                          <div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#856B4D]">
                            Dining Tables
                          </div>
                          <div className="space-y-1 mt-1">
                            {searchResults.tables.map((t: any) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  router.push(`/dashboard/tables?search=${encodeURIComponent(t.table_number || searchQuery)}`);
                                  setSearchFocused(false);
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-xl bg-[#F5ECDC]/70 hover:bg-[#EFE2CC] border border-[#E8DFCE] flex items-center justify-between transition cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <Armchair className="w-4 h-4 text-[#8F6628]" />
                                  <div>
                                    <div className="font-bold text-[#4F0809]">{t.table_number}</div>
                                    <div className="text-[10px] text-[#856B4D]">
                                      {t.outlet_name || 'Rajmahal Dining'}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#D8AA67]/25 text-[#4F0809]">
                                  {t.status || 'available'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Real-Time Date + Live Clock + Royal Role Selector + Royal Notifications + User Avatar */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Real-Time Date Display + Interactive Mini Calendar Popover */}
            <div className="relative hidden md:block" ref={calendarRef}>
              <button
                type="button"
                onClick={() => setCalendarOpen(!calendarOpen)}
                className="flex items-center space-x-1.5 bg-[#F5ECDC] border border-[#D8AA67]/50 hover:border-[#4F0809] px-3 py-1.5 rounded-xl text-xs text-[#4F0809] font-semibold transition-all cursor-pointer shadow-2xs"
                title="View Palace Calendar"
              >
                <Calendar className="w-3.5 h-3.5 text-[#8F6628]" />
                <span>
                  {mounted
                    ? now.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Loading Date...'}
                </span>
              </button>

              {calendarOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#FDF8EE] border border-[#D8AA67]/60 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#E8DFCE]">
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 0) {
                          setCalMonth(11);
                          setCalYear((y) => y - 1);
                        } else {
                          setCalMonth((m) => m - 1);
                        }
                      }}
                      className="w-7 h-7 rounded-lg bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] flex items-center justify-center transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-xs font-bold text-[#4F0809] tracking-wide">
                      {new Date(calYear, calMonth, 1).toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (calMonth === 11) {
                          setCalMonth(0);
                          setCalYear((y) => y + 1);
                        } else {
                          setCalMonth((m) => m + 1);
                        }
                      }}
                      className="w-7 h-7 rounded-lg bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] flex items-center justify-center transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#856B4D] uppercase mb-1">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <div key={d} className="py-1">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, idx) => {
                      const day = idx + 1;
                      const isToday =
                        mounted &&
                        day === now.getDate() &&
                        calMonth === now.getMonth() &&
                        calYear === now.getFullYear();
                      return (
                        <div
                          key={day}
                          className={`h-8 rounded-lg flex items-center justify-center font-semibold transition ${
                            isToday
                              ? 'bg-[#4F0809] text-[#FDF8EE] shadow-xs ring-1 ring-[#D8AA67]'
                              : 'text-[#302421] hover:bg-[#F5ECDC]'
                          }`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-[#E8DFCE] flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const t = new Date();
                        setCalMonth(t.getMonth());
                        setCalYear(t.getFullYear());
                      }}
                      className="font-bold text-[#8F6628] hover:text-[#4F0809] transition cursor-pointer"
                    >
                      Jump to Today
                    </button>
                    <Link
                      href="/dashboard/bookings"
                      onClick={() => setCalendarOpen(false)}
                      className="font-bold text-[#4F0809] hover:underline"
                    >
                      View Bookings →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Real-Time Clock Time Card */}
            <div
              className="hidden lg:flex items-center space-x-2 bg-[#F5ECDC] border border-[#D8AA67]/50 px-3 py-1.5 rounded-xl text-xs text-[#4F0809] font-bold shadow-2xs tabular-nums"
              title="Real-Time Palace Clock"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse shrink-0" />
              <Clock className="w-3.5 h-3.5 text-[#8F6628] shrink-0" />
              <span>
                {mounted
                  ? now.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })
                  : '--:--:-- --'}
              </span>
            </div>

            {/* Royal Theme Role Selector Dropdown */}
            <div className="relative" ref={roleRef}>
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center space-x-1.5 bg-[#F5ECDC] border border-[#D8AA67]/50 hover:border-[#4F0809] px-3 py-1.5 rounded-xl text-xs text-[#4F0809] font-semibold transition-all cursor-pointer shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#8F6628]" />
                <span>Role: <strong className="text-[#4F0809]">{selectedRole}</strong></span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#856B4D] transition-transform duration-200 ${
                    roleDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-[#FDF8EE] border border-[#D8AA67]/60 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="bg-gradient-to-r from-[#4F0809] to-[#6B1518] px-3.5 py-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#E1B46F]">
                      Palace Access Role
                    </span>
                    <Sparkles className="w-3 h-3 text-[#D8AA67]" />
                  </div>
                  <div className="p-1.5 space-y-1 text-xs">
                    {PALACE_ROLES.map((role) => {
                      const IconComp = role.icon;
                      const isSelected = selectedRole === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleRoleSwitch(role.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-[#4F0809] text-[#FDF8EE] shadow-xs'
                              : 'hover:bg-[#F5ECDC] text-[#302421]'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-[#6B1518] text-[#D8AA67]' : 'bg-[#F5ECDC] text-[#8F6628]'
                              }`}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className={`font-bold leading-tight ${isSelected ? 'text-[#FDF8EE]' : 'text-[#4F0809]'}`}>
                                {role.label}
                              </div>
                              <div className={`text-[10px] ${isSelected ? 'text-[#E1B46F]/90' : 'text-[#856B4D]'}`}>
                                {role.desc}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#D8AA67] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Royal Theme Notification Bell with Clear Button */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl bg-[#F5ECDC] border border-[#D8AA67]/50 text-[#4F0809] hover:border-[#4F0809] transition-all cursor-pointer shadow-2xs"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 text-[#4F0809]" />
                {activeAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#A81D24] text-[#FDF8EE] text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-xs">
                    {activeAlerts.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FDF8EE] border border-[#D8AA67]/60 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Maroon & Gold Header with Clear Button */}
                  <div className="bg-gradient-to-r from-[#4F0809] to-[#6B1518] px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-3.5 h-3.5 text-[#D8AA67]" />
                      <span className="font-bold text-xs text-[#FDF8EE] tracking-wide">
                        Operational Alerts
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#D8AA67] text-[#4F0809] text-[10px] font-extrabold">
                        {activeAlerts.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearAllNotifications}
                      disabled={activeAlerts.length === 0}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D8AA67]/20 hover:bg-[#D8AA67]/35 border border-[#D8AA67]/40 text-[#F5ECDC] text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-[#D8AA67]" />
                      <span>Clear</span>
                    </button>
                  </div>

                  {/* Alert Items Body */}
                  <div className="p-2.5 space-y-2 max-h-80 overflow-y-auto text-xs">
                    {activeAlerts.length === 0 ? (
                      <div className="py-7 px-4 text-center">
                        <div className="w-10 h-10 rounded-full bg-[#2E7D32]/15 border border-[#2E7D32]/30 flex items-center justify-center mx-auto mb-2">
                          <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
                        </div>
                        <p className="text-xs font-bold text-[#4F0809]">All Palace Alerts Cleared</p>
                        <p className="text-[11px] text-[#856B4D] mt-0.5">
                          Operations are running smoothly across Rajmahal Heritage Grand.
                        </p>
                      </div>
                    ) : (
                      activeAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          onClick={() => {
                            router.push(alert.href);
                            setNotificationsOpen(false);
                          }}
                          className="group p-2.5 rounded-xl bg-[#F5ECDC]/80 hover:bg-[#EFE2CC] border border-[#E8DFCE] flex items-start justify-between gap-2.5 transition cursor-pointer"
                        >
                          <div className="flex items-start space-x-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                alert.type === 'warning'
                                  ? 'bg-[#A81D24]/15 text-[#A81D24]'
                                  : alert.type === 'success'
                                  ? 'bg-[#2E7D32]/15 text-[#2E7D32]'
                                  : 'bg-[#D8AA67]/25 text-[#8F6628]'
                              }`}
                            >
                              {alert.type === 'warning' ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-[#4F0809] text-[11px] truncate">
                                  {alert.title}
                                </p>
                              </div>
                              <p className="text-[10px] text-[#856B4D] leading-snug mt-0.5">
                                {alert.desc}
                              </p>
                              <span className="inline-block text-[9px] font-bold text-[#8F6628] uppercase tracking-wider mt-1">
                                {alert.time}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleDismissSingleAlert(alert.id, e)}
                            title="Dismiss alert"
                            className="p-1 rounded-md text-[#856B4D] hover:text-[#4F0809] hover:bg-[#E8DFCE] opacity-60 group-hover:opacity-100 transition cursor-pointer shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
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
                  <span className="text-[10px] text-[#8F6628] font-semibold mt-0.5">
                    {selectedRole}
                  </span>
                </div>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-[#FDF8EE] border border-[#D8AA67]/60 rounded-2xl shadow-2xl py-1.5 z-50 text-xs divide-y divide-[#EFE7D8]">
                  <div className="px-3.5 py-2">
                    <p className="font-bold text-[#4F0809] truncate">
                      {staffInfo?.name || 'Staff Member'}
                    </p>
                    <p className="text-[10px] text-[#856B4D] truncate mt-0.5">
                      {staffInfo?.email || 'Registered Staff'} • <span>{selectedRole}</span>
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
