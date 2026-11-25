'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/utils/money';
import {
  INITIAL_OUTLETS,
} from '@/lib/data/initial-data';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buildCategoriesFromItems } from '@/lib/services/menu-service';
import { billingService } from '@/lib/services/billing-service';
import type { MenuItem, MenuCategory, BillingSettings } from '@/lib/types';
import { DEFAULT_BILLING_SETTINGS } from '@/lib/types';
import { ShoppingBag, Plus, Minus, Clock, MapPin, ArrowRight } from 'lucide-react';

export default function PickupOrderPage() {
  const router = useRouter();
  const [selectedOutletId, setSelectedOutletId] = useState(INITIAL_OUTLETS[0].id);
  const [cart, setCart] = useState<{ [id: string]: { item: MenuItem; quantity: number } }>({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [liveCategories, setLiveCategories] = useState<MenuCategory[] | null>(null);

  // Real-time Firestore synchronization for pickup menu
  React.useEffect(() => {
    let itemsList: MenuItem[] = [];
    let catsList: Array<Partial<MenuCategory> & { id: string }> = [];

    const updateState = () => {
      const built = buildCategoriesFromItems(itemsList, catsList);
      setLiveCategories(built);
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
        console.warn('Real-time pickup menu_items error:', err);
        fetch('/api/menu')
          .then((r) => r.json())
          .then((data) => setLiveCategories(data.categories || []))
          .catch(() => setLiveCategories([]));
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
        console.warn('Real-time pickup menu_categories error:', err);
      }
    );

    return () => {
      unsubItems();
      unsubCats();
    };
  }, []);

  const currentOutlet =
    INITIAL_OUTLETS.find((o) => o.id === selectedOutletId) || INITIAL_OUTLETS[0];
  const categories = React.useMemo(() => {
    if (!liveCategories || liveCategories.length === 0) return [];
    const filtered = liveCategories.filter((cat) => {
      const isCafe = cat.outlet_id?.includes('2') || cat.id.includes('cafe');
      return currentOutlet.type === 'cafe' ? isCafe : !isCafe;
    });
    return filtered.length > 0 ? filtered : liveCategories;
  }, [liveCategories, currentOutlet.type]);

  const addToCart = (item: MenuItem) => {
    if (item.is_available === false) return;
    setCart((prev) => ({
      ...prev,
      [item.id]: {
        item,
        quantity: (prev[item.id]?.quantity || 0) + 1,
      },
    }));
  };

  const removeFromCart = (itemId: string) => {
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

  const [billingSettings, setBillingSettings] = useState<BillingSettings>(DEFAULT_BILLING_SETTINGS);

  React.useEffect(() => {
    const unsub = billingService.subscribeBillingSettings((settings) => {
      setBillingSettings(settings);
    });
    return () => unsub();
  }, []);

  const cartList = Object.values(cart);
  const subtotalMinor = cartList.reduce((sum, ci) => sum + ci.item.price_minor * ci.quantity, 0);

  const billCalc = React.useMemo(() => {
    return billingService.calculateOrderBill(subtotalMinor, 'pickup', billingSettings);
  }, [subtotalMinor, billingSettings]);

  const {
    taxMinor,
    packagingFeeMinor,
    roundOffMinor,
    totalMinor,
    gstPercent,
  } = billCalc;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (cartList.length === 0) {
      setErrorMsg('Please select at least one item to order.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg('Name and contact phone are required for pickup.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderLines = cartList.map((ci) => ({
        menu_item_id: ci.item.id,
        item_name_snapshot: ci.item.name,
        unit_price_snapshot_minor: ci.item.price_minor,
        quantity: ci.quantity,
        notes: pickupNotes || null,
        modifiers_snapshot: null,
        line_total_minor: ci.item.price_minor * ci.quantity,
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: currentOutlet.id,
          channel: 'web',
          fulfilment_mode: 'pickup',
          pickup_name: customerName,
          pickup_phone: customerPhone,
          delivery_notes: pickupNotes || null,
          subtotal_minor: subtotalMinor,
          tax_minor: taxMinor,
          delivery_fee_minor: 0,
          packaging_fee_minor: packagingFeeMinor,
          round_off_minor: roundOffMinor,
          total_minor: totalMinor,
          order_lines: orderLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      router.push(`/order-status/${data.order.order_number}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating order';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F5F1E8] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Badge variant="maroon">Takeaway Pickup</Badge>
              <Link
                href="/order/delivery"
                className="text-xs text-[#670E10] font-bold hover:underline ml-2"
              >
                Switch to Room / Doorstep Delivery &rarr;
              </Link>
            </div>
            <h1 className="font-heritage text-3xl sm:text-4xl font-bold text-[#241F1A]">
              Palace Gourmet Pickup
            </h1>
          </div>

          {/* Outlet Switcher */}
          <div className="flex bg-[#FAF8F3] p-1.5 rounded-xl border border-[#D4CBBB]">
            {INITIAL_OUTLETS.map((outlet) => (
              <button
                key={outlet.id}
                onClick={() => {
                  setSelectedOutletId(outlet.id);
                  setCart({});
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedOutletId === outlet.id
                    ? 'bg-[#670E10] text-white shadow-sm'
                    : 'text-[#6B6155] hover:text-[#241F1A]'
                }`}
              >
                {outlet.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Menu Items */}
          <div className="lg:col-span-7 space-y-8">
            {categories.length === 0 ? (
              <div className="bg-[#FAF8F3] border border-[#D4CBBB] rounded-2xl p-10 text-center">
                <p className="font-heritage text-lg font-bold text-[#241F1A]">Palace Menu In Preparation</p>
                <p className="text-xs text-[#6B6155] mt-1">Our chefs are updating today's fresh culinary creations. Please check back shortly.</p>
              </div>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="space-y-4">
                  <h2 className="font-heritage text-xl font-bold text-[#241F1A] border-b-2 border-[#D4CBBB] pb-2">
                    {cat.name}
                  </h2>

                  <div className="grid grid-cols-1 gap-3">
                    {cat.items?.map((item: MenuItem) => {
                      const qty = cart[item.id]?.quantity || 0;
                      return (
                        <div
                          key={item.id}
                          className="heritage-card bg-white p-4 rounded-xl border border-[#D4CBBB] flex items-center justify-between shadow-xs hover:border-[#670E10] transition-colors"
                        >
                          <div className="max-w-md pr-4">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="w-3.5 h-3.5 rounded-sm border border-emerald-600 flex items-center justify-center p-0.5 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              </span>
                              <h3 className="font-bold text-[#241F1A] text-sm">{item.name}</h3>
                            </div>
                            <p className="text-xs text-[#6B6155] line-clamp-1">{item.description}</p>
                            <span className="text-xs font-heritage font-bold text-[#670E10] mt-1 block">
                              {formatMoney(item.price_minor)}
                            </span>
                          </div>

                          {item.is_available === false ? (
                            <span className="text-[11px] font-bold text-[#856B4D] bg-[#E8DFCE] px-3 py-1.5 rounded-full uppercase tracking-wider shrink-0 cursor-not-allowed">
                              Sold Out
                            </span>
                          ) : qty === 0 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToCart(item)}
                              className="text-xs px-3 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add
                            </Button>
                          ) : (
                            <div className="flex items-center space-x-2 bg-[#FAF8F3] px-2 py-1 rounded-xl border border-[#D4CBBB] shrink-0">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="p-1 text-[#670E10] hover:text-[#8A1518] cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-bold text-[#241F1A] px-1">{qty}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="p-1 text-[#670E10] hover:text-[#8A1518] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Cart & Pickup Details */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 heritage-card bg-white p-6 sm:p-8 rounded-2xl border-2 border-[#B08D57]/40 shadow-md space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#D4CBBB]">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-[#670E10]" />
                  <h3 className="font-heritage text-xl font-bold text-[#241F1A]">Your Order</h3>
                </div>
                <span className="text-xs text-[#8F7245] font-bold">
                  {cartList.reduce((s, c) => s + c.quantity, 0)} Items
                </span>
              </div>

              {cartList.length === 0 ? (
                <div className="text-center py-8 text-[#6B6155] space-y-2">
                  <p className="text-sm">Your order basket is currently empty.</p>
                  <p className="text-xs text-[#8F7245]">Select royal delicacies from the menu to add.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 divide-y divide-[#D4CBBB]/40">
                    {cartList.map(({ item, quantity }) => (
                      <div key={item.id} className="pt-2 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-[#241F1A] block">{item.name}</span>
                          <span className="text-[#8F7245]">
                            {quantity} × {formatMoney(item.price_minor)}
                          </span>
                        </div>
                        <span className="font-heritage font-bold text-[#670E10]">
                          {formatMoney(item.price_minor * quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-[#D4CBBB] space-y-2 text-xs">
                    <div className="flex justify-between text-[#6B6155]">
                      <span>Subtotal</span>
                      <span className="font-semibold text-[#241F1A]">{formatMoney(subtotalMinor)}</span>
                    </div>
                    <div className="flex justify-between text-[#6B6155]">
                      <span>GST ({gstPercent}%)</span>
                      <span className="font-semibold text-[#241F1A]">{formatMoney(taxMinor)}</span>
                    </div>
                    {packagingFeeMinor > 0 && (
                      <div className="flex justify-between text-[#6B6155]">
                        <span title={billingSettings.packaging_note}>Packaging Charges</span>
                        <span className="font-semibold text-[#241F1A]">{formatMoney(packagingFeeMinor)}</span>
                      </div>
                    )}
                    {roundOffMinor !== 0 && (
                      <div className="flex justify-between text-[11px] text-[#6B6155]">
                        <span>Round Off</span>
                        <span className="font-semibold text-[#241F1A]">
                          {roundOffMinor > 0 ? `+${formatMoney(roundOffMinor)}` : `-${formatMoney(Math.abs(roundOffMinor))}`}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-[#241F1A] pt-2 border-t border-[#D4CBBB]">
                      <span>Total Amount</span>
                      <span className="font-heritage text-[#670E10] text-xl">{formatMoney(totalMinor)}</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="pt-4 border-t border-[#D4CBBB] space-y-4">
                    {errorMsg && (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                        {errorMsg}
                      </div>
                    )}

                    <Input
                      label="Pickup Guest Name"
                      placeholder="e.g. Yashwardhan Rathore"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />

                    <Input
                      label="Mobile Contact"
                      placeholder="+91 98765 43210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                    />

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#3D352C] mb-1.5">
                        Kitchen / Preparation Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mild spice, pack extra chutney"
                        value={pickupNotes}
                        onChange={(e) => setPickupNotes(e.target.value)}
                        className="w-full bg-white border border-[#D4CBBB] rounded-xl px-4 py-2.5 text-xs text-[#241F1A] placeholder-[#9A8E7F] focus:outline-none focus:border-[#670E10]"
                      />
                    </div>

                    <div className="p-3 bg-[#FAF8F3] rounded-xl border border-[#D4CBBB] flex items-center space-x-2 text-xs text-[#8F7245]">
                      <Clock className="w-4 h-4 text-[#670E10] shrink-0" />
                      <span>Ready in approximately {currentOutlet.pickup_lead_minutes} minutes from order</span>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      isLoading={isSubmitting}
                      className="w-full shadow-md flex items-center justify-center space-x-2"
                    >
                      <span>Place Pickup Order ({formatMoney(totalMinor)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
