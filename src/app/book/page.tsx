'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { INITIAL_ROOM_TYPES } from '@/lib/data/initial-data';
import { formatMoney } from '@/lib/utils/money';
import { IconKingBed, IconGuests, IconFreeWiFi } from '@/components/ui/heritage-art';
import { MandalaOrnament, HeritageDivider } from '@/components/ui/heritage-ornaments';
import { Calendar, Users, CheckCircle2, Shield, Upload, Check, Trash2, Sparkles, ZoomIn, AlertCircle, X, User } from 'lucide-react';

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

function getFormattedDate(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function BookRoomForm() {
  const searchParams = useSearchParams();
  const paramRoomTypeId = searchParams.get('roomTypeId');
  const paramCheckIn = searchParams.get('checkIn');
  const paramCheckOut = searchParams.get('checkOut');
  const paramGuests = searchParams.get('guests');

  const [roomTypes, setRoomTypes] = useState(INITIAL_ROOM_TYPES);
  const [roomTypeId, setRoomTypeId] = useState(paramRoomTypeId || INITIAL_ROOM_TYPES[0].id);
  const [checkIn, setCheckIn] = useState(paramCheckIn || getFormattedDate(0));
  const [checkOut, setCheckOut] = useState(paramCheckOut || getFormattedDate(2));
  const [partySize, setPartySize] = useState(parseInt(paramGuests || '2', 10));

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [provideIdNow, setProvideIdNow] = useState(false);

  // Aadhaar details for all adult guests
  const [guestAadhaars, setGuestAadhaars] = useState<Array<{ fullName: string; aadhaarNumber: string; aadhaarImage: string }>>([
    { fullName: '', aadhaarNumber: '', aadhaarImage: '' },
    { fullName: '', aadhaarNumber: '', aadhaarImage: '' },
  ]);
  const [lightboxCard, setLightboxCard] = useState<{ url: string; title: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<{
    referenceCode: string;
    roomName: string;
    totalAmount: number;
    depositAmount?: number;
    nights: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch live room types from Firestore via /api/rooms
  useEffect(() => {
    async function loadLiveRooms() {
      try {
        const res = await fetch('/api/rooms');
        if (res.ok) {
          const data = await res.json();
          if (data.roomTypes && data.roomTypes.length > 0) {
            setRoomTypes(data.roomTypes);
            // If roomTypeId in param matches a live room or wasn't set, select accordingly
            if (paramRoomTypeId) {
              const matched = data.roomTypes.find((r: any) => r.id === paramRoomTypeId || r.name.toLowerCase().includes(paramRoomTypeId.toLowerCase()));
              if (matched) setRoomTypeId(matched.id);
            } else {
              setRoomTypeId(data.roomTypes[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch live rooms, using fallback:', err);
      }
    }
    loadLiveRooms();
  }, [paramRoomTypeId]);

  const selectedRoom = roomTypes.find((r) => r.id === roomTypeId) || roomTypes[0] || INITIAL_ROOM_TYPES[0];

  const calculateNights = () => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const nights = calculateNights();
  const totalAmount = (selectedRoom?.base_rate_minor || 500000) * nights;

  const handlePartySizeChange = (newSize: number) => {
    setPartySize(newSize);
    setGuestAadhaars((prev) => {
      const updated = [];
      for (let i = 0; i < newSize; i++) {
        if (prev[i]) {
          updated.push(prev[i]);
        } else {
          updated.push({
            fullName: i === 0 ? guestName : '',
            aadhaarNumber: '',
            aadhaarImage: '',
          });
        }
      }
      return updated;
    });
  };

  const handleGuestNameChange = (val: string) => {
    setGuestName(val);
    setGuestAadhaars((prev) => {
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
    setGuestAadhaars((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = { fullName: '', aadhaarNumber: '', aadhaarImage: '' };
      next[index] = { ...next[index], aadhaarNumber: formatted };
      return next;
    });
  };

  const handleGuestAadhaarFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setGuestAadhaars((prev) => {
        const next = [...prev];
        if (!next[index]) next[index] = { fullName: '', aadhaarNumber: '', aadhaarImage: '' };
        next[index] = { ...next[index], aadhaarImage: base64 };
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateSampleAadhaar = (index: number) => {
    const current = guestAadhaars[index] || { fullName: '', aadhaarNumber: '', aadhaarImage: '' };
    const gName = current.fullName.trim() || (index === 0 ? guestName.trim() : `Guest ${index + 1}`) || `Royal Guest ${index + 1}`;
    const cleanNum = current.aadhaarNumber.replace(/\D/g, '');
    const randomAadhaar = cleanNum.length === 12
      ? current.aadhaarNumber
      : `${Math.floor(2000 + Math.random() * 7000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
    const sampleSvg = generateSampleAadhaarSvg(gName, randomAadhaar);

    setGuestAadhaars((prev) => {
      const next = [...prev];
      next[index] = {
        fullName: gName,
        aadhaarNumber: randomAadhaar,
        aadhaarImage: sampleSvg,
      };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!guestName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!guestPhone.trim() || guestPhone.length < 10) {
      setErrorMsg('Please enter a valid 10+ digit mobile number.');
      return;
    }

    let aadhaarDetailsPayload: any[] = [];

    // Optional upfront Government ID validation (only if guest opted to upload now)
    if (provideIdNow) {
      for (let i = 0; i < partySize; i++) {
        const g = guestAadhaars[i];
        const gName = (i === 0 ? guestName : g?.fullName)?.trim() || '';
        const cleanAadhaar = (g?.aadhaarNumber || '').replace(/\D/g, '');

        if (!gName) {
          setErrorMsg(`Adult ${i + 1}: Full Name is mandatory for Government ID.`);
          return;
        }
        if (cleanAadhaar && cleanAadhaar.length !== 12) {
          setErrorMsg(`Adult ${i + 1} (${gName}): Valid 12-digit Aadhaar Number is required (Currently ${cleanAadhaar.length} digits).`);
          return;
        }
      }

      aadhaarDetailsPayload = guestAadhaars.slice(0, partySize).map((g, idx) => ({
        guest_index: idx + 1,
        full_name: (idx === 0 ? guestName : g.fullName).trim(),
        aadhaar_number: (g.aadhaarNumber || '').trim(),
        aadhaar_image_url: g.aadhaarImage || '',
        is_verified: Boolean(g.aadhaarImage && g.aadhaarNumber),
      }));
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomTypeId: selectedRoom.id,
          checkIn,
          checkOut,
          partySize,
          guestName,
          guestPhone,
          guestEmail,
          notes,
          termsAccepted: true,
          aadhaarDetails: aadhaarDetailsPayload,
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to complete reservation');
      }

      setConfirmedReservation({
        referenceCode: resData.reservation.reference_code,
        roomName: selectedRoom.name,
        totalAmount: resData.reservation.total_amount_minor || totalAmount,
        depositAmount: resData.reservation.deposit_amount_minor,
        nights,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Reservation failed';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative bg-[#F5F1E8] min-h-screen pt-24 sm:pt-28 pb-16 text-[#241F1A] overflow-hidden">
      {/* Decorative Mandala Corner Line Art with subtle watermark opacity */}
      <MandalaOrnament position="top-left" opacity={0.16} color="#B08D57" className="hidden lg:block" />
      <MandalaOrnament position="bottom-right" opacity={0.16} color="#B08D57" className="hidden lg:block" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header matching Mobile - Booking mockup */}
        <div className="text-center mb-8">
          <h1 className="font-heritage text-3xl sm:text-4xl font-bold text-[#670E10] mb-2">
            Book Your Stay
          </h1>
          <p className="text-xs sm:text-sm text-[#6E6356] font-light">
            Reserve your royal chamber at Rajmahal Heritage Hotel with direct instant confirmation
          </p>
        </div>

        <HeritageDivider className="opacity-35 mb-8" color="#B08D57" />

        {confirmedReservation ? (
          <div className="bg-white rounded-2xl border border-[#B08D57]/40 p-8 text-center space-y-6 shadow-xl">
            <CheckCircle2 className="w-14 h-14 text-[#2D6A4F] mx-auto" />
            <h2 className="font-heritage text-3xl font-bold text-[#670E10]">
              Reservation Confirmed!
            </h2>
            <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E5DFD5] max-w-md mx-auto text-xs space-y-2 text-left">
              <p>
                <strong>Booking Reference:</strong>{' '}
                <span className="font-mono text-sm text-[#8F7245] font-bold">
                  {confirmedReservation.referenceCode}
                </span>
              </p>
              <p><strong>Suite:</strong> {confirmedReservation.roomName}</p>
              <p><strong>Dates:</strong> {checkIn} to {checkOut} ({confirmedReservation.nights} night{confirmedReservation.nights > 1 ? 's' : ''})</p>
              <p><strong>Total Tariff:</strong> {formatMoney(confirmedReservation.totalAmount)}</p>
              <p><strong>Guest:</strong> {guestName} ({guestPhone})</p>
            </div>
            <p className="text-xs text-[#7A6F62]">
              A confirmation dispatch has been logged. Our royal concierge looks forward to welcoming you to Udaipur.
            </p>

            {/* Post-Booking Action Ribbon */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const msg = `*Rajmahal Heritage Hotel - Room Booking Voucher* 🏰\nBooking Ref: ${confirmedReservation.referenceCode}\nGuest: ${guestName}\nSuite: ${confirmedReservation.roomName}\nStay: ${checkIn} to ${checkOut} (${confirmedReservation.nights} nights)\nTotal Amount: ${formatMoney(confirmedReservation.totalAmount)}\n\nPadharo Mhare Desh! We look forward to welcoming you to Udaipur.`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold shadow-md flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <span>Share Voucher on WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-[#D8AA67] hover:bg-[#FAF8F3] text-[#4F0809] text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Print / Save PDF
              </button>

              <Link
                href="/rooms"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#670E10] hover:bg-[#821215] text-[#FAF8F3] text-xs font-semibold transition"
              >
                Explore More Chambers
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. Date & Guest Selector Box matching reference mockup */}
            <div className="bg-white rounded-2xl border border-[#D4CBBB]/70 p-6 shadow-sm text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded-lg border border-[#E5DFD5] bg-[#FAF8F3]/60">
                  <span className="block text-[11px] text-[#7A6F62] font-semibold mb-1">
                    Check In
                  </span>
                  <div className="flex items-center justify-between">
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="bg-transparent text-sm text-[#670E10] font-medium focus:outline-none w-full"
                    />
                    <Calendar className="w-4 h-4 text-[#8F7245]" />
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-[#E5DFD5] bg-[#FAF8F3]/60">
                  <span className="block text-[11px] text-[#7A6F62] font-semibold mb-1">
                    Check Out
                  </span>
                  <div className="flex items-center justify-between">
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="bg-transparent text-sm text-[#670E10] font-medium focus:outline-none w-full"
                    />
                    <Calendar className="w-4 h-4 text-[#8F7245]" />
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-[#E5DFD5] bg-[#FAF8F3]/60">
                  <span className="block text-[11px] text-[#7A6F62] font-semibold mb-1">
                    Guests
                  </span>
                  <div className="flex items-center justify-between">
                    <select
                      value={`${partySize} Adults`}
                      onChange={(e) => handlePartySizeChange(parseInt(e.target.value.split(' ')[0], 10))}
                      className="bg-transparent text-sm text-[#670E10] font-medium focus:outline-none w-full"
                    >
                      <option value="1 Adults">1 Adult</option>
                      <option value="2 Adults">2 Adults</option>
                      <option value="3 Adults">3 Adults</option>
                      <option value="4 Adults">4 Adults</option>
                    </select>
                    <Users className="w-4 h-4 text-[#8F7245]" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#7A6F62] font-semibold mb-1">
                  Selected Chamber
                </label>
                <select
                  value={roomTypeId}
                  onChange={(e) => setRoomTypeId(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[#E5DFD5] bg-[#FAF8F3]/60 text-sm font-semibold text-[#670E10] focus:outline-none focus:border-[#B08D57]"
                >
                  {roomTypes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {formatMoney(r.base_rate_minor)} / night
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Selected Chamber Preview */}
            <div className="bg-white rounded-2xl border border-[#D4CBBB]/70 overflow-hidden shadow-sm flex flex-col sm:flex-row items-center">
              <div className="relative w-full sm:w-1/2 h-52 sm:h-56">
                <Image
                  src={selectedRoom.photos?.[0] || '/images/rooms/haveli-suite.jpg'}
                  alt={selectedRoom.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 w-full sm:w-1/2 text-left space-y-3">
                <h3 className="font-heritage text-2xl font-bold text-[#670E10]">
                  {selectedRoom.name}
                </h3>
                <div className="flex items-center space-x-4 text-xs text-[#7A6F62]">
                  <span className="flex items-center">
                    <IconKingBed className="w-4 h-4 text-[#8F7245] mr-1" /> King Bed
                  </span>
                  <span className="flex items-center">
                    <IconGuests className="w-4 h-4 text-[#8F7245] mr-1" /> {selectedRoom.capacity} Guests
                  </span>
                  <span className="flex items-center">
                    <IconFreeWiFi className="w-4 h-4 text-[#8F7245] mr-1" /> WiFi
                  </span>
                </div>
                <div className="pt-2 border-t border-[#F2ECE1] flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-[#7A6F62]">Tariff:</span>
                    <span className="font-heritage text-xl font-bold text-[#670E10] ml-1.5">
                      {formatMoney(totalAmount)}
                    </span>
                    <span className="text-[11px] text-[#7A6F62] ml-1">
                      ({nights} night{nights > 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Booking Privilege Guarantee Banner */}
            <div className="bg-gradient-to-r from-[#4F0809] via-[#670E10] to-[#4F0809] text-[#FFF8EB] rounded-2xl p-4 sm:p-5 border border-[#D8AA67]/50 shadow-md flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#D8AA67]/20 border border-[#D8AA67] flex items-center justify-center text-[#D8AA67] shrink-0">
                  <Sparkles className="w-5 h-5 text-[#E1B46F]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#E1B46F] leading-tight" style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}>
                    Palace Direct Booking Privileges Included
                  </h4>
                  <p className="text-[11px] text-[#FFF8EB]/80 mt-0.5">
                    Best Rate Guarantee • Complimentary Royal Breakfast • Courtyard Evening Tea • 10% Dining Privilege
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-[#D8AA67] text-[#380506] shadow-sm">
                Zero Booking Fees
              </span>
            </div>

            {/* 3. Guest Details & Confirmation Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#D4CBBB]/70 p-6 sm:p-8 shadow-sm text-left space-y-4">
              <h3 className="font-heritage text-xl font-bold text-[#670E10] mb-2">
                Guest Information
              </h3>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#670E10] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => handleGuestNameChange(e.target.value)}
                    placeholder="e.g. Vikramaditya Rathore"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5DFD5] bg-[#FAF8F3]/50 text-xs text-[#241F1A] focus:outline-none focus:border-[#B08D57]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#670E10] mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5DFD5] bg-[#FAF8F3]/50 text-xs text-[#241F1A] focus:outline-none focus:border-[#B08D57]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#670E10] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5DFD5] bg-[#FAF8F3]/50 text-xs text-[#241F1A] focus:outline-none focus:border-[#B08D57]"
                />
              </div>

              {/* Government ID Preference (Frictionless 2-Stage Flow) */}
              <div className="p-4 bg-[#FAF8F3] border border-[#D8AA67]/40 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-[#E5DFD5]">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#670E10]">
                      <Shield className="w-4 h-4 text-[#D8AA67]" />
                      Guest Identification &amp; Check-In Preference
                    </div>
                    <p className="text-[11px] text-[#7A6F62] mt-0.5">
                      Compliant with Rajasthan Tourism &amp; Police Regulations (UIDAI / Passport accepted)
                    </p>
                  </div>
                </div>

                {/* 2-Option Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setProvideIdNow(false)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      !provideIdNow
                        ? 'border-[#2D6A4F] bg-[#D8F3DC]/30 ring-1 ring-[#2D6A4F]'
                        : 'border-[#E5DFD5] bg-white hover:border-[#D8AA67]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#2D6A4F] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Fast-Track Booking
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F]">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1">
                      Reserve instantly now. Present ID at the Front Desk or via Pre-Arrival WhatsApp link.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProvideIdNow(true)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      provideIdNow
                        ? 'border-[#670E10] bg-[#FFF8EB] ring-1 ring-[#670E10]'
                        : 'border-[#E5DFD5] bg-white hover:border-[#D8AA67]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#670E10] flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Upload Aadhaar Now
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#670E10]/10 text-[#670E10]">
                        VIP Express
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1">
                      Upload cards now for pre-verified keys upon arrival.
                    </p>
                  </button>
                </div>

                {/* Upload Fields (Shown when provideIdNow is true) */}
                {provideIdNow && (
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px] text-[#670E10] font-semibold">
                      Please enter details for all {partySize} staying adults:
                    </p>
                  {Array.from({ length: partySize }).map((_, idx) => {
                    const g = guestAadhaars[idx] || { fullName: '', aadhaarNumber: '', aadhaarImage: '' };
                    const isPrimary = idx === 0;
                    const displayName = isPrimary ? (guestName || g.fullName) : g.fullName;
                    const cleanNum = (g.aadhaarNumber || '').replace(/\D/g, '');

                    return (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-[#E5DFD5] shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAF8F3] text-[#670E10] border border-[#E5DFD5]">
                            <User className="w-3 h-3 text-[#D8AA67]" />
                            Adult {idx + 1} of {partySize} {isPrimary ? '(Primary Guest)' : '(Accompanying Adult)'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleGenerateSampleAadhaar(idx)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8F6628] hover:text-[#670E10] bg-[#B78A48]/10 hover:bg-[#B78A48]/20 px-2 py-0.5 rounded transition cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            Auto-Fill Sample Aadhaar
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#670E10] mb-1">
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
                                  const val = e.target.value;
                                  setGuestAadhaars((prev) => {
                                    const next = [...prev];
                                    if (!next[idx]) next[idx] = { fullName: '', aadhaarNumber: '', aadhaarImage: '' };
                                    next[idx] = { ...next[idx], fullName: val };
                                    return next;
                                  });
                                }
                              }}
                              placeholder={isPrimary ? 'Matches primary guest' : 'e.g. Priyadarshini Rathore'}
                              className="w-full px-3 py-2 rounded-lg border border-[#E5DFD5] bg-[#FAF8F3]/50 text-xs focus:outline-none focus:border-[#B08D57]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#670E10] mb-1">
                              12-Digit Aadhaar Number *
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={14}
                              value={g.aadhaarNumber}
                              onChange={(e) => handleAadhaarNumChange(idx, e.target.value)}
                              placeholder="e.g. 5432 1098 7654"
                              className="w-full px-3 py-2 rounded-lg border border-[#E5DFD5] bg-[#FAF8F3]/50 font-mono text-xs focus:outline-none focus:border-[#B08D57]"
                            />
                            <div className="flex items-center justify-between text-[9px] text-[#7A6F62] mt-0.5">
                              <span>Format: #### #### ####</span>
                              <span className={cleanNum.length === 12 ? 'text-[#2D6A4F] font-bold' : 'text-amber-700'}>
                                {cleanNum.length}/12 digits
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Aadhaar Image */}
                        <div>
                          <label className="block text-[11px] font-semibold text-[#670E10] mb-1">
                            Aadhaar Card Front Photo / Scan *
                          </label>

                          {g.aadhaarImage ? (
                            <div className="flex items-center gap-3 p-2 bg-[#FAF8F3] border border-[#2D6A4F]/30 rounded-lg">
                              <div
                                onClick={() => setLightboxCard({ url: g.aadhaarImage, title: `Adult ${idx + 1} Aadhaar Card` })}
                                className="relative w-20 h-14 rounded border border-[#E5DFD5] overflow-hidden bg-white cursor-pointer group flex-shrink-0"
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
                                <div className="flex items-center gap-1 text-[11px] font-bold text-[#2D6A4F]">
                                  <Check className="w-3.5 h-3.5" />
                                  Aadhaar Document Attached
                                </div>
                                <p className="text-[10px] text-[#7A6F62] truncate">
                                  {cleanNum ? `Aadhaar: ${g.aadhaarNumber}` : 'Document attached'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setGuestAadhaars((prev) => {
                                    const next = [...prev];
                                    if (next[idx]) next[idx] = { ...next[idx], aadhaarImage: '' };
                                    return next;
                                  });
                                }}
                                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="border border-dashed border-[#D8AA67] rounded-lg p-3 text-center bg-[#FAF8F3]/60 hover:bg-[#FAF8F3] transition">
                              <input
                                type="file"
                                id={`guest-aadhaar-${idx}`}
                                accept="image/*"
                                onChange={(e) => handleGuestAadhaarFileUpload(idx, e)}
                                className="hidden"
                              />
                              <label
                                htmlFor={`guest-aadhaar-${idx}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5DFD5] text-[#670E10] hover:bg-[#FAF8F3] text-xs font-semibold shadow-2xs transition cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5 text-[#D8AA67]" />
                                Upload Aadhaar Card (Front Photo)
                              </label>
                              <span className="block text-[9px] text-[#7A6F62] mt-1">
                                JPG, PNG, WebP supported
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          <div>
            <label className="block text-xs font-semibold text-[#670E10] mb-1">
              Special Requests (Optional)
            </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Lake view preferred, late evening check-in, extra pillows..."
                  className="w-full px-3.5 py-2 rounded-lg border border-[#E5DFD5] bg-[#FAF8F3]/50 text-xs text-[#241F1A] focus:outline-none focus:border-[#B08D57]"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-lg bg-[#670E10] hover:bg-[#821215] text-[#FAF8F3] font-medium text-sm tracking-wide transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Confirming Reservation...' : 'Confirm Royal Reservation'}
                </button>
              </div>
            </form>

            {/* 4. Need Help Card matching Mobile - Booking mockup */}
            <div className="bg-white rounded-xl border border-[#D4CBBB]/70 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-2xs">
              <div>
                <h4 className="font-semibold text-sm text-[#670E10]">Need Help?</h4>
                <p className="text-xs text-[#7A6F62]">
                  Contact our team for special requests, royal transfers, or group bookings.
                </p>
              </div>
              <Link
                href="/#contact"
                className="px-5 py-2 rounded-lg border border-[#B08D57] bg-white hover:bg-[#670E10] hover:text-[#FAF8F3] text-[#670E10] font-medium text-xs tracking-wide transition-all shrink-0"
              >
                Contact Us
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Lightbox Image Modal ── */}
      {lightboxCard && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#D4CBBB] rounded-2xl max-w-xl w-full p-4 shadow-2xl relative">
            <button
              onClick={() => setLightboxCard(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-[#241F1A] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-bold text-[#670E10] mb-3 pr-8">
              {lightboxCard.title}
            </h3>
            <div className="rounded-xl overflow-hidden border border-[#D4CBBB] bg-stone-100 max-h-[70vh] flex items-center justify-center p-2">
              <img
                src={lightboxCard.url}
                alt="Enlarged Aadhaar Document"
                className="w-full h-auto max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setLightboxCard(null)}
                className="px-4 py-1.5 rounded-lg bg-[#670E10] text-[#FAF8F3] text-xs font-semibold hover:bg-[#821215] transition cursor-pointer"
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

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">Loading booking terminal...</div>}>
      <BookRoomForm />
    </Suspense>
  );
}
