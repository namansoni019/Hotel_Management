'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Utensils,
  ShoppingBag,
  Bell,
  Truck,
  Users,
  Armchair,
  Grid,
  List,
  ChevronRight,
  Clock,
  Sparkles,
  Receipt,
  Check,
  X,
  FileText,
  BadgePercent,
  Shield,
  Wifi,
  Smartphone,
  ArrowRight,
  Loader2,
  IndianRupee,
  Timer,
  ScanLine,
  CircleDollarSign,
  Lock,
  Zap,
  ChevronDown,
  BedDouble,
  Hotel,
} from 'lucide-react';
import type { MenuItem, Reservation, BillingSettings } from '@/lib/types';

interface POSTable {
  id: string;
  number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}

interface POSCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  is_veg: boolean;
  modifier?: string;
}

interface RecentOrder {
  id: string;
  table: string;
  time: string;
  amount: number;
  status: 'Paid' | 'Pending';
}

const DEFAULT_TABLES: POSTable[] = [];

const DEFAULT_MENU_ITEMS: Array<{
  id: string;
  name: string;
  category: string;
  price: number;
  is_veg: boolean;
  image_url: string;
}> = [];

const INITIAL_RECENT_ORDERS: RecentOrder[] = [];

const CATEGORIES = [
  'All',
  'Starters',
  'Main Course',
  'Indian Breads',
  'Rice & Biryani',
  'Soups',
  'Salads',
  'Desserts',
  'Beverages',
];

