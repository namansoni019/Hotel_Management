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
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ordersService } from '@/lib/services/orders-service';
import { dataRepository } from '@/lib/data/repository';
import type { Order, Outlet } from '@/lib/types';

export default function KitchenOrderBoardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const prevPendingCountRef = useRef<number>(0);

  // Web Audio royal chime (D5 -> A5 two-tone chime)
  const playKitchenChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
          list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
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

  const handleUpdateStatus = async (orderId: string, nextStatus: Order['status'], reason?: string) => {
    try {
      await ordersService.updateOrderStatus(orderId, nextStatus, reason);
    } catch {
      dataRepository.updateOrderStatus(orderId, nextStatus, reason);
    }
  };

  const loadData = () => {
    // Real-time listener handles sync
  };

  const getTicketAgeMinutes = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return Math.max(0, Math.floor(diff / 60000));
  };

  // Only active kitchen orders
  const activeOrders = useMemo(() => {
    return orders.filter((o) => {
      const isKitchenActive = ['new', 'accepted', 'preparing', 'ready'].includes(o.status);
      const matchesOutlet = selectedOutlet === 'all' || o.outlet_id === selectedOutlet;
      const matchesSource = sourceFilter === 'all' || o.order_type === sourceFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        (o.table?.table_number && o.table.table_number.toLowerCase().includes(q)) ||
        (o.room_number && o.room_number.toLowerCase().includes(q));

      // Station filter matching item names
      let matchesStation = true;
      if (stationFilter !== 'all') {
        const lines = (o.items || o.order_lines || []) as Array<{ menu_item?: { name?: string }; item_name_snapshot?: string }>;
        const allItemNames = lines.map((l) => (l.menu_item?.name || l.item_name_snapshot || '').toLowerCase()).join(' ');
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
    const isRoom = order.order_type === 'room_service';
    const destination = isRoom
      ? `Suite ${order.room_number || '201'}`
      : order.table?.table_number
      ? order.table.table_number
      : order.order_type === 'delivery'
      ? 'Online Delivery'
      : 'Counter Pickup';

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
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                  isUrgent && order.status !== 'ready'
                    ? 'bg-rose-600 text-white'
                    : isWarning && order.status !== 'ready'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-[#FBF6EF] text-[#81736D]'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>{ageMins}m ago</span>
                </span>
                <span className="text-[10px] text-[#81736D]">
                  {new Date(order.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 capitalize text-[10px] font-semibold px-2 py-0.5 bg-[#F6EAE0] rounded text-[#302421]">
              {getSourceIcon((order.order_type || order.fulfilment_mode || 'dine_in') as Order['order_type'])}
              <span>{(order.order_type || order.fulfilment_mode || 'dine_in').replace('_', ' ')}</span>
            </div>
          </div>

          {/* Table / Room Banner */}
          <div className="px-2.5 py-1.5 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] mb-2.5 flex items-center justify-between">
            <span className="font-bold text-xs text-[#4F0809]">{destination}</span>
            <span className="text-[10px] text-[#81736D]">{order.outlet?.name || 'Palace Dining'}</span>
          </div>

          {/* Items List */}
          <div className="space-y-1.5 mb-3">
            {((order.items || order.order_lines || []) as Array<{
              quantity: number;
              menu_item?: { name?: string };
              item_name_snapshot?: string;
              notes?: string | null;
            }>).map((it, idx) => (
              <div key={idx} className="text-xs text-[#302421] border-b border-dashed border-[#E8DCD2]/60 pb-1">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-[#4F0809] shrink-0 mr-1.5">{it.quantity}x</span>
                  <span className="font-medium flex-1">
                    {it.menu_item?.name || it.item_name_snapshot || 'Palace Specialty'}
                  </span>
                </div>
                {it.notes && (
                  <div className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 font-medium">
                    Note: {it.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[#E8DCD2] flex items-center justify-between gap-1.5">
          {(order.status === 'new' || order.status === 'accepted') && (
            <button
              onClick={() => handleUpdateStatus(order.id, 'preparing')}
              className="w-full py-2 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#D8AA67]" />
              Start Cooking
            </button>
          )}

          {order.status === 'preparing' && (
            <button
              onClick={() => handleUpdateStatus(order.id, 'ready')}
              className="w-full py-2 rounded-lg bg-[#2E7D32] hover:bg-[#256629] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Mark Ready at Pass
            </button>
          )}

          {order.status === 'ready' && (
            <div className="w-full py-1.5 rounded-lg bg-[#2E7D32]/10 text-[#2E7D32] text-xs font-bold text-center border border-[#2E7D32]/30 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready for Steward Service</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
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
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-700" /> : <VolumeX className="w-3.5 h-3.5 text-stone-500" />}
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
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-[#4F0809] text-white hover:bg-[#680b0c] text-xs font-medium shadow-2xs transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
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
            className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white font-medium focus:ring-1 focus:ring-[#4F0809] focus:outline-none text-[#4F0809] font-bold"
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
