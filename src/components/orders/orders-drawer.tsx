'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  ChefHat,
  Truck,
  UtensilsCrossed,
  X,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  QrCode,
  Copy,
  Check,
  RotateCw,
  AlertCircle,
  Receipt,
  CreditCard,
  MapPin,
  Utensils,
  History,
  Flame,
  User,
} from 'lucide-react';
import QRCode from 'qrcode';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Order, OrderStatus } from '@/lib/types';
import { formatMoney } from '@/lib/utils/money';
import { subscribeToAuth, FirebaseUser } from '@/lib/firebase/auth';

interface OrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'menu_list' | 'your_orders' | 'order_history';
  initialOrderId?: string | null;
}

// Fallback dish thumbnail resolver
const getDishImage = (name: string, fallbackUrl?: string | null) => {
  if (fallbackUrl) return fallbackUrl;
  const lower = (name || '').toLowerCase();
  if (
    lower.includes('laal') ||
    lower.includes('maas') ||
    lower.includes('meat') ||
    lower.includes('mutton') ||
    lower.includes('chicken')
  ) {
    return '/images/food/laal-maas.jpg';
  }
  if (lower.includes('dal') || lower.includes('baati') || lower.includes('churma')) {
    return '/images/food/dal-baati.jpg';
  }
  if (lower.includes('gatte') || lower.includes('govind')) {
    return '/images/food/gatte-ki-sabzi.jpg';
  }
  if (lower.includes('ker') || lower.includes('sangri')) {
    return '/images/food/ker-sangri.jpg';
  }
  if (
    lower.includes('chai') ||
    lower.includes('coffee') ||
    lower.includes('tea') ||
    lower.includes('shake') ||
    lower.includes('sandwich')
  ) {
    return '/images/food/cafe.jpg';
  }
  return '/images/food/restaurant.jpg';
};

