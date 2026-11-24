'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ChefHat,
  Clock,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  UtensilsCrossed,
  BedDouble,
  Bike,
  Package,
  Search,
  Filter,
  Check,
  X,
  Play,
  Volume2,
  VolumeX,
  Flame,
  Coffee,
  Sparkles,
  Maximize2,
  Minimize2,
  Undo2,
  History,
  Timer,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ordersService } from '@/lib/services/orders-service';
import { dataRepository } from '@/lib/data/repository';
import type { Order, Outlet } from '@/lib/types';

function getOrderTimestamp(created_at: any): number {
  if (!created_at) return Date.now();
  if (typeof created_at === 'object' && typeof created_at.seconds === 'number') {
    return created_at.seconds * 1000;
  }
  if (typeof created_at?.toDate === 'function') {
    return created_at.toDate().getTime();
  }
  const t = new Date(created_at).getTime();
  return isNaN(t) ? Date.now() : t;
}

function formatOrderTime(created_at: any): string {
  const ms = getOrderTimestamp(created_at);
  if (!ms) return 'Just now';
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOrderLocation(order: Order): string {
  // 1. Explicit table_number
  if (order.table_number) {
    const val = String(order.table_number).trim();
    if (val.toLowerCase().startsWith('table') || val.toLowerCase().startsWith('room')) {
      return val;
    }
    return `Table ${val}`;
  }

  // 2. Room number
  if (order.room_number) {
    return `Suite Room ${order.room_number}`;
  }

  // 3. Table relation or table_id
  if (order.table?.table_number) {
    return order.table.table_number.toLowerCase().startsWith('table')
      ? order.table.table_number
      : `Table ${order.table.table_number}`;
  }
  if (order.table_id) {
    const val = String(order.table_id).trim();
    const lower = val.toLowerCase();
    if (lower.startsWith('room')) {
      return `Suite ${val}`;
    }
    if (lower.startsWith('table') || lower.startsWith('t-')) {
      return val;
    }
    return `Table ${val}`;
  }

  // 4. Delivery notes
  if (order.delivery_notes) {
    const match = order.delivery_notes.match(/(?:Table\/Room|Table|Room|Suite)\s*:\s*([^\n,]+)/i);
    if (match && match[1]) {
      const extracted = match[1].trim();
      if (extracted.toLowerCase().startsWith('room')) {
        return `Suite ${extracted}`;
      }
      if (extracted.toLowerCase().startsWith('table')) {
        return extracted;
      }
      return `Table ${extracted}`;
    }
  }

  // 5. Fulfillment mode
  const mode = order.order_type || order.fulfilment_mode;
  if (mode === 'delivery') return 'Online Delivery';
  if (mode === 'room_service') return 'Room Service';
  if (mode === 'dine_in') return 'Table T-01';
  if (mode === 'pickup') return 'Counter Pickup';

  return 'Table T-01';
}

export default function KitchenOrderBoardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  // Live real-time aging clock ticker (updates every 15s)
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  const prevPendingCountRef = useRef<number>(0);

  // Web Audio royal chime (D5 -> A5 two-tone chime)
  const playKitchenChime = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.5);

      // Tone 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.18);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.18);
      osc2.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio permissions or unsupported
    }
  }, []);

  useEffect(() => {
    // Clear any legacy localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('dashboard_kitchen_orders');
      } catch {}
    }

    // Real-time Firestore orders listener
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
          list.sort((a, b) => getOrderTimestamp(b.created_at) - getOrderTimestamp(a.created_at));
          setOrders(list);
        } else {
          setOrders(dataRepository.getOrders());
        }
      },
      (err) => {
        console.warn('Real-time kitchen orders listener:', err);
        setOrders(dataRepository.getOrders());
      }
    );

    const unsubOutlets = onSnapshot(
      collection(db, 'outlets'),
      (snap) => {
        if (!snap.empty) {
          setOutlets(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Outlet[]);
        } else {
          setOutlets(dataRepository.getOutlets());
        }
      },
      () => setOutlets(dataRepository.getOutlets())
    );

    return () => {
      unsubOrders();
      unsubOutlets();
    };
  }, []);

  // Audio trigger on newly arrived pending orders
  useEffect(() => {
    const currentPending = orders.filter((o) => o.status === 'new' || o.status === 'accepted').length;
    if (currentPending > prevPendingCountRef.current && soundEnabled && prevPendingCountRef.current > 0) {
      playKitchenChime();
    }
    prevPendingCountRef.current = currentPending;
  }, [orders, soundEnabled, playKitchenChime]);

  // Toast notification auto-dismiss
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleUpdateStatus = async (orderId: string, nextStatus: Order['status'], reason?: string) => {
    try {
      await ordersService.updateOrderStatus(orderId, nextStatus, reason);
      const targetOrder = orders.find((o) => o.id === orderId);
      const orderNum = targetOrder ? `#${targetOrder.order_number}` : 'Order';
      const label =
        nextStatus === 'preparing'
          ? 'Cooking started'
          : nextStatus === 'ready'
          ? 'Marked Ready at Pass'
          : nextStatus === 'served'
          ? 'Handed over to Steward (Served)'
          : nextStatus === 'completed'
          ? 'Settled & Completed'
          : `Status: ${nextStatus}`;
      setNotification({ msg: `${orderNum}: ${label}`, type: 'success' });
    } catch {
      dataRepository.updateOrderStatus(orderId, nextStatus, reason);
    }
  };

  const getTicketAgeMinutes = (createdAt: any) => {
    const orderMs = getOrderTimestamp(createdAt);
    const diff = now - orderMs;
    return Math.max(0, Math.floor(diff / 60000));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Only active kitchen orders
  const activeOrders = useMemo(() => {
    return orders.filter((o) => {
      const isKitchenActive = ['new', 'accepted', 'preparing', 'ready'].includes(o.status);
      const matchesOutlet = selectedOutlet === 'all' || o.outlet_id === selectedOutlet;
      const matchesSource =
        sourceFilter === 'all' ||
        (o.order_type || o.fulfilment_mode) === sourceFilter;
      const q = searchQuery.toLowerCase();
      const loc = getOrderLocation(o).toLowerCase();
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        loc.includes(q) ||
        (o.table?.table_number && o.table.table_number.toLowerCase().includes(q)) ||
        (o.room_number && o.room_number.toLowerCase().includes(q));

      // Station filter matching item names
      let matchesStation = true;
      if (stationFilter !== 'all') {
        const lines = (o.items || o.order_lines || []) as Array<{
          menu_item?: { name?: string };
          item_name_snapshot?: string;
        }>;
        const allItemNames = lines
          .map((l) => (l.menu_item?.name || l.item_name_snapshot || '').toLowerCase())
          .join(' ');
        if (stationFilter === 'tandoor') {
          matchesStation = /naan|roti|kebab|tikka|tandoori|kulcha|paneer tikka/.test(allItemNames);
        } else if (stationFilter === 'curry') {
          matchesStation = /curry|dal|baati|laal maas|gatta|paneer|biryani|pulao/.test(allItemNames);
        } else if (stationFilter === 'cafe') {
          matchesStation = /chai|coffee|lassi|shake|beverage|tea|juice/.test(allItemNames);
        } else if (stationFilter === 'desserts') {
          matchesStation = /halwa|kheer|rabdi|dessert|malpua|ghewar/.test(allItemNames);
        }
      }

      return isKitchenActive && matchesOutlet && matchesSource && matchesStation && matchesSearch;
    });
  }, [orders, selectedOutlet, sourceFilter, stationFilter, searchQuery]);

  const newOrders = activeOrders.filter((o) => o.status === 'new' || o.status === 'accepted');
  const preparingOrders = activeOrders.filter((o) => o.status === 'preparing');
  const readyOrders = activeOrders.filter((o) => o.status === 'ready');
  const servedOrders = orders
    .filter((o) => o.status === 'served' || o.status === 'completed')
    .slice(0, 8);

  const delayedCount = activeOrders.filter((o) => getTicketAgeMinutes(o.created_at) >= 20).length;

  const getSourceIcon = (type: Order['order_type']) => {
    switch (type) {
      case 'dine_in':
        return <UtensilsCrossed className="w-3.5 h-3.5 text-[#8F6628]" />;
      case 'room_service':
        return <BedDouble className="w-3.5 h-3.5 text-[#B78A48]" />;
      case 'delivery':
        return <Bike className="w-3.5 h-3.5 text-[#4F0809]" />;
      case 'pickup':
        return <Package className="w-3.5 h-3.5 text-[#2E7D32]" />;
      default:
        return <UtensilsCrossed className="w-3.5 h-3.5 text-[#8F6628]" />;
    }
  };

  const renderTicket = (order: Order) => {
    const destination = getOrderLocation(order);
    const isRoom = destination.toLowerCase().includes('room') || destination.toLowerCase().includes('suite');
    const isTable = destination.toLowerCase().includes('table');

    const ageMins = getTicketAgeMinutes(order.created_at);
    const isUrgent = ageMins >= 20;
    const isWarning = ageMins >= 10 && ageMins < 20;

    let cardClasses = 'bg-white rounded-xl p-3.5 shadow-xs transition flex flex-col justify-between border';
    if (isUrgent && order.status !== 'ready') {
      cardClasses += ' border-rose-500 bg-rose-50/50 ring-2 ring-rose-400 animate-pulse';
    } else if (isWarning && order.status !== 'ready') {
      cardClasses += ' border-amber-400 bg-amber-50/30 ring-1 ring-amber-300';
    } else {
      cardClasses += ' border-[#E8DCD2] hover:shadow-md';
    }

    const orderChannel = order.order_type || order.fulfilment_mode || 'dine_in';

    return (
      <div key={order.id} className={cardClasses}>
        <div>
          {/* Ticket Header */}
          <div className="flex items-start justify-between gap-1 pb-2 mb-2 border-b border-[#E8DCD2]">
            <div>
              <span className="font-mono font-bold text-xs text-[#4F0809]">
                KOT #{order.order_number}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                    isUrgent && order.status !== 'ready'
                      ? 'bg-rose-600 text-white font-mono'
                      : isWarning && order.status !== 'ready'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-mono'
                      : 'bg-[#FBF6EF] text-[#81736D] font-mono'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{ageMins}m ago</span>
                </span>
                <span className="text-[10px] text-[#81736D]">
                  {formatOrderTime(order.created_at)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 capitalize text-[10px] font-semibold px-2 py-0.5 bg-[#F6EAE0] rounded text-[#302421]">
              {getSourceIcon(orderChannel as Order['order_type'])}
              <span>{orderChannel.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Table / Room Banner */}
          <div className="px-2.5 py-1.5 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] mb-2.5 flex items-center justify-between">
            <span
              className={`font-bold text-xs ${
                isRoom ? 'text-[#B78A48]' : isTable ? 'text-[#4F0809]' : 'text-[#302421]'
              }`}
            >
              {destination}
            </span>
            <span className="text-[10px] text-[#81736D] font-medium">
              {order.outlet?.name || 'Palace Dining'}
            </span>
          </div>

          {/* Items List */}
          <div className="space-y-1.5 mb-3">
            {(((order.items || order.order_lines || []) as Array<{
              quantity: number;
              menu_item?: { name?: string };
              item_name_snapshot?: string;
              notes?: string | null;
            }>)).map((it, idx) => (
              <div key={idx} className="text-xs text-[#302421] border-b border-dashed border-[#E8DCD2]/60 pb-1">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-[#4F0809] shrink-0 mr-1.5 px-1 rounded bg-[#F6EAE0] text-[11px]">
                    {it.quantity}x
                  </span>
                  <span className="font-semibold flex-1 text-[#302421]">
                    {it.menu_item?.name || it.item_name_snapshot || 'Palace Specialty'}
                  </span>
                </div>
                {it.notes && (
                  <div className="text-[10px] text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1 font-medium">
                    Chef Note: {it.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[#E8DCD2] flex flex-col gap-1.5">
          {(order.status === 'new' || order.status === 'accepted') && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(order.id, 'preparing')}
              className="w-full py-2 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-[#D8AA67]" />
              <span>Start Cooking</span>
            </button>
          )}

          {order.status === 'preparing' && (
            <div className="flex items-center gap-1.5 w-full">
              <button
                type="button"
                onClick={() => handleUpdateStatus(order.id, 'ready')}
                className="flex-1 py-2 rounded-lg bg-[#2E7D32] hover:bg-[#256629] active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Ready at Pass</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(order.id, 'accepted')}
                className="px-2 py-2 rounded-lg border border-[#E8DCD2] bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs transition cursor-pointer"
                title="Recall to New Tickets"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {order.status === 'ready' && (
            <div className="flex flex-col gap-1.5 w-full">
              <button
                type="button"
                onClick={() => handleUpdateStatus(order.id, 'served')}
                className="w-full py-2.5 px-3 rounded-lg bg-[#2E7D32] hover:bg-[#256629] active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Ready for Steward Service (Handover &amp; Serve)</span>
              </button>
              <div className="flex items-center justify-between text-[11px] text-[#81736D] px-1">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(order.id, 'preparing')}
                  className="hover:text-[#4F0809] flex items-center gap-1 transition cursor-pointer"
                  title="Move back to cooking if more preparation is required"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Recall to Cooking</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(order.id, 'completed')}
                  className="hover:text-[#2E7D32] font-semibold text-[#4F0809] transition cursor-pointer underline decoration-dotted"
                  title="Directly settle and complete folio"
                >
                  Complete Folio ✓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-[#4F0809] text-white px-4 py-2.5 rounded-xl shadow-xl border border-[#D8AA67]/40 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#D8AA67]" />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DCD2]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#2E7D32] text-white text-[10px] font-bold uppercase tracking-wider">
              Live Kitchen Display System (KDS)
            </span>
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#4F0809] mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Royal Kitchen (KOT) Display &amp; Pass
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Real-time live ticket queue with auditory alerts, ticket aging timers, and station routing
          </p>
        </div>

        {/* Action and Sound Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-2xs cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-stone-500" />
            )}
            <span>Chime: {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={playKitchenChime}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-2xs transition cursor-pointer"
            title="Test Royal Chime Sound"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B78A48]" />
            <span>Test Sound</span>
          </button>

          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition cursor-pointer ${
              showHistory
                ? 'bg-[#4F0809] text-white border-[#4F0809]'
                : 'bg-white text-[#4F0809] border-[#E8DCD2] hover:bg-[#F6EAE0]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Served History</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-2xs transition cursor-pointer"
            title="Toggle KDS Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#81736D] uppercase font-bold tracking-wider block">
              Active KOTs
            </span>
            <span className="text-xl font-bold text-[#302421] mt-0.5 block">{activeOrders.length}</span>
          </div>
          <ChefHat className="w-5 h-5 text-[#81736D]" />
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-amber-800 uppercase font-bold tracking-wider block">
              Awaiting Prep
            </span>
            <span className="text-xl font-bold text-amber-900 mt-0.5 block">{newOrders.length}</span>
          </div>
          <Clock className="w-5 h-5 text-amber-600" />
        </div>

        <div className="bg-white border border-blue-200 rounded-xl p-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-blue-800 uppercase font-bold tracking-wider block">
              Cooking Stoves
            </span>
            <span className="text-xl font-bold text-blue-900 mt-0.5 block">{preparingOrders.length}</span>
          </div>
          <Flame className="w-5 h-5 text-blue-600" />
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-2.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider block">
              Ready at Pass
            </span>
            <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{readyOrders.length}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      {/* ── Filter Controls Bar ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white font-medium focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
          >
            <option value="all">All Palace Kitchens</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white font-bold focus:ring-1 focus:ring-[#4F0809] focus:outline-none text-[#4F0809]"
          >
            <option value="all">All Culinary Stations</option>
            <option value="tandoor">🔥 Tandoor &amp; Clay Oven</option>
            <option value="curry">🍲 Curries &amp; Royal Range</option>
            <option value="cafe">☕ Jharokha Café &amp; Barista</option>
            <option value="desserts">🍮 Mithai &amp; Confectionery</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
          >
            <option value="all">All Order Channels</option>
            <option value="dine_in">Dine-in Tables</option>
            <option value="room_service">Suite Room Service</option>
            <option value="delivery">Online Delivery</option>
            <option value="pickup">Takeaway Pickup</option>
          </select>
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#81736D]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search KOT #, table, or suite..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809]"
          />
        </div>
      </div>

      {/* ── Served History Strip (Collapsible) ── */}
      {showHistory && (
        <div className="p-4 bg-white border border-[#E8DCD2] rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8DCD2]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F0809] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Recently Served / Dispatched KOTs (Today)
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-[#81736D] hover:text-[#4F0809]"
            >
              Close
            </button>
          </div>
          {servedOrders.length === 0 ? (
            <div className="py-4 text-center text-xs text-[#81736D]">No served orders recorded yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {servedOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-2.5 rounded-lg border border-[#E8DCD2] bg-[#FBF6EF]/50 flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-mono font-bold text-[#4F0809]">#{ord.order_number}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                      {ord.status}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#302421]">
                    {getOrderLocation(ord)}
                  </div>
                  <div className="text-[10px] text-[#81736D] mt-1 flex justify-between items-center">
                    <span>{formatOrderTime(ord.created_at)}</span>
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'ready')}
                      className="text-[10px] text-[#4F0809] hover:underline font-semibold"
                    >
                      Recall to Pass
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3-Column Kitchen Display Board ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: New / Accepted */}
        <div className="space-y-3">
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                New Tickets ({newOrders.length})
              </span>
            </div>
            <span className="text-[10px] text-amber-700">Awaiting prep</span>
          </div>

          <div className="space-y-3">
            {newOrders.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#E8DCD2] rounded-xl text-xs text-[#81736D]">
                No new pending tickets.
              </div>
            ) : (
              newOrders.map((ord) => renderTicket(ord))
            )}
          </div>
        </div>

        {/* Column 2: In Preparation */}
        <div className="space-y-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Cooking on Stoves ({preparingOrders.length})
              </span>
            </div>
            <span className="text-[10px] text-blue-700">In preparation</span>
          </div>

          <div className="space-y-3">
            {preparingOrders.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#E8DCD2] rounded-xl text-xs text-[#81736D]">
                No tickets currently cooking.
              </div>
            ) : (
              preparingOrders.map((ord) => renderTicket(ord))
            )}
          </div>
        </div>

        {/* Column 3: Ready at Pass */}
        <div className="space-y-3">
          <div className="p-2.5 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
              <span className="text-xs font-bold text-green-900 uppercase tracking-wider">
                Ready at Pass ({readyOrders.length})
              </span>
            </div>
            <span className="text-[10px] text-green-700">For steward pickup</span>
          </div>

          <div className="space-y-3">
            {readyOrders.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#E8DCD2] rounded-xl text-xs text-[#81736D]">
                Pass is clear.
              </div>
            ) : (
              readyOrders.map((ord) => renderTicket(ord))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
