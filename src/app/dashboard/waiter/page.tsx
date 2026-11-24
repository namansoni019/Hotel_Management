'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils,
  CheckCircle2,
  Clock,
  BedDouble,
  Armchair,
  ShoppingBag,
  Search,
  Bell,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ordersService } from '@/lib/services/orders-service';
import { dataRepository } from '@/lib/data/repository';
import type { Order } from '@/lib/types';

export default function FloorStewardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'ready' | 'active' | 'served'>('ready');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'dine_in' | 'room_service'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Real-time Firestore orders listener
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
          list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          setOrders(
            list.filter(
              (o) =>
                o.order_type === 'dine_in' ||
                o.order_type === 'room_service' ||
                o.fulfilment_mode === 'dine_in'
            )
          );
        } else {
          const all = dataRepository.getOrders();
          setOrders(
            all.filter(
              (o) =>
                o.order_type === 'dine_in' ||
                o.order_type === 'room_service' ||
                o.fulfilment_mode === 'dine_in'
            )
          );
        }
      },
      () => {
        const all = dataRepository.getOrders();
        setOrders(
          all.filter(
            (o) =>
              o.order_type === 'dine_in' ||
              o.order_type === 'room_service' ||
              o.fulfilment_mode === 'dine_in'
          )
        );
      }
    );

    return () => unsubOrders();
  }, []);

  const handleUpdateStatus = async (id: string, status: Order['status']) => {
    try {
      await ordersService.updateOrderStatus(id, status);
    } catch {
      dataRepository.updateOrderStatus(id, status);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab matching
      let matchesTab = false;
      if (activeTab === 'ready') matchesTab = o.status === 'ready';
      else if (activeTab === 'active') matchesTab = o.status === 'new' || o.status === 'accepted' || o.status === 'preparing';
      else if (activeTab === 'served') matchesTab = o.status === 'served' || o.status === 'completed';

      // Source matching
      const currentType = o.order_type || o.fulfilment_mode;
      const matchesSource = sourceFilter === 'all' || currentType === sourceFilter;

      // Search
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        (o.table?.table_number && o.table.table_number.toLowerCase().includes(q)) ||
        (o.room_number && o.room_number.toLowerCase().includes(q));

      return matchesTab && matchesSource && matchesSearch;
    });
  }, [orders, activeTab, sourceFilter, searchQuery]);

  // Counts
  const readyCount = orders.filter((o) => o.status === 'ready').length;
  const activeCount = orders.filter((o) => ['new', 'accepted', 'preparing'].includes(o.status)).length;
  const servedCount = orders.filter((o) => o.status === 'served' || o.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DCD2]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#4F0809] text-[#E1B46F] text-[10px] font-bold uppercase tracking-wider">
              Simulated Role: Waiter
            </span>
            <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse" />
          </div>
          <h1
            className="text-2xl font-bold text-[#4F0809] mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Waiter &amp; In-Room Dining Service
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Deliver ready KOT orders directly to restaurant tables and palace royal suites
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-[#2E7D32]/10 border border-[#2E7D32]/30 text-[#2E7D32] text-xs font-semibold flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            <span>{readyCount} Orders Ready at Pass</span>
          </div>
        </div>
      </div>

      {/* ── Tabs & Source Filter ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'ready'
                ? 'bg-[#4F0809] text-white shadow-xs'
                : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
            }`}
          >
            <span>Ready at Kitchen Pass</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{readyCount}</span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-[#4F0809] text-white shadow-xs'
                : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
            }`}
          >
            <span>In Preparation (KOT)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{activeCount}</span>
          </button>

          <button
            onClick={() => setActiveTab('served')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'served'
                ? 'bg-[#4F0809] text-white shadow-xs'
                : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
            }`}
          >
            <span>Delivered &amp; Served</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{servedCount}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
          >
            <option value="all">All Service Destinations</option>
            <option value="dine_in">Table Dining</option>
            <option value="room_service">Suite Room Service</option>
          </select>

          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#81736D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table or suite..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809]"
            />
          </div>
        </div>
      </div>

      {/* ── Order Service Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-[#E8DCD2] rounded-xl text-xs text-[#81736D]">
            No orders in this queue. Kitchen pass is currently clear.
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const isRoom = ord.order_type === 'room_service' || ord.channel === 'room_service';
            const destinationLabel = isRoom
              ? `Suite ${ord.room_number || '201'}`
              : ord.table?.table_number || 'Table T-05';
            const totalMinor = ord.total_amount_minor || ord.total_minor || 0;
            const itemsList: any[] = ord.items || ord.order_lines || [];

            return (
              <div
                key={ord.id}
                className="bg-white border border-[#E8DCD2] rounded-xl p-3.5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-[#E8DCD2]">
                    <div>
                      <span className="font-mono font-bold text-xs text-[#4F0809]">
                        #{ord.order_number}
                      </span>
                      <div className="text-[10px] text-[#81736D] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#B78A48]" />
                        <span>Ready at {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ord.status === 'ready'
                          ? 'bg-[#2E7D32]/15 text-[#2E7D32] animate-pulse'
                          : ord.status === 'served'
                          ? 'bg-[#4F0809]/10 text-[#4F0809]'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ord.status === 'ready' ? 'Ready to Serve' : ord.status}
                    </span>
                  </div>

                  {/* Destination Banner */}
                  <div className="p-2 bg-[#FBF6EF] rounded-lg border border-[#E8DCD2] flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-[#4F0809] text-[#E1B46F] flex items-center justify-center">
                        {isRoom ? <BedDouble className="w-4 h-4" /> : <Armchair className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[#302421]">{destinationLabel}</div>
                        <div className="text-[10px] text-[#81736D] capitalize">
                          {isRoom ? 'Royal In-Room Service' : 'Restaurant Dining Table'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#4F0809]">
                      ₹{(totalMinor / 100).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Items list */}
                  <div className="space-y-1 mb-3 text-xs">
                    {itemsList.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-[#302421]">
                        <span>
                          <b>{it.quantity}x</b> {it.menu_item?.name || it.item_name_snapshot || 'Chef Specialty'}
                        </span>
                        <span className="text-[#81736D]">
                          ₹{(((it.quantity || 1) * (it.unit_price_minor || it.unit_price_snapshot_minor || 0)) / 100).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-[#E8DCD2] flex items-center justify-end gap-2">
                  {ord.status === 'ready' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'served')}
                      className="w-full py-2 rounded-lg bg-[#2E7D32] hover:bg-[#256629] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isRoom ? 'Delivered to Suite' : 'Mark Served to Table'}</span>
                    </button>
                  )}

                  {ord.status === 'served' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'completed')}
                      className="w-full py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D8AA67]" />
                      <span>Complete Folio Bill</span>
                    </button>
                  )}

                  {ord.status !== 'ready' && ord.status !== 'served' && (
                    <div className="text-[11px] text-[#81736D] text-center w-full py-1 italic">
                      Kitchen is preparing courses
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
