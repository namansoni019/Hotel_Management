'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Printer,
  XCircle,
  UtensilsCrossed,
  BedDouble,
  Bike,
  Package,
  Receipt,
  RotateCw,
  ArrowRight,
  Phone,
  User,
  MapPin,
  Check,
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ordersService } from '@/lib/services/orders-service';
import { dataRepository } from '@/lib/data/repository';
import type { Order, Outlet } from '@/lib/types';

function OrdersContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || 'all';
  const urlSearch = searchParams.get('search') || '';

  const [orders, setOrders] = useState<Order[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [activeTab, setActiveTab] = useState(tabParam);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [outletFilter, setOutletFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Clear any legacy localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('dashboard_orders');
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
        console.warn('Real-time orders listener:', err);
        setOrders(dataRepository.getOrders());
      }
    );

    // Outlets listener
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

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (urlSearch) setSearchQuery(urlSearch);
  }, [urlSearch]);

  const handleUpdateStatus = async (id: string, status: Order['status'], reason?: string) => {
    try {
      await ordersService.updateOrderStatus(id, status, reason);
    } catch {
      dataRepository.updateOrderStatus(id, status, reason);
    }
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, status, cancel_reason: reason || null });
    }
  };

  const loadData = () => {
    // Real-time listener handles sync
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const oType = o.order_type || o.fulfilment_mode;
      // 1. Tab matching
      if (activeTab === 'dine_in' && oType !== 'dine_in') return false;
      if (activeTab === 'room_service' && oType !== 'room_service') return false;
      if (activeTab === 'delivery' && oType !== 'delivery') return false;
      if (activeTab === 'pickup' && oType !== 'pickup') return false;
      if (activeTab === 'completed' && o.status !== 'completed' && o.status !== 'served') return false;

      // 2. Outlet filter
      if (outletFilter !== 'all' && o.outlet_id !== outletFilter) return false;

      // 3. Status filter
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = o.order_number.toLowerCase();
        const customer = (o.pickup_name || o.delivery_name || '').toLowerCase();
        const table = (o.table?.table_number || '').toLowerCase();
        const room = (o.room_number || '').toLowerCase();
        const itemsList: any[] = o.items || o.order_lines || [];
        const items = itemsList.map((i: any) => i.menu_item?.name?.toLowerCase() || i.item_name_snapshot?.toLowerCase() || '').join(' ');
        if (
          !num.includes(q) &&
          !customer.includes(q) &&
          !table.includes(q) &&
          !room.includes(q) &&
          !items.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, outletFilter, statusFilter, searchQuery]);

  // Metrics
  const totalCount = orders.length;
  const activeCount = orders.filter((o) => ['new', 'accepted', 'preparing', 'ready'].includes(o.status)).length;
  const dineInCount = orders.filter((o) => (o.order_type || o.fulfilment_mode) === 'dine_in').length;
  const roomServiceCount = orders.filter((o) => (o.order_type || o.fulfilment_mode) === 'room_service').length;
  const deliveryCount = orders.filter((o) => (o.order_type || o.fulfilment_mode) === 'delivery').length;
  const pickupCount = orders.filter((o) => (o.order_type || o.fulfilment_mode) === 'pickup').length;

  const handleExportCSV = () => {
    const headers = ['Order ID,Source,Outlet,Table/Room,Items,Status,Payment,Time,Amount'];
    const rows = filteredOrders.map((o) => {
      const location = o.room_number ? `Room ${o.room_number}` : o.table?.table_number || 'Takeaway/Online';
      const itemsList: any[] = o.items || o.order_lines || [];
      const total = o.total_amount_minor || o.total_minor || 0;
      return [
        `"#${o.order_number}"`,
        `"${o.order_type || o.fulfilment_mode}"`,
        `"${o.outlet?.name || 'Restaurant'}"`,
        `"${location}"`,
        `"${itemsList.length} items"`,
        o.status,
        o.payment_status || 'Paid',
        `"${new Date(o.created_at).toLocaleTimeString()}"`,
        `"₹${(total / 100).toLocaleString()}"`,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rajmahal_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSourceIcon = (source: Order['order_type']) => {
    switch (source) {
      case 'dine_in':
        return <UtensilsCrossed className="w-3.5 h-3.5 text-[#8F6628]" />;
      case 'room_service':
        return <BedDouble className="w-3.5 h-3.5 text-[#B78A48]" />;
      case 'delivery':
        return <Bike className="w-3.5 h-3.5 text-[#4F0809]" />;
      case 'pickup':
        return <Package className="w-3.5 h-3.5 text-[#2E7D32]" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DCD2]">
        <div>
          <h1
            className="text-2xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Palace Orders Management &amp; Fulfillment
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Real-time multi-channel orders: Table Dine-in, In-suite Room Service, Takeaway pickup &amp; Online delivery
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-xs transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#D8AA67]" />
            Export Orders CSV
          </button>
        </div>
      </div>

      {/* ── Metric Summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#81736D] uppercase font-bold tracking-wider block">Total Orders</span>
          <span className="text-xl font-bold text-[#302421] mt-0.5 block">{totalCount}</span>
          <span className="text-[10px] text-[#2E7D32]">All Channels</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#4F0809] uppercase font-bold tracking-wider block">Active in KOT</span>
          <span className="text-xl font-bold text-[#4F0809] mt-0.5 block">{activeCount}</span>
          <span className="text-[10px] text-[#81736D]">Pending service</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#8F6628] uppercase font-bold tracking-wider block">Dine-In</span>
          <span className="text-xl font-bold text-[#8F6628] mt-0.5 block">{dineInCount}</span>
          <span className="text-[10px] text-[#81736D]">Table service</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#B78A48] uppercase font-bold tracking-wider block">Room Service</span>
          <span className="text-xl font-bold text-[#B78A48] mt-0.5 block">{roomServiceCount}</span>
          <span className="text-[10px] text-[#81736D]">Suite delivery</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#4F0809] uppercase font-bold tracking-wider block">Online Delivery</span>
          <span className="text-xl font-bold text-[#4F0809] mt-0.5 block">{deliveryCount}</span>
          <span className="text-[10px] text-[#81736D]">External courier</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#2E7D32] uppercase font-bold tracking-wider block">Pickup</span>
          <span className="text-xl font-bold text-[#2E7D32] mt-0.5 block">{pickupCount}</span>
          <span className="text-[10px] text-[#81736D]">Counter takeaway</span>
        </div>
      </div>

      {/* ── Sub-Tabs & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: 'All Orders', value: 'all', count: totalCount },
            { label: 'Dine-In', value: 'dine_in', count: dineInCount },
            { label: 'Room Service', value: 'room_service', count: roomServiceCount },
            { label: 'Online Delivery', value: 'delivery', count: deliveryCount },
            { label: 'Takeaway Pickup', value: 'pickup', count: pickupCount },
            { label: 'Completed', value: 'completed', count: orders.filter((o) => o.status === 'completed' || o.status === 'served').length },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTab === tab.value
                  ? 'bg-[#4F0809] text-white shadow-xs'
                  : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#81736D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, table, suite..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="accepted">Accepted</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="served">Served</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* ── Working Orders Table ── */}
      <div className="bg-white border border-[#E8DCD2] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8DCD2] bg-[#FBF6EF]/75 text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Source Channel</th>
                <th className="py-2.5 px-3">Outlet Venue</th>
                <th className="py-2.5 px-3">Table / Room</th>
                <th className="py-2.5 px-3">Items Ordered</th>
                <th className="py-2.5 px-3">Kitchen Status</th>
                <th className="py-2.5 px-3">Order Time</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCD2]/70 text-[#302421]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#81736D]">
                    No orders found matching your search or filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const locationBadge = order.room_number ? (
                    <span className="px-2 py-0.5 rounded bg-[#F6EAE0] font-mono font-semibold text-[#4F0809] text-[11px]">
                      Room {order.room_number}
                    </span>
                  ) : order.table?.table_number ? (
                    <span className="px-2 py-0.5 rounded bg-[#F6EAE0] font-mono font-semibold text-[#4F0809] text-[11px]">
                      {order.table.table_number}
                    </span>
                  ) : order.order_type === 'delivery' ? (
                    <span className="px-2 py-0.5 rounded bg-[#F6EAE0] text-[#302421] text-[11px]">Online</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-[#F6EAE0] text-[#302421] text-[11px]">Counter</span>
                  );

                  const itemsList: any[] = order.items || order.order_lines || [];
                  const itemsCount = itemsList.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
                  const orderSource = order.order_type || order.fulfilment_mode || 'dine_in';
                  const total = order.total_amount_minor || order.total_minor || 0;

                  return (
                    <tr key={order.id} className="hover:bg-[#FBF6EF]/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#4F0809] font-mono">
                        #{order.order_number}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 capitalize font-medium text-[#302421]">
                          {getSourceIcon(orderSource as any)}
                          <span>{orderSource.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#302421]">{order.outlet?.name || 'Restaurant'}</td>
                      <td className="py-2.5 px-3">{locationBadge}</td>
                      <td className="py-2.5 px-3 font-medium">
                        {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'ready'
                              ? 'bg-[#2E7D32]/15 text-[#2E7D32]'
                              : order.status === 'preparing'
                              ? 'bg-amber-100 text-amber-800'
                              : order.status === 'accepted'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'completed' || order.status === 'served'
                              ? 'bg-[#81736D]/15 text-[#81736D]'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#81736D]">
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#302421]">
                        ₹{(total / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-2.5 py-1 rounded bg-[#FBF6EF] hover:bg-[#E8DCD2] text-[#4F0809] font-semibold text-[11px] transition flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-lg w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#FBF6EF] text-[#81736D]"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono font-bold text-sm text-[#4F0809]">
                #{selectedOrder.order_number}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#4F0809]/10 text-[#4F0809] text-[10px] font-bold uppercase tracking-wider">
                {selectedOrder.status}
              </span>
            </div>
            <h2
              className="text-xl font-bold text-[#4F0809] mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Palace KOT Order Folio
            </h2>
            <p className="text-xs text-[#81736D] mb-4">
              Placed at {new Date(selectedOrder.created_at).toLocaleTimeString()} via {(selectedOrder.order_type || selectedOrder.fulfilment_mode || 'dine_in').replace('_', ' ')}
            </p>

            <div className="space-y-3 text-xs">
              {/* Location & Context */}
              <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2] flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-[#81736D] uppercase">Destination Location</div>
                  <div className="font-semibold text-sm text-[#4F0809] mt-0.5">
                    {selectedOrder.room_number
                      ? `Suite Room ${selectedOrder.room_number}`
                      : selectedOrder.table?.table_number
                      ? `Table ${selectedOrder.table.table_number}`
                      : 'Takeaway / Delivery Delivery'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#81736D] uppercase">Outlet Venue</div>
                  <div className="font-semibold text-[#302421] mt-0.5">
                    {selectedOrder.outlet?.name || 'Rajasthani Restaurant'}
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="border border-[#E8DCD2] rounded-xl p-3 bg-white space-y-2">
                <div className="font-semibold text-[#4F0809] pb-1 border-b border-[#E8DCD2]">
                  Order Items Breakdown
                </div>
                {(((selectedOrder.items || selectedOrder.order_lines || []) as any[])).map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-[#302421]">{it.quantity || 1}x </span>
                      <span>{it.menu_item?.name || it.item_name_snapshot || 'Palace Specialty'}</span>
                      {it.notes && <div className="text-[10px] text-[#81736D] italic">Note: {it.notes}</div>}
                    </div>
                    <span className="font-medium text-[#302421]">
                      ₹{(((it.quantity || 1) * (it.unit_price_minor || it.unit_price_snapshot_minor || 0)) / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}

                {(() => {
                  const modalTotal = selectedOrder.total_amount_minor || selectedOrder.total_minor || 0;
                  return (
                    <div className="pt-2 border-t border-[#E8DCD2] space-y-1 text-[11px] text-[#81736D]">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{((modalTotal * 0.95) / 100).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxes &amp; Royal Service (5%):</span>
                        <span>₹{((modalTotal * 0.05) / 100).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-[#4F0809] pt-1 border-t border-[#E8DCD2]">
                        <span>Total Amount:</span>
                        <span>₹{(modalTotal / 100).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Status Action Transitions */}
              <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2]">
                <div className="text-[10px] font-bold uppercase text-[#81736D] mb-2">
                  Update KOT Progression Status
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedOrder.status === 'new' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'accepted')}
                      className="px-3 py-1.5 rounded-lg bg-[#4F0809] text-white text-xs font-semibold hover:bg-[#6B1518] transition"
                    >
                      Accept Order
                    </button>
                  )}
                  {selectedOrder.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                      className="px-3 py-1.5 rounded-lg bg-[#B78A48] text-white text-xs font-semibold hover:bg-[#8F6628] transition"
                    >
                      Start Preparing in Kitchen
                    </button>
                  )}
                  {selectedOrder.status === 'preparing' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}
                      className="px-3 py-1.5 rounded-lg bg-[#2E7D32] text-white text-xs font-semibold hover:bg-[#256629] transition"
                    >
                      Mark Ready at Pass
                    </button>
                  )}
                  {selectedOrder.status === 'ready' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'served')}
                      className="px-3 py-1.5 rounded-lg bg-[#2E7D32] text-white text-xs font-semibold hover:bg-[#256629] transition"
                    >
                      Mark Served to Guest
                    </button>
                  )}
                  {selectedOrder.status === 'served' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                      className="px-3 py-1.5 rounded-lg bg-[#4F0809] text-white text-xs font-semibold hover:bg-[#6B1518] transition"
                    >
                      Complete &amp; Settle Folio
                    </button>
                  )}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'completed' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled', 'Guest cancelled')}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs transition"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg border border-[#E8DCD2] text-[#4F0809] hover:bg-[#FBF6EF] text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt Bill
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-1.5 rounded-lg bg-[#4F0809] text-white text-xs font-semibold hover:bg-[#6B1518] transition"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-[#81736D]">Loading Palace Orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
