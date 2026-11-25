'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatMoney } from '@/lib/utils/money';
import {
  INITIAL_OUTLETS,
} from '@/lib/data/initial-data';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToAuth, getUserProfile, FirebaseUser } from '@/lib/firebase/auth';
import { buildCategoriesFromItems } from '@/lib/services/menu-service';
import { billingService } from '@/lib/services/billing-service';
import type { MenuItem, MenuCategory, Outlet, MenuItemExtra, MenuItemPortion, BillingSettings } from '@/lib/types';
import { DEFAULT_BILLING_SETTINGS } from '@/lib/types';
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
  ArrowUpDown,
  UserCheck,
  Navigation,
  Loader2,
  CreditCard,
  Smartphone,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

export type OrderingMethod = 'dine_in' | 'pickup' | 'delivery';
export type VenueType = 'restaurant' | 'cafe';

export interface CartItemEntry {
  cartKey: string;
  item: MenuItem;
  quantity: number;
  venueType: VenueType;
  selectedPortion?: MenuItemPortion;
  selectedExtras?: MenuItemExtra[];
  notes?: string;
  addedAt?: number;
}

export type SortOption = 'none' | 'price_asc' | 'price_desc';

// ── Helpers for Portion & Extra Handling ──
export const getItemLowestPortion = (item: MenuItem): MenuItemPortion | null => {
  if (item.portions && item.portions.length > 0) {
    return item.portions.reduce(
      (min, p) => (p.price_minor < min.price_minor ? p : min),
      item.portions[0]
    );
  }
  return null;
};

export const getItemEffectivePrice = (item: MenuItem): number => {
  const lowest = getItemLowestPortion(item);
  return lowest ? lowest.price_minor : item.price_minor;
};

export const getCartKey = (
  itemId: string,
  portion?: MenuItemPortion | null,
  extras: MenuItemExtra[] = []
): string => {
  const portionStr = portion ? portion.name.trim().toLowerCase().replace(/\s+/g, '-') : 'std';
  const extrasStr = extras
    .filter((e) => (e.quantity ?? 1) > 0)
    .map((e) => `${e.name.trim().toLowerCase().replace(/\s+/g, '-')}_x${e.quantity || 1}`)
    .sort()
    .join('_');
  return `${itemId}::${portionStr}::${extrasStr || 'none'}`;
};

// Center: Arya College of Engineering, Kukas, Jaipur
const ARYA_COLLEGE_COORDS = {
  lat: 27.031,
  lng: 75.894,
  name: 'Arya College of Engineering, Kukas, Jaipur',
  radiusKm: 4.0,
};

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const KUKAS_AREA_PRESETS = [
  { name: 'Arya Main Campus & Hostels', lat: 27.031, lng: 75.894, dist: 0.1 },
  { name: 'Arya 1st Year Old Campus', lat: 27.0275, lng: 75.896, dist: 0.4 },
  { name: 'RIICO Industrial Area, Kukas', lat: 27.035, lng: 75.892, dist: 0.9 },
  { name: 'Kukas Town / Delhi Road', lat: 27.042, lng: 75.899, dist: 1.8 },
  { name: 'Le Méridien / Fairmont Kukas', lat: 27.045, lng: 75.908, dist: 2.5 },
];

