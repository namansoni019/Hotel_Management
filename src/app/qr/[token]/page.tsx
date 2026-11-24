'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/utils/money';
import { dataRepository } from '@/lib/data/repository';
import type { MenuItem, Table, Outlet, MenuCategory } from '@/lib/types';
import {
  Utensils,
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Clock,
  MapPin,
  Bell,
  Receipt,
  Check,
} from 'lucide-react';

interface CartItemState {
  item: MenuItem;
  quantity: number;
  notes: string;
}

function QRTableOrderContent() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [table, setTable] = useState<Table | null>(null);
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [cart, setCart] = useState<{ [itemId: string]: CartItemState }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'non_veg' | 'jain'>('all');
  const [serviceNotice, setServiceNotice] = useState<string | null>(null);

  const handleCallSteward = (type: 'water' | 'bill' | 'steward') => {
    const text =
      type === 'water'
        ? `Water request dispatched for Table ${table?.table_number}. Steward will arrive shortly!`
        : type === 'bill'
        ? `Bill request dispatched for Table ${table?.table_number}. Steward is preparing your invoice.`
        : `Floor steward called for Table ${table?.table_number}. Attending shortly!`;

    setServiceNotice(text);
    setTimeout(() => setServiceNotice(null), 5000);
  };

  useEffect(() => {
    // Forward /qr/[token] to the new /menu?qr=r&table=... format and auto-reserve
    const resolved = dataRepository.resolveQRToken(token);
    let tableNum = '';
    let venueCode = 'r';
    if (resolved) {
      tableNum = resolved.table.table_number;
      venueCode = resolved.outlet?.type === 'cafe' ? 'c' : 'r';
    } else {
      tableNum = token.replace(/^(table-|qr-tab-|tbl-)/i, '').toUpperCase();
    }

    if (tableNum) {
      router.replace(`/menu?qr=${venueCode}&table=${tableNum}`);
      return;
    }

    if (resolved) {
      setTable(resolved.table);
      setOutlet(resolved.outlet);
      fetch(`/api/menu?outletId=${resolved.outlet.id}`)
        .then((r) => r.json())
        .then((data) => {
          setCategories(data.categories || []);
        })
        .catch(() => {
          setCategories([]);
        });
    } else {
      setErrorMsg('Invalid or expired QR code table session. Please consult staff.');
    }
  }, [token, router]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      if (existing) {
        return {
          ...prev,
          [item.id]: { ...existing, quantity: existing.quantity + 1 },
        };
      }
      return {
        ...prev,
        [item.id]: { item, quantity: 1, notes: '' },
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return {
        ...prev,
        [itemId]: { ...existing, quantity: existing.quantity - 1 },
      };
    });
  };

  const updateNotes = (itemId: string, notes: string) => {
    setCart((prev) => {
      if (!prev[itemId]) return prev;
      return {
        ...prev,
        [itemId]: { ...prev[itemId], notes },
      };
    });
  };

  // Calculations
  const cartItems = Object.values(cart);
  const totalItemCount = cartItems.reduce((sum, ci) => sum + ci.quantity, 0);
  const subtotalMinor = cartItems.reduce((sum, ci) => sum + ci.item.price_minor * ci.quantity, 0);
  const taxRateBps = outlet?.tax_rate_bps || 500; // 5%
  const taxMinor = Math.round((subtotalMinor * taxRateBps) / 10000);
  const serviceChargeBps = outlet?.service_charge_bps || 0;
  const serviceChargeMinor = Math.round((subtotalMinor * serviceChargeBps) / 10000);
  const totalMinor = subtotalMinor + taxMinor + serviceChargeMinor;

  const handlePlaceOrder = async () => {
    if (!table || !outlet || cartItems.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const orderLines = cartItems.map((ci) => ({
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
          outlet_id: outlet.id,
          table_id: table.id,
          channel: 'qr',
          fulfilment_mode: 'dine_in',
          subtotal_minor: subtotalMinor,
          tax_minor: taxMinor,
          service_charge_minor: serviceChargeMinor,
          discount_minor: 0,
          total_minor: totalMinor,
          delivery_fee_minor: 0,
          status: 'new',
          order_lines: orderLines,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit order');

      // Navigate to order status
      router.push(`/order-status/${data.order.order_number}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Order submission failed';
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };

  if (errorMsg && !table) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="heritage-card bg-white p-8 rounded-2xl border-2 border-rose-300 shadow-md">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-4" />
          <h2 className="font-heritage text-2xl font-bold text-[#241F1A] mb-2">QR Token Invalid</h2>
          <p className="text-xs text-[#6B6155] mb-6">{errorMsg}</p>
          <Link href="/">
            <Button>Return to Palace Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F1E8] min-h-screen py-8 pb-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Table & Outlet Top Badge */}
        <div className="heritage-card bg-white p-5 rounded-2xl border-2 border-[#B08D57]/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-[#670E10] text-white flex items-center justify-center font-heritage font-bold text-lg shadow-md">
              <Utensils className="w-6 h-6 text-[#B08D57]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Badge variant="maroon">{outlet?.name}</Badge>
                <span className="text-xs font-bold text-[#670E10]">Table {table?.table_number}</span>
              </div>
              <h1 className="font-heritage text-xl sm:text-2xl font-bold text-[#241F1A] mt-1">
                Contactless Table Dining
              </h1>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#FAF8F3] border border-[#D4CBBB] hover:border-[#670E10] transition-colors cursor-pointer text-xs font-bold text-[#241F1A]"
          >
            <ShoppingBag className="w-4 h-4 text-[#670E10]" />
            <span>Order Basket ({totalItemCount})</span>
          </button>
        </div>

        {/* Steward / Water / Bill Service Dispatch Notice */}
        {serviceNotice && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center space-x-3 shadow-xs animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs sm:text-sm font-semibold">{serviceNotice}</p>
          </div>
        )}

        {/* Quick Floor Service Bar */}
        <div className="heritage-card bg-[#FAF8F3] p-3 sm:p-4 rounded-xl border border-[#D4CBBB] mb-8 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#6B6155] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#B08D57]" /> Table Services:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCallSteward('steward')}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#D4CBBB] hover:border-[#670E10] text-[#241F1A] hover:text-[#670E10] text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#670E10]" />
              <span>Call Steward</span>
            </button>
            <button
              onClick={() => handleCallSteward('water')}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#D4CBBB] hover:border-[#670E10] text-[#241F1A] hover:text-[#670E10] text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <span>💧 Water Refill</span>
            </button>
            <button
              onClick={() => handleCallSteward('bill')}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#D4CBBB] hover:border-[#670E10] text-[#241F1A] hover:text-[#670E10] text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-[#B08D57]" />
              <span>Request Bill</span>
            </button>
          </div>
        </div>

        {/* Dietary Filter Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
          <button
            onClick={() => setDietFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              dietFilter === 'all'
                ? 'bg-[#670E10] text-[#FAF8F3] shadow-xs'
                : 'bg-white text-[#6B6155] border border-[#D4CBBB] hover:border-[#670E10]'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setDietFilter('veg')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1 ${
              dietFilter === 'veg'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Pure Veg</span>
          </button>
          <button
            onClick={() => setDietFilter('jain')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1 ${
              dietFilter === 'jain'
                ? 'bg-amber-800 text-white shadow-xs'
                : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span>Jain Friendly</span>
          </button>
          <button
            onClick={() => setDietFilter('non_veg')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1 ${
              dietFilter === 'non_veg'
                ? 'bg-rose-900 text-white shadow-xs'
                : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <span>Non-Veg</span>
          </button>
        </div>

        {/* Menu Items Categories */}
        <div className="space-y-12">
          {categories
            .map((category) => {
              const filteredItems = (category.items || []).filter((item) => {
                if (dietFilter === 'all') return true;
                const labels = (item.dietary_labels || []).map((l) => l.toLowerCase());
                if (dietFilter === 'veg') {
                  return labels.some((l) => l.includes('veg') && !l.includes('non'));
                }
                if (dietFilter === 'jain') {
                  return labels.some((l) => l.includes('jain'));
                }
                if (dietFilter === 'non_veg') {
                  return labels.some((l) => l.includes('non-veg') || l.includes('non veg'));
                }
                return true;
              });

              return { ...category, filteredItems };
            })
            .filter((cat) => cat.filteredItems.length > 0)
            .map((category) => (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-[#D4CBBB] pb-2">
                  <h2 className="font-heritage text-2xl font-bold text-[#241F1A]">{category.name}</h2>
                  <span className="text-xs text-[#8F7245] font-semibold">{category.filteredItems.length} Specialties</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.filteredItems.map((item) => {
                    const cartQty = cart[item.id]?.quantity || 0;
                    const isVeg = item.dietary_labels?.some((l) => l.toLowerCase().includes('veg') && !l.toLowerCase().includes('non'));
                    const isNonVeg = item.dietary_labels?.some((l) => l.toLowerCase().includes('non'));
                    return (
                      <div
                        key={item.id}
                        className="heritage-card bg-white p-5 rounded-xl border border-[#D4CBBB] flex flex-col justify-between shadow-xs hover:border-[#670E10] transition-colors"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-3 mb-1">
                            <div className="flex items-center space-x-2">
                              <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center p-0.5 shrink-0 ${
                                isNonVeg ? 'border-rose-600' : 'border-emerald-600'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  isNonVeg ? 'bg-rose-600' : 'bg-emerald-600'
                                }`} />
                              </span>
                              <h3 className="font-bold text-[#241F1A] text-sm">{item.name}</h3>
                            </div>
                            <span className="font-heritage font-bold text-[#670E10] whitespace-nowrap">
                              {formatMoney(item.price_minor)}
                            </span>
                          </div>

                          <p className="text-xs text-[#6B6155] mb-3 pl-5 leading-relaxed">{item.description}</p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[#D4CBBB] pl-5">
                          <div className="flex flex-wrap gap-1">
                            {item.dietary_labels.map((label, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-[#FAF8F3] border border-[#D4CBBB] text-[#8F7245] uppercase font-bold">
                                {label}
                              </span>
                            ))}
                          </div>

                          {cartQty === 0 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToCart(item)}
                              className="text-xs px-3 py-1.5"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" /> Add
                            </Button>
                          ) : (
                            <div className="flex items-center space-x-2 bg-[#FAF8F3] px-2 py-1 rounded-xl border border-[#D4CBBB]">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="p-1 text-[#670E10] hover:text-[#8A1518] cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-bold text-[#241F1A] px-1">{cartQty}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="p-1 text-[#670E10] hover:text-[#8A1518] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>

        {/* Floating Sticky Cart Bar (Mobile/Dine-In) */}
        {totalItemCount > 0 && !isCartOpen && (
          <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom-4">
            <div className="heritage-card bg-[#241F1A] text-[#FAF8F3] p-4 rounded-2xl border-2 border-[#B08D57] shadow-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-[#D4CBBB] block">{totalItemCount} Items selected</span>
                <span className="text-xl font-heritage font-bold text-[#C9A96E]">{formatMoney(totalMinor)}</span>
              </div>
              <Button onClick={() => setIsCartOpen(true)} size="md" variant="gold">
                Send to Royal Kitchen &rarr;
              </Button>
            </div>
          </div>
        )}

        {/* Slide-over Cart Modal */}
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md h-full bg-[#FAF8F3] border-l-2 border-[#B08D57] p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#D4CBBB] mb-6">
                  <div>
                    <h3 className="font-heritage text-xl font-bold text-[#241F1A]">Your Table Order</h3>
                    <span className="text-xs text-[#6B6155]">
                      {outlet?.name} &bull; Table {table?.table_number}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-1.5 rounded-lg text-[#241F1A] hover:bg-[#EBE5D6] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {cartItems.length === 0 ? (
                  <p className="text-xs text-[#6B6155] text-center py-10">
                    Your table order is empty. Please select items from the menu.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map(({ item, quantity, notes }) => (
                      <div key={item.id} className="p-3 bg-white rounded-xl border border-[#D4CBBB] space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-sm font-bold text-[#241F1A]">{item.name}</span>
                            <span className="text-xs text-[#8F7245] block font-semibold">
                              {formatMoney(item.price_minor)} each
                            </span>
                          </div>
                          <span className="font-heritage font-bold text-[#670E10] text-sm">
                            {formatMoney(item.price_minor * quantity)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <input
                            type="text"
                            placeholder="Add spice/chef notes..."
                            value={notes}
                            onChange={(e) => updateNotes(item.id, e.target.value)}
                            className="text-xs bg-[#FAF8F3] border border-[#D4CBBB] rounded-lg px-2.5 py-1 text-[#241F1A] w-48 focus:outline-none focus:border-[#670E10]"
                          />

                          <div className="flex items-center space-x-1.5 bg-[#FAF8F3] px-2 py-0.5 rounded-lg border border-[#D4CBBB]">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-[#670E10] text-xs font-bold px-1"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold text-[#241F1A]">{quantity}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="text-[#670E10] text-xs font-bold px-1"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="pt-6 border-t border-[#D4CBBB] space-y-3 mt-6">
                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#6B6155]">
                      <span>Subtotal</span>
                      <span className="font-bold text-[#241F1A]">{formatMoney(subtotalMinor)}</span>
                    </div>
                    <div className="flex justify-between text-[#6B6155]">
                      <span>GST ({taxRateBps / 100}%)</span>
                      <span className="font-bold text-[#241F1A]">{formatMoney(taxMinor)}</span>
                    </div>
                    {serviceChargeMinor > 0 && (
                      <div className="flex justify-between text-[#6B6155]">
                        <span>Service Charge</span>
                        <span className="font-bold text-[#241F1A]">{formatMoney(serviceChargeMinor)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-[#241F1A] pt-2 border-t border-[#D4CBBB]">
                      <span>Total Payable</span>
                      <span className="font-heritage text-xl text-[#670E10]">{formatMoney(totalMinor)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handlePlaceOrder}
                    isLoading={isSubmitting}
                    size="lg"
                    className="w-full shadow-md flex items-center justify-center space-x-2"
                  >
                    <span>Confirm & Send to Royal Kitchen</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QRTableOrderPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-[#670E10] font-bold">Connecting to Royal Dining Table...</div>}>
      <QRTableOrderContent />
    </Suspense>
  );
}