export default function POSBillingPage() {
  // Order Type Mode
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'room_service' | 'delivery'>('dine_in');

  // Tables State
  const [tables, setTables] = useState<POSTable[]>(DEFAULT_TABLES);
  const [tableSearch, setTableSearch] = useState('');
  const [tableFilter, setTableFilter] = useState<'all' | 'available' | 'occupied' | 'reserved'>('all');
  const [selectedTable, setSelectedTable] = useState<POSTable | null>(null);

  // Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Recent Orders State
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>(INITIAL_RECENT_ORDERS);

  // Menu State
  const [menuItems, setMenuItems] = useState(DEFAULT_MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [menuSearch, setMenuSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Cart State (Initialized with items from screenshot for rich immediate experience)
  const [cart, setCart] = useState<POSCartItem[]>([]);

  // Special instructions
  const [specialNote, setSpecialNote] = useState('');

  // Discount & Payment
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [tempDiscountPercent, setTempDiscountPercent] = useState('10');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [tenderAmount, setTenderAmount] = useState('0.00');

  // ═══ Payment Gateway State ═══
  const [isPaymentGatewayOpen, setIsPaymentGatewayOpen] = useState(false);
  const [pgTab, setPgTab] = useState<'upi' | 'card' | 'cash' | 'room_folio'>('upi');
  const [pgProcessing, setPgProcessing] = useState(false);
  const [pgSuccess, setPgSuccess] = useState(false);
  const [pgTransactionId, setPgTransactionId] = useState('');
  // In-House Room Folio
  const [inHouseGuests, setInHouseGuests] = useState<Reservation[]>([]);
  const [selectedFolioResId, setSelectedFolioResId] = useState<string>('');
  const [folioVerificationNote, setFolioVerificationNote] = useState<string>('');
  // UPI
  const [upiCountdown, setUpiCountdown] = useState(300); // 5 minutes
  const [upiId, setUpiId] = useState('rajmahal@hdfcbank');
  const upiTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Card
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | 'rupay' | 'unknown'>('unknown');
  // Cash gateway
  const [pgCashReceived, setPgCashReceived] = useState('');

  // Completed Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    items: POSCartItem[];
    subtotal: number;
    discount: number;
    tax: number;
    packagingFee?: number;
    deliveryFee?: number;
    total: number;
    paymentMethod: string;
    table: string;
    orderType: string;
    customer?: { name: string; phone: string } | null;
    time: string;
    transactionId?: string;
  } | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load live tables and menu if available
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const [tabRes, menuRes, resRes, billRes] = await Promise.all([
          fetch('/api/tables'),
          fetch('/api/menu'),
          fetch('/api/reservations'),
          fetch('/api/settings/billing').catch(() => null),
        ]);

        if (billRes && billRes.ok) {
          const billData = await billRes.json();
          if (billData.settings) {
            setBillingSettings(billData.settings);
          }
        }

        if (resRes.ok) {
          const resData = await resRes.json();
          if (Array.isArray(resData.reservations)) {
            const active = resData.reservations.filter((r: Reservation) => r.status === 'checked_in' || r.status === 'confirmed');
            setInHouseGuests(active);
            if (active.length > 0) setSelectedFolioResId(active[0].id);
          }
        }

        if (tabRes.ok) {
          const tabData = await tabRes.json();
          if (Array.isArray(tabData.tables) && tabData.tables.length > 0) {
            const mapped: POSTable[] = tabData.tables.map((t: any) => ({
              id: t.id,
              number: t.table_number,
              capacity: t.capacity || 4,
              status: t.status === 'occupied' ? 'occupied' : t.status === 'reserved' ? 'reserved' : 'available',
            }));
            setTables(mapped);
            setSelectedTable((prev) => prev || mapped[0]);
          } else {
            setTables([]);
            setSelectedTable(null);
          }
        }

        if (menuRes.ok) {
          const menuData = await menuRes.json();
          if (Array.isArray(menuData.categories) && menuData.categories.length > 0) {
            const flattened: any[] = [];
            menuData.categories.forEach((c: any) => {
              (c.items || []).forEach((item: any) => {
                flattened.push({
                  id: item.id,
                  name: item.name,
                  category: c.name,
                  price: item.price_minor / 100,
                  is_veg: item.dietary_labels?.includes('Vegetarian') ?? true,
                  image_url: item.image_url || '/images/food/dal-baati.jpg',
                });
              });
            });
            setMenuItems(flattened);
          } else {
            setMenuItems([]);
          }
        }
      } catch (err) {
        console.warn('POS live sync notice:', err);
      }
    };
    fetchLive();
  }, []);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (tableFilter !== 'all' && t.status !== tableFilter) return false;
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        return t.number.toLowerCase().includes(q) || `${t.capacity} seater`.includes(q);
      }
      return true;
    });
  }, [tables, tableFilter, tableSearch]);

  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (menuSearch.trim()) {
        const q = menuSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCategory, menuSearch]);

  // Cart Calculations with Surcharges & Taxes
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const gstPercent = billingSettings?.restaurant_gst_percent ?? 5;
  const tax = Math.round(((subtotal * gstPercent) / 100) * 100) / 100;

  // Takeaway & Delivery Packaging Surcharge
  const isPackagingEnabled = billingSettings ? billingSettings.packaging_charges_enabled : true;
  let packagingCharge = 0;
  if (isPackagingEnabled && cart.length > 0) {
    if (orderType === 'takeaway') {
      packagingCharge = billingSettings ? billingSettings.packaging_charges_pickup : 25;
    } else if (orderType === 'delivery') {
      packagingCharge = billingSettings ? billingSettings.packaging_charges_delivery : 25;
    }
  }

  // Online Delivery Charge
  let deliveryCharge = 0;
  if (orderType === 'delivery' && (billingSettings?.delivery_enabled ?? true)) {
    const freeAbove = billingSettings?.delivery_free_above ?? 500;
    if (freeAbove > 0 && subtotal >= freeAbove) {
      deliveryCharge = 0;
    } else {
      deliveryCharge = billingSettings ? billingSettings.delivery_charges : 50;
    }
  }

  const rawTotal = Math.max(0, subtotal - discountAmount + tax + packagingCharge + deliveryCharge);
  const finalTotal = billingSettings?.round_off_cash ? Math.round(rawTotal) : Math.round(rawTotal * 100) / 100;

  // Update tender amount when finalTotal changes
  useEffect(() => {
    setTenderAmount(finalTotal.toFixed(2));
  }, [finalTotal]);

  // ═══ UPI Countdown Timer ═══
  useEffect(() => {
    if (isPaymentGatewayOpen && pgTab === 'upi' && !pgProcessing && !pgSuccess) {
      upiTimerRef.current = setInterval(() => {
        setUpiCountdown((prev) => {
          if (prev <= 1) {
            if (upiTimerRef.current) clearInterval(upiTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (upiTimerRef.current) clearInterval(upiTimerRef.current);
    };
  }, [isPaymentGatewayOpen, pgTab, pgProcessing, pgSuccess]);

  // ═══ Card type detection ═══
  useEffect(() => {
    const num = cardNumber.replace(/\s/g, '');
    if (num.startsWith('4')) setCardType('visa');
    else if (num.startsWith('5') || num.startsWith('2')) setCardType('mastercard');
    else if (num.startsWith('6') || num.startsWith('82') || num.startsWith('508')) setCardType('rupay');
    else setCardType('unknown');
  }, [cardNumber]);

  // Card number formatter
  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  // Cart Handlers
  const handleAddToCart = (item: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    is_veg: boolean;
  }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQ = i.quantity + delta;
            return newQ > 0 ? { ...i, quantity: newQ } : null;
          }
          return i;
        })
        .filter(Boolean) as POSCartItem[]
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setSpecialNote('');
    showToast('success', 'Cart cleared');
  };

  const handleResetNewOrder = () => {
    setCart([]);
    setDiscountAmount(0);
    setSpecialNote('');
    setSelectedCustomer(null);
    showToast('success', 'Ready for new order');
  };

  const handleApplyDiscount = () => {
    const pct = parseFloat(tempDiscountPercent) || 0;
    const disc = Math.round(((subtotal * pct) / 100) * 100) / 100;
    setDiscountAmount(disc);
    setIsDiscountModalOpen(false);
    showToast('success', `${pct}% discount applied (₹${disc})`);
  };

  // ═══ Open Payment Gateway instead of completing directly ═══
  const handleCompleteOrder = () => {
    if (cart.length === 0) {
      showToast('error', 'Cart is empty. Add menu items first.');
      return;
    }
    // Reset gateway state
    setPgProcessing(false);
    setPgSuccess(false);
    setPgTransactionId('');
    setPgTab(paymentMethod);
    setUpiCountdown(300);
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setCardName('');
    setPgCashReceived(finalTotal.toFixed(2));
    setIsPaymentGatewayOpen(true);
  };

  // ═══ Process payment from gateway ═══
  const handleProcessPayment = useCallback(() => {
    setPgProcessing(true);
    const txnId = `TXN${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 9000 + 1000)}`;
    setPgTransactionId(txnId);

    // Simulate processing delay
    setTimeout(() => {
      setPgProcessing(false);
      setPgSuccess(true);

      // After success animation, finalize order
      setTimeout(() => {
        const orderId = `#ORD-${Math.floor(1000 + Math.random() * 9000)}`;
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const orderRecord: RecentOrder = {
          id: orderId,
          table: orderType === 'dine_in' ? (selectedTable ? `Table ${selectedTable.number}` : 'Counter') : orderType.toUpperCase(),
          time: timeStr,
          amount: finalTotal,
          status: 'Paid',
        };

        setRecentOrders((prev) => [orderRecord, ...prev.slice(0, 5)]);

        if (orderType === 'dine_in' && selectedTable) {
          setTables((prev) =>
            prev.map((t) => (t.id === selectedTable.id ? { ...t, status: 'occupied' } : t))
          );
        }

        const folioGuest = inHouseGuests.find((r) => r.id === selectedFolioResId);
        const methodDisplay =
          pgTab === 'room_folio'
            ? `ROOM FOLIO (Room ${folioGuest?.room?.room_number || 'Chamber'} - ${folioGuest?.guest?.name || 'Guest'})`
            : pgTab.toUpperCase();

        setCompletedOrder({
          orderId,
          items: [...cart],
          subtotal,
          discount: discountAmount,
          tax,
          packagingFee: packagingCharge,
          deliveryFee: deliveryCharge,
          total: finalTotal,
          paymentMethod: methodDisplay,
          table: selectedTable ? selectedTable.number : 'Counter',
          orderType: orderType === 'dine_in' ? 'Dine-in' : orderType === 'takeaway' ? 'Takeaway' : orderType === 'room_service' ? 'Room Service' : 'Delivery',
          customer: selectedCustomer,
          time: timeStr,
          transactionId: txnId,
        });

        setCart([]);
        setDiscountAmount(0);
        setSpecialNote('');
        setIsPaymentGatewayOpen(false);
        setPgSuccess(false);
      }, 2000);
    }, 3000);
  }, [cart, discountAmount, finalTotal, orderType, pgTab, selectedCustomer, selectedTable, subtotal, tax, deliveryCharge, packagingCharge]);

  // Cash change calculation
  const cashReceived = parseFloat(pgCashReceived) || 0;
  const cashChange = Math.max(0, cashReceived - finalTotal);

  return (
    <div className="space-y-3 pb-8">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border transition-all animate-bounce ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ── Top Header matching Screenshot ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-[#E8DCD2]">
        <div>
          <h1
            className="text-2xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            POS Billing
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Create orders for walk-in customers, table orders or room service
          </p>
        </div>

        {/* 4 Order Type Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl p-1 bg-[#FBF6EF] border border-[#E8DCD2] gap-1">
            {[
              { id: 'dine_in', label: 'Dine-in', icon: Utensils },
              { id: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
              { id: 'room_service', label: 'Room Service', icon: Bell },
              { id: 'delivery', label: 'Delivery', icon: Truck },
            ].map((mode) => {
              const Icon = mode.icon;
              const isActive = orderType === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setOrderType(mode.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    isActive
                      ? 'bg-[#4F0809] text-white shadow-2xs'
                      : 'text-[#81736D] hover:text-[#302421] hover:bg-white/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3-Column Main Layout matching Screenshot ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* ════ COLUMN 1: LEFT WIDGETS (Tables, Customer, Recent Orders) ════ */}
        <div className="lg:col-span-3 space-y-3">
          {/* 1. Tables Widget */}
          <div className="bg-white border border-[#E8DCD2] rounded-2xl p-3 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#302421]">Tables</h2>
              <span className="text-[10px] text-[#81736D]">{tables.length} Total</span>
            </div>

            {/* Table Search */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#81736D]" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search tables..."
                className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809]"
              />
            </div>

            {/* Table Filter Tabs */}
            <div className="flex items-center gap-1 text-[10px] font-semibold flex-wrap">
              {[
                { id: 'all', label: `All (${tables.length})` },
                { id: 'available', label: `Available (${availableCount})` },
                { id: 'occupied', label: `Occupied (${occupiedCount})` },
                { id: 'reserved', label: `Reserved (${reservedCount})` },
              ].map((tab) => {
                const isActive = tableFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTableFilter(tab.id as any)}
                    className={`px-2 py-0.5 rounded-full transition cursor-pointer ${
                      isActive
                        ? 'bg-[#4F0809] text-white font-bold'
                        : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Table Grid (4 columns) */}
            <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
              {filteredTables.length === 0 ? (
                <div className="col-span-4 py-4 text-center text-[#81736D] text-[11px]">
                  No tables configured yet.
                </div>
              ) : (
                filteredTables.map((t) => {
                  const isSelected = selectedTable?.id === t.id;
                  const isOccupied = t.status === 'occupied';
                  const isReserved = t.status === 'reserved';

                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTable(t)}
                      className={`p-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'ring-2 ring-[#4F0809] border-[#4F0809]'
                          : ''
                      } ${
                        isOccupied
                          ? 'bg-[#FEE2E2] border-[#FECACA] text-[#991B1B]'
                          : isReserved
                          ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                          : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                      }`}
                    >
                      <span className="font-bold text-xs">{t.number}</span>
                      <span className="text-[9px] opacity-80 truncate max-w-full">
                        {isOccupied ? 'Occup' : `${t.capacity} Seater`}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Table Legend */}
            <div className="flex items-center justify-between text-[10px] text-[#81736D] pt-1 border-t border-[#E8DCD2]/60">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Available
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Occupied
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Reserved
              </span>
            </div>
          </div>

          {/* 2. Customer (Optional) Widget */}
          <div className="bg-white border border-[#E8DCD2] rounded-2xl p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#302421] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#B78A48]" />
                Customer (Optional)
              </span>
              <button
                onClick={() => setIsAddCustomerOpen(true)}
                className="text-[10px] font-semibold text-[#4F0809] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add New
              </button>
            </div>

            {selectedCustomer ? (
              <div className="p-2 rounded-xl bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-[#302421]">{selectedCustomer.name}</p>
                  <p className="text-[10px] text-[#81736D]">{selectedCustomer.phone}</p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1 text-red-500 hover:bg-white rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#81736D]" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer by name or phone..."
                  className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-lg border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>
            )}
          </div>

          {/* 3. Recent Orders Widget */}
          <div className="bg-white border border-[#E8DCD2] rounded-2xl p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#302421]">Recent Orders</span>
              <button
                onClick={() => showToast('success', 'Syncing orders...')}
                className="text-[10px] font-semibold text-[#B78A48] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-1.5 divide-y divide-[#E8DCD2]/60">
              {recentOrders.map((ord) => (
                <div key={ord.id} className="pt-1.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-[11px] text-[#302421]">{ord.id}</p>
                    <p className="text-[10px] text-[#81736D]">
                      {ord.table} · {ord.time}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[#302421]">₹{ord.amount}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] font-bold">
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════ COLUMN 2: CENTER MENU ITEMS GRID ════ */}
        <div className="lg:col-span-5 bg-white border border-[#E8DCD2] rounded-2xl p-3.5 shadow-xs space-y-3">
          {/* Category Tabs Carousel matching Screenshot */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                    isActive
                      ? 'bg-[#4F0809] text-white border-[#4F0809] shadow-2xs'
                      : 'bg-[#FBF6EF]/50 text-[#81736D] border-transparent hover:bg-[#FBF6EF] hover:text-[#302421]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
            <button
              onClick={() => setSelectedCategory('All')}
              className="p-1 rounded-full bg-[#FBF6EF] text-[#81736D] hover:text-[#4F0809] shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Menu Items Header & Search/View Toggles */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E8DCD2]/70">
            <h2 className="text-xs font-bold text-[#302421]">Menu Items</h2>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#81736D]" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-36 sm:w-44 pl-7 pr-2.5 py-1 text-xs rounded-lg border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>

              <div className="flex items-center border border-[#E8DCD2] rounded-lg p-0.5 bg-[#FBF6EF]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-2xs text-[#4F0809]' : 'text-[#81736D]'}`}
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded ${viewMode === 'list' ? 'bg-white shadow-2xs text-[#4F0809]' : 'text-[#81736D]'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Menu Grid / List */}
          <div
            className={`max-h-[580px] overflow-y-auto pr-1 ${
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5'
                : 'space-y-2'
            }`}
          >
            {filteredMenuItems.length === 0 ? (
              <div className="col-span-full py-12 text-center text-[#81736D]">
                <Utensils className="w-8 h-8 text-[#D8AA67] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[#4F0809]">No menu items available</p>
                <p className="text-xs text-[#81736D] mt-0.5">Add items in Menu Builder to sell through POS.</p>
              </div>
            ) : (
              filteredMenuItems.map((item) => {
              const inCart = cart.find((i) => i.id === item.id);

              return (
                <div
                  key={item.id}
                  className="bg-[#FBF6EF]/25 border border-[#E8DCD2] rounded-xl overflow-hidden hover:border-[#B78A48] transition flex flex-col justify-between group shadow-2xs"
                >
                  {/* Thumbnail Image */}
                  <div className="relative h-24 w-full bg-stone-100 overflow-hidden">
                    <img
                      src={item.image_url || '/images/food/dal-baati.jpg'}
                      alt={item.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/food/dal-baati.jpg';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Veg / Non-Veg Indicator */}
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-sm bg-white/90 border border-stone-200 flex items-center justify-center shadow-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.is_veg ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-2 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-xs text-[#302421] truncate">{item.name}</p>
                      <p className="font-bold text-xs text-[#4F0809]">₹{item.price.toFixed(2)}</p>
                    </div>

                    {/* Add Button or Stepper */}
                    {inCart ? (
                      <div className="flex items-center justify-between border border-[#4F0809] rounded-lg p-0.5 bg-white text-xs">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="w-6 h-5 rounded hover:bg-red-50 text-red-600 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold text-[#4F0809]">{inCart.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="w-6 h-5 rounded hover:bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="w-full py-1 rounded-lg border border-[#E8DCD2] bg-white hover:bg-[#4F0809] hover:text-white text-[#4F0809] text-[11px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* ════ COLUMN 3: RIGHT BILLING & CURRENT ORDER CART ════ */}
        <div className="lg:col-span-4 bg-white border border-[#E8DCD2] rounded-2xl p-3.5 shadow-xs space-y-3">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-[#E8DCD2] pb-2">
            <div>
              <h2 className="text-sm font-bold text-[#302421]">Current Order</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-semibold text-[#4F0809]">
                  {selectedTable ? `Table: ${selectedTable.number} (${selectedTable.capacity} Seater)` : 'Quick Counter / Takeaway'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#FBF6EF] border border-[#E8DCD2] text-[#81736D] font-bold">
                  {orderType === 'dine_in' ? 'Dine-in' : orderType}
                </span>
              </div>
            </div>

            <button
              onClick={handleClearCart}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Cart</span>
            </button>
          </div>

          {/* Cart Items List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#81736D]">
                <Utensils className="w-8 h-8 text-[#D8AA67] mx-auto mb-1.5 opacity-60" />
                <p className="font-semibold text-[#4F0809]">No items in cart</p>
                <p className="text-[10px] text-[#81736D]">Select items from menu to start billing.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-xl border border-[#E8DCD2]/70 bg-[#FBF6EF]/20 hover:bg-[#FBF6EF]/60 transition"
                >
                  <img
                    src={item.image_url || '/images/food/dal-baati.jpg'}
                    alt={item.name}
                    className="w-9 h-9 rounded-lg object-cover border border-[#E8DCD2] shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-[#302421] truncate">{item.name}</p>
                    {item.modifier && (
                      <p className="text-[9px] text-[#B78A48] font-medium">{item.modifier}</p>
                    )}
                    <p className="text-[10px] text-[#81736D]">₹{item.price.toFixed(2)}</p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      className="w-5 h-5 rounded border border-[#E8DCD2] bg-white flex items-center justify-center text-xs text-[#81736D] hover:bg-stone-50 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-bold text-xs text-[#302421]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="w-5 h-5 rounded border border-[#E8DCD2] bg-white flex items-center justify-center text-xs text-[#81736D] hover:bg-stone-50 cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-bold text-xs text-[#302421] w-14 text-right">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>

                  <button
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="p-1 rounded text-red-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Note (Optional) */}
          <div className="pt-2 border-t border-[#E8DCD2]">
            <label className="block text-[10px] font-semibold text-[#81736D] mb-1">
              ✏️ Add Note (Optional)
            </label>
            <input
              type="text"
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="Special instructions for kitchen..."
              className="w-full px-2.5 py-1 text-xs rounded-lg border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809]"
            />
          </div>

          {/* Totals Breakdown */}
          <div className="pt-2 border-t border-[#E8DCD2] space-y-1.5 text-xs text-[#81736D]">
            <div className="flex items-center justify-between">
              <span>Subtotal ({totalItemCount} items)</span>
              <span className="font-semibold text-[#302421]">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Discount</span>
                <button
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="text-[10px] text-[#B78A48] hover:underline font-semibold"
                >
                  + Add Discount
                </button>
              </span>
              <span className="font-semibold text-emerald-600">-₹{discountAmount.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Tax ({gstPercent}% GST) ⓘ</span>
              <span className="font-semibold text-[#302421]">₹{tax.toFixed(2)}</span>
            </div>

            {packagingCharge > 0 && (
              <div className="flex items-center justify-between text-[#B78A48]">
                <span>Packaging Surcharge</span>
                <span className="font-semibold">₹{packagingCharge.toFixed(2)}</span>
              </div>
            )}

            {orderType === 'delivery' && (
              <div className="flex items-center justify-between text-[#2563EB]">
                <span>Delivery Charge</span>
                <span className="font-semibold">
                  {deliveryCharge === 0 ? (
                    <span className="text-[#10B981] font-bold">FREE</span>
                  ) : (
                    `₹${deliveryCharge.toFixed(2)}`
                  )}
                </span>
              </div>
            )}

            <div className="pt-1.5 border-t border-[#E8DCD2] flex items-center justify-between text-sm">
              <span className="font-bold text-[#302421]">Total Amount</span>
              <span className="font-bold text-base text-[#4F0809]">₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="pt-2 border-t border-[#E8DCD2] space-y-1.5">
            <span className="block text-[11px] font-bold text-[#302421]">Payment Method</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'upi', label: 'UPI Payment', icon: QrCode },
                { id: 'card', label: 'Card Payment', icon: CreditCard },
              ].map((p) => {
                const Icon = p.icon;
                const isActive = paymentMethod === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPaymentMethod(p.id as any)}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isActive
                        ? 'border-[#4F0809] bg-[#FEE2E2]/30 text-[#4F0809] ring-1 ring-[#4F0809]'
                        : 'border-[#E8DCD2] bg-white text-[#81736D] hover:bg-[#FBF6EF]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-bold">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Tender Amount Suggestions */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#81736D]">Amount Received</span>
              <span className="font-bold text-[#302421]">₹ {tenderAmount}</span>
            </div>

            <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold">
              {['500', '1000', '2000'].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setTenderAmount(`${amt}.00`)}
                  className="py-1 rounded-lg border border-[#E8DCD2] bg-white hover:bg-[#FBF6EF] text-[#302421] transition cursor-pointer"
                >
                  ₹{amt}
                </button>
              ))}
              <button
                onClick={() => setTenderAmount(finalTotal.toFixed(2))}
                className="py-1 rounded-lg border border-[#E8DCD2] bg-[#FBF6EF] hover:bg-[#E8DCD2] text-[#4F0809] transition cursor-pointer font-bold"
              >
                Exact
              </button>
            </div>
          </div>

          {/* Generate Bill & Complete Order Big Button */}
          <button
            onClick={handleCompleteOrder}
            disabled={cart.length === 0}
            className="w-full py-2.5 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#D8AA67]" />
            <span>Generate Bill &amp; Complete Order</span>
          </button>
        </div>
      </div>

      {/* ── Modal: Discount ── */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8DCD2] max-w-xs w-full p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#4F0809]">Apply Order Discount</h3>
              <button onClick={() => setIsDiscountModalOpen(false)}>
                <X className="w-4 h-4 text-[#81736D]" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-[11px] font-semibold text-[#81736D]">
                Discount Percentage (%)
              </label>
              <div className="flex items-center gap-1.5">
                {['5', '10', '15', '20'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setTempDiscountPercent(p)}
                    className={`flex-1 py-1 rounded-lg border text-xs font-bold ${
                      tempDiscountPercent === p
                        ? 'border-[#4F0809] bg-[#4F0809] text-white'
                        : 'border-[#E8DCD2] bg-white text-[#302421]'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={tempDiscountPercent}
                onChange={(e) => setTempDiscountPercent(e.target.value)}
                placeholder="Custom %"
                className="w-full px-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs focus:outline-none focus:border-[#4F0809]"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsDiscountModalOpen(false)}
                  className="px-3 py-1 rounded-lg border border-[#E8DCD2] text-[#81736D]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyDiscount}
                  className="px-4 py-1 rounded-lg bg-[#4F0809] text-white font-bold"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add Customer ── */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8DCD2] max-w-sm w-full p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#4F0809]">Add Customer Info</h3>
              <button onClick={() => setIsAddCustomerOpen(false)}>
                <X className="w-4 h-4 text-[#81736D]" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#81736D] mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Vikramaditya Singh"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#81736D] mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-1 rounded-lg border border-[#E8DCD2] text-[#81736D]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newCustName.trim()) {
                      setSelectedCustomer({ name: newCustName.trim(), phone: newCustPhone.trim() });
                      setIsAddCustomerOpen(false);
                      setNewCustName('');
                      setNewCustPhone('');
                      showToast('success', 'Customer tagged to order');
                    }
                  }}
                  className="px-4 py-1 rounded-lg bg-[#4F0809] text-white font-bold"
                >
                  Save Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Receipt / Invoice Completed ── */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8DCD2] max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Palace Receipt Header */}
            <div className="text-center space-y-1 pb-3 border-b border-[#E8DCD2]">
              <div className="w-10 h-10 rounded-full bg-[#FBF6EF] border border-[#B78A48] text-[#4F0809] flex items-center justify-center mx-auto mb-1">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <h2
                className="text-lg font-bold text-[#4F0809]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                RAJMAHAL HERITAGE GRAND
              </h2>
              <p className="text-[10px] text-[#81736D]">
                Palace Road, Jaipur, Rajasthan · GSTIN: 08AAACR1234F1Z5
              </p>
              <p className="text-xs font-bold text-[#302421]">
                Tax Invoice: {completedOrder.orderId}
              </p>
            </div>

            {/* Order Meta */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#81736D] bg-[#FBF6EF]/50 p-2.5 rounded-xl border border-[#E8DCD2]">
              <div>
                <p>
                  <span className="font-semibold text-[#302421]">Table:</span> {completedOrder.table}
                </p>
                <p>
                  <span className="font-semibold text-[#302421]">Type:</span> {completedOrder.orderType}
                </p>
              </div>
              <div className="text-right">
                <p>
                  <span className="font-semibold text-[#302421]">Time:</span> {completedOrder.time}
                </p>
                <p>
                  <span className="font-semibold text-[#302421]">Mode:</span> {completedOrder.paymentMethod}
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border border-[#E8DCD2] rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#FBF6EF] text-[10px] text-[#81736D] font-bold uppercase">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DCD2]">
                  {completedOrder.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2">
                        <p className="font-bold text-[#302421]">{it.name}</p>
                        {it.modifier && <p className="text-[9px] text-[#B78A48]">{it.modifier}</p>}
                      </td>
                      <td className="p-2 text-center">{it.quantity}</td>
                      <td className="p-2 text-right">₹{it.price.toFixed(2)}</td>
                      <td className="p-2 text-right font-bold">
                        ₹{(it.price * it.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

                {/* Invoice Breakdown */}
            <div className="space-y-1 text-xs text-[#81736D] pt-1 border-t border-[#E8DCD2]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{completedOrder.subtotal.toFixed(2)}</span>
              </div>
              {completedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount</span>
                  <span>-₹{completedOrder.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>CGST ({(gstPercent / 2).toFixed(1)}%)</span>
                <span>₹{(completedOrder.tax / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST ({(gstPercent / 2).toFixed(1)}%)</span>
                <span>₹{(completedOrder.tax / 2).toFixed(2)}</span>
              </div>
              {completedOrder.packagingFee !== undefined && completedOrder.packagingFee > 0 && (
                <div className="flex justify-between text-[#B78A48]">
                  <span>Packaging Surcharge</span>
                  <span>₹{completedOrder.packagingFee.toFixed(2)}</span>
                </div>
              )}
              {completedOrder.deliveryFee !== undefined && completedOrder.deliveryFee > 0 && (
                <div className="flex justify-between text-[#2563EB]">
                  <span>Delivery Charge</span>
                  <span>₹{completedOrder.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-[#4F0809] pt-1 border-t border-[#E8DCD2]">
                <span>Grand Total</span>
                <span>₹{completedOrder.total.toFixed(2)}</span>
              </div>
              {completedOrder.transactionId && (
                <div className="flex justify-between text-[10px] pt-1">
                  <span>Transaction ID</span>
                  <span className="font-mono font-semibold text-[#4F0809]">{completedOrder.transactionId}</span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl border border-[#E8DCD2] bg-white hover:bg-[#FBF6EF] text-[#4F0809] font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="flex-1 py-2 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] text-white font-bold text-xs"
              >
                Next Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ══════ PAYMENT GATEWAY MODAL ══════ */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {isPaymentGatewayOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8DCD2] max-w-lg w-full shadow-2xl overflow-hidden relative">

            {/* ── Processing Overlay ── */}
            {pgProcessing && (
              <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="relative">
                  {/* Spinning ring */}
                  <div className="w-20 h-20 rounded-full border-4 border-[#E8DCD2] border-t-[#4F0809] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-[#4F0809]" />
                  </div>
                </div>
                <p className="mt-4 text-sm font-bold text-[#4F0809]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  Processing Payment...
                </p>
                <p className="text-[11px] text-[#81736D] mt-1">Securing transaction via encrypted channel</p>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-[#B78A48]">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="font-semibold">256-bit SSL Encrypted</span>
                </div>
              </div>
            )}

            {/* ── Success Overlay ── */}
            {pgSuccess && !pgProcessing && (
              <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <p className="mt-4 text-lg font-bold text-emerald-700" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                  Payment Successful!
                </p>
                <p className="text-xs text-[#81736D] mt-1">
                  ₹{finalTotal.toFixed(2)} received via {pgTab.toUpperCase()}
                </p>
                <p className="text-[10px] font-mono text-[#B78A48] mt-2 bg-[#FBF6EF] px-3 py-1 rounded-full border border-[#E8DCD2]">
                  TXN: {pgTransactionId}
                </p>
              </div>
            )}

            {/* ── Header ── */}
            <div className="bg-gradient-to-r from-[#4F0809] to-[#7A1518] p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#D8AA67]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                      Secure Payment Gateway
                    </h3>
                    <p className="text-[10px] text-white/70">Rajmahal Heritage Grand · PCI DSS Compliant</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaymentGatewayOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Amount Display */}
              <div className="mt-3 bg-white/10 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Amount to Pay</p>
                  <p className="text-2xl font-bold text-[#D8AA67]">₹{finalTotal.toFixed(2)}</p>
                </div>
                <div className="text-right text-[10px] text-white/70">
                  <p>Table: {selectedTable ? selectedTable.number : 'Counter'}</p>
                  <p>{totalItemCount} items</p>
                </div>
              </div>
            </div>

            {/* ── Payment Tabs ── */}
            <div className="flex border-b border-[#E8DCD2]">
              {([
                { id: 'upi' as const, label: 'UPI / QR', icon: QrCode },
                { id: 'card' as const, label: 'Card', icon: CreditCard },
                { id: 'cash' as const, label: 'Cash', icon: Banknote },
                { id: 'room_folio' as const, label: 'Room Folio', icon: BedDouble },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                const isActive = pgTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setPgTab(tab.id)}
                    disabled={pgProcessing || pgSuccess}
                    className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition border-b-2 cursor-pointer ${
                      isActive
                        ? 'border-[#4F0809] text-[#4F0809] bg-[#FBF6EF]/50'
                        : 'border-transparent text-[#81736D] hover:text-[#302421] hover:bg-[#FBF6EF]/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Tab Content ── */}
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">

              {/* ═══ UPI TAB ═══ */}
              {pgTab === 'upi' && (
                <div className="space-y-4">
                  {/* QR Code Area */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      {/* QR Code placeholder - rendered as a styled box */}
                      <div className="w-48 h-48 bg-white border-2 border-[#E8DCD2] rounded-2xl p-3 shadow-inner relative overflow-hidden">
                        {/* Simulated QR pattern */}
                        <div className="w-full h-full grid grid-cols-11 grid-rows-11 gap-px">
                          {Array.from({ length: 121 }).map((_, i) => {
                            const row = Math.floor(i / 11);
                            const col = i % 11;
                            // Corner squares
                            const isCorner = (row < 3 && col < 3) || (row < 3 && col > 7) || (row > 7 && col < 3);
                            // Random fill for middle
                            const isMiddle = !isCorner && Math.random() > 0.45;
                            return (
                              <div
                                key={i}
                                className={`rounded-[1px] ${
                                  isCorner ? 'bg-[#4F0809]' : isMiddle ? 'bg-[#302421]' : 'bg-transparent'
                                }`}
                              />
                            );
                          })}
                        </div>
                        {/* Center logo */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-lg bg-white shadow-md border border-[#E8DCD2] flex items-center justify-center">
                            <IndianRupee className="w-5 h-5 text-[#4F0809]" />
                          </div>
                        </div>
                      </div>

                      {/* Scanning animation line */}
                      <div className="absolute inset-x-3 top-3 h-full overflow-hidden rounded-2xl pointer-events-none">
                        <div
                          className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#4F0809] to-transparent opacity-60"
                          style={{
                            animation: 'scanLine 2.5s ease-in-out infinite',
                          }}
                        />
                      </div>
                    </div>

                    <p className="text-xs font-bold text-[#302421] mt-3">Scan QR Code to Pay</p>
                    <p className="text-[10px] text-[#81736D]">Use any UPI app — GPay, PhonePe, Paytm, BHIM</p>
                  </div>

                  {/* Countdown Timer */}
                  <div className="flex items-center justify-center gap-2 bg-[#FBF6EF] rounded-xl p-2.5 border border-[#E8DCD2]">
                    <Timer className="w-4 h-4 text-[#B78A48]" />
                    <span className="text-xs font-bold text-[#302421]">
                      Expires in {Math.floor(upiCountdown / 60)}:{(upiCountdown % 60).toString().padStart(2, '0')}
                    </span>
                    {upiCountdown <= 60 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold animate-pulse">
                        Expiring Soon!
                      </span>
                    )}
                  </div>

                  {/* UPI ID Manual Entry */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-[#302421]">Or pay via UPI ID</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Smartphone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#81736D]" />
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="username@upi"
                          className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809] focus:ring-1 focus:ring-[#4F0809]/20"
                        />
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(upiId);
                          showToast('success', 'UPI ID copied!');
                        }}
                        className="px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF] text-[#4F0809] text-[10px] font-bold hover:bg-[#E8DCD2] transition"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Verify Payment Button */}
                  <button
                    onClick={handleProcessPayment}
                    disabled={pgProcessing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4F0809] to-[#7A1518] hover:from-[#680b0c] hover:to-[#921a1e] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                  >
                    <ScanLine className="w-4 h-4 text-[#D8AA67]" />
                    <span>I&apos;ve Made the Payment — Verify</span>
                  </button>
                </div>
              )}

              {/* ═══ CARD TAB ═══ */}
              {pgTab === 'card' && (
                <div className="space-y-4">
                  {/* Virtual Card Preview */}
                  <div className="bg-gradient-to-br from-[#302421] via-[#4F0809] to-[#7A1518] rounded-2xl p-4 text-white relative overflow-hidden shadow-lg">
                    {/* Decorative circles */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-1.5">
                        <Wifi className="w-4 h-4 text-[#D8AA67] rotate-90" />
                        <span className="text-[10px] text-white/60">Contactless</span>
                      </div>
                      <span className="text-xs font-bold text-[#D8AA67] uppercase tracking-wider">
                        {cardType === 'visa' ? 'VISA' : cardType === 'mastercard' ? 'MASTERCARD' : cardType === 'rupay' ? 'RuPay' : 'CARD'}
                      </span>
                    </div>

                    <p className="font-mono text-lg tracking-[0.2em] text-white/90">
                      {cardNumber || '•••• •••• •••• ••••'}
                    </p>

                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <p className="text-[9px] text-white/50 uppercase">Card Holder</p>
                        <p className="text-xs font-bold text-white/90 uppercase tracking-wider">
                          {cardName || 'YOUR NAME'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-white/50">Expiry</p>
                        <p className="text-xs font-bold text-white/90">{cardExpiry || 'MM/YY'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#302421] mb-1">Card Number</label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#81736D]" />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="w-full pl-10 pr-3 py-2.5 text-xs font-mono rounded-xl border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809] focus:ring-1 focus:ring-[#4F0809]/20 tracking-wider"
                      />
                      {cardType !== 'unknown' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FBF6EF] border border-[#E8DCD2] text-[#4F0809] uppercase">
                          {cardType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expiry & CVV Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#302421] mb-1">Expiry Date</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809] focus:ring-1 focus:ring-[#4F0809]/20 text-center tracking-wider"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#302421] mb-1">CVV</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809] focus:ring-1 focus:ring-[#4F0809]/20 text-center tracking-[0.3em]"
                        />
                        <Lock className="w-3 h-3 absolute right-3 top-1/2 -translate-y-1/2 text-[#B78A48]" />
                      </div>
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#302421] mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      placeholder="NAME ON CARD"
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809] focus:ring-1 focus:ring-[#4F0809]/20 uppercase tracking-wider"
                    />
                  </div>

                  {/* Security note */}
                  <div className="flex items-center gap-2 bg-[#FBF6EF] rounded-xl p-2.5 border border-[#E8DCD2]">
                    <Shield className="w-4 h-4 text-[#B78A48] shrink-0" />
                    <p className="text-[10px] text-[#81736D]">
                      Your card details are encrypted with 256-bit SSL. We do not store card information.
                    </p>
                  </div>

                  {/* Pay Button */}
                  <button
                    onClick={handleProcessPayment}
                    disabled={pgProcessing || cardNumber.replace(/\s/g, '').length < 16 || cardExpiry.length < 5 || cardCvv.length < 3}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4F0809] to-[#7A1518] hover:from-[#680b0c] hover:to-[#921a1e] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4 text-[#D8AA67]" />
                    <span>Pay ₹{finalTotal.toFixed(2)} Securely</span>
                  </button>
                </div>
              )}

              {/* ═══ CASH TAB ═══ */}
              {pgTab === 'cash' && (
                <div className="space-y-4">
                  {/* Amount Due */}
                  <div className="text-center bg-[#FBF6EF] rounded-2xl p-4 border border-[#E8DCD2]">
                    <p className="text-[10px] text-[#81736D] uppercase tracking-wider mb-1">Amount Due</p>
                    <p className="text-3xl font-bold text-[#4F0809]" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                      ₹{finalTotal.toFixed(2)}
                    </p>
                  </div>

                  {/* Cash Received Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#302421] mb-1">Cash Received</label>
                    <div className="relative">
                      <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#81736D]" />
                      <input
                        type="number"
                        value={pgCashReceived}
                        onChange={(e) => setPgCashReceived(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full pl-10 pr-3 py-3 text-lg font-bold rounded-xl border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809] focus:ring-1 focus:ring-[#4F0809]/20 text-[#4F0809]"
                      />
                    </div>
                  </div>

                  {/* Quick Amount Pills */}
                  <div className="grid grid-cols-4 gap-2">
                    {['500', '1000', '2000', '5000'].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setPgCashReceived(amt)}
                        className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          pgCashReceived === amt
                            ? 'border-[#4F0809] bg-[#4F0809] text-white'
                            : 'border-[#E8DCD2] bg-white text-[#302421] hover:bg-[#FBF6EF]'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPgCashReceived(finalTotal.toFixed(2))}
                    className="w-full py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF] text-[#4F0809] text-xs font-bold hover:bg-[#E8DCD2] transition cursor-pointer"
                  >
                    Exact Amount (₹{finalTotal.toFixed(2)})
                  </button>

                  {/* Change Due */}
                  {cashReceived >= finalTotal && cashChange > 0 && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-[10px] text-emerald-700 font-semibold uppercase">Change Due</p>
                          <p className="text-lg font-bold text-emerald-700">₹{cashChange.toFixed(2)}</p>
                        </div>
                      </div>
                      <Zap className="w-5 h-5 text-emerald-400" />
                    </div>
                  )}

                  {cashReceived > 0 && cashReceived < finalTotal && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-[11px] text-amber-800 font-semibold">
                        Short by ₹{(finalTotal - cashReceived).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {/* Collect Cash Button */}
                  <button
                    onClick={handleProcessPayment}
                    disabled={pgProcessing || cashReceived < finalTotal}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4F0809] to-[#7A1518] hover:from-[#680b0c] hover:to-[#921a1e] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Banknote className="w-4 h-4 text-[#D8AA67]" />
                    <span>Collect Cash & Complete</span>
                  </button>
                </div>
              )}

              {/* ═══ ROOM FOLIO TAB ═══ */}
              {pgTab === 'room_folio' && (
                <div className="space-y-4">
                  <div className="bg-[#FBF6EF] rounded-2xl p-4 border border-[#E8DCD2]">
                    <div className="flex items-center space-x-2 text-[#4F0809] font-bold text-xs uppercase tracking-wider mb-1">
                      <BedDouble className="w-4 h-4 text-[#B78A48]" />
                      <span>Post Charge to In-House Chamber Folio</span>
                    </div>
                    <p className="text-[11px] text-[#81736D]">
                      Charges will automatically be billed to the guest&apos;s master room folio and settled upon checkout.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#302421] mb-1">Select In-House Chamber &amp; Guest</label>
                    {inHouseGuests.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                        No active checked-in chambers found. Please tender via UPI, Card, or Cash.
                      </div>
                    ) : (
                      <select
                        value={selectedFolioResId}
                        onChange={(e) => setSelectedFolioResId(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809] focus:ring-1 focus:ring-[#4F0809]/20"
                      >
                        {inHouseGuests.map((res) => (
                          <option key={res.id} value={res.id}>
                            Room {res.room?.room_number || 'Suite'} — {res.guest?.name || 'In-House Guest'} ({res.reference_code})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#302421] mb-1">Room Service Slip / Guest Verification Note</label>
                    <input
                      type="text"
                      value={folioVerificationNote}
                      onChange={(e) => setFolioVerificationNote(e.target.value)}
                      placeholder="e.g., Guest signed room service delivery slip #502"
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#E8DCD2] bg-white focus:outline-none focus:border-[#4F0809]"
                    />
                  </div>

                  {/* Summary Callout */}
                  <div className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E8DCD2] flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[#81736D] block text-[11px]">Total To Be Charged:</span>
                      <span className="font-bold text-[#4F0809] text-base font-mono">₹{finalTotal.toFixed(2)}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                      Chamber Folio Charge
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const selectedRes = inHouseGuests.find((r) => r.id === selectedFolioResId);
                      if (selectedRes) {
                        fetch(`/api/reservations/${selectedRes.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            notes: `${selectedRes.notes || ''} | POS Charge: ₹${finalTotal.toFixed(2)} (${folioVerificationNote || 'Direct Charge'})`,
                          }),
                        }).catch(() => {});
                      }
                      handleProcessPayment();
                    }}
                    disabled={pgProcessing || inHouseGuests.length === 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4F0809] to-[#7A1518] hover:from-[#680b0c] hover:to-[#921a1e] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BedDouble className="w-4 h-4 text-[#D8AA67]" />
                    <span>Confirm &amp; Charge ₹{finalTotal.toFixed(2)} to Chamber Folio</span>
                  </button>
                </div>
              )}
            </div>

            {/* ── Gateway Footer ── */}
            <div className="bg-[#FBF6EF] border-t border-[#E8DCD2] px-4 py-2.5 flex items-center justify-between text-[10px] text-[#81736D]">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#B78A48]" />
                <span>Secured by Rajmahal Pay</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-[#302421]">VISA</span>
                <span className="font-bold text-[#302421]">MC</span>
                <span className="font-bold text-[#4F0809]">RuPay</span>
                <span className="font-bold text-[#302421]">UPI</span>
              </div>
            </div>
          </div>

          {/* Custom animation styles */}
          <style>{`
            @keyframes scanLine {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(168px); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
