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
  Banknote,
  CreditCard,
  QrCode,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import QRCode from 'qrcode';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ordersService } from '@/lib/services/orders-service';
import { dataRepository } from '@/lib/data/repository';
import type { Order, Outlet } from '@/lib/types';

function getOrderTimestamp(created_at: any): number {
  if (!created_at) return 0;
  if (typeof created_at === 'object' && typeof created_at.seconds === 'number') {
    return created_at.seconds * 1000;
  }
  if (typeof created_at?.toDate === 'function') {
    return created_at.toDate().getTime();
  }
  const t = new Date(created_at).getTime();
  return isNaN(t) ? 0 : t;
}

function formatOrderTime(created_at: any): string {
  const t = getOrderTimestamp(created_at);
  if (!t) return 'Recently';
  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getOrderLocation(order: Order): string {
  // 1. Explicit room_number
  if (order.room_number) {
    const val = String(order.room_number).trim();
    return val.toLowerCase().startsWith('room') || val.toLowerCase().startsWith('suite')
      ? val
      : `Room ${val}`;
  }

  // 2. Table number
  if (order.table_number) {
    const val = String(order.table_number).trim();
    return val.toLowerCase().startsWith('table') ? val : `Table ${val}`;
  }
  if (order.table?.table_number) {
    const val = String(order.table.table_number).trim();
    return val.toLowerCase().startsWith('table') ? val : `Table ${val}`;
  }

  // 3. Table ID
  if (order.table_id && order.table_id.trim()) {
    const val = order.table_id.trim();
    const lower = val.toLowerCase();
    if (lower.startsWith('room') || lower.startsWith('suite')) {
      return val;
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
      if (extracted.toLowerCase().startsWith('room') || extracted.toLowerCase().startsWith('table')) {
        return extracted;
      }
      return `Table ${extracted}`;
    }
  }

  // 5. Fulfillment mode
  const mode = order.order_type || order.fulfilment_mode;
  if (mode === 'delivery') return 'Doorstep Delivery';
  if (mode === 'room_service') return 'Room Service';
  if (mode === 'dine_in') return 'Table T-01';
  if (mode === 'pickup') return 'Counter Pickup';

  return 'Table T-01';
}

function getPaymentMode(order: Order): 'upi' | 'cash' | 'card' {
  const mode = String(order.payment_mode || order.payment_method || '').toLowerCase();
  if (mode.includes('cash')) return 'cash';
  if (mode.includes('card')) return 'card';
  return 'upi';
}

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
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'upi' | 'cash' | 'card'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Counter Settlement Modal State
  const [counterSettlementOrder, setCounterSettlementOrder] = useState<Order | null>(null);
  const [counterTab, setCounterTab] = useState<'upi' | 'cash' | 'card'>('upi');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isSettling, setIsSettling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (counterSettlementOrder) {
      const totalAmount =
        (counterSettlementOrder.total_amount_minor || counterSettlementOrder.total_minor || 0) / 100;
      setCashTendered(totalAmount.toString());
      const upiUrl = `upi://pay?pa=rajmahalheritage@icici&pn=Rajmahal+Heritage+Grand&am=${totalAmount.toFixed(
        2
      )}&cu=INR&tn=KOT_${counterSettlementOrder.order_number}`;
      QRCode.toDataURL(upiUrl, {
        width: 220,
        margin: 1,
        color: { dark: '#4F0809', light: '#FFFFFF' },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, [counterSettlementOrder]);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 4500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

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
          list.sort((a, b) => getOrderTimestamp(b.created_at) - getOrderTimestamp(a.created_at));
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

  const handleUpdatePaymentMode = async (id: string, mode: 'upi' | 'cash' | 'card') => {
    try {
      await ordersService.updateOrderPaymentMode(id, mode);
    } catch {
      dataRepository.updateOrderPaymentMode(id, mode);
    }
    setOrders((prev) =>
      prev.map((ord) => (ord.id === id ? { ...ord, payment_mode: mode, payment_method: mode } : ord))
    );
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, payment_mode: mode, payment_method: mode });
    }
  };

  const handleFinalSettleAndFreeTable = async (
    order: Order,
    collectedMode: 'cash' | 'upi' | 'card',
    methodDisplay: string,
    tendered?: number,
    change?: number
  ) => {
    setIsSettling(true);
    try {
      await ordersService.settleOrderAndFreeTable({
        orderId: order.id,
        payment_mode: collectedMode,
        payment_method: methodDisplay,
        tendered_amount_minor: tendered ? Math.round(tendered * 100) : null,
        change_amount_minor: change ? Math.round(change * 100) : null,
        table_id: order.table_id || order.table?.id,
        table_number: order.table_number || order.table?.table_number,
      });

      const locName = getOrderLocation(order);
      setToastMessage(
        `Folio #${order.order_number} settled successfully! ${locName} is now unreserved & available for new bookings.`
      );
      setCounterSettlementOrder(null);
      setSelectedOrder(null);
    } catch (err: any) {
      console.warn('Settlement error:', err);
    } finally {
      setIsSettling(false);
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

      // 4. Payment mode filter
      if (paymentFilter !== 'all' && getPaymentMode(o) !== paymentFilter) return false;

      // 5. Search query
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
  }, [orders, activeTab, outletFilter, statusFilter, paymentFilter, searchQuery]);

  // Metrics
  const totalCount = orders.length;
  const activeCount = orders.filter((o) => ['new', 'accepted', 'preparing', 'ready'].includes(o.status)).length;
  const dineInCount = orders.filter((o) => (o.order_type || o.fulfilment_mode) === 'dine_in').length;
  const roomServiceCount = orders.filter((o) => (o.order_type || o.fulfilment_mode) === 'room_service').length;
  const deliveryCount = orders.filter((o) => (o.order_type || o.fulfilment_mode) === 'delivery').length;
  const pickupCount = orders.filter((o) => (o.order_type || o.fulfilment_mode) === 'pickup').length;

  const handleExportCSV = () => {
    const headers = ['Order ID,Source,Outlet,Table/Room,Items,Status,Payment Mode,Time,Amount'];
    const rows = filteredOrders.map((o) => {
      const location = getOrderLocation(o);
      const itemsList: any[] = o.items || o.order_lines || [];
      const total = o.total_amount_minor || o.total_minor || 0;
      return [
        `"#${o.order_number}"`,
        `"${o.order_type || o.fulfilment_mode}"`,
        `"${o.outlet?.name || 'Restaurant'}"`,
        `"${location}"`,
        `"${itemsList.length} items"`,
        o.status,
        getPaymentMode(o).toUpperCase(),
        `"${formatOrderTime(o.created_at)}"`,
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-70 bg-[#4F0809] text-white px-4 py-2.5 rounded-xl shadow-xl border border-[#D8AA67]/40 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#D8AA67]" />
          <span>{toastMessage}</span>
        </div>
      )}

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

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
          >
            <option value="all">All Payment Modes</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash Counter</option>
            <option value="card">Card</option>
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
                <th className="py-2.5 px-3">Payment Mode</th>
                <th className="py-2.5 px-3">Order Time</th>
                <th className="py-2.5 px-3">Total Amount</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCD2]/70 text-[#302421]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-[#81736D]">
                    No orders found matching your search or filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const locationText = getOrderLocation(order);
                  const isRoom = locationText.toLowerCase().startsWith('room');
                  const isTable = locationText.toLowerCase().startsWith('table');
                  const pMode = getPaymentMode(order);

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
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
                            isRoom
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : isTable
                              ? 'bg-[#F6EAE0] text-[#4F0809] border border-[#E8DCD2]'
                              : 'bg-stone-100 text-stone-700 border border-stone-200'
                          }`}
                        >
                          {locationText}
                        </span>
                      </td>
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
                      <td className="py-2.5 px-3">
                        <select
                          value={pMode}
                          onChange={(e) => handleUpdatePaymentMode(order.id, e.target.value as any)}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-md border cursor-pointer focus:outline-none transition ${
                            pMode === 'upi'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : pMode === 'cash'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <option value="upi">UPI</option>
                          <option value="cash">Cash Counter</option>
                          <option value="card">Card</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3 text-[#81736D]">
                        {formatOrderTime(order.created_at)}
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
              Placed at {formatOrderTime(selectedOrder.created_at)} via {(selectedOrder.order_type || selectedOrder.fulfilment_mode || 'dine_in').replace('_', ' ')}
            </p>

            <div className="space-y-3 text-xs">
              {/* Location & Context */}
              <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2] flex justify-between items-center">
                <div>
                  <div className="text-[10px] text-[#81736D] uppercase font-bold tracking-wider">Destination Location</div>
                  <div className="font-semibold text-sm text-[#4F0809] mt-0.5 font-mono">
                    {getOrderLocation(selectedOrder)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#81736D] uppercase font-bold tracking-wider">Outlet Venue</div>
                  <div className="font-semibold text-[#302421] mt-0.5">
                    {selectedOrder.outlet?.name || 'Rajasthani Restaurant'}
                  </div>
                </div>
              </div>

              {/* Settlement Payment Mode */}
              {(() => {
                const isPrepaid =
                  getPaymentMode(selectedOrder) === 'upi' ||
                  getPaymentMode(selectedOrder) === 'card' ||
                  selectedOrder.payment_status === 'paid';
                const isCashCounter = !isPrepaid;

                return (
                  <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2]">
                    <div className="text-[10px] font-bold uppercase text-[#81736D] mb-2 flex items-center justify-between">
                      <span>Settlement Payment Mode</span>
                      <span className="text-[9px] lowercase font-normal text-[#81736D]">
                        (Clearance channel)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdatePaymentMode(selectedOrder.id, 'upi')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          isPrepaid
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'border-[#E8DCD2] bg-white text-[#81736D] hover:text-[#302421] hover:bg-[#F6EAE0]'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Prepaid (UPI / Card)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdatePaymentMode(selectedOrder.id, 'cash')}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          isCashCounter
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'border-[#E8DCD2] bg-white text-[#81736D] hover:text-[#302421] hover:bg-[#F6EAE0]'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        <span>Cash Counter</span>
                      </button>
                    </div>

                    {/* Sub-Details based on selected mode */}
                    {isPrepaid ? (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <span>Paid Online (Prepaid)</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 uppercase font-semibold">
                                {getPaymentMode(selectedOrder) === 'card' ? 'Card' : 'UPI / QR'}
                              </span>
                            </div>
                            <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                              {selectedOrder.payment_id
                                ? `Ref: ${selectedOrder.payment_id}`
                                : `Txn ID: TXN-${selectedOrder.order_number.replace(/\D/g, '') || 'SETTLED'}`}{' '}
                              • Verified &amp; Settled
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-900">
                            ₹{(((selectedOrder.total_amount_minor || selectedOrder.total_minor || 0)) / 100).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-emerald-700 font-medium">Advance Paid</div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                            <Banknote className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-amber-900">Cash Counter (Pay at Desk)</div>
                            <div className="text-[10px] text-amber-700">
                              Collect payment via Online QR or Cash before settling folio
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900">
                          Payment Pending
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

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
                  {(selectedOrder.status === 'served' || selectedOrder.status === 'ready') && (
                    <button
                      type="button"
                      onClick={() => {
                        const isPrepaid =
                          getPaymentMode(selectedOrder) === 'upi' ||
                          getPaymentMode(selectedOrder) === 'card' ||
                          selectedOrder.payment_status === 'paid';
                        if (!isPrepaid) {
                          setCounterSettlementOrder(selectedOrder);
                        } else {
                          handleFinalSettleAndFreeTable(
                            selectedOrder,
                            getPaymentMode(selectedOrder),
                            getPaymentMode(selectedOrder) === 'card' ? 'Prepaid (Card)' : 'Prepaid (UPI)'
                          );
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#4F0809] text-white text-xs font-bold hover:bg-[#6B1518] active:scale-[0.99] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D8AA67]" />
                      <span>Complete &amp; Settle Folio</span>
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

      {/* ── Counter Payment Settlement Modal ── */}
      {counterSettlementOrder && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-md w-full p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => setCounterSettlementOrder(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#FBF6EF] text-[#81736D] transition cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                Counter Payment Clearance
              </span>
              <span className="font-mono text-xs font-bold text-[#4F0809]">
                #{counterSettlementOrder.order_number}
              </span>
            </div>
            <h2
              className="text-xl font-bold text-[#4F0809]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Settle Folio &amp; Free Table
            </h2>
            <p className="text-xs text-[#81736D] mt-0.5 mb-3">
              Collect bill for <span className="font-semibold text-[#302421]">{getOrderLocation(counterSettlementOrder)}</span> ({counterSettlementOrder.outlet?.name || 'Restaurant'})
            </p>

            {/* Amount Due Card */}
            <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2] flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] text-[#81736D] uppercase font-bold tracking-wider block">
                  Total Bill Amount to Collect
                </span>
                <span className="text-2xl font-bold text-[#4F0809]">
                  ₹{(((counterSettlementOrder.total_amount_minor || counterSettlementOrder.total_minor || 0)) / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right text-[10px] text-[#81736D]">
                <div>Includes 5% Taxes</div>
                <div className="font-semibold text-[#2E7D32]">Table will be freed</div>
              </div>
            </div>

            {/* Payment Channel Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setCounterTab('upi')}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  counterTab === 'upi'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-[#FBF6EF] border-[#E8DCD2] text-[#81736D] hover:bg-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Online Scanner (UPI)</span>
              </button>

              <button
                type="button"
                onClick={() => setCounterTab('cash')}
                className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  counterTab === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-[#FBF6EF] border-[#E8DCD2] text-[#81736D] hover:bg-white'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash Payment</span>
              </button>
            </div>

            {/* Tab 1: UPI Scanner */}
            {counterTab === 'upi' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col items-center justify-center text-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="UPI Payment QR Code"
                      className="w-44 h-44 rounded-lg border border-[#E8DCD2] shadow-xs bg-white p-1"
                    />
                  ) : (
                    <div className="w-44 h-44 rounded-lg bg-white border border-[#E8DCD2] flex items-center justify-center text-xs text-[#81736D]">
                      Generating QR...
                    </div>
                  )}
                  <div className="mt-2 text-xs font-bold text-[#4F0809]">
                    Scan to Pay ₹{(((counterSettlementOrder.total_amount_minor || counterSettlementOrder.total_minor || 0)) / 100).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-[#81736D] mt-0.5 font-mono">
                    UPI ID: rajmahalheritage@icici
                  </div>
                  <div className="text-[10px] text-[#81736D] mt-0.5">
                    Supports Google Pay, PhonePe, Paytm, BHIM UPI
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSettling}
                  onClick={() =>
                    handleFinalSettleAndFreeTable(
                      counterSettlementOrder,
                      'upi',
                      'Counter UPI Scanner'
                    )
                  }
                  className="w-full py-2.5 rounded-xl bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D8AA67]" />
                  <span>
                    {isSettling ? 'Settling...' : 'Confirm UPI Payment & Settle Folio'}
                  </span>
                </button>
              </div>
            )}

            {/* Tab 2: Cash Payment */}
            {counterTab === 'cash' && (() => {
              const totalAmount =
                (counterSettlementOrder.total_amount_minor ||
                  counterSettlementOrder.total_minor ||
                  0) / 100;
              const tendered = parseFloat(cashTendered) || 0;
              const change = Math.max(0, tendered - totalAmount);
              const shortage = Math.max(0, totalAmount - tendered);

              return (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#81736D] mb-1">
                      Cash Received from Guest (₹)
                    </label>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={totalAmount.toString()}
                      className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809]"
                    />
                  </div>

                  {/* Quick Shortcut Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: `Exact ₹${totalAmount}`, val: totalAmount },
                      {
                        label: `₹${Math.ceil(totalAmount / 50) * 50 || totalAmount + 50}`,
                        val: Math.ceil(totalAmount / 50) * 50 || totalAmount + 50,
                      },
                      {
                        label: `₹${Math.ceil(totalAmount / 100) * 100 || totalAmount + 100}`,
                        val: Math.ceil(totalAmount / 100) * 100 || totalAmount + 100,
                      },
                      { label: '₹500', val: 500 },
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashTendered(chip.val.toString())}
                        className="px-2.5 py-1 rounded-lg border border-[#E8DCD2] bg-white hover:bg-[#F6EAE0] text-[10px] font-semibold text-[#4F0809] transition cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Change or Shortage Display */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      shortage > 0
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider block">
                        {shortage > 0 ? 'Amount Shortage' : 'Change to Return to Guest'}
                      </span>
                      <span className="text-xl font-bold font-mono">
                        ₹{shortage > 0 ? shortage.toFixed(2) : change.toFixed(2)}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        shortage > 0
                          ? 'bg-red-200 text-red-900'
                          : 'bg-emerald-200 text-emerald-900'
                      }`}
                    >
                      {shortage > 0 ? 'Collect Remaining' : 'Ready to Return'}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSettling || shortage > 0}
                    onClick={() =>
                      handleFinalSettleAndFreeTable(
                        counterSettlementOrder,
                        'cash',
                        'Cash Counter',
                        tendered,
                        change
                      )
                    }
                    className={`w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer ${
                      shortage > 0
                        ? 'bg-stone-400 cursor-not-allowed'
                        : 'bg-[#2E7D32] hover:bg-[#256629]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isSettling ? 'Settling...' : 'Collect Cash & Settle Folio'}
                    </span>
                  </button>
                </div>
              );
            })()}

            {/* Table clearance reminder */}
            <div className="mt-3 pt-2 border-t border-[#E8DCD2] text-center text-[10px] text-[#81736D]">
              ✓ Upon settling, table{' '}
              <span className="font-semibold text-[#4F0809]">
                {getOrderLocation(counterSettlementOrder)}
              </span>{' '}
              will be automatically marked as{' '}
              <span className="font-bold text-[#2E7D32]">Available</span> for new reservations.
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
