'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  QrCode,
  Search,
  ExternalLink,
  Copy,
  Check,
  Printer,
  UtensilsCrossed,
  BedDouble,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Trash,
  X,
  Eye,
} from 'lucide-react';

interface QRRecord {
  id: string;
  table_id?: string;
  room_id?: string;
  type: 'table' | 'room';
  label: string;
  location: string;
  outletName: string;
  token: string;
  targetUrl: string;
  isActive: boolean;
  capacity?: number;
  qrDataUrl?: string;
}

export default function QRCodeManagementPage() {
  const [filterType, setFilterType] = useState<'all' | 'table' | 'room'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewQR, setPreviewQR] = useState<QRRecord | null>(null);
  const [qrRecords, setQrRecords] = useState<QRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add QR Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newVenue, setNewVenue] = useState<'restaurant' | 'cafe'>('restaurant');
  const [newTargetType, setNewTargetType] = useState<'table' | 'room' | 'hall'>('table');
  const [newOutlet, setNewOutlet] = useState('The Grand Darbar Restaurant');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newLocation, setNewLocation] = useState('Courtyard Royal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Load real QR records from backend API
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qr');
      if (res.ok) {
        const data = await res.json();
        const records: QRRecord[] = data.records || [];

        // Generate actual scannable QR DataURLs for each record
        const withQRs = await Promise.all(
          records.map(async (record) => {
            try {
              const fullUrl = `${window.location.origin}${record.targetUrl}`;
              const qrDataUrl = await QRCode.toDataURL(fullUrl, {
                width: 320,
                margin: 2,
                color: {
                  dark: '#4F0809',
                  light: '#FFFFFF',
                },
              });
              return { ...record, qrDataUrl };
            } catch {
              return record;
            }
          })
        );
        setQrRecords(withQRs);
      } else {
        showToast('error', 'Failed to load QR tokens.');
      }
    } catch {
      showToast('error', 'Network error connecting to QR service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    loadData();
  }, []);

  // Keyboard escape listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewQR(null);
        setIsAddModalOpen(false);
      }
    };
    if (previewQR || isAddModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewQR, isAddModalOpen]);

  // Filtered Records (Real-time)
  const filteredRecords = qrRecords.filter((qr) => {
    const matchesType = filterType === 'all' || qr.type === filterType;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && qr.isActive) ||
      (filterStatus === 'disabled' && !qr.isActive);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      qr.label.toLowerCase().includes(q) ||
      qr.location.toLowerCase().includes(q) ||
      qr.token.toLowerCase().includes(q) ||
      qr.outletName.toLowerCase().includes(q);
    return matchesType && matchesStatus && matchesSearch;
  });

  const handleCopy = (qr: QRRecord) => {
    const fullUrl = `${origin || ''}${qr.targetUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(qr.id);
    showToast('success', `Copied link for ${qr.label}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (qr: QRRecord) => {
    const nextStatus = !qr.isActive;
    // Optimistic UI update
    setQrRecords((prev) =>
      prev.map((r) => (r.id === qr.id ? { ...r, isActive: nextStatus } : r))
    );

    try {
      const res = await fetch('/api/qr', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: qr.id }),
      });
      if (res.ok) {
        showToast(
          'success',
          `${qr.label} QR is now ${nextStatus ? 'ACTIVE' : 'DISABLED'}.`
        );
      }
    } catch {
      showToast('error', 'Failed to toggle token state.');
    }
  };

  const handleDownloadQR = (qr: QRRecord) => {
    if (!qr.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qr.qrDataUrl;
    link.download = `rajmahal-${qr.token}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `Downloaded QR code for ${qr.label}`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Create real Table & QR Token
  const handleCreateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) {
      showToast('error', 'Please enter a valid identifier (e.g. T-42).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: newTableNumber.trim(),
          table_number: newTableNumber.trim(),
          venue: newVenue,
          target_type: newTargetType,
          outlet_id: newVenue === 'cafe' ? 'out-cafe' : 'out-restaurant',
          capacity: Number(newCapacity) || 4,
          location: `${newVenue === 'cafe' ? 'Café Courtyard' : 'Grand Darbar Restaurant'} (${newLocation})`,
        }),
      });

      if (res.ok) {
        showToast(
          'success',
          `Created QR for ${newTargetType.toUpperCase()} ${newTableNumber.trim()} (${newVenue === 'cafe' ? 'Café' : 'Restaurant'})`
        );
        setNewTableNumber('');
        setIsAddModalOpen(false);
        await loadData();
      } else {
        const err = await res.json();
        showToast('error', err.error || 'Failed to create QR token.');
      }
    } catch {
      showToast('error', 'Network error creating QR token.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete single QR Code
  const handleDeleteQR = async (qr: QRRecord) => {
    const confirmed = window.confirm(`Permanently delete ${qr.label} and its QR code?`);
    if (!confirmed) return;

    try {
      const deleteId = qr.table_id || qr.id;
      const res = await fetch(`/api/qr?id=${deleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setQrRecords((prev) => prev.filter((r) => r.id !== qr.id && r.table_id !== deleteId));
        showToast('success', `Deleted ${qr.label} QR token.`);
      } else {
        showToast('error', 'Failed to delete QR token.');
      }
    } catch {
      showToast('error', 'Error deleting QR token.');
    }
  };

  // Clear all QR Codes & Mock Data
  const handleClearAll = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear ALL QR codes and dining tables? This permanently deletes all mock and existing records.'
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/qr?clearAll=true', {
        method: 'DELETE',
      });
      if (res.ok) {
        setQrRecords([]);
        showToast('success', 'All QR codes and mock records cleared successfully.');
      } else {
        showToast('error', 'Failed to clear QR tokens.');
      }
    } catch {
      showToast('error', 'Error clearing QR tokens.');
    }
  };

  // Real Calculated Metrics
  const totalQRs = qrRecords.length;
  const tableQRs = qrRecords.filter((r) => r.type === 'table').length;
  const roomQRs = qrRecords.filter((r) => r.type === 'room').length;
  const activeQRs = qrRecords.filter((r) => r.isActive).length;

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
            Digital QR Table &amp; Dining Tokens
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Real scannable digital dining tokens, printable table standees, and instant guest self-ordering portals
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {totalQRs > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition cursor-pointer"
              title="Delete all mock or existing QR codes"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Clear All Data</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D8AA67]" />
            <span>Generate QR Code</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary (Real Live Data) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Total Palace Tokens
            </div>
            <div className="text-xl font-bold text-[#302421] mt-0.5">{totalQRs}</div>
            <div className="text-[10px] text-[#2E7D32] font-medium mt-0.5">{activeQRs} active live</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <QrCode className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Dining Tables
            </div>
            <div className="text-xl font-bold text-[#4F0809] mt-0.5">{tableQRs}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">Restaurant &amp; Café Floor</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <UtensilsCrossed className="w-4 h-4 text-[#4F0809]" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Suite QRs
            </div>
            <div className="text-xl font-bold text-[#B78A48] mt-0.5">{roomQRs}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">In-Room Royal Dining</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#B78A48]">
            <BedDouble className="w-4 h-4 text-[#B78A48]" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Active Tokens
            </div>
            <div className="text-xl font-bold text-[#2E7D32] mt-0.5">{activeQRs}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">{totalQRs - activeQRs} paused/disabled</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#2E7D32]/10 border border-[#2E7D32]/20 flex items-center justify-center text-[#2E7D32]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#81736D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by table, location, or token..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FBF6EF] border border-[#E8DCD2] rounded-lg text-[#302421] placeholder-[#81736D] focus:outline-none focus:border-[#4F0809]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <div className="inline-flex rounded-lg border border-[#E8DCD2] p-0.5 bg-[#FBF6EF]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                filterType === 'all' ? 'bg-[#4F0809] text-white shadow-2xs' : 'text-[#81736D] hover:text-[#302421]'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterType('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                filterType === 'table' ? 'bg-[#4F0809] text-white shadow-2xs' : 'text-[#81736D] hover:text-[#302421]'
              }`}
            >
              Tables
            </button>
            <button
              onClick={() => setFilterType('room')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                filterType === 'room' ? 'bg-[#4F0809] text-white shadow-2xs' : 'text-[#81736D] hover:text-[#302421]'
              }`}
            >
              Suites
            </button>
          </div>

          {/* Status Filter */}
          <div className="inline-flex rounded-lg border border-[#E8DCD2] p-0.5 bg-[#FBF6EF]">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                filterStatus === 'all' ? 'bg-[#4F0809] text-white shadow-2xs' : 'text-[#81736D] hover:text-[#302421]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                filterStatus === 'active' ? 'bg-[#2E7D32] text-white shadow-2xs' : 'text-[#81736D] hover:text-[#302421]'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('disabled')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                filterStatus === 'disabled' ? 'bg-red-700 text-white shadow-2xs' : 'text-[#81736D] hover:text-[#302421]'
              }`}
            >
              Disabled
            </button>
          </div>
        </div>
      </div>

      {/* ── QR Cards Grid ── */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-[#E8DCD2] rounded-2xl">
          <RefreshCw className="w-8 h-8 text-[#D8AA67] animate-spin mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#4F0809]">Generating palace scannable QR tokens...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#E8DCD2] rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#FBF6EF] border border-[#D8AA67] mx-auto flex items-center justify-center text-[#B78A48] shadow-inner mb-3">
            <QrCode className="w-8 h-8" />
          </div>
          <h3
            className="text-xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            No QR Codes in Catalog
          </h3>
          <p className="text-xs text-[#81736D] max-w-md mx-auto mt-1 mb-4">
            All mock data has been purged. Create your dining tables to automatically generate live, smartphone-scannable acrylic standees and guest ordering portals.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D8AA67]" />
            <span>Generate First Table QR</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRecords.map((qr) => (
            <div
              key={qr.id}
              className={`bg-white border rounded-2xl p-4 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                qr.isActive ? 'border-[#E8DCD2]' : 'border-red-200 bg-red-50/20 opacity-80'
              }`}
            >
              <div>
                {/* Top: Identifier & Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        qr.type === 'table' ? 'bg-[#4F0809] text-white' : 'bg-[#D8AA67] text-[#4F0809]'
                      }`}
                    >
                      {qr.type === 'table' ? (
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                      ) : (
                        <BedDouble className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <h3
                        className="text-base font-bold text-[#4F0809] leading-tight"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        {qr.label}
                      </h3>
                      <span className="text-[10px] font-mono text-[#81736D]">/qr/{qr.token}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(qr)}
                      title={qr.isActive ? 'Click to disable token' : 'Click to enable token'}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition cursor-pointer border ${
                        qr.isActive
                          ? 'bg-[#2E7D32]/15 text-[#2E7D32] border-[#2E7D32]/30'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }`}
                    >
                      {qr.isActive ? '● Active' : '● Disabled'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteQR(qr)}
                      className="p-1 rounded-lg text-[#81736D] hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                      title="Delete QR code"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* QR Code Scannable Preview & Details */}
                <div className="flex items-center gap-3 p-2.5 bg-[#FBF6EF] rounded-xl border border-[#E8DCD2] mb-3">
                  {/* Real Scannable QR Code Image */}
                  <div
                    onClick={() => setPreviewQR(qr)}
                    className="w-18 h-18 bg-white p-1 rounded-lg border border-[#E8DCD2] shadow-2xs shrink-0 cursor-pointer group relative overflow-hidden"
                    title="Click to expand & print QR"
                  >
                    {qr.qrDataUrl ? (
                      <img
                        src={qr.qrDataUrl}
                        alt={`QR code for ${qr.label}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <QrCode className="w-full h-full text-[#4F0809]" />
                    )}
                    <div className="absolute inset-0 bg-[#4F0809]/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Context */}
                  <div className="text-[11px] text-[#302421] min-w-0 flex-1">
                    <div className="text-[9px] uppercase font-bold text-[#81736D] tracking-wider truncate">
                      {qr.outletName}
                    </div>
                    <div className="font-semibold text-xs text-[#4F0809] truncate mt-0.5">
                      {qr.location}
                    </div>
                    <div className="font-mono text-[10px] text-[#4F0809] bg-white px-1.5 py-0.5 rounded border border-[#E8DCD2] truncate mt-1">
                      {qr.targetUrl}
                    </div>
                    <div className="text-[10px] text-[#2E7D32] font-medium mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#2E7D32]" />
                      <span>Ready for mobile scan</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 border-t border-[#E8DCD2] flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewQR(qr)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#FBF6EF] hover:bg-[#E8DCD2] text-[#4F0809] text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(qr)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] hover:bg-[#FBF6EF] text-[#302421] text-[11px] font-medium transition flex items-center gap-1 cursor-pointer"
                  title="Copy direct dining URL"
                >
                  {copiedId === qr.id ? (
                    <>
                      <Check className="w-3 h-3 text-[#2E7D32]" />
                      <span className="text-[#2E7D32] font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#81736D]" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <Link
                  href={qr.targetUrl}
                  target="_blank"
                  className="px-2.5 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                  title="Open live guest ordering menu"
                >
                  <ExternalLink className="w-3 h-3 text-[#D8AA67]" />
                  <span>Open</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: Create New Table QR Token ── */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E8DCD2] rounded-2xl max-w-md w-full p-6 shadow-2xl relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#FBF6EF] text-[#81736D] hover:text-[#4F0809] cursor-pointer transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#4F0809] text-[#D8AA67] flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h3
                  className="text-xl font-bold text-[#4F0809]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Generate Palace Dining QR Token
                </h3>
                <p className="text-xs text-[#81736D]">
                  Generates scannable QR that opens menu and reserves the table in database
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateQR} className="space-y-3.5">
              {/* Destination Type & Venue Selectors */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#4F0809]">
                  Service Channel / Destination Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'table', label: 'Table (Dine-In)', tag: 'table=' },
                    { id: 'room', label: 'In-Room Suite', tag: 'room=' },
                    { id: 'hall', label: 'Banquet Hall', tag: 'hall=' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewTargetType(t.id as any)}
                      className={`p-2 rounded-xl text-left border text-xs font-semibold transition cursor-pointer flex flex-col justify-between ${
                        newTargetType === t.id
                          ? 'border-[#4F0809] bg-[#4F0809] text-white'
                          : 'border-[#E8DCD2] bg-[#FBF6EF] text-[#4F0809] hover:bg-[#F6EAE0]'
                      }`}
                    >
                      <span className="leading-tight">{t.label}</span>
                      <span className={`text-[10px] font-mono mt-0.5 ${newTargetType === t.id ? 'text-[#D8AA67]' : 'text-[#81736D]'}`}>
                        {t.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Outlet Venue Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#4F0809] mb-1.5">
                  Palace Menu &amp; Venue
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'restaurant', label: 'Royal Restaurant', code: 'qr=r' },
                    { id: 'cafe', label: 'Courtyard Café', code: 'qr=c' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setNewVenue(v.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                        newVenue === v.id
                          ? 'border-[#4F0809] bg-[#4F0809] text-white'
                          : 'border-[#E8DCD2] bg-[#FBF6EF] text-[#4F0809] hover:bg-[#F6EAE0]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold leading-tight">{v.label}</div>
                        <div className={`text-[10px] font-mono ${newVenue === v.id ? 'text-[#D8AA67]' : 'text-[#81736D]'}`}>
                          {v.code}
                        </div>
                      </div>
                      {newVenue === v.id && <Check className="w-4 h-4 text-[#D8AA67]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Identifier */}
              <div>
                <label className="block text-xs font-semibold text-[#4F0809] mb-1">
                  {newTargetType === 'table' ? 'Table Number' : newTargetType === 'room' ? 'Room / Suite Number' : 'Hall Name / ID'} *
                </label>
                <input
                  type="text"
                  required
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder={newTargetType === 'table' ? 'e.g. T-42, T-01, VIP-1' : newTargetType === 'room' ? 'e.g. 204, Suite-A' : 'e.g. Durbar Hall'}
                  className="w-full px-3 py-2 text-xs bg-[#FBF6EF] border border-[#E8DCD2] rounded-xl text-[#302421] focus:outline-none focus:border-[#4F0809] font-medium"
                />
              </div>

              {/* Live Target URL Preview Box */}
              <div className="p-2.5 rounded-xl bg-[#F5ECDC]/90 border border-[#D8AA67]/60 text-xs">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#9C7A45] mb-1">
                  <span>Generated Target URL Preview</span>
                  <span className="text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded font-sans font-bold">Auto-Reserves Table</span>
                </div>
                <div className="font-mono text-[11px] text-[#4F0809] break-all font-semibold">
                  /menu?qr={newVenue === 'cafe' ? 'c' : 'r'}&amp;{newTargetType}={newTableNumber.trim() || 'T-42'}
                </div>
                <div className="text-[10px] text-[#81736D] mt-1 font-mono">
                  Also compatible with: menu?qr\{newVenue === 'cafe' ? 'c' : 'r'}&amp;{newTargetType}={newTableNumber.trim() || 'T-42'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#4F0809] mb-1">
                    Seating Capacity
                  </label>
                  <select
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FBF6EF] border border-[#E8DCD2] rounded-xl text-[#302421] focus:outline-none focus:border-[#4F0809]"
                  >
                    <option value="2">2 Guests</option>
                    <option value="4">4 Guests</option>
                    <option value="6">6 Guests</option>
                    <option value="8">8 Guests (Large)</option>
                    <option value="12">12 Guests (Royal Banquet)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#4F0809] mb-1">
                    Location / Zone
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Courtyard Royal, Window Garden"
                    className="w-full px-3 py-2 text-xs bg-[#FBF6EF] border border-[#E8DCD2] rounded-xl text-[#302421] focus:outline-none focus:border-[#4F0809]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#D8AA67]" />
                      <span>Create Real QR</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Bespoke Printable Standee & Preview ── */}
      {previewQR && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewQR(null)}
        >
          <div
            className="bg-white border border-[#E8DCD2] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewQR(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#FBF6EF] text-[#81736D] hover:text-[#4F0809] cursor-pointer transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Palace Standee Frame */}
            <div id="printable-standee" className="p-4 bg-[#FBF6EF] border-2 border-[#D8AA67] rounded-2xl mb-4 relative shadow-inner">
              {/* Palace Royal Brand */}
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#B78A48]">
                Rajmahal Heritage Grand
              </div>
              <h2
                className="text-2xl font-bold text-[#4F0809] mt-0.5"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {previewQR.label}
              </h2>
              <p className="text-xs text-[#81736D] mb-3">{previewQR.location}</p>

              {/* Genuine Scannable QR Code */}
              <div className="w-44 h-44 mx-auto p-2 bg-white border border-[#E8DCD2] rounded-xl flex items-center justify-center shadow-md mb-2">
                {previewQR.qrDataUrl ? (
                  <img
                    src={previewQR.qrDataUrl}
                    alt={`Scannable QR for ${previewQR.label}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <QrCode className="w-32 h-32 text-[#4F0809]" />
                )}
              </div>

              <div className="text-[10px] text-[#4F0809] font-medium leading-tight">
                Scan with any smartphone camera to browse our royal menu &amp; order direct to your seat.
              </div>
            </div>

            {/* Direct URL text & Copy */}
            <div className="flex items-center gap-1.5 p-2 bg-[#FBF6EF] border border-[#E8DCD2] rounded-lg text-xs font-mono text-[#4F0809] mb-4">
              <span className="truncate flex-1 text-left text-[11px]">
                {origin ? `${origin}${previewQR.targetUrl}` : previewQR.targetUrl}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(previewQR)}
                className="px-2 py-1 rounded bg-white border border-[#E8DCD2] text-[#4F0809] hover:bg-[#F6EAE0] text-[10px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedId === previewQR.id ? (
                  <Check className="w-3 h-3 text-[#2E7D32]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedId === previewQR.id ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Actions: Download PNG, Print Standee, Test Menu */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleDownloadQR(previewQR)}
                className="px-3 py-1.5 rounded-lg border border-[#E8DCD2] text-[#4F0809] hover:bg-[#FBF6EF] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg border border-[#D8AA67] bg-[#FBF6EF] text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#B78A48]" />
                <span>Print Standee</span>
              </button>

              <Link
                href={previewQR.targetUrl}
                target="_blank"
                className="px-3 py-1.5 rounded-lg bg-[#4F0809] text-white hover:bg-[#6B1518] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#D8AA67]" />
                <span>Open Live</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
