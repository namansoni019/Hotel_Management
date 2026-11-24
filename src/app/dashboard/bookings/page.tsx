'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  Search,
  Plus,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  LogOut as CheckOutIcon,
  LogIn as CheckInIcon,
  XCircle,
  Eye,
  AlertCircle,
  Phone,
  Mail,
  User,
  BedDouble,
  Calendar,
  Shield,
  ShieldCheck,
  Sparkles,
  Upload,
  FileCheck,
  Check,
  EyeOff,
  Image as ImageIcon,
  Trash2,
  ZoomIn,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { reservationsService } from '@/lib/services/reservations-service';
import { dataRepository } from '@/lib/data/repository';
import PalaceDatePicker from '@/components/ui/palace-date-picker';
import PalaceTimePicker from '@/components/ui/palace-time-picker';
import type { Reservation, RoomType, Room, GuestAadhaarDetail } from '@/lib/types';

function generateSampleAadhaarSvg(name: string, aadhaarNum: string): string {
  const safeName = (name || 'GUEST').toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  const safeNum = aadhaarNum || '5432 1098 7654';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" width="480" height="300">
    <rect width="480" height="300" rx="16" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="2"/>
    <rect x="0" y="0" width="480" height="12" rx="4" fill="#FF9933"/>
    <rect x="0" y="288" width="480" height="12" rx="4" fill="#138808"/>
    
    <text x="240" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#B91C1C">भारत सरकार | GOVERNMENT OF INDIA</text>
    <text x="240" y="55" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#4B5563">Unique Identification Authority of India</text>
    
    <rect x="30" y="75" width="100" height="125" rx="6" fill="#F3F4F6" stroke="#9CA3AF" stroke-width="1.5"/>
    <circle cx="80" cy="120" r="28" fill="#D1D5DB"/>
    <path d="M 45 185 Q 80 145 115 185 Z" fill="#9CA3AF"/>
    <text x="80" y="215" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#047857">✓ VERIFIED</text>
    
    <text x="150" y="95" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">Name / नाम</text>
    <text x="150" y="115" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#111827">${safeName}</text>
    
    <text x="150" y="140" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">DOB: 15/08/1990</text>
    <text x="150" y="158" font-family="Arial, sans-serif" font-size="10" fill="#6B7280">Gender / लिंग: MALE / FEMALE</text>
    <text x="150" y="176" font-family="Arial, sans-serif" font-size="9" fill="#059669">Verified by Rajmahal Palace Security</text>

    <rect x="360" y="75" width="90" height="90" rx="4" fill="#1F2937"/>
    <rect x="370" y="85" width="25" height="25" fill="#FFFFFF"/>
    <rect x="415" y="85" width="25" height="25" fill="#FFFFFF"/>
    <rect x="370" y="130" width="25" height="25" fill="#FFFFFF"/>
    <rect x="405" y="120" width="15" height="15" fill="#FFFFFF"/>
    <text x="405" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#6B7280">Secure QR</text>

    <rect x="30" y="230" width="420" height="42" rx="8" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="1"/>
    <text x="240" y="258" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="20" font-weight="bold" letter-spacing="3" fill="#DC2626">${safeNum}</text>
    <text x="240" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#B91C1C">मेरा आधार, मेरी पहचान</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface FormGuestAadhaar {
  fullName: string;
  aadhaarNumber: string;
  aadhaarImage: string;
}

const BOOKING_ROOM_CATEGORIES = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    name: 'Deluxe Room',
    badge: 'ROYAL LUXURY',
    price: '₹6,500',
    fullLabel: 'Deluxe Room (₹6,500)',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    name: 'Non-Deluxe Room',
    badge: 'HERITAGE STANDARD',
    price: '₹4,500',
    fullLabel: 'Non-Deluxe Room (₹4,500)',
  },
] as const;

