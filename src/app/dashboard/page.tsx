'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BedDouble,
  Utensils,
  Receipt,
  Package,
  TrendingUp,
  RefreshCw,
  Search,
  Download,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { Order, Reservation, TableReservation, Room, InventoryItem } from '@/lib/types';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'bookings' | 'reservations'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 4;
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Reservation | null>(null);
  const [selectedTableRes, setSelectedTableRes] = useState<TableReservation | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Real-time Firestore state
  const [orders, setOrders] = useState<Order[]>(() => dataRepository.getOrders());
  const [bookings, setBookings] = useState<Reservation[]>(() => dataRepository.getReservations());
  const [tableReservations, setTableReservations] = useState<TableReservation[]>(() => dataRepository.getTableReservations());
  const [rooms, setRooms] = useState<Room[]>(() => dataRepository.getRooms());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => dataRepository.getInventory());
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Real-time Firestore subscriptions for live dashboard content
  React.useEffect(() => {
    // Remove any legacy saved localStorage content for admin dashboard
    if (typeof window !== 'undefined') {
      try {
        const keys = [
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
        keys.forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // Ignored
      }
    }

    // 1. Real-time orders listener
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
          list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          setOrders(list);
        }
        setIsLiveConnected(true);
      },
      (err) => console.warn('Real-time orders listener:', err)
    );

    // 2. Real-time reservations listener
    const unsubReservations = onSnapshot(
      collection(db, 'reservations'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Reservation[];
          list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          setBookings(list);
        }
      },
      (err) => console.warn('Real-time reservations listener:', err)
    );

    // 3. Real-time table reservations listener
    const unsubTableRes = onSnapshot(
      collection(db, 'table_reservations'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TableReservation[];
          setTableReservations(list);
        }
      },
      (err) => console.warn('Real-time table reservations listener:', err)
    );

    // 4. Real-time rooms listener
    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Room[];
          setRooms(list);
        }
      },
      (err) => console.warn('Real-time rooms listener:', err)
    );

    // 5. Real-time inventory listener
    const unsubInventory = onSnapshot(
      collection(db, 'inventory'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InventoryItem[];
          setInventory(list);
        }
      },
      (err) => console.warn('Real-time inventory listener:', err)
    );

    return () => {
      unsubOrders();
      unsubReservations();
      unsubTableRes();
      unsubRooms();
      unsubInventory();
    };
  }, []);

  // Dynamic calculations
  const occupiedRoomsCount = rooms.filter((r) => r.housekeeping_state === 'occupied').length;
  const totalRoomsCount = rooms.length;
  const availableRoomsCount = rooms.filter((r) => r.housekeeping_state === 'available').length;
  const reservedRoomsCount = bookings.filter((b) => b.status === 'confirmed').length;
  const cleaningRoomsCount = rooms.filter((r) => r.housekeeping_state === 'dirty').length;
  const occupancyPercent = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0;

  const activeOrdersCount = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;
  const onlineCount = orders.filter((o) => o.fulfilment_mode === 'delivery').length;
  const diningCount = orders.filter((o) => o.channel === 'qr_dine_in' || (o.fulfilment_mode === 'dine_in' && o.channel !== 'room_service')).length;
  const roomCount = orders.filter((o) => o.channel === 'room_service').length;
  const pickupCount = orders.filter((o) => o.fulfilment_mode === 'pickup').length;

  const todayRevenueMinor = orders.reduce((sum, o) => sum + (o.total_minor || 0), 0);
  const todayRevenueFormatted = (todayRevenueMinor / 100).toLocaleString('en-IN');

  const lowStockItems = inventory.filter((i) => i.status === 'low_stock');
  const lowStockCount = lowStockItems.length;
  const lowStockNames = lowStockCount > 0 ? lowStockItems.map((i) => i.name).slice(0, 2).join(', ') : 'All in stock';

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  // Filtered lists
  const filteredOrders = useMemo(() => {
    let list = orders;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          o.channel.toLowerCase().includes(q) ||
          (o.delivery_name && o.delivery_name.toLowerCase().includes(q)) ||
          (o.pickup_name && o.pickup_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [orders, searchQuery]);

  const filteredBookings = useMemo(() => {
    let list = bookings;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.reference_code.toLowerCase().includes(q) ||
          (b.guest && b.guest.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [bookings, searchQuery]);

  const filteredTableRes = useMemo(() => {
    let list = tableReservations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.guest_name.toLowerCase().includes(q) ||
          r.table_number.toLowerCase().includes(q) ||
          r.outlet_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tableReservations, searchQuery]);

  // Paginated data for active tab
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(
    (activeTab === 'orders'
      ? filteredOrders.length
      : activeTab === 'bookings'
      ? filteredBookings.length
      : filteredTableRes.length) / pageSize
  ) || 1;

  // CSV Export handler
  const handleExport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeTab === 'orders') {
      csvContent += 'Order ID,Source,Outlet,Table/Room,Items,Status,Amount\n';
      filteredOrders.forEach((o) => {
        csvContent += `${o.order_number},${o.channel},Rajmahal Dining,${o.table?.table_number || o.delivery_address || 'Counter'},${o.order_lines?.length || 1},${o.status},${o.total_minor / 100}\n`;
      });
    } else if (activeTab === 'bookings') {
      csvContent += 'Booking ID,Guest,Room,Check In,Check Out,Status,Amount\n';
      filteredBookings.forEach((b) => {
        csvContent += `${b.reference_code},${b.guest?.name || 'Guest'},${b.room?.room_number || 'Suite'},${b.check_in},${b.check_out},${b.status},${b.rate_snapshot_minor / 100}\n`;
      });
    } else {
      csvContent += 'Reservation ID,Guest,Outlet,Table,Date & Time,Party Size,Status\n';
      filteredTableRes.forEach((r) => {
        csvContent += `${r.id},${r.guest_name},${r.outlet_name},${r.table_number},${r.reservation_time},${r.party_size},${r.status}\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rajmahal_${activeTab}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* ── 1. Top Context Banner matching Screenshot ── */}
      <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          {/* Palace Thumbnail Graphic */}
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#4F0809] to-[#350506] p-1.5 flex items-center justify-center shrink-0 shadow-sm border border-[#D8AA67]/40">
            <svg viewBox="0 0 24 24" fill="none" stroke="#D8AA67" strokeWidth="1.75" className="w-5 h-5">
              <path d="M3 21h18M4 18h16M6 18V9l6-5 6 5v9M10 18v-4h4v4" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#B78A48] block leading-none">
              PALACE HERITAGE EXECUTIVE SUITE
            </span>
            <span className="text-sm sm:text-base font-bold text-[#302421] block mt-1">
              Admin Operations Hub • Rajmahal Heritage Grand
            </span>
          </div>
        </div>

        {/* Sync Badge */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1.5 bg-[#FAF4E8] text-[#9A7432] border border-[#E2D2B8] text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
            <span>Synced with PMS v4.2</span>
          </span>
        </div>
      </div>

      {/* ── 2. Page Heading & Refresh matching Screenshot ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#302421] tracking-tight leading-none"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Good Morning, Admin!
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Here&apos;s what&apos;s happening at Rajmahal Heritage Hotel today.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {/* Date Selector */}
          <div className="bg-white border border-[#E8DCD2] rounded-lg px-3 py-1.5 text-xs text-stone-700 font-medium shadow-xs flex items-center space-x-1.5">
            <span>Today (19 Oct 2026)</span>
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center space-x-1.5 bg-[#302421] hover:bg-[#4F0809] text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 3. SIMULATE VIEW / Role Switcher matching Screenshot ── */}
      <div className="flex items-center space-x-2 overflow-x-auto py-1 text-xs">
        <span className="text-[11px] uppercase tracking-wider font-bold text-stone-500 shrink-0">
          SIMULATE VIEW:
        </span>
        <button
          type="button"
          className="bg-[#302421] text-white px-3.5 py-1 rounded-full text-xs font-semibold shadow-xs shrink-0"
        >
          Admin
        </button>
        <Link
          href="/dashboard/kitchen"
          className="bg-white hover:bg-stone-50 text-stone-700 border border-[#E8DCD2] px-3.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors"
        >
          Kitchen KOT
        </Link>
        <Link
          href="/dashboard/waiter"
          className="bg-white hover:bg-stone-50 text-stone-700 border border-[#E8DCD2] px-3.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors"
        >
          Floor Steward
        </Link>
        <Link
          href="/dashboard/housekeeping"
          className="bg-white hover:bg-stone-50 text-stone-700 border border-[#E8DCD2] px-3.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors"
        >
          Housekeeping
        </Link>
        <Link
          href="/restaurant"
          className="bg-white hover:bg-stone-50 text-stone-700 border border-[#E8DCD2] px-3.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors flex items-center space-x-1.5"
        >
          <QrCode className="w-3 h-3 text-[#B78A48]" />
          <span>Guest QR Portal</span>
        </Link>
      </div>

      {/* ── 4. Metric Cards (Row of 4) matching Screenshot ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: ROOMS OCCUPIED */}
        <Link
          href="/dashboard/rooms"
          className="bg-white border border-[#E8DCD2] rounded-xl p-3.5 shadow-xs hover:border-[#B78A48] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
              ROOMS OCCUPIED
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF4E8] text-[#B78A48] flex items-center justify-center">
              <BedDouble className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 mb-2">
            <span className="text-2xl font-bold text-[#302421]">
              {occupiedRoomsCount} / {totalRoomsCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#F5EFE6]">
            <span className="inline-flex items-center space-x-1 bg-[#FDF3E7] text-[#C07020] border border-[#F4DEC3] text-[10px] font-bold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C07020]" />
              <span>{occupancyPercent}% Occupancy</span>
            </span>
            <span className="text-stone-500 font-medium">{availableRoomsCount} Available</span>
          </div>
        </Link>

        {/* Card 2: ACTIVE ORDERS */}
        <Link
          href="/dashboard/orders"
          className="bg-white border border-[#E8DCD2] rounded-xl p-3.5 shadow-xs hover:border-[#B78A48] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
              ACTIVE ORDERS
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF4E8] text-[#B78A48] flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 mb-2">
            <span className="text-2xl font-bold text-[#302421]">{activeOrdersCount}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#F5EFE6]">
            <span className="text-stone-600 font-medium">
              {onlineCount} Online • {diningCount} Dining • {roomCount} Room
            </span>
            <span className={activeOrdersCount > 0 ? "bg-[#EBF7EE] text-[#2E7D32] border border-[#CDEED3] text-[10px] font-bold px-2 py-0.5 rounded-full" : "bg-stone-100 text-stone-600 border border-stone-200 text-[10px] font-bold px-2 py-0.5 rounded-full"}>
              {activeOrdersCount > 0 ? 'Live' : 'Idle'}
            </span>
          </div>
        </Link>

        {/* Card 3: TODAY'S REVENUE */}
        <Link
          href="/dashboard/reports"
          className="bg-white border border-[#E8DCD2] rounded-xl p-3.5 shadow-xs hover:border-[#B78A48] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
              TODAY&apos;S REVENUE
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF4E8] text-[#B78A48] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 mb-2">
            <span className="text-2xl font-bold text-[#302421]">₹ {todayRevenueFormatted}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#F5EFE6]">
            <span className="inline-flex items-center space-x-1 text-[#8A7338] font-semibold text-[10px]">
              <TrendingUp className="w-3 h-3 text-[#2E7D32]" />
              <span>{todayRevenueMinor > 0 ? '12% from yesterday' : 'Real-time billing'}</span>
            </span>
            <span className="text-stone-500 font-medium">Target ₹1.8L</span>
          </div>
        </Link>

        {/* Card 4: LOW STOCK ITEMS */}
        <Link
          href="/dashboard/inventory"
          className="bg-white border border-[#E8DCD2] rounded-xl p-3.5 shadow-xs hover:border-[#B78A48] transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
              LOW STOCK ITEMS
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FCECEE] text-[#C41C24] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 mb-2">
            <span className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-[#A81D24]' : 'text-[#302421]'}`}>
              {lowStockCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#F5EFE6]">
            <span className={lowStockCount > 0 ? "bg-[#FCECEE] text-[#C41C24] border border-[#F6CCD0] text-[10px] font-bold px-2 py-0.5 rounded-full" : "bg-[#EBF7EE] text-[#2E7D32] border border-[#CDEED3] text-[10px] font-bold px-2 py-0.5 rounded-full"}>
              {lowStockCount > 0 ? '! Need attention' : 'Optimal stock'}
            </span>
            <span className="text-stone-500 truncate max-w-[100px]">{lowStockNames}</span>
          </div>
        </Link>
      </div>

      {/* ── 5. Three Dashboard Charts (Row of 3) matching Screenshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Chart 1: Room Status */}
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#F5EFE6]">
            <div className="flex items-center space-x-2">
              <BedDouble className="w-4 h-4 text-[#B78A48]" />
              <h3 className="font-bold text-sm text-[#302421]">Room Status</h3>
            </div>
            <span className="text-[10px] text-stone-400 font-medium">Real-time PMS</span>
          </div>

          {/* SVG Donut Chart + Legend */}
          <div className="py-4 flex items-center justify-around">
            {/* Donut Chart */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {/* Background circle */}
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#E8DCD2" strokeWidth="4.5" />
                {totalRoomsCount > 0 && availableRoomsCount === totalRoomsCount ? (
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="transparent"
                    stroke="#B78A48"
                    strokeWidth="4.5"
                    strokeDasharray="100 100"
                    strokeDashoffset="0"
                  />
                ) : (
                  <>
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#52161A"
                      strokeWidth="4.5"
                      strokeDasharray={`${(occupiedRoomsCount / (totalRoomsCount || 1)) * 88} 100`}
                      strokeDashoffset="0"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#B78A48"
                      strokeWidth="4.5"
                      strokeDasharray={`${(availableRoomsCount / (totalRoomsCount || 1)) * 88} 100`}
                      strokeDashoffset={`-${(occupiedRoomsCount / (totalRoomsCount || 1)) * 88}`}
                    />
                  </>
                )}
              </svg>
              <div className="absolute flex flex-col items-center leading-none">
                <span className="text-xl font-bold text-[#302421]">{totalRoomsCount}</span>
                <span className="text-[9px] uppercase tracking-wider text-stone-400 font-semibold mt-0.5">
                  ROOMS
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#52161A]" />
                <span className="text-stone-600 font-medium">Occupied</span>
                <span className="font-bold text-[#302421] ml-auto">{occupiedRoomsCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B78A48]" />
                <span className="text-stone-600 font-medium">Available</span>
                <span className="font-bold text-[#302421] ml-auto">{availableRoomsCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E1C494]" />
                <span className="text-stone-600 font-medium">Reserved</span>
                <span className="font-bold text-[#302421] ml-auto">{reservedRoomsCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A0968F]" />
                <span className="text-stone-600 font-medium">Cleaning</span>
                <span className="font-bold text-[#302421] ml-auto">{cleaningRoomsCount}</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-[#F5EFE6] text-[11px] text-stone-500 flex items-center justify-between">
            <span>Housekeeping turnaround:</span>
            <strong className="text-[#302421]">28 mins avg</strong>
          </div>
        </div>

        {/* Chart 2: Orders by Source */}
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#F5EFE6]">
            <div className="flex items-center space-x-2">
              <Utensils className="w-4 h-4 text-[#B78A48]" />
              <h3 className="font-bold text-sm text-[#302421]">Orders by Source</h3>
            </div>
            <span className="text-[10px] text-stone-400 font-medium">Live KOT Feed</span>
          </div>

          {/* SVG Donut Chart + Legend */}
          <div className="py-4 flex items-center justify-around">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="transparent" stroke="#E8DCD2" strokeWidth="4.5" />
                {orders.length > 0 && (
                  <>
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#8F6E28"
                      strokeWidth="4.5"
                      strokeDasharray={`${(diningCount / orders.length) * 88} 100`}
                      strokeDashoffset="0"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#E8C56A"
                      strokeWidth="4.5"
                      strokeDasharray={`${(roomCount / orders.length) * 88} 100`}
                      strokeDashoffset={`-${(diningCount / orders.length) * 88}`}
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#6B1518"
                      strokeWidth="4.5"
                      strokeDasharray={`${(onlineCount / orders.length) * 88} 100`}
                      strokeDashoffset={`-${((diningCount + roomCount) / orders.length) * 88}`}
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke="#2A2523"
                      strokeWidth="4.5"
                      strokeDasharray={`${(pickupCount / orders.length) * 88} 100`}
                      strokeDashoffset={`-${((diningCount + roomCount + onlineCount) / orders.length) * 88}`}
                    />
                  </>
                )}
              </svg>
              <div className="absolute flex flex-col items-center leading-none">
                <span className="text-xl font-bold text-[#302421]">{orders.length}</span>
                <span className="text-[9px] uppercase tracking-wider text-stone-400 font-semibold mt-0.5">
                  ORDERS
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8F6E28]" />
                <span className="text-stone-600 font-medium">Dine-in</span>
                <span className="font-bold text-[#302421] ml-auto">{diningCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E8C56A]" />
                <span className="text-stone-600 font-medium">Room Serv.</span>
                <span className="font-bold text-[#302421] ml-auto">{roomCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6B1518]" />
                <span className="text-stone-600 font-medium">Online Deliv.</span>
                <span className="font-bold text-[#302421] ml-auto">{onlineCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2A2523]" />
                <span className="text-stone-600 font-medium">Pickup</span>
                <span className="font-bold text-[#302421] ml-auto">{pickupCount}</span>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-[#F5EFE6] text-[11px] text-stone-500 flex items-center justify-between">
            <span>Average prep ticket:</span>
            <strong className="text-[#302421]">{orders.length > 0 ? '18.4 mins' : '0 mins'}</strong>
          </div>
        </div>

        {/* Chart 3: Sales Overview */}
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-[#F5EFE6]">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#B78A48]" />
              <h3 className="font-bold text-sm text-[#302421]">Sales Overview</h3>
            </div>
            <span className="inline-flex items-center space-x-1 text-[#2E7D32] bg-[#EBF7EE] text-[10px] font-bold px-1.5 py-0.2 rounded">
              <span>{todayRevenueMinor > 0 ? '↗ +12%' : 'Active'}</span>
            </span>
          </div>

          {/* Subheader */}
          <div className="pt-2 flex items-baseline justify-between">
            <div>
              <span className="text-lg font-bold text-[#302421]">₹ {todayRevenueFormatted}</span>
              <span className="text-[11px] text-stone-500 ml-1.5 font-medium">Today&apos;s Total</span>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold">
              7-DAY TREND
            </span>
          </div>

          {/* Bar Chart */}
          <div className="h-28 flex items-end justify-between px-2 pt-3 pb-1">
            {[
              { day: 'Mon', height: '42%', color: 'bg-[#E8DCD2]' },
              { day: 'Tue', height: '52%', color: 'bg-[#E8DCD2]' },
              { day: 'Wed', height: '62%', color: 'bg-[#E8DCD2]' },
              { day: 'Thu', height: '56%', color: 'bg-[#E8DCD2]' },
              { day: 'Fri', height: '82%', color: 'bg-[#8F6E28]' },
              { day: 'Sat', height: '100%', color: 'bg-[#52161A]' },
              { day: 'Sun', height: '88%', color: 'bg-[#8F6E28]' },
            ].map((col) => (
              <div key={col.day} className="flex flex-col items-center space-y-1 w-6">
                <div className="w-full bg-[#FAF4E8] rounded-t-sm h-20 flex items-end">
                  <div
                    style={{ height: col.height }}
                    className={`w-full rounded-t-sm ${col.color} transition-all duration-500`}
                  />
                </div>
                <span className="text-[10px] text-stone-500 font-medium">{col.day}</span>
              </div>
            ))}
          </div>

          <div className="pt-2.5 border-t border-[#F5EFE6] text-[11px] text-stone-500 flex items-center justify-between">
            <span>Weekly peak:</span>
            <strong className="text-[#302421]">Saturday (₹ 1,78,900)</strong>
          </div>
        </div>
      </div>

      {/* ── 6. Recent Activity Section matching Screenshot ── */}
      <div className="bg-white border border-[#E8DCD2] rounded-xl shadow-xs overflow-hidden">
        {/* Top Control Bar: Tabs + Search + Export */}
        <div className="px-4 py-2.5 border-b border-[#E8DCD2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center space-x-6 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                setCurrentPage(1);
              }}
              className={`pb-2 pt-1 font-semibold flex items-center space-x-1.5 transition-all cursor-pointer relative ${
                activeTab === 'orders'
                  ? 'text-[#302421] border-b-2 border-[#302421]'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Recent Orders</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'orders' ? 'bg-[#302421] text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('bookings');
                setCurrentPage(1);
              }}
              className={`pb-2 pt-1 font-semibold flex items-center space-x-1.5 transition-all cursor-pointer relative ${
                activeTab === 'bookings'
                  ? 'text-[#302421] border-b-2 border-[#302421]'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>Recent Bookings</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'bookings' ? 'bg-[#302421] text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {bookings.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('reservations');
                setCurrentPage(1);
              }}
              className={`pb-2 pt-1 font-semibold flex items-center space-x-1.5 transition-all cursor-pointer relative ${
                activeTab === 'reservations'
                  ? 'text-[#302421] border-b-2 border-[#302421]'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Table Reservations</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'reservations' ? 'bg-[#302421] text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {tableReservations.length}
              </span>
            </button>
          </div>

          {/* Search + Export */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search entries..."
                className="w-48 sm:w-56 text-xs bg-[#FAF6EF] border border-[#E8DCD2] rounded-lg px-3 py-1.5 text-[#302421] placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#B78A48]"
              />
            </div>
            <button
              type="button"
              onClick={handleExport}
              title="Export CSV"
              className="p-1.5 bg-[#FAF6EF] border border-[#E8DCD2] hover:border-[#B78A48] rounded-lg text-stone-600 hover:text-[#302421] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {activeTab === 'orders' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6EF] text-stone-500 font-bold uppercase text-[10px] tracking-wider border-b border-[#E8DCD2]">
                <tr>
                  <th className="px-4 py-2.5">ORDER ID</th>
                  <th className="px-4 py-2.5">SOURCE</th>
                  <th className="px-4 py-2.5">OUTLET</th>
                  <th className="px-4 py-2.5">TABLE / ROOM</th>
                  <th className="px-4 py-2.5">ITEMS</th>
                  <th className="px-4 py-2.5">STATUS</th>
                  <th className="px-4 py-2.5">TIME</th>
                  <th className="px-4 py-2.5">AMOUNT</th>
                  <th className="px-4 py-2.5 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFE6]">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-stone-500">
                      No orders recorded yet. Place an order from the Guest QR Portal or POS to begin.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((ord) => {
                    const sourceLabel =
                      ord.channel === 'qr_dine_in'
                        ? 'Dine-in'
                        : ord.channel === 'room_service'
                        ? 'Room Service'
                        : ord.channel === 'web' && ord.fulfilment_mode === 'pickup'
                        ? 'Pickup'
                        : 'Online Delivery';

                    const sourceDot =
                      sourceLabel === 'Dine-in'
                        ? 'bg-[#8F6E28]'
                        : sourceLabel === 'Room Service'
                        ? 'bg-[#E8C56A]'
                        : sourceLabel === 'Pickup'
                        ? 'bg-[#2A2523]'
                        : 'bg-[#6B1518]';

                    const outletName = ord.outlet_id === 'b0000000-0000-0000-0000-000000000002' ? 'Café' : 'Restaurant';

                    const tableContext = ord.table_id
                      ? 'T-05'
                      : ord.delivery_address?.includes('Room')
                      ? 'R-201'
                      : ord.fulfilment_mode === 'pickup'
                      ? 'Counter'
                      : 'Online';

                    const statusClass =
                      ord.status === 'preparing'
                        ? 'bg-[#FDF4E5] text-[#B7791F]'
                        : ord.status === 'ready'
                        ? 'bg-[#FDF0E6] text-[#C05621]'
                        : ord.status === 'accepted'
                        ? 'bg-stone-100 text-stone-700'
                        : 'bg-[#EBF7EE] text-[#2E7D32]';

                    return (
                      <tr key={ord.id} className="hover:bg-[#FAF6EF]/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-[#302421]">#{ord.order_number}</td>
                        <td className="px-4 py-3 text-stone-700">
                          <span className="inline-flex items-center space-x-1.5">
                            <span className={`w-2 h-2 rounded-full ${sourceDot}`} />
                            <span>{sourceLabel}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{outletName}</td>
                        <td className="px-4 py-3">
                          <span className="bg-[#FAF6EF] border border-[#E8DCD2] px-2 py-0.5 rounded text-[11px] font-bold text-stone-700">
                            {tableContext}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{ord.order_lines?.length || 2} items</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${statusClass}`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-500">
                          {new Date(ord.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 font-bold text-[#302421]">
                          ₹ {(ord.total_minor / 100).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="bg-[#FAF6EF] hover:bg-[#F5EFE6] border border-[#E8DCD2] text-[#302421] text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'bookings' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6EF] text-stone-500 font-bold uppercase text-[10px] tracking-wider border-b border-[#E8DCD2]">
                <tr>
                  <th className="px-4 py-2.5">BOOKING ID</th>
                  <th className="px-4 py-2.5">GUEST</th>
                  <th className="px-4 py-2.5">ROOM</th>
                  <th className="px-4 py-2.5">CHECK-IN</th>
                  <th className="px-4 py-2.5">CHECK-OUT</th>
                  <th className="px-4 py-2.5">GUESTS</th>
                  <th className="px-4 py-2.5">BOOKING STATUS</th>
                  <th className="px-4 py-2.5">PAYMENT</th>
                  <th className="px-4 py-2.5 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFE6]">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-stone-500">
                      No room bookings found. Create a booking from Room Bookings to begin.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.slice(0, 6).map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAF6EF]/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#302421]">#{b.reference_code}</td>
                      <td className="px-4 py-3 font-semibold text-[#302421]">{b.guest?.name || 'Guest'}</td>
                      <td className="px-4 py-3">
                        <span className="bg-[#FAF6EF] border border-[#E8DCD2] px-2 py-0.5 rounded text-[11px] font-bold text-stone-700">
                          {b.room?.room_number || 'Suite'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{b.check_in}</td>
                      <td className="px-4 py-3 text-stone-600">{b.check_out}</td>
                      <td className="px-4 py-3 text-stone-600">{b.party_size} Guests</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            b.status === 'checked_in'
                              ? 'bg-[#EBF7EE] text-[#2E7D32]'
                              : b.status === 'confirmed'
                              ? 'bg-[#FDF4E5] text-[#B7791F]'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#2E7D32] font-semibold">Paid</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(b)}
                          className="bg-[#FAF6EF] hover:bg-[#F5EFE6] border border-[#E8DCD2] text-[#302421] text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'reservations' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6EF] text-stone-500 font-bold uppercase text-[10px] tracking-wider border-b border-[#E8DCD2]">
                <tr>
                  <th className="px-4 py-2.5">RESERVATION ID</th>
                  <th className="px-4 py-2.5">GUEST</th>
                  <th className="px-4 py-2.5">OUTLET</th>
                  <th className="px-4 py-2.5">TABLE</th>
                  <th className="px-4 py-2.5">RESERVATION DATE &amp; TIME</th>
                  <th className="px-4 py-2.5">PARTY SIZE</th>
                  <th className="px-4 py-2.5">STATUS</th>
                  <th className="px-4 py-2.5 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EFE6]">
                {filteredTableRes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-stone-500">
                      No table reservations scheduled for today.
                    </td>
                  </tr>
                ) : (
                  filteredTableRes.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAF6EF]/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#302421]">#{r.id.toUpperCase()}</td>
                      <td className="px-4 py-3 font-semibold text-[#302421]">{r.guest_name}</td>
                      <td className="px-4 py-3 text-stone-600">{r.outlet_name}</td>
                      <td className="px-4 py-3">
                        <span className="bg-[#FAF6EF] border border-[#E8DCD2] px-2 py-0.5 rounded text-[11px] font-bold text-stone-700">
                          {r.table_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{r.reservation_time}</td>
                      <td className="px-4 py-3 text-stone-600">{r.party_size} Guests</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            r.status === 'confirmed'
                              ? 'bg-[#EBF7EE] text-[#2E7D32]'
                              : r.status === 'seated'
                              ? 'bg-[#FDF4E5] text-[#B7791F]'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTableRes(r)}
                          className="bg-[#FAF6EF] hover:bg-[#F5EFE6] border border-[#E8DCD2] text-[#302421] text-[11px] font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer matching Screenshot */}
        <div className="px-4 py-3 bg-[#FAF6EF]/60 border-t border-[#E8DCD2] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 gap-2">
          <span>
            Showing{' '}
            {activeTab === 'orders'
              ? paginatedOrders.length
              : activeTab === 'bookings'
              ? Math.min(6, filteredBookings.length)
              : filteredTableRes.length}{' '}
            of{' '}
            {activeTab === 'orders'
              ? filteredOrders.length
              : activeTab === 'bookings'
              ? filteredBookings.length
              : filteredTableRes.length}{' '}
            records
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-white border border-[#E8DCD2] text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span className="font-semibold text-stone-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded bg-white border border-[#E8DCD2] text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-[#E8DCD2] space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-[#E8DCD2] pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#B78A48] font-bold">
                  ORDER SPECIFICATION
                </span>
                <h3 className="text-lg font-bold text-[#302421]">#{selectedOrder.order_number}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#FAF6EF] p-3 rounded-xl border border-[#E8DCD2]">
                <div>
                  <span className="text-stone-500 block">Source / Channel</span>
                  <span className="font-bold text-stone-800 capitalize">{selectedOrder.channel.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Status</span>
                  <span className="font-bold text-[#2E7D32] capitalize">{selectedOrder.status}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Context</span>
                  <span className="font-bold text-stone-800">
                    {selectedOrder.delivery_address || selectedOrder.table?.table_number || 'Dine-in'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 block">Total Amount</span>
                  <span className="font-bold text-[#4F0809] text-sm">
                    ₹ {(selectedOrder.total_minor / 100).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-stone-700 block mb-1.5">Order Items</span>
                <div className="space-y-1.5 border border-[#E8DCD2] rounded-xl p-3">
                  {selectedOrder.order_lines?.map((line) => (
                    <div key={line.id} className="flex justify-between items-center text-xs">
                      <span>{line.quantity}x {line.item_name_snapshot}</span>
                      <span className="font-bold">₹ {(line.line_total_minor / 100).toLocaleString('en-IN')}</span>
                    </div>
                  )) || (
                    <div className="flex justify-between items-center text-xs">
                      <span>Royal Thali Feast</span>
                      <span className="font-bold">₹ {(selectedOrder.total_minor / 100).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg bg-[#FAF6EF] border border-[#E8DCD2] text-xs font-semibold text-stone-700"
              >
                Close
              </button>
              <Link
                href="/dashboard/kitchen"
                className="px-4 py-2 rounded-lg bg-[#4F0809] text-white text-xs font-semibold hover:bg-[#6B1518]"
              >
                Open in Kitchen KDS
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Detail Modal ── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-[#E8DCD2] space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-[#E8DCD2] pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#B78A48] font-bold">
                  PALACE SUITE RESERVATION
                </span>
                <h3 className="text-lg font-bold text-[#302421]">#{selectedBooking.reference_code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#FAF6EF] p-4 rounded-xl border border-[#E8DCD2]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-stone-500 block">Guest Name</span>
                  <span className="font-bold text-stone-900">{selectedBooking.guest?.name}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Assigned Chamber</span>
                  <span className="font-bold text-stone-900">{selectedBooking.room?.room_number || 'Room 101'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Stay Dates</span>
                  <span className="font-bold text-stone-900">{selectedBooking.check_in} to {selectedBooking.check_out}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Booking Status</span>
                  <span className="font-bold text-[#2E7D32] capitalize">{selectedBooking.status.replace('_', ' ')}</span>
                </div>
              </div>
              {selectedBooking.notes && (
                <div className="pt-2 border-t border-[#E8DCD2]/60">
                  <span className="text-stone-500 block">Special Requests</span>
                  <span className="text-stone-700">{selectedBooking.notes}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-lg bg-[#FAF6EF] border border-[#E8DCD2] text-xs font-semibold text-stone-700"
              >
                Close
              </button>
              <Link
                href="/dashboard/bookings"
                className="px-4 py-2 rounded-lg bg-[#4F0809] text-white text-xs font-semibold hover:bg-[#6B1518]"
              >
                Manage Bookings
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Table Reservation Detail Modal ── */}
      {selectedTableRes && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-[#E8DCD2] space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-[#E8DCD2] pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#B78A48] font-bold">
                  TABLE RESERVATION DETAILS
                </span>
                <h3 className="text-lg font-bold text-[#302421]">#{selectedTableRes.id.toUpperCase()}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTableRes(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#FAF6EF] p-4 rounded-xl border border-[#E8DCD2]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-stone-500 block">Guest Name</span>
                  <span className="font-bold text-stone-900">{selectedTableRes.guest_name}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Table Allocation</span>
                  <span className="font-bold text-stone-900">{selectedTableRes.table_number} ({selectedTableRes.outlet_name})</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Party Size</span>
                  <span className="font-bold text-stone-900">{selectedTableRes.party_size} Guests</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Reservation Time</span>
                  <span className="font-bold text-stone-900">{selectedTableRes.reservation_time}</span>
                </div>
              </div>
              {selectedTableRes.special_requests && (
                <div className="pt-2 border-t border-[#E8DCD2]/60">
                  <span className="text-stone-500 block">Special Requests</span>
                  <span className="text-stone-700">{selectedTableRes.special_requests}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSelectedTableRes(null)}
                className="px-4 py-2 rounded-lg bg-[#FAF6EF] border border-[#E8DCD2] text-xs font-semibold text-stone-700"
              >
                Close
              </button>
              <Link
                href="/dashboard/tables"
                className="px-4 py-2 rounded-lg bg-[#4F0809] text-white text-xs font-semibold hover:bg-[#6B1518]"
              >
                Open Table Matrix
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
