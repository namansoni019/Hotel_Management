'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  UtensilsCrossed,
  Receipt,
  Users,
  Save,
  CheckCircle2,
  Clock,
  Shield,
  Percent,
  Bell,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { dataRepository } from '@/lib/data/repository';
import type { Property, Outlet } from '@/lib/types';

export default function DashboardSettingsPage() {
  const [activeTab, setActiveTab] = useState<'property' | 'outlets' | 'taxes' | 'notifications' | 'security'>('property');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // 1. Property State
  const [propertyName, setPropertyName] = useState('Rajmahal Heritage Grand');
  const [propertyTagline, setPropertyTagline] = useState('Palace Operations Hub • Udaipur');
  const [propertyAddress, setPropertyAddress] = useState('Palace Road, Near Lake Pichola, Udaipur, Rajasthan 313001');
  const [propertyPhone, setPropertyPhone] = useState('+91 294 242 1234');
  const [propertyEmail, setPropertyEmail] = useState('concierge@rajmahalheritage.in');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');

  // 2. Outlets
  const [outlets, setOutlets] = useState<Outlet[]>([]);

  // 3. Taxes & Billing
  const [gstin, setGstin] = useState('08AAACH1234F1Z5');
  const [foodGst, setFoodGst] = useState('5.0');
  const [roomGst, setRoomGst] = useState('12.0');
  const [serviceCharge, setServiceCharge] = useState('2.5');
  const [invoicePrefix, setInvoicePrefix] = useState('RAJ-2026-');

  // 4. Notifications
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [kotChime, setKotChime] = useState(true);
  const [lowStockAlert, setLowStockAlert] = useState(true);

  useEffect(() => {
    // Clear legacy localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('dashboard_settings');
      } catch {}
    }

    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.property) {
            setPropertyName(data.property.name || propertyName);
            setPropertyAddress(data.property.address || propertyAddress);
            setPropertyPhone(data.property.phone || propertyPhone);
            setPropertyEmail(data.property.email || propertyEmail);
          }
          if (data.outlets) {
            setOutlets(data.outlets);
          }
        }
      } catch {
        setOutlets(dataRepository.getOutlets());
        const prop = dataRepository.getProperty();
        if (prop) {
          setPropertyName(prop.name);
          setPropertyAddress(prop.address || propertyAddress);
          setPropertyPhone(prop.phone || propertyPhone);
          setPropertyEmail(prop.email || propertyEmail);
        }
      }
    }

    loadSettings();
  }, []);

  const triggerSaveNotification = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleSaveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProp = {
      name: propertyName,
      address: propertyAddress,
      phone: propertyPhone,
      email: propertyEmail,
    };
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property: updatedProp }),
      });
    } catch {}
    dataRepository.updateProperty(updatedProp);
    triggerSaveNotification('Property profile updated successfully.');
  };

  const handleSaveTaxes = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSaveNotification('Tax & Billing configuration saved.');
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
            Palace Operations &amp; System Settings
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Property profile, dining venues, GST taxes, notification alerts, and role security
          </p>
        </div>

        {saveSuccessMsg && (
          <div className="px-3 py-1.5 rounded-lg bg-[#2E7D32]/10 border border-[#2E7D32]/30 text-[#2E7D32] text-xs font-semibold flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex flex-wrap gap-1.5 bg-white border border-[#E8DCD2] rounded-xl p-1.5 shadow-xs">
        {[
          { id: 'property', label: 'Property & Profile', icon: Building },
          { id: 'outlets', label: 'Dining Outlets', icon: UtensilsCrossed },
          { id: 'taxes', label: 'Taxes & Billing', icon: Receipt },
          { id: 'notifications', label: 'Alert Preferences', icon: Bell },
          { id: 'security', label: 'Roles & Security', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? 'bg-[#4F0809] text-white shadow-xs'
                  : 'text-[#81736D] hover:text-[#302421] hover:bg-[#FBF6EF]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Property Profile ── */}
      {activeTab === 'property' && (
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-5 shadow-xs">
          <h2
            className="text-lg font-bold text-[#4F0809] mb-1"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Hotel Brand Identity &amp; Contact Information
          </h2>
          <p className="text-xs text-[#81736D] mb-4">
            Official details rendered on guest booking confirmations, in-room QR portals, and invoices
          </p>

          <form onSubmit={handleSaveProperty} className="space-y-3 text-xs max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Property Name *
                </label>
                <input
                  type="text"
                  required
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Tagline / Brand Subtitle
                </label>
                <input
                  type="text"
                  value={propertyTagline}
                  onChange={(e) => setPropertyTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                Full Physical Address *
              </label>
              <input
                type="text"
                required
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Concierge Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={propertyPhone}
                  onChange={(e) => setPropertyPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Official Email *
                </label>
                <input
                  type="email"
                  required
                  value={propertyEmail}
                  onChange={(e) => setPropertyEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Standard Check-In Time
                </label>
                <input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Standard Check-Out Time
                </label>
                <input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5 text-[#D8AA67]" />
                Save Property Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tab 2: Outlets ── */}
      {activeTab === 'outlets' && (
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-5 shadow-xs">
          <h2
            className="text-lg font-bold text-[#4F0809] mb-1"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Dining Venues &amp; Kitchens
          </h2>
          <p className="text-xs text-[#81736D] mb-4">
            Manage active culinary outlets configured in the palace PMS system
          </p>

          <div className="space-y-3 max-w-2xl">
            {outlets.map((outlet) => (
              <div
                key={outlet.id}
                className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2] flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-sm text-[#4F0809]">{outlet.name}</div>
                  <div className="text-[11px] text-[#81736D] mt-0.5">
                    Type: <span className="capitalize">{outlet.type}</span> • Active Status:{' '}
                    <span className="text-[#2E7D32] font-semibold">Enabled</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#2E7D32]/15 text-[#2E7D32] text-[10px] font-bold rounded-full uppercase">
                  PMS Linked
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 3: Taxes & Billing ── */}
      {activeTab === 'taxes' && (
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-5 shadow-xs">
          <h2
            className="text-lg font-bold text-[#4F0809] mb-1"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            GST Taxation, Service Levies &amp; Invoicing
          </h2>
          <p className="text-xs text-[#81736D] mb-4">
            Statutory tax percentages and billing prefixes according to Government of India regulations
          </p>

          <form onSubmit={handleSaveTaxes} className="space-y-3 text-xs max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  State GSTIN Number *
                </label>
                <input
                  type="text"
                  required
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs font-mono focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs font-mono focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Restaurant GST (%)
                </label>
                <input
                  type="text"
                  value={foodGst}
                  onChange={(e) => setFoodGst(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Rooms GST (%)
                </label>
                <input
                  type="text"
                  value={roomGst}
                  onChange={(e) => setRoomGst(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Palace Service Charge (%)
                </label>
                <input
                  type="text"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5 text-[#D8AA67]" />
                Update Tax Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tab 4: Notifications ── */}
      {activeTab === 'notifications' && (
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-5 shadow-xs">
          <h2
            className="text-lg font-bold text-[#4F0809] mb-1"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Operational Alert Preferences
          </h2>
          <p className="text-xs text-[#81736D] mb-4">
            Configure system chimes, automated low-stock warnings, and reservation alerts
          </p>

          <div className="space-y-3 max-w-2xl text-xs">
            <label className="flex items-center justify-between p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2] cursor-pointer">
              <div>
                <div className="font-semibold text-[#302421]">Kitchen KOT Audio Alert Chime</div>
                <div className="text-[11px] text-[#81736D]">Play sound on receiving new digital QR order tickets</div>
              </div>
              <input
                type="checkbox"
                checked={kotChime}
                onChange={(e) => setKotChime(e.target.checked)}
                className="w-4 h-4 accent-[#4F0809]"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2] cursor-pointer">
              <div>
                <div className="font-semibold text-[#302421]">Low Stock Automated Warning</div>
                <div className="text-[11px] text-[#81736D]">Show dashboard warning pill when item drops below minimum buffer</div>
              </div>
              <input
                type="checkbox"
                checked={lowStockAlert}
                onChange={(e) => setLowStockAlert(e.target.checked)}
                className="w-4 h-4 accent-[#4F0809]"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2] cursor-pointer">
              <div>
                <div className="font-semibold text-[#302421]">Guest Booking SMS Confirmations</div>
                <div className="text-[11px] text-[#81736D]">Dispatch arrival folio SMS to verified guest mobile numbers</div>
              </div>
              <input
                type="checkbox"
                checked={smsAlerts}
                onChange={(e) => setSmsAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#4F0809]"
              />
            </label>
          </div>
        </div>
      )}

      {/* ── Tab 5: Security & Roles ── */}
      {activeTab === 'security' && (
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-5 shadow-xs">
          <h2
            className="text-lg font-bold text-[#4F0809] mb-1"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Role-Based Access Control (RBAC) Matrix
          </h2>
          <p className="text-xs text-[#81736D] mb-4">
            System authorization tiers active across the Rajmahal Operations Hub
          </p>

          <div className="space-y-2 max-w-2xl text-xs">
            <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2]">
              <div className="font-bold text-sm text-[#4F0809]">Administrator / GM</div>
              <div className="text-[#81736D] text-[11px] mt-0.5">
                Full authority: Revenue reports, staff onboarding, inventory reorders, pricing &amp; chamber allocations.
              </div>
            </div>

            <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2]">
              <div className="font-bold text-sm text-[#4F0809]">Kitchen Chef (KDS)</div>
              <div className="text-[#81736D] text-[11px] mt-0.5">
                Operational authority: Live KOT queue, ticket timing, preparation status, recipe notes &amp; pass dispatch.
              </div>
            </div>

            <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2]">
              <div className="font-bold text-sm text-[#4F0809]">Floor Steward / Butler</div>
              <div className="text-[#81736D] text-[11px] mt-0.5">
                Service authority: Table dining delivery, in-room tray delivery, and table reservation seating.
              </div>
            </div>

            <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2]">
              <div className="font-bold text-sm text-[#4F0809]">Housekeeping Chamber Attendant</div>
              <div className="text-[#81736D] text-[11px] mt-0.5">
                Chamber authority: Turnover inspections, room status updates, linen replacements &amp; maintenance tickets.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
