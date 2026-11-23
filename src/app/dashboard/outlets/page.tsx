'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  UtensilsCrossed,
  Coffee,
  Clock,
  Calendar,
  Armchair,
  ChefHat,
  BarChart3,
  Tag,
  Power,
  Settings,
  ChevronDown,
  Eye,
  Plus,
  TrendingUp,
  Store,
  ConciergeBell,
  Truck,
  ShoppingBag,
  ExternalLink,
  Edit2,
  Check,
  AlertCircle,
  X,
  RefreshCw,
  Info,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { Outlet, Table, Order } from '@/lib/types';

interface AuditEvent {
  id: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export default function PalaceOutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingChannelKey, setSavingChannelKey] = useState<string | null>(null);

  // Active tab in Operating Hours widget
  const [activeHoursTab, setActiveHoursTab] = useState<string>('');

  // Dropdown state for single status button with dropper
  const [openStatusDropdownOutletId, setOpenStatusDropdownOutletId] = useState<string | null>(null);
  // Dropdown state for day open/closed dropper buttons
  const [openDayDropdown, setOpenDayDropdown] = useState<string | null>(null);

  // Modals
  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false);
  const [isEditOutletOpen, setIsEditOutletOpen] = useState(false);
  const [isEditHoursOpen, setIsEditHoursOpen] = useState(false);
  const [isPreviewMenuOpen, setIsPreviewMenuOpen] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  // Action status/notification message
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states: Add Outlet
  const [newOutletName, setNewOutletName] = useState('');
  const [newOutletType, setNewOutletType] = useState<'restaurant' | 'cafe'>('restaurant');
  const [newOutletOpenTime, setNewOutletOpenTime] = useState('11:00');
  const [newOutletCloseTime, setNewOutletCloseTime] = useState('23:30');
  const [newOutletDineIn, setNewOutletDineIn] = useState(true);
  const [newOutletRoomService, setNewOutletRoomService] = useState(true);
  const [newOutletDelivery, setNewOutletDelivery] = useState(true);
  const [newOutletPickup, setNewOutletPickup] = useState(true);

  // Form states: Edit Hours
  const [editHoursOpenTime, setEditHoursOpenTime] = useState('11:00');
  const [editHoursCloseTime, setEditHoursCloseTime] = useState('23:30');

  // Form states: Edit Outlet Details
  const [editOutletName, setEditOutletName] = useState('');
  const [editOutletTaxRate, setEditOutletTaxRate] = useState(500);
  const [editOutletServiceCharge, setEditOutletServiceCharge] = useState(250);

  // Load real data from APIs and Repository
  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/outlets');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.outlets) {
          setOutlets(data.outlets);
          if (!activeHoursTab && data.outlets.length > 0) {
            setActiveHoursTab(data.outlets[0].id);
          }
        }
      } else {
        // Fallback to direct synchronous repository
        const outs = dataRepository.getOutlets();
        setOutlets(outs);
        if (!activeHoursTab && outs.length > 0) {
          setActiveHoursTab(outs[0].id);
        }
      }

      setTables(dataRepository.getTables());
      setOrders(dataRepository.getOrders());

      // Fetch genuine audit events
      try {
        const auditRes = await fetch('/api/audit');
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          if (auditData.events) {
            setAuditEvents(auditData.events);
          }
        }
      } catch (err) {
        console.error('Failed to load audit events:', err);
      }
    } catch (err) {
      console.error('Error loading outlets:', err);
      const outs = dataRepository.getOutlets();
      setOutlets(outs);
      if (!activeHoursTab && outs.length > 0) {
        setActiveHoursTab(outs[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Clear legacy localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('dashboard_outlets');
      } catch {}
    }

    loadData();

    const unsubOutlets = onSnapshot(
      collection(db, 'outlets'),
      (snap) => {
        if (!snap.empty) {
          const outs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Outlet[];
          setOutlets(outs);
          if (!activeHoursTab && outs.length > 0) {
            setActiveHoursTab(outs[0].id);
          }
        }
      },
      () => {}
    );

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.outlet-status-dropdown-container')) {
        setOpenStatusDropdownOutletId(null);
      }
      if (!target.closest('.day-status-dropdown-container')) {
        setOpenDayDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      unsubOutlets();
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Show auto-dismiss notification
  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Set outlet open or closed directly from single dropdown button
  const handleSetOutletStatus = async (outlet: Outlet, targetIsOpen: boolean) => {
    setOpenStatusDropdownOutletId(null);
    const isCurrentlyOpen = outlet.is_active ?? !outlet.is_paused;
    if (isCurrentlyOpen === targetIsOpen) return;

    if (!targetIsOpen) {
      const outletOrders = orders.filter((o) => o.outlet_id === outlet.id);
      const activeOrders = outletOrders.filter((o) =>
        ['new', 'accepted', 'preparing', 'ready'].includes(o.status)
      );

      if (activeOrders.length > 0) {
        const proceed = confirm(
          `Notice: ${outlet.name} currently has ${activeOrders.length} active orders in progress. Closing this outlet will stop accepting new orders, but existing active orders will remain preserved for completion. Do you wish to proceed?`
        );
        if (!proceed) return;
      }
    }

    try {
      const res = await fetch('/api/outlets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: outlet.id,
          patch: {
            is_paused: !targetIsOpen,
            is_active: targetIsOpen,
          },
        }),
      });

      if (res.ok) {
        showToast(
          'success',
          `${outlet.name} is now ${targetIsOpen ? 'OPEN (All services active)' : 'CLOSED'}.`
        );
        loadData();
      } else {
        showToast('error', 'Failed to update outlet status on server.');
      }
    } catch (err) {
      showToast('error', 'Network error updating outlet status.');
    }
  };

  // Set day open or closed directly from day dropper dropdown
  const handleSetDayStatus = async (outletId: string, day: string, newStatus: boolean) => {
    setOpenDayDropdown(null);
    const targetOutlet = outlets.find((o) => o.id === outletId);
    if (!targetOutlet) return;

    const currentDays = targetOutlet.operating_days || {
      Monday: true,
      Tuesday: true,
      Wednesday: true,
      Thursday: true,
      Friday: true,
      Saturday: true,
      Sunday: true,
    };

    if (currentDays[day] === newStatus) return;

    const updatedDays = {
      ...currentDays,
      [day]: newStatus,
    };

    try {
      const res = await fetch('/api/outlets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: outletId,
          patch: {
            operating_days: updatedDays,
          },
        }),
      });

      if (res.ok) {
        showToast(
          'success',
          `${targetOutlet.name} is now ${newStatus ? 'OPEN' : 'CLOSED'} on ${day}.`
        );
        loadData();
      } else {
        showToast('error', `Failed to update ${day} status on server.`);
      }
    } catch (err) {
      showToast('error', `Network error saving ${day} schedule.`);
    }
  };

  // Toggle service channel (Dine-in, Room Service, Online Delivery, Pickup)
  const handleToggleChannel = async (outletId: string, channelKey: string, currentValue: boolean) => {
    const key = `${outletId}-${channelKey}`;
    setSavingChannelKey(key);
    try {
      const res = await fetch('/api/outlets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: outletId,
          patch: {
            [channelKey]: !currentValue,
          },
        }),
      });

      if (res.ok) {
        showToast('success', 'Channel availability updated successfully.');
        loadData();
      } else {
        showToast('error', 'Could not persist channel configuration to database.');
      }
    } catch (err) {
      showToast('error', 'Network error saving channel setting.');
    } finally {
      setSavingChannelKey(null);
    }
  };

  // Save new outlet from Add Outlet Modal
  const handleAddOutletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutletName.trim()) {
      showToast('error', 'Please enter a valid outlet name.');
      return;
    }

    try {
      const res = await fetch('/api/outlets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOutletName.trim(),
          type: newOutletType,
          operating_hours: {
            all: { open: newOutletOpenTime, close: newOutletCloseTime },
          },
          dine_in_enabled: newOutletDineIn,
          room_service_enabled: newOutletRoomService,
          delivery_enabled: newOutletDelivery,
          pickup_enabled: newOutletPickup,
        }),
      });

      if (res.ok) {
        showToast('success', `Outlet "${newOutletName}" successfully added.`);
        setIsAddOutletOpen(false);
        setNewOutletName('');
        loadData();
      } else {
        const data = await res.json();
        showToast('error', data.error || 'Failed to save new outlet.');
      }
    } catch (err) {
      showToast('error', 'Server error creating outlet.');
    }
  };

  // Open Edit Hours Modal
  const openEditHours = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    const hours = outlet.operating_hours || {};
    const open = hours.all?.open || '11:00';
    const close = hours.all?.close || '23:30';
    setEditHoursOpenTime(open);
    setEditHoursCloseTime(close);
    setIsEditHoursOpen(true);
  };

  // Save edited hours
  const handleSaveHoursSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutlet) return;

    try {
      const res = await fetch('/api/outlets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOutlet.id,
          patch: {
            operating_hours: {
              all: { open: editHoursOpenTime, close: editHoursCloseTime },
            },
          },
        }),
      });

      if (res.ok) {
        showToast('success', `Operating hours for ${selectedOutlet.name} updated.`);
        setIsEditHoursOpen(false);
        loadData();
      } else {
        showToast('error', 'Failed to update operating hours.');
      }
    } catch (err) {
      showToast('error', 'Network error updating hours.');
    }
  };

  // Open Manage Outlet Modal
  const openManageOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setEditOutletName(outlet.name);
    setEditOutletTaxRate(outlet.tax_rate_bps || 500);
    setEditOutletServiceCharge(outlet.service_charge_bps || 0);
    setIsEditOutletOpen(true);
  };

  // Save Manage Outlet details
  const handleSaveOutletDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOutlet) return;

    try {
      const res = await fetch('/api/outlets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOutlet.id,
          patch: {
            name: editOutletName.trim(),
            tax_rate_bps: Number(editOutletTaxRate),
            service_charge_bps: Number(editOutletServiceCharge),
          },
        }),
      });

      if (res.ok) {
        showToast('success', `Outlet details updated.`);
        setIsEditOutletOpen(false);
        loadData();
      } else {
        showToast('error', 'Failed to update outlet details.');
      }
    } catch (err) {
      showToast('error', 'Network error saving outlet details.');
    }
  };

  // Active Outlet for Operating Hours panel
  const currentHoursOutlet = useMemo(() => {
    return outlets.find((o) => o.id === activeHoursTab) || outlets[0];
  }, [outlets, activeHoursTab]);

  return (
    <div className="space-y-5 pb-10 text-[#351E1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Toast Notification ── */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold shadow-lg transition-all border ${
            notification.type === 'success'
              ? 'bg-[#EAF5EE] text-[#21834A] border-[#21834A]/30'
              : 'bg-[#FDF2F2] text-[#C53C3C] border-[#C53C3C]/30'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-4 h-4 text-[#21834A]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#C53C3C]" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ── Header: Title, Description & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h1
            className="text-[28px] font-bold text-[#4F0809] tracking-tight"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Palace Outlets
          </h1>
          <p className="text-xs text-[#82736A] mt-0.5 font-normal">
            Manage restaurant and café operations, service channels, outlet availability, and daily performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Preview Guest Menu Action */}
          <button
            onClick={() => setIsPreviewMenuOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#BD9655] bg-white text-[#4F0809] hover:bg-[#F6EEE5] text-xs font-semibold shadow-xs transition"
          >
            <Eye className="w-4 h-4 text-[#BD9655]" />
            <span>Preview Guest Menu</span>
          </button>

          {/* Add Outlet Action */}
          <button
            onClick={() => setIsAddOutletOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F0809] hover:bg-[#350506] text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4 text-[#BD9655]" />
            <span>+ Add Outlet</span>
          </button>
        </div>
      </div>

      {/* ── Outlet Cards (2 Columns) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {outlets.map((outlet) => {
          const isRestaurant = outlet.type === 'restaurant';
          const isOutletOpen = outlet.is_active ?? !outlet.is_paused;
          const outletTables = tables.filter((t) => t.outlet_id === outlet.id);
          const outletOrders = orders.filter((o) => o.outlet_id === outlet.id);

          // Real metric calculations
          const activeKOTOrders = outletOrders.filter((o) =>
            ['new', 'accepted', 'preparing', 'ready'].includes(o.status)
          );
          const preparingKOTCount = outletOrders.filter((o) => o.status === 'preparing').length;

          // Occupied tables count from real active orders / seated tables
          const occupiedTableIds = new Set(
            outletOrders
              .filter((o) => o.table_id && ['new', 'accepted', 'preparing', 'ready', 'served'].includes(o.status))
              .map((o) => o.table_id)
          );
          const occupiedTablesCount = Math.min(occupiedTableIds.size, outletTables.length);

          // Today's Sales: sum of today's non-cancelled orders
          const todayStr = new Date().toISOString().slice(0, 10);
          const todayOrders = outletOrders.filter(
            (o) => o.status !== 'cancelled' && (o.created_at || '').startsWith(todayStr)
          );
          const todaySalesMinor = todayOrders.reduce(
            (sum, o) => sum + (o.total_minor || o.total_amount_minor || 0),
            0
          );
          const aovMinor = todayOrders.length > 0 ? Math.round(todaySalesMinor / todayOrders.length) : 0;

          // Timings display
          let timingsDisplay = '11:00 AM – 11:30 PM (Daily)';
          if (outlet.operating_hours?.all) {
            timingsDisplay = `${outlet.operating_hours.all.open} – ${outlet.operating_hours.all.close} (Daily)`;
          } else if (!isRestaurant) {
            timingsDisplay = '07:30 AM – 11:00 PM (Daily)';
          }

          const photoSrc =
            outlet.image_url ||
            (isRestaurant ? '/images/dining/rajasthani-restaurant.png' : '/images/dining/cafe-lounge.png');

          return (
            <div
              key={outlet.id}
              className="bg-white border border-[#E9DCCE] rounded-xl p-4 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
            >
              <div>
                {/* ── Card Header: Thumbnail, Identity & Status ── */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail with View Photos Badge */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-20 rounded-lg overflow-hidden shrink-0 border border-[#E9DCCE] bg-[#F6EEE5]">
                      <Image
                        src={photoSrc}
                        alt={outlet.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 96px, 96px"
                      />
                      <div className="absolute inset-x-0 bottom-0 py-0.5 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-1 text-[9px] text-white font-medium cursor-pointer">
                        <span>View Photos</span>
                        <ChevronDown className="w-2.5 h-2.5" />
                      </div>
                    </div>

                    {/* Identity: Title, Category, Timings */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        {isRestaurant ? (
                          <UtensilsCrossed className="w-4 h-4 text-[#4F0809]" />
                        ) : (
                          <Coffee className="w-4 h-4 text-[#4F0809]" />
                        )}
                        <h2
                          className="text-base sm:text-lg font-bold text-[#4F0809] leading-snug"
                          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        >
                          {outlet.name}
                        </h2>
                      </div>

                      <div className="text-[11px] text-[#82736A] mt-0.5 flex items-center gap-1.5">
                        <span className="font-semibold text-[#21834A]">
                          {isRestaurant ? 'Restaurant' : 'Café & Lounge'}
                        </span>
                        <span>•</span>
                        <span>{isRestaurant ? 'Fine Dining' : 'Casual Dining'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#82736A] mt-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#BD9655]" />
                        <span>{timingsDisplay}</span>
                      </div>
                    </div>
                  </div>

                  {/* Single Button with Dropper for Status (OPEN / CLOSED) */}
                  <div className="relative outlet-status-dropdown-container shrink-0">
                    <button
                      onClick={() =>
                        setOpenStatusDropdownOutletId(
                          openStatusDropdownOutletId === outlet.id ? null : outlet.id
                        )
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider border shadow-2xs transition cursor-pointer select-none ${
                        isOutletOpen
                          ? 'bg-[#EAF5EE] border-[#21834A]/30 text-[#21834A] hover:bg-[#d8eedf]'
                          : 'bg-[#FDF2F2] border-[#C53C3C]/30 text-[#C53C3C] hover:bg-[#fae1e1]'
                      }`}
                      title="Click to change outlet operational status"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOutletOpen ? 'bg-[#21834A]' : 'bg-[#C53C3C]'
                        }`}
                      />
                      <span>{isOutletOpen ? 'OPEN NOW' : 'CLOSED'}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          openStatusDropdownOutletId === outlet.id ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {openStatusDropdownOutletId === outlet.id && (
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#E9DCCE] rounded-xl shadow-xl z-30 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#82736A] bg-[#FBF6EF] border-b border-[#E9DCCE]">
                          Set Outlet Status
                        </div>
                        <button
                          onClick={() => handleSetOutletStatus(outlet, true)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition cursor-pointer hover:bg-[#EAF5EE] ${
                            isOutletOpen ? 'bg-[#EAF5EE]/60 font-bold text-[#21834A]' : 'text-[#351E1A]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#21834A]" />
                            <div>
                              <div className="font-bold text-[#21834A]">Open Now</div>
                              <div className="text-[10px] text-[#82736A] font-normal">
                                Accept all orders &amp; live service
                              </div>
                            </div>
                          </div>
                          {isOutletOpen && <Check className="w-4 h-4 text-[#21834A]" />}
                        </button>

                        <button
                          onClick={() => handleSetOutletStatus(outlet, false)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition cursor-pointer hover:bg-[#FDF2F2] ${
                            !isOutletOpen ? 'bg-[#FDF2F2]/60 font-bold text-[#C53C3C]' : 'text-[#351E1A]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#C53C3C]" />
                            <div>
                              <div className="font-bold text-[#C53C3C]">Closed</div>
                              <div className="text-[10px] text-[#82736A] font-normal">
                                Pause service &amp; stop new orders
                              </div>
                            </div>
                          </div>
                          {!isOutletOpen && <Check className="w-4 h-4 text-[#C53C3C]" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 4 Compact Operational Metric Tiles ── */}
                <div className="grid grid-cols-4 gap-2 mt-3.5">
                  {/* Total Tables */}
                  <div className="bg-[#FBF6EF] border border-[#E9DCCE] rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <Armchair className="w-4 h-4 text-[#82736A]" />
                    </div>
                    <div className="mt-1">
                      <div className="text-base font-bold text-[#351E1A] leading-tight">
                        {outletTables.length}
                      </div>
                      <div className="text-[10px] text-[#82736A] font-medium">Tables</div>
                      <div className="text-[9px] text-[#82736A] mt-0.5">
                        {occupiedTablesCount} Occupied
                      </div>
                    </div>
                  </div>

                  {/* Active KOT */}
                  <div className="bg-[#FBF6EF] border border-[#E9DCCE] rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <ChefHat className="w-4 h-4 text-[#82736A]" />
                    </div>
                    <div className="mt-1">
                      <div className="text-base font-bold text-[#351E1A] leading-tight">
                        {activeKOTOrders.length}
                      </div>
                      <div className="text-[10px] text-[#82736A] font-medium">Active KOT</div>
                      <div className="text-[9px] text-[#82736A] mt-0.5">
                        {preparingKOTCount} Preparing
                      </div>
                    </div>
                  </div>

                  {/* Today's Sales */}
                  <div className="bg-[#FBF6EF] border border-[#E9DCCE] rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <BarChart3 className="w-4 h-4 text-[#82736A]" />
                    </div>
                    <div className="mt-1">
                      <div className="text-base font-bold text-[#351E1A] leading-tight">
                        ₹{(todaySalesMinor / 100).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-[#82736A] font-medium">Today's Sales</div>
                      <div className="text-[9px] text-[#21834A] font-semibold flex items-center gap-0.5 mt-0.5">
                        {todayOrders.length > 0 ? (
                          <>
                            <TrendingUp className="w-2.5 h-2.5" />
                            <span>{todayOrders.length} orders</span>
                          </>
                        ) : (
                          <span className="text-[#82736A]">No orders today</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Avg. Order Value */}
                  <div className="bg-[#FBF6EF] border border-[#E9DCCE] rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <Tag className="w-4 h-4 text-[#82736A]" />
                    </div>
                    <div className="mt-1">
                      <div className="text-base font-bold text-[#351E1A] leading-tight">
                        ₹{(aovMinor / 100).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-[#82736A] font-medium">Avg. Order Value</div>
                      <div className="text-[9px] text-[#82736A] mt-0.5">
                        {todayOrders.length > 0 ? `Based on ${todayOrders.length} orders` : 'Calculated live'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Service Channels Summary Pills ── */}
                <div className="mt-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#82736A] mb-1.5">
                    Service Channels
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Dine-in */}
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${
                        outlet.dine_in_enabled
                          ? 'bg-[#EAF5EE] border-[#21834A]/20 text-[#21834A]'
                          : 'bg-[#F6EEE5] border-[#E9DCCE] text-[#82736A]'
                      }`}
                    >
                      <Store className="w-3.5 h-3.5 shrink-0" />
                      <div className="truncate">
                        <span>Dine-in </span>
                        <span className="font-normal">
                          {outlet.dine_in_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    {/* Room Service */}
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${
                        outlet.room_service_enabled
                          ? 'bg-[#EAF5EE] border-[#21834A]/20 text-[#21834A]'
                          : 'bg-[#F6EEE5] border-[#E9DCCE] text-[#82736A]'
                      }`}
                    >
                      <ConciergeBell className="w-3.5 h-3.5 shrink-0" />
                      <div className="truncate">
                        <span>Room Service </span>
                        <span className="font-normal">
                          {outlet.room_service_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    {/* Online Delivery */}
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${
                        outlet.delivery_enabled
                          ? 'bg-[#EAF5EE] border-[#21834A]/20 text-[#21834A]'
                          : 'bg-[#F6EEE5] border-[#E9DCCE] text-[#82736A]'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5 shrink-0" />
                      <div className="truncate">
                        <span>Online Delivery </span>
                        <span className="font-normal">
                          {outlet.delivery_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    {/* Pickup */}
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${
                        outlet.pickup_enabled
                          ? 'bg-[#EAF5EE] border-[#21834A]/20 text-[#21834A]'
                          : 'bg-[#F6EEE5] border-[#E9DCCE] text-[#82736A]'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                      <div className="truncate">
                        <span>Pickup </span>
                        <span className="font-normal">
                          {outlet.pickup_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Outlet Action Buttons ── */}
              <div className="pt-3.5 mt-3.5 border-t border-[#E9DCCE] flex items-center justify-between gap-2">
                <button
                  onClick={() => openManageOutlet(outlet)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#350506] text-white text-xs font-semibold shadow-xs transition"
                >
                  <Settings className="w-3.5 h-3.5 text-[#BD9655]" />
                  <span>Manage Outlet</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/dashboard/tables?outlet=${outlet.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E9DCCE] bg-white hover:bg-[#F6EEE5] text-[#4F0809] text-xs font-semibold transition"
                  >
                    <Armchair className="w-3.5 h-3.5 text-[#BD9655]" />
                    <span>View Tables</span>
                  </Link>

                  <Link
                    href={`/dashboard/orders?outlet=${outlet.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E9DCCE] bg-white hover:bg-[#F6EEE5] text-[#4F0809] text-xs font-semibold transition"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#BD9655]" />
                    <span>View Orders</span>
                  </Link>

                  <button
                    onClick={() => openEditHours(outlet)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E9DCCE] bg-white hover:bg-[#F6EEE5] text-[#82736A] hover:text-[#4F0809] text-xs font-semibold transition"
                    title="More actions"
                  >
                    <span>••• More</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Middle Row: Service Channels Configuration & Operating Hours ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ── Left Column (2/3): Service Channels Configuration ── */}
        <div className="lg:col-span-2 bg-white border border-[#E9DCCE] rounded-xl p-4 shadow-xs">
          <div className="flex items-start gap-2.5 mb-3.5">
            <div className="p-1.5 rounded-lg bg-[#F6EEE5] text-[#4F0809]">
              <Settings className="w-4 h-4 text-[#BD9655]" />
            </div>
            <div>
              <h3
                className="text-base font-bold text-[#4F0809]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Service Channels Configuration
              </h3>
              <p className="text-xs text-[#82736A]">
                Control which ordering methods are available at each outlet.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E9DCCE] text-[11px] font-bold text-[#82736A] bg-[#FBF6EF]">
                  <th className="py-2.5 px-3">Service Channel</th>
                  <th className="py-2.5 px-3">Description</th>
                  {outlets.map((o) => (
                    <th key={o.id} className="py-2.5 px-3 text-center">
                      {o.name}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Configuration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9DCCE]">
                {/* 1. Dine-in / Table QR */}
                <tr className="hover:bg-[#FBF6EF]/50 transition">
                  <td className="py-3 px-3 font-semibold text-[#351E1A] flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-[#4F0809]" />
                    <span>Dine-in / Table QR</span>
                  </td>
                  <td className="py-3 px-3 text-[#82736A] text-[11px]">
                    Guests scan table QR and place orders
                  </td>
                  {outlets.map((o) => {
                    const isSaving = savingChannelKey === `${o.id}-dine_in_enabled`;
                    return (
                      <td key={o.id} className="py-3 px-3 text-center">
                        <button
                          disabled={isSaving}
                          onClick={() => handleToggleChannel(o.id, 'dine_in_enabled', o.dine_in_enabled)}
                          className="inline-flex items-center gap-1.5 cursor-pointer focus:outline-none"
                        >
                          <div
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                              o.dine_in_enabled ? 'bg-[#21834A]' : 'bg-[#E9DCCE]'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition ${
                                o.dine_in_enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-semibold ${
                              o.dine_in_enabled ? 'text-[#21834A]' : 'text-[#82736A]'
                            }`}
                          >
                            {o.dine_in_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-right">
                    <Link
                      href="/dashboard/tables"
                      className="inline-block px-3 py-1 rounded-md border border-[#E9DCCE] bg-white hover:bg-[#F6EEE5] text-[#4F0809] text-[11px] font-semibold transition"
                    >
                      Manage QR Codes
                    </Link>
                  </td>
                </tr>

                {/* 2. Room Service / Room QR */}
                <tr className="hover:bg-[#FBF6EF]/50 transition">
                  <td className="py-3 px-3 font-semibold text-[#351E1A] flex items-center gap-2">
                    <ConciergeBell className="w-4 h-4 text-[#4F0809]" />
                    <span>Room Service / Room QR</span>
                  </td>
                  <td className="py-3 px-3 text-[#82736A] text-[11px]">
                    Guests order directly from their hotel room
                  </td>
                  {outlets.map((o) => {
                    const isSaving = savingChannelKey === `${o.id}-room_service_enabled`;
                    const enabled = o.room_service_enabled ?? false;
                    return (
                      <td key={o.id} className="py-3 px-3 text-center">
                        <button
                          disabled={isSaving}
                          onClick={() => handleToggleChannel(o.id, 'room_service_enabled', enabled)}
                          className="inline-flex items-center gap-1.5 cursor-pointer focus:outline-none"
                        >
                          <div
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                              enabled ? 'bg-[#21834A]' : 'bg-[#E9DCCE]'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition ${
                                enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-semibold ${
                              enabled ? 'text-[#21834A]' : 'text-[#82736A]'
                            }`}
                          >
                            {enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() =>
                        showToast(
                          'success',
                          'In-suite Room QR tokens are connected directly to steward delivery workflow.'
                        )
                      }
                      className="px-3 py-1 rounded-md border border-[#E9DCCE] bg-white hover:bg-[#F6EEE5] text-[#4F0809] text-[11px] font-semibold transition"
                    >
                      Manage Room QR
                    </button>
                  </td>
                </tr>

                {/* 3. Online Delivery */}
                <tr className="hover:bg-[#FBF6EF]/50 transition">
                  <td className="py-3 px-3 font-semibold text-[#351E1A] flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#4F0809]" />
                    <span>Online Delivery</span>
                  </td>
                  <td className="py-3 px-3 text-[#82736A] text-[11px]">
                    Swiggy, Zomato and other platforms
                  </td>
                  {outlets.map((o) => {
                    const isSaving = savingChannelKey === `${o.id}-delivery_enabled`;
                    return (
                      <td key={o.id} className="py-3 px-3 text-center">
                        <button
                          disabled={isSaving}
                          onClick={() => handleToggleChannel(o.id, 'delivery_enabled', o.delivery_enabled)}
                          className="inline-flex items-center gap-1.5 cursor-pointer focus:outline-none"
                        >
                          <div
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                              o.delivery_enabled ? 'bg-[#21834A]' : 'bg-[#E9DCCE]'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition ${
                                o.delivery_enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-semibold ${
                              o.delivery_enabled ? 'text-[#21834A]' : 'text-[#82736A]'
                            }`}
                          >
                            {o.delivery_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() =>
                        showToast(
                          'success',
                          'Aggregator integration active: In-house fleet priority. External webhook sync operational.'
                        )
                      }
                      className="px-3 py-1 rounded-md border border-[#E9DCCE] bg-white hover:bg-[#F6EEE5] text-[#4F0809] text-[11px] font-semibold transition"
                    >
                      Configure Delivery
                    </button>
                  </td>
                </tr>

                {/* 4. Takeaway / Pickup */}
                <tr className="hover:bg-[#FBF6EF]/50 transition">
                  <td className="py-3 px-3 font-semibold text-[#351E1A] flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#4F0809]" />
                    <span>Takeaway / Pickup</span>
                  </td>
                  <td className="py-3 px-3 text-[#82736A] text-[11px]">
                    Counter pickup and takeaway orders
                  </td>
                  {outlets.map((o) => {
                    const isSaving = savingChannelKey === `${o.id}-pickup_enabled`;
                    return (
                      <td key={o.id} className="py-3 px-3 text-center">
                        <button
                          disabled={isSaving}
                          onClick={() => handleToggleChannel(o.id, 'pickup_enabled', o.pickup_enabled)}
                          className="inline-flex items-center gap-1.5 cursor-pointer focus:outline-none"
                        >
                          <div
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                              o.pickup_enabled ? 'bg-[#21834A]' : 'bg-[#E9DCCE]'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition ${
                                o.pickup_enabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </div>
                          <span
                            className={`text-[11px] font-semibold ${
                              o.pickup_enabled ? 'text-[#21834A]' : 'text-[#82736A]'
                            }`}
                          >
                            {o.pickup_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() =>
                        showToast(
                          'success',
                          'Pickup counter configured: Average lead time is 15-20 mins.'
                        )
                      }
                      className="px-3 py-1 rounded-md border border-[#E9DCCE] bg-white hover:bg-[#F6EEE5] text-[#4F0809] text-[11px] font-semibold transition"
                    >
                      Configure Pickup
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right Column (1/3): Operating Days Panel ── */}
        <div className="bg-white border border-[#E9DCCE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#E9DCCE]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4F0809]" />
              <h3
                className="text-base font-bold text-[#4F0809]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Operating Days
              </h3>
            </div>

            {currentHoursOutlet && (
              <button
                onClick={() => openEditHours(currentHoursOutlet)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E9DCCE] bg-white hover:bg-[#F6EEE5] text-[#4F0809] text-xs font-semibold transition"
              >
                <Edit2 className="w-3 h-3 text-[#BD9655]" />
                <span>Edit Hours</span>
              </button>
            )}
          </div>

          {/* Outlet Tabs */}
          <div className="flex items-center gap-4 border-b border-[#E9DCCE] pt-2 text-xs">
            {outlets.map((o) => (
              <button
                key={o.id}
                onClick={() => setActiveHoursTab(o.id)}
                className={`pb-2 font-semibold transition relative ${
                  activeHoursTab === o.id
                    ? 'text-[#4F0809] border-b-2 border-[#4F0809]'
                    : 'text-[#82736A] hover:text-[#4F0809]'
                }`}
              >
                {o.type === 'restaurant' ? 'Rajmahal Royal Dining' : 'Courtyard Café'}
              </button>
            ))}
          </div>

          {/* Timings & Operating Days List */}
          {currentHoursOutlet && (
            <div className="pt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-[#82736A]">Daily Service Window</span>
                <span className="font-semibold text-[#351E1A]">
                  {currentHoursOutlet.operating_hours?.all?.open || '11:00 AM'} –{' '}
                  {currentHoursOutlet.operating_hours?.all?.close || '11:30 PM'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF5EE] text-[#21834A]">
                  Active
                </span>
              </div>

              {/* Weekly Operating Days Schedule */}
              <div className="pt-2.5 border-t border-[#E9DCCE] space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#82736A] mb-1">
                  Daily Outlet Availability
                </div>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
                  (day) => {
                    const isDayOpen = currentHoursOutlet.operating_days
                      ? currentHoursOutlet.operating_days[day] !== false
                      : true;
                    const isDropdownOpen = openDayDropdown === day;
                    return (
                      <div
                        key={day}
                        className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-[#FBF6EF]/70 transition"
                      >
                        <span className="text-[11px] font-medium text-[#351E1A]">{day}</span>

                        {/* Dropper Button with Dropdown Menu for Open / Closed */}
                        <div className="relative day-status-dropdown-container">
                          <button
                            type="button"
                            onClick={() => setOpenDayDropdown(isDropdownOpen ? null : day)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer select-none shadow-2xs ${
                              isDayOpen
                                ? 'bg-[#EAF5EE] border-[#21834A]/30 text-[#21834A] hover:bg-[#d4edd9]'
                                : 'bg-[#FDF2F2] border-[#C53C3C]/30 text-[#C53C3C] hover:bg-[#fad8d8]'
                            }`}
                            title={`Click to change status for ${day}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isDayOpen ? 'bg-[#21834A]' : 'bg-[#C53C3C]'
                              }`}
                            />
                            <span>{isDayOpen ? 'Open' : 'Closed'}</span>
                            <ChevronDown
                              className={`w-3 h-3 transition-transform duration-200 ${
                                isDropdownOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {/* Day Dropdown Menu with Open and Closed options */}
                          {isDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-[#E9DCCE] rounded-xl shadow-xl z-30 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => handleSetDayStatus(currentHoursOutlet.id, day, true)}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-[#EAF5EE] transition cursor-pointer ${
                                  isDayOpen ? 'bg-[#EAF5EE]/60 font-bold text-[#21834A]' : 'text-[#351E1A]'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#21834A]" />
                                  <span>Open</span>
                                </div>
                                {isDayOpen && <Check className="w-3.5 h-3.5 text-[#21834A]" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSetDayStatus(currentHoursOutlet.id, day, false)}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-[#FDF2F2] transition cursor-pointer ${
                                  !isDayOpen ? 'bg-[#FDF2F2]/60 font-bold text-[#C53C3C]' : 'text-[#351E1A]'
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#C53C3C]" />
                                  <span>Closed</span>
                                </div>
                                {!isDayOpen && <Check className="w-3.5 h-3.5 text-[#C53C3C]" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Three Equal Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Live Orders by Outlet */}
        <div className="bg-white border border-[#E9DCCE] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E9DCCE]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#4F0809]">
                <BarChart3 className="w-4 h-4 text-[#BD9655]" />
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px' }}>
                  Live Orders by Outlet
                </span>
              </div>
              <Link
                href="/dashboard/orders"
                className="text-[11px] font-semibold text-[#4F0809] hover:text-[#BD9655] transition"
              >
                View All Orders
              </Link>
            </div>

            <table className="w-full text-left text-xs mt-2.5">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-[#82736A] border-b border-[#E9DCCE]/60 pb-1">
                  <th className="py-1">OUTLET</th>
                  <th className="py-1 text-center">NEW</th>
                  <th className="py-1 text-center">PREPARING</th>
                  <th className="py-1 text-center">READY</th>
                  <th className="py-1 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9DCCE]/40">
                {outlets.map((outlet) => {
                  const outletOrders = orders.filter((o) => o.outlet_id === outlet.id);
                  const newCount = outletOrders.filter((o) => o.status === 'new').length;
                  const preparingCount = outletOrders.filter((o) => o.status === 'preparing').length;
                  const readyCount = outletOrders.filter((o) => o.status === 'ready').length;
                  const totalActive = outletOrders.filter((o) =>
                    ['new', 'accepted', 'preparing', 'ready'].includes(o.status)
                  ).length;

                  return (
                    <tr
                      key={outlet.id}
                      className="hover:bg-[#FBF6EF]/50 transition cursor-pointer"
                      onClick={() => (window.location.href = `/dashboard/orders?outlet=${outlet.id}`)}
                    >
                      <td className="py-2.5 font-medium text-[#351E1A] truncate max-w-[110px]">
                        {outlet.name}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C53C3C]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C53C3C]" />
                          {newCount}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D99A28]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D99A28]" />
                          {preparingCount}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#21834A]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#21834A]" />
                          {readyCount}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-[#351E1A]">{totalActive}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Table Status Overview */}
        <div className="bg-white border border-[#E9DCCE] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E9DCCE]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#4F0809]">
                <Armchair className="w-4 h-4 text-[#BD9655]" />
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px' }}>
                  Table Status Overview
                </span>
              </div>
              <Link
                href="/dashboard/tables"
                className="text-[11px] font-semibold text-[#4F0809] hover:text-[#BD9655] transition"
              >
                Manage Tables
              </Link>
            </div>

            <table className="w-full text-left text-xs mt-2.5">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-[#82736A] border-b border-[#E9DCCE]/60 pb-1">
                  <th className="py-1">OUTLET</th>
                  <th className="py-1 text-center">AVAILABLE</th>
                  <th className="py-1 text-center">OCCUPIED</th>
                  <th className="py-1 text-center">RESERVED</th>
                  <th className="py-1 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9DCCE]/40">
                {outlets.map((outlet) => {
                  const outletTables = tables.filter((t) => t.outlet_id === outlet.id);
                  const outletOrders = orders.filter((o) => o.outlet_id === outlet.id);
                  const occupiedTableIds = new Set(
                    outletOrders
                      .filter((o) => o.table_id && ['new', 'accepted', 'preparing', 'ready', 'served'].includes(o.status))
                      .map((o) => o.table_id)
                  );
                  const occupiedCount = Math.min(occupiedTableIds.size, outletTables.length);
                  const availableCount = Math.max(0, outletTables.length - occupiedCount);

                  return (
                    <tr
                      key={outlet.id}
                      className="hover:bg-[#FBF6EF]/50 transition cursor-pointer"
                      onClick={() => (window.location.href = `/dashboard/tables?outlet=${outlet.id}`)}
                    >
                      <td className="py-2.5 font-medium text-[#351E1A] truncate max-w-[110px]">
                        {outlet.name}
                      </td>
                      <td className="py-2.5 text-center font-bold text-[#21834A]">
                        {availableCount}
                      </td>
                      <td className="py-2.5 text-center font-bold text-[#D99A28]">
                        {occupiedCount}
                      </td>
                      <td className="py-2.5 text-center font-bold text-[#82736A]">0</td>
                      <td className="py-2.5 text-right font-bold text-[#351E1A]">
                        {outletTables.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Recent Outlet Activity */}
        <div className="bg-white border border-[#E9DCCE] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E9DCCE]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#4F0809]">
                <Clock className="w-4 h-4 text-[#BD9655]" />
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '15px' }}>
                  Recent Outlet Activity
                </span>
              </div>
              <Link
                href="/dashboard/settings"
                className="text-[11px] font-semibold text-[#4F0809] hover:text-[#BD9655] transition"
              >
                View All
              </Link>
            </div>

            <div className="divide-y divide-[#E9DCCE]/40 mt-2">
              {auditEvents.slice(0, 5).map((evt, idx) => {
                const timeString = new Date(evt.created_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                // Pick status dot color
                let dotColor = 'bg-[#21834A]';
                if (idx === 1) dotColor = 'bg-[#1877F2]';
                if (idx === 2) dotColor = 'bg-[#D99A28]';
                if (idx === 3) dotColor = 'bg-[#C53C3C]';

                return (
                  <div key={evt.id || idx} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      <span className="text-[#351E1A] font-medium truncate">{evt.details}</span>
                    </div>
                    <span className="text-[10px] text-[#82736A] font-mono shrink-0">
                      {timeString}
                    </span>
                  </div>
                );
              })}

              {auditEvents.length === 0 && (
                <div className="py-4 text-center text-xs text-[#82736A]">
                  No recent outlet events recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: Preview Guest Menu ── */}
      {isPreviewMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E9DCCE] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsPreviewMenuOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#F6EEE5] text-[#82736A]"
            >
              <X className="w-4 h-4" />
            </button>
            <h3
              className="text-xl font-bold text-[#4F0809] mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Preview Guest Menu
            </h3>
            <p className="text-xs text-[#82736A] mb-4">
              View the authentic digital menus presented to hotel guests on their mobile devices
            </p>

            <div className="space-y-3">
              <Link
                href="/restaurant"
                target="_blank"
                className="flex items-center justify-between p-3.5 rounded-xl border border-[#E9DCCE] bg-[#FBF6EF] hover:bg-[#F6EEE5] transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#4F0809] text-white">
                    <UtensilsCrossed className="w-5 h-5 text-[#BD9655]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#4F0809]">
                      Rajmahal Royal Dining
                    </div>
                    <div className="text-xs text-[#82736A]">
                      Full royal thali, curries, tandoor &amp; desserts menu
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#BD9655] group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                href="/restaurant#cafe"
                target="_blank"
                className="flex items-center justify-between p-3.5 rounded-xl border border-[#E9DCCE] bg-[#FBF6EF] hover:bg-[#F6EEE5] transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#BD9655] text-white">
                    <Coffee className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#4F0809]">
                      The Palace Courtyard Café &amp; Lounge
                    </div>
                    <div className="text-xs text-[#82736A]">
                      Artisanal coffees, teas, snacks &amp; lounge beverages
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#BD9655] group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Add Outlet ── */}
      {isAddOutletOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E9DCCE] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddOutletOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#F6EEE5] text-[#82736A]"
            >
              <X className="w-4 h-4" />
            </button>
            <h3
              className="text-xl font-bold text-[#4F0809] mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              + Add Palace Dining Outlet
            </h3>
            <p className="text-xs text-[#82736A] mb-4">
              Configure a new operational restaurant, café, rooftop lounge, or bar in the hotel
            </p>

            <form onSubmit={handleAddOutletSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#351E1A] mb-1">
                  Outlet Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maharani Rooftop Bar"
                  value={newOutletName}
                  onChange={(e) => setNewOutletName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E9DCCE] focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#351E1A] mb-1">
                    Outlet Category *
                  </label>
                  <select
                    value={newOutletType}
                    onChange={(e) => setNewOutletType(e.target.value as 'restaurant' | 'cafe')}
                    className="w-full px-3 py-2 rounded-lg border border-[#E9DCCE] focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  >
                    <option value="restaurant">Fine Dining Restaurant</option>
                    <option value="cafe">Café &amp; Lounge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#351E1A] mb-1">
                    Operating Mode
                  </label>
                  <div className="py-2 text-[11px] text-[#21834A] font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Operational (Open Now)</span>
                  </div>
                </div>
              </div>

              {/* Operating Hours Windows */}
              <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E9DCCE] space-y-2">
                <div className="font-semibold text-[#4F0809]">Operating Hours Schedule</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#82736A]">Service Opening Time</label>
                    <input
                      type="time"
                      value={newOutletOpenTime}
                      onChange={(e) => setNewOutletOpenTime(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-[#E9DCCE] text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#82736A]">Service Closing Time</label>
                    <input
                      type="time"
                      value={newOutletCloseTime}
                      onChange={(e) => setNewOutletCloseTime(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-[#E9DCCE] text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Service Channels */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-[#351E1A]">
                  Initial Service Channels
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-[#E9DCCE] bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newOutletDineIn}
                      onChange={(e) => setNewOutletDineIn(e.target.checked)}
                      className="accent-[#4F0809]"
                    />
                    <span>Dine-in / Table QR</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-[#E9DCCE] bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newOutletRoomService}
                      onChange={(e) => setNewOutletRoomService(e.target.checked)}
                      className="accent-[#4F0809]"
                    />
                    <span>Room Service</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-[#E9DCCE] bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newOutletDelivery}
                      onChange={(e) => setNewOutletDelivery(e.target.checked)}
                      className="accent-[#4F0809]"
                    />
                    <span>Online Delivery</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-[#E9DCCE] bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newOutletPickup}
                      onChange={(e) => setNewOutletPickup(e.target.checked)}
                      className="accent-[#4F0809]"
                    />
                    <span>Takeaway / Pickup</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E9DCCE]">
                <button
                  type="button"
                  onClick={() => setIsAddOutletOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#E9DCCE] text-[#82736A] hover:bg-[#F6EEE5] text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4F0809] hover:bg-[#350506] text-white text-xs font-semibold shadow-xs transition"
                >
                  Save &amp; Create Outlet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Operating Hours ── */}
      {isEditHoursOpen && selectedOutlet && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E9DCCE] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditHoursOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#F6EEE5] text-[#82736A]"
            >
              <X className="w-4 h-4" />
            </button>
            <h3
              className="text-xl font-bold text-[#4F0809] mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Edit Hours — {selectedOutlet.name}
            </h3>
            <p className="text-xs text-[#82736A] mb-4">
              Update service windows and operating schedules for this venue
            </p>

            <form onSubmit={handleSaveHoursSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E9DCCE] space-y-2.5">
                <div className="font-semibold text-[#4F0809]">Daily Operating Hours Window</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#82736A]">Opening Time</label>
                    <input
                      type="time"
                      value={editHoursOpenTime}
                      onChange={(e) => setEditHoursOpenTime(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-[#E9DCCE] text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#82736A]">Closing Time</label>
                    <input
                      type="time"
                      value={editHoursCloseTime}
                      onChange={(e) => setEditHoursCloseTime(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-[#E9DCCE] text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E9DCCE]">
                <button
                  type="button"
                  onClick={() => setIsEditHoursOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#E9DCCE] text-[#82736A] hover:bg-[#F6EEE5] text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4F0809] hover:bg-[#350506] text-white text-xs font-semibold shadow-xs transition"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Manage Outlet Details ── */}
      {isEditOutletOpen && selectedOutlet && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E9DCCE] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditOutletOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#F6EEE5] text-[#82736A]"
            >
              <X className="w-4 h-4" />
            </button>
            <h3
              className="text-xl font-bold text-[#4F0809] mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Manage — {selectedOutlet.name}
            </h3>
            <p className="text-xs text-[#82736A] mb-4">
              Configure billing rates, service taxes, and public presentation
            </p>

            <form onSubmit={handleSaveOutletDetails} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#351E1A] mb-1">
                  Outlet Display Title
                </label>
                <input
                  type="text"
                  required
                  value={editOutletName}
                  onChange={(e) => setEditOutletName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E9DCCE] focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#351E1A] mb-1">
                    GST Tax Rate (bps)
                  </label>
                  <input
                    type="number"
                    value={editOutletTaxRate}
                    onChange={(e) => setEditOutletTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E9DCCE] focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#82736A]">500 bps = 5.0%</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#351E1A] mb-1">
                    Service Charge (bps)
                  </label>
                  <input
                    type="number"
                    value={editOutletServiceCharge}
                    onChange={(e) => setEditOutletServiceCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-[#E9DCCE] focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#82736A]">250 bps = 2.5%</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E9DCCE]">
                <button
                  type="button"
                  onClick={() => setIsEditOutletOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-[#E9DCCE] text-[#82736A] hover:bg-[#F6EEE5] text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#4F0809] hover:bg-[#350506] text-white text-xs font-semibold shadow-xs transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
