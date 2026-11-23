'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/utils/money';
import {
  INITIAL_OUTLETS,
} from '@/lib/data/initial-data';
import type { MenuItem, MenuCategory, Outlet } from '@/lib/types';
import {
  Utensils,
  ShoppingBag,
  Truck,
  Coffee,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Minus,
  X,
  Search,
  Sparkles,
  Clock,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  MapPin,
  FileText,
  RefreshCw,
} from 'lucide-react';

export type OrderingMethod = 'dine_in' | 'pickup' | 'delivery';
export type VenueType = 'restaurant' | 'cafe';

interface CartItemEntry {
  item: MenuItem;
  quantity: number;
  venueType: VenueType;
  notes?: string;
}

export default function MenuPage() {
  const router = useRouter();

  // ── Customer Flow State ──
  // Step 1: Ordering Method
  const [orderingMethod, setOrderingMethod] = useState<OrderingMethod | null>(null);
  // Step 2: Venue Selection
  const [selectedVenue, setSelectedVenue] = useState<VenueType>('restaurant');

  // Cart State (preserved even when changing method or venue)
  const [cart, setCart] = useState<{ [id: string]: CartItemEntry }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiet, setSelectedDiet] = useState<string>('all');

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableOrRoom, setTableOrRoom] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Live Menu Categories from API/Firestore with graceful fallback
  const [liveMenuCategories, setLiveMenuCategories] = useState<MenuCategory[] | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Fetch live menu categories on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchMenuData() {
      setIsLoadingMenu(true);
      try {
        const res = await fetch('/api/menu');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setLiveMenuCategories(data.categories || []);
          }
        }
      } catch (err) {
        console.error('Menu load error:', err);
        if (isMounted) {
          setLiveMenuCategories([]);
        }
      } finally {
        if (isMounted) setIsLoadingMenu(false);
      }
    }
    fetchMenuData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Outlets
  const restaurantOutlet =
    INITIAL_OUTLETS.find((o) => o.type === 'restaurant') || INITIAL_OUTLETS[0];
  const cafeOutlet =
    INITIAL_OUTLETS.find((o) => o.type === 'cafe') || INITIAL_OUTLETS[1] || INITIAL_OUTLETS[0];

  const currentOutlet: Outlet = selectedVenue === 'cafe' ? cafeOutlet : restaurantOutlet;

  // Auto-switch to venue that has items if default venue is empty
  useEffect(() => {
    if (liveMenuCategories && liveMenuCategories.length > 0) {
      const restCount = liveMenuCategories
        .filter((c) => !c.outlet_id?.includes('2') && !c.id.includes('cafe'))
        .reduce((sum, c) => sum + (c.items?.length || 0), 0);
      const cafeCount = liveMenuCategories
        .filter((c) => c.outlet_id?.includes('2') || c.id.includes('cafe'))
        .reduce((sum, c) => sum + (c.items?.length || 0), 0);

      if (restCount === 0 && cafeCount > 0 && selectedVenue === 'restaurant') {
        setSelectedVenue('cafe');
      }
    }
  }, [liveMenuCategories, selectedVenue]);

  // Filter categories by selected venue
  const categoriesForVenue: MenuCategory[] = useMemo(() => {
    if (!selectedVenue || !liveMenuCategories || liveMenuCategories.length === 0) return [];

    return liveMenuCategories.filter((cat) => {
      const isCafe = cat.outlet_id === cafeOutlet.id || cat.outlet_id?.includes('2') || cat.id.includes('cafe');
      if (selectedVenue === 'restaurant') {
        return !isCafe;
      } else {
        return isCafe;
      }
    });
  }, [selectedVenue, liveMenuCategories, restaurantOutlet.id, cafeOutlet.id]);

  const restaurantItemsCount = useMemo(() => {
    return (liveMenuCategories || [])
      .filter((c) => !c.outlet_id?.includes('2') && !c.id.includes('cafe'))
      .reduce((sum, c) => sum + (c.items?.length || 0), 0);
  }, [liveMenuCategories]);

  const cafeItemsCount = useMemo(() => {
    return (liveMenuCategories || [])
      .filter((c) => c.outlet_id?.includes('2') || c.id.includes('cafe'))
      .reduce((sum, c) => sum + (c.items?.length || 0), 0);
  }, [liveMenuCategories]);

  // Flattened items for active venue with search/diet filtering
  const filteredCategories = useMemo(() => {
    return categoriesForVenue
      .map((cat) => {
        const matchingItems = (cat.items || []).filter((item) => {
          // Search query match
          const matchesSearch =
            !searchQuery.trim() ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

          // Dietary match
          let matchesDiet = true;
          if (selectedDiet === 'veg') {
            matchesDiet = (item.dietary_labels || []).some(
              (l) => l.toLowerCase().includes('veg') && !l.toLowerCase().includes('non')
            );
          } else if (selectedDiet === 'non-veg') {
            matchesDiet = (item.dietary_labels || []).some((l) =>
              l.toLowerCase().includes('non-veg')
            );
          } else if (selectedDiet === 'jain') {
            matchesDiet =
              (item.dietary_labels || []).some((l) => l.toLowerCase().includes('jain')) ||
              (!item.description?.toLowerCase().includes('onion') &&
                !item.description?.toLowerCase().includes('garlic'));
          } else if (selectedDiet === 'signature') {
            matchesDiet =
              (item.dietary_labels || []).some(
                (l) =>
                  l.toLowerCase().includes('signature') ||
                  l.toLowerCase().includes('royal') ||
                  l.toLowerCase().includes('special')
              ) || item.price_minor >= 40000;
          }

          return matchesSearch && matchesDiet;
        });

        return {
          ...cat,
          items: matchingItems,
        };
      })
      .filter((cat) => activeCategory === 'all' || cat.id === activeCategory);
  }, [categoriesForVenue, activeCategory, searchQuery, selectedDiet]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!selectedVenue) return;
    setCart((prev) => ({
      ...prev,
      [item.id]: {
        item,
        quantity: (prev[item.id]?.quantity || 0) + 1,
        venueType: selectedVenue,
      },
    }));
  };

  const decreaseQuantity = (itemId: string) => {
    setCart((prev) => {
      if (!prev[itemId]) return prev;
      if (prev[itemId].quantity <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { ...prev[itemId], quantity: prev[itemId].quantity - 1 },
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  // Cart calculations
  const cartEntries = Object.values(cart);
  const totalCartCount = cartEntries.reduce((sum, ci) => sum + ci.quantity, 0);
  const subtotalMinor = cartEntries.reduce((sum, ci) => sum + ci.item.price_minor * ci.quantity, 0);

  // Use current outlet tax rate or 5% default
  const taxRateBps = currentOutlet.tax_rate_bps || 500;
  const taxMinor = Math.round((subtotalMinor * taxRateBps) / 10000);
  const deliveryFeeMinor = orderingMethod === 'delivery' ? currentOutlet.delivery_fee_minor || 4000 : 0;
  const totalMinor = subtotalMinor + taxMinor + deliveryFeeMinor;

  // Handle Checkout Submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (cartEntries.length === 0) {
      setErrorMessage('Your cart is empty. Please select some dishes.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Please provide your name and phone number.');
      return;
    }

    if (orderingMethod === 'dine_in' && !tableOrRoom.trim()) {
      setErrorMessage('Please enter your Table or Room number.');
      return;
    }

    if (orderingMethod === 'delivery' && !deliveryAddress.trim()) {
      setErrorMessage('Please provide a delivery address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderLines = cartEntries.map((ci) => ({
        menu_item_id: ci.item.id,
        item_name_snapshot: ci.item.name,
        unit_price_snapshot_minor: ci.item.price_minor,
        quantity: ci.quantity,
        notes: ci.notes || null,
        modifiers_snapshot: null,
        line_total_minor: ci.item.price_minor * ci.quantity,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: currentOutlet.id,
          channel: 'web',
          fulfilment_mode: orderingMethod,
          pickup_name: customerName,
          pickup_phone: customerPhone,
          delivery_address: orderingMethod === 'delivery' ? deliveryAddress : null,
          table_id: orderingMethod === 'dine_in' ? tableOrRoom : null,
          delivery_notes: orderNotes || (orderingMethod === 'dine_in' ? `Table/Room: ${tableOrRoom}` : null),
          subtotal_minor: subtotalMinor,
          tax_minor: taxMinor,
          delivery_fee_minor: deliveryFeeMinor,
          total_minor: totalMinor,
          order_lines: orderLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit order');

      // Clear cart on successful order
      setCart({});
      setIsCheckoutOpen(false);
      setIsCartOpen(false);

      if (data.order?.order_number) {
        router.push(`/order-status/${data.order.order_number}`);
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to place order';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper method labels
  const methodDetails = {
    dine_in: {
      label: 'Dine In',
      desc: 'Served freshly at your palace table or courtyard lounge',
      icon: Utensils,
      tag: 'Table / Lounge Service',
    },
    pickup: {
      label: 'Pickup',
      desc: 'Takeaway packed and ready for quick collection from the counter',
      icon: ShoppingBag,
      tag: 'Ready in 15–25 mins',
    },
    delivery: {
      label: 'Delivery',
      desc: 'Safely packed royal cuisine delivered to your residence or suite',
      icon: Truck,
      tag: 'Express Delivery',
    },
  };

  const venueDetails = {
    restaurant: {
      title: 'Rajmahal Royal Dining',
      subtitle: 'Authentic Rajasthani Restaurant & Imperial Thalis',
      image: '/images/dining/rajasthani-restaurant.png',
      icon: Utensils,
      timing: '12:30 PM – 11:00 PM',
      tagline: 'Centuries-old royal recipes, hand-ground spices, clay-oven tandoor & shahi thalis',
    },
    cafe: {
      title: 'The Palace Courtyard Café & Lounge',
      subtitle: 'Artisan Brews, Single-Origin Coffees & Viennoiserie',
      image: '/images/dining/cafe-lounge.png',
      icon: Coffee,
      timing: '08:00 AM – 11:00 PM',
      tagline: 'Artisanal Araku pour-overs, kesariya masala chai, delicate flaky pastries & snacks',
    },
  };

  return (
    <div className="min-h-screen bg-[#FFF7E8] text-[#4F0809] pb-44 sm:pb-32 selection:bg-[#D8AA67] selection:text-[#3B0507] w-full max-w-full overflow-x-hidden">
      {/* ═══════════════════════════════════════════════════════════════
          STAGE 1: CHOOSE ORDERING METHOD (MOVES DIRECTLY TO MENU)
      ═══════════════════════════════════════════════════════════════ */}
      {!orderingMethod && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <span className="text-[#9C7A45] text-[10px] sm:text-xs font-bold tracking-[0.24em] uppercase block mb-1.5">
              Royal Culinary Menu
            </span>
            <h1
              className="text-2xl sm:text-4xl lg:text-5xl font-bold text-[#4F0809] mb-2 leading-tight break-words px-2"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              How would you like your order?
            </h1>

            {/* Diamond-Tipped Gold Rule */}
            <div className="flex items-center justify-center gap-2 w-40 mx-auto mb-3.5">
              <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
              <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]/70" />
              <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
            </div>

            <p className="text-[#6B533B] text-xs sm:text-sm leading-relaxed px-2">
              Select your preferred dining method to browse the palace menu immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {(['dine_in', 'pickup', 'delivery'] as OrderingMethod[]).map((method) => {
              const details = methodDetails[method];
              const Icon = details.icon;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setOrderingMethod(method);
                    if (!selectedVenue) setSelectedVenue('restaurant');
                  }}
                  className="group relative flex flex-col items-center text-center p-6 sm:p-8 rounded-3xl sm:rounded-4xl bg-[#ffffff] hover:bg-[#F5ECDC] transition-all duration-300 hover:-translate-y-1 cursor-pointer focus:outline-none w-full"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#F5ECDC] flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-105 group-hover:bg-[#4F0809] transition-all duration-300">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[#4F0809] group-hover:text-[#D8AA67] transition-colors" />
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9C7A45] mb-1">
                    {details.tag}
                  </span>

                  <h3
                    className="text-xl sm:text-2xl font-bold text-[#4F0809] mb-1.5 sm:mb-2"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    {details.label}
                  </h3>

                  <p className="text-xs text-[#6B533B] leading-relaxed font-normal mb-5 sm:mb-6">
                    {details.desc}
                  </p>

                  <div className="mt-auto inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#4F0809] text-[#FFF8EB] text-[11px] font-bold uppercase tracking-[0.12em]">
                    <span>Explore Menu</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          STAGE 2: DIRECT MENU VIEW WITH VENUE DROPDOWN
      ═══════════════════════════════════════════════════════════════ */}
      {orderingMethod && (
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24">
          {/* Active Order Controls + Venue Dropdown Header */}
          <div className="p-3.5 sm:p-6 rounded-t-3xl rounded-b-2xl bg-[#FDF8EE] mb-5 sm:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 border border-[#E8DFCE]/60">
            {/* Left: Active Venue Info */}
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <div className="relative w-12 h-12 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 bg-[#EFE6D5]">
                <Image
                  src={venueDetails[selectedVenue || 'restaurant'].image}
                  alt={venueDetails[selectedVenue || 'restaurant'].title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[10px] font-bold text-[#9C7A45] tracking-[0.2em] uppercase">
                    Active Venue
                  </span>
                  <span className="text-[#C99A52] text-[9px]">&#9830;</span>
                  <span className="text-[11px] text-[#6B533B]">
                    {venueDetails[selectedVenue || 'restaurant'].timing}
                  </span>
                </div>
                <h1
                  className="text-xl sm:text-3xl font-bold text-[#4F0809] leading-tight truncate"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  {venueDetails[selectedVenue || 'restaurant'].title}
                </h1>
                <p className="text-[11px] sm:text-xs text-[#6B533B] font-normal mt-0.5 line-clamp-1">
                  {venueDetails[selectedVenue || 'restaurant'].tagline}
                </p>
              </div>
            </div>

            {/* Right: Order Type Pill & Venue Dropdown Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
              {/* Order Type Switcher Pill */}
              <button
                type="button"
                onClick={() => setOrderingMethod(null)}
                className="inline-flex items-center justify-center space-x-1.5 h-10 sm:h-11 px-3.5 sm:px-4 rounded-full bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] text-xs font-bold transition-colors cursor-pointer w-full sm:w-auto"
                title="Change order type"
              >
                {React.createElement(methodDetails[orderingMethod].icon, {
                  className: 'w-3.5 h-3.5 text-[#9C7A45]',
                })}
                <span>{methodDetails[orderingMethod].label}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#9C7A45] ml-1">
                  (Change)
                </span>
              </button>

              {/* Venue Dropdown Selector */}
              <div className="relative w-full sm:w-auto sm:min-w-[190px]">
                <select
                  aria-label="Select Palace Venue"
                  value={selectedVenue || 'restaurant'}
                  onChange={(e) => {
                    setSelectedVenue(e.target.value as VenueType);
                    setActiveCategory('all');
                  }}
                  className="w-full h-10 sm:h-11 pl-4 pr-9 rounded-full bg-[#4F0809] text-[#FFF8EB] text-[11px] sm:text-xs font-bold uppercase tracking-[0.1em] appearance-none cursor-pointer focus:outline-none"
                >
                  <option value="restaurant">
                    Rajasthani Restaurant{restaurantItemsCount > 0 ? ` (${restaurantItemsCount})` : ''}
                  </option>
                  <option value="cafe">
                    Jharokha Café &amp; Lounge{cafeItemsCount > 0 ? ` (${cafeItemsCount})` : ''}
                  </option>
                </select>
                <ChevronDown className="w-4 h-4 text-[#D8AA67] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* ── 3-COLUMN DESKTOP LAYOUT (Left Sidebar | Center Foods Cards | Right Cart) ── */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-6 lg:gap-8 w-full max-w-full">
            {/* ═══════════════════════════════════════════════════════════
                1. LEFT SIDEBAR (DESKTOP MODE): SEARCH, FOOD OPTIONS DROPDOWN, CATEGORIES
            ═══════════════════════════════════════════════════════════ */}
            <aside className="hidden lg:block lg:w-64 xl:w-72 shrink-0 sticky top-24 self-start space-y-4">
              <div className="p-4 sm:p-5 rounded-3xl bg-[#FDF8EE] border border-[#E8DFCE] shadow-[0_8px_30px_rgba(79,8,9,0.06)] space-y-5">
                {/* 1. Search Filter */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9C7A45] block">
                    Search Menu
                  </span>
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#856B4D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search dishes, drinks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-9 pr-8 text-xs rounded-2xl bg-white border border-[#E8DFCE] focus:bg-[#FDF8EE] focus:border-[#D8AA67] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/60 transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#856B4D] hover:text-[#4F0809] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Food Options (Dietary Dropdown - Desktop) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9C7A45] block">
                    Food Options
                  </span>
                  <div className="relative">
                    <select
                      aria-label="Filter food options"
                      value={selectedDiet}
                      onChange={(e) => setSelectedDiet(e.target.value)}
                      className="w-full h-10 pl-3.5 pr-8 rounded-2xl bg-white border border-[#E8DFCE] text-[#4F0809] text-xs font-bold uppercase tracking-[0.05em] appearance-none cursor-pointer focus:outline-none hover:border-[#D8AA67] focus:border-[#D8AA67] transition-colors"
                    >
                      <option value="all">🍽️ All Food Options</option>
                      <option value="veg">🟢 Pure Veg</option>
                      <option value="non-veg">🔴 Non-Veg</option>
                      <option value="jain">🟡 Jain Friendly</option>
                      <option value="signature">👑 Royal Signature</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#D8AA67] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* 3. Food Categories Vertical List */}
                <div className="space-y-2 pt-2 border-t border-[#E8DFCE]/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9C7A45]">
                      Categories
                    </span>
                    <span className="text-[10px] text-[#856B4D] font-semibold">
                      {categoriesForVenue.length} items
                    </span>
                  </div>

                  <div className="space-y-1 max-h-[calc(100vh-25rem)] overflow-y-auto pr-1 [scrollbar-width:thin]">
                    <button
                      type="button"
                      onClick={() => setActiveCategory('all')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        activeCategory === 'all'
                          ? 'bg-[#4F0809] text-[#FFF8EB] shadow-xs'
                          : 'bg-white/60 text-[#4F0809] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            activeCategory === 'all' ? 'bg-[#D8AA67]' : 'bg-[#C99A52]/40'
                          }`}
                        />
                        <span className="truncate">All Categories</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                          activeCategory === 'all'
                            ? 'bg-[#D8AA67] text-[#3B0507]'
                            : 'bg-[#EFE6D5] text-[#4F0809]'
                        }`}
                      >
                        {categoriesForVenue.reduce(
                          (acc, c) => acc + (c.items?.length || 0),
                          0
                        )}
                      </span>
                    </button>

                    {categoriesForVenue.map((cat) => {
                      const itemCount = cat.items?.length || 0;
                      const isCatActive = activeCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveCategory(cat.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                            isCatActive
                              ? 'bg-[#4F0809] text-[#FFF8EB] shadow-xs'
                              : 'bg-white/60 text-[#4F0809] hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isCatActive ? 'bg-[#D8AA67]' : 'bg-[#C99A52]/40'
                              }`}
                            />
                            <span className="truncate">{cat.name}</span>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                              isCatActive
                                ? 'bg-[#D8AA67] text-[#3B0507]'
                                : 'bg-[#EFE6D5] text-[#4F0809]'
                            }`}
                          >
                            {itemCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reset Filters CTA if any filter is active */}
                {(searchQuery || selectedDiet !== 'all' || activeCategory !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDiet('all');
                      setActiveCategory('all');
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-[#D8AA67]/60 text-[#4F0809] hover:bg-[#F5ECDC] text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-[#9C7A45]" />
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            </aside>

            {/* ═══════════════════════════════════════════════════════════
                2. CENTER SECTION: FOOD CARDS & MOBILE CONTROLS
            ═══════════════════════════════════════════════════════════ */}
            <div className="flex-1 min-w-0 w-full max-w-full space-y-6">
              {/* Mobile Only: Search & Food Options Dropdown */}
              <div className="lg:hidden flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Mobile Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#856B4D] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search dishes, drinks or ingredients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm rounded-full bg-[#FDF8EE] border border-[#E8DFCE] focus:bg-[#F5ECDC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/60 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#856B4D] hover:text-[#4F0809] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Mobile Food Options Dropdown */}
                <div className="relative w-full sm:w-56 shrink-0">
                  <select
                    aria-label="Filter food options"
                    value={selectedDiet}
                    onChange={(e) => setSelectedDiet(e.target.value)}
                    className="w-full h-11 pl-4 pr-9 rounded-full bg-[#FDF8EE] border border-[#E8DFCE] text-[#4F0809] text-xs font-bold uppercase tracking-[0.08em] appearance-none cursor-pointer focus:outline-none hover:border-[#D8AA67] transition-colors"
                  >
                    <option value="all">🍽️ All Food Options</option>
                    <option value="veg">🟢 Pure Veg</option>
                    <option value="non-veg">🔴 Non-Veg</option>
                    <option value="jain">🟡 Jain Friendly</option>
                    <option value="signature">👑 Royal Signature</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#D8AA67] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Mobile Only: Sticky Category Tabs Navigation */}
              <div className="lg:hidden sticky top-[60px] sm:top-[66px] z-20 bg-[#FFF7E8]/95 backdrop-blur-sm py-2 -mx-4 px-4 border-b border-[#E8DFCE]/60 w-[calc(100%+2rem)] max-w-[100vw] overflow-hidden">
                <div className="w-full min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex items-center space-x-2 py-0.5 w-max">
                    <button
                      type="button"
                      onClick={() => setActiveCategory('all')}
                      className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                        activeCategory === 'all'
                          ? 'bg-[#4F0809] text-[#FFF8EB] shadow-xs'
                          : 'bg-[#FDF8EE] text-[#4F0809] hover:bg-[#F5ECDC] border border-[#E8DFCE]/70'
                      }`}
                    >
                      All Categories ({categoriesForVenue.length})
                    </button>

                    {categoriesForVenue.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                          activeCategory === cat.id
                            ? 'bg-[#4F0809] text-[#FFF8EB] shadow-xs'
                            : 'bg-[#FDF8EE] text-[#4F0809] hover:bg-[#F5ECDC] border border-[#E8DFCE]/70'
                        }`}
                      >
                        {cat.name} ({cat.items?.length || 0})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dish Categories & Cards Grid */}
              {isLoadingMenu ? (
                <div className="py-20 text-center">
                  <div className="w-8 h-8 border-2 border-[#4F0809] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-[#4F0809] font-medium">Loading palace menu...</p>
                </div>
              ) : categoriesForVenue.length === 0 ? (
                <div className="py-16 text-center bg-[#FDF8EE] rounded-t-3xl rounded-b-2xl p-8 border border-[#E8DFCE]">
                  <Utensils className="w-10 h-10 text-[#9C7A45] mx-auto mb-3 opacity-60" />
                  <h3
                    className="text-xl font-bold text-[#4F0809]"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    Palace Culinary Menu Being Prepared
                  </h3>
                  <p className="text-xs text-[#6B533B] mt-1 max-w-md mx-auto">
                    The palace kitchen is currently crafting today's royal culinary selection. No items are listed at this time.
                  </p>
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="py-16 text-center bg-[#FDF8EE] rounded-t-3xl rounded-b-2xl p-8 border border-[#E8DFCE]">
                  <AlertCircle className="w-10 h-10 text-[#9C7A45] mx-auto mb-3" />
                  <h3
                    className="text-xl font-bold text-[#4F0809]"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    No dishes match your filter
                  </h3>
                  <p className="text-xs text-[#6B533B] mt-1">
                    Try resetting your search query or dietary preference.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDiet('all');
                      setActiveCategory('all');
                    }}
                    className="mt-4 px-5 py-2.5 rounded-full bg-[#4F0809] text-[#FFF8EB] text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#680b0c] transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-10 sm:space-y-12">
                  {filteredCategories.map((category) => (
                    <section key={category.id} id={category.id} className="space-y-4">
                      {/* Category Title Heading */}
                      <div className="flex items-center justify-between gap-3 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rotate-45 bg-[#C99A52]" />
                          <h3
                            className="text-xl sm:text-2xl font-bold text-[#4F0809]"
                            style={{
                              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                            }}
                          >
                            {category.name}
                          </h3>
                        </div>
                        <span className="h-[1px] flex-1 bg-[#C99A52]/35" />
                        <span className="text-[11px] text-[#856B4D] font-semibold uppercase tracking-wider">
                          {category.items?.length || 0} items
                        </span>
                      </div>

                      {/* Food Cards Grid: Mobile 2-col, Desktop Responsive 3-4 col */}
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
                        {category.items?.map((item) => {
                          const inCartQty = cart[item.id]?.quantity || 0;
                          const isVeg = (item.dietary_labels || []).some(
                            (l) => l.toLowerCase().includes('veg') && !l.toLowerCase().includes('non')
                          );

                          return (
                            <div
                              key={item.id}
                              className="w-full bg-[#FDF8EE] rounded-2xl sm:rounded-t-3xl sm:rounded-b-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between overflow-hidden group border border-[#E8DFCE]/60"
                            >
                              {/* Framed Dish Image */}
                              <div className="p-1.5 sm:p-2.5 pb-0">
                                <div className="relative h-28 sm:h-44 w-full rounded-xl sm:rounded-t-2xl sm:rounded-b-md bg-[#EFE6D5] overflow-hidden">
                                  <Image
                                    src={item.image_url || '/images/food/restaurant.jpg'}
                                    alt={item.name}
                                    fill
                                    unoptimized={Boolean(item.image_url?.startsWith('data:'))}
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  {/* Dietary badge */}
                                  <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-1.5 py-0.5 sm:px-2 rounded-full bg-[#FDF8EE]/95 text-[9px] sm:text-[10px] font-bold flex items-center space-x-1 shadow-xs">
                                    <span
                                      className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                        isVeg ? 'bg-emerald-600' : 'bg-red-700'
                                      }`}
                                    />
                                    <span className={isVeg ? 'text-emerald-900' : 'text-red-900'}>
                                      {isVeg ? 'Veg' : 'Non-Veg'}
                                    </span>
                                  </div>

                                  {/* Additional label */}
                                  {item.dietary_labels && item.dietary_labels.length > 1 && (
                                    <div className="hidden sm:flex absolute top-2 right-2 flex-col gap-1">
                                      {item.dietary_labels
                                        .filter(
                                          (l) =>
                                            !l.toLowerCase().includes('veg') &&
                                            !l.toLowerCase().includes('non')
                                        )
                                        .slice(0, 1)
                                        .map((lbl) => (
                                          <span
                                            key={lbl}
                                            className="px-2 py-0.5 rounded-full bg-[#4F0809]/95 text-[#F7E5C3] text-[9px] font-bold uppercase tracking-wider"
                                          >
                                            {lbl}
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Dish Info & Actions */}
                              <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
                                <div>
                                  <h4
                                    className="font-bold text-xs sm:text-base lg:text-lg text-[#4F0809] leading-snug line-clamp-1"
                                    style={{
                                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                                    }}
                                  >
                                    {item.name}
                                  </h4>
                                  <p className="text-[10px] sm:text-xs text-[#6B533B] font-normal mt-0.5 line-clamp-2 leading-relaxed">
                                    {item.description}
                                  </p>
                                </div>

                                <div className="pt-1.5 flex items-center justify-between gap-1 min-w-0">
                                  <span
                                    className="text-xs sm:text-base lg:text-lg font-bold text-[#4F0809] shrink-0 truncate max-w-[48%]"
                                    style={{
                                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                                    }}
                                  >
                                    {formatMoney(item.price_minor)}
                                  </span>

                                  {/* Quantity Stepper or Add button */}
                                  {inCartQty === 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => addToCart(item)}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1 sm:px-4 sm:py-2 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer active:scale-95 shadow-xs shrink-0"
                                      aria-label={`Add ${item.name} to order`}
                                    >
                                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D8AA67]" />
                                      <span>Add</span>
                                    </button>
                                  ) : (
                                    <div className="inline-flex items-center rounded-full bg-[#F5ECDC] p-0.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => decreaseQuantity(item.id)}
                                        className="w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[#4F0809] hover:bg-[#EFE2CC] transition-colors cursor-pointer"
                                        aria-label={`Decrease quantity of ${item.name}`}
                                      >
                                        <Minus className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                                      </button>
                                      <span className="w-4 sm:w-7 text-center text-[10px] sm:text-xs font-bold text-[#4F0809]">
                                        {inCartQty}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => addToCart(item)}
                                        className="w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[#4F0809] hover:bg-[#EFE2CC] transition-colors cursor-pointer"
                                        aria-label={`Increase quantity of ${item.name}`}
                                      >
                                        <Plus className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ── BOTTOM-CENTER FLOATING CART PILL WITH ITEM IMAGE STACK (ALL SCREENS - OPENS DRAWER ON TAP) ── */}
      {totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-[74px] sm:bottom-7 left-1/2 -translate-x-1/2 z-40 w-max max-w-[calc(100vw-2rem)] animate-fade-in-up">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-2.5 sm:space-x-3 pl-2.5 pr-4 py-2 sm:pl-3 sm:pr-5 sm:py-2.5 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] transition-all cursor-pointer shadow-[0_8px_30px_rgba(79,8,9,0.35)] hover:scale-105 active:scale-95"
          >
            {/* Overlapping Avatar Stack of Added Item Images */}
            <div className="flex items-center -space-x-2.5 shrink-0">
              {cartEntries.slice(0, 3).map(({ item }) => (
                <div
                  key={item.id}
                  className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-[#EFE6D5] ring-2 ring-[#4F0809]"
                >
                  <Image
                    src={item.image_url || '/images/food/restaurant.jpg'}
                    alt={item.name}
                    fill
                    unoptimized={Boolean(item.image_url?.startsWith('data:'))}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Selected Count & Label */}
            <div className="text-left pr-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs sm:text-sm font-bold leading-tight">
                  View Cart
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#D8AA67] text-[#3B0507] text-[10px] sm:text-xs font-bold leading-none">
                  {totalCartCount}
                </span>
              </div>
              <p className="text-[10px] text-[#D8AA67] font-medium leading-tight mt-0.5">
                {formatMoney(totalMinor)}
              </p>
            </div>

            <ArrowRight className="w-4 h-4 text-[#D8AA67] shrink-0" />
          </button>
        </div>
      )}

      {/* ── FULL-SCREEN SLIDE-OVER CART DRAWER (ALL SCREENS - OPENS ON CART BUTTON TAP) ── */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-black/65 backdrop-blur-xs flex justify-end transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-heading"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCartOpen(false);
          }}
        >
          <div className="w-full max-w-md sm:max-w-lg bg-[#FDF8EE] h-full max-h-[100dvh] flex flex-col justify-between animate-slide-left shadow-2xl">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 flex items-center justify-between bg-[#4F0809] text-[#FFF8EB] shrink-0">
              <div className="flex items-center space-x-2.5">
                <ShoppingBag className="w-4 h-4 text-[#D8AA67]" />
                <h3
                  id="cart-drawer-heading"
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  Your Order Cart ({totalCartCount})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#FFF8EB] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-4 h-4 text-[#D8AA67]" />
              </button>
            </div>

            {/* Context Notice: Order Method & Venue */}
            <div className="px-4 py-2.5 bg-[#F5ECDC] flex items-center justify-between text-xs text-[#4F0809] shrink-0">
              <div>
                <span className="text-[#856B4D] font-medium">Fulfillment:</span>{' '}
                <span className="font-bold">{orderingMethod ? methodDetails[orderingMethod].label : 'Dine In'}</span>
              </div>
              <div>
                <span className="text-[#856B4D] font-medium">Venue:</span>{' '}
                <span className="font-bold">{selectedVenue === 'cafe' ? 'Courtyard Café' : 'Royal Dining'}</span>
              </div>
            </div>

            {/* Itemized Cart List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {cartEntries.length === 0 ? (
                <div className="py-20 text-center text-[#856B4D] space-y-2">
                  <ShoppingBag className="w-12 h-12 text-[#C99A52]/50 mx-auto" />
                  <p className="text-sm font-bold text-[#4F0809]">Your cart is currently empty</p>
                  <p className="text-xs font-normal max-w-xs mx-auto">
                    Add dishes from the menu to start your royal feast order.
                  </p>
                </div>
              ) : (
                cartEntries.map(({ item, quantity, venueType }) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-[#F5ECDC]/75 flex items-center justify-between gap-3 border border-[#E8DFCE]/40"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#EFE6D5]">
                        <Image
                          src={item.image_url || '/images/food/restaurant.jpg'}
                          alt={item.name}
                          fill
                          unoptimized={Boolean(item.image_url?.startsWith('data:'))}
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-[#4F0809] truncate">{item.name}</h5>
                        <p className="text-[11px] text-[#6B533B]">
                          {formatMoney(item.price_minor)} each &bull;{' '}
                          <span className="capitalize">{venueType}</span>
                        </p>
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="flex items-center rounded-full bg-[#FDF8EE] p-0.5">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[#4F0809] hover:bg-[#F5ECDC] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#4F0809]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[#4F0809] hover:bg-[#F5ECDC] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-bold text-xs text-[#4F0809] w-14 text-right">
                        {formatMoney(item.price_minor * quantity)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-[#856B4D] hover:text-red-700 cursor-pointer p-0.5"
                        title="Remove item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Breakdown & Checkout CTA */}
            {cartEntries.length > 0 && (
              <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-[#F5ECDC] space-y-3 shrink-0 border-t border-[#E8DFCE]">
                <div className="space-y-1.5 text-xs text-[#6B533B]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#4F0809]">{formatMoney(subtotalMinor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span className="font-medium text-[#4F0809]">{formatMoney(taxMinor)}</span>
                  </div>
                  {orderingMethod === 'delivery' && (
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="font-medium text-[#4F0809]">{formatMoney(deliveryFeeMinor)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-[#4F0809] pt-2 border-t border-[#E8DFCE]/60">
                    <span>Total Amount</span>
                    <span>{formatMoney(totalMinor)}</span>
                  </div>
                </div>

                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="px-4 py-2.5 rounded-full bg-[#FDF8EE] hover:bg-[#EFE2CC] text-[#4F0809] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="flex-1 py-2.5 px-5 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-xs font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md active:scale-95"
                  >
                    <span>Proceed ({formatMoney(totalMinor)})</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHECKOUT COMPLETION MODAL ── */}
      {isCheckoutOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-[#FDF8EE] rounded-t-3xl rounded-b-2xl overflow-hidden animate-fade-in-up text-[#4F0809]">
            {/* Header */}
            <div className="p-5 bg-[#4F0809] text-[#FFF8EB] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#D8AA67] uppercase font-bold tracking-[0.2em] block">
                  Final Step
                </span>
                <h3
                  className="text-xl sm:text-2xl font-bold"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  Confirm Your Royal Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#FFF8EB] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-[#D8AA67]" />
              </button>
            </div>

            {/* Error prompt */}
            {errorMessage && (
              <div className="m-4 p-3 rounded-xl bg-red-50 text-red-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="p-5 space-y-4">
              {/* Order Mode Badge */}
              <div className="px-4 py-3 rounded-xl bg-[#F5ECDC] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#856B4D] font-medium">Method: </span>
                  <span className="font-bold text-[#4F0809]">
                    {orderingMethod ? methodDetails[orderingMethod].label : 'Dine In'}
                  </span>
                </div>
                <div>
                  <span className="text-[#856B4D] font-medium">Venue: </span>
                  <span className="font-bold text-[#4F0809]">
                    {selectedVenue === 'cafe' ? 'Courtyard Café' : 'Royal Dining'}
                  </span>
                </div>
              </div>

              {/* Guest Details */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharaja Vikramaditya / Priya Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/55"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                    Mobile Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/55"
                  />
                </div>

                {/* Conditional Fields based on Ordering Method */}
                {orderingMethod === 'dine_in' && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                      Table Number or Room Suite Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Table T-101 / Suite 204"
                      value={tableOrRoom}
                      onChange={(e) => setTableOrRoom(e.target.value)}
                      className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/55"
                    />
                  </div>
                )}

                {orderingMethod === 'delivery' && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                      Delivery Address *
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Street, Landmark, Apartment, Udaipur"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full p-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/55 resize-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                    Kitchen Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mild spice, extra mint chutney, no garlic"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/55"
                  />
                </div>
              </div>

              {/* Order summary mini box */}
              <div className="px-4 py-3 rounded-xl bg-[#F5ECDC]/70 text-xs space-y-1">
                <div className="flex justify-between font-bold text-[#4F0809]">
                  <span>{totalCartCount} items</span>
                  <span>{formatMoney(totalMinor)}</span>
                </div>
                <div className="text-[11px] text-[#6B533B]">
                  Includes GST &amp; kitchen ticket generation.
                </div>
              </div>

              {/* Actions */}
              <div className="pt-1 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-5 py-3 rounded-full bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-5 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-xs font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Placing Order with Kitchen...</span>
                  ) : (
                    <>
                      <span>Send to Kitchen ({formatMoney(totalMinor)})</span>
                      <CheckCircle2 className="w-4 h-4 text-[#D8AA67]" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