export default function RoomBookingsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<Reservation | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // New Booking form state
  const [formGuestName, setFormGuestName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRoomTypeId, setFormRoomTypeId] = useState('d0000000-0000-0000-0000-000000000001');
  const [formRoomId, setFormRoomId] = useState('');
  const [formCheckIn, setFormCheckIn] = useState('2026-10-19');
  const [formCheckOut, setFormCheckOut] = useState('2026-10-21');
  const [formCheckInTime, setFormCheckInTime] = useState('12:00 PM');
  const [formCheckOutTime, setFormCheckOutTime] = useState('11:00 AM');
  const [formPartySize, setFormPartySize] = useState('2');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Aadhaar details for each guest
  const [formGuestAadhaars, setFormGuestAadhaars] = useState<FormGuestAadhaar[]>([
    { fullName: '', aadhaarNumber: '', aadhaarImage: '' },
    { fullName: '', aadhaarNumber: '', aadhaarImage: '' },
  ]);

  const fetchRoomsAndTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        if (data.rooms && Array.isArray(data.rooms)) {
          setRooms(data.rooms);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rajmahal_rooms', JSON.stringify(data.rooms));
          }
        }
        if (data.roomTypes && Array.isArray(data.roomTypes)) {
          setRoomTypes(data.roomTypes);
        }
      }
    } catch (err) {
      console.warn('Error fetching /api/rooms in bookings:', err);
    }
  }, []);

  useEffect(() => {
    // 1. Initial hydration from cache & memory repository
    const rts = dataRepository.getRoomTypes();
    setRoomTypes(rts);

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('rajmahal_rooms');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRooms(parsed);
          } else {
            setRooms(dataRepository.getRooms());
          }
        } else {
          setRooms(dataRepository.getRooms());
        }
      } catch {
        setRooms(dataRepository.getRooms());
      }
    } else {
      setRooms(dataRepository.getRooms());
    }

    setFormCheckIn(new Date().toISOString().split('T')[0]);
    setFormCheckOut(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);

    // 2. Fetch live data from /api/rooms
    fetchRoomsAndTypes();

    // 3. Subscriptions to Firestore
    const unsubRes = onSnapshot(
      collection(db, 'reservations'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Reservation[];
          list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          setReservations(list);
        } else {
          setReservations(dataRepository.getReservations());
        }
      },
      () => setReservations(dataRepository.getReservations())
    );

    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          const typeList = dataRepository.getRoomTypes();
          const liveRooms = snap.docs.map((d) => {
            const data = d.data();
            const typeId = data.room_type_id || typeList[0]?.id;
            const matchedType = typeList.find((rt) => rt.id === typeId) || typeList[0];
            return {
              id: d.id,
              room_number: data.room_number,
              room_type_id: typeId,
              housekeeping_state: data.housekeeping_state || 'available',
              notes: data.notes || null,
              images: data.images || data.photos || [],
              photos: data.photos || data.images || [],
              room_type: data.room_type || matchedType,
            } as Room;
          });
          setRooms(liveRooms);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rajmahal_rooms', JSON.stringify(liveRooms));
          }
        }
      },
      () => {}
    );

    return () => {
      unsubRes();
      unsubRooms();
    };
  }, [fetchRoomsAndTypes]);

  const loadData = () => {
    fetchRoomsAndTypes();
  };

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const q = searchQuery.toLowerCase();
      const guestName = r.guest?.name?.toLowerCase() || '';
      const ref = r.reference_code.toLowerCase();
      const phone = r.guest?.phone?.toLowerCase() || '';
      const matchesSearch = !q || guestName.includes(q) || ref.includes(q) || phone.includes(q);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reservations, searchQuery, statusFilter]);

  // Metrics
  const totalCount = reservations.length;
  const arrivalsToday = reservations.filter(
    (r) => r.status === 'confirmed' || r.status === 'checked_in'
  ).length;
  const checkedInCount = reservations.filter((r) => r.status === 'checked_in').length;
  const pendingCount = reservations.filter((r) => r.status === 'pending').length;

  // Actions
  const handleUpdateStatus = async (id: string, newStatus: Reservation['status']) => {
    try {
      await reservationsService.updateReservationStatus(id, newStatus);
    } catch {
      dataRepository.updateReservationStatus(id, newStatus);
    }
    if (selectedBooking && selectedBooking.id === id) {
      setSelectedBooking({ ...selectedBooking, status: newStatus });
    }
  };

  const handlePartySizeChange = (newSizeStr: string) => {
    setFormPartySize(newSizeStr);
    const count = parseInt(newSizeStr) || 2;
    setFormGuestAadhaars((prev) => {
      const updated: FormGuestAadhaar[] = [];
      for (let i = 0; i < count; i++) {
        if (prev[i]) {
          updated.push(prev[i]);
        } else {
          updated.push({
            fullName: i === 0 ? formGuestName : '',
            aadhaarNumber: '',
            aadhaarImage: '',
          });
        }
      }
      return updated;
    });
  };

  const handleGuestNameChange = (val: string) => {
    setFormGuestName(val);
    setFormGuestAadhaars((prev) => {
      const next = [...prev];
      if (next.length > 0) {
        next[0] = { ...next[0], fullName: val };
      }
      return next;
    });
  };

  const handleAadhaarNumChange = (index: number, val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 12);
    const formatted = digitsOnly.match(/.{1,4}/g)?.join(' ') || digitsOnly;
    setFormGuestAadhaars((prev) => {
      const next = [...prev];
      if (!next[index]) {
        next[index] = { fullName: '', aadhaarNumber: '', aadhaarImage: '' };
      }
      next[index] = { ...next[index], aadhaarNumber: formatted };
      return next;
    });
  };

  const handleGuestSpecificNameChange = (index: number, val: string) => {
    setFormGuestAadhaars((prev) => {
      const next = [...prev];
      if (!next[index]) {
        next[index] = { fullName: '', aadhaarNumber: '', aadhaarImage: '' };
      }
      next[index] = { ...next[index], fullName: val };
      return next;
    });
  };

  const handleAadhaarFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormGuestAadhaars((prev) => {
        const next = [...prev];
        if (!next[index]) {
          next[index] = { fullName: '', aadhaarNumber: '', aadhaarImage: '' };
        }
        next[index] = { ...next[index], aadhaarImage: base64 };
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateSampleAadhaar = (index: number) => {
    const current = formGuestAadhaars[index] || { fullName: '', aadhaarNumber: '', aadhaarImage: '' };
    const gName = current.fullName.trim() || (index === 0 ? formGuestName.trim() : `Guest ${index + 1}`) || `Palace Guest ${index + 1}`;
    const cleanNum = current.aadhaarNumber.replace(/\D/g, '');
    const randomAadhaar = cleanNum.length === 12
      ? current.aadhaarNumber
      : `${Math.floor(2000 + Math.random() * 7000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
    const sampleSvg = generateSampleAadhaarSvg(gName, randomAadhaar);

    setFormGuestAadhaars((prev) => {
      const next = [...prev];
      next[index] = {
        fullName: gName,
        aadhaarNumber: randomAadhaar,
        aadhaarImage: sampleSvg,
      };
      return next;
    });
  };

  const handleRemoveAadhaarImage = (index: number) => {
    setFormGuestAadhaars((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], aadhaarImage: '' };
      }
      return next;
    });
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formGuestName.trim() || !formPhone.trim() || !formRoomTypeId) {
      setFormError('Please fill in Primary Guest Name, Mobile Phone, and Room Category.');
      return;
    }

    const partyCount = parseInt(formPartySize) || 2;
    // Strict Verification: check all adult guests have valid Aadhaar Number and Aadhaar Image
    for (let i = 0; i < partyCount; i++) {
      const g = formGuestAadhaars[i];
      const gName = (i === 0 ? formGuestName : g?.fullName)?.trim() || '';
      const cleanAadhaar = (g?.aadhaarNumber || '').replace(/\D/g, '');

      if (!gName) {
        setFormError(`Adult ${i + 1}: Full Name is mandatory for Government ID verification.`);
        return;
      }
      if (cleanAadhaar.length !== 12) {
        setFormError(`Adult ${i + 1} (${gName}): Valid 12-digit Aadhaar Number is mandatory (Currently ${cleanAadhaar.length} digits).`);
        return;
      }
      if (!g?.aadhaarImage) {
        setFormError(`Adult ${i + 1} (${gName}): Aadhaar Card Photo/Document is mandatory for verification.`);
        return;
      }
    }

    const aadhaarDetailsPayload: GuestAadhaarDetail[] = formGuestAadhaars.slice(0, partyCount).map((g, idx) => ({
      guest_index: idx + 1,
      full_name: (idx === 0 ? formGuestName : g.fullName).trim(),
      aadhaar_number: g.aadhaarNumber.trim(),
      aadhaar_image_url: g.aadhaarImage,
      is_verified: true,
    }));

    try {
      await reservationsService.createReservation({
        guestName: formGuestName.trim(),
        guestPhone: formPhone.trim(),
        guestEmail: formEmail.trim(),
        roomTypeId: formRoomTypeId,
        roomId: formRoomId || undefined,
        checkIn: formCheckIn,
        checkOut: formCheckOut,
        checkInTime: formCheckInTime,
        checkOutTime: formCheckOutTime,
        partySize: partyCount,
        notes: formNotes.trim(),
        aadhaarDetails: aadhaarDetailsPayload,
      });
    } catch {
      dataRepository.createReservation({
        guestName: formGuestName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        roomTypeId: formRoomTypeId,
        roomId: formRoomId || undefined,
        checkIn: formCheckIn,
        checkOut: formCheckOut,
        checkInTime: formCheckInTime,
        checkOutTime: formCheckOutTime,
        partySize: partyCount,
        notes: formNotes.trim(),
        aadhaarDetails: aadhaarDetailsPayload,
      });
    }

    setIsNewModalOpen(false);
    setFormGuestName('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
    setFormError('');
    setFormCheckInTime('12:00 PM');
    setFormCheckOutTime('11:00 AM');
    setFormGuestAadhaars([
      { fullName: '', aadhaarNumber: '', aadhaarImage: '' },
      { fullName: '', aadhaarNumber: '', aadhaarImage: '' },
    ]);
    loadData();
  };

  const handleExportCSV = () => {
    const headers = ['Booking ID,Guest Name,Phone,Room Type,Room Number,Check-In Date,Check-In Time,Check-Out Date,Check-Out Time,Guests,Status,Amount'];
    const rows = filteredReservations.map((r) => [
      `"${r.reference_code}"`,
      `"${r.guest?.name || 'Walk-in'}"`,
      `"${r.guest?.phone || ''}"`,
      `"${r.room_type?.name || 'Heritage Suite'}"`,
      `"${r.room?.room_number || 'TBD'}"`,
      `"${new Date(r.check_in).toLocaleDateString()}"`,
      `"${r.check_in_time || '12:00 PM'}"`,
      `"${new Date(r.check_out).toLocaleDateString()}"`,
      `"${r.check_out_time || '11:00 AM'}"`,
      r.party_size,
      r.status,
      `"₹${(r.rate_snapshot_minor / 100).toLocaleString()}"`,
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rajmahal_bookings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            Room Bookings &amp; Royal Stays
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Manage palace reservations, check-ins, guest folios, and suite allocations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
            New Royal Booking
          </button>
        </div>
      </div>

      {/* ── 4 Metric Overview Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Total Bookings
            </div>
            <div className="text-xl font-bold text-[#302421] mt-0.5">{totalCount}</div>
            <div className="text-[10px] text-[#2E7D32] font-medium mt-0.5">Active ledger</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              In-House Guests
            </div>
            <div className="text-xl font-bold text-[#4F0809] mt-0.5">{checkedInCount}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">Currently checked in</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <CheckInIcon className="w-4 h-4 text-[#2E7D32]" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Arrivals Scheduled
            </div>
            <div className="text-xl font-bold text-[#302421] mt-0.5">{arrivalsToday}</div>
            <div className="text-[10px] text-[#B78A48] font-medium mt-0.5">Confirmed suites</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <Clock className="w-4 h-4 text-[#B78A48]" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Pending Approval
            </div>
            <div className="text-xl font-bold text-[#D97706] mt-0.5">{pendingCount}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">Awaiting deposit/ID</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <AlertCircle className="w-4 h-4 text-[#D97706]" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#81736D]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search booking ID, guest, or phone..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: 'All Bookings', value: 'all' },
            { label: 'Confirmed', value: 'confirmed' },
            { label: 'Checked In', value: 'checked_in' },
            { label: 'Pending', value: 'pending' },
            { label: 'Checked Out', value: 'checked_out' },
            { label: 'Cancelled', value: 'cancelled' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? 'bg-[#4F0809] text-white shadow-xs'
                  : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Registered Palace Chambers Live Inventory Strip ── */}
      <div className="bg-[#FDF8EE] border border-[#E8DFCE] rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4F0809] text-[#D8AA67] flex items-center justify-center shrink-0">
              <BedDouble className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="text-base font-bold text-[#4F0809]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Palace Chambers Inventory ({rooms.length})
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D8AA67]/20 text-[#6B4E1B] border border-[#D8AA67]/40">
                  Deluxe &amp; Non-Deluxe
                </span>
              </div>
              <p className="text-[11px] text-[#81736D]">
                Click any chamber to quickly assign or book in this reservation ledger
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/rooms"
            className="self-start sm:self-center text-xs font-bold text-[#4F0809] hover:text-[#6B1518] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E8DCD2] hover:bg-[#F6EAE0] transition"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
            <span>Manage Chambers</span>
          </Link>
        </div>

        {rooms.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#81736D] bg-white rounded-xl border border-[#E8DCD2]">
            No palace chambers registered yet. Visit{' '}
            <Link href="/dashboard/rooms" className="text-[#4F0809] font-bold underline">
              Rooms &amp; Availability
            </Link>{' '}
            to register your first Deluxe or Non-Deluxe chamber.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {rooms.map((r) => {
              const isAvailable = !r.housekeeping_state || r.housekeeping_state.toLowerCase() === 'available';
              const isOccupied = r.housekeeping_state?.toLowerCase() === 'occupied';
              const isDeluxe = r.room_type?.name ? !r.room_type.name.toLowerCase().includes('non') : true;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setFormRoomId(r.id);
                    if (r.room_type_id) setFormRoomTypeId(r.room_type_id);
                    setIsNewModalOpen(true);
                  }}
                  title={`Click to book Room ${r.room_number}`}
                  className={`p-2.5 rounded-xl border text-left transition hover:scale-[1.02] cursor-pointer ${
                    isAvailable
                      ? 'bg-white border-[#E8DCD2] hover:border-[#4F0809] shadow-2xs'
                      : isOccupied
                      ? 'bg-[#4F0809] text-white border-[#4F0809]'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">Room {r.room_number}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isAvailable ? 'bg-emerald-500' : isOccupied ? 'bg-red-300' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                  <div
                    className={`text-[10px] truncate font-medium mt-0.5 ${
                      isOccupied ? 'text-white/80' : 'text-[#856B4D]'
                    }`}
                  >
                    {isDeluxe ? 'Deluxe' : 'Non-Deluxe'}
                  </div>
                  <div
                    className={`text-[9px] uppercase tracking-wider font-bold mt-1 ${
                      isAvailable ? 'text-emerald-700' : isOccupied ? 'text-white/90' : 'text-amber-800'
                    }`}
                  >
                    {isAvailable ? '● Available' : isOccupied ? '● Occupied' : '● In Service'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bookings Table ── */}
      <div className="bg-white border border-[#E8DCD2] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8DCD2] bg-[#FBF6EF]/75 text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
                <th className="py-2.5 px-3">Booking ID</th>
                <th className="py-2.5 px-3">Guest Details</th>
                <th className="py-2.5 px-3">Allocated Room</th>
                <th className="py-2.5 px-3">Dates (In / Out)</th>
                <th className="py-2.5 px-3">Guests</th>
                <th className="py-2.5 px-3">Govt ID (Aadhaar)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCD2]/70 text-[#302421]">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#81736D]">
                    No bookings found matching your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => {
                  const checkInStr = new Date(res.check_in).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  });
                  const checkOutStr = new Date(res.check_out).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  });
                  const amount = (res.rate_snapshot_minor / 100).toLocaleString('en-IN');

                  return (
                    <tr key={res.id} className="hover:bg-[#FBF6EF]/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#4F0809]">
                        {res.reference_code}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#302421]">{res.guest?.name || 'Walk-in Guest'}</div>
                        <div className="text-[10px] text-[#81736D]">{res.guest?.phone || 'No phone'}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#302421]">
                          {res.room?.room_number
                            ? `Room ${res.room.room_number}`
                            : res.room_id
                            ? `Room ${rooms.find((r) => r.id === res.room_id)?.room_number || res.room_id}`
                            : 'Unassigned'}
                        </div>
                        <div className="text-[10px] text-[#81736D]">
                          {res.room_type?.name ||
                            rooms.find((r) => r.id === res.room_id)?.room_type?.name ||
                            'Deluxe Room'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#302421]">
                        <div className="font-semibold">{checkInStr} → {checkOutStr}</div>
                        <div className="text-[10px] text-[#81736D] flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-[#D8AA67]" />
                          <span>{res.check_in_time || '12:00 PM'} – {res.check_out_time || '11:00 AM'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">{res.party_size} Guests</td>
                      <td className="py-2.5 px-3">
                        {res.aadhaar_details && res.aadhaar_details.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/30">
                              <ShieldCheck className="w-3 h-3 text-[#2E7D32]" />
                              {res.aadhaar_details.length}/{res.party_size} Aadhaar
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            ID Pending
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            res.status === 'checked_in'
                              ? 'bg-[#2E7D32]/15 text-[#2E7D32]'
                              : res.status === 'confirmed'
                              ? 'bg-[#B78A48]/15 text-[#8F6628]'
                              : res.status === 'pending'
                              ? 'bg-[#D97706]/15 text-[#D97706]'
                              : res.status === 'checked_out'
                              ? 'bg-[#81736D]/15 text-[#81736D]'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {res.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#302421]">₹{amount}</td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBooking(res)}
                            className="px-2 py-1 rounded bg-[#FBF6EF] hover:bg-[#E8DCD2] text-[#4F0809] font-medium text-[11px] transition"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5 inline mr-1" />
                            View
                          </button>
                          {res.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateStatus(res.id, 'checked_in')}
                              className="px-2 py-1 rounded bg-[#2E7D32] hover:bg-[#256629] text-white font-medium text-[11px] transition"
                            >
                              Check-In
                            </button>
                          )}
                          {res.status === 'checked_in' && (
                            <button
                              onClick={() => handleUpdateStatus(res.id, 'checked_out')}
                              className="px-2 py-1 rounded bg-[#81736D] hover:bg-[#5C514B] text-white font-medium text-[11px] transition"
                            >
                              Check-Out
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="py-2 px-3 bg-[#FBF6EF]/50 border-t border-[#E8DCD2] text-[11px] text-[#81736D] flex justify-between items-center">
          <span>Showing {filteredReservations.length} of {totalCount} reservations</span>
          <span className="font-serif italic text-[#4F0809]">Rajmahal Palace Central Reservations</span>
        </div>
      </div>

      {/* ── Booking Detail Modal ── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF8EE] border border-[#D8AA67]/40 rounded-3xl max-w-lg w-full shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col">
            {/* Royal Maroon Header */}
            <div className="bg-gradient-to-r from-[#4F0809] via-[#651012] to-[#4F0809] px-6 py-4.5 border-b border-[#D8AA67]/40 flex items-center justify-between text-[#FFF8EB] flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D8AA67]/20 border border-[#D8AA67]/40 flex items-center justify-center text-[#D8AA67]">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#D8AA67]">
                      {selectedBooking.reference_code}
                    </span>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#FFF8EB]">
                      {selectedBooking.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h2
                    className="text-xl font-bold tracking-wide"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Palace Stay Folio Details
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#FFF8EB] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs text-[#302421] overflow-y-auto">
              <div className="p-3.5 bg-[#F5ECDC] rounded-2xl border border-[#E8DFCE] space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-sm text-[#4F0809]">
                  <User className="w-4 h-4 text-[#D8AA67]" />
                  {selectedBooking.guest?.name || 'Walk-in Guest'}
                </div>
                <div className="flex items-center gap-4 text-[#856B4D]">
                  <span className="flex items-center gap-1 font-medium">
                    <Phone className="w-3.5 h-3.5" />
                    {selectedBooking.guest?.phone || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Mail className="w-3.5 h-3.5" />
                    {selectedBooking.guest?.email || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-[#F5ECDC] border border-[#E8DFCE] rounded-xl">
                  <div className="text-[10px] text-[#856B4D] uppercase font-bold tracking-wider">Room Allocation</div>
                  <div className="font-bold text-sm mt-0.5 text-[#4F0809]">
                    {selectedBooking.room?.room_number ? `Room ${selectedBooking.room.room_number}` : 'Room 101'}
                  </div>
                  <div className="text-[10px] text-[#856B4D] font-medium">
                    {selectedBooking.room_type?.name || 'Deluxe Room'}
                  </div>
                </div>

                <div className="p-3 bg-[#F5ECDC] border border-[#E8DFCE] rounded-xl">
                  <div className="text-[10px] text-[#856B4D] uppercase font-bold tracking-wider">Rate &amp; Folio</div>
                  <div className="font-bold text-sm mt-0.5 text-[#4F0809]">
                    ₹{(selectedBooking.rate_snapshot_minor / 100).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-[#2E7D32] font-semibold">Paid / Confirmed Guarantee</div>
                </div>
              </div>

              <div className="p-3.5 bg-[#F5ECDC] border border-[#E8DFCE] rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#856B4D] font-semibold">Check-In:</span>
                  <span className="font-bold text-[#4F0809]">
                    {new Date(selectedBooking.check_in).toLocaleDateString()}
                    <span className="text-xs text-[#856B4D] font-medium ml-1.5">
                      at {selectedBooking.check_in_time || '12:00 PM'}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#856B4D] font-semibold">Check-Out:</span>
                  <span className="font-bold text-[#4F0809]">
                    {new Date(selectedBooking.check_out).toLocaleDateString()}
                    <span className="text-xs text-[#856B4D] font-medium ml-1.5">
                      at {selectedBooking.check_out_time || '11:00 AM'}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#856B4D] font-semibold">Party Size:</span>
                  <span className="font-bold text-[#4F0809]">{selectedBooking.party_size} Adults / Guests</span>
                </div>
                {selectedBooking.notes && (
                  <div className="mt-2 pt-2 border-t border-[#E8DFCE] text-[11px] text-[#856B4D]">
                    <span className="font-bold text-[#4F0809]">Special Request: </span>
                    {selectedBooking.notes}
                  </div>
                )}
              </div>

              {/* Mandatory Aadhaar Identification Dossier */}
              <div className="p-3.5 bg-[#FAF8F3] border-2 border-[#D8AA67]/50 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#4F0809]">
                    <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
                    <span>Government Aadhaar Dossier ({selectedBooking.aadhaar_details?.length || 0}/{selectedBooking.party_size} Verified)</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-2 py-0.5 rounded-full">
                    Police Verification Compliant
                  </span>
                </div>

                {(!selectedBooking.aadhaar_details || selectedBooking.aadhaar_details.length === 0) ? (
                  <p className="text-[11px] text-[#856B4D] italic">
                    No Aadhaar documents registered for this booking.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {selectedBooking.aadhaar_details.map((detail, idx) => (
                      <div key={idx} className="p-2.5 bg-[#FDF8EE] rounded-xl border border-[#E8DFCE] shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#856B4D] uppercase">
                            Adult {detail.guest_index || idx + 1}
                          </span>
                          <span className="text-[9px] font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        </div>
                        <div className="font-bold text-xs text-[#4F0809] truncate">
                          {detail.full_name}
                        </div>
                        <div className="font-mono text-[11px] text-[#4F0809] font-bold tracking-wider">
                          {detail.aadhaar_number}
                        </div>
                        {detail.aadhaar_image_url && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setLightboxImage({ url: detail.aadhaar_image_url!, title: `${detail.full_name} — Aadhaar Card (${detail.aadhaar_number})` })}
                              className="group relative w-full h-24 rounded-lg border border-[#E8DFCE] overflow-hidden bg-stone-50 flex items-center justify-center cursor-pointer hover:border-[#4F0809] transition"
                            >
                              <img
                                src={detail.aadhaar_image_url}
                                alt={`Aadhaar Card of ${detail.full_name}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-white text-[10px] font-semibold transition">
                                <ZoomIn className="w-3.5 h-3.5" />
                                Inspect Card
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E8DFCE]">
                {selectedBooking.status === 'confirmed' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'checked_in')}
                    className="px-4 py-2 rounded-xl bg-[#2E7D32] text-white font-bold hover:bg-[#256629] transition shadow-xs cursor-pointer"
                  >
                    Confirm Check-In
                  </button>
                )}
                {selectedBooking.status === 'checked_in' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'checked_out')}
                    className="px-4 py-2 rounded-xl bg-[#4F0809] text-[#FFF8EB] font-bold hover:bg-[#651012] transition shadow-xs cursor-pointer"
                  >
                    Process Check-Out
                  </button>
                )}
                {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'checked_out' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}
                    className="px-4 py-2 rounded-xl border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 font-bold transition cursor-pointer"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── New Royal Booking Modal ── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF8EE] border border-[#D8AA67]/40 rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Royal Maroon Header */}
            <div className="bg-gradient-to-r from-[#4F0809] via-[#651012] to-[#4F0809] px-6 py-4.5 border-b border-[#D8AA67]/40 flex items-center justify-between text-[#FFF8EB] sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D8AA67]/20 border border-[#D8AA67]/40 flex items-center justify-center text-[#D8AA67]">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#D8AA67] block">
                    Palace Reservations • PMS Central Ledger
                  </span>
                  <h2
                    className="text-xl font-bold tracking-wide"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    New Royal Suite Reservation
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#FFF8EB] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#F5ECDC] border border-[#E8DFCE] text-[#856B4D] text-[11px] leading-relaxed">
                Create an official room booking on Rajmahal Heritage PMS ledger with police-compliant Aadhaar verification.
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
                {/* Primary Guest Full Name */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                    Primary Guest Full Name *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-serif font-bold text-[#9C7A45]">
                      ♚
                    </span>
                    <input
                      type="text"
                      required
                      value={formGuestName}
                      onChange={(e) => handleGuestNameChange(e.target.value)}
                      placeholder="e.g. Maharaja Vikramaditya Singh"
                      className="w-full h-11 pl-9 pr-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/50 font-semibold"
                    />
                  </div>
                </div>

                {/* Mobile Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                      Mobile Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/50 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="guest@heritage.in"
                      className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/50 font-semibold"
                    />
                  </div>
                </div>

                {/* Room Category (Strictly ONE selection: Deluxe vs Non-Deluxe) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D]">
                      Room Category *
                    </label>
                    <span className="text-[10px] font-semibold text-[#9C7A45]">
                      Deluxe or Non-Deluxe
                    </span>
                  </div>

                  {/* Strictly The Two Luxury Cards - No Duplicate Select Dropdown */}
                  <div className="grid grid-cols-2 gap-3">
                    {BOOKING_ROOM_CATEGORIES.map((cat) => {
                      const isSelected = formRoomTypeId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormRoomTypeId(cat.id)}
                          className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#4F0809] bg-[#4F0809] text-[#FFF8EB] shadow-md ring-1 ring-[#D8AA67]'
                              : 'border-[#E8DFCE] bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#D8AA67]' : 'text-[#856B4D]'}`}>
                              {cat.badge}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#D8AA67]" />}
                          </div>
                          <div className="font-bold text-sm sm:text-base leading-snug">
                            {cat.name}
                          </div>
                          <div className={`text-[11px] font-medium mt-1 ${isSelected ? 'text-[#FFF8EB]/80' : 'text-[#856B4D]'}`}>
                            {cat.price} / night
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Guest Count & Specific Chamber Allocation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                      Guest Count (Adults) *
                    </label>
                    <select
                      value={formPartySize}
                      onChange={(e) => handlePartySizeChange(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#E8DFCE] text-xs sm:text-sm bg-[#F5ECDC] focus:bg-[#EFE2CC] font-semibold text-[#4F0809] focus:border-[#4F0809] focus:outline-none cursor-pointer"
                    >
                      <option value="1">1 Adult (1 Aadhaar required)</option>
                      <option value="2">2 Adults (Both 2 Aadhaars required)</option>
                      <option value="3">3 Adults (All 3 Aadhaars required)</option>
                      <option value="4">4 Guests / Family (All 4 Aadhaars required)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                      Specific Chamber (Optional)
                    </label>
                    <select
                      value={formRoomId}
                      onChange={(e) => {
                        const chosenId = e.target.value;
                        setFormRoomId(chosenId);
                        const found = rooms.find((r) => r.id === chosenId);
                        if (found?.room_type_id) {
                          setFormRoomTypeId(found.room_type_id);
                        }
                      }}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#E8DFCE] text-xs sm:text-sm bg-[#F5ECDC] focus:bg-[#EFE2CC] text-[#4F0809] font-medium focus:border-[#4F0809] focus:outline-none cursor-pointer"
                    >
                      <option value="">Auto-assign best available chamber</option>
                      {rooms.map((r) => {
                        const isAvail = !r.housekeeping_state || r.housekeeping_state.toLowerCase() === 'available';
                        return (
                          <option key={r.id} value={r.id}>
                            Room {r.room_number} • {r.room_type?.name || 'Chamber'} ({isAvail ? 'Available / Clean' : r.housekeeping_state})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Check-In Date & Check-Out Date with Custom Royal Minimal Theme Calendar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PalaceDatePicker
                    label="Check-In Date"
                    required
                    value={formCheckIn}
                    onChange={(val) => {
                      setFormCheckIn(val);
                      // If check-out is before or equal to new check-in, set check-out to the next day
                      if (formCheckOut <= val) {
                        const d = new Date(val + 'T00:00:00');
                        d.setDate(d.getDate() + 1);
                        const nextDay = d.toISOString().split('T')[0];
                        setFormCheckOut(nextDay);
                      }
                    }}
                  />
                  <PalaceDatePicker
                    label="Check-Out Date"
                    required
                    minDate={formCheckIn}
                    value={formCheckOut}
                    onChange={(val) => setFormCheckOut(val)}
                  />
                </div>

                {/* Check-In Time & Check-Out Time with Custom Royal Time Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PalaceTimePicker
                    label="Check-In Time"
                    required
                    value={formCheckInTime}
                    onChange={setFormCheckInTime}
                    hint="Standard palace check-in starts at 12:00 PM"
                  />
                  <PalaceTimePicker
                    label="Check-Out Time"
                    required
                    value={formCheckOutTime}
                    onChange={setFormCheckOutTime}
                    hint="Standard palace check-out is by 11:00 AM"
                  />
                </div>

                {/* ── Dynamic Mandatory Guest Aadhaar Identification Section ── */}
                <div className="p-4 bg-[#F5ECDC]/90 border-2 border-[#D8AA67]/60 rounded-2xl space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-[#E8DFCE]">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-xs text-[#4F0809]">
                        <Shield className="w-4 h-4 text-[#D8AA67]" />
                        Mandatory Aadhaar Verification ({parseInt(formPartySize) || 2} Adults Staying)
                      </div>
                      <p className="text-[11px] text-[#856B4D] mt-0.5">
                        Both Aadhaar number &amp; card photo document are strictly required for each adult as per hospitality rules
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#4F0809] bg-[#D8AA67]/25 border border-[#D8AA67]/50 px-2.5 py-1 rounded-full self-start sm:self-auto">
                      UIDAI Regulated
                    </span>
                  </div>

                  <div className="space-y-3">
                    {Array.from({ length: parseInt(formPartySize) || 2 }).map((_, idx) => {
                      const g = formGuestAadhaars[idx] || { fullName: '', aadhaarNumber: '', aadhaarImage: '' };
                      const isPrimary = idx === 0;
                      const displayName = isPrimary ? (formGuestName || g.fullName) : g.fullName;
                      const cleanNum = (g.aadhaarNumber || '').replace(/\D/g, '');

                      return (
                        <div
                          key={idx}
                          className="p-3.5 bg-[#FDF8EE] rounded-xl border border-[#E8DFCE] shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F5ECDC] text-[#4F0809] border border-[#E8DFCE]">
                              <User className="w-3.5 h-3.5 text-[#D8AA67]" />
                              Adult {idx + 1} of {formPartySize} {isPrimary ? '(Primary Guest)' : '(Accompanying Adult)'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleGenerateSampleAadhaar(idx)}
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#4F0809] bg-[#D8AA67]/25 hover:bg-[#D8AA67]/40 border border-[#D8AA67]/50 px-2.5 py-1 rounded-lg transition cursor-pointer"
                              title="Auto-fill with sample test Aadhaar card"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#8F6628]" />
                              Auto-Fill Sample Aadhaar
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-[#856B4D] mb-1">
                                Adult {idx + 1} Full Name *
                              </label>
                              <input
                                type="text"
                                required
                                value={displayName}
                                onChange={(e) => {
                                  if (isPrimary) {
                                    handleGuestNameChange(e.target.value);
                                  } else {
                                    handleGuestSpecificNameChange(idx, e.target.value);
                                  }
                                }}
                                placeholder={isPrimary ? 'Matches primary guest name' : `e.g. Maharani Gayatri Devi`}
                                className="w-full h-10 px-3 rounded-lg border border-[#E8DFCE] text-xs bg-[#F5ECDC] focus:bg-[#EFE2CC] text-[#4F0809] font-medium focus:border-[#4F0809] focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] uppercase font-bold text-[#856B4D] mb-1">
                                12-Digit Aadhaar Number *
                              </label>
                              <input
                                type="text"
                                required
                                maxLength={14}
                                value={g.aadhaarNumber}
                                onChange={(e) => handleAadhaarNumChange(idx, e.target.value)}
                                placeholder="e.g. 5432 1098 7654"
                                className="w-full h-10 px-3 rounded-lg border border-[#E8DFCE] font-mono text-xs bg-[#F5ECDC] focus:bg-[#EFE2CC] text-[#4F0809] font-bold focus:border-[#4F0809] focus:outline-none"
                              />
                              <div className="flex items-center justify-between text-[9px] text-[#856B4D] mt-1">
                                <span>Format: #### #### ####</span>
                                <span className={cleanNum.length === 12 ? 'text-[#2E7D32] font-bold' : 'text-amber-700 font-semibold'}>
                                  {cleanNum.length}/12 digits
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Aadhaar Photo / Document Upload */}
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-[#856B4D] mb-1">
                              Aadhaar Card Front Photo / Document *
                            </label>

                            {g.aadhaarImage ? (
                              <div className="flex items-center gap-3 p-2.5 bg-[#F5ECDC] border border-[#2E7D32]/40 rounded-xl">
                                <div
                                  onClick={() => setLightboxImage({ url: g.aadhaarImage, title: `Adult ${idx + 1} (${displayName || 'Guest'}) Aadhaar Card` })}
                                  className="relative w-24 h-16 rounded-lg border border-[#E8DFCE] overflow-hidden bg-white cursor-pointer group flex-shrink-0"
                                >
                                  <img
                                    src={g.aadhaarImage}
                                    alt={`Aadhaar ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] transition">
                                    <ZoomIn className="w-3.5 h-3.5" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#2E7D32]">
                                    <Check className="w-3.5 h-3.5" />
                                    Aadhaar Document Attached
                                  </div>
                                  <p className="text-[10px] text-[#856B4D] truncate font-medium">
                                    {cleanNum ? `Aadhaar: ${g.aadhaarNumber}` : 'Document uploaded'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setLightboxImage({ url: g.aadhaarImage, title: `Adult ${idx + 1} (${displayName || 'Guest'}) Aadhaar Card` })}
                                    className="p-1.5 text-stone-600 hover:text-[#4F0809] hover:bg-[#EFE2CC] rounded-lg transition cursor-pointer"
                                    title="Inspect Full Image"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAadhaarImage(idx)}
                                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                    title="Remove Image"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-[#D8AA67]/60 rounded-xl p-3 text-center bg-[#FAF8F3]/60 hover:bg-[#FAF8F3] transition">
                                <input
                                  type="file"
                                  id={`aadhaar-file-${idx}`}
                                  accept="image/*"
                                  onChange={(e) => handleAadhaarFileUpload(idx, e)}
                                  className="hidden"
                                />
                                <label
                                  htmlFor={`aadhaar-file-${idx}`}
                                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#4F0809] hover:bg-[#651012] text-[#FFF8EB] text-xs font-bold shadow-xs transition cursor-pointer"
                                >
                                  <Upload className="w-3.5 h-3.5 text-[#D8AA67]" />
                                  Upload Aadhaar Image / Photo
                                </label>
                                <span className="block text-[10px] text-[#856B4D] mt-1.5 font-medium">
                                  Supports PNG, JPG, WebP photo or front scan of card
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                    Special Requests / VIP Amenities
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Royal garland welcome, airport pickup, royal thali breakfast..."
                    className="w-full p-3 rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/50 text-xs resize-none font-medium"
                  />
                </div>

                {/* Actions Footer */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E8DFCE]">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] text-xs font-bold border border-[#E8DFCE] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#4F0809] hover:bg-[#651012] text-[#FFF8EB] text-xs font-bold shadow-md transition cursor-pointer"
                  >
                    Confirm &amp; Allocate Suite
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox Image Viewer Modal ── */}
      {lightboxImage && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-xl w-full p-4 shadow-2xl relative">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-[#302421] transition cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-sm font-bold text-[#4F0809] mb-3 pr-8">
              {lightboxImage.title}
            </h3>
            <div className="rounded-xl overflow-hidden border border-[#E8DCD2] bg-stone-100 max-h-[70vh] flex items-center justify-center p-2">
              <img
                src={lightboxImage.url}
                alt="Enlarged Aadhaar Document"
                className="w-full h-auto max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setLightboxImage(null)}
                className="px-4 py-1.5 rounded-lg bg-[#4F0809] text-white text-xs font-semibold hover:bg-[#6B1518] transition"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