export const OrdersDrawer: React.FC<OrdersDrawerProps> = ({
  isOpen,
  onClose,
  initialTab = 'menu_list',
  initialOrderId = null,
}) => {
  const router = useRouter();

  // Navigation mode:
  // 'menu_list': shows options list only (Place Order, Your Orders, Order History)
  // 'your_orders': opens whole-page view for active orders & live tracking
  // 'order_history': opens whole-page view for past order history
  const [viewMode, setViewMode] = useState<'menu_list' | 'your_orders' | 'order_history'>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialOrderId);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // QR Code state for selected order
  const [payQrDataUrl, setPayQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  // Hardware-Accelerated 60/120fps Swipe Gesture Refs
  const drawerSheetRef = useRef<HTMLDivElement>(null);
  const drawerBackdropRef = useRef<HTMLDivElement>(null);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);

  const drawerDragOffsetRef = useRef<number>(0);
  const isSwipingDrawerRef = useRef<boolean>(false);
  const drawerTouchStartYRef = useRef<number | null>(null);
  const lastTouchYRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);
  const touchVelocityRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  // Sync initial tab & order ID when opened
  useEffect(() => {
    if (isOpen) {
      if (initialTab && initialTab !== 'menu_list') {
        setViewMode(initialTab);
      } else {
        setViewMode('menu_list');
      }
      if (initialOrderId) setSelectedOrderId(initialOrderId);
      setIsDrawerClosing(false);
      setIsDrawerMounted(true);
      fetchUserOrders();
    }
  }, [isOpen, initialTab, initialOrderId]);

  // Subscribe to auth state
  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Fetch orders from API + Firestore real-time listener for current user
  const fetchUserOrders = async () => {
    setLoading(true);
    try {
      let localIds: string[] = [];
      try {
        const raw = localStorage.getItem('rajmahal_user_order_ids_v1');
        if (raw) localIds = JSON.parse(raw);
      } catch {}

      const params = new URLSearchParams();
      if (currentUser?.uid) {
        params.set('uid', currentUser.uid);
      }
      if (localIds.length > 0) {
        params.set('ids', localIds.join(','));
      }

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          let filtered = data.orders as Order[];
          if (currentUser?.uid) {
            filtered = filtered.filter(
              (o) =>
                (o as any).uid === currentUser.uid ||
                (o as any).user_id === currentUser.uid ||
                localIds.includes(o.id) ||
                localIds.includes(o.order_number)
            );
          }
          setOrders(filtered);
        }
      }
    } catch (err) {
      console.warn('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time Firestore synchronization for current user's orders
  useEffect(() => {
    if (!currentUser?.uid) return;

    try {
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('uid', '==', currentUser.uid));
      const unsub = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
            setOrders((prev) => {
              const map = new Map<string, Order>();
              list.forEach((o) => map.set(o.id, o));
              prev.forEach((o) => {
                if (!map.has(o.id)) map.set(o.id, o);
              });
              return Array.from(map.values()).sort(
                (a, b) => getOrderTimestamp(b) - getOrderTimestamp(a)
              );
            });
          }
        },
        (err) => {
          console.warn('Firestore orders onSnapshot query by uid fallback:', err);
        }
      );
      return () => unsub();
    } catch (err) {
      console.warn('Error establishing Firestore orders listener:', err);
    }
  }, [currentUser]);

  // Poll orders periodically when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(fetchUserOrders, 8000);
    return () => clearInterval(interval);
  }, [isOpen, currentUser]);

  // Listen to global open event
  useEffect(() => {
    const handleGlobalOpen = (e: any) => {
      const targetTab = e.detail?.tab;
      if (targetTab === 'your_orders' || targetTab === 'order_history') {
        setViewMode(targetTab);
      } else {
        setViewMode('menu_list');
      }
      if (e.detail?.orderId) setSelectedOrderId(e.detail.orderId);
      fetchUserOrders();
    };
    window.addEventListener('open-orders-drawer', handleGlobalOpen);
    return () => window.removeEventListener('open-orders-drawer', handleGlobalOpen);
  }, [currentUser]);

  // Helper to extract timestamp safely
  const getOrderTimestamp = (order: Order): number => {
    if (!order.created_at) return Date.now();
    if (typeof (order.created_at as any).toDate === 'function') {
      return (order.created_at as any).toDate().getTime();
    }
    if (typeof (order.created_at as any).seconds === 'number') {
      return (order.created_at as any).seconds * 1000;
    }
    if (typeof order.created_at === 'string' || typeof order.created_at === 'number') {
      const parsed = new Date(order.created_at).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return Date.now();
  };

  // Separate active vs historical orders
  const { activeOrders, historyOrders } = useMemo(() => {
    const completedStatuses: OrderStatus[] = ['delivered', 'completed', 'collected', 'cancelled'];
    const active = orders.filter((o) => !completedStatuses.includes(o.status));
    const history = orders.filter((o) => completedStatuses.includes(o.status));
    return { activeOrders: active, historyOrders: history };
  }, [orders]);

  // Selected order details object
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return activeOrders[0] || historyOrders[0] || null;
    return orders.find((o) => o.id === selectedOrderId || o.order_number === selectedOrderId) || null;
  }, [orders, selectedOrderId, activeOrders, historyOrders]);

  // Generate UPI QR Code whenever selected order is Pay On Delivery / Pending
  useEffect(() => {
    if (!selectedOrder) {
      setPayQrDataUrl('');
      return;
    }
    const amount = (selectedOrder.total_minor / 100).toFixed(2);
    const upiUri = `upi://pay?pa=rajmahal@icici&pn=Rajmahal%20Heritage&am=${amount}&cu=INR&tn=Order%20${selectedOrder.order_number}`;

    QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 1,
      color: {
        dark: '#4F0809',
        light: '#FFFFFF',
      },
    })
      .then((url) => setPayQrDataUrl(url))
      .catch((err) => console.warn('QR Code generation error:', err));
  }, [selectedOrder]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('rajmahal@icici');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSimulateMarkPaid = async (orderId: string) => {
    setIsSimulatingPayment(true);
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: 'completed',
          payment_id: `TXN-POD-${Date.now().toString().slice(-6)}`,
        }),
      });
      await fetchUserOrders();
    } catch (err) {
      console.warn('Error marking order paid:', err);
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  // Close animation with 60fps physics
  const triggerClose = () => {
    setIsDrawerClosing(true);
    setIsDrawerMounted(false);

    if (drawerSheetRef.current) {
      drawerSheetRef.current.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      drawerSheetRef.current.style.transform = 'translate3d(0, 100%, 0)';
    }
    if (drawerBackdropRef.current) {
      drawerBackdropRef.current.style.transition = 'opacity 0.25s ease';
      drawerBackdropRef.current.style.opacity = '0';
    }

    setTimeout(() => {
      onClose();
      setIsDrawerClosing(false);
      setIsDrawerMounted(false);
      drawerDragOffsetRef.current = 0;
      drawerTouchStartYRef.current = null;
      setViewMode('menu_list');
    }, 280);
  };

  // Touch handlers for swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    const y = e.touches[0].clientY;
    drawerTouchStartYRef.current = y;
    lastTouchYRef.current = y;
    lastTouchTimeRef.current = performance.now();
    touchVelocityRef.current = 0;
    isSwipingDrawerRef.current = true;

    if (drawerSheetRef.current) {
      drawerSheetRef.current.style.transition = 'none';
      drawerSheetRef.current.style.willChange = 'transform';
    }
    if (drawerBackdropRef.current) {
      drawerBackdropRef.current.style.transition = 'none';
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (drawerTouchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const currentTime = performance.now();
    const rawDeltaY = currentY - drawerTouchStartYRef.current;

    const timeDiff = currentTime - lastTouchTimeRef.current;
    if (timeDiff > 0) {
      touchVelocityRef.current = (currentY - lastTouchYRef.current) / timeDiff;
    }
    lastTouchYRef.current = currentY;
    lastTouchTimeRef.current = currentTime;

    let offset = 0;
    if (rawDeltaY > 0) {
      offset = rawDeltaY;
    } else {
      offset = -Math.pow(-rawDeltaY, 0.72);
    }
    drawerDragOffsetRef.current = offset;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (drawerSheetRef.current) {
        drawerSheetRef.current.style.transform = `translate3d(0, ${offset}px, 0)`;
      }
      if (drawerBackdropRef.current && offset > 0) {
        const opacity = Math.max(0, 1 - offset / 340);
        drawerBackdropRef.current.style.opacity = `${opacity}`;
      }
    });
  };

  const handleTouchEnd = () => {
    if (drawerTouchStartYRef.current === null) return;
    isSwipingDrawerRef.current = false;
    const finalOffset = drawerDragOffsetRef.current;
    const velocity = touchVelocityRef.current;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

    if (finalOffset > 110 || velocity > 0.45) {
      triggerClose();
    } else {
      if (drawerSheetRef.current) {
        drawerSheetRef.current.style.transition = 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
        drawerSheetRef.current.style.transform = 'translate3d(0, 0, 0)';
      }
      if (drawerBackdropRef.current) {
        drawerBackdropRef.current.style.transition = 'opacity 0.25s ease';
        drawerBackdropRef.current.style.opacity = '1';
      }
      drawerDragOffsetRef.current = 0;
      drawerTouchStartYRef.current = null;
    }
  };

  // Calculate estimated time remaining safely avoiding NaN
  const getTimeRemainingText = (order: Order) => {
    if (order.status === 'delivered' || order.status === 'completed') return 'Completed';
    if (order.status === 'cancelled') return 'Cancelled';

    const defaultPrepTimeMins = order.fulfilment_mode === 'delivery' ? 35 : 20;
    const createdMs = getOrderTimestamp(order);
    const elapsedMins = Math.max(0, Math.floor((Date.now() - createdMs) / (60 * 1000)));
    const remainingMins = Math.max(2, defaultPrepTimeMins - elapsedMins);

    return `Est. ${remainingMins} mins left`;
  };

  // Status stage helper with clean light aesthetic badges
  const getStageInfo = (status: OrderStatus) => {
    switch (status) {
      case 'new':
        return {
          step: 1,
          label: 'Order Placed',
          desc: 'Sent to Royal Kitchen',
          color: 'text-amber-800 bg-amber-50/90 border-amber-200/80',
          icon: Clock,
        };
      case 'accepted':
        return {
          step: 2,
          label: 'Kitchen Accepted',
          desc: 'Head chef assigned order',
          color: 'text-sky-800 bg-sky-50/90 border-sky-200/80',
          icon: ChefHat,
        };
      case 'preparing':
        return {
          step: 3,
          label: 'Cooking in Kitchen',
          desc: 'Simmering & baking in tandoor',
          color: 'text-orange-800 bg-orange-50/90 border-orange-200/80',
          icon: Flame,
        };
      case 'ready':
      case 'out_for_delivery':
      case 'served':
        return {
          step: 4,
          label: 'Out for Delivery / Serving',
          desc: 'Steward or rider dispatched',
          color: 'text-purple-800 bg-purple-50/90 border-purple-200/80',
          icon: Truck,
        };
      case 'delivered':
      case 'completed':
      case 'collected':
        return {
          step: 5,
          label: 'Delivered & Served',
          desc: 'Enjoy your royal feast!',
          color: 'text-emerald-800 bg-emerald-50/90 border-emerald-200/80',
          icon: CheckCircle2,
        };
      case 'cancelled':
        return {
          step: 0,
          label: 'Cancelled',
          desc: 'Order cancelled',
          color: 'text-rose-800 bg-rose-50/90 border-rose-200/80',
          icon: AlertCircle,
        };
      default:
        return {
          step: 1,
          label: 'Order Received',
          desc: 'Processing',
          color: 'text-amber-800 bg-amber-50/90 border-amber-200/80',
          icon: Clock,
        };
    }
  };

  if (!isOpen) return null;

  const isWholePageMode = viewMode === 'your_orders' || viewMode === 'order_history';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-end items-center">
      {/* Light Minimal Luxury Backdrop */}
      <div
        ref={drawerBackdropRef}
        onClick={triggerClose}
        className="fixed inset-0 bg-[#1A0A0B]/40 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Drawer Sheet Container - Light Minimal Theme */}
      <div
        ref={drawerSheetRef}
        className={`relative w-full max-w-xl bg-[#FFFDF9] rounded-t-[28px] sm:rounded-t-[32px] sm:rounded-b-[24px] sm:mb-4 border-t sm:border border-[#E8DFCE] shadow-[0_-12px_45px_rgba(20,5,5,0.12)] sm:shadow-[0_20px_60px_rgba(20,5,5,0.18)] flex flex-col [touch-action:none] select-none text-[#4F0809] z-10 overflow-hidden transition-all duration-300 ${
          isWholePageMode ? 'h-[92vh] sm:h-[88vh]' : 'max-h-[82vh]'
        }`}
      >
        {/* Light Minimal Header Bar & Drag Handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full pt-2.5 pb-3 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing bg-[#FFFDF9] border-b border-[#E8DFCE]/60 shrink-0"
        >
          {/* Subtle Gold Pill Handle */}
          <div className="w-10 h-1 bg-[#D8AA67]/40 rounded-full mb-2 hover:bg-[#D8AA67]/70 transition-colors" />

          {/* Header Content */}
          <div className="w-full px-4 sm:px-5 flex items-center justify-between text-[#4F0809]">
            {isWholePageMode ? (
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode('menu_list')}
                  className="px-2.5 py-1 rounded-full bg-[#FAF3E0] hover:bg-[#EFE2CC] text-[#4F0809] border border-[#E8DFCE] flex items-center gap-1 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#9C7A45]" />
                  <span>Back</span>
                </button>
                <div className="border-l border-[#E8DFCE] pl-2 min-w-0">
                  <h3
                    className="text-base sm:text-lg font-bold tracking-tight text-[#4F0809] truncate"
                    style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                  >
                    {viewMode === 'your_orders' ? 'Your Active Orders' : 'Your Order History'}
                  </h3>
                  <span className="text-[10px] text-[#9C7A45] tracking-wider uppercase font-semibold block truncate">
                    {currentUser ? `Linked Account: ${currentUser.email || currentUser.displayName || 'UID ' + currentUser.uid.slice(0, 8)}` : 'Device Orders'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#FAF3E0] border border-[#E8DFCE] flex items-center justify-center text-[#9C7A45]">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    className="text-base sm:text-lg font-bold tracking-tight text-[#4F0809] leading-none"
                    style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                  >
                    Royal Orders Concierge
                  </h3>
                  <span className="text-[10px] text-[#9C7A45] tracking-wider uppercase font-semibold mt-0.5 block">
                    Rajmahal Palace Dining
                  </span>
                </div>
              </div>
            )}

            {/* Light Minimal Close Button */}
            <button
              type="button"
              onClick={triggerClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FAF3E0] hover:bg-[#EFE2CC] active:scale-90 flex items-center justify-center text-[#4F0809] border border-[#E8DFCE] transition-colors cursor-pointer shrink-0 ml-2"
              aria-label="Close drawer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stepper Tabs Bar in Whole-Page Mode */}
          {isWholePageMode && (
            <div className="w-full px-4 sm:px-5 mt-2.5">
              <div className="w-full bg-[#FAF7F2] p-1 rounded-full border border-[#E8DFCE] flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('your_orders')}
                  className={`flex-1 py-1.5 px-3 rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'your_orders'
                      ? 'bg-white text-[#4F0809] font-bold shadow-2xs border border-[#E8DFCE]'
                      : 'text-[#856B4D] hover:text-[#4F0809] font-medium'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-[#9C7A45]" />
                  <span className="truncate">Active Feasts</span>
                  {activeOrders.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {activeOrders.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('order_history')}
                  className={`flex-1 py-1.5 px-3 rounded-full flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'order_history'
                      ? 'bg-white text-[#4F0809] font-bold shadow-2xs border border-[#E8DFCE]'
                      : 'text-[#856B4D] hover:text-[#4F0809] font-medium'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-[#9C7A45]" />
                  <span className="truncate">Order History</span>
                  {historyOrders.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#FAF3E0] text-[#856B4D] text-[10px] font-bold">
                      {historyOrders.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            VIEW 1: MENU OPTIONS LIST ONLY (LIGHT MINIMAL)
        ═══════════════════════════════════════════════════════════════ */}
        {viewMode === 'menu_list' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
            {/* User Session Context Card */}
            <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#4F0809] text-[#FFF8EB] font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser ? (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase() : <User className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#4F0809] truncate">
                    {currentUser ? (currentUser.displayName || currentUser.email) : 'Guest Diner Session'}
                  </p>
                  <p className="text-[10px] text-[#856B4D] truncate">
                    {currentUser ? `Linked Account: ${currentUser.uid.slice(0, 10)}...` : 'Orders linked to this device'}
                  </p>
                </div>
              </div>
              <span className="text-[9px] uppercase tracking-wider font-bold bg-white text-[#4F0809] border border-[#E8DFCE] px-2 py-0.5 rounded-full shrink-0">
                {currentUser ? 'Logged In' : 'Guest'}
              </span>
            </div>

            {/* The List of Options */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9C7A45] px-1 block">
                Royal Order Options
              </span>

              {/* Option 1: Place New Order */}
              <button
                type="button"
                onClick={() => {
                  triggerClose();
                  router.push('/menu');
                }}
                className="w-full p-4 rounded-2xl bg-white hover:bg-[#FAF7F2] border border-[#E8DFCE] hover:border-[#D8AA67]/60 shadow-2xs hover:shadow-xs flex items-center justify-between text-left active:scale-[0.99] transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFCE] flex items-center justify-center text-[#4F0809] group-hover:bg-[#FAF3E0] transition-colors shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h4
                      className="text-base font-bold text-[#4F0809] leading-tight mb-0.5"
                      style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                    >
                      Place New Order
                    </h4>
                    <p className="text-xs text-[#856B4D] leading-snug">
                      Browse Rajasthani restaurant, tandoor &amp; courtyard café menus
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#9C7A45] group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* Option 2: Your Orders (Opens whole-page view) */}
              <button
                type="button"
                onClick={() => setViewMode('your_orders')}
                className="w-full p-4 rounded-2xl bg-white hover:bg-[#FAF7F2] border border-[#E8DFCE] hover:border-[#D8AA67]/60 shadow-2xs hover:shadow-xs flex items-center justify-between text-left active:scale-[0.99] transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFCE] flex items-center justify-center text-[#4F0809] group-hover:bg-[#FAF3E0] transition-colors shrink-0 relative">
                    <Clock className="w-5 h-5 text-[#9C7A45]" />
                    {activeOrders.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4
                        className="text-base font-bold text-[#4F0809] leading-tight"
                        style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                      >
                        Your Orders
                      </h4>
                      {activeOrders.length > 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {activeOrders.length} Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#856B4D]">None active</span>
                      )}
                    </div>
                    <p className="text-xs text-[#856B4D] leading-snug truncate">
                      {activeOrders.length > 0
                        ? `${activeOrders[0].order_number} • ${getTimeRemainingText(activeOrders[0])}`
                        : 'Active live kitchen tracker & preparation status'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#9C7A45] shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Track</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Option 3: Order History (Opens whole-page view) */}
              <button
                type="button"
                onClick={() => setViewMode('order_history')}
                className="w-full p-4 rounded-2xl bg-white hover:bg-[#FAF7F2] border border-[#E8DFCE] hover:border-[#D8AA67]/60 shadow-2xs hover:shadow-xs flex items-center justify-between text-left active:scale-[0.99] transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFCE] flex items-center justify-center text-[#4F0809] group-hover:bg-[#FAF3E0] transition-colors shrink-0">
                    <History className="w-5 h-5 text-[#9C7A45]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4
                        className="text-base font-bold text-[#4F0809] leading-tight"
                        style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                      >
                        Order History
                      </h4>
                      {historyOrders.length > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF3E0] text-[#856B4D] border border-[#E8DFCE]">
                          {historyOrders.length} Past
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#856B4D] leading-snug truncate">
                      Past delivered feasts, receipts &amp; one-tap re-order
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#9C7A45] group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            VIEW 2: WHOLE-PAGE VIEW FOR "YOUR ORDERS" (ACTIVE ORDERS)
        ═══════════════════════════════════════════════════════════════ */}
        {viewMode === 'your_orders' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {loading && (
              <div className="py-12 text-center flex flex-col items-center">
                <RotateCw className="w-6 h-6 text-[#9C7A45] animate-spin mb-2.5" />
                <p className="text-xs text-[#856B4D] font-medium">Checking live status with Royal Kitchen...</p>
              </div>
            )}

            {!loading && activeOrders.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-[#E8DFCE] p-6 shadow-2xs">
                <div className="w-14 h-14 rounded-full bg-[#FAF7F2] border border-[#E8DFCE] flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-7 h-7 text-[#9C7A45]" />
                </div>
                <h4
                  className="text-xl font-bold text-[#4F0809] mb-1"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  No Active Orders
                </h4>
                <p className="text-xs text-[#856B4D] mb-5 max-w-xs mx-auto leading-relaxed">
                  {currentUser
                    ? `No ongoing orders in preparation for ${currentUser.displayName || currentUser.email || 'your account'}. Explore our royal menu to place an order.`
                    : 'You do not have any active food orders in preparation right now. Explore our royal menu to place an order.'}
                </p>
                <div className="space-y-2 max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      triggerClose();
                      router.push('/menu');
                    }}
                    className="w-full py-2.5 px-5 rounded-full bg-[#4F0809] text-[#FFF8EB] text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-[#3D0607] transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Browse Royal Menu</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('menu_list')}
                    className="w-full py-2 px-4 text-xs font-bold text-[#4F0809] hover:underline"
                  >
                    Back to Options List
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#9C7A45]">
                    Active Kitchen Pipeline ({activeOrders.length})
                  </span>
                  <button
                    type="button"
                    onClick={fetchUserOrders}
                    className="text-[11px] text-[#4F0809] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3 text-[#9C7A45]" /> Refresh Status
                  </button>
                </div>

                {activeOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  const stage = getStageInfo(order.status);
                  const isPayOnDelivery =
                    order.payment_method === 'pay_on_delivery' ||
                    (order.payment_status === 'pending' && (!order.payment_method || order.payment_method === 'pay_on_delivery'));

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                        isSelected
                          ? 'border-[#4F0809]/40 shadow-sm ring-1 ring-[#4F0809]/15'
                          : 'border-[#E8DFCE] hover:border-[#D8AA67]'
                      }`}
                    >
                      {/* Summary Card Header */}
                      <div
                        onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
                        className="p-3.5 sm:p-4 cursor-pointer flex items-center justify-between gap-3 bg-white hover:bg-[#FAF7F2]/60 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#4F0809]">{order.order_number}</span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${stage.color}`}>
                              {stage.label}
                            </span>
                          </div>
                          <p className="text-xs text-[#856B4D] flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#9C7A45] shrink-0" />
                            <span>
                              {order.table_id
                                ? `Table ${order.table_id}`
                                : order.room_number
                                ? `Room ${order.room_number}`
                                : order.fulfilment_mode === 'delivery'
                                ? 'Doorstep Delivery'
                                : 'Takeaway Pickup'}
                            </span>
                            <span>•</span>
                            <span className="font-bold text-emerald-700">{getTimeRemainingText(order)}</span>
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-2 shrink-0">
                          <div>
                            <span
                              className="text-base font-bold text-[#4F0809]"
                              style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                            >
                              {formatMoney(order.total_minor)}
                            </span>
                            <span className="block text-[10px] text-[#856B4D]">
                              {order.order_lines?.length || 1} items
                            </span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-[#856B4D] transition-transform ${
                              isSelected ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Detailed Order View with Live Preparation Pipeline */}
                      {isSelected && (
                        <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-[#E8DFCE] bg-[#FAF7F2]/40 space-y-3.5 text-xs">
                          {/* Live 4-Stage Kitchen Progress Pipeline */}
                          <div className="pt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C7A45] block mb-2">
                              Kitchen Preparation Pipeline
                            </span>
                            <div className="grid grid-cols-4 gap-1 relative text-center">
                              {[
                                { label: 'Accepted', step: 2, icon: ChefHat },
                                { label: 'Cooking', step: 3, icon: Flame },
                                { label: 'Serving', step: 4, icon: Truck },
                                { label: 'Delivered', step: 5, icon: CheckCircle2 },
                              ].map((stepItem, idx) => {
                                const isCurrent = stage.step === stepItem.step;
                                const isDone = stage.step >= stepItem.step;
                                const IconComponent = stepItem.icon;

                                return (
                                  <div key={idx} className="flex flex-col items-center">
                                    <div
                                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mb-1 transition-all ${
                                        isCurrent
                                          ? 'bg-[#4F0809] text-[#FFF8EB] ring-2 ring-[#D8AA67]/60 scale-105 shadow-xs'
                                          : isDone
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-white text-[#856B4D] border border-[#E8DFCE]'
                                      }`}
                                    >
                                      <IconComponent className="w-3.5 h-3.5" />
                                    </div>
                                    <span
                                      className={`text-[9px] sm:text-[10px] font-medium leading-tight ${
                                        isCurrent ? 'text-[#4F0809] font-bold' : isDone ? 'text-emerald-800' : 'text-[#856B4D]'
                                      }`}
                                    >
                                      {stepItem.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Itemized Food Dishes */}
                          <div className="bg-white rounded-xl p-3 border border-[#E8DFCE] space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#856B4D] block">
                              Ordered Items ({order.order_lines?.length || 0})
                            </span>
                            {(order.order_lines || []).map((line, i) => (
                              <div
                                key={i}
                                className="flex justify-between items-start py-1.5 border-b border-[#FAF7F2] last:border-0"
                              >
                                <div>
                                  <span className="font-semibold text-[#4F0809]">
                                    {line.quantity}x {line.item_name_snapshot}
                                  </span>
                                  {line.notes && <p className="text-[10px] text-[#856B4D]">{line.notes}</p>}
                                </div>
                                <span className="font-bold text-[#4F0809]">{formatMoney(line.line_total_minor)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Billing Breakdown */}
                          <div className="p-3 rounded-xl bg-white border border-[#E8DFCE] space-y-1 text-[11px] text-[#856B4D]">
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span className="font-medium text-[#4F0809]">{formatMoney(order.subtotal_minor)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>GST (5%)</span>
                              <span className="font-medium text-[#4F0809]">{formatMoney(order.tax_minor)}</span>
                            </div>
                            {order.delivery_fee_minor > 0 && (
                              <div className="flex justify-between">
                                <span>Delivery Fee</span>
                                <span className="font-medium text-[#4F0809]">{formatMoney(order.delivery_fee_minor)}</span>
                              </div>
                            )}
                            {order.service_charge_minor > 0 && (
                              <div className="flex justify-between">
                                <span>Palace Service Charge (2.5%)</span>
                                <span className="font-medium text-[#4F0809]">{formatMoney(order.service_charge_minor)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-sm text-[#4F0809] pt-1.5 border-t border-[#E8DFCE]">
                              <span>Total Amount</span>
                              <span>{formatMoney(order.total_minor)}</span>
                            </div>
                          </div>

                          {/* Pay on Delivery QR Code Section */}
                          {isPayOnDelivery && (
                            <div className="bg-white rounded-2xl p-3.5 border border-[#E8DFCE] text-center shadow-2xs">
                              <div className="flex items-center justify-center gap-1.5 text-[#4F0809] font-bold text-xs uppercase tracking-wider mb-1">
                                <QrCode className="w-4 h-4 text-[#9C7A45]" />
                                <span>Pay on Delivery UPI QR Code</span>
                              </div>
                              <p className="text-[11px] text-[#856B4D] mb-2.5">
                                Scan with any UPI app to settle <strong className="text-[#4F0809]">{formatMoney(order.total_minor)}</strong>.
                              </p>

                              {payQrDataUrl ? (
                                <div className="inline-block p-1.5 bg-[#FAF7F2] rounded-xl border border-[#E8DFCE] shadow-2xs mb-2.5">
                                  <img src={payQrDataUrl} alt="UPI Payment QR" className="w-36 h-36 object-contain mx-auto" />
                                </div>
                              ) : (
                                <div className="w-36 h-36 bg-[#FAF7F2] mx-auto rounded-xl flex items-center justify-center mb-2.5">
                                  <RotateCw className="w-5 h-5 text-[#856B4D] animate-spin" />
                                </div>
                              )}

                              <div className="flex items-center justify-center gap-2 mb-2.5">
                                <span className="font-mono text-xs font-bold text-[#4F0809]">rajmahal@icici</span>
                                <button
                                  type="button"
                                  onClick={handleCopyUpi}
                                  className="px-2.5 py-1 rounded-full bg-[#FAF7F2] hover:bg-[#FAF3E0] border border-[#E8DFCE] text-[10px] font-bold text-[#4F0809] flex items-center gap-1 active:scale-95 cursor-pointer"
                                >
                                  {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={isSimulatingPayment}
                                onClick={() => handleSimulateMarkPaid(order.id)}
                                className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs tracking-wide transition shadow-2xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {isSimulatingPayment ? (
                                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Mark Paid via QR / Cash</span>
                              </button>
                            </div>
                          )}

                          {/* Paid Badge if Completed */}
                          {!isPayOnDelivery && order.payment_status === 'completed' && (
                            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-bold text-xs">Payment Completed ({order.payment_method?.toUpperCase() || 'ONLINE'})</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            VIEW 3: WHOLE-PAGE VIEW FOR "ORDER HISTORY" (LIGHT MINIMAL)
        ═══════════════════════════════════════════════════════════════ */}
        {viewMode === 'order_history' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {loading && (
              <div className="py-12 text-center flex flex-col items-center">
                <RotateCw className="w-6 h-6 text-[#9C7A45] animate-spin mb-2.5" />
                <p className="text-xs text-[#856B4D] font-medium">Loading your royal feast history...</p>
              </div>
            )}

            {!loading && historyOrders.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-[#E8DFCE] p-6 shadow-2xs">
                <div className="w-14 h-14 rounded-full bg-[#FAF7F2] border border-[#E8DFCE] flex items-center justify-center mx-auto mb-3">
                  <History className="w-7 h-7 text-[#9C7A45]" />
                </div>
                <h4
                  className="text-xl font-bold text-[#4F0809] mb-1"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  No Past Orders
                </h4>
                <p className="text-xs text-[#856B4D] mb-5 max-w-xs mx-auto leading-relaxed">
                  {currentUser
                    ? `No completed past orders found for ${currentUser.displayName || currentUser.email || 'your account'}.`
                    : 'You do not have any past completed orders on this device yet.'}
                </p>
                <div className="space-y-2 max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => {
                      triggerClose();
                      router.push('/menu');
                    }}
                    className="w-full py-2.5 px-5 rounded-full bg-[#4F0809] text-[#FFF8EB] text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-[#3D0607] transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Explore Royal Menu</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('menu_list')}
                    className="w-full py-2 px-4 text-xs font-bold text-[#4F0809] hover:underline"
                  >
                    Back to Options List
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9C7A45] px-1 block">
                  Past Delivered Meals ({historyOrders.length})
                </span>

                {historyOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-[#E8DFCE] hover:border-[#D8AA67]/60 overflow-hidden shadow-2xs transition-all"
                    >
                      <div
                        onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
                        className="p-3.5 sm:p-4 cursor-pointer flex items-center justify-between gap-3 bg-white hover:bg-[#FAF7F2]/60 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#4F0809]">{order.order_number}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {order.status === 'cancelled' ? 'Cancelled' : 'Delivered'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#856B4D] mt-0.5 truncate max-w-[210px] sm:max-w-xs">
                            {order.order_lines?.map((l) => `${l.quantity}x ${l.item_name_snapshot}`).slice(0, 2).join(', ')}
                            {(order.order_lines?.length || 0) > 2 ? ' ...' : ''}
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <div>
                            <span
                              className="text-sm font-bold text-[#4F0809]"
                              style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                            >
                              {formatMoney(order.total_minor)}
                            </span>
                            <span className="block text-[10px] text-[#856B4D]">
                              {new Date(getOrderTimestamp(order)).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-[#856B4D] transition-transform ${isSelected ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>

                      {isSelected && (
                        <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-[#E8DFCE] bg-[#FAF7F2]/40 space-y-3 text-xs">
                          <div className="space-y-1.5 py-1">
                            {(order.order_lines || []).map((line, i) => (
                              <div key={i} className="flex justify-between text-[#4F0809] py-0.5">
                                <span>
                                  {line.quantity}x {line.item_name_snapshot}
                                </span>
                                <span className="font-semibold">{formatMoney(line.line_total_minor)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="p-2.5 rounded-xl bg-white border border-[#E8DFCE] flex justify-between font-bold text-[#4F0809]">
                            <span>Total Paid</span>
                            <span>{formatMoney(order.total_minor)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              triggerClose();
                              router.push('/menu');
                            }}
                            className="w-full py-2.5 rounded-xl bg-[#FAF3E0] hover:bg-[#EFE2CC] text-[#4F0809] font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-1.5 border border-[#E8DFCE] cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5 text-[#9C7A45]" />
                            <span>Order Again from Menu</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
