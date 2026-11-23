'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Percent,
  Truck,
  Package,
  Building2,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  DollarSign,
  UtensilsCrossed,
  ShoppingBag,
  Info,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { BillingSettings } from '@/lib/types';

export default function TaxesAndBillingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [gstin, setGstin] = useState('08AAACH1234F1Z5');
  const [businessName, setBusinessName] = useState('Rajmahal Heritage Grand Palace');
  const [restaurantGst, setRestaurantGst] = useState('5.0');
  const [roomsGst, setRoomsGst] = useState('12.0');
  const [serviceCharge, setServiceCharge] = useState('2.5');
  const [serviceChargeEnabled, setServiceChargeEnabled] = useState(true);
  const [roundOffCash, setRoundOffCash] = useState(true);

  // Delivery Charges
  const [deliveryCharges, setDeliveryCharges] = useState('50');
  const [deliveryFreeAbove, setDeliveryFreeAbove] = useState('500');
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [deliveryEstimateMins, setDeliveryEstimateMins] = useState('40');

  // Packaging Charges
  const [packagingPickup, setPackagingPickup] = useState('25');
  const [packagingDelivery, setPackagingDelivery] = useState('25');
  const [packagingEnabled, setPackagingEnabled] = useState(true);
  const [packagingNote, setPackagingNote] = useState(
    'Food-grade eco-friendly royal insulation packaging'
  );

  // Invoicing
  const [invoicePrefix, setInvoicePrefix] = useState('RAJ-INV-');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('1042');
  const [invoiceFooterNote, setInvoiceFooterNote] = useState(
    'Thank you for dining at Rajmahal Heritage Grand. Padharo Mhare Desh!'
  );

  // Live Simulator state
  const [simMode, setSimMode] = useState<'dine_in' | 'pickup' | 'delivery'>('delivery');
  const [simSubtotal, setSimSubtotal] = useState('450');

  useEffect(() => {
    async function fetchBillingSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/settings/billing');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            const s: BillingSettings = data.settings;
            setGstin(s.gstin || '08AAACH1234F1Z5');
            setBusinessName(s.business_name || 'Rajmahal Heritage Grand Palace');
            setRestaurantGst(String(s.restaurant_gst_percent ?? 5.0));
            setRoomsGst(String(s.rooms_gst_percent ?? 12.0));
            setServiceCharge(String(s.service_charge_percent ?? 2.5));
            setServiceChargeEnabled(s.service_charge_enabled ?? true);
            setRoundOffCash(s.round_off_cash ?? true);

            setDeliveryCharges(String(s.delivery_charges ?? 50));
            setDeliveryFreeAbove(String(s.delivery_free_above ?? 500));
            setDeliveryEnabled(s.delivery_enabled ?? true);
            setDeliveryEstimateMins(String(s.delivery_estimate_mins ?? 40));

            setPackagingPickup(String(s.packaging_charges_pickup ?? 25));
            setPackagingDelivery(String(s.packaging_charges_delivery ?? 25));
            setPackagingEnabled(s.packaging_charges_enabled ?? true);
            setPackagingNote(s.packaging_note || 'Food-grade eco-friendly royal insulation packaging');

            setInvoicePrefix(s.invoice_prefix || 'RAJ-INV-');
            setNextInvoiceNumber(String(s.next_invoice_number ?? 1042));
            setInvoiceFooterNote(
              s.invoice_footer_note ||
                'Thank you for dining at Rajmahal Heritage Grand. Padharo Mhare Desh!'
            );
          }
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBillingSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');

    const payload: BillingSettings = {
      gstin: gstin.trim().toUpperCase(),
      business_name: businessName.trim(),
      restaurant_gst_percent: parseFloat(restaurantGst) || 0,
      rooms_gst_percent: parseFloat(roomsGst) || 0,
      service_charge_percent: parseFloat(serviceCharge) || 0,
      service_charge_enabled: serviceChargeEnabled,
      round_off_cash: roundOffCash,
      delivery_charges: parseFloat(deliveryCharges) || 0,
      delivery_free_above: parseFloat(deliveryFreeAbove) || 0,
      delivery_enabled: deliveryEnabled,
      delivery_estimate_mins: parseInt(deliveryEstimateMins, 10) || 30,
      packaging_charges_pickup: parseFloat(packagingPickup) || 0,
      packaging_charges_delivery: parseFloat(packagingDelivery) || 0,
      packaging_charges_enabled: packagingEnabled,
      packaging_note: packagingNote.trim(),
      invoice_prefix: invoicePrefix.trim(),
      next_invoice_number: parseInt(nextInvoiceNumber, 10) || 1001,
      invoice_footer_note: invoiceFooterNote.trim(),
    };

    try {
      const res = await fetch('/api/settings/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        const errorData = await res.json();
        setErrorMessage(errorData.error || 'Failed to save billing configuration.');
      }
    } catch {
      setErrorMessage('Network error while updating billing configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Live simulation calculations
  const parsedSubtotal = parseFloat(simSubtotal) || 0;
  const gstRate = parseFloat(restaurantGst) || 0;
  const calcGst = (parsedSubtotal * gstRate) / 100;

  const scRate = serviceChargeEnabled && simMode === 'dine_in' ? parseFloat(serviceCharge) || 0 : 0;
  const calcSc = (parsedSubtotal * scRate) / 100;

  let calcPackaging = 0;
  if (packagingEnabled) {
    if (simMode === 'pickup') {
      calcPackaging = parseFloat(packagingPickup) || 0;
    } else if (simMode === 'delivery') {
      calcPackaging = parseFloat(packagingDelivery) || 0;
    }
  }

  let calcDelivery = 0;
  const freeThreshold = parseFloat(deliveryFreeAbove) || 0;
  if (deliveryEnabled && simMode === 'delivery') {
    if (freeThreshold > 0 && parsedSubtotal >= freeThreshold) {
      calcDelivery = 0;
    } else {
      calcDelivery = parseFloat(deliveryCharges) || 0;
    }
  }

  const rawTotal = parsedSubtotal + calcGst + calcSc + calcPackaging + calcDelivery;
  const simTotal = roundOffCash ? Math.round(rawTotal) : rawTotal;

  return (
    <div className="space-y-5 pb-12">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8DCD2]">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold text-[#4F0809]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Taxes, Packaging &amp; Billing Rules
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D8AA67]/20 text-[#8B6528] border border-[#D8AA67]/40 uppercase tracking-wider">
              Palace Finance Hub
            </span>
          </div>
          <p className="text-xs text-[#81736D] mt-0.5">
            Manage statutory GST levies, online delivery surcharges, takeaway packaging fees, and automated invoice numbering
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {saveSuccess && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Settings saved &amp; applied to live bills</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#D8AA67]" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Main Layout: Configuration Forms + Live Bill Simulator ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form Column (7 Cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-4">
          {/* Card 1: Statutory GST & Levies */}
          <div className="bg-white rounded-2xl border border-[#E8DCD2] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#E8DCD2]">
              <div className="w-8 h-8 rounded-xl bg-[#4F0809]/10 text-[#4F0809] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h2
                  className="text-base font-bold text-[#4F0809]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Statutory GST &amp; Government Levies
                </h2>
                <p className="text-[11px] text-[#81736D]">
                  Official Goods and Services Tax credentials according to Indian tax regulations
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  GSTIN Number *
                </label>
                <input
                  type="text"
                  required
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="08AAACH1234F1Z5"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] text-xs font-mono uppercase bg-[#FBF6EF]/30 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Registered Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Rajmahal Heritage Grand Palace"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] text-xs bg-[#FBF6EF]/30 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
              <div className="p-3 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/20">
                <label className="block text-[10px] font-bold text-[#4F0809] uppercase tracking-wider mb-1">
                  Restaurant GST (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="28"
                    value={restaurantGst}
                    onChange={(e) => setRestaurantGst(e.target.value)}
                    className="w-full pl-2 pr-6 py-1.5 rounded-lg border border-[#E8DCD2] text-xs font-bold text-[#4F0809] bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                  <Percent className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#81736D]" />
                </div>
                <span className="text-[10px] text-[#81736D] mt-1 block">CGST 2.5% + SGST 2.5%</span>
              </div>

              <div className="p-3 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/20">
                <label className="block text-[10px] font-bold text-[#4F0809] uppercase tracking-wider mb-1">
                  Rooms GST (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="28"
                    value={roomsGst}
                    onChange={(e) => setRoomsGst(e.target.value)}
                    className="w-full pl-2 pr-6 py-1.5 rounded-lg border border-[#E8DCD2] text-xs font-bold text-[#4F0809] bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                  <Percent className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#81736D]" />
                </div>
                <span className="text-[10px] text-[#81736D] mt-1 block">Rooms above ₹1,000</span>
              </div>

              <div className="p-3 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/20">
                <label className="block text-[10px] font-bold text-[#4F0809] uppercase tracking-wider mb-1">
                  Service Charge (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="15"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(e.target.value)}
                    className="w-full pl-2 pr-6 py-1.5 rounded-lg border border-[#E8DCD2] text-xs font-bold text-[#4F0809] bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                  <Percent className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#81736D]" />
                </div>
                <span className="text-[10px] text-[#81736D] mt-1 block">Dine-in discretionary</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs border-t border-[#E8DCD2]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={serviceChargeEnabled}
                  onChange={(e) => setServiceChargeEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8DCD2] accent-[#4F0809]"
                />
                <div>
                  <span className="font-semibold text-[#302421]">Apply Service Charge to Dine-In</span>
                  <p className="text-[10px] text-[#81736D]">Applies to on-premise dining tables &amp; banquets</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roundOffCash}
                  onChange={(e) => setRoundOffCash(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E8DCD2] accent-[#4F0809]"
                />
                <div>
                  <span className="font-semibold text-[#302421]">Round-off Cash Totals</span>
                  <p className="text-[10px] text-[#81736D]">Rounds bill total to the nearest whole rupee</p>
                </div>
              </label>
            </div>
          </div>

          {/* Card 2: Online Delivery Surcharges & Policies */}
          <div className="bg-white rounded-2xl border border-[#E8DCD2] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E8DCD2]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    className="text-base font-bold text-[#4F0809]"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Online Delivery Charges &amp; Logic
                  </h2>
                  <p className="text-[11px] text-[#81736D]">
                    Automated delivery fees and free threshold applied during online checkout
                  </p>
                </div>
              </div>

              {/* Delivery Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-[#302421]">Delivery Service:</span>
                <div
                  onClick={() => setDeliveryEnabled(!deliveryEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    deliveryEnabled ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      deliveryEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Delivery Charge (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#81736D]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={deliveryCharges}
                    onChange={(e) => setDeliveryCharges(e.target.value)}
                    placeholder="50"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#E8DCD2] text-xs font-bold text-[#302421] bg-[#FBF6EF]/30 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                </div>
                <p className="text-[10px] text-[#81736D] mt-1">Flat charge added to delivery orders</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Free Delivery Above (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#81736D]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={deliveryFreeAbove}
                    onChange={(e) => setDeliveryFreeAbove(e.target.value)}
                    placeholder="500"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#E8DCD2] text-xs font-bold text-[#10B981] bg-[#FBF6EF]/30 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                </div>
                <p className="text-[10px] text-[#81736D] mt-1">Orders above this get free delivery</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Estimated Delivery Time
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    step="5"
                    value={deliveryEstimateMins}
                    onChange={(e) => setDeliveryEstimateMins(e.target.value)}
                    placeholder="40"
                    className="w-full pl-3 pr-12 py-2 rounded-xl border border-[#E8DCD2] text-xs bg-[#FBF6EF]/30 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#81736D]">
                    mins
                  </span>
                </div>
                <p className="text-[10px] text-[#81736D] mt-1">Displayed on customer order tracking</p>
              </div>
            </div>
          </div>

          {/* Card 3: Packaging Charges for Pickup & Delivery */}
          <div className="bg-white rounded-2xl border border-[#E8DCD2] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E8DCD2]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#D97706]/10 text-[#D97706] flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h2
                    className="text-base font-bold text-[#4F0809]"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Takeaway &amp; Delivery Packaging Charges
                  </h2>
                  <p className="text-[11px] text-[#81736D]">
                    Container and eco-friendly packing surcharges added to pickup &amp; delivery folios
                  </p>
                </div>
              </div>

              {/* Packaging Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-[#302421]">Packaging Surcharge:</span>
                <div
                  onClick={() => setPackagingEnabled(!packagingEnabled)}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    packagingEnabled ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      packagingEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="p-3.5 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#4F0809]">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#B78A48]" />
                    <span>Pickup / Takeaway Packaging (₹)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B78A48]/15 text-[#8B6528] font-bold">
                    Pickup Order
                  </span>
                </div>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#81736D]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={packagingPickup}
                    onChange={(e) => setPackagingPickup(e.target.value)}
                    placeholder="25"
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs font-bold text-[#4F0809] bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                </div>
                <p className="text-[10px] text-[#81736D] mt-1.5">
                  Added when customer picks up food from restaurant or front desk
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#4F0809]">
                    <Truck className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Delivery Order Packaging (₹)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2563EB]/15 text-[#2563EB] font-bold">
                    Doorstep Delivery
                  </span>
                </div>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#81736D]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={packagingDelivery}
                    onChange={(e) => setPackagingDelivery(e.target.value)}
                    placeholder="25"
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs font-bold text-[#4F0809] bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                </div>
                <p className="text-[10px] text-[#81736D] mt-1.5">
                  Insulated royal containers for home &amp; room doorstep delivery
                </p>
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                Packaging Material Description / Note
              </label>
              <input
                type="text"
                value={packagingNote}
                onChange={(e) => setPackagingNote(e.target.value)}
                placeholder="Eco-friendly royal food-grade insulated packaging"
                className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] text-xs bg-[#FBF6EF]/30 focus:bg-white focus:outline-none focus:border-[#4F0809]"
              />
              <p className="text-[10px] text-[#81736D] mt-1">
                Printed as explanation for packaging levy on digital &amp; thermal printed receipts
              </p>
            </div>
          </div>

          {/* Card 4: Invoicing & Receipts */}
          <div className="bg-white rounded-2xl border border-[#E8DCD2] p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#E8DCD2]">
              <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2
                  className="text-base font-bold text-[#4F0809]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Digital Invoicing &amp; Guest Folios
                </h2>
                <p className="text-[11px] text-[#81736D]">
                  Custom prefix, auto-increment counter, and royal greeting note on bills
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="RAJ-INV-"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] text-xs font-mono uppercase bg-[#FBF6EF]/30 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Next Sequence Number
                </label>
                <input
                  type="number"
                  value={nextInvoiceNumber}
                  onChange={(e) => setNextInvoiceNumber(e.target.value)}
                  placeholder="1042"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] text-xs font-mono bg-[#FBF6EF]/30 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                Receipt Footer Greeting
              </label>
              <textarea
                rows={2}
                value={invoiceFooterNote}
                onChange={(e) => setInvoiceFooterNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] text-xs bg-[#FBF6EF]/30 focus:bg-white focus:outline-none focus:border-[#4F0809]"
              />
            </div>
          </div>
        </form>

        {/* Simulator Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card: Live Bill Simulation */}
          <div className="bg-[#FAF6F0] rounded-2xl border border-[#E8DCD2] p-5 shadow-xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCD2]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B78A48]" />
                <h3
                  className="text-base font-bold text-[#4F0809]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Live Bill &amp; Receipt Preview
                </h3>
              </div>
              <span className="text-[10px] font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-2 py-0.5 rounded-full">
                Interactive Preview
              </span>
            </div>

            {/* Mode Switcher */}
            <div>
              <label className="block text-[11px] font-bold text-[#4F0809] uppercase tracking-wider mb-1.5">
                Select Order Type to Simulate:
              </label>
              <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-[#E8DCD2]">
                {[
                  { id: 'dine_in', label: 'Dine-In', icon: UtensilsCrossed },
                  { id: 'pickup', label: 'Pickup', icon: ShoppingBag },
                  { id: 'delivery', label: 'Delivery', icon: Truck },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isActive = simMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSimMode(mode.id as any)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isActive
                          ? 'bg-[#4F0809] text-white shadow-2xs'
                          : 'text-[#81736D] hover:bg-[#FBF6EF]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subtotal input */}
            <div>
              <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                Sample Food Items Subtotal (₹):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={simSubtotal}
                  onChange={(e) => setSimSubtotal(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#E8DCD2] text-xs bg-white font-bold text-[#4F0809]"
                />
                <button
                  type="button"
                  onClick={() => setSimSubtotal('750')}
                  className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-[#E8DCD2] bg-white hover:bg-[#FBF6EF] text-[#302421] cursor-pointer shrink-0"
                >
                  ₹750
                </button>
                <button
                  type="button"
                  onClick={() => setSimSubtotal('350')}
                  className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-[#E8DCD2] bg-white hover:bg-[#FBF6EF] text-[#302421] cursor-pointer shrink-0"
                >
                  ₹350
                </button>
              </div>
            </div>

            {/* Bill Receipt Preview Container */}
            <div className="bg-white rounded-xl border border-[#E8DCD2] p-4 text-xs font-mono shadow-xs space-y-3">
              {/* Receipt Header */}
              <div className="text-center pb-2.5 border-b border-dashed border-[#E8DCD2]">
                <div
                  className="font-bold text-sm text-[#4F0809]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {businessName || 'Rajmahal Heritage Grand Palace'}
                </div>
                <div className="text-[10px] text-[#81736D] mt-0.5">
                  GSTIN: <span className="font-bold text-[#302421]">{gstin}</span>
                </div>
                <div className="text-[10px] text-[#81736D]">
                  Folio: <span className="font-bold text-[#302421]">{invoicePrefix}{nextInvoiceNumber}</span> • Mode:{' '}
                  <span className="font-bold uppercase text-[#4F0809]">{simMode.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Sample Items */}
              <div className="space-y-1 text-[11px] pb-2 border-b border-dashed border-[#E8DCD2]">
                <div className="flex justify-between">
                  <span className="text-[#302421]">1x Dal Baati Churma Royal Thali</span>
                  <span className="font-bold">₹{parsedSubtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Calculations breakdown */}
              <div className="space-y-1.5 text-[11px] text-[#81736D]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-bold text-[#302421]">₹{parsedSubtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Restaurant GST ({restaurantGst}%):</span>
                  <span className="font-bold text-[#302421]">₹{calcGst.toFixed(2)}</span>
                </div>

                {simMode === 'dine_in' && serviceChargeEnabled && (
                  <div className="flex justify-between">
                    <span>Palace Service Charge ({serviceCharge}%):</span>
                    <span className="font-bold text-[#302421]">₹{calcSc.toFixed(2)}</span>
                  </div>
                )}

                {/* Packaging Charges */}
                {(simMode === 'pickup' || simMode === 'delivery') && (
                  <div className="flex justify-between items-center text-[#B78A48]">
                    <div className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      <span>Packaging Surcharge:</span>
                    </div>
                    <span className="font-bold">
                      {calcPackaging > 0 ? `₹${calcPackaging.toFixed(2)}` : 'FREE'}
                    </span>
                  </div>
                )}

                {/* Online Delivery Charges */}
                {simMode === 'delivery' && (
                  <div className="flex justify-between items-center text-[#2563EB]">
                    <div className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      <span>Online Delivery Charge:</span>
                    </div>
                    <span className="font-bold">
                      {calcDelivery === 0 ? (
                        <span className="text-[#10B981] font-bold">FREE (Above ₹{freeThreshold})</span>
                      ) : (
                        `₹${calcDelivery.toFixed(2)}`
                      )}
                    </span>
                  </div>
                )}

                {roundOffCash && (
                  <div className="flex justify-between text-[10px] text-[#81736D] italic">
                    <span>Round-off Adjustment:</span>
                    <span>₹{(simTotal - rawTotal).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Total Row */}
              <div className="pt-2 border-t-2 border-[#4F0809] flex justify-between items-center text-sm font-bold text-[#4F0809]">
                <span>TOTAL PAYABLE:</span>
                <span className="text-base text-[#4F0809]">₹{simTotal.toFixed(2)}</span>
              </div>

              {/* Footer Note */}
              <div className="pt-2 text-center text-[9px] text-[#81736D] italic border-t border-dashed border-[#E8DCD2]">
                {invoiceFooterNote}
              </div>
            </div>

            {/* Quick summary notes */}
            <div className="p-3 bg-white rounded-xl border border-[#E8DCD2] text-[11px] text-[#81736D] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#4F0809]">
                <Info className="w-3.5 h-3.5" />
                <span>Active Rules Summary</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                <li>
                  Pickup Orders incur <b className="text-[#302421]">₹{packagingPickup}</b> packaging fee.
                </li>
                <li>
                  Delivery Orders incur <b className="text-[#302421]">₹{deliveryCharges}</b> delivery fee +{' '}
                  <b className="text-[#302421]">₹{packagingDelivery}</b> packaging fee.
                </li>
                {freeThreshold > 0 && (
                  <li>
                    Delivery fee is waived on orders reaching{' '}
                    <b className="text-[#10B981]">₹{freeThreshold}</b>.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