function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Universal QR & Location Parser (supports ?qr\r, ?qr/r, ?qr=r, ?qr\c, ?table=T-42, ?room=T-42, ?hall=T-42, etc.) ──
  const qrLocationInfo = useMemo(() => {
    let rawQuery = '';
    if (typeof window !== 'undefined') {
      rawQuery = window.location.search || '';
    } else {
      rawQuery = searchParams?.toString() ? `?${searchParams.toString()}` : '';
    }

    // Clean escaped ampersands (\& -> &) and backslashes
    const decodedQuery = decodeURIComponent(rawQuery).replace(/\\&/g, '&');

    // 1. Venue detection: 'r' for restaurant, 'c' for cafe
    let detectedVenue: VenueType | null = null;

    // Check searchParams first
    const qrVal = searchParams?.get('qr');
    if (qrVal === 'c' || qrVal === 'cafe') {
      detectedVenue = 'cafe';
    } else if (qrVal === 'r' || qrVal === 'restaurant') {
      detectedVenue = 'restaurant';
    }

    // Check regex in decoded query string for ?qr\r, ?qr/r, ?qr=r, ?qr_r, ?qr\c, etc.
    if (!detectedVenue) {
      if (/(?:[?&]|^)qr[\\/=:_]?c(?=[&]|$)/i.test(decodedQuery) || /venue=cafe/i.test(decodedQuery)) {
        detectedVenue = 'cafe';
      } else if (/(?:[?&]|^)qr[\\/=:_]?r(?=[&]|$)/i.test(decodedQuery) || /venue=restaurant/i.test(decodedQuery)) {
        detectedVenue = 'restaurant';
      }
    }

    // Also check keys if searchParams iterates (e.g. key 'qr\r' or 'qr/r')
    if (!detectedVenue && searchParams) {
      searchParams.forEach((val, key) => {
        const cleanKey = key.toLowerCase().replace(/\\/g, '/');
        if (cleanKey.includes('qr/c') || cleanKey === 'qr/c' || cleanKey === 'c') detectedVenue = 'cafe';
        if (cleanKey.includes('qr/r') || cleanKey === 'qr/r' || cleanKey === 'r') detectedVenue = 'restaurant';
      });
    }

    // 2. Location detection: table, room, hall
    let locationType: 'table' | 'room' | 'hall' | null = null;
    let locationId: string | null = null;

    const tableMatch = decodedQuery.match(/[?&](?:table|table_number)=([^&]+)/i);
    const roomMatch = decodedQuery.match(/[?&](?:room|room_number)=([^&]+)/i);
    const hallMatch = decodedQuery.match(/[?&](?:hall|hall_number)=([^&]+)/i);

    if (tableMatch) {
      locationType = 'table';
      locationId = tableMatch[1].replace(/\\/g, '').trim();
    } else if (roomMatch) {
      locationType = 'room';
      locationId = roomMatch[1].replace(/\\/g, '').trim();
    } else if (hallMatch) {
      locationType = 'hall';
      locationId = hallMatch[1].replace(/\\/g, '').trim();
    } else if (searchParams) {
      const t = searchParams.get('table') || searchParams.get('table_number');
      const r = searchParams.get('room') || searchParams.get('room_number');
      const h = searchParams.get('hall') || searchParams.get('hall_number');
      if (t) {
        locationType = 'table';
        locationId = t.replace(/\\/g, '').trim();
      } else if (r) {
        locationType = 'room';
        locationId = r.replace(/\\/g, '').trim();
      } else if (h) {
        locationType = 'hall';
        locationId = h.replace(/\\/g, '').trim();
      }
    }

    let displayLocation = '';
    if (locationType && locationId) {
      const typeLabel = locationType === 'table' ? 'Table' : locationType === 'room' ? 'Room' : 'Hall';
      displayLocation = locationId.toLowerCase().startsWith(locationType)
        ? locationId
        : `${typeLabel} ${locationId}`;
    }

    const isQR = !!(detectedVenue || locationType);

    return {
      detectedVenue,
      locationType,
      locationId,
      displayLocation,
      isQR,
    };
  }, [searchParams]);

  // ── Customer Flow State synced with URL (enables deep linking, browser history & new-page feel) ──
  const orderParam = searchParams.get('order');
  const venueParam = searchParams.get('venue');

  const orderingMethod: OrderingMethod | null = useMemo(() => {
    if (orderParam === 'dine_in' || orderParam === 'pickup' || orderParam === 'delivery') {
      return orderParam;
    }
    // Auto-resolve to dine_in if QR table / room / hall is detected
    if (qrLocationInfo.isQR || qrLocationInfo.locationType) {
      return 'dine_in';
    }
    return null;
  }, [orderParam, qrLocationInfo]);

  const selectedVenue: VenueType = useMemo(() => {
    if (venueParam === 'cafe' || venueParam === 'restaurant') {
      return venueParam;
    }
    if (qrLocationInfo.detectedVenue) {
      return qrLocationInfo.detectedVenue;
    }
    return 'restaurant';
  }, [venueParam, qrLocationInfo]);

  const handleSelectOrderingMethod = (method: OrderingMethod) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('order', method);
    if (!params.get('venue')) {
      params.set('venue', selectedVenue || 'restaurant');
    }
    router.push(`/menu?${params.toString()}`);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleChangeOrderType = () => {
    setIsCartOpen(false);
    setSelectedDishForDetails(null);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('order');
    params.delete('cart');
    const queryString = params.toString();
    router.push(queryString ? `/menu?${queryString}` : '/menu');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleSelectVenue = (venue: VenueType) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('venue', venue);
    router.replace(`/menu?${params.toString()}`);
    setActiveCategory('all');
  };

  // Cart State (preserved even when changing method or venue)
  const [cart, setCart] = useState<{ [cartKey: string]: CartItemEntry }>({});

  // User Authentication State & Auto-fetching details
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Cart Drawer State synced with URL (?cart=open for step 1, ?cart=checkout for step 2)
  const cartParam = searchParams.get('cart');
  const isCartOpen = cartParam === 'open' || cartParam === 'checkout';
  const cartStep: 1 | 2 = cartParam === 'checkout' ? 2 : 1;
  const hasPushedCartHistoryRef = React.useRef(false);

  useEffect(() => {
    if (!isCartOpen) {
      hasPushedCartHistoryRef.current = false;
    }
  }, [isCartOpen]);

  const openCart = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('cart', 'open');
    hasPushedCartHistoryRef.current = true;
    router.push(`/menu?${params.toString()}`, { scroll: false });
  };

  const proceedToCheckoutStep = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('cart', 'checkout');

    if (!currentUser) {
      const returnUrl = `/menu?${params.toString()}`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    hasPushedCartHistoryRef.current = true;
    router.push(`/menu?${params.toString()}`, { scroll: false });
  };

  const backToCartStep = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('cart', 'open');
    router.push(`/menu?${params.toString()}`, { scroll: false });
  };

  const closeCart = () => {
    if (hasPushedCartHistoryRef.current) {
      hasPushedCartHistoryRef.current = false;
      router.back();
    } else {
      const params = new URLSearchParams(searchParams?.toString() || '');
      if (params.has('cart')) {
        params.delete('cart');
        const queryString = params.toString();
        router.replace(queryString ? `/menu?${queryString}` : '/menu', { scroll: false });
      }
    }
  };

  const setIsCartOpen = (open: boolean) => {
    if (open) {
      openCart();
    } else {
      closeCart();
    }
  };

  // If user navigated directly to cart=checkout while unauthenticated, redirect to login
  useEffect(() => {
    if (!isAuthLoading && cartParam === 'checkout' && !currentUser) {
      const params = new URLSearchParams(searchParams?.toString() || '');
      const returnUrl = `/menu?${params.toString()}`;
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
    }
  }, [isAuthLoading, cartParam, currentUser, searchParams, router]);

  // 15-Minute Cart LocalStorage Persistence with Auto-Expiry
  const CART_STORAGE_KEY = 'rajmahal_cart_v1';
  const CART_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes max
  const hasLoadedCartFromStorageRef = React.useRef(false);
  const existingExpiresAtRef = React.useRef<number | null>(null);

  // 1. Initial Load on Mount: restore cart if saved within 15 minutes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const now = Date.now();
        if (
          parsed &&
          parsed.expiresAt &&
          now < parsed.expiresAt &&
          parsed.cart &&
          Object.keys(parsed.cart).length > 0
        ) {
          existingExpiresAtRef.current = parsed.expiresAt;
          setCart(parsed.cart);
        } else {
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      }
    } catch (err) {
      console.warn('Error reading cart from localStorage:', err);
    } finally {
      hasLoadedCartFromStorageRef.current = true;
    }
  }, []);

  // 2. Sync Cart to LocalStorage on Change & 15-minute Auto-expiry timer
  useEffect(() => {
    if (!hasLoadedCartFromStorageRef.current) return;

    if (Object.keys(cart).length === 0) {
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch {}
      return;
    }

    const now = Date.now();
    const expiresAt =
      existingExpiresAtRef.current && existingExpiresAtRef.current > now
        ? existingExpiresAtRef.current
        : now + CART_EXPIRATION_MS;

    existingExpiresAtRef.current = null;

    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          cart,
          expiresAt,
          savedAt: now,
        })
      );
    } catch (err) {
      console.warn('Error saving cart to localStorage:', err);
    }

    const remainingMs = Math.max(0, expiresAt - Date.now());
    const timer = setTimeout(() => {
      setCart({});
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch {}
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [cart]);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isMobileSortDropdownOpen, setIsMobileSortDropdownOpen] = useState(false);

  // Dish Details & Customization Popup Drawer state
  const [selectedDishForDetails, setSelectedDishForDetails] = useState<MenuItem | null>(null);
  const [editingCartKey, setEditingCartKey] = useState<string | null>(null);
  const [drawerPortion, setDrawerPortion] = useState<MenuItemPortion | null>(null);
  const [drawerExtras, setDrawerExtras] = useState<MenuItemExtra[]>([]);
  const [drawerQty, setDrawerQty] = useState(1);
  const [drawerNotes, setDrawerNotes] = useState('');
  const [isDeliveryBannerShrunk, setIsDeliveryBannerShrunk] = useState(false);
  const wasFreeDeliveryRef = React.useRef(false);

  // Mobile Bottom Swipeable Drawer State & 60/120fps Hardware-Accelerated Refs
  const drawerSheetRef = React.useRef<HTMLDivElement>(null);
  const drawerBackdropRef = React.useRef<HTMLDivElement>(null);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);

  const drawerDragOffsetRef = React.useRef<number>(0);
  const isSwipingDrawerRef = React.useRef<boolean>(false);
  const drawerTouchStartYRef = React.useRef<number | null>(null);
  const lastTouchYRef = React.useRef<number>(0);
  const lastTouchTimeRef = React.useRef<number>(0);
  const touchVelocityRef = React.useRef<number>(0);
  const rafIdRef = React.useRef<number | null>(null);

  const closeDishDetails = () => {
    setIsDrawerClosing(true);
    setIsDrawerMounted(false);

    if (drawerSheetRef.current) {
      drawerSheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
      drawerSheetRef.current.style.transform = 'translate3d(0, 100%, 0)';
    }
    if (drawerBackdropRef.current) {
      drawerBackdropRef.current.style.transition = 'opacity 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      drawerBackdropRef.current.style.opacity = '0';
    }

    setTimeout(() => {
      setSelectedDishForDetails(null);
      setEditingCartKey(null);
      setIsDrawerClosing(false);
      setIsDrawerMounted(false);
      drawerDragOffsetRef.current = 0;
      drawerTouchStartYRef.current = null;
    }, 290);
  };

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
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

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
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

    // Fluid iOS rubber-band physics: 1:1 down, soft exponential resistance up
    let offset = 0;
    if (rawDeltaY > 0) {
      offset = rawDeltaY;
    } else {
      offset = -Math.pow(-rawDeltaY, 0.72);
    }
    drawerDragOffsetRef.current = offset;

    // Direct DOM manipulation on compositor thread (0 React re-renders while dragging!)
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (drawerSheetRef.current) {
        drawerSheetRef.current.style.transform = `translate3d(0, ${offset}px, 0)`;
      }
      if (drawerBackdropRef.current && offset > 0) {
        const sheetHeight = drawerSheetRef.current?.offsetHeight || 600;
        const progress = Math.min(1, Math.max(0, offset / sheetHeight));
        drawerBackdropRef.current.style.opacity = `${Math.max(0, 1 - progress * 0.85)}`;
      }
    });
  };

  const handleDrawerTouchEnd = () => {
    if (drawerTouchStartYRef.current === null) return;
    isSwipingDrawerRef.current = false;
    drawerTouchStartYRef.current = null;
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

    const isFlickDown = touchVelocityRef.current > 0.45;
    const isDraggedFarEnough = drawerDragOffsetRef.current > 85;

    if (isFlickDown || isDraggedFarEnough) {
      closeDishDetails();
    } else {
      drawerDragOffsetRef.current = 0;
      if (drawerSheetRef.current) {
        drawerSheetRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)';
        drawerSheetRef.current.style.transform = 'translate3d(0, 0, 0)';
      }
      if (drawerBackdropRef.current) {
        drawerBackdropRef.current.style.transition = 'opacity 0.32s cubic-bezier(0.32, 0.72, 0, 1)';
        drawerBackdropRef.current.style.opacity = '1';
      }
    }
  };

  // Checkout & Customer Details state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableOrRoom, setTableOrRoom] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<'cards' | 'upi' | 'pay_on_delivery'>('pay_on_delivery');

  // Table / Room / Hall parameter from QR URL or standard query (?qr\r&table=T-42 or ?room=204)
  const urlTableNumber = useMemo(() => {
    if (qrLocationInfo.displayLocation) {
      return qrLocationInfo.displayLocation;
    }
    return (
      searchParams?.get('table') ||
      searchParams?.get('table_number') ||
      searchParams?.get('room') ||
      searchParams?.get('room_number') ||
      searchParams?.get('hall') ||
      searchParams?.get('hall_number') ||
      ''
    );
  }, [searchParams, qrLocationInfo]);

  useEffect(() => {
    if (qrLocationInfo.displayLocation) {
      setTableOrRoom(qrLocationInfo.displayLocation);
    } else if (urlTableNumber) {
      setTableOrRoom(urlTableNumber);
    }
  }, [qrLocationInfo.displayLocation, urlTableNumber]);

  // Delivery Location & 4 km Radius Checking from Arya College Kukas
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleDetectGPSLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationNotice({
        type: 'error',
        message: 'Live GPS geolocation is not supported by your browser.',
      });
      return;
    }
    setIsDetectingLocation(true);
    setLocationNotice({ type: null, message: '' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingLocation(false);
        const { latitude, longitude } = pos.coords;
        const dist = calculateDistanceKm(
          ARYA_COLLEGE_COORDS.lat,
          ARYA_COLLEGE_COORDS.lng,
          latitude,
          longitude
        );
        setDeliveryCoords({ lat: latitude, lng: longitude });
        setDeliveryDistanceKm(dist);
        if (dist <= ARYA_COLLEGE_COORDS.radiusKm) {
          setLocationNotice({
            type: 'success',
            message: `✓ Within 4 km delivery zone (${dist.toFixed(2)} km from Arya College Kukas)`,
          });
          if (!deliveryAddress.trim()) {
            setDeliveryAddress(`Kukas, Jaipur (GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        } else {
          setLocationNotice({
            type: 'error',
            message: `⚠️ Delivery Unavailable: Your location is ${dist.toFixed(1)} km away. We exclusively deliver within 4 km of Arya College of Engineering, Kukas, Jaipur. Please select a nearby address or switch to Pickup.`,
          });
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        setLocationNotice({
          type: 'error',
          message: 'Could not access GPS. Please select an area below or enter your address.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSelectAreaPreset = (preset: typeof KUKAS_AREA_PRESETS[0]) => {
    setDeliveryCoords({ lat: preset.lat, lng: preset.lng });
    setDeliveryDistanceKm(preset.dist);
    setLocationNotice({
      type: 'success',
      message: `✓ Within 4 km delivery zone (${preset.dist} km from Arya College Kukas)`,
    });
    setDeliveryAddress(preset.name + ', Kukas, Jaipur');
  };

  // Subscribe to auth state and auto-populate user details
  useEffect(() => {
    const unsub = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setCustomerName((prev) => prev || profile.name || user.displayName || user.email?.split('@')[0] || '');
            setCustomerPhone((prev) => prev || profile.phone || user.phoneNumber || '');
            if (profile.address) {
              setDeliveryAddress((prev) => prev || profile.address);
            }
            if (profile.room_number || profile.table_number) {
              setTableOrRoom((prev) => prev || profile.room_number || profile.table_number || '');
            }
          } else {
            setCustomerName((prev) => prev || user.displayName || user.email?.split('@')[0] || '');
            setCustomerPhone((prev) => prev || user.phoneNumber || '');
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      }
    });
    return () => unsub();
  }, []);

  // Live Menu Categories synced real-time from Firestore
  const [liveMenuCategories, setLiveMenuCategories] = useState<MenuCategory[] | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Real-time Billing & Tax settings from Firestore settings/billing
  const [billingSettings, setBillingSettings] = useState<BillingSettings>(DEFAULT_BILLING_SETTINGS);

  useEffect(() => {
    const unsub = billingService.subscribeBillingSettings((settings) => {
      setBillingSettings(settings);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore synchronization for menu items and categories
  useEffect(() => {
    setIsLoadingMenu(true);
    let itemsList: MenuItem[] = [];
    let catsList: Array<Partial<MenuCategory> & { id: string }> = [];

    const updateState = () => {
      const built = buildCategoriesFromItems(itemsList, catsList);
      setLiveMenuCategories(built);
      setIsLoadingMenu(false);
    };

    const unsubItems = onSnapshot(
      collection(db, 'menu_items'),
      (snap) => {
        itemsList = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MenuItem[];
        updateState();
      },
      (err) => {
        console.warn('Real-time menu_items error, falling back to API:', err);
        fetch('/api/menu')
          .then((r) => r.json())
          .then((data) => {
            setLiveMenuCategories(data.categories || []);
            setIsLoadingMenu(false);
          })
          .catch(() => {
            setLiveMenuCategories([]);
            setIsLoadingMenu(false);
          });
      }
    );

    const unsubCats = onSnapshot(
      collection(db, 'menu_categories'),
      (snap) => {
        catsList = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Array<Partial<MenuCategory> & { id: string }>;
        updateState();
      },
      (err) => {
        console.warn('Real-time menu_categories error:', err);
      }
    );

    return () => {
      unsubItems();
      unsubCats();
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

      if (restCount === 0 && cafeCount > 0 && selectedVenue === 'restaurant' && !venueParam) {
        handleSelectVenue('cafe');
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

  // Flattened items for active venue with search and price sorting
  const filteredCategories = useMemo(() => {
    return categoriesForVenue
      .map((cat) => {
        let matchingItems = (cat.items || []).filter((item) => {
          // Search query match
          const matchesSearch =
            !searchQuery.trim() ||
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

          return matchesSearch;
        });

        // Price Sorting
        if (sortBy === 'price_asc') {
          matchingItems = [...matchingItems].sort(
            (a, b) => getItemEffectivePrice(a) - getItemEffectivePrice(b)
          );
        } else if (sortBy === 'price_desc') {
          matchingItems = [...matchingItems].sort(
            (a, b) => getItemEffectivePrice(b) - getItemEffectivePrice(a)
          );
        }

        return {
          ...cat,
          items: matchingItems,
        };
      })
      .filter((cat) => activeCategory === 'all' || cat.id === activeCategory);
  }, [categoriesForVenue, activeCategory, searchQuery, sortBy]);

  // Cart operations
  const addToCart = (
    item: MenuItem,
    portion?: MenuItemPortion | null,
    selectedExtras: MenuItemExtra[] = [],
    notes?: string,
    quantityToAdd = 1
  ) => {
    if (!selectedVenue || item.is_available === false) return;
    const cartKey = getCartKey(item.id, portion, selectedExtras);
    setCart((prev) => {
      const existing = prev[cartKey];
      return {
        ...prev,
        [cartKey]: {
          cartKey,
          item,
          quantity: (existing?.quantity || 0) + quantityToAdd,
          venueType: selectedVenue,
          selectedPortion: portion || undefined,
          selectedExtras,
          notes: notes !== undefined ? notes : existing?.notes,
          addedAt: existing?.addedAt || Date.now(),
        },
      };
    });
  };

  const toggleExtraInCart = (cartKey: string, extra: MenuItemExtra) => {
    setCart((prev) => {
      const entry = prev[cartKey];
      if (!entry) return prev;
      const currentExtras = entry.selectedExtras || [];
      const idx = currentExtras.findIndex((e) => e.name === extra.name);
      let updated: MenuItemExtra[];
      if (idx >= 0) {
        updated = currentExtras.filter((e) => e.name !== extra.name);
      } else {
        updated = [...currentExtras, { ...extra, quantity: 1 }];
      }
      if (entry.item.extras && entry.item.extras.length > 0) {
        const orderMap = new Map(entry.item.extras.map((ex, i) => [ex.name, i]));
        updated.sort((a, b) => (orderMap.get(a.name) ?? 999) - (orderMap.get(b.name) ?? 999));
      }
      const newKey = getCartKey(entry.item.id, entry.selectedPortion, updated);
      const next = { ...prev };
      delete next[cartKey];
      if (next[newKey]) {
        next[newKey] = {
          ...next[newKey],
          quantity: next[newKey].quantity + entry.quantity,
          addedAt: Math.min(next[newKey].addedAt || entry.addedAt || Date.now(), entry.addedAt || Date.now()),
        };
      } else {
        next[newKey] = {
          ...entry,
          cartKey: newKey,
          selectedExtras: updated,
          addedAt: entry.addedAt || Date.now(),
        };
      }
      return next;
    });
  };

  const updateExtraQtyInCart = (cartKey: string, extraName: string, delta: number) => {
    setCart((prev) => {
      const entry = prev[cartKey];
      if (!entry) return prev;
      const currentExtras = entry.selectedExtras || [];
      const idx = currentExtras.findIndex((e) => e.name === extraName);
      if (idx < 0) return prev;

      const currentQty = currentExtras[idx].quantity || 1;
      const newQty = currentQty + delta;

      let updated: MenuItemExtra[];
      if (newQty <= 0) {
        updated = currentExtras.filter((e) => e.name !== extraName);
      } else {
        updated = currentExtras.map((e, i) =>
          i === idx ? { ...e, quantity: newQty } : e
        );
      }
      if (entry.item.extras && entry.item.extras.length > 0) {
        const orderMap = new Map(entry.item.extras.map((ex, i) => [ex.name, i]));
        updated.sort((a, b) => (orderMap.get(a.name) ?? 999) - (orderMap.get(b.name) ?? 999));
      }

      const newKey = getCartKey(entry.item.id, entry.selectedPortion, updated);
      const next = { ...prev };
      delete next[cartKey];
      if (next[newKey]) {
        next[newKey] = {
          ...next[newKey],
          quantity: next[newKey].quantity + entry.quantity,
          addedAt: Math.min(next[newKey].addedAt || entry.addedAt || Date.now(), entry.addedAt || Date.now()),
        };
      } else {
        next[newKey] = {
          ...entry,
          cartKey: newKey,
          selectedExtras: updated,
          addedAt: entry.addedAt || Date.now(),
        };
      }
      return next;
    });
  };

  const removeExtraFromCart = (cartKey: string, extraName: string) => {
    updateExtraQtyInCart(cartKey, extraName, -999);
  };

  const openDishDetails = (item: MenuItem, existingEntry?: CartItemEntry) => {
    setSelectedDishForDetails(item);
    setEditingCartKey(existingEntry ? existingEntry.cartKey : null);
    setIsDrawerClosing(false);
    setIsDrawerMounted(false);
    drawerDragOffsetRef.current = 0;
    isSwipingDrawerRef.current = false;
    drawerTouchStartYRef.current = null;

    if (existingEntry) {
      setDrawerPortion(existingEntry.selectedPortion || getItemLowestPortion(item));
      setDrawerExtras(existingEntry.selectedExtras || []);
      setDrawerQty(existingEntry.quantity || 1);
      setDrawerNotes(existingEntry.notes || '');
    } else {
      setDrawerPortion(getItemLowestPortion(item));
      setDrawerExtras([]);
      setDrawerQty(1);
      setDrawerNotes('');
    }

    // Trigger smooth transition once DOM is mounted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsDrawerMounted(true);
        if (drawerSheetRef.current) {
          drawerSheetRef.current.style.transform = '';
          drawerSheetRef.current.style.transition = '';
        }
        if (drawerBackdropRef.current) {
          drawerBackdropRef.current.style.opacity = '';
          drawerBackdropRef.current.style.transition = '';
        }
      });
    });
  };

  const handleIncrementDrawerExtra = (extra: MenuItemExtra) => {
    setDrawerExtras((prev) => {
      const idx = prev.findIndex((e) => e.name === extra.name);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: (updated[idx].quantity || 1) + 1,
        };
        return updated;
      } else {
        return [...prev, { ...extra, quantity: 1 }];
      }
    });
  };

  const handleDecrementDrawerExtra = (extra: MenuItemExtra) => {
    setDrawerExtras((prev) => {
      const idx = prev.findIndex((e) => e.name === extra.name);
      if (idx < 0) return prev;
      const currentQty = prev[idx].quantity || 1;
      if (currentQty <= 1) {
        return prev.filter((_, i) => i !== idx);
      } else {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: currentQty - 1,
        };
        return updated;
      }
    });
  };

  const getExtraQty = (extraName: string): number => {
    const found = drawerExtras.find((e) => e.name === extraName);
    return found ? found.quantity || 1 : 0;
  };

  const handleAddFromDrawer = () => {
    if (!selectedDishForDetails || selectedDishForDetails.is_available === false) return;
    let portionToUse = drawerPortion;
    if (selectedDishForDetails.portions && selectedDishForDetails.portions.length > 0 && !portionToUse) {
      portionToUse = getItemLowestPortion(selectedDishForDetails);
    }
    const targetCartKey = getCartKey(selectedDishForDetails.id, portionToUse, drawerExtras);

    if (editingCartKey && editingCartKey !== targetCartKey) {
      setCart((prev) => {
        const next = { ...prev };
        const oldEntry = next[editingCartKey];
        delete next[editingCartKey];
        if (next[targetCartKey]) {
          next[targetCartKey] = {
            ...next[targetCartKey],
            quantity: next[targetCartKey].quantity + drawerQty,
            notes: drawerNotes.trim() || next[targetCartKey].notes,
          };
        } else {
          next[targetCartKey] = {
            cartKey: targetCartKey,
            item: selectedDishForDetails,
            quantity: drawerQty,
            venueType: selectedVenue,
            selectedPortion: portionToUse || undefined,
            selectedExtras: drawerExtras,
            notes: drawerNotes.trim() || undefined,
            addedAt: oldEntry?.addedAt || Date.now(),
          };
        }
        return next;
      });
      setEditingCartKey(null);
      closeDishDetails();
      return;
    }

    addToCart(
      selectedDishForDetails,
      portionToUse,
      drawerExtras,
      drawerNotes.trim() || undefined,
      drawerQty
    );
    setEditingCartKey(null);
    closeDishDetails();
  };

  const decreaseQuantity = (cartKey: string) => {
    setCart((prev) => {
      if (!prev[cartKey]) return prev;
      if (prev[cartKey].quantity <= 1) {
        const next = { ...prev };
        delete next[cartKey];
        return next;
      }
      return {
        ...prev,
        [cartKey]: { ...prev[cartKey], quantity: prev[cartKey].quantity - 1 },
      };
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[cartKey];
      return next;
    });
  };

  const clearCart = () => {
    setCart({});
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {}
  };

  // Cart calculations - maintain stable insertion order by addedAt so items never shuffle
  const cartEntries = useMemo(() => {
    return Object.values(cart).sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
  }, [cart]);
  const totalCartCount = cartEntries.reduce((sum, ci) => sum + ci.quantity, 0);
  const subtotalMinor = cartEntries.reduce((sum, ci) => {
    const basePrice = ci.selectedPortion ? ci.selectedPortion.price_minor : ci.item.price_minor;
    const extrasTotal = (ci.selectedExtras || []).reduce(
      (acc, ex) => acc + ex.price_minor * (ex.quantity || 1),
      0
    );
    return sum + (basePrice + extrasTotal) * ci.quantity;
  }, 0);

  // Calculate statutory taxes and billing fees using official settings/billing
  const billCalc = useMemo(() => {
    return billingService.calculateOrderBill(
      subtotalMinor,
      orderingMethod || 'dine_in',
      billingSettings
    );
  }, [subtotalMinor, orderingMethod, billingSettings]);

  const {
    taxMinor,
    cgstMinor,
    sgstMinor,
    serviceChargeMinor,
    serviceChargePercent,
    deliveryFeeMinor,
    isFreeDelivery,
    packagingFeeMinor,
    roundOffMinor,
    totalMinor,
    gstPercent,
  } = billCalc;

  // Free delivery calculations for delivery mode
  const freeDeliveryThresholdMinor = (billingSettings.delivery_free_above || 500) * 100;
  const deliveryAmountLeftMinor = Math.max(0, freeDeliveryThresholdMinor - subtotalMinor);
  const deliveryProgressPercent = Math.min(
    100,
    Math.round((subtotalMinor / freeDeliveryThresholdMinor) * 100)
  );
  const isProgressBarVisible = orderingMethod === 'delivery' && !isDeliveryBannerShrunk;

  // Shrink free delivery unlocked banner after 3.5 seconds
  useEffect(() => {
    if (orderingMethod === 'delivery' && isFreeDelivery) {
      if (!wasFreeDeliveryRef.current) {
        wasFreeDeliveryRef.current = true;
        setIsDeliveryBannerShrunk(false);
        const timer = setTimeout(() => {
          setIsDeliveryBannerShrunk(true);
        }, 3500);
        return () => clearTimeout(timer);
      }
    } else {
      wasFreeDeliveryRef.current = false;
      setIsDeliveryBannerShrunk(false);
    }
  }, [isFreeDelivery, orderingMethod]);

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
      setErrorMessage('Please enter your Table number or Room Suite number for Dine-In service.');
      return;
    }

    if (orderingMethod === 'delivery') {
      if (!deliveryAddress.trim()) {
        setErrorMessage('Please provide a delivery address in Kukas, Jaipur.');
        return;
      }
      if (deliveryDistanceKm !== null && deliveryDistanceKm > ARYA_COLLEGE_COORDS.radiusKm) {
        setErrorMessage(
          `Delivery is only available within 4 km of Arya College of Engineering, Kukas, Jaipur. Your location is ${deliveryDistanceKm.toFixed(1)} km away. Please choose a nearby address or switch to Pickup.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderLines = cartEntries.map((ci) => {
        const basePrice = ci.selectedPortion ? ci.selectedPortion.price_minor : ci.item.price_minor;
        const extrasTotal = (ci.selectedExtras || []).reduce(
          (acc, ex) => acc + ex.price_minor * (ex.quantity || 1),
          0
        );
        const unitPrice = basePrice + extrasTotal;
        const portionDesc = ci.selectedPortion ? `Portion: ${ci.selectedPortion.name}` : '';
        const extrasDesc = (ci.selectedExtras || [])
          .map(
            (e) =>
              `${(e.quantity || 1) > 1 ? `${e.quantity}x ` : ''}${e.name} (+₹${(((e.price_minor * (e.quantity || 1))) / 100).toFixed(2)})`
          )
          .join(', ');
        const notesArr = [ci.notes, portionDesc, extrasDesc ? `Extras: ${extrasDesc}` : ''].filter(Boolean);
        return {
          menu_item_id: ci.item.id,
          item_name_snapshot: ci.selectedPortion ? `${ci.item.name} (${ci.selectedPortion.name})` : ci.item.name,
          unit_price_snapshot_minor: unitPrice,
          quantity: ci.quantity,
          notes: notesArr.join(' | ') || null,
          modifiers_snapshot: ci.selectedExtras && ci.selectedExtras.length > 0 ? ci.selectedExtras : null,
          line_total_minor: unitPrice * ci.quantity,
        };
      });

      const orderNotesWithLocation = [
        orderNotes,
        qrLocationInfo.displayLocation ? `QR Access: ${qrLocationInfo.displayLocation} (${selectedVenue})` : '',
        orderingMethod === 'dine_in' && tableOrRoom ? `Table/Room: ${tableOrRoom}` : '',
      ].filter(Boolean).join(' | ');

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: currentOutlet.id,
          channel: qrLocationInfo.isQR ? 'qr_dine_in' : 'web',
          fulfilment_mode: orderingMethod,
          pickup_name: customerName,
          pickup_phone: customerPhone,
          delivery_name: customerName,
          delivery_phone: customerPhone,
          delivery_address: orderingMethod === 'delivery' ? deliveryAddress : null,
          table_id: orderingMethod === 'dine_in' ? tableOrRoom : null,
          room_number: qrLocationInfo.locationType === 'room' ? (qrLocationInfo.locationId || tableOrRoom) : null,
          delivery_notes: orderNotesWithLocation || null,
          payment_method: selectedPaymentOption,
          payment_status: 'pending',
          uid: currentUser?.uid || null,
          user_id: currentUser?.uid || null,
          subtotal_minor: subtotalMinor,
          tax_minor: taxMinor,
          service_charge_minor: serviceChargeMinor,
          delivery_fee_minor: deliveryFeeMinor,
          packaging_fee_minor: packagingFeeMinor,
          round_off_minor: roundOffMinor,
          total_minor: totalMinor,
          order_lines: orderLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit order');

      // Clear cart on successful order
      setCart({});
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch {}

      // Save order ID to localStorage for Your Orders drawer tracking
      const placedOrderId = data.order?.id || data.order?.order_number;
      if (placedOrderId) {
        try {
          const raw = localStorage.getItem('rajmahal_user_order_ids_v1');
          const ids = raw ? JSON.parse(raw) : [];
          if (!ids.includes(placedOrderId)) {
            ids.unshift(placedOrderId);
            localStorage.setItem('rajmahal_user_order_ids_v1', JSON.stringify(ids.slice(0, 30)));
          }
        } catch {}
      }

      closeCart();

      // If user selected Cards or UPI: redirect to payment gateway endpoint
      if (selectedPaymentOption === 'cards' || selectedPaymentOption === 'upi') {
        router.push(
          `/payment-gateway?order_id=${encodeURIComponent(placedOrderId || 'ORD-NEW')}&method=${selectedPaymentOption}&amount=${totalMinor}`
        );
      } else {
        // Pay on Delivery: Open Orders drawer to 'your_orders' showing the live order and QR code!
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('open-orders-drawer', {
              detail: {
                tab: 'your_orders',
                orderId: placedOrderId,
              },
            })
          );
        }
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
    <div className="min-h-screen bg-[#FFF7E8] text-[#4F0809] pb-52 sm:pb-36 selection:bg-[#D8AA67] selection:text-[#3B0507] w-full max-w-full [overflow-x:clip]">

      {/* ═══════════════════════════════════════════════════════════════
          STAGE 1: CHOOSE ORDERING METHOD (MOVES DIRECTLY TO MENU)
      ═══════════════════════════════════════════════════════════════ */}
      {!orderingMethod && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12">
          {/* Scanned from Table/Room QR Notification Banner */}
          {qrLocationInfo.displayLocation && (
            <div className="mb-6 max-w-xl mx-auto px-4 py-2.5 rounded-2xl bg-white border border-[#D8AA67]/45 shadow-2xs flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#FAF3E0] border border-[#D8AA67]/40 flex items-center justify-center text-[#9C7A45] shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#4F0809] flex items-center gap-1.5">
                    <span>Scanned from {qrLocationInfo.displayLocation}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      QR Detected
                    </span>
                  </p>
                  <p className="text-[10px] text-[#856B4D] truncate">
                    Your location has been linked. Select dining method to explore the menu.
                  </p>
                </div>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-[#D8AA67] shrink-0 animate-pulse" />
            </div>
          )}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 md:gap-6">
            {(['dine_in', 'pickup', 'delivery'] as OrderingMethod[]).map((method) => {
              const details = methodDetails[method];
              const Icon = details.icon;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => handleSelectOrderingMethod(method)}
                  className="group relative flex flex-row md:flex-col items-center text-left md:text-center p-3.5 sm:p-4 md:p-8 rounded-4xl md:rounded-4xl bg-[#ffffff] hover:bg-[#F5ECDC] transition-all duration-300 hover:-translate-y-1 cursor-pointer focus:outline-none w-full"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl md:rounded-full bg-[#F5ECDC] flex items-center justify-center shrink-0 md:mb-5 group-hover:scale-105 group-hover:bg-[#4F0809] transition-all duration-300">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[#4F0809] group-hover:text-[#D8AA67] transition-colors" />
                  </div>

                  <div className="flex-1 min-w-0 px-3 sm:px-3.5 md:px-0 md:mb-6">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#9C7A45] block mb-0.5 md:mb-1">
                      {details.tag}
                    </span>

                    <h3
                      className="text-base sm:text-lg md:text-2xl font-bold text-[#4F0809] mb-0.5 md:mb-2 leading-tight"
                      style={{
                        fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                      }}
                    >
                      {details.label}
                    </h3>

                    <p className="text-[11px] sm:text-xs text-[#6B533B] leading-snug md:leading-relaxed font-normal line-clamp-2 md:line-clamp-none">
                      {details.desc}
                    </p>
                  </div>

                  {/* Mobile Action Arrow */}
                  <div className="shrink-0 md:hidden w-8 h-8 rounded-full bg-[#F5ECDC] group-hover:bg-[#4F0809] flex items-center justify-center text-[#4F0809] group-hover:text-[#D8AA67] transition-all">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  {/* Desktop Explore Button */}
                  <div className="hidden md:inline-flex mt-auto items-center space-x-1.5 px-4 py-2 rounded-full bg-[#4F0809] text-[#FFF8EB] text-[11px] font-bold uppercase tracking-[0.12em]">
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
          {/* ── Scanned From Table / Room QR Notification (Inside Section above Active Venue Card) ── */}
          {qrLocationInfo.displayLocation && (
            <div className="mb-3.5 sm:mb-4 px-2.5 py-2.5 sm:py-2 rounded-3xl bg-white flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#FAF3E0] flex items-center justify-center text-[#9C7A45] shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-[#4F0809] flex items-center gap-1.5 flex-wrap leading-tight">
                    <span>Scanned from {qrLocationInfo.displayLocation}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-800">
                      {qrLocationInfo.locationType === 'room' ? 'In-Room Dining' : qrLocationInfo.locationType === 'hall' ? 'Hall Service' : 'Table Dine-In Active'}
                    </span>
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-[#856B4D] truncate mt-0.5">
                    Orders will be freshly prepared and served directly to {qrLocationInfo.displayLocation} • {selectedVenue === 'cafe' ? 'Courtyard Café & Lounge' : 'Rajmahal Royal Dining'}
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#E8DFCE] text-[10px] font-bold text-[#9C7A45] shrink-0">
                <Sparkles className="w-3 h-3 text-[#D8AA67] animate-pulse" />
                <span>QR Linked</span>
              </div>
            </div>
          )}

          {/* Active Order Controls + Venue Dropdown Header */}
<div className="p-4 sm:p-6 mb-5 sm:mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Active Venue Info */}
            <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0">
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 bg-[#EFE6D5]">
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

                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap mt-0.5">
                  <h1
                    className="text-xl sm:text-3xl font-bold text-[#4F0809] leading-tight truncate"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    {venueDetails[selectedVenue || 'restaurant'].title}
                  </h1>

                  {/* Shadow-Free & Border-Free Pure Veg Badge */}
                  <div className="inline-flex items-center space-x-1.5 px-1 py-0.5 sm:px-1.2 pr: 1.4 sm:py-1 rounded-lg bg-emerald-100/80 text-emerald-900 shrink-0">
                    <span
                      className="w-3.5 h-3.5 rounded-[5px] border-[1.5px] border-emerald-700 bg-white flex items-center justify-center shrink-0"
                      title="100% Pure Vegetarian"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                      Pure Veg
                    </span>
                  </div>
                </div>

                <p className="text-[11px] sm:text-xs text-[#6B533B] font-normal mt-0.5 line-clamp-1">
                  {venueDetails[selectedVenue || 'restaurant'].tagline}
                </p>
              </div>
            </div>

            {/* Right: Order Type Pill & Venue Dropdown in a Single Row on Mobile & Desktop */}
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 w-full md:w-auto shrink-0">
              {/* Order Type Switcher Pill */}
              <button
                type="button"
                onClick={handleChangeOrderType}
                className="inline-flex items-center justify-center space-x-1.5 h-10 sm:h-11 px-3 sm:px-4 rounded-full bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] text-[11px] sm:text-xs font-bold transition-colors cursor-pointer min-w-0"
                title="Change order type"
              >
                {React.createElement(methodDetails[orderingMethod].icon, {
                  className: 'w-3.5 h-3.5 text-[#9C7A45] shrink-0',
                })}
                <span className="truncate">{methodDetails[orderingMethod].label}</span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#9C7A45] shrink-0">
                  (Change)
                </span>
              </button>

              {/* Venue Dropdown Selector */}
              <div className="relative min-w-0 sm:min-w-[215px]">
                <select
                  aria-label="Select Palace Venue"
                  value={selectedVenue || 'restaurant'}
                  onChange={(e) => handleSelectVenue(e.target.value as VenueType)}
                  className="w-full h-10 sm:h-11 pl-3.5 sm:pl-4 pr-8 sm:pr-9 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-[10px] sm:text-xs font-bold uppercase tracking-[0.08em] sm:tracking-[0.1em] truncate appearance-none cursor-pointer focus:outline-none transition-colors"
                >
                  <option value="restaurant">
                    Rajasthani Restaurant (Pure Veg){restaurantItemsCount > 0 ? ` (${restaurantItemsCount})` : ''}
                  </option>
                  <option value="cafe">
                    Jharokha Café &amp; Lounge (Pure Veg){cafeItemsCount > 0 ? ` (${cafeItemsCount})` : ''}
                  </option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D8AA67] pointer-events-none absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* ── 3-COLUMN DESKTOP LAYOUT (Left Sidebar | Center Foods Cards | Right Cart) ── */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-6 lg:gap-8 w-full max-w-full">
            {/* ═══════════════════════════════════════════════════════════
                1. LEFT SIDEBAR (DESKTOP MODE): SEARCH, SORTING DROPDOWN, CATEGORIES
            ═══════════════════════════════════════════════════════════ */}
            <aside className="hidden lg:block lg:w-64 xl:w-72 shrink-0 sticky top-24 self-start space-y-4 z-30 overflow-visible">
              <div className="p-4 sm:p-5 rounded-4xl space-y-5 relative overflow-visible">
                {/* 1. Search Filter with Sorting Dropdown Aside It */}
                <div className="space-y-1.5 relative overflow-visible z-40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9C7A45] block">
                      Search Menu
                    </span>
                    {sortBy !== 'none' && (
                      <button
                        type="button"
                        onClick={() => setSortBy('none')}
                        className="text-[10px] text-[#856B4D] hover:text-[#4F0809] underline font-medium cursor-pointer"
                      >
                        Reset sort
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 relative overflow-visible">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#856B4D] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search dishes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-8 pr-7 text-xs rounded-4xl bg-[#FFFCF6] border border-[#E8DFCE] focus:bg-[#FDF8EE] focus:border-[#D8AA67] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/60 transition-colors"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#856B4D] hover:text-[#4F0809] cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Sorting Dropdown Aside the Searchbar */}
                    <div className="relative shrink-0 overflow-visible">
                      <button
                        type="button"
                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                        className={`h-10 px-2.5 rounded-4xl border text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                          sortBy !== 'none'
                            ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-xs'
                            : 'bg-[#FFFCF6] text-[#4F0809] border-[#E8DFCE] hover:border-[#D8AA67]'
                        }`}
                        title="Sort by price"
                        aria-label="Open sorting menu"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#D8AA67]" />
                        <ChevronDown className="w-3 h-3 opacity-70" />
                      </button>

                      {/* Dropdown Popover (unclipped, positioned above section) */}
                      {isSortDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-[#FDF8EE] border border-[#E8DFCE] rounded-2xl shadow-2xl z-50 p-2.5 space-y-2 text-[#4F0809] animate-fade-in">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9C7A45]">
                              Sort By Price
                            </span>
                            {sortBy !== 'none' && (
                              <button
                                type="button"
                                onClick={() => setSortBy('none')}
                                className="text-[10px] text-[#856B4D] hover:text-[#4F0809] underline font-medium cursor-pointer"
                              >
                                Reset
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSortBy('price_asc');
                              setIsSortDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                              sortBy === 'price_asc'
                                ? 'bg-[#4F0809] text-[#FFF8EB]'
                                : 'hover:bg-white text-[#4F0809]'
                            }`}
                          >
                            <span>Price: Low to High</span>
                            <span className="text-[11px] font-bold text-[#D8AA67]">₹ ↑</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSortBy('price_desc');
                              setIsSortDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                              sortBy === 'price_desc'
                                ? 'bg-[#4F0809] text-[#FFF8EB]'
                                : 'hover:bg-white text-[#4F0809]'
                            }`}
                          >
                            <span>Price: High to Low</span>
                            <span className="text-[11px] font-bold text-[#D8AA67]">₹ ↓</span>
                          </button>

                          {sortBy !== 'none' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSortBy('none');
                                setIsSortDropdownOpen(false);
                              }}
                              className="w-full flex items-center space-x-1.5 px-2.5 py-1.5 text-[11px] text-[#856B4D] hover:text-[#4F0809] transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3 text-[#9C7A45]" />
                              <span>Clear sorting (Default)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
                {(searchQuery || sortBy !== 'none' || activeCategory !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSortBy('none');
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
              {/* Mobile Only: Search & Sorting Dropdown */}
              <div className="lg:hidden flex items-center gap-2">
                {/* Mobile Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#856B4D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search dishes, drinks..."
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

                {/* Mobile Sorting Dropdown */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMobileSortDropdownOpen(!isMobileSortDropdownOpen)}
                    className={`h-11 px-3.5 rounded-full border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      sortBy !== 'none'
                        ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-xs'
                        : 'bg-[#FDF8EE] text-[#4F0809] border-[#E8DFCE]'
                    }`}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#D8AA67]" />
                    <span>
                      {sortBy === 'price_asc'
                        ? '₹ Low-High'
                        : sortBy === 'price_desc'
                        ? '₹ High-Low'
                        : 'Sort'}
                    </span>
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>

                  {/* Mobile Sort Dropdown Popover */}
                  {isMobileSortDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-[#FDF8EE] border border-[#E8DFCE] rounded-2xl shadow-xl z-50 p-2.5 space-y-2 text-[#4F0809] animate-fade-in">
                      {/* Price Sorting */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9C7A45]">
                            Sort By Price
                          </span>
                          {sortBy !== 'none' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSortBy('none');
                                setIsMobileSortDropdownOpen(false);
                              }}
                              className="text-[10px] text-[#856B4D] hover:text-[#4F0809] underline font-medium cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('price_asc');
                            setIsMobileSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            sortBy === 'price_asc'
                              ? 'bg-[#4F0809] text-[#FFF8EB]'
                              : 'hover:bg-white text-[#4F0809]'
                          }`}
                        >
                          <span>Price: Low to High</span>
                          <span className="text-[11px] font-bold text-[#D8AA67]">₹ ↑</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSortBy('price_desc');
                            setIsMobileSortDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            sortBy === 'price_desc'
                              ? 'bg-[#4F0809] text-[#FFF8EB]'
                              : 'hover:bg-white text-[#4F0809]'
                          }`}
                        >
                          <span>Price: High to Low</span>
                          <span className="text-[11px] font-bold text-[#D8AA67]">₹ ↓</span>
                        </button>

                        {sortBy !== 'none' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSortBy('none');
                              setIsMobileSortDropdownOpen(false);
                            }}
                            className="w-full flex items-center space-x-1.5 px-2.5 py-1 text-[11px] text-[#856B4D] hover:text-[#4F0809] transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3 text-[#9C7A45]" />
                            <span>Clear sorting (Default)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
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
                    Try resetting your search query or sorting options.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSortBy('none');
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
                          const lowestPortion = getItemLowestPortion(item);
                          const displayPriceMinor = lowestPortion ? lowestPortion.price_minor : item.price_minor;
                          const hasPortions = Boolean(item.portions && item.portions.length > 0);
                          const hasExtras = Boolean(item.extras && item.extras.length > 0);
                          const isCustomizable = hasPortions || hasExtras;

                          const itemCartEntries = cartEntries.filter((ci) => ci.item.id === item.id);
                          const totalInCartQty = itemCartEntries.reduce((s, ci) => s + ci.quantity, 0);

                          const isAvailable = item.is_available !== false;

                          return (
                            <div
                              key={item.id}
                              onClick={() => openDishDetails(item)}
                              className={`w-full bg-[#FFFCF6] rounded-2xl sm:rounded-3xl transition-all duration-300 flex flex-col justify-between overflow-hidden group cursor-pointer ${
                                !isAvailable
                                  ? 'opacity-80'
                                  : 'hover:-translate-y-1'
                              }`}
                            >
                              {/* Framed Dish Image */}
                              <div className="p-1.5 sm:p-2.5 pb-0">
                                <div className="relative h-28 sm:h-44 w-full rounded-xl sm:rounded-t-2xl sm:rounded-b-md bg-[#EFE6D5] overflow-hidden">
                                  <Image
                                    src={item.image_url || '/images/food/restaurant.jpg'}
                                    alt={item.name}
                                    fill
                                    unoptimized={Boolean(item.image_url?.startsWith('data:'))}
                                    className={`object-cover transition-transform duration-300 ${
                                      isAvailable ? 'group-hover:scale-105' : 'grayscale-[40%]'
                                    }`}
                                  />
                                  {!isAvailable && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                                      <span className="px-2.5 py-1 rounded-full bg-[#3B0507]/90 text-[#F5ECDC] text-[9px] sm:text-[11px] font-bold uppercase tracking-wider shadow-sm">
                                        Sold Out
                                      </span>
                                    </div>
                                  )}

                                  {/* Prep Time Badge on Top Right of Card */}
                                  <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#FDF8EE]/95 backdrop-blur-sm text-[9px] sm:text-[11px] font-bold text-[#4F0809] flex items-center space-x-1 shadow-xs border border-[#E8DFCE]/70">
                                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#9C7A45]" />
                                    <span>{item.prep_time_minutes || 15} mins</span>
                                  </div>
                                </div>
                              </div>

                              {/* Dish Info & Actions */}
                              <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
                                <div>
                                  <div className="flex items-center justify-between gap-1">
                                    <h4
                                      className="font-bold text-xs sm:text-base lg:text-lg text-[#4F0809] leading-snug line-clamp-1"
                                      style={{
                                        fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                                      }}
                                    >
                                      {item.name}
                                    </h4>
                                    {isCustomizable && (
                                      <span className="text-[9px] font-bold text-[#9C7A45] uppercase tracking-wider bg-[#F5ECDC] px-1.5 py-0.5 rounded shrink-0">
                                        Customizable
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] sm:text-xs text-[#6B533B] font-normal mt-0.5 line-clamp-2 leading-relaxed">
                                    {item.description}
                                  </p>
                                </div>

                                <div className="pt-1.5 flex items-center justify-between gap-1 min-w-0">
                                  <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                                    <span
                                      className="text-xs sm:text-base lg:text-lg font-bold text-[#4F0809] shrink-0"
                                      style={{
                                        fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                                      }}
                                    >
                                      {formatMoney(displayPriceMinor)}
                                    </span>
                                    {lowestPortion && (
                                      <span className="text-[10px] sm:text-xs font-semibold text-[#856B4D] truncate capitalize">
                                        ({lowestPortion.name}
                                        {itemCartEntries.length > 1
                                          ? ` · +${itemCartEntries.length - 1} more`
                                          : ''})
                                      </span>
                                    )}
                                  </div>

                                  {/* Quantity Stepper or Add button */}
                                  {!isAvailable ? (
                                    <span className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-[#E8DFCE] text-[#856B4D] text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0 cursor-not-allowed">
                                      Sold Out
                                    </span>
                                  ) : totalInCartQty === 0 ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isCustomizable) {
                                          openDishDetails(item);
                                        } else {
                                          addToCart(item, null, [], undefined, 1);
                                        }
                                      }}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1 sm:px-4 sm:py-2 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer active:scale-95 shadow-xs shrink-0"
                                      aria-label={`Add ${item.name} to order`}
                                    >
                                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D8AA67]" />
                                      <span>Add</span>
                                    </button>
                                  ) : (
                                    <div className="flex flex-col items-center shrink-0">
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center rounded-full bg-[#F5ECDC]/50 p-0.5"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (itemCartEntries.length === 1) {
                                              decreaseQuantity(itemCartEntries[0].cartKey);
                                            } else if (itemCartEntries.length > 1) {
                                              decreaseQuantity(itemCartEntries[itemCartEntries.length - 1].cartKey);
                                            }
                                          }}
                                          className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-[#F5ECDC] flex items-center justify-center text-[#4F0809] hover:bg-[#EFE2CC] transition-colors cursor-pointer"
                                          aria-label={`Decrease quantity of ${item.name}`}
                                        >
                                          <Minus className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                                        </button>
                                        <span className="w-4 sm:w-7 text-center text-[10px] sm:text-xs font-bold text-[#4F0809]">
                                          {totalInCartQty}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (isCustomizable) {
                                              openDishDetails(item);
                                            } else {
                                              addToCart(item, null, [], undefined, 1);
                                            }
                                          }}
                                          className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-[#F5ECDC] flex items-center justify-center text-[#4F0809] hover:bg-[#EFE2CC] transition-colors cursor-pointer"
                                          title={isCustomizable ? 'Add another portion / customize' : `Increase quantity of ${item.name}`}
                                          aria-label={`Increase quantity of ${item.name}`}
                                        >
                                          <Plus className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                                        </button>
                                      </div>
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

      {/* ── BOTTOM-CENTER FLOATING CART POPUP WITH INTEGRATED FREE DELIVERY PROGRESS (ALL SCREENS - OPENS DRAWER ON TAP) ── */}
{Boolean(orderingMethod) && totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-[84px] md:bottom-7 left-1/2 -translate-x-1/2 z-40 w-max max-w-[calc(100vw-2rem)] animate-fade-in-up">
          <div
            onClick={() => setIsCartOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsCartOpen(true);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="View Cart and Free Delivery status"
            className={`group flex flex-col ${
              isProgressBarVisible ? 'rounded-3xl sm:rounded-3xl' : 'rounded-full'
            } bg-[#4F0809] hover:bg-[#5E0A0B] text-[#FDF8EE] active:scale-[0.98] transition-all duration-300 cursor-pointer overflow-hidden shadow-[0_10px_35px_rgba(79,8,9,0.4)]`}
          >
            {/* Free Delivery Progress Strip (Delivery Mode Only — Tonal & Border-Free) */}
            {orderingMethod === 'delivery' && (
              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  isDeliveryBannerShrunk
                    ? 'max-h-0 opacity-0 py-0'
                    : 'max-h-20 opacity-100 px-3.5 pt-2.5 pb-2 bg-[#3B0507]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold mb-1.5 gap-3">
                  {deliveryAmountLeftMinor > 0 ? (
                    <>
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <Truck className="w-3 h-3 text-[#D8AA67] shrink-0" />
                        <span className="truncate text-[#FDF8EE]/90">
                          Add <span className="text-[#D8AA67] font-bold">{formatMoney(deliveryAmountLeftMinor)}</span> for{' '}
                          <span className="text-[#FDF8EE] font-bold">Free Delivery</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-[#D8AA67] shrink-0 font-bold">
                        {deliveryProgressPercent}%
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-[#FDF8EE] w-full justify-center">
                      <Sparkles className="w-3 h-3 text-[#D8AA67] shrink-0" />
                      <span className="font-bold tracking-wide">Royal Free Delivery Unlocked</span>
                    </div>
                  )}
                </div>

                {/* Solid Gold Progress Bar Track */}
                <div className="w-full h-1 bg-[#2B0304] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out bg-[#D8AA67]"
                    style={{ width: `${deliveryProgressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Main Cart Row */}
            <div className="flex items-center justify-between gap-3 sm:gap-4 pl-2.5 pr-3 py-2 sm:pl-3 sm:pr-3.5 sm:py-2.5">
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                {/* Overlapping Avatar Stack of Added Item Images */}
                <div className="flex items-center -space-x-2.5 shrink-0">
                  {cartEntries.slice(0, 3).map((ci) => (
                    <div
                      key={ci.cartKey}
                      className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-[#EFE6D5] ring-2 ring-[#4F0809]"
                    >
                      <Image
                        src={ci.item.image_url || '/images/food/restaurant.jpg'}
                        alt={ci.item.name}
                        fill
                        unoptimized={Boolean(ci.item.image_url?.startsWith('data:'))}
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* Selected Count & Total */}
                <div className="text-left">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs sm:text-sm font-bold text-[#FDF8EE] leading-tight">
                      View Cart
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#D8AA67] text-[#3B0507] text-[10px] sm:text-xs font-bold leading-none">
                      {totalCartCount}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <p className="text-[11px] text-[#D8AA67] font-bold leading-tight">
                      {formatMoney(totalMinor)}
                    </p>
                    {isFreeDelivery && orderingMethod === 'delivery' && isDeliveryBannerShrunk && (
                      <span className="px-2 py-0.5 rounded-full bg-[#3B0507] text-[#D8AA67] text-[9px] font-bold uppercase tracking-wider leading-none inline-flex items-center space-x-1 shrink-0">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Free Del.</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#D8AA67] text-[#3B0507] flex items-center justify-center shrink-0">
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL-SCREEN SLIDE-OVER CART DRAWER (ALL SCREENS - OPENS ON CART BUTTON TAP) ── */}
      {Boolean(orderingMethod) && isCartOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-white/60 backdrop-blur-xs flex justify-end transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-heading"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCart();
          }}
        >
          <div className="w-full max-w-md sm:max-w-lg bg-[#FFFCF7] h-full max-h-[100dvh] flex flex-col justify-between animate-slide-left">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 flex items-center justify-between bg-[#FFFCF7] text-[#4F0809] shrink-0 border-b border-[#E8DFCE]/40">
              {cartStep === 1 ? (
                <div className="flex items-center space-x-2.5">
                  <ShoppingBag className="w-4 h-4 text-[#4F0809]" />
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
              ) : (
                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={backToCartStep}
                    className="w-8 h-8 rounded-full bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] flex items-center justify-center transition-colors cursor-pointer"
                    title="Back to Cart Review"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#4F0809]" />
                  </button>
                  <div>
                    <span className="text-[10px] text-[#9C7A45] uppercase font-bold tracking-wider block">
                      Step 2 of 2
                    </span>
                    <h3
                      id="cart-drawer-heading"
                      className="text-lg sm:text-xl font-bold leading-tight"
                      style={{
                        fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                      }}
                    >
                      Checkout &amp; Confirmation
                    </h3>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={closeCart}
                className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 text-[#4F0809] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-4 h-4 text-[#4F0809]" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="px-4 py-2 bg-[#F5ECDC]/50 border-b border-[#E8DFCE]/50 flex items-center justify-between text-xs shrink-0">
              <button
                type="button"
                onClick={cartStep === 2 ? backToCartStep : undefined}
                className={`flex items-center space-x-2 ${cartStep === 2 ? 'cursor-pointer hover:opacity-80' : ''}`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    cartStep === 1 ? 'bg-[#4F0809] text-[#FFF8EB]' : 'bg-[#D8AA67] text-[#3B0507]'
                  }`}
                >
                  {cartStep === 2 ? '✓' : '1'}
                </span>
                <span className={cartStep === 1 ? 'font-bold text-[#4F0809]' : 'text-[#856B4D]'}>
                  Cart Review
                </span>
              </button>
              <div className="flex-1 mx-3 h-0.5 bg-[#E8DFCE]" />
              <div className="flex items-center space-x-2">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    cartStep === 2 ? 'bg-[#4F0809] text-[#FFF8EB]' : 'bg-[#E8DFCE] text-[#856B4D]'
                  }`}
                >
                  2
                </span>
                <span className={cartStep === 2 ? 'font-bold text-[#4F0809]' : 'text-[#856B4D]'}>
                  Checkout &amp; Details
                </span>
              </div>
            </div>

            {/* Context Notice: Order Method & Venue */}
            <div className="px-4 py-2 bg-[#FFFCF7] flex items-center justify-between text-xs text-[#4F0809] shrink-0 border-b border-[#E8DFCE]/30">
              <div>
                <span className="text-[#856B4D] font-medium">Fulfillment:</span>{' '}
                <span className="font-bold">{orderingMethod ? methodDetails[orderingMethod].label : 'Dine In'}</span>
              </div>
              <div>
                <span className="text-[#856B4D] font-medium">Venue:</span>{' '}
                <span className="font-bold">{selectedVenue === 'cafe' ? 'Courtyard Café' : 'Royal Dining'}</span>
              </div>
            </div>

            {cartStep === 1 && (
              <>

            {/* Free Delivery Progress Banner inside Cart Drawer (Delivery Mode Only) */}
{orderingMethod === 'delivery' && (
              <div className="mx-4 mt-3.5 px-4 py-3 rounded-2xl bg-[#4F0809] text-[#FDF8EE] shrink-0">
                <div className="flex items-start justify-between gap-2.5 mb-2">
                  <div className="flex items-start space-x-2 min-w-0">
                    <Truck className="w-4 h-4 text-[#D8AA67] shrink-0 mt-0.5" />
                    {deliveryAmountLeftMinor > 0 ? (
                      <span className="text-xs font-semibold leading-snug text-[#FDF8EE]">
                        Add <span className="text-[#D8AA67] font-bold">{formatMoney(deliveryAmountLeftMinor)}</span> more for{' '}
                        <span className="text-[#FFE2B0] font-bold">FREE Delivery</span>
                      </span>
                    ) : (
                      <span className="text-xs text-[#FFE2B0] flex items-center space-x-1.5 font-bold leading-snug">
                        <Sparkles className="w-3.5 h-3.5 text-[#D8AA67] shrink-0" />
                        <span>Royal FREE Delivery Unlocked!</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#340405] text-[#D8AA67] font-bold shrink-0">
                    {deliveryProgressPercent}%
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full h-2 bg-[#340405] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out bg-[#D8AA67]"
                    style={{ width: `${Math.min(100, Math.max(0, deliveryProgressPercent))}%` }}
                  />
                </div>

                {deliveryAmountLeftMinor > 0 ? (
                  <p className="text-[10px] text-[#FDF8EE]/75 mt-2 leading-relaxed">
                    Orders above {formatMoney(freeDeliveryThresholdMinor)} qualify for free royal doorstep delivery.
                  </p>
                ) : (
                  <p className="text-[10px] text-[#FFE2B0] mt-2 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D8AA67] shrink-0" />
                    <span>₹{billingSettings.delivery_charges || 50} delivery charge waived off for your order.</span>
                  </p>
                )}
              </div>
            )}

            {/* Itemized Cart List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 rounded-3xl">
              {cartEntries.length === 0 ? (
                <div className="py-20 text-center text-[#856B4D] space-y-2">
                  <ShoppingBag className="w-12 h-12 text-[#C99A52]/50 mx-auto" />
                  <p className="text-sm font-bold text-[#4F0809]">Your cart is currently empty</p>
                  <p className="text-xs font-normal max-w-xs mx-auto">
                    Add dishes from the menu to start your royal feast order.
                  </p>
                </div>
              ) : (
                cartEntries.map((ci) => {
                  const { cartKey, item, quantity, venueType, selectedPortion, selectedExtras } = ci;
                  const basePrice = selectedPortion ? selectedPortion.price_minor : item.price_minor;
                  const extrasTotal = (selectedExtras || []).reduce(
                    (s, e) => s + e.price_minor * (e.quantity || 1),
                    0
                  );
                  const unitPrice = basePrice + extrasTotal;
                  const itemTotalMinor = unitPrice * quantity;

                  return (
                    <div
                      key={cartKey}
                      className="p-3.5 rounded-3xl bg-[#F5ECDC]/75 flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-bold text-xs sm:text-sm text-[#4F0809] truncate">{item.name}</h5>
                              {quantity > 1 && (
                                <span className=" rounded-md text-[#4F0809] text-[9px] sm:text-[10px] font-bold shrink-0">
                                  x{quantity}
                                </span>
                              )}
                            </div>
                            {selectedPortion && (
                              <span className="inline-block px-2 py-0.5 mt-0.5 rounded-md bg-[#4F0809] text-[#FFF8EB] text-[10px] font-bold capitalize">
                                Portion: {selectedPortion.name}
                              </span>
                            )}
                            <p className="text-[11px] text-[#6B533B] mt-0.5">
                              {formatMoney(unitPrice)} each &bull;{' '}
                              <span className="capitalize">{venueType}</span>
                            </p>
                          </div>
                        </div>

                        {/* Stepper */}
                        <div className="flex flex-col items-end shrink-0">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center rounded-full bg-[#FFFFFF] p-0.5">
                              <button
                                type="button"
                                onClick={() => decreaseQuantity(cartKey)}
                                className="w-6 h-6 rounded-full flex items-center bg-[#FDF8EE] justify-center text-[#4F0809] hover:bg-[#F5ECDC] cursor-pointer"
                                title="Decrease dish quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-[#4F0809]">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => addToCart(item, selectedPortion, selectedExtras, ci.notes, 1)}
                                className="w-6 h-6 rounded-full flex items-center bg-[#FDF8EE] justify-center text-[#4F0809] hover:bg-[#F5ECDC] cursor-pointer"
                                title="Increase dish quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <span className="font-bold text-xs text-[#4F0809] w-16 text-right">
                              {formatMoney(itemTotalMinor)}
                            </span>

                            <button
                              type="button"
                              onClick={() => removeFromCart(cartKey)}
                              className="text-[#856B4D] hover:text-red-700 cursor-pointer p-0.5"
                              title="Remove item"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Itemized List of Selected Extras with Steppers (Not in Chips) */}
                      {selectedExtras && selectedExtras.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-[#9C7A45] uppercase tracking-wider">
                            <span>Selected Add-ons:</span>
                            <span className="text-[10px] text-[#856B4D] font-medium lowercase">
                              ({selectedExtras.length} added)
                            </span>
                          </div>
                          <div className="bg-white/85 rounded-2xl p-2 divide-y divide-[#E8DFCE]/50">
                            {selectedExtras.map((extra) => {
                              const extraQty = extra.quantity || 1;
                              const extraTotal = extra.price_minor * extraQty;
                              return (
                                <div
                                  key={extra.name}
                                  className="flex items-center justify-between py-1.5 first:pt-0.5 last:pb-0.5 text-xs text-[#4F0809]"
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-1">
                                      <span className="font-semibold capitalize text-[#4F0809] block truncate">
                                        {extra.name}
                                      </span>
                                      {extraQty > 1 && (
                                        <span className="text-[9px] font-bold text-[#9C7A45] shrink-0">
                                          x{extraQty}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[#856B4D]">
                                      +{formatMoney(extra.price_minor)} each
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-2 shrink-0">
                                    {/* Stepper for this extra */}
                                    <div className="flex items-center rounded-full bg-[#FDF8EE] p-0.5">
                                      <button
                                        type="button"
                                        onClick={() => updateExtraQtyInCart(cartKey, extra.name, -1)}
                                        className="w-5 h-5 rounded-full flex items-center bg-[#FFFFFF] justify-center text-[#4F0809] hover:bg-[#F5ECDC] transition-colors cursor-pointer"
                                        title="Decrease extra quantity"
                                      >
                                        <Minus className="w-2.5 h-2.5" />
                                      </button>
                                      <span className="w-5 text-center text-[11px] font-bold text-[#4F0809]">
                                        {extraQty}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateExtraQtyInCart(cartKey, extra.name, 1)}
                                        className="w-5 h-5 rounded-full flex items-center bg-[#FFFFFF] justify-center text-[#4F0809] hover:bg-[#F5ECDC] transition-colors cursor-pointer"
                                        title="Increase extra quantity"
                                      >
                                        <Plus className="w-2.5 h-2.5" />
                                      </button>
                                    </div>

                                    {/* Extra Total Price */}
                                    <span className="font-bold text-xs text-[#4F0809] min-w-[50px] text-right">
                                      +{formatMoney(extraTotal)}
                                    </span>

                                    {/* Remove extra button */}
                                    <button
                                      type="button"
                                      onClick={() => removeExtraFromCart(cartKey, extra.name)}
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-[#856B4D] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Remove extra"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Option to Add / Toggle Extras on Cart Page directly or Customize */}
                      {((item.extras && item.extras.length > 0) || (item.portions && item.portions.length > 0)) && (
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.extras && item.extras.length > 0 && (
                              <>
                                <span className="text-[10px] font-bold text-[#856B4D] uppercase">
                                  Add Extras:
                                </span>
                                {item.extras.map((extra) => {
                                  const isSelected = (selectedExtras || []).some((e) => e.name === extra.name);
                                  return (
                                    <button
                                      key={extra.name}
                                      type="button"
                                      onClick={() => toggleExtraInCart(cartKey, extra)}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center space-x-1 ${
                                        isSelected
                                          ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809]'
                                          : 'bg-white hover:bg-[#FDF8EE] text-[#4F0809] border-[#E8DFCE] hover:border-[#D8AA67]'
                                      }`}
                                    >
                                      <span>{isSelected ? '✓' : '+'}</span>
                                      <span className="capitalize">{extra.name}</span>
                                      <span className="opacity-80">({formatMoney(extra.price_minor)})</span>
                                    </button>
                                  );
                                })}
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsCartOpen(false);
                              openDishDetails(item, ci);
                            }}
                            className="text-[10px] font-bold text-[#9C7A45] hover:text-[#4F0809] underline cursor-pointer"
                          >
                            Customize / Change Portion
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bill Breakdown & Checkout CTA */}
            {cartEntries.length > 0 && (
              <div className="p-4 mx-4 mb-2 rounded-3xl sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-[#F5ECDC] space-y-3 shrink-0">
                <div className="space-y-1.5 text-xs text-[#6B533B]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#4F0809]">{formatMoney(subtotalMinor)}</span>
                  </div>

                  {/* Statutory GST (5% for Restaurant: CGST 2.5% + SGST 2.5%) */}
                  <div className="flex justify-between">
                    <span>GST ({gstPercent}%)</span>
                    <span className="font-medium text-[#4F0809]">{formatMoney(taxMinor)}</span>
                  </div>

                  {/* Palace Service Charge for Dine-in */}
                  {orderingMethod === 'dine_in' && serviceChargeMinor > 0 && (
                    <div className="flex justify-between">
                      <span>Palace Service Charge ({serviceChargePercent}%)</span>
                      <span className="font-medium text-[#4F0809]">{formatMoney(serviceChargeMinor)}</span>
                    </div>
                  )}

                  {/* Delivery Charges with Free Delivery above ₹500 threshold */}
                  {orderingMethod === 'delivery' && (
                    <div className="flex justify-between items-center">
                      <span>Delivery Fee</span>
                      {isFreeDelivery ? (
                        <span className="font-semibold text-[#856B4D] flex items-center space-x-1.5">
                          <span className="text-[10px] uppercase tracking-wide bg-[#D8AA67]/25 text-[#4F0809] border border-[#D8AA67]/50 px-1.5 py-0.2 rounded font-bold">
                            FREE
                          </span>
                          <span className="line-through text-xs font-normal text-[#856B4D]">
                            {formatMoney((billingSettings.delivery_charges || 50) * 100)}
                          </span>
                        </span>
                      ) : (
                        <span className="font-medium text-[#4F0809]">{formatMoney(deliveryFeeMinor)}</span>
                      )}
                    </div>
                  )}

                  {/* Packaging Charges for Delivery & Pickup */}
                  {packagingFeeMinor > 0 && (
                    <div className="flex justify-between">
                      <span title={billingSettings.packaging_note}>Packaging Charges</span>
                      <span className="font-medium text-[#4F0809]">{formatMoney(packagingFeeMinor)}</span>
                    </div>
                  )}

                  {/* Cash Round-off Adjustment */}
                  {roundOffMinor !== 0 && (
                    <div className="flex justify-between text-[11px] text-[#856B4D]">
                      <span>Round Off</span>
                      <span>{roundOffMinor > 0 ? `+${formatMoney(roundOffMinor)}` : `-${formatMoney(Math.abs(roundOffMinor))}`}</span>
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
                    onClick={proceedToCheckoutStep}
                    className="flex-1 py-2.5 px-5 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-xs font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md active:scale-95"
                  >
                    <span>Proceed to Checkout ({formatMoney(totalMinor)})</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── STEP 2: CHECKOUT & DELIVERY DETAILS ── */}
        {cartStep === 2 && (
          <form onSubmit={handlePlaceOrder} className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Logged in User Account Status */}
              {currentUser ? (
                <div className="p-3 rounded-2xl bg-[#F5ECDC]/80 border border-[#E8DFCE] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#4F0809] text-[#FFF8EB] flex items-center justify-center font-bold text-xs shrink-0">
                      {(currentUser.displayName || customerName || currentUser.email || 'G')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#4F0809] truncate">
                        {customerName || currentUser.displayName || 'Royal Guest'}
                      </p>
                      <p className="text-[10px] text-[#856B4D] truncate">{currentUser.email}</p>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                    <UserCheck className="w-2.5 h-2.5" />
                    <span>Logged In</span>
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center justify-between">
                  <span>Please sign in to complete your checkout.</span>
                  <button
                    type="button"
                    onClick={proceedToCheckoutStep}
                    className="text-xs font-bold text-[#4F0809] underline"
                  >
                    Sign In Now
                  </button>
                </div>
              )}

              {/* Error Prompt */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 text-red-800 border border-red-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Guest Information */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kunwar Vikramaditya / Priya Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/55 border border-[#E8DFCE]"
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
                    className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/55 border border-[#E8DFCE]"
                  />
                </div>

                {/* DINE-IN: Table / Room Number */}
                {orderingMethod === 'dine_in' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D]">
                        Table Number or Room / Hall *
                      </label>
                      {qrLocationInfo.displayLocation ? (
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>QR Detected: {qrLocationInfo.displayLocation}</span>
                        </span>
                      ) : urlTableNumber ? (
                        <span className="text-[10px] text-[#9C7A45] font-semibold">
                          (Detected from URL)
                        </span>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Table T-42 / Room 204 / Hall Darbar"
                      value={tableOrRoom}
                      onChange={(e) => setTableOrRoom(e.target.value)}
                      className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/55 border border-[#E8DFCE]"
                    />
                    <p className="text-[10px] text-[#856B4D] mt-1">
                      Required for royal table service, banquet halls &amp; room dining.
                    </p>
                  </div>
                )}

                {/* DELIVERY: Location restricted to 4km of Arya College Kukas */}
                {orderingMethod === 'delivery' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D]">
                        Delivery Location (Kukas, Jaipur) *
                      </label>
                      <span className="text-[10px] font-bold text-[#9C7A45]">
                        Max 4 km Radius
                      </span>
                    </div>

                    {/* Arya College Kukas Distance Check Box */}
                    <div className="p-3 rounded-2xl bg-[#4F0809]/5 border border-[#4F0809]/15 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-[#4F0809] shrink-0 mt-0.5" />
                          <div className="text-[11px] text-[#4F0809] leading-snug">
                            <span className="font-bold">Delivery Zone: </span>
                            <span>We only deliver within a 4 km radius of Arya College of Engineering, Kukas, Jaipur.</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleDetectGPSLocation}
                          disabled={isDetectingLocation}
                          className="px-2.5 py-1 rounded-full bg-[#4F0809] text-[#FFF8EB] text-[10px] font-bold shrink-0 hover:bg-[#680b0c] transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          {isDetectingLocation ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-[#D8AA67]" />
                              <span>Locating...</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3 text-[#D8AA67]" />
                              <span>Verify GPS</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Quick Kukas Area Presets */}
                      <div>
                        <span className="text-[10px] text-[#856B4D] font-bold uppercase tracking-wider block mb-1">
                          Nearby Campus &amp; Landmark Presets:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {KUKAS_AREA_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => handleSelectAreaPreset(preset)}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-white border border-[#E8DFCE] hover:border-[#D8AA67] text-[#4F0809] transition-colors cursor-pointer"
                            >
                              {preset.name} ({preset.dist} km)
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live Radius Status Alert */}
                      {locationNotice.type && (
                        <div
                          className={`p-2.5 rounded-xl text-[11px] flex items-start space-x-1.5 ${
                            locationNotice.type === 'success'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          {locationNotice.type === 'success' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                          )}
                          <span className="leading-tight">{locationNotice.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Detailed Delivery Address */}
                    <div>
                      <textarea
                        required
                        rows={2}
                        placeholder="Hostel Block, Room / Flat No., Street, Landmark, Kukas, Jaipur"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full p-3 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/55 border border-[#E8DFCE] resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Kitchen Instructions */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                    Kitchen Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mild spice, extra mint chutney, serve hot"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/55 border border-[#E8DFCE]"
                  />
                </div>

                {/* ── PAYMENT METHOD SELECTION ── */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D]">
                      Payment Method *
                    </label>
                    <span className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Secured</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Option 1: Cards */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentOption('cards')}
                      className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                        selectedPaymentOption === 'cards'
                          ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-sm'
                          : 'bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] border-[#E8DFCE]'
                      }`}
                    >
                      <CreditCard className={`w-4 h-4 ${selectedPaymentOption === 'cards' ? 'text-[#D8AA67]' : 'text-[#856B4D]'}`} />
                      <span className="text-[11px] font-bold leading-tight">Cards</span>
                      <span className="text-[9px] opacity-75">Debit/Credit</span>
                    </button>

                    {/* Option 2: Instant UPI */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentOption('upi')}
                      className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                        selectedPaymentOption === 'upi'
                          ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-sm'
                          : 'bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] border-[#E8DFCE]'
                      }`}
                    >
                      <Smartphone className={`w-4 h-4 ${selectedPaymentOption === 'upi' ? 'text-[#D8AA67]' : 'text-[#856B4D]'}`} />
                      <span className="text-[11px] font-bold leading-tight">Instant UPI</span>
                      <span className="text-[9px] opacity-75">GPay/PhonePe</span>
                    </button>

                    {/* Option 3: Pay on Delivery */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentOption('pay_on_delivery')}
                      className={`p-2.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                        selectedPaymentOption === 'pay_on_delivery'
                          ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-sm'
                          : 'bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] border-[#E8DFCE]'
                      }`}
                    >
                      <QrCode className={`w-4 h-4 ${selectedPaymentOption === 'pay_on_delivery' ? 'text-[#D8AA67]' : 'text-[#856B4D]'}`} />
                      <span className="text-[11px] font-bold leading-tight">Pay on Delivery</span>
                      <span className="text-[9px] opacity-75">{orderingMethod === 'dine_in' ? 'Table Pay/Cash' : 'Cash/UPI'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mini Order Summary & Bill in Step 2 */}
              <div className="p-3.5 rounded-2xl bg-[#F5ECDC]/70 border border-[#E8DFCE]/60 text-xs space-y-2">
                <div className="flex justify-between font-bold text-[#4F0809]">
                  <span>{totalCartCount} Dishes in Order</span>
                  <span>{formatMoney(totalMinor)}</span>
                </div>
                <div className="text-[11px] text-[#6B533B] space-y-0.5 pt-1 border-t border-[#E8DFCE]/40">
                  <div className="flex justify-between">
                    <span>Items Subtotal:</span>
                    <span>{formatMoney(subtotalMinor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST ({gstPercent}%):</span>
                    <span>{formatMoney(taxMinor)}</span>
                  </div>
                  {orderingMethod === 'dine_in' && serviceChargeMinor > 0 && (
                    <div className="flex justify-between">
                      <span>Service Charge ({serviceChargePercent}%):</span>
                      <span>{formatMoney(serviceChargeMinor)}</span>
                    </div>
                  )}
                  {orderingMethod === 'delivery' && (
                    <div className="flex justify-between">
                      <span>Delivery Charge:</span>
                      <span>{isFreeDelivery ? 'FREE' : formatMoney(deliveryFeeMinor)}</span>
                    </div>
                  )}
                  {packagingFeeMinor > 0 && (
                    <div className="flex justify-between">
                      <span>Packaging Charges:</span>
                      <span>{formatMoney(packagingFeeMinor)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2 Bottom Actions */}
            <div className="p-4 sm:p-5 bg-[#FFFCF7] border-t border-[#E8DFCE] flex gap-2.5 shrink-0">
              <button
                type="button"
                onClick={backToCartStep}
                className="px-4 py-2.5 rounded-full bg-[#FDF8EE] hover:bg-[#EFE2CC] text-[#4F0809] text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (orderingMethod === 'delivery' &&
                    deliveryDistanceKm !== null &&
                    deliveryDistanceKm > ARYA_COLLEGE_COORDS.radiusKm)
                }
                className="flex-1 py-2.5 px-5 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-xs font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D8AA67]" />
                    <span>Placing Royal Order...</span>
                  </>
                ) : selectedPaymentOption === 'pay_on_delivery' ? (
                  <>
                    <span>Confirm Order • Pay on Delivery</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D8AA67]" />
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D8AA67]" />
                    <span>Proceed to Pay {formatMoney(totalMinor)}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
          </div>
        </div>
      )}

      {/* ── FOOD ITEM DETAILS DRAWER (BOTTOM SWIPEABLE DRAWER ON MOBILE, RIGHT SLIDE-OVER ON DESKTOP) ── */}
      {Boolean(orderingMethod) && selectedDishForDetails && (
        <div
          ref={drawerBackdropRef}
          className={`fixed inset-0 z-50 overflow-hidden flex items-end sm:items-stretch justify-center sm:justify-end transition-opacity duration-300 ease-spring-ios ${
            !isDrawerMounted || isDrawerClosing
              ? 'opacity-0 pointer-events-none'
              : 'bg-white/65 backdrop-blur-xs opacity-100'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dish-details-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDishDetails();
          }}
        >
          <div
            ref={drawerSheetRef}
            className={`w-full max-w-full m-3 sm:m-0 sm:max-w-lg bg-[#fff8eb] h-auto max-h-[88dvh] sm:max-h-[100dvh] sm:h-full flex flex-col justify-between rounded-3xl sm:rounded-none sm:rounded-none overflow-hidden transition-transform duration-320 ease-spring-ios ${
              !isDrawerMounted || isDrawerClosing
                ? 'translate-y-full sm:translate-y-0 sm:translate-x-full'
                : 'translate-y-0 sm:translate-x-0'
            }`}
          >
            {/* Unified Royal Header with Integrated Grab Handle */}
            <div
              className="bg-[#fff8eb] text-[#4F0809] shrink-0 touch-none select-none px-4 sm:px-5 pt-3 pb-3.5 sm:py-4.5 cursor-grab active:cursor-grabbing"
              onTouchStart={handleDrawerTouchStart}
              onTouchMove={handleDrawerTouchMove}
              onTouchEnd={handleDrawerTouchEnd}
            >
              {/* Integrated Grab Handle Bar (Mobile Only) */}
              <div className="w-12 h-1.5 rounded-full bg-[#4F0809]/60 mx-auto mb-2.5 sm:hidden" />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Utensils className="w-4 h-4 text-[#4F0809]" />
                  <span
                    className="text-lg sm:text-xl font-bold tracking-wide"
                    style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                  >
                    Palace Recipe &amp; Customization
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeDishDetails}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#FFF8EB] flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Close dish details"
                >
                  <X className="w-4 h-4 text-[#4F0809]" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Large Framed Hero Image */}
              <div className="relative aspect-[16/10] w-full rounded-2xl bg-[#EFE6D5] overflow-hidden border border-[#E8DFCE]">
                <Image
                  src={selectedDishForDetails.image_url || '/images/food/restaurant.jpg'}
                  alt={selectedDishForDetails.name}
                  fill
                  unoptimized={Boolean(selectedDishForDetails.image_url?.startsWith('data:'))}
                  className="object-cover"
                />
                {selectedDishForDetails.is_available === false && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="px-4 py-1.5 rounded-full bg-[#3B0507] text-[#F5ECDC] text-xs font-bold uppercase tracking-widest shadow-md">
                      Sold Out
                    </span>
                  </div>
                )}
                {/* Prep Time Tag on Hero Image Top Right */}
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#FDF8EE]/95 backdrop-blur-sm text-xs font-bold text-[#4F0809] flex items-center space-x-1.5 shadow-sm border border-[#E8DFCE]/70">
                  <Clock className="w-3.5 h-3.5 text-[#9C7A45]" />
                  <span>{selectedDishForDetails.prep_time_minutes || 15} mins prep</span>
                </div>
              </div>

              {/* ── PORTIONS / SIZES SECTION (REQUIRED IF PORTIONS EXIST) ── */}
              {selectedDishForDetails.portions && selectedDishForDetails.portions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#4F0809]">Select Portion</h4>
                      <p className="text-[11px] text-[#856B4D]">
                        Choose 1 portion size (Required)
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#4F0809] text-[#FFF8EB] text-[10px] font-bold uppercase tracking-wider">
                      Required
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedDishForDetails.portions.map((portion) => {
                      const isSelected = drawerPortion?.name === portion.name;
                      return (
                        <button
                          key={portion.name}
                          type="button"
                          onClick={() => setDrawerPortion(portion)}
                          className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-sm ring-1 ring-[#D8AA67]'
                              : 'bg-white hover:bg-[#F5ECDC]/60 text-[#4F0809] border-[#E8DFCE]'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center border transition-colors ${
                                isSelected
                                  ? 'border-[#D8AA67] bg-[#D8AA67]'
                                  : 'border-[#856B4D]/60'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#3B0507]" />}
                            </div>
                            <span className="text-xs sm:text-sm font-bold capitalize">
                              {portion.name}
                            </span>
                          </div>

                          <span
                            className={`text-xs sm:text-sm font-bold ${
                              isSelected ? 'text-[#D8AA67]' : 'text-[#4F0809]'
                            }`}
                          >
                            {formatMoney(portion.price_minor)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── EXTRAS / ADD-ONS SECTION (COUNTER/STEPPER & MULTI-SELECT) ── */}
              {selectedDishForDetails.extras && selectedDishForDetails.extras.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#4F0809]">Add Extras (Optional)</h4>
                      <p className="text-[11px] text-[#856B4D]">
                        Select any add-ons &amp; adjust quantity
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#F5ECDC] text-[#9C7A45] text-[10px] font-bold uppercase tracking-wider">
                      Optional
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedDishForDetails.extras.map((extra) => {
                      const qty = getExtraQty(extra.name);
                      const isAdded = qty > 0;
                      return (
                        <div
                          key={extra.name}
                          className={`w-full flex items-center justify-between p-2 px-3 rounded-2xl transition-all ${
                            isAdded
                              ? 'bg-[#F5ECDC]/80 border-[#D8AA67] shadow-xs'
                              : 'bg-white hover:bg-[#F5ECDC]/40 border-[#E8DFCE]'
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0 pr-2">
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-[#4F0809] capitalize block truncate">
                                {extra.name}
                              </span>
                              <span className="text-[11px] font-semibold text-[#856B4D]">
                                +{formatMoney(extra.price_minor)} each
                              </span>
                            </div>
                          </div>

                          {/* Stepper / Add button */}
                          <div className="shrink-0">
                            {qty === 0 ? (
                              <button
                                type="button"
                                onClick={() => handleIncrementDrawerExtra(extra)}
                                className="h-8 px-3.5 rounded-full bg-[#FDF8EE] hover:bg-[#4F0809] hover:text-[#FFF8EB] text-[#4F0809] text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
                              >
                                <Plus className="w-3 h-3 text-[#9C7A45]" />
                                <span>Add</span>
                              </button>
                            ) : (
                              <div className="flex items-center rounded-full bg-[#FFFFFF] p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleDecrementDrawerExtra(extra)}
                                  className="w-7 h-7 rounded-full flex items-center bg-[#4F0809] justify-center text-[#FFF8EB] hover:bg-[#4F0809]/90 transition-colors cursor-pointer"
                                  aria-label={`Decrease ${extra.name}`}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 text-center text-xs font-bold text-[#4F0809]">
                                  {qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleIncrementDrawerExtra(extra)}
                                  className="w-7 h-7 rounded-full flex items-center bg-[#4F0809] justify-center text-[#FFF8EB] hover:bg-[#4F0809]/90 transition-colors cursor-pointer"
                                  aria-label={`Increase ${extra.name}`}
                                >
                                  <Plus className="w-3 h-3 text-[#D8AA67]" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cooking Notes / Special Request */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C7A45] block">
                  Special Instructions (Optional)
                </span>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, extra sauce, allergy note..."
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs rounded-xl bg-white focus:bg-[#FDF8EE] focus:border-[#D8AA67] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/60"
                />
              </div>
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="p-4 sm:p-5 bg-[#fff8eb] flex items-center justify-between gap-3 shrink-0">
              {/* Quantity Stepper */}
              <div className="flex items-center rounded-full bg-[#FFFFFF] p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setDrawerQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full flex items-center bg-[#F5ECDC] justify-center text-[#4F0809] hover:bg-[#FDF8EE] transition-colors cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-[#4F0809]">
                  {drawerQty}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerQty((q) => q + 1)}
                  className="w-8 h-8 rounded-full flex items-center bg-[#F5ECDC] justify-center text-[#4F0809] hover:bg-[#FDF8EE] transition-colors cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart Button */}
              {(() => {
                const currentBasePrice = drawerPortion ? drawerPortion.price_minor : selectedDishForDetails.price_minor;
                const extrasTotal = drawerExtras.reduce((s, e) => s + e.price_minor * (e.quantity || 1), 0);
                const linePrice = (currentBasePrice + extrasTotal) * drawerQty;
                const isAvailable = selectedDishForDetails.is_available !== false;
                const currentCartKey = getCartKey(selectedDishForDetails.id, drawerPortion, drawerExtras);
                const isAlreadyInCart = Boolean(cart[currentCartKey]);

                return (
                  <button
                    type="button"
                    disabled={!isAvailable}
                    onClick={handleAddFromDrawer}
                    className={`flex-1 h-11 px-4 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md ${
                      !isAvailable
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] active:scale-98'
                    }`}
                  >
                    <span>{isAlreadyInCart ? 'Update Order' : 'Add to Cart'}</span>
                    <span>&bull;</span>
                    <span className="text-[#D8AA67]">{formatMoney(linePrice)}</span>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF7E8] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-3 border-[#4F0809] border-t-transparent animate-spin" />
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
