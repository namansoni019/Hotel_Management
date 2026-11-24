'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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

export function getTableCategory(t: Table): 'room' | 'cafe' | 'hall' | 'restaurant' {
  const num = (t.table_number || '').toLowerCase();
  const loc = (t.location || '').toLowerCase();

  if (
    num.startsWith('room') ||
    num.startsWith('r-') ||
    loc.includes('room') ||
    loc.includes('suite') ||
    loc.includes('chamber')
  ) {
    return 'room';
  }
  if (
    num.startsWith('h-') ||
    num.startsWith('hall') ||
    loc.includes('hall') ||
    loc.includes('banquet') ||
    loc.includes('party')
  ) {
    return 'hall';
  }
  if (
    num.startsWith('c-') ||
    t.outlet_id === 'b0000000-0000-0000-0000-000000000002' ||
    loc.includes('cafe') ||
    loc.includes('courtyard')
  ) {
    return 'cafe';
  }
  return 'restaurant';
}

export function RoyalSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  align = 'left',
}: {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode; dotColor?: string }[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  align?: 'left' | 'right';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          buttonClassName ||
          `w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#E8DFCE] text-xs bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] font-bold transition cursor-pointer shadow-2xs`
        }
      >
        <span className="flex items-center gap-1.5 truncate">
          {selectedOption?.dotColor && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`} />
          )}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-[#856B4D] transition-transform duration-200 ml-1.5 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } top-full mt-1.5 w-full min-w-[200px] bg-[#FDF8EE] border border-[#D8AA67]/70 rounded-2xl shadow-2xl z-50 py-1.5 text-xs text-[#4F0809] animate-fade-in max-h-60 overflow-y-auto ${dropdownClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-2.5 hover:bg-[#F5ECDC] transition cursor-pointer text-xs ${
                  isSelected ? 'bg-[#4F0809]/10 font-bold text-[#4F0809]' : 'text-[#5C4535] font-medium'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.dotColor && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                  )}
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#D8AA67] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TablesReservationsPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [activeTab, setActiveTab] = useState<'tables' | 'reservations'>('tables');
  const [outletFilter, setOutletFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Status Dropper open ID for grid cards
  const [activeStatusMenuTableId, setActiveStatusMenuTableId] = useState<string | null>(null);

  // QR Modal
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrVenue, setQrVenue] = useState<'restaurant' | 'cafe' | 'room'>('restaurant');
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

  // Real Calculated Metrics
  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.status === 'occupied').length;
  const reservedTables = tables.filter((t) => t.status === 'reserved').length;
  const cleaningTables = tables.filter((t) => t.status === 'cleaning').length;
  const availableTables = tables.filter((t) => (t.status || 'available') === 'available').length;

  const restaurantCount = tables.filter((t) => getTableCategory(t) === 'restaurant').length;
  const cafeCount = tables.filter((t) => getTableCategory(t) === 'cafe').length;
  const roomCount = tables.filter((t) => getTableCategory(t) === 'room').length;
  const hallCount = tables.filter((t) => getTableCategory(t) === 'hall').length;

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const cat = getTableCategory(t);
      const matchesVenue =
        venueFilter === 'all' ||
        cat === venueFilter ||
        t.outlet_id === venueFilter;
      const matchesStatus =
        statusFilter === 'all' || (t.status || 'available') === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.table_number.toLowerCase().includes(q) ||
        (t.location && t.location.toLowerCase().includes(q)) ||
        cat.includes(q);
      return matchesVenue && matchesStatus && matchesSearch;
    });
  }, [tables, venueFilter, statusFilter, searchQuery]);

  // Filtered Reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.guest_name.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q) ||
        r.table_number.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q);
      const matchesOutlet =
        venueFilter === 'all' ||
        r.outlet_id === venueFilter ||
        (venueFilter === 'room' && r.table_number.toLowerCase().startsWith('room'));
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesOutlet && matchesStatus;
    });
  }, [reservations, searchQuery, venueFilter, statusFilter]);

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
          reservation_time: formDate || new Date().toISOString().split('T')[0],
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
        reservation_time: formDate || new Date().toISOString().split('T')[0],
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
    const venueCode = qrVenue === 'room' ? 'room' : qrVenue === 'cafe' ? 'c' : 'r';
    const targetPath = `/menu?qr=${venueCode}&table=${encodeURIComponent(qrModalTable.table_number)}`;
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
    const venueCode = qrVenue === 'room' ? 'room' : qrVenue === 'cafe' ? 'c' : 'r';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/menu?qr=${venueCode}&table=${encodeURIComponent(tableNumber)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

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

      {/* ── View Switcher & Royal Heritage Palace Filters Bar ── */}
      <div className="bg-[#FDF8EE] border border-[#E8DFCE] rounded-2xl p-4 shadow-xs space-y-3">
        {/* Row 1: Mode Switcher Tabs + Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'tables'
                  ? 'bg-[#4F0809] text-[#FFF8EB] border border-[#D8AA67] shadow-sm'
                  : 'bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D] border border-[#E8DFCE]'
              }`}
            >
              <Armchair className="w-4 h-4 text-[#D8AA67]" />
              <span>Floor Table Grid</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'tables' ? 'bg-[#D8AA67] text-[#4F0809]' : 'bg-[#E8DFCE] text-[#4F0809]'
                }`}
              >
                {totalTables}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reservations')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'reservations'
                  ? 'bg-[#4F0809] text-[#FFF8EB] border border-[#D8AA67] shadow-sm'
                  : 'bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D] border border-[#E8DFCE]'
              }`}
            >
              <Calendar className="w-4 h-4 text-[#D8AA67]" />
              <span>Table Reservations List</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'reservations' ? 'bg-[#D8AA67] text-[#4F0809]' : 'bg-[#E8DFCE] text-[#4F0809]'
                }`}
              >
                {reservations.length}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#856B4D]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table, room, guest..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D8AA67]/60 text-xs bg-[#FAF6EF] text-[#4F0809] placeholder-[#856B4D]/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809] font-medium"
            />
          </div>
        </div>

        {/* Row 2: Category Quick Chips & Dropdowns */}
        <div className="pt-2 border-t border-[#E8DFCE] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'all', label: 'All Tables & Rooms', icon: '🏛️', count: totalTables },
              { id: 'restaurant', label: 'Restaurant', icon: '🍽️', count: restaurantCount },
              { id: 'cafe', label: 'Café & Lounge', icon: '☕', count: cafeCount },
              { id: 'room', label: 'Room Tables', icon: '🛏️', count: roomCount },
              { id: 'hall', label: 'Celebration Hall', icon: '🎉', count: hallCount },
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVenueFilter(v.id as any)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  venueFilter === v.id
                    ? 'bg-[#4F0809] text-[#FFF8EB] border border-[#D8AA67] shadow-xs'
                    : 'bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D] border border-[#E8DFCE]'
                }`}
              >
                <span>{v.icon}</span>
                <span>{v.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    venueFilter === v.id ? 'bg-[#D8AA67] text-[#4F0809]' : 'bg-[#E8DFCE] text-[#4F0809]'
                  }`}
                >
                  {v.count}
                </span>
              </button>
            ))}
          </div>

          {/* Palace Dropdowns */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Palace Venue / Room Dropdown */}
            <RoyalSelect
              value={venueFilter}
              onChange={(val) => setVenueFilter(val)}
              options={[
                { value: 'all', label: `All Venues & Room Tables (${totalTables})`, icon: '🏛️' },
                { value: 'restaurant', label: `Rajmahal Royal Dining (${restaurantCount})`, icon: '🍽️' },
                { value: 'cafe', label: `The Palace Courtyard Café (${cafeCount})`, icon: '☕' },
                { value: 'room', label: `In-Room Dining / Room Tables (${roomCount})`, icon: '🛏️' },
                { value: 'hall', label: `Grand Celebration Hall (${hallCount})`, icon: '🎉' },
              ]}
              buttonClassName="pl-3 pr-2.5 py-1.5 rounded-xl border border-[#D8AA67]/60 bg-[#FAF6EF] hover:bg-white text-xs font-bold text-[#4F0809] focus:outline-none transition cursor-pointer shadow-2xs flex items-center justify-between gap-1.5"
              dropdownClassName="min-w-[240px]"
              align="right"
            />

            {/* Table State Filter */}
            <RoyalSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'available', label: 'Available Ready', dotColor: 'bg-emerald-600' },
                { value: 'occupied', label: 'Occupied Live', dotColor: 'bg-[#4F0809]' },
                { value: 'reserved', label: 'Reserved', dotColor: 'bg-[#B78A48]' },
                { value: 'cleaning', label: 'Needs Cleaning', dotColor: 'bg-amber-500' },
              ]}
              buttonClassName="pl-3 pr-2.5 py-1.5 rounded-xl border border-[#D8AA67]/60 bg-[#FAF6EF] hover:bg-white text-xs font-bold text-[#4F0809] focus:outline-none transition cursor-pointer shadow-2xs flex items-center justify-between gap-1.5"
              dropdownClassName="min-w-[170px]"
              align="right"
            />
          </div>
        </div>
      </div>

      {/* ── Tab 1: Responsive Floor Table Grid ── */}
      {activeTab === 'tables' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-[#FDF8EE] border border-[#E8DFCE] rounded-2xl text-xs text-[#856B4D]">
              <Armchair className="w-8 h-8 text-[#D8AA67] mx-auto mb-2 opacity-60" />
              <p className="font-semibold text-sm text-[#4F0809]">No dining tables or rooms found</p>
              <p className="text-[11px] text-[#856B4D] mt-1">Try changing your venue filter or search query.</p>
            </div>
          ) : (
            filteredTables.map((table) => {
              const currentStatus = table.status || 'available';
              const outletObj = outlets.find((o) => o.id === table.outlet_id);
              const tableCat = getTableCategory(table);
              const qrTokenStr =
                table.code || `table-${table.table_number.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

              const isOccupied = currentStatus === 'occupied';
              const isReserved = currentStatus === 'reserved';
              const isCleaning = currentStatus === 'cleaning';
              const isAvailable = currentStatus === 'available';

              const cardBg = isOccupied
                ? 'bg-[#4F0809] text-[#FFF8EB] border-[#4F0809] shadow-md ring-1 ring-[#D8AA67]/40'
                : isReserved
                ? 'bg-[#FDF8EE] text-[#6B4E1B] border-[#D8AA67]/80 shadow-xs'
                : isCleaning
                ? 'bg-amber-50/90 text-amber-900 border-amber-300'
                : 'bg-[#FDF8EE] text-[#4F0809] border-[#E8DFCE] hover:border-[#D8AA67]';

              const catBadge =
                tableCat === 'room'
                  ? { label: 'In-Room Dining', icon: '🛏️', style: isOccupied ? 'bg-white/15 text-[#FFF8EB] border-white/20' : 'bg-[#4F0809]/10 text-[#4F0809] border-[#D8AA67]/50' }
                  : tableCat === 'cafe'
                  ? { label: 'Courtyard Café', icon: '☕', style: isOccupied ? 'bg-white/15 text-[#FFF8EB] border-white/20' : 'bg-[#B78A48]/15 text-[#856B4D] border-[#D8AA67]/40' }
                  : tableCat === 'hall'
                  ? { label: 'Celebration Hall', icon: '🎉', style: isOccupied ? 'bg-white/15 text-[#FFF8EB] border-white/20' : 'bg-purple-100/60 text-purple-900 border-purple-200' }
                  : { label: 'Royal Dining', icon: '🍽️', style: isOccupied ? 'bg-white/15 text-[#FFF8EB] border-white/20' : 'bg-[#FAF4E8] text-[#856B4D] border-[#E8DCD2]' };

              return (
                <div
                  key={table.id}
                  className={`p-4 rounded-3xl border shadow-xs transition hover:shadow-md flex flex-col justify-between relative min-h-[185px] ${cardBg}`}
                >
                  {/* Top Section: Category Badge + Status Dropper */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shrink-0 ${catBadge.style}`}
                      >
                        <span>{catBadge.icon}</span>
                        <span>{catBadge.label}</span>
                      </span>

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
                              : 'bg-emerald-700/15 text-emerald-800 border-emerald-600/30 hover:bg-emerald-700/25'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isOccupied
                                ? 'bg-red-300'
                                : isReserved
                                ? 'bg-amber-300'
                                : isCleaning
                                ? 'bg-amber-600'
                                : 'bg-emerald-600'
                            }`}
                          />
                          <span>
                            {isOccupied
                              ? 'Occupied'
                              : isReserved
                              ? 'Reserved'
                              : isCleaning
                              ? 'Cleaning'
                              : 'Available'}
                          </span>
                          <ChevronDown className="w-3 h-3 opacity-80" />
                        </button>

                        {/* Dropper Menu (Royal Palace Theme - stays inside card) */}
                        {activeStatusMenuTableId === table.id && (
                          <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#FDF8EE] border border-[#D8AA67]/70 rounded-2xl shadow-2xl z-40 p-1.5 text-xs text-[#4F0809] animate-fade-in">
                            <button
                              type="button"
                              onClick={() => handleUpdateTableStatus(table.id, 'available')}
                              className={`w-full text-left px-3 py-1.5 rounded-xl hover:bg-[#F5ECDC] flex items-center justify-between text-emerald-800 font-bold cursor-pointer transition ${
                                isAvailable ? 'bg-[#4F0809]/10' : ''
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                                <span>Available Ready</span>
                              </span>
                              {isAvailable && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTableStatus(table.id, 'occupied')}
                              className={`w-full text-left px-3 py-1.5 rounded-xl hover:bg-[#F5ECDC] flex items-center justify-between text-[#4F0809] font-bold cursor-pointer transition ${
                                isOccupied ? 'bg-[#4F0809]/10' : ''
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#4F0809] shrink-0" />
                                <span>Mark Occupied</span>
                              </span>
                              {isOccupied && <Check className="w-3.5 h-3.5 text-[#4F0809]" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTableStatus(table.id, 'reserved')}
                              className={`w-full text-left px-3 py-1.5 rounded-xl hover:bg-[#F5ECDC] flex items-center justify-between text-[#B78A48] font-bold cursor-pointer transition ${
                                isReserved ? 'bg-[#4F0809]/10' : ''
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#B78A48] shrink-0" />
                                <span>Mark Reserved</span>
                              </span>
                              {isReserved && <Check className="w-3.5 h-3.5 text-[#B78A48]" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateTableStatus(table.id, 'cleaning')}
                              className={`w-full text-left px-3 py-1.5 rounded-xl hover:bg-[#F5ECDC] flex items-center justify-between text-amber-800 font-bold cursor-pointer transition ${
                                isCleaning ? 'bg-[#4F0809]/10' : ''
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                                <span>Needs Cleaning</span>
                              </span>
                              {isCleaning && <Check className="w-3.5 h-3.5 text-amber-800" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Table Title and Location */}
                    <div className="mb-2">
                      <div
                        className="text-2xl font-bold tracking-tight truncate leading-tight"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        title={table.table_number}
                      >
                        {table.table_number}
                      </div>
                      <div className="text-[11px] opacity-80 flex items-center gap-1 mt-0.5 font-medium truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-[#D8AA67]" />
                        <span className="truncate">
                          {table.location || (tableCat === 'room' ? 'In-Suite Chamber Dining' : 'Palace Dining Hall')}
                        </span>
                      </div>
                    </div>

                    {/* Capacity & Outlet Name */}
                    <div className="flex items-center justify-between text-[11px] py-1.5 opacity-90 border-t border-current/10">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span className="font-semibold">{table.capacity || 4} Guests Seating</span>
                      </div>
                      <span className="truncate max-w-[130px] opacity-75 text-[10px]">
                        {outletObj?.name || 'Rajmahal Royal Dining'}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom: QR Code Shortcut & Action Controls (EDIT & DELETE) */}
                  <div className="pt-2 mt-2 border-t border-current/15 flex items-center justify-between gap-1.5">
                    {/* Compact QR Token Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const cat = getTableCategory(table);
                        setQrVenue(cat === 'room' ? 'room' : cat === 'cafe' ? 'cafe' : 'restaurant');
                        setQrModalTable(table);
                      }}
                      title="View digital dining QR token and URL"
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer border shadow-2xs truncate ${
                        isOccupied
                          ? 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                          : 'bg-[#FAF6EF] hover:bg-white text-[#4F0809] border-[#D8AA67]/40'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5 shrink-0 text-[#D8AA67]" />
                      <span className="truncate font-mono">QR: {table.table_number}</span>
                    </button>

                    {/* Action Buttons: EDIT & DELETE */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditTable(table)}
                        title="Edit Table Details"
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer border shadow-2xs ${
                          isOccupied
                            ? 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                            : 'bg-[#FAF6EF] hover:bg-white text-[#4F0809] border-[#E8DFCE]'
                        }`}
                      >
                        <Pencil className="w-3 h-3 text-[#856B4D]" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTableToDelete(table)}
                        title="Remove Table"
                        className={`p-1.5 rounded-xl transition cursor-pointer border shadow-2xs ${
                          isOccupied
                            ? 'bg-red-950/40 hover:bg-red-800 text-red-200 border-red-500/30'
                            : 'bg-[#FAF6EF] hover:bg-red-50 text-red-600 border-red-200'
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

      {/* ── MODAL: Edit Dining Table (Palace Heritage Theme) ── */}
      {isEditTableOpen && editingTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FDF8EE] border border-[#E8DFCE] rounded-3xl max-w-xl md:max-w-2xl w-full shadow-2xl relative text-[#4F0809] animate-fade-in my-8">
            {/* Royal Maroon Header */}
            <div className="bg-gradient-to-r from-[#4F0809] via-[#651012] to-[#4F0809] text-[#FFF8EB] p-6 relative border-b border-[#D8AA67]/40 rounded-t-3xl">
              <button
                type="button"
                onClick={() => setIsEditTableOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#D8AA67] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#D8AA67]/20 border border-[#D8AA67]/40 flex items-center justify-center shrink-0 text-[#D8AA67] shadow-inner">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-[#D8AA67] tracking-[0.2em] uppercase">
                      Palace Floor Control
                    </span>
                    <span className="text-[#D8AA67] text-[8px]">&#9830;</span>
                    <span className="text-[10px] text-[#FFF8EB]/80 font-medium">Edit Details</span>
                  </div>
                  <h2
                    className="text-2xl font-bold text-[#FFF8EB] leading-tight"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Edit Dining Table &mdash; {editingTable.table_number}
                  </h2>
                </div>
              </div>
            </div>

            {editTableError && (
              <div className="m-4 p-2.5 bg-red-100 border border-red-300 text-red-900 rounded-xl text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-700 shrink-0" />
                <span>{editTableError}</span>
              </div>
            )}

            <form onSubmit={handleEditTableSubmit} className="p-6 sm:p-7 space-y-4 text-xs">
              {/* Category Quick Select */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                  Venue / Table Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'restaurant', label: 'Restaurant', icon: '🍽️', defaultLoc: 'Palace Dining Hall' },
                    { id: 'cafe', label: 'Café & Lounge', icon: '☕', defaultLoc: 'Courtyard Fountain' },
                    { id: 'room', label: 'In-Room Table', icon: '🛏️', defaultLoc: 'In-Suite Chamber Dining' },
                    { id: 'hall', label: 'Celebration Hall', icon: '🎉', defaultLoc: 'Grand Darbar Banquet' },
                  ].map((cat) => {
                    const isSel =
                      (cat.id === 'room' && (editTableNumber.startsWith('ROOM') || editTableNumber.startsWith('R-'))) ||
                      (cat.id === 'cafe' && (editTableNumber.startsWith('C-') || editTableOutletId.endsWith('0002'))) ||
                      (cat.id === 'hall' && editTableNumber.startsWith('HALL')) ||
                      (cat.id === 'restaurant' && !editTableNumber.startsWith('ROOM') && !editTableNumber.startsWith('C-') && !editTableNumber.startsWith('HALL'));

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (cat.id === 'room') {
                            if (!editTableNumber.startsWith('ROOM')) setEditTableNumber(`ROOM ${editTableNumber.replace(/^T-|^C-|^HALL-/, '')}`);
                            setEditTableLocation(cat.defaultLoc);
                          } else if (cat.id === 'cafe') {
                            if (!editTableNumber.startsWith('C-')) setEditTableNumber(`C-${editTableNumber.replace(/^ROOM\s*|^T-|^HALL-/, '')}`);
                            setEditTableLocation(cat.defaultLoc);
                            const cafeOutlet = outlets.find((o) => o.type === 'cafe');
                            if (cafeOutlet) setEditTableOutletId(cafeOutlet.id);
                          } else if (cat.id === 'hall') {
                            if (!editTableNumber.startsWith('HALL-')) setEditTableNumber(`HALL-${editTableNumber.replace(/^ROOM\s*|^T-|^C-/, '')}`);
                            setEditTableLocation(cat.defaultLoc);
                          } else {
                            if (!editTableNumber.startsWith('T-')) setEditTableNumber(`T-${editTableNumber.replace(/^ROOM\s*|^C-|^HALL-/, '')}`);
                            setEditTableLocation(cat.defaultLoc);
                            const resOutlet = outlets.find((o) => o.type === 'restaurant');
                            if (resOutlet) setEditTableOutletId(resOutlet.id);
                          }
                        }}
                        className={`p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSel
                            ? 'bg-[#4F0809] text-[#FFF8EB] border-[#D8AA67] shadow-xs'
                            : 'bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D] border-[#E8DFCE]'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                    Table / Room Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTableNumber}
                    onChange={(e) => setEditTableNumber(e.target.value)}
                    placeholder="e.g. T-01, C-02, ROOM 101"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFCE] bg-[#F5ECDC] focus:bg-white text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none uppercase font-bold text-[#4F0809]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                    Seating Capacity
                  </label>
                  <RoyalSelect
                    value={editTableCapacity}
                    onChange={(val) => setEditTableCapacity(val)}
                    options={[
                      { value: '2', label: '2 Guests' },
                      { value: '4', label: '4 Guests' },
                      { value: '6', label: '6 Guests' },
                      { value: '8', label: '8 Guests (Banquet)' },
                      { value: '12', label: '12 Guests (Royal Diwan)' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                  Outlet Dining Venue
                </label>
                <RoyalSelect
                  value={editTableOutletId}
                  onChange={(val) => setEditTableOutletId(val)}
                  options={outlets.map((o) => ({
                    value: o.id,
                    label: `${o.name} (${o.type === 'restaurant' ? 'Restaurant' : 'Café'})`,
                    icon: o.type === 'restaurant' ? '🍽️' : '☕',
                  }))}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                  Floor Location / View
                </label>
                <input
                  type="text"
                  value={editTableLocation}
                  onChange={(e) => setEditTableLocation(e.target.value)}
                  placeholder="e.g. Courtyard Fountain, Royal Balcony, Suite Chamber"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFCE] bg-[#F5ECDC] focus:bg-white text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none text-[#4F0809]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                  Current Status
                </label>
                <RoyalSelect
                  value={editTableStatus || 'available'}
                  onChange={(val) => setEditTableStatus(val as Table['status'])}
                  options={[
                    { value: 'available', label: 'Available (Ready for Guests)', dotColor: 'bg-emerald-600' },
                    { value: 'occupied', label: 'Occupied (Guests Seated)', dotColor: 'bg-[#4F0809]' },
                    { value: 'reserved', label: 'Reserved', dotColor: 'bg-[#B78A48]' },
                    { value: 'cleaning', label: 'Needs Cleaning', dotColor: 'bg-amber-500' },
                  ]}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8DFCE]">
                <button
                  type="button"
                  onClick={() => setIsEditTableOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D] text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#4F0809] hover:bg-[#651012] text-[#FFF8EB] text-xs font-bold shadow-md transition cursor-pointer border border-[#D8AA67]/40 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D8AA67]" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add New Dining Table (Palace Heritage Theme) ── */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FDF8EE] border border-[#E8DFCE] rounded-3xl max-w-xl md:max-w-2xl w-full shadow-2xl relative text-[#4F0809] animate-fade-in my-8">
            {/* Royal Maroon Header */}
            <div className="bg-gradient-to-r from-[#4F0809] via-[#651012] to-[#4F0809] text-[#FFF8EB] p-6 relative border-b border-[#D8AA67]/40 rounded-t-3xl">
              <button
                type="button"
                onClick={() => setIsAddTableOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#D8AA67] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#D8AA67]/20 border border-[#D8AA67]/40 flex items-center justify-center shrink-0 text-[#D8AA67] shadow-inner">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-[#D8AA67] tracking-[0.2em] uppercase">
                      Palace Dining Floor
                    </span>
                    <span className="text-[#D8AA67] text-[8px]">&#9830;</span>
                    <span className="text-[10px] text-[#FFF8EB]/80 font-medium">Table &amp; Rooms</span>
                  </div>
                  <h2
                    className="text-2xl font-bold text-[#FFF8EB] leading-tight"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Add Dining Table / Room
                  </h2>
                </div>
              </div>
            </div>

            {addTableError && (
              <div className="m-4 p-2.5 bg-red-100 border border-red-300 text-red-900 rounded-xl text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-700 shrink-0" />
                <span>{addTableError}</span>
              </div>
            )}

            <form onSubmit={handleAddTableSubmit} className="p-6 sm:p-7 space-y-4 text-xs">
              {/* Category Quick Select */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                  Venue / Table Category *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'restaurant', label: 'Restaurant', icon: '🍽️', prefix: 'T-', defaultLoc: 'Palace Dining Hall' },
                    { id: 'cafe', label: 'Café & Lounge', icon: '☕', prefix: 'C-', defaultLoc: 'Courtyard Fountain' },
                    { id: 'room', label: 'In-Room Table', icon: '🛏️', prefix: 'ROOM ', defaultLoc: 'In-Suite Chamber Dining' },
                    { id: 'hall', label: 'Celebration Hall', icon: '🎉', prefix: 'HALL-', defaultLoc: 'Grand Darbar Banquet' },
                  ].map((cat) => {
                    const isSel =
                      (cat.id === 'room' && (newTableNumber.startsWith('ROOM') || newTableNumber.startsWith('R-'))) ||
                      (cat.id === 'cafe' && (newTableNumber.startsWith('C-') || newTableOutletId.endsWith('0002'))) ||
                      (cat.id === 'hall' && newTableNumber.startsWith('HALL')) ||
                      (cat.id === 'restaurant' && !newTableNumber.startsWith('ROOM') && !newTableNumber.startsWith('C-') && !newTableNumber.startsWith('HALL'));

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (cat.id === 'room') {
                            setNewTableNumber('ROOM ');
                            setNewTableLocation(cat.defaultLoc);
                          } else if (cat.id === 'cafe') {
                            setNewTableNumber('C-');
                            setNewTableLocation(cat.defaultLoc);
                            const cafeOutlet = outlets.find((o) => o.type === 'cafe');
                            if (cafeOutlet) setNewTableOutletId(cafeOutlet.id);
                          } else if (cat.id === 'hall') {
                            setNewTableNumber('HALL-');
                            setNewTableLocation(cat.defaultLoc);
                          } else {
                            setNewTableNumber('T-');
                            setNewTableLocation(cat.defaultLoc);
                            const resOutlet = outlets.find((o) => o.type === 'restaurant');
                            if (resOutlet) setNewTableOutletId(resOutlet.id);
                          }
                        }}
                        className={`p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSel
                            ? 'bg-[#4F0809] text-[#FFF8EB] border-[#D8AA67] shadow-xs'
                            : 'bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D] border-[#E8DFCE]'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                    Table / Room Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder="e.g. T-11, C-05, ROOM 102"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFCE] bg-[#F5ECDC] focus:bg-white text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none uppercase font-bold text-[#4F0809]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                    Seating Capacity
                  </label>
                  <RoyalSelect
                    value={newTableCapacity}
                    onChange={(val) => setNewTableCapacity(val)}
                    options={[
                      { value: '2', label: '2 Guests' },
                      { value: '4', label: '4 Guests (Standard)' },
                      { value: '6', label: '6 Guests' },
                      { value: '8', label: '8 Guests (Banquet)' },
                      { value: '12', label: '12 Guests (Royal Diwan)' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                  Outlet Dining Venue *
                </label>
                <RoyalSelect
                  value={newTableOutletId}
                  onChange={(val) => setNewTableOutletId(val)}
                  options={outlets.map((o) => ({
                    value: o.id,
                    label: `${o.name} (${o.type === 'restaurant' ? 'Restaurant' : 'Café'})`,
                    icon: o.type === 'restaurant' ? '🍽️' : '☕',
                  }))}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                  Floor Location / View
                </label>
                <input
                  type="text"
                  value={newTableLocation}
                  onChange={(e) => setNewTableLocation(e.target.value)}
                  placeholder="e.g. Courtyard Fountain, Royal Balcony, Suite Chamber"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFCE] bg-[#F5ECDC] focus:bg-white text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none text-[#4F0809]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                  Initial Status
                </label>
                <RoyalSelect
                  value={newTableStatus || 'available'}
                  onChange={(val) => setNewTableStatus(val as Table['status'])}
                  options={[
                    { value: 'available', label: 'Available (Ready for Guests)', dotColor: 'bg-emerald-600' },
                    { value: 'occupied', label: 'Occupied (Seated)', dotColor: 'bg-[#4F0809]' },
                    { value: 'reserved', label: 'Reserved', dotColor: 'bg-[#B78A48]' },
                    { value: 'cleaning', label: 'Needs Cleaning', dotColor: 'bg-amber-500' },
                  ]}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8DFCE]">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D] text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#4F0809] hover:bg-[#651012] text-[#FFF8EB] text-xs font-bold shadow-md transition cursor-pointer border border-[#D8AA67]/40 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D8AA67]" />
                  <span>Save Table / Room</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Table Confirmation (Palace Heritage Theme) ── */}
      {tableToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF8EE] border border-[#E8DFCE] rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center animate-fade-in text-[#4F0809]">
            <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 mx-auto flex items-center justify-center text-red-700 mb-3 shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3
              className="text-2xl font-bold text-[#4F0809]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Delete Table {tableToDelete.table_number}?
            </h3>

            <p className="text-xs text-[#856B4D] mt-2 mb-5 leading-relaxed">
              Are you sure you want to permanently delete dining table{' '}
              <strong className="text-[#4F0809] font-bold">{tableToDelete.table_number}</strong>
              {tableToDelete.location ? ` (${tableToDelete.location})` : ''}? This will remove its
              digital QR token and floor space.
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTableToDelete(null)}
                className="flex-1 py-2 rounded-xl bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D] text-xs font-bold transition cursor-pointer"
              >
                Keep Table
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteTable}
                className="flex-1 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-[#FFF8EB] text-xs font-bold shadow-md transition cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Reservation Confirmation (Palace Heritage Theme) ── */}
      {reservationToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF8EE] border border-[#E8DFCE] rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center animate-fade-in text-[#4F0809]">
            <div className="w-12 h-12 rounded-2xl bg-red-100 border border-red-200 mx-auto flex items-center justify-center text-red-700 mb-3 shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3
              className="text-2xl font-bold text-[#4F0809]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Delete Table Booking?
            </h3>

            <p className="text-xs text-[#856B4D] mt-2 mb-5 leading-relaxed">
              Are you sure you want to delete the reservation for{' '}
              <strong className="text-[#4F0809] font-bold">{reservationToDelete.guest_name}</strong> at Table{' '}
              <strong className="text-[#4F0809] font-bold">{reservationToDelete.table_number}</strong>?
            </p>

            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setReservationToDelete(null)}
                className="flex-1 py-2 rounded-xl bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D] text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteReservation}
                className="flex-1 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-[#FFF8EB] text-xs font-bold shadow-md transition cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Create Table Reservation (Palace Heritage Theme) ── */}
      {isNewResModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FDF8EE] border border-[#E8DFCE] rounded-3xl max-w-xl md:max-w-2xl w-full shadow-2xl relative text-[#4F0809] animate-fade-in my-8">
            {/* Royal Maroon Header */}
            <div className="bg-gradient-to-r from-[#4F0809] via-[#651012] to-[#4F0809] text-[#FFF8EB] p-6 relative border-b border-[#D8AA67]/40 rounded-t-3xl">
              <button
                type="button"
                onClick={() => setIsNewResModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#D8AA67] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#D8AA67]/20 border border-[#D8AA67]/40 flex items-center justify-center shrink-0 text-[#D8AA67] shadow-inner">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-[#D8AA67] tracking-[0.2em] uppercase">
                      Palace Hospitality
                    </span>
                    <span className="text-[#D8AA67] text-[8px]">&#9830;</span>
                    <span className="text-[10px] text-[#FFF8EB]/80 font-medium">Table Booking</span>
                  </div>
                  <h2
                    className="text-2xl font-bold text-[#FFF8EB] leading-tight"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Reserve Dining Table
                  </h2>
                </div>
              </div>
            </div>

            {formError && (
              <div className="m-4 p-2.5 bg-red-100 border border-red-300 text-red-900 rounded-xl text-xs flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-700 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateReservation} className="p-6 sm:p-7 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                  Guest Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formGuestName}
                  onChange={(e) => setFormGuestName(e.target.value)}
                  placeholder="e.g. Kunwar Vikramaditya"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFCE] bg-[#F5ECDC] focus:bg-white text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none text-[#4F0809]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+91 98290 12345"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFCE] bg-[#F5ECDC] focus:bg-white text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none text-[#4F0809]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                    Outlet Dining Venue
                  </label>
                  <RoyalSelect
                    value={formOutletId}
                    onChange={(val) => setFormOutletId(val)}
                    options={outlets.map((o) => ({
                      value: o.id,
                      label: `${o.name} (${o.type === 'restaurant' ? 'Restaurant' : 'Café'})`,
                      icon: o.type === 'restaurant' ? '🍽️' : '☕',
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                    Assigned Table
                  </label>
                  <RoyalSelect
                    value={formTableNumber}
                    onChange={(val) => setFormTableNumber(val)}
                    options={tables
                      .filter((t) => !formOutletId || t.outlet_id === formOutletId || t.table_number.toLowerCase().startsWith('room'))
                      .map((t) => ({
                        value: t.table_number,
                        label: `${t.table_number} (${t.capacity} seats - ${t.location || 'Area'})`,
                        icon: t.table_number.toLowerCase().startsWith('room') ? '🛏️' : '🍽️',
                      }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                    Reservation Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DFCE] bg-[#F5ECDC] focus:bg-white text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none text-[#4F0809] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                    Guests (Party Size)
                  </label>
                  <RoyalSelect
                    value={formPartySize}
                    onChange={(val) => setFormPartySize(val)}
                    options={[
                      { value: '2', label: '2 Guests' },
                      { value: '4', label: '4 Guests (Standard)' },
                      { value: '6', label: '6 Guests' },
                      { value: '8', label: '8 Guests (Banquet)' },
                      { value: '12', label: '12 Guests (Royal Diwan)' },
                      { value: '16', label: '16 Guests (Large Party)' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1">
                  Special Notes / Preferences
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Royal welcome, window seat preference, anniversary celebration, dietary preferences..."
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DFCE] bg-[#F5ECDC] focus:bg-white text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none text-[#4F0809]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E8DFCE]">
                <button
                  type="button"
                  onClick={() => setIsNewResModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D] text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#4F0809] hover:bg-[#651012] text-[#FFF8EB] text-xs font-bold shadow-md transition cursor-pointer border border-[#D8AA67]/40 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D8AA67]" />
                  <span>Confirm Table Booking</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Digital QR Token Preview (Palace Heritage Theme) ── */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF8EE] border border-[#E8DFCE] rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl relative text-center text-[#4F0809] animate-fade-in">
            {/* Royal Maroon Header */}
            <div className="bg-gradient-to-r from-[#4F0809] via-[#651012] to-[#4F0809] text-[#FFF8EB] p-4 relative border-b border-[#D8AA67]/40">
              <button
                type="button"
                onClick={() => setQrModalTable(null)}
                className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-[#D8AA67] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="w-10 h-10 rounded-2xl bg-[#D8AA67]/20 border border-[#D8AA67]/40 mx-auto flex items-center justify-center text-[#D8AA67] mb-1.5 shadow-inner">
                <QrCode className="w-5 h-5" />
              </div>

              <h3
                className="text-2xl font-bold text-[#FFF8EB] leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Table {qrModalTable.table_number} Digital Token
              </h3>
              <p className="text-[11px] text-[#FFF8EB]/80 mt-0.5 font-medium">
                Guests scan this token at the table to browse royal menu &amp; order direct
              </p>
            </div>

            <div className="p-5 space-y-3">
              {/* Venue Switcher for QR Target */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'restaurant', label: 'Restaurant', code: 'qr=r', icon: '🍽️' },
                  { id: 'cafe', label: 'Café', code: 'qr=c', icon: '☕' },
                  { id: 'room', label: 'In-Room', code: 'qr=room', icon: '🛏️' },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setQrVenue(v.id as any)}
                    className={`p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      qrVenue === v.id
                        ? 'border-[#D8AA67] bg-[#4F0809] text-[#FFF8EB] shadow-xs'
                        : 'border-[#E8DFCE] bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#856B4D]'
                    }`}
                  >
                    <span>{v.icon} {v.label}</span>
                    <span className={`text-[9px] font-mono ${qrVenue === v.id ? 'text-[#D8AA67]' : 'text-[#856B4D]'}`}>
                      ({v.code})
                    </span>
                  </button>
                ))}
              </div>

              {/* QR Code Container with Real Generated Scannable QR */}
              <div className="p-3 bg-[#FAF6EF] rounded-2xl border border-[#E8DFCE] inline-block mx-auto shadow-inner">
                <div className="w-48 h-48 bg-white border border-[#E8DFCE] rounded-xl p-2.5 flex flex-col items-center justify-center mx-auto shadow-xs">
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
                <div className="mt-2 text-[10px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Auto-Reserves Table on Scan
                </div>
              </div>

              {/* URL Display & Copy */}
              <div className="flex items-center gap-1.5 p-2.5 bg-[#FAF6EF] border border-[#E8DFCE] rounded-xl text-xs font-mono text-[#4F0809]">
                <span className="truncate flex-1 text-left text-[11px] font-semibold">
                  /menu?qr={qrVenue === 'room' ? 'room' : qrVenue === 'cafe' ? 'c' : 'r'}&amp;table={qrModalTable.table_number}
                </span>
                <button
                  type="button"
                  onClick={() => copyQRLink(qrModalTable.table_number)}
                  className="px-2.5 py-1 rounded-lg bg-[#4F0809] text-[#FFF8EB] hover:bg-[#651012] text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 border border-[#D8AA67]/40 shadow-xs"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-[#D8AA67]" /> : <Copy className="w-3 h-3 text-[#D8AA67]" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <a
                  href={`/menu?qr=${qrVenue === 'room' ? 'room' : qrVenue === 'cafe' ? 'c' : 'r'}&table=${encodeURIComponent(qrModalTable.table_number)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4F0809] hover:bg-[#651012] text-[#FFF8EB] text-xs font-bold shadow-md transition border border-[#D8AA67]/40"
                >
                  <span>Open Dining Token</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#D8AA67]" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
