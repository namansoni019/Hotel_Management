'use client';

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Armchair,
  Search,
  Plus,
  Download,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Calendar,
  Utensils,
  ChevronRight,
  ChevronDown,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  X,
  Sparkles,
  MapPin,
  Pencil,
  AlertOctagon,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { Table, TableReservation, Outlet } from '@/lib/types';

export default function TablesReservationsPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [activeTab, setActiveTab] = useState<'tables' | 'reservations'>('tables');
  const [outletFilter, setOutletFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Status Dropper open ID for grid cards
  const [activeStatusMenuTableId, setActiveStatusMenuTableId] = useState<string | null>(null);

  // QR Modal
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrVenue, setQrVenue] = useState<'restaurant' | 'cafe'>('restaurant');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // In-app Delete Confirmation Modal (Reliable, no browser alert/confirm blocks)
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [reservationToDelete, setReservationToDelete] = useState<TableReservation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Table Reservation Modal
  const [isNewResModalOpen, setIsNewResModalOpen] = useState(false);
  const [formGuestName, setFormGuestName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formOutletId, setFormOutletId] = useState('');
  const [formTableNumber, setFormTableNumber] = useState('');
  const [formTime, setFormTime] = useState('07:30 PM');
  const [formDate, setFormDate] = useState('');
  const [formPartySize, setFormPartySize] = useState('4');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Add Table Modal
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableOutletId, setNewTableOutletId] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [newTableLocation, setNewTableLocation] = useState('Main Courtyard');
  const [newTableStatus, setNewTableStatus] = useState<Table['status']>('available');
  const [addTableError, setAddTableError] = useState('');

  // Edit Table Modal
  const [isEditTableOpen, setIsEditTableOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editTableOutletId, setEditTableOutletId] = useState('');
  const [editTableCapacity, setEditTableCapacity] = useState('4');
  const [editTableLocation, setEditTableLocation] = useState('');
  const [editTableStatus, setEditTableStatus] = useState<Table['status']>('available');
  const [editTableError, setEditTableError] = useState('');

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    // Clear legacy localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('dashboard_tables');
      } catch {}
    }

    const outs = dataRepository.getOutlets();
    setOutlets(outs);
    const today = new Date().toISOString().split('T')[0];
    setFormDate(today);
    if (outs.length > 0 && !formOutletId) {
      setFormOutletId(outs[0].id);
      setNewTableOutletId(outs[0].id);
    }

    const unsubTables = onSnapshot(
      collection(db, 'tables'),
      (snap) => {
        if (!snap.empty) {
          setTables(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Table[]);
        } else {
          setTables(dataRepository.getTables());
        }
      },
      () => setTables(dataRepository.getTables())
    );

    const unsubRes = onSnapshot(
      collection(db, 'table_reservations'),
      (snap) => {
        if (!snap.empty) {
          setReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TableReservation[]);
        } else {
          setReservations(dataRepository.getTableReservations());
        }
      },
      () => setReservations(dataRepository.getTableReservations())
    );

    return () => {
      unsubTables();
      unsubRes();
    };
  }, []);

  const loadData = async () => {
    // Kept for manual refresh
  };

  // Update table number options when outlet selection changes in Reservation modal
  useEffect(() => {
    if (formOutletId) {
      const availableTablesInOutlet = tables.filter((t) => t.outlet_id === formOutletId);
      if (availableTablesInOutlet.length > 0) {
        setFormTableNumber(availableTablesInOutlet[0].table_number);
      } else if (tables.length > 0) {
        setFormTableNumber(tables[0].table_number);
      }
    }
  }, [formOutletId, tables]);

  // Close dropper dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.table-status-dropper-container')) {
        setActiveStatusMenuTableId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesOutlet = outletFilter === 'all' || t.outlet_id === outletFilter;
      const matchesSearch =
        !searchQuery ||
        t.table_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.location && t.location.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesOutlet && matchesSearch;
    });
  }, [tables, outletFilter, searchQuery]);

  // Filtered Reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        r.guest_name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.table_number.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);
      const matchesOutlet = outletFilter === 'all' || r.outlet_id === outletFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesOutlet && matchesStatus;
    });
  }, [reservations, searchQuery, outletFilter, statusFilter]);

  // Real Calculated Metrics
  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const reservedTables = tables.filter((t) => t.status === 'reserved').length;
  const cleaningTables = tables.filter((t) => t.status === 'cleaning').length;
  const availableTables = tables.filter((t) => (t.status || 'available') === 'available').length;

  // Actions: Update Table Status via interactive dropper
  const handleUpdateTableStatus = async (tableId: string, newStatus: Table['status']) => {
    setActiveStatusMenuTableId(null);
    // Optimistic UI update
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tableId, status: newStatus }),
      });
      dataRepository.updateTableStatus(tableId, newStatus);
      showToast('success', `Table status updated to ${newStatus?.toUpperCase()}.`);
    } catch {
      dataRepository.updateTableStatus(tableId, newStatus);
      showToast('success', `Table status updated to ${newStatus?.toUpperCase()}.`);
    }
  };

  // Actions: Delete Table (Instant & Reliable with Custom Modal)
  const confirmDeleteTable = async () => {
    if (!tableToDelete) return;
    const tableId = tableToDelete.id;
    const tableNum = tableToDelete.table_number;

    setIsDeleting(true);
    // 1. Optimistic removal from state immediately
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    dataRepository.deleteTable(tableId);

    try {
      const res = await fetch(`/api/tables?id=${tableId}`, { method: 'DELETE' });
      if (!res.ok) {
        // Fallback already done
      }
    } catch {
      // Ignored
    } finally {
      setIsDeleting(false);
      setTableToDelete(null);
      showToast('success', `Dining table ${tableNum} successfully removed.`);
      loadData();
    }
  };

  // Actions: Delete Reservation
  const confirmDeleteReservation = async () => {
    if (!reservationToDelete) return;
    const resId = reservationToDelete.id;

    setIsDeleting(true);
    setReservations((prev) => prev.filter((r) => r.id !== resId));
    dataRepository.deleteTableReservation(resId);

    try {
      await fetch(`/api/tables?id=${resId}&type=reservation`, { method: 'DELETE' });
    } catch {
      // Ignored
    } finally {
      setIsDeleting(false);
      setReservationToDelete(null);
      showToast('success', 'Reservation deleted.');
      loadData();
    }
  };

  // Actions: Open Edit Table Modal
  const openEditTable = (table: Table) => {
    setEditingTable(table);
    setEditTableNumber(table.table_number);
    setEditTableOutletId(table.outlet_id);
    setEditTableCapacity(String(table.capacity || 4));
    setEditTableLocation(table.location || '');
    setEditTableStatus(table.status || 'available');
    setEditTableError('');
    setIsEditTableOpen(true);
  };

  // Actions: Save Edited Table
  const handleEditTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    if (!editTableNumber.trim()) {
      setEditTableError('Table number cannot be empty.');
      return;
    }

    const updatedData: Partial<Table> = {
      table_number: editTableNumber.trim().toUpperCase(),
      outlet_id: editTableOutletId,
      capacity: parseInt(editTableCapacity) || 4,
      location: editTableLocation.trim() || 'Dining Hall',
      status: editTableStatus,
    };

    // Optimistic UI update
    setTables((prev) =>
      prev.map((t) => (t.id === editingTable.id ? { ...t, ...updatedData } : t))
    );
    dataRepository.updateTable(editingTable.id, updatedData);

    try {
      const res = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTable.id,
          ...updatedData,
        }),
      });

      if (res.ok) {
        showToast('success', `Table ${updatedData.table_number} updated successfully.`);
        setIsEditTableOpen(false);
        setEditingTable(null);
        loadData();
      } else {
        const d = await res.json();
        setEditTableError(d.error || 'Failed to update table.');
      }
    } catch {
      showToast('success', `Table ${updatedData.table_number} updated.`);
      setIsEditTableOpen(false);
      setEditingTable(null);
      loadData();
    }
  };

  // Actions: Add New Table
  const handleAddTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) {
      setAddTableError('Please specify a table number (e.g. T-11 or C-05).');
      return;
    }

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: newTableOutletId || (outlets[0]?.id ?? ''),
          table_number: newTableNumber.trim().toUpperCase(),
          capacity: parseInt(newTableCapacity) || 4,
          location: newTableLocation.trim() || 'Dining Hall',
          status: newTableStatus,
        }),
      });

      if (res.ok) {
        showToast('success', `Table ${newTableNumber.toUpperCase()} successfully created.`);
        setIsAddTableOpen(false);
        setNewTableNumber('');
        setAddTableError('');
        loadData();
      } else {
        const d = await res.json();
        setAddTableError(d.error || 'Failed to create table.');
      }
    } catch {
      dataRepository.addTable({
        outlet_id: newTableOutletId || (outlets[0]?.id ?? ''),
        table_number: newTableNumber.trim().toUpperCase(),
        capacity: parseInt(newTableCapacity) || 4,
        is_active: true,
        location: newTableLocation.trim() || 'Dining Hall',
        status: newTableStatus,
      });
      showToast('success', `Table ${newTableNumber.toUpperCase()} successfully created.`);
      setIsAddTableOpen(false);
      setNewTableNumber('');
      setAddTableError('');
      loadData();
    }
  };

  // Actions: Update Reservation Status
  const handleUpdateReservationStatus = async (id: string, status: TableReservation['status']) => {
    try {
      const res = await fetch('/api/tables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reservation', id, status }),
      });
      if (res.ok) {
        showToast('success', `Booking status changed to ${status.toUpperCase()}.`);
        loadData();
      } else {
        dataRepository.updateTableReservationStatus(id, status);
        loadData();
        showToast('success', `Booking status changed to ${status.toUpperCase()}.`);
      }
    } catch {
      dataRepository.updateTableReservationStatus(id, status);
      loadData();
      showToast('success', `Booking status changed to ${status.toUpperCase()}.`);
    }
  };

  // Actions: Create Reservation
  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGuestName.trim() || !formPhone.trim()) {
      setFormError('Please provide both guest full name and contact phone number.');
      return;
    }
    const outletObj = outlets.find((o) => o.id === formOutletId);

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reserve',
          guest_name: formGuestName.trim(),
          phone: formPhone.trim(),
          outlet_id: formOutletId,
          outlet_name: outletObj?.name || 'Rajmahal Royal Dining',
          table_number: formTableNumber,
          reservation_time: `${formDate} ${formTime}`,
          party_size: parseInt(formPartySize) || 4,
          notes: formNotes.trim(),
        }),
      });

      if (res.ok) {
        showToast('success', `Table ${formTableNumber} reserved for ${formGuestName.trim()}.`);
        setIsNewResModalOpen(false);
        setFormGuestName('');
        setFormPhone('');
        setFormNotes('');
        setFormError('');
        loadData();
      } else {
        const d = await res.json();
        setFormError(d.error || 'Failed to create reservation.');
      }
    } catch {
      dataRepository.createTableReservation({
        guest_name: formGuestName.trim(),
        phone: formPhone.trim(),
        outlet_id: formOutletId,
        outlet_name: outletObj?.name || 'Rajmahal Royal Dining',
        table_number: formTableNumber,
        reservation_time: `${formDate} ${formTime}`,
        party_size: parseInt(formPartySize) || 4,
        status: 'confirmed',
        notes: formNotes.trim(),
      });
      showToast('success', `Table ${formTableNumber} reserved for ${formGuestName.trim()}.`);
      setIsNewResModalOpen(false);
      setFormGuestName('');
      setFormPhone('');
      setFormNotes('');
      setFormError('');
      loadData();
    }
  };

  const handleExportCSV = () => {
    const headers = ['Reservation ID,Guest,Phone,Outlet,Table,Date & Time,Party Size,Status,Notes'];
    const rows = filteredReservations.map((r) => [
      `"${r.id}"`,
      `"${r.guest_name}"`,
      `"${r.phone}"`,
      `"${r.outlet_name}"`,
      `"${r.table_number}"`,
      `"${r.reservation_time}"`,
      r.party_size,
      r.status,
      `"${r.notes || ''}"`,
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rajmahal_table_reservations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate scannable QR Code whenever table or venue changes
  useEffect(() => {
    if (!qrModalTable) {
      setQrDataUrl('');
      return;
    }
    const venueCode = qrVenue === 'cafe' ? 'c' : 'r';
    const targetPath = `/menu?qr=${venueCode}&table=${qrModalTable.table_number}`;
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${targetPath}` : targetPath;

    QRCode.toDataURL(fullUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#4F0809', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [qrModalTable, qrVenue]);

  const copyQRLink = (tableNumber: string) => {
    const venueCode = qrVenue === 'cafe' ? 'c' : 'r';
    const url = `${window.location.origin}/menu?qr=${venueCode}&table=${tableNumber}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Standard operational time options
  const timeOptions = [
    '11:00 AM',
    '11:30 AM',
    '12:00 PM',
    '12:30 PM',
    '01:00 PM',
    '01:30 PM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
    '04:00 PM',
    '04:30 PM',
    '05:00 PM',
    '05:30 PM',
    '06:00 PM',
    '06:30 PM',
    '07:00 PM',
    '07:30 PM',
    '08:00 PM',
    '08:30 PM',
    '09:00 PM',
    '09:30 PM',
    '10:00 PM',
    '10:30 PM',
    '11:00 PM',
  ];

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
            notification.type === 'success'
              ? 'bg-[#EAF5EE] text-[#1D703F] border-[#C3E4CD]'
              : 'bg-[#FDF0ED] text-[#B02A37] border-[#F8D2CD]'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#1D703F]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#B02A37]" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DCD2]">
        <div>
          <h1
            className="text-2xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Dining Tables &amp; Reservations
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Real-time table floor management, instant status controls, and dining bookings across palace outlets
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'reservations' && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
          <button
            onClick={() => setIsAddTableOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#D8AA67] bg-[#FBF6EF] hover:bg-[#F6EAE0] text-[#4F0809] text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#B78A48]" />
            Add Dining Table
          </button>
          <button
            onClick={() => setIsNewResModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
            New Table Booking
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Total Dining Tables
            </div>
            <div className="text-xl font-bold text-[#302421] mt-0.5">{totalTables}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">
              {outletFilter === 'all'
                ? `Across ${outlets.length} active palace venues`
                : (outlets.find((o) => o.id === outletFilter)?.name ?? 'Filtered outlet')}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <Armchair className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Occupied Tables
            </div>
            <div className="text-xl font-bold text-[#4F0809] mt-0.5">{occupiedTables}</div>
            <div className="text-[10px] text-[#2E7D32] font-medium mt-0.5">Guests dining live</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <Utensils className="w-4 h-4 text-[#4F0809]" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Available Ready
            </div>
            <div className="text-xl font-bold text-[#2E7D32] mt-0.5">{availableTables}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">
              {cleaningTables > 0 ? `${cleaningTables} cleaning` : 'Preset & ready'}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#2E7D32]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Reserved Tables
            </div>
            <div className="text-xl font-bold text-[#B78A48] mt-0.5">{reservedTables}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">Active reservations</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#B78A48]">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── View Switcher & Filters ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'tables'
                ? 'bg-[#4F0809] text-white shadow-xs'
                : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
            }`}
          >
            Floor Table Grid ({totalTables})
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'reservations'
                ? 'bg-[#4F0809] text-white shadow-xs'
                : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
            }`}
          >
            Table Reservations List ({reservations.length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative w-full sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#81736D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table, guest, code..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809]"
            />
          </div>

          <select
            value={outletFilter}
            onChange={(e) => setOutletFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
          >
            <option value="all">All Palace Outlets</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          {activeTab === 'reservations' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="seated">Seated</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </div>
      </div>

      {/* ── Tab 1: Responsive Floor Table Grid ── */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white border border-[#E8DCD2] rounded-xl text-xs text-[#81736D]">
              No tables found matching your search and filter criteria.
            </div>
          ) : (
            filteredTables.map((table) => {
              const currentStatus = table.status || 'available';
              const outletObj = outlets.find((o) => o.id === table.outlet_id);
              const qrTokenStr =
                table.code || `table-${table.table_number.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

              const isOccupied = currentStatus === 'occupied';
              const isReserved = currentStatus === 'reserved';
              const isCleaning = currentStatus === 'cleaning';
              const isAvailable = currentStatus === 'available';

              const cardBg = isOccupied
                ? 'bg-[#4F0809] text-white border-[#4F0809]'
                : isReserved
                ? 'bg-[#B78A48]/10 text-[#6B4E1B] border-[#B78A48]/40'
                : isCleaning
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-white text-[#302421] border-[#E8DCD2]';

              return (
                <div
                  key={table.id}
                  className={`p-4 rounded-xl border shadow-xs transition hover:shadow-md flex flex-col justify-between relative min-h-[175px] ${cardBg}`}
                >
                  {/* Top Bar: Table Number, Outlet Badge & Status Dropper */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-2xl font-bold tracking-tight"
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                          >
                            {table.table_number}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                              isOccupied
                                ? 'bg-white/10 text-white/90 border-white/20'
                                : 'bg-[#FBF6EF] text-[#670E10] border-[#E8DCD2]'
                            }`}
                          >
                            {outletObj?.type === 'cafe' ? 'Café' : 'Restaurant'}
                          </span>
                        </div>
                        <div className="text-[11px] opacity-80 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {table.location || 'Palace Dining Hall'}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Status Dropper Button */}
                      <div className="relative table-status-dropper-container shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveStatusMenuTableId(
                              activeStatusMenuTableId === table.id ? null : table.id
                            );
                          }}
                          className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider cursor-pointer border shadow-2xs transition ${
                            isOccupied
                              ? 'bg-[#6B1518] text-white border-white/25 hover:bg-[#821215]'
                              : isReserved
                              ? 'bg-[#B78A48] text-white border-[#B78A48] hover:bg-[#9B7235]'
                              : isCleaning
                              ? 'bg-amber-200 text-amber-900 border-amber-300 hover:bg-amber-300'
                              : 'bg-[#2E7D32]/15 text-[#2E7D32] border-[#2E7D32]/30 hover:bg-[#2E7D32]/25'
                          }`}
                        >
                          <span>
                            {isOccupied
                              ? '● Occupied'
                              : isReserved
                              ? '● Reserved'
                              : isCleaning
                              ? '● Cleaning'
                              : '● Available'}
                          </span>
                          <ChevronDown className="w-3 h-3 opacity-80" />
                        </button>

                        {/* Dropper Menu */}
                        {activeStatusMenuTableId === table.id && (
                          <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-[#E8DCD2] rounded-xl shadow-2xl z-30 py-1 text-xs text-[#302421]">
                            <button
                              type="button"
                              onClick={() => handleUpdateTableStatus(table.id, 'available')}
                              className="w-full text-left px-3 py-2 hover:bg-[#FBF6EF] flex items-center justify-between text-[#2E7D32] font-semibold cursor-pointer"
                            >
                              <span>● Available Ready</span>
                              {isAvailable && <Check className="w-3.5 h-3.5 text-[#2E7D32]" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTableStatus(table.id, 'occupied')}
                              className="w-full text-left px-3 py-2 hover:bg-[#FBF6EF] flex items-center justify-between text-[#4F0809] font-semibold cursor-pointer"
                            >
                              <span>● Mark Occupied</span>
                              {isOccupied && <Check className="w-3.5 h-3.5 text-[#4F0809]" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTableStatus(table.id, 'reserved')}
                              className="w-full text-left px-3 py-2 hover:bg-[#FBF6EF] flex items-center justify-between text-[#B78A48] font-semibold cursor-pointer"
                            >
                              <span>● Mark Reserved</span>
                              {isReserved && <Check className="w-3.5 h-3.5 text-[#B78A48]" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTableStatus(table.id, 'cleaning')}
                              className="w-full text-left px-3 py-2 hover:bg-[#FBF6EF] flex items-center justify-between text-amber-800 font-semibold cursor-pointer"
                            >
                              <span>● Needs Cleaning</span>
                              {isCleaning && <Check className="w-3.5 h-3.5 text-amber-800" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Capacity & Outlet Name */}
                    <div className="flex items-center justify-between text-[11px] py-1 opacity-90 border-t border-current/10">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span className="font-semibold">{table.capacity || 4} Guests Seating</span>
                      </div>
                      <span className="truncate max-w-[120px] opacity-75 text-[10px]">
                        {outletObj?.name || 'Rajmahal Royal Dining'}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom: QR Code Link & Action Controls (EDIT & DELETE) */}
                  <div className="pt-2.5 mt-2 border-t border-current/15 flex items-center justify-between gap-2">
                    {/* QR Token Button */}
                    <button
                      type="button"
                      onClick={() => setQrModalTable(table)}
                      title="View digital dining QR token"
                      className="flex items-center gap-1 text-[11px] font-mono font-semibold opacity-85 hover:opacity-100 transition underline underline-offset-2 cursor-pointer truncate max-w-[130px]"
                    >
                      <QrCode className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{qrTokenStr}</span>
                    </button>

                    {/* Action Buttons: EDIT & DELETE */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditTable(table)}
                        title="Edit Table Details"
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer border ${
                          isOccupied
                            ? 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                            : 'bg-white hover:bg-[#F6EAE0] text-[#4F0809] border-[#E8DCD2] shadow-2xs'
                        }`}
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTableToDelete(table)}
                        title="Remove Table"
                        className={`p-1.5 rounded-md transition cursor-pointer border ${
                          isOccupied
                            ? 'bg-red-950/40 hover:bg-red-800 text-red-200 border-red-500/30'
                            : 'bg-white hover:bg-red-50 text-red-600 border-red-200 shadow-2xs'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab 2: Table Reservations Table ── */}
      {activeTab === 'reservations' && (
        <div className="bg-white border border-[#E8DCD2] rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E8DCD2] bg-[#FBF6EF]/75 text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
                  <th className="py-2.5 px-3">Res ID</th>
                  <th className="py-2.5 px-3">Guest &amp; Contact</th>
                  <th className="py-2.5 px-3">Dining Outlet</th>
                  <th className="py-2.5 px-3">Table</th>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3">Party Size</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Special Requests</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DCD2]/70 text-[#302421]">
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-[#81736D]">
                      No table bookings found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => (
                    <tr key={res.id} className="hover:bg-[#FBF6EF]/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#4F0809] font-mono text-[11px]">
                        {res.id}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#302421]">{res.guest_name}</div>
                        <div className="text-[10px] text-[#81736D]">{res.phone}</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#302421]">
                        {res.outlet_name || 'Rajmahal Royal Dining'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-[#F6EAE0] font-mono font-semibold text-[#4F0809] text-[11px]">
                          {res.table_number}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#302421] font-medium">
                        {res.reservation_time}
                      </td>
                      <td className="py-2.5 px-3">{res.party_size} Guests</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            res.status === 'confirmed'
                              ? 'bg-[#B78A48]/15 text-[#8F6628]'
                              : res.status === 'seated'
                              ? 'bg-[#2E7D32]/15 text-[#2E7D32]'
                              : res.status === 'completed'
                              ? 'bg-[#81736D]/15 text-[#81736D]'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {res.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#81736D] max-w-[150px] truncate text-[11px]">
                        {res.notes || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {res.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, 'seated')}
                              className="px-2 py-1 rounded bg-[#2E7D32] hover:bg-[#256629] text-white font-medium text-[11px] transition cursor-pointer"
                            >
                              Seat Guests
                            </button>
                          )}
                          {res.status === 'seated' && (
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, 'completed')}
                              className="px-2 py-1 rounded bg-[#81736D] hover:bg-[#5C514B] text-white font-medium text-[11px] transition cursor-pointer"
                            >
                              Complete
                            </button>
                          )}
                          {res.status !== 'cancelled' && res.status !== 'completed' && (
                            <button
                              onClick={() => handleUpdateReservationStatus(res.id, 'cancelled')}
                              className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px] transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => setReservationToDelete(res)}
                            title="Delete record"
                            className="p-1 rounded text-[#81736D] hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: Edit Dining Table ── */}
      {isEditTableOpen && editingTable && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditTableOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#FBF6EF] text-[#81736D] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Pencil className="w-5 h-5 text-[#B78A48]" />
              <h2
                className="text-xl font-bold text-[#4F0809]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Edit Dining Table — {editingTable.table_number}
              </h2>
            </div>
            <p className="text-xs text-[#81736D] mb-4">
              Modify table number, assigned venue, seating capacity, and floor view
            </p>

            {editTableError && (
              <div className="p-2.5 mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {editTableError}
              </div>
            )}

            <form onSubmit={handleEditTableSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Table Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTableNumber}
                    onChange={(e) => setEditTableNumber(e.target.value)}
                    placeholder="e.g. T-01 or C-02"
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none uppercase font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Seating Capacity
                  </label>
                  <select
                    value={editTableCapacity}
                    onChange={(e) => setEditTableCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  >
                    <option value="2">2 Guests</option>
                    <option value="4">4 Guests</option>
                    <option value="6">6 Guests</option>
                    <option value="8">8 Guests (Large Banquet)</option>
                    <option value="12">12 Guests (Royal Diwan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Outlet Dining Venue
                </label>
                <select
                  value={editTableOutletId}
                  onChange={(e) => setEditTableOutletId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.type === 'restaurant' ? 'Restaurant' : 'Café'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Floor Location / View
                </label>
                <input
                  type="text"
                  value={editTableLocation}
                  onChange={(e) => setEditTableLocation(e.target.value)}
                  placeholder="e.g. Courtyard Fountain, Royal Balcony, Garden Alcove"
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Current Status
                </label>
                <select
                  value={editTableStatus}
                  onChange={(e) => setEditTableStatus(e.target.value as Table['status'])}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none font-medium"
                >
                  <option value="available">● Available (Ready for Guests)</option>
                  <option value="occupied">● Occupied (Guests Seated)</option>
                  <option value="reserved">● Reserved</option>
                  <option value="cleaning">● Needs Cleaning</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8DCD2]">
                <button
                  type="button"
                  onClick={() => setIsEditTableOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add New Dining Table ── */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddTableOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#FBF6EF] text-[#81736D] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2
              className="text-xl font-bold text-[#4F0809] mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Add Palace Dining Table
            </h2>
            <p className="text-xs text-[#81736D] mb-4">
              Register a new dining table to the floor plan and generate digital ordering QR token
            </p>

            {addTableError && (
              <div className="p-2.5 mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {addTableError}
              </div>
            )}

            <form onSubmit={handleAddTableSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Table Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder="e.g. T-11 or C-05"
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none uppercase font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Seating Capacity
                  </label>
                  <select
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  >
                    <option value="2">2 Guests</option>
                    <option value="4">4 Guests</option>
                    <option value="6">6 Guests</option>
                    <option value="8">8 Guests (Large Banquet)</option>
                    <option value="12">12 Guests (Royal Diwan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Outlet Venue *
                </label>
                <select
                  value={newTableOutletId}
                  onChange={(e) => setNewTableOutletId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.type === 'restaurant' ? 'Restaurant' : 'Café'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Floor Location / View
                </label>
                <input
                  type="text"
                  value={newTableLocation}
                  onChange={(e) => setNewTableLocation(e.target.value)}
                  placeholder="e.g. Courtyard Fountain, Royal Balcony, Garden Alcove"
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Initial Table Status
                </label>
                <select
                  value={newTableStatus}
                  onChange={(e) => setNewTableStatus(e.target.value as Table['status'])}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none font-medium"
                >
                  <option value="available">● Available (Ready for Guests)</option>
                  <option value="occupied">● Occupied (Seated)</option>
                  <option value="reserved">● Reserved</option>
                  <option value="cleaning">● Needs Cleaning</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8DCD2]">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Create Dining Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Table Confirmation (In-App, Highly Reliable) ── */}
      {tableToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 mx-auto flex items-center justify-center text-red-600 mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3
              className="text-xl font-bold text-[#4F0809]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Delete Table {tableToDelete.table_number}?
            </h3>

            <p className="text-xs text-[#81736D] mt-2 mb-5 leading-relaxed">
              Are you sure you want to permanently delete dining table{' '}
              <strong className="text-[#302421]">{tableToDelete.table_number}</strong>
              {tableToDelete.location ? ` (${tableToDelete.location})` : ''}? This will remove its
              digital QR token and floor space.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTableToDelete(null)}
                className="flex-1 py-2 rounded-lg border border-[#E8DCD2] text-[#302421] hover:bg-[#FBF6EF] text-xs font-semibold transition cursor-pointer"
              >
                Keep Table
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteTable}
                className="flex-1 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Reservation Confirmation ── */}
      {reservationToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 mx-auto flex items-center justify-center text-red-600 mb-3">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3
              className="text-xl font-bold text-[#4F0809]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Delete Table Booking?
            </h3>

            <p className="text-xs text-[#81736D] mt-2 mb-5 leading-relaxed">
              Are you sure you want to delete the reservation for{' '}
              <strong className="text-[#302421]">{reservationToDelete.guest_name}</strong> at Table{' '}
              <strong className="text-[#302421]">{reservationToDelete.table_number}</strong>?
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setReservationToDelete(null)}
                className="flex-1 py-2 rounded-lg border border-[#E8DCD2] text-[#302421] hover:bg-[#FBF6EF] text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteReservation}
                className="flex-1 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Create Table Reservation ── */}
      {isNewResModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsNewResModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#FBF6EF] text-[#81736D] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2
              className="text-xl font-bold text-[#4F0809] mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Reserve Dining Table
            </h2>
            <p className="text-xs text-[#81736D] mb-4">
              Book a table for palace guests, private parties or VIP walk-ins
            </p>

            {formError && (
              <div className="p-2.5 mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateReservation} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formGuestName}
                  onChange={(e) => setFormGuestName(e.target.value)}
                  placeholder="e.g. Kunwar Vikramaditya"
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91 98290 12345"
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Outlet Dining Venue
                  </label>
                  <select
                    value={formOutletId}
                    onChange={(e) => setFormOutletId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Assigned Table
                  </label>
                  <select
                    value={formTableNumber}
                    onChange={(e) => setFormTableNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none font-semibold"
                  >
                    {tables
                      .filter((t) => !formOutletId || t.outlet_id === formOutletId)
                      .map((t) => (
                        <option key={t.id} value={t.table_number}>
                          {t.table_number} ({t.location || 'Area'} - {t.capacity} seats)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">Time</label>
                  <select
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none font-medium"
                  >
                    {timeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">Guests</label>
                  <select
                    value={formPartySize}
                    onChange={(e) => setFormPartySize(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  >
                    <option value="2">2 Guests</option>
                    <option value="4">4 Guests</option>
                    <option value="6">6 Guests</option>
                    <option value="8">8 Guests</option>
                    <option value="12">12 Guests</option>
                    <option value="16">16 Guests</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Special Notes / Preferences
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Royal welcome, window seat preference, anniversary celebration, dietary preferences..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E8DCD2]">
                <button
                  type="button"
                  onClick={() => setIsNewResModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Confirm Table Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Digital QR Token Preview ── */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <button
              onClick={() => setQrModalTable(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#FBF6EF] text-[#81736D] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#FBF6EF] border border-[#E8DCD2] mx-auto flex items-center justify-center text-[#4F0809] mb-3">
              <QrCode className="w-6 h-6" />
            </div>

            <h3
              className="text-xl font-bold text-[#4F0809]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Table {qrModalTable.table_number} Digital Token
            </h3>
            <p className="text-xs text-[#81736D] mt-0.5 mb-3">
              Scan with mobile to auto-reserve Table {qrModalTable.table_number} &amp; launch palace menu
            </p>

            {/* Venue Switcher for QR Target */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { id: 'restaurant', label: 'Royal Restaurant', code: 'qr=r' },
                { id: 'cafe', label: 'Courtyard Café', code: 'qr=c' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setQrVenue(v.id as any)}
                  className={`p-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    qrVenue === v.id
                      ? 'border-[#4F0809] bg-[#4F0809] text-white shadow-xs'
                      : 'border-[#E8DCD2] bg-[#FBF6EF] text-[#4F0809] hover:bg-[#F6EAE0]'
                  }`}
                >
                  <span>{v.label}</span>
                  <span className={`text-[10px] font-mono ${qrVenue === v.id ? 'text-[#D8AA67]' : 'text-[#81736D]'}`}>
                    ({v.code})
                  </span>
                </button>
              ))}
            </div>

            {/* QR Code Container with Real Generated Scannable QR */}
            <div className="p-3 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2] inline-block mx-auto mb-3">
              <div className="w-44 h-44 bg-white border border-[#E8DCD2] rounded-lg p-2 flex flex-col items-center justify-center mx-auto shadow-inner">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Scannable QR for Table ${qrModalTable.table_number}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <>
                    <QrCode className="w-28 h-28 text-[#4F0809]" />
                    <span className="text-[10px] font-mono font-bold text-[#4F0809] mt-1">
                      Table {qrModalTable.table_number}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-1.5 text-[10px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Auto-Reserves on Scan
              </div>
            </div>

            {/* URL Display & Copy */}
            <div className="flex items-center gap-1.5 p-2 bg-[#FBF6EF] border border-[#E8DCD2] rounded-lg text-xs font-mono text-[#4F0809] mb-3">
              <span className="truncate flex-1 text-left text-[11px] font-semibold">
                /menu?qr={qrVenue === 'cafe' ? 'c' : 'r'}&amp;table={qrModalTable.table_number}
              </span>
              <button
                type="button"
                onClick={() => copyQRLink(qrModalTable.table_number)}
                className="px-2 py-1 rounded bg-white border border-[#E8DCD2] text-[#4F0809] hover:bg-[#F6EAE0] text-[10px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3 h-3 text-[#2E7D32]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2">
              <a
                href={`/menu?qr=${qrVenue === 'cafe' ? 'c' : 'r'}&table=${qrModalTable.table_number}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition"
              >
                <span>Open Menu &amp; Test Reserve</span>
                <ExternalLink className="w-3 h-3 text-[#D8AA67]" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
