'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  KeyRound,
  Loader2,
  LogIn,
  Printer,
  Share2,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Users,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { subscribeToAuth, type FirebaseUser } from '@/lib/firebase/auth';
import type { Reservation } from '@/lib/types';
import { calcNightsCount, formatStayDate } from '@/lib/utils/room-display';
import { formatMoney } from '@/lib/utils/money';
import { printBookingReceipt, shareBookingOnWhatsApp } from '@/lib/utils/print-receipt';
import { HeritageDivider, MandalaOrnament } from '@/components/ui/heritage-ornaments';

function toIsoTimestamp(value: unknown): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof (value as { seconds: number }).seconds === 'number'
  ) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

function mapSnapshotDoc(id: string, raw: Record<string, unknown>): Reservation {
  const { created_at, updated_at: _u, ...rest } = raw;
  void _u;
  return {
    ...(rest as Omit<Reservation, 'id' | 'created_at'>),
    id,
    created_at: toIsoTimestamp(created_at),
  } as Reservation;
}

function YourBookingsContent() {
  const searchParams = useSearchParams();
  const urlVerifyTarget = searchParams.get('verify') || searchParams.get('ref') || '';

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [primaryBookings, setPrimaryBookings] = useState<Reservation[]>([]);
  const [companionBookings, setCompanionBookings] = useState<Reservation[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Verification / Claim State
  const [refOrIdInput, setRefOrIdInput] = useState(() => urlVerifyTarget);
  const [codeInput, setCodeInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);
  const [showVerifyPanel, setShowVerifyPanel] = useState(() => Boolean(urlVerifyTarget));

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore queries for BOTH primary_guest and guests array
  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const colRef = collection(db, 'reservations');
    const qPrimary = query(colRef, where('primary_guest', '==', user.uid));
    const qGuest = query(colRef, where('guests', 'array-contains', user.uid));

    let gotPrimary = false;
    let gotGuest = false;

    const finishLoading = () => {
      if (gotPrimary && gotGuest) {
        setLoadingBookings(false);
      }
    };

    const unsubPrimary = onSnapshot(
      qPrimary,
      (snap) => {
        setPrimaryBookings(
          snap.docs.map((d) => mapSnapshotDoc(d.id, d.data() as Record<string, unknown>))
        );
        gotPrimary = true;
        finishLoading();
      },
      (err) => {
        console.warn('Primary bookings listener error:', err);
        gotPrimary = true;
        finishLoading();
      }
    );

    const unsubGuest = onSnapshot(
      qGuest,
      (snap) => {
        setCompanionBookings(
          snap.docs.map((d) => mapSnapshotDoc(d.id, d.data() as Record<string, unknown>))
        );
        gotGuest = true;
        finishLoading();
      },
      (err) => {
        console.warn('Companion bookings listener error:', err);
        gotGuest = true;
        finishLoading();
      }
    );

    return () => {
      unsubPrimary();
      unsubGuest();
    };
  }, [user?.uid]);

  const bookings = useMemo(() => {
    if (!user?.uid) return [];
    const byId = new Map<string, Reservation>();
    for (const r of [...primaryBookings, ...companionBookings]) {
      byId.set(r.id, r);
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [user?.uid, primaryBookings, companionBookings]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setVerifyError(null);
    setVerifySuccess(null);

    if (!refOrIdInput.trim() || !codeInput.trim()) {
      setVerifyError('Enter both Booking Reference / ID and the Verification Code from the message.');
      return;
    }

    setVerifyLoading(true);
    try {
      const response = await fetch('/api/reservations/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationIdOrRef: refOrIdInput.trim(),
          verificationCode: codeInput.trim(),
          userUid: user.uid,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        setVerifyError(json.error || 'Could not verify booking code. Please check carefully.');
        return;
      }

      setVerifySuccess(
        `Verified! Booking ${json.reservation?.reference_code || ''} is now linked to Your Bookings.`
      );
      setCodeInput('');
    } catch (err) {
      console.error('Verify booking failed:', err);
      setVerifyError('Network error while verifying booking code. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const loginRedirectHref = urlVerifyTarget
    ? `/login?redirect=${encodeURIComponent(`/bookings?verify=${urlVerifyTarget}`)}`
    : '/login?redirect=/bookings';

  return (
    <div className="relative min-h-[100dvh] bg-[#FAF7F2] text-[#2B2018] pt-28 sm:pt-32 lg:pt-36 pb-36 sm:pb-24 overflow-x-clip">
      <MandalaOrnament
        position="top-right"
        color="#B08D57"
        opacity={0.28}
        size="clamp(340px, 38vw, 560px)"
        className="-top-10 -right-24 sm:-right-16"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        {/* Top Breadcrumbs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/hotel"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E8DFCE] text-xs font-semibold text-[#4F0809] hover:border-[#D8AA67] transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#9C7A45]" />
            <span>Back to Palace Hotel</span>
          </Link>

          {user && (
            <button
              type="button"
              onClick={() => setShowVerifyPanel((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#D8AA67]/70 hover:bg-[#FFF9EF] text-xs font-semibold text-[#4F0809] transition-colors shadow-2xs cursor-pointer"
            >
              <TicketCheck className="w-3.5 h-3.5 text-[#9C7A45]" />
              <span>{showVerifyPanel ? 'Hide Verification Form' : 'Verify Companion Booking Code'}</span>
            </button>
          )}
        </div>

        {/* Page Title */}
        <header className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9C7A45] shadow-2xs mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#D8AA67]" />
            <span>Palace Stay Folio</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-semibold text-[#4F0809] leading-tight"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            Your <span className="italic font-normal text-[#9C7A45]">Bookings</span>
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-[#6A5A4E] font-light leading-relaxed">
            Access rooms booked under your account or claim an accompanying-guest reservation using
            the WhatsApp invitation verification code.
          </p>
          <HeritageDivider className="my-5 max-w-sm !mx-0" opacity={0.45} />
        </header>

        {/* Auth Check */}
        {authLoading ? (
          <div className="rounded-3xl bg-white border border-[#E8DFCE] p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#9C7A45]" />
            <p className="text-sm text-[#6A5A4E]">Loading your royal stays...</p>
          </div>
        ) : !user ? (
          <div className="rounded-3xl bg-white border border-[#E8DFCE] shadow-sm p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] flex items-center justify-center mx-auto text-[#9C7A45]">
              <LogIn className="w-6 h-6" />
            </div>
            <h2
              className="text-2xl sm:text-3xl font-semibold text-[#4F0809]"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              Sign In to Access Your Bookings
            </h2>
            <p className="text-sm text-[#6A5A4E] font-light leading-relaxed">
              {urlVerifyTarget
                ? 'Sign in with your palace guest account first, then enter the verification code from your WhatsApp invitation to link this booking to your profile.'
                : 'Sign in to view all room stays you reserved directly or joined as a verified accompanying guest.'}
            </p>
            <Link
              href={loginRedirectHref}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#4F0809] hover:bg-[#670E10] text-[#FAF7F2] text-xs font-semibold uppercase tracking-[0.16em] transition-colors shadow-sm"
            >
              <span>Sign In &amp; Continue</span>
              <ArrowRight className="w-4 h-4 text-[#D8AA67]" />
            </Link>
          </div>
        ) : (
          <div className="space-y-7">
            {/* Co-Guest Verification Form Card */}
            {(showVerifyPanel || urlVerifyTarget) && (
              <section className="rounded-3xl bg-white border border-[#D8AA67] shadow-[0_12px_36px_-18px_rgba(79,8,9,0.14)] p-6 sm:p-8 space-y-5">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#EDE5D8]">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9C7A45]">
                      Companion Guest Claim
                    </span>
                    <h2
                      className="text-2xl font-semibold text-[#4F0809] mt-0.5"
                      style={{
                        fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                      }}
                    >
                      Verify Your Invitation Code
                    </h2>
                    <p className="text-xs text-[#6A5A4E] mt-1">
                      Enter the verification code from your WhatsApp booking message to link this
                      reservation to your account ({user.email}).
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleVerifySubmit}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-end"
                >
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="verify-ref-input"
                      className="text-xs font-semibold text-[#5C4E42]"
                    >
                      Booking Reference or ID <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                    </label>
                    <input
                      id="verify-ref-input"
                      type="text"
                      required
                      placeholder="e.g. BK-9134 or res-..."
                      value={refOrIdInput}
                      onChange={(e) => setRefOrIdInput(e.target.value)}
                      className="w-full min-h-[48px] px-4 rounded-2xl bg-[#FAF7F2] border border-[#DFD3C3] font-mono text-sm text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="verify-code-input"
                      className="text-xs font-semibold text-[#5C4E42]"
                    >
                      WhatsApp Verification Code{' '}
                      <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                    </label>
                    <input
                      id="verify-code-input"
                      type="text"
                      required
                      placeholder="e.g. RAJ48K"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      className="w-full min-h-[48px] px-4 rounded-2xl bg-[#FAF7F2] border border-[#DFD3C3] font-mono text-base font-bold tracking-widest text-[#4F0809] uppercase focus:outline-none focus-visible:border-[#4F0809]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifyLoading}
                    className="h-[48px] px-6 rounded-full bg-[#4F0809] hover:bg-[#670E10] disabled:opacity-60 text-[#FAF7F2] text-xs font-semibold uppercase tracking-[0.14em] inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    {verifyLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-[#D8AA67]" />
                    )}
                    <span>{verifyLoading ? 'Verifying...' : 'Verify & Add Stay'}</span>
                  </button>
                </form>

                {verifyError && (
                  <p
                    role="alert"
                    className="p-3.5 rounded-2xl bg-[#FDF3F2] border border-[#F5C2C0] text-xs text-[#9C231B] flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{verifyError}</span>
                  </p>
                )}

                {verifySuccess && (
                  <p
                    role="status"
                    className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                    <span>{verifySuccess}</span>
                  </p>
                )}
              </section>
            )}

            {/* User Bookings Feed */}
            {loadingBookings ? (
              <div className="rounded-3xl bg-white border border-[#E8DFCE] p-10 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#9C7A45] mx-auto mb-2" />
                <p className="text-xs text-[#6A5A4E]">Syncing your reservations...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="rounded-3xl bg-white border border-[#E8DFCE] p-10 sm:p-14 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] flex items-center justify-center mx-auto text-[#9C7A45]">
                  <BedDouble className="w-5 h-5" />
                </div>
                <h2
                  className="text-2xl font-semibold text-[#4F0809]"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  No Stays Linked Yet
                </h2>
                <p className="text-sm text-[#6A5A4E] font-light max-w-md mx-auto">
                  Explore royal rooms at Rajmahal or click &ldquo;Verify Companion Booking
                  Code&rdquo; above if someone shared a stay invitation with you.
                </p>
                <div className="pt-2">
                  <Link
                    href="/hotel#hotel-chambers"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#4F0809] text-[#FAF7F2] text-xs font-semibold uppercase tracking-[0.14em]"
                  >
                    <span>Explore Palace Chambers</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {bookings.map((res) => {
                  const nights = calcNightsCount(res.check_in, res.check_out);
                  const subtotal = (res.rate_snapshot_minor || 650000) * nights;
                  const taxes = Math.round(subtotal * 0.12);
                  const total = subtotal + taxes;
                  const isPrimaryOwner = res.primary_guest === user.uid;
                  const verifyCode = res.verification_code || res.reference_code;

                  return (
                    <article
                      key={res.id}
                      className="rounded-3xl bg-white border border-[#E8DFCE] shadow-[0_10px_32px_-16px_rgba(79,8,9,0.1)] p-6 sm:p-8 space-y-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#EDE5D8]">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.14em] border ${
                                isPrimaryOwner
                                  ? 'bg-[#4F0809] text-[#FAF7F2] border-[#4F0809]'
                                  : 'bg-[#FAF7F2] text-[#4F0809] border-[#D8AA67]'
                              }`}
                            >
                              {isPrimaryOwner ? 'Primary Guest' : 'Verified Accompanying Guest'}
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800">
                              {res.status.replace('_', ' ')}
                            </span>
                          </div>

                          <h3
                            className="text-2xl sm:text-3xl font-semibold text-[#4F0809] pt-1"
                            style={{
                              fontFamily:
                                "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                            }}
                          >
                            {res.room_type_name || 'Royal Chamber'}
                            {res.room_number ? ` • Room #${res.room_number}` : ''}
                          </h3>

                          <p className="text-xs font-mono text-[#7A6A5B]">
                            Doc ID: {res.id} • Guests Linked: {(res.guests || []).length || 1}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] text-center">
                            <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[#8C755C]">
                              Verify Code
                            </span>
                            <span className="font-mono text-sm font-bold text-[#9C7A45]">
                              {verifyCode}
                            </span>
                          </div>
                          <div className="px-3.5 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] text-right">
                            <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[#8C755C]">
                              Booking Ref
                            </span>
                            <span className="font-mono text-sm font-bold text-[#4F0809]">
                              {res.reference_code}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Details Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] space-y-1">
                          <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-[#8C755C]">
                            <Calendar className="w-3.5 h-3.5 text-[#9C7A45]" />
                            Stay Schedule
                          </span>
                          <p className="font-semibold text-[#4F0809]">
                            {formatStayDate(res.check_in)} &rarr; {formatStayDate(res.check_out)} (
                            {nights}N)
                          </p>
                          <p className="text-[#6A5A4E] inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#9C7A45]" />
                            {res.check_in_time || 'After 12 Noon'}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] space-y-1">
                          <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-[#8C755C]">
                            <Users className="w-3.5 h-3.5 text-[#9C7A45]" />
                            Party &amp; IDs
                          </span>
                          <p className="font-semibold text-[#4F0809]">
                            {res.guest?.name || 'Royal Guest'} ({res.party_size} Guests)
                          </p>
                          <p className="text-[#6A5A4E]">
                            {res.id_submission_mode === 'submit_at_counter'
                              ? 'IDs to be submitted on counter'
                              : `${res.aadhaar_details?.length || 0} ID dossier attached`}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] space-y-1">
                          <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-[0.12em] text-[#8C755C]">
                            <KeyRound className="w-3.5 h-3.5 text-[#9C7A45]" />
                            Tariff &amp; Settlement
                          </span>
                          <p
                            className="text-lg font-bold text-[#4F0809]"
                            style={{
                              fontFamily:
                                "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                            }}
                          >
                            {formatMoney(total)}
                          </p>
                          <p
                            className={`font-medium ${
                              res.payment_status === 'pay_on_arrival' ||
                              res.payment_method === 'pay_on_arrival'
                                ? 'text-amber-800'
                                : 'text-emerald-700'
                            }`}
                          >
                            {res.payment_status === 'pay_on_arrival' ||
                            res.payment_method === 'pay_on_arrival'
                              ? `Pay on Arrival • Due at Reception: ${formatMoney(total)}`
                              : `Paid Online (100%): ${formatMoney(res.deposit_amount_minor || 0)}${
                                  res.payment_reference ? ` • TNR: ${res.payment_reference}` : ''
                                }`}
                          </p>
                        </div>
                      </div>

                      {(res.early_check_in_opted || res.late_check_out_opted) && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                          Early Check-In / Late Check-Out opted: counter charges settle on arrival.
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => printBookingReceipt(res)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4F0809] hover:bg-[#670E10] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-[#D8AA67]" />
                          <span>Print Official Receipt</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => shareBookingOnWhatsApp(res)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share via WhatsApp</span>
                        </button>

                        <a
                          href={`/api/reservations/${encodeURIComponent(res.id)}/voucher-image`}
                          download={`Rajmahal-Stay-${res.reference_code}.png`}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#DFD3C3] bg-[#FAF7F2] hover:bg-white text-xs font-semibold text-[#4F0809] transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-[#9C7A45]" />
                          <span>Stay Pass PNG</span>
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function YourBookingsPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#FAF7F2]" />}>
      <YourBookingsContent />
    </Suspense>
  );
}
