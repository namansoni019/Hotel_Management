'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import QRCode from 'qrcode';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileCheck2,
  FileImage,
  KeyRound,
  Landmark,
  Loader2,
  Lock,
  Printer,
  QrCode,
  ScanLine,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { subscribeToAuth, type FirebaseUser } from '@/lib/firebase/auth';
import type {
  GuestAadhaarDetail,
  Reservation,
  ReservationGuestDetail,
  Room,
} from '@/lib/types';
import { serializeRoomDoc, sortRoomsByNumber } from '@/lib/utils/room-serializer';
import {
  buildRoomBookHref,
  calcNightsCount,
  formatStayDate,
  getRoomAmenities,
  getRoomBedType,
  getRoomCapacity,
  getRoomCategoryBadge,
  getRoomDescription,
  getRoomHousekeepingMeta,
  getRoomPhoto,
  getRoomRateMinor,
  getRoomTitle,
} from '@/lib/utils/room-display';
import {
  compressIdImageToDataUrl,
  detectAadhaarNumberFromFile,
  formatAadhaarDigits,
} from '@/lib/utils/aadhaar-ocr';
import { printBookingReceipt, shareBookingOnWhatsApp } from '@/lib/utils/print-receipt';
import { formatMoney } from '@/lib/utils/money';
import { HeritageDivider, MandalaOrnament } from '@/components/ui/heritage-ornaments';

export interface BookInitialParams {
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  roomId?: string;
  roomTypeId?: string;
}

interface BookRoomClientProps {
  initialRoom: Room | null;
  initialAllRooms: Room[];
  routeRoomId?: string;
  initialParams?: BookInitialParams;
}

interface GuestProfileEntry {
  guestIndex: number;
  fullName: string;
  phone: string;
  email: string;
  dob: string;
}

interface GuestIdEntry {
  guestIndex: number;
  idType: 'aadhaar' | 'other';
  fullName: string;
  nameCustomizedInStep3: boolean;
  aadhaarNumber: string;
  confirmAadhaarNumber: string;
  aadhaarImage: string;
  ocrStatus: 'idle' | 'scanning' | 'detected' | 'not_found';
  ocrMessage: string;
}

type BookingStep = 1 | 2 | 3 | 4;
type IdSubmissionMode = 'upload_now' | 'submit_at_counter';
type PaymentPlan = 'pay_100_now' | 'pay_on_arrival';
type OnlineMethod = 'upi' | 'card';

const STEPPER_ITEMS: Array<{ step: BookingStep; title: string; subtitle: string }> = [
  { step: 1, title: 'Room & Dates', subtitle: 'Suite & timing' },
  { step: 2, title: 'Guest Details', subtitle: 'Guest profiles' },
  { step: 3, title: 'Guest IDs', subtitle: 'ID verification' },
  { step: 4, title: 'Payment', subtitle: '100% now or arrival' },
];

const CHECK_IN_TIMING_OPTIONS: Array<{ label: string; isEarly: boolean }> = [
  { label: 'After 12:00 Noon (Standard Check-In • Included)', isEarly: false },
  { label: '12:00 PM – 2:00 PM (Standard Check-In • Included)', isEarly: false },
  { label: '2:00 PM – 5:00 PM (Standard Check-In • Included)', isEarly: false },
  { label: 'After 5:00 PM (Evening Arrival • Included)', isEarly: false },
  { label: 'Early Check-In: 9:00 AM – 12:00 Noon (Charges Apply at Counter)', isEarly: true },
  { label: 'Early Check-In: Before 9:00 AM (Charges Apply at Counter)', isEarly: true },
];

const CHECK_OUT_TIMING_OPTIONS: Array<{ label: string; isLate: boolean }> = [
  { label: 'Before 11:00 AM (Standard Check-Out • Included)', isLate: false },
  { label: '8:00 AM – 9:30 AM (Early Departure • Included)', isLate: false },
  { label: 'Late Check-Out: Until 2:00 PM (Charges Apply at Counter)', isLate: true },
  { label: 'Late Check-Out: Until 6:00 PM (Charges Apply at Counter)', isLate: true },
];

function getFormattedDateOffset(daysOffset: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysOffset);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resizeGuestProfiles(prev: GuestProfileEntry[], count: number): GuestProfileEntry[] {
  return Array.from({ length: count }, (_, idx) => {
    const existing = prev[idx];
    return (
      existing || {
        guestIndex: idx + 1,
        fullName: '',
        phone: '',
        email: '',
        dob: '',
      }
    );
  });
}

function syncIdsWithGuests(prev: GuestIdEntry[], guests: GuestProfileEntry[]): GuestIdEntry[] {
  return guests.map((guest, idx) => {
    const existing = prev[idx];
    if (!existing) {
      return {
        guestIndex: idx + 1,
        idType: 'aadhaar',
        fullName: guest.fullName,
        nameCustomizedInStep3: false,
        aadhaarNumber: '',
        confirmAadhaarNumber: '',
        aadhaarImage: '',
        ocrStatus: 'idle',
        ocrMessage: '',
      };
    }
    return {
      ...existing,
      guestIndex: idx + 1,
      fullName: existing.nameCustomizedInStep3 ? existing.fullName : guest.fullName,
    };
  });
}

export function BookRoomClient({
  initialRoom,
  initialAllRooms,
  routeRoomId,
  initialParams,
}: BookRoomClientProps) {
  const router = useRouter();
  const todayYMD = useMemo(() => getFormattedDateOffset(0), []);

  // Locked party size sourced strictly from search parameters (cannot be updated inside booking page)
  const partySize = useMemo(() => {
    const parsed = parseInt(initialParams?.guests || '2', 10);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(6, parsed) : 2;
  }, [initialParams?.guests]);

  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [liveRooms, setLiveRooms] = useState<Room[]>(() => {
    const base = sortRoomsByNumber(initialAllRooms);
    if (initialRoom && !base.some((r) => r.id === initialRoom.id)) {
      return sortRoomsByNumber([initialRoom, ...base]);
    }
    return base;
  });

  // Active Firebase room doc ID
  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => {
    if (routeRoomId) {
      const exact = initialAllRooms.find((r) => r.id === routeRoomId);
      if (exact) return exact.id;
      if (initialRoom) return initialRoom.id;
      return routeRoomId;
    }
    if (initialParams?.roomId) {
      const byParam = initialAllRooms.find((r) => r.id === initialParams.roomId);
      if (byParam) return byParam.id;
    }
    if (initialParams?.roomTypeId) {
      const byType =
        initialAllRooms.find(
          (r) =>
            (r.room_type_id === initialParams.roomTypeId || r.id === initialParams.roomTypeId) &&
            r.housekeeping_state === 'available'
        ) || initialAllRooms.find((r) => r.room_type_id === initialParams.roomTypeId);
      if (byType) return byType.id;
    }
    const firstAvailable =
      initialAllRooms.find((r) => r.housekeeping_state === 'available') || initialAllRooms[0];
    return firstAvailable?.id || '';
  });

  // Stepper navigation
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [highestVisitedStep, setHighestVisitedStep] = useState<BookingStep>(1);
  const [stepAttempted, setStepAttempted] = useState<Record<BookingStep, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  });

  // Step 1: Chamber, dates & check-in/out timings
  const [moreSuitesOpen, setMoreSuitesOpen] = useState(false);
  const [checkIn, setCheckIn] = useState<string>(
    () => initialParams?.checkIn || getFormattedDateOffset(0)
  );
  const [checkOut, setCheckOut] = useState<string>(
    () => initialParams?.checkOut || getFormattedDateOffset(2)
  );
  const [checkInTime, setCheckInTime] = useState<string>(CHECK_IN_TIMING_OPTIONS[0].label);
  const [checkOutTime, setCheckOutTime] = useState<string>(CHECK_OUT_TIMING_OPTIONS[0].label);

  // Step 2: Dynamic Guest List + Special Preferences
  const [guestsInfo, setGuestsInfo] = useState<GuestProfileEntry[]>(() =>
    resizeGuestProfiles([], partySize)
  );
  const [notes, setNotes] = useState('');

  // Step 3: Counter vs Upload Now ID Verification
  const [idSubmissionMode, setIdSubmissionMode] = useState<IdSubmissionMode>('upload_now');
  const [aadhaarEntries, setAadhaarEntries] = useState<GuestIdEntry[]>(() =>
    syncIdsWithGuests([], resizeGuestProfiles([], partySize))
  );

  // Step 4: Payment & Settlement Option
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('pay_100_now');
  const [onlineMethod, setOnlineMethod] = useState<OnlineMethod>('upi');
  const [tnrNumber, setTnrNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Lightbox & Submission
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('Identity Card Preview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const lightboxDialogRef = useRef<HTMLDialogElement>(null);
  const allowExplicitSubmitRef = useRef<boolean>(false);

  // Auth listener to capture primary user's Firebase UID
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setAuthUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Live Firestore `rooms` subscription
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          const docs = snap.docs.map((d) =>
            serializeRoomDoc(d.id, d.data() as Record<string, unknown>)
          );
          setLiveRooms(sortRoomsByNumber(docs));
        }
      },
      (err) => {
        console.warn('Book room live sync error:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Selected room lookup
  const selectedRoom = useMemo(() => {
    const found = liveRooms.find((r) => r.id === selectedRoomId);
    if (found) return found;
    if (initialRoom && initialRoom.id === selectedRoomId) return initialRoom;
    return initialRoom || liveRooms[0] || null;
  }, [liveRooms, selectedRoomId, initialRoom]);

  // Split rooms into Same-Category Available vs More Suites Dropdown
  const activeCategory = useMemo(
    () => (selectedRoom ? getRoomTitle(selectedRoom) : ''),
    [selectedRoom]
  );

  const sameCategoryRooms = useMemo(() => {
    if (!activeCategory) return liveRooms;
    return liveRooms.filter((r) => {
      const sameCategory = getRoomTitle(r) === activeCategory;
      const isAvailable = r.housekeeping_state === 'available';
      return sameCategory && (isAvailable || r.id === selectedRoom?.id);
    });
  }, [liveRooms, activeCategory, selectedRoom?.id]);

  const otherSuitesRooms = useMemo(() => {
    const visibleIds = new Set(sameCategoryRooms.map((r) => r.id));
    return liveRooms.filter((r) => !visibleIds.has(r.id));
  }, [liveRooms, sameCategoryRooms]);

  // Sync browser URL when visiting bare `/book`
  useEffect(() => {
    if (!routeRoomId && selectedRoom?.id && !confirmedReservation) {
      const targetUrl = buildRoomBookHref(selectedRoom.id, {
        checkIn,
        checkOut,
        guests: partySize,
      });
      router.replace(targetUrl, { scroll: false });
    }
  }, [routeRoomId, selectedRoom?.id, checkIn, checkOut, partySize, router, confirmedReservation]);

  // Timing opt-in flags (settled at reception counter on arrival)
  const earlyCheckInOpted = useMemo(
    () => Boolean(CHECK_IN_TIMING_OPTIONS.find((opt) => opt.label === checkInTime)?.isEarly),
    [checkInTime]
  );
  const lateCheckOutOpted = useMemo(
    () => Boolean(CHECK_OUT_TIMING_OPTIONS.find((opt) => opt.label === checkOutTime)?.isLate),
    [checkOutTime]
  );

  // Derived tariff calculation
  const nights = calcNightsCount(checkIn, checkOut);
  const rateMinor = selectedRoom ? getRoomRateMinor(selectedRoom) : 650000;
  const subtotalMinor = rateMinor * nights;
  const taxesMinor = Math.round(subtotalMinor * 0.12);
  const totalTariffMinor = subtotalMinor + taxesMinor;

  const payableNowMinor = paymentPlan === 'pay_100_now' ? totalTariffMinor : 0;

  // Dynamic UPI QR code on Step 4
  useEffect(() => {
    if (currentStep !== 4 || paymentPlan !== 'pay_100_now' || onlineMethod !== 'upi') return;
    let cancelled = false;
    const amountRupees = (payableNowMinor / 100).toFixed(2);
    const upiUri = `upi://pay?pa=rajmahalpalace@sbi&pn=Rajmahal%20Heritage%20Grand&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(
      `Room ${selectedRoom?.room_number || ''} Reservation`
    )}`;
    QRCode.toDataURL(upiUri, {
      width: 220,
      margin: 1,
      color: { dark: '#4F0809', light: '#FFFFFF' },
    })
      .then((dataUrl) => {
        if (!cancelled) setUpiQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.warn('QR generation warning:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [currentStep, paymentPlan, onlineMethod, payableNowMinor, selectedRoom?.room_number]);

  // Native <dialog> lightbox lifecycle + light-dismiss fallback
  useEffect(() => {
    const dialog = lightboxDialogRef.current;
    if (!dialog) return;

    if (lightboxSrc) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [lightboxSrc]);

  useEffect(() => {
    const dialog = lightboxDialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      setLightboxSrc(null);
    };
    dialog.addEventListener('close', handleClose);

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const handlePointerDown = (e: PointerEvent) => {
      if ('closedBy' in HTMLDialogElement.prototype) return;
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if ('closedBy' in HTMLDialogElement.prototype) return;
      if (pressedOutside && isOutside(e)) dialog.close();
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', handlePointerDown);
    dialog.addEventListener('pointerup', handlePointerUp);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('pointerdown', handlePointerDown);
      dialog.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  // Chamber selection updates URL to Firebase doc UID
  const handleSelectChamber = (newRoomId: string) => {
    setSelectedRoomId(newRoomId);
    router.replace(
      buildRoomBookHref(newRoomId, {
        checkIn,
        checkOut,
        guests: partySize,
      }),
      { scroll: false }
    );
  };

  const updateGuestField = (idx: number, patch: Partial<GuestProfileEntry>) => {
    setGuestsInfo((prev) => {
      const copy = resizeGuestProfiles(prev, partySize);
      copy[idx] = { ...copy[idx], ...patch };
      if (patch.fullName !== undefined) {
        setAadhaarEntries((prevAadhaar) => syncIdsWithGuests(prevAadhaar, copy));
      }
      return copy;
    });
  };

  const updateIdEntry = (idx: number, patch: Partial<GuestIdEntry>) => {
    setAadhaarEntries((prev) => {
      const copy = syncIdsWithGuests(prev, guestsInfo);
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  // Upload image first -> compress & run automatic OCR Aadhaar detection
  const handleIdUpload = async (idx: number, file: File | undefined) => {
    if (!file) return;

    updateIdEntry(idx, {
      ocrStatus: 'scanning',
      ocrMessage: 'Scanning ID image for 12-digit Aadhaar number...',
    });

    try {
      const [compressedDataUrl, detection] = await Promise.all([
        compressIdImageToDataUrl(file),
        detectAadhaarNumberFromFile(file),
      ]);

      setAadhaarEntries((prev) => {
        const copy = syncIdsWithGuests(prev, guestsInfo);
        const current = copy[idx];
        const nextNumber =
          current.idType === 'aadhaar' && detection.detectedNumber
            ? detection.detectedNumber
            : current.aadhaarNumber;

        copy[idx] = {
          ...current,
          aadhaarImage: compressedDataUrl || current.aadhaarImage,
          aadhaarNumber: nextNumber,
          ocrStatus: detection.detectedNumber ? 'detected' : 'not_found',
          ocrMessage: detection.detectedNumber
            ? `Auto-detected (${detection.source.toUpperCase()}) • Please confirm in second field`
            : 'Image attached — please enter & confirm the ID number below.',
        };
        return copy;
      });
    } catch {
      updateIdEntry(idx, {
        ocrStatus: 'not_found',
        ocrMessage: 'Could not scan image — please enter the ID number manually.',
      });
    }
  };

  // Step 1 Validation
  const step1Errors = useMemo(() => {
    const map: Record<string, string> = {};
    if (!selectedRoom) {
      map.room = 'Please select an available chamber to continue.';
    } else if (selectedRoom.housekeeping_state === 'unavailable') {
      map.room = `Room #${selectedRoom.room_number} is currently unavailable. Please select another available chamber above.`;
    }
    if (!checkIn) {
      map.checkIn = 'Please choose your check-in date.';
    }
    if (!checkOut || (checkIn && checkOut <= checkIn)) {
      map.checkOut = 'Check-out date must be at least 1 night after check-in.';
    }
    return map;
  }, [selectedRoom, checkIn, checkOut]);

  // Step 2 Validation
  const step2Errors = useMemo(() => {
    const map: Record<string, string> = {};
    guestsInfo.forEach((guest, idx) => {
      if (!guest.fullName.trim() || guest.fullName.trim().length < 2) {
        map[`guest_${idx}_name`] = 'Enter full name (min 2 characters).';
      }
      if (guest.phone.replace(/\D/g, '').length < 8) {
        map[`guest_${idx}_phone`] = 'Enter a valid mobile number (e.g. +91 98290 12345).';
      }
      if (idx === 0) {
        if (!guest.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim())) {
          map.guest_0_email = 'Enter a valid email address (e.g. guest@example.com).';
        }
      }
      if (!guest.dob || guest.dob > todayYMD) {
        map[`guest_${idx}_dob`] = 'Select a valid date of birth.';
      }
    });
    return map;
  }, [guestsInfo, todayYMD]);

  // Step 3 Validation: Upload-now rules (mandatory image for Aadhaar, match both fields, unique per guest)
  const step3Errors = useMemo(() => {
    const map: Record<string, string> = {};
    if (idSubmissionMode === 'submit_at_counter') {
      return map;
    }

    const seenIdentifiers = new Map<string, number>();

    aadhaarEntries.forEach((entry, idx) => {
      if (!entry.fullName.trim() || entry.fullName.trim().length < 2) {
        map[`id_${idx}_name`] = 'Enter the guest name as printed on ID.';
      }

      if (entry.idType === 'aadhaar') {
        if (!entry.aadhaarImage) {
          map[`id_${idx}_image`] = 'Required: upload the Aadhaar card image for faster check-in.';
        }

        const primaryDigits = entry.aadhaarNumber.replace(/\D/g, '');
        const confirmDigits = entry.confirmAadhaarNumber.replace(/\D/g, '');

        if (primaryDigits.length !== 12) {
          map[`id_${idx}_aadhaar`] = 'Required: enter a valid 12-digit Aadhaar number.';
        }

        if (confirmDigits.length !== 12) {
          map[`id_${idx}_confirm`] = 'Required: confirm the 12-digit Aadhaar number.';
        } else if (primaryDigits.length === 12 && confirmDigits !== primaryDigits) {
          map[`id_${idx}_confirm`] = 'Both Aadhaar number fields must match identically.';
        }

        if (primaryDigits.length === 12) {
          const priorIdx = seenIdentifiers.get(primaryDigits);
          if (priorIdx !== undefined) {
            map[`id_${idx}_aadhaar`] = `Aadhaar number must be different from Guest #${
              priorIdx + 1
            }.`;
          } else {
            seenIdentifiers.set(primaryDigits, idx);
          }
        }
      } else {
        if (!entry.aadhaarImage) {
          map[`id_${idx}_image`] = 'Required: upload the government ID document image.';
        }
        const docId = entry.aadhaarNumber.trim().toUpperCase();
        if (docId.length < 5) {
          map[`id_${idx}_aadhaar`] = 'Required: enter a valid document ID number.';
        } else {
          const priorIdx = seenIdentifiers.get(docId);
          if (priorIdx !== undefined) {
            map[`id_${idx}_aadhaar`] = `ID number must be different from Guest #${priorIdx + 1}.`;
          } else {
            seenIdentifiers.set(docId, idx);
          }
        }
      }
    });

    return map;
  }, [idSubmissionMode, aadhaarEntries]);

  // Step 4 Validation: Mandatory TNR for Pay 100% Now + Terms Acceptance
  const step4Errors = useMemo(() => {
    const map: Record<string, string> = {};
    if (paymentPlan === 'pay_100_now' && tnrNumber.trim().length < 6) {
      map.tnr = 'Mandatory: enter your valid Transaction Reference Number (TNR / UTR, min 6 chars).';
    }
    if (!termsAccepted) {
      map.terms = 'Please accept the Rajmahal Heritage Guarantee to complete reservation.';
    }
    return map;
  }, [paymentPlan, tnrNumber, termsAccepted]);

  const getErrorsForStep = (step: BookingStep): Record<string, string> => {
    switch (step) {
      case 1:
        return step1Errors;
      case 2:
        return step2Errors;
      case 3:
        return step3Errors;
      case 4:
        return step4Errors;
    }
  };

  const focusActiveStepHeading = () => {
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus();
    });
  };

  const handleNextStep = () => {
    setStepAttempted((prev) => ({ ...prev, [currentStep]: true }));
    const errs = getErrorsForStep(currentStep);
    if (Object.keys(errs).length > 0) {
      return;
    }

    const nextStep = Math.min(4, currentStep + 1) as BookingStep;
    if (nextStep === 3) {
      setAadhaarEntries((prev) => syncIdsWithGuests(prev, guestsInfo));
    }
    if (nextStep === 4 && !cardHolderName && guestsInfo[0]?.fullName) {
      setCardHolderName(guestsInfo[0].fullName);
    }

    setCurrentStep(nextStep);
    setHighestVisitedStep((prev) => (nextStep > prev ? nextStep : prev));
    focusActiveStepHeading();
  };

  const handlePrevStep = () => {
    const prevStep = Math.max(1, currentStep - 1) as BookingStep;
    setCurrentStep(prevStep);
    focusActiveStepHeading();
  };

  const handleJumpToStep = (target: BookingStep) => {
    if (target <= currentStep || target <= highestVisitedStep) {
      if (target === 3) {
        setAadhaarEntries((prev) => syncIdsWithGuests(prev, guestsInfo));
      }
      setCurrentStep(target);
      focusActiveStepHeading();
    }
  };

  const handleConfirmAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 4) {
      handleNextStep();
      return;
    }
    if (!allowExplicitSubmitRef.current) {
      return;
    }
    allowExplicitSubmitRef.current = false;
    setStepAttempted((prev) => ({ ...prev, 4: true }));
    setApiError(null);

    if (Object.keys(step4Errors).length > 0) {
      return;
    }

    if (!selectedRoom) {
      setApiError('Unable to locate an active chamber. Please re-select a room on Step 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      const primaryGuest = guestsInfo[0];

      const guestsDetailsPayload: ReservationGuestDetail[] = guestsInfo.map((g, idx) => ({
        guest_index: idx + 1,
        full_name: g.fullName.trim(),
        phone: g.phone.trim(),
        email: idx === 0 ? g.email.trim() : null,
        dob: g.dob,
      }));

      const aadhaarPayload: GuestAadhaarDetail[] =
        idSubmissionMode === 'upload_now'
          ? aadhaarEntries.map((entry, idx) => ({
              guest_index: idx + 1,
              id_type: entry.idType,
              full_name:
                entry.fullName.trim() || guestsInfo[idx]?.fullName.trim() || `Guest ${idx + 1}`,
              aadhaar_number:
                entry.idType === 'aadhaar'
                  ? formatAadhaarDigits(entry.aadhaarNumber)
                  : entry.aadhaarNumber.trim(),
              aadhaar_image_url: entry.aadhaarImage || '',
              is_verified: true,
            }))
          : guestsInfo.map((g, idx) => ({
              guest_index: idx + 1,
              id_type: 'aadhaar',
              full_name: g.fullName.trim() || `Guest ${idx + 1}`,
              aadhaar_number: 'Submit at Counter',
              aadhaar_image_url: '',
              is_verified: false,
            }));

      const isPayOnArrival = paymentPlan === 'pay_on_arrival';
      const paymentStatus = isPayOnArrival ? 'pay_on_arrival' : 'paid';
      const paymentMethod = isPayOnArrival ? 'pay_on_arrival' : onlineMethod;
      const paymentReference = isPayOnArrival ? 'PAY-ON-ARRIVAL' : tnrNumber.trim();
      const combinedNotes = [
        `Check-In Timing: ${checkInTime}`,
        `Check-Out Timing: ${checkOutTime}`,
        isPayOnArrival ? 'Settlement: Pay on Arrival at Reception Counter' : '',
        earlyCheckInOpted || lateCheckOutOpted
          ? 'Early Check-In / Late Check-Out Charges: Payable at Counter on Arrival'
          : '',
        notes.trim() ? `Preferences: ${notes.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomTypeId: selectedRoom.room_type_id || selectedRoom.id,
          roomId: selectedRoom.id,
          roomNumber: selectedRoom.room_number,
          rateMinor,
          checkIn,
          checkOut,
          checkInTime,
          checkOutTime,
          earlyCheckInOpted,
          lateCheckOutOpted,
          idSubmissionMode,
          partySize,
          guestName: primaryGuest.fullName.trim(),
          guestPhone: primaryGuest.phone.trim(),
          guestEmail: primaryGuest.email.trim(),
          primaryGuestUid: authUser?.uid || null,
          notes: combinedNotes,
          guestsDetails: guestsDetailsPayload,
          aadhaarDetails: aadhaarPayload,
          depositAmountMinor: payableNowMinor,
          paymentMethod,
          paymentStatus,
          paymentReference,
          termsAccepted: true,
        }),
      });

      const json = await response.json();
      const created: Reservation | undefined = json.reservation || json.data;
      if (!response.ok || !json.success || !created) {
        setApiError(json.error || 'Reservation could not be completed. Please retry.');
        return;
      }

      setConfirmedReservation(created);
    } catch (err) {
      console.error('Reservation submission failed:', err);
      setApiError('Network error while confirming reservation. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryGuest = guestsInfo[0];

  return (
    <div className="relative min-h-[100dvh] bg-[#FAF7F2] text-[#2B2018] pt-24 sm:pt-28 lg:pt-32 pb-32 sm:pb-24 overflow-x-clip">
      {/* Decorative Chandra Mandala Design Art anchored cleanly on the RIGHT side */}
      <MandalaOrnament
        position="top-right"
        color="#B08D57"
        opacity={0.32}
        size="clamp(360px, 42vw, 620px)"
        className="-top-10 -right-24 sm:-right-16"
      />
      <MandalaOrnament
        position="bottom-right"
        color="#B08D57"
        opacity={0.22}
        size="clamp(300px, 30vw, 440px)"
        className="-bottom-20 -right-20 hidden lg:block"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Minimal Navigation Breadcrumbs ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
          <Link
            href="/hotel#hotel-chambers"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E8DFCE] text-xs font-semibold text-[#4F0809] hover:border-[#D8AA67] transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#9C7A45]" />
            <span>Back to Palace Search</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {authUser && (
              <Link
                href="/bookings"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] hover:border-[#D8AA67] text-[11px] font-semibold text-[#4F0809] shadow-2xs"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-[#9C7A45]" />
                <span>Your Bookings</span>
              </Link>
            )}
            {selectedRoom && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] text-[11px] font-medium text-[#7A6A5B] shadow-2xs">
                <KeyRound className="w-3.5 h-3.5 text-[#9C7A45]" />
                <span>Chamber ID:</span>
                <code className="font-mono text-[11px] font-semibold text-[#4F0809]">
                  {selectedRoom.id}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* ── Light-Minimal Editorial Page Header ── */}
        <header className="max-w-3xl mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8DFCE] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9C7A45] shadow-2xs mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#D8AA67]" />
            <span>Direct Concierge Desk</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#4F0809] leading-[1.04] tracking-tight"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            Reserve Your{' '}
            <span className="italic font-normal text-[#9C7A45]">Royal Chamber</span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-[#6A5A4E] font-light leading-relaxed max-w-2xl">
            Four guided concierge steps from chamber selection and guest registration to ID
            verification and TNR settlement.
          </p>

          <HeritageDivider className="my-5 max-w-sm !mx-0" opacity={0.45} />
        </header>

        {/* ── Confirmation Voucher State ── */}
        {confirmedReservation ? (
          <section
            aria-live="polite"
            className="rounded-3xl bg-white border border-[#D8AA67] shadow-[0_20px_50px_-20px_rgba(79,8,9,0.16)] p-6 sm:p-10 max-w-3xl mx-auto space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EDE5D8]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9C7A45]">
                    Official Palace Voucher
                  </span>
                  <h2
                    className="text-3xl font-semibold text-[#4F0809] leading-tight"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    Reservation Confirmed
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] text-center">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#8C755C]">
                    Guest Verify Code
                  </span>
                  <span className="font-mono text-base font-bold text-[#9C7A45]">
                    {confirmedReservation.verification_code || confirmedReservation.reference_code}
                  </span>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] text-right">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-[#8C755C]">
                    Booking Ref
                  </span>
                  <span className="font-mono text-base font-bold text-[#4F0809]">
                    {confirmedReservation.reference_code}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8]">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C755C]">
                  Reserved Chamber
                </span>
                <p className="mt-1 font-semibold text-[#4F0809]">
                  {confirmedReservation.room_type_name || 'Royal Chamber'} • Room #
                  {confirmedReservation.room_number}
                </p>
                <p className="mt-0.5 text-xs font-mono text-[#7A6A5B]">
                  UID: {confirmedReservation.room_id || confirmedReservation.room_type_id}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8]">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C755C]">
                  Guest Party ({confirmedReservation.party_size})
                </span>
                <p className="mt-1 font-semibold text-[#4F0809]">
                  {confirmedReservation.guest?.name || primaryGuest?.fullName}
                  {confirmedReservation.party_size > 1
                    ? ` + ${confirmedReservation.party_size - 1} accompanying`
                    : ''}
                </p>
                <p className="mt-0.5 text-xs text-[#6A5A4E]">
                  {confirmedReservation.guest?.phone} • {confirmedReservation.guest?.email}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8]">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C755C]">
                  Stay Dates &amp; Palace Timings
                </span>
                <p className="mt-1 font-semibold text-[#4F0809]">
                  {formatStayDate(confirmedReservation.check_in)} &rarr;{' '}
                  {formatStayDate(confirmedReservation.check_out)} ({nights}N)
                </p>
                <p className="mt-0.5 text-xs text-[#6A5A4E]">
                  {confirmedReservation.check_in_time} • {confirmedReservation.check_out_time}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8]">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C755C]">
                  Settlement &amp; TNR
                </span>
                <p
                  className="mt-1 text-2xl font-bold text-[#4F0809]"
                  style={{
                    fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  }}
                >
                  {formatMoney(totalTariffMinor)}
                </p>
                <p
                  className={`mt-0.5 text-xs font-medium ${
                    confirmedReservation.payment_status === 'pay_on_arrival' ||
                    confirmedReservation.payment_method === 'pay_on_arrival'
                      ? 'text-amber-800'
                      : 'text-emerald-700'
                  }`}
                >
                  {confirmedReservation.payment_status === 'pay_on_arrival' ||
                  confirmedReservation.payment_method === 'pay_on_arrival' ? (
                    <>
                      Pay on Arrival: {formatMoney(totalTariffMinor)} payable at reception counter
                    </>
                  ) : (
                    <>
                      Paid Online (100%):{' '}
                      {formatMoney(confirmedReservation.deposit_amount_minor || 0)} • TNR:{' '}
                      <span className="font-mono">{confirmedReservation.payment_reference}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {(confirmedReservation.early_check_in_opted ||
              confirmedReservation.late_check_out_opted) && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>Counter Timing Note:</strong> Early Check-In / Late Check-Out charges will
                apply and will be settled on the reception counter upon arrival.
              </div>
            )}

            {/* Co-Guest Invitation Pass Preview */}
            <div className="rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9C7A45]">
                  Share Stay With Accompanying Guests
                </span>
                <p className="text-xs text-[#5C4E42]">
                  Send the WhatsApp invitation card with booking URL and verification code{' '}
                  <code className="font-mono font-bold text-[#4F0809] bg-white px-2 py-0.5 rounded border border-[#E8DFCE]">
                    {confirmedReservation.verification_code || confirmedReservation.reference_code}
                  </code>{' '}
                  so co-guests can add this booking to their own &ldquo;Your Bookings&rdquo;.
                </p>
              </div>
              <a
                href={`/api/reservations/${encodeURIComponent(
                  confirmedReservation.id
                )}/voucher-image`}
                download={`Rajmahal-Stay-${confirmedReservation.reference_code}.png`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#DFD3C3] hover:border-[#D8AA67] text-xs font-semibold text-[#4F0809] shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-[#9C7A45]" />
                <span>Pass Image PNG</span>
              </a>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => shareBookingOnWhatsApp(confirmedReservation)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share via WhatsApp (Card &amp; Link)</span>
              </button>

              <button
                type="button"
                onClick={() => printBookingReceipt(confirmedReservation)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#DFD3C3] bg-[#FAF7F2] hover:bg-white text-xs font-semibold text-[#4F0809] transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#9C7A45]" />
                <span>Print Official Receipt</span>
              </button>

              <Link
                href="/bookings"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4F0809] text-[#FAF7F2] text-xs font-semibold hover:bg-[#670E10] transition-colors ml-auto"
              >
                <span>Open Your Bookings</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67]" />
              </Link>
            </div>
          </section>
        ) : (
          /* ── MAIN WORKSPACE: LEFT = ROOM DETAILS | RIGHT = 4-STEP STEPPER ── */
          <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)] gap-7 lg:gap-8 items-start">
            {/* ── LEFT COLUMN: Selected Room Detail Card & Tariff Summary ── */}
            <aside className="space-y-6 lg:sticky lg:top-28">
              {selectedRoom && (
                <div className="rounded-3xl bg-white border border-[#E8DFCE] shadow-[0_14px_38px_-18px_rgba(79,8,9,0.14)] overflow-hidden">
                  <div className="relative aspect-[16/10] w-full bg-[#F3EDE2]">
                    <Image
                      src={getRoomPhoto(selectedRoom)}
                      alt={`${getRoomTitle(selectedRoom)} - Room ${selectedRoom.room_number}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 360px"
                      className="object-cover"
                    />
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#FAF7F2]/95 border border-[#E8DFCE] text-[10px] font-bold uppercase tracking-[0.16em] text-[#4F0809]">
                        {getRoomCategoryBadge(selectedRoom)}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/95 border border-[#E8DFCE] text-xs font-semibold text-[#4F0809]">
                        Room #{selectedRoom.room_number}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    <div>
                      <h2
                        className="text-2xl font-semibold text-[#4F0809] leading-tight"
                        style={{
                          fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                        }}
                      >
                        {getRoomTitle(selectedRoom)}
                      </h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#8C755C]">
                        <span className="inline-flex items-center gap-1">
                          <BedDouble className="w-3.5 h-3.5 text-[#9C7A45]" />
                          {getRoomBedType(selectedRoom)}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>Max {getRoomCapacity(selectedRoom)} Guests</span>
                      </p>
                      <p className="mt-2.5 text-xs text-[#6A5A4E] font-light leading-relaxed line-clamp-3">
                        {getRoomDescription(selectedRoom)}
                      </p>
                      <p className="mt-2.5 text-[11px] font-mono text-[#7A6A5B] bg-[#FAF7F2] border border-[#EDE5D8] rounded-xl px-3 py-1.5 inline-block">
                        Firestore Doc: {selectedRoom.id}
                      </p>
                    </div>

                    {/* Amenities Preview */}
                    <div className="flex flex-wrap gap-1.5">
                      {getRoomAmenities(selectedRoom)
                        .slice(0, 4)
                        .map((item) => (
                          <span
                            key={item}
                            className="px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#EDE5D8] text-[11px] text-[#5C4E42]"
                          >
                            {item}
                          </span>
                        ))}
                    </div>

                    {/* Check-In / Check-Out Timing Summary */}
                    <div className="rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] p-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[#4F0809] gap-2">
                        <span className="inline-flex items-center gap-1.5 font-semibold shrink-0">
                          <Clock className="w-3.5 h-3.5 text-[#9C7A45]" />
                          Check-In
                        </span>
                        <span className="text-right truncate">
                          {formatStayDate(checkIn)} •{' '}
                          {earlyCheckInOpted ? 'Early (Counter Fee)' : 'After 12 Noon'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#5C4E42] gap-2">
                        <span className="inline-flex items-center gap-1.5 font-medium shrink-0">
                          <Clock className="w-3.5 h-3.5 text-[#9C7A45]/70" />
                          Check-Out
                        </span>
                        <span className="text-right truncate">
                          {formatStayDate(checkOut)} •{' '}
                          {lateCheckOutOpted ? 'Late (Counter Fee)' : 'Before 11 AM'}
                        </span>
                      </div>
                    </div>

                    {(earlyCheckInOpted || lateCheckOutOpted) && (
                      <div className="rounded-2xl bg-amber-50/90 border border-amber-200 px-3.5 py-2.5 text-[11px] text-amber-900 leading-relaxed">
                        <strong>Counter Charge Notice:</strong> Early check-in / late check-out
                        charges apply &amp; settle at reception counter on arrival.
                      </div>
                    )}

                    {/* Tariff Breakdown */}
                    <div className="pt-4 border-t border-[#EDE5D8] space-y-2.5 text-sm">
                      <div className="flex items-center justify-between text-[#5C4E42]">
                        <span>
                          {formatMoney(rateMinor)} &times; {nights}{' '}
                          {nights === 1 ? 'night' : 'nights'}
                        </span>
                        <span className="font-medium text-[#2B2018]">
                          {formatMoney(subtotalMinor)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[#5C4E42]">
                        <span>Heritage Taxes &amp; GST (12%)</span>
                        <span className="font-medium text-[#2B2018]">
                          {formatMoney(taxesMinor)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-emerald-700 text-xs font-medium">
                        <span>Portal Booking Fee</span>
                        <span>Waived (Direct Palace)</span>
                      </div>

                      <div className="pt-3 border-t border-[#EDE5D8] flex items-baseline justify-between">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#4F0809]">
                          Total Estimated Tariff
                        </span>
                        <span
                          className="text-2xl font-bold text-[#4F0809]"
                          style={{
                            fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                          }}
                        >
                          {formatMoney(totalTariffMinor)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Light-Minimal Direct Palace Privileges */}
              <div className="rounded-3xl bg-[#FFFDF9] border border-[#D8AA67]/60 p-6 shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#9C7A45]" />
                  <h3
                    className="text-lg font-semibold text-[#4F0809]"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    Direct Palace Privileges
                  </h3>
                </div>
                <ul className="space-y-2 text-xs text-[#5C4E42] font-light">
                  {[
                    'Best heritage rate guaranteed directly on Rajmahal',
                    'Complimentary sunset Rajasthani tea in the courtyard',
                    `Priority suite chamber allocation (${
                      liveRooms.length > 0
                        ? `#${liveRooms[0].room_number} – #${liveRooms[liveRooms.length - 1].room_number}`
                        : '#101 – #106'
                    })`,
                    'Standard hours: Check-in after 12 Noon • Check-out before 11 AM',
                  ].map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#9C7A45] mt-0.5 shrink-0" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            {/* ── RIGHT COLUMN: 4-STEP CONCIERGE STEPPER FORM ── */}
            <section className="min-w-0 space-y-6">
              {/* Visual Stepper Progress Track */}
              <nav
                aria-label="Reservation Progress"
                className="rounded-3xl bg-white border border-[#E8DFCE] shadow-[0_8px_28px_-16px_rgba(79,8,9,0.08)] p-4 sm:p-5"
              >
                <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {STEPPER_ITEMS.map((item) => {
                    const isActive = currentStep === item.step;
                    const isCompleted = currentStep > item.step;
                    const isClickable =
                      item.step <= currentStep || item.step <= highestVisitedStep;

                    return (
                      <li key={item.step}>
                        <button
                          type="button"
                          disabled={!isClickable}
                          onClick={() => handleJumpToStep(item.step)}
                          aria-current={isActive ? 'step' : undefined}
                          className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border transition-all ${
                            isActive
                              ? 'bg-[#4F0809] text-[#FAF7F2] border-[#4F0809] shadow-xs cursor-pointer'
                              : isCompleted
                              ? 'bg-[#FAF7F2] text-[#4F0809] border-[#D8AA67]/70 hover:bg-[#FFF9EF] cursor-pointer'
                              : isClickable
                              ? 'bg-white text-[#5C4E42] border-[#E8DFCE] hover:border-[#D8AA67] cursor-pointer'
                              : 'bg-[#FAF7F2]/60 text-[#A19182] border-[#EDE5D8] cursor-not-allowed'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isActive
                                ? 'bg-[#D8AA67] text-[#4F0809]'
                                : isCompleted
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-white border border-[#DFD3C3] text-[#8C755C]'
                            }`}
                          >
                            {isCompleted ? <Check className="w-3.5 h-3.5" /> : item.step}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold leading-tight truncate">
                              {item.title}
                            </span>
                            <span
                              className={`block text-[10px] leading-tight truncate mt-0.5 ${
                                isActive ? 'text-[#E8DFCE]' : 'text-[#8C755C]'
                              }`}
                            >
                              {item.subtitle}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>

              {/* Stepper Form Container */}
              <form
                onSubmit={handleConfirmAndPay}
                aria-labelledby="active-step-heading"
                noValidate
                className="rounded-3xl bg-white border border-[#E8DFCE] shadow-[0_14px_38px_-18px_rgba(79,8,9,0.12)] p-6 sm:p-8 space-y-6"
              >
                <div role="status" aria-live="polite" className="sr-only">
                  {stepAttempted[currentStep] &&
                  Object.keys(getErrorsForStep(currentStep)).length > 0
                    ? Object.values(getErrorsForStep(currentStep))[0]
                    : `Step ${currentStep} of 4`}
                </div>

                {/* ===================================================================== */}
                {/* STEP 1: 3X SAME-CATEGORY CARDS, LOCKED GUESTS & TIMINGS/COUNTER FEES */}
                {/* ===================================================================== */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EDE5D8]">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9C7A45]">
                          Step 01 of 04 • Chamber &amp; Timings
                        </span>
                        <h2
                          id="active-step-heading"
                          ref={stepHeadingRef}
                          tabIndex={-1}
                          className="text-2xl sm:text-3xl font-semibold text-[#4F0809] mt-0.5 focus:outline-none"
                          style={{
                            fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                          }}
                        >
                          Available {activeCategory} Chambers
                        </h2>
                      </div>
                      <span className="px-3.5 py-1.5 rounded-full bg-[#FAF7F2] border border-[#E8DFCE] text-xs font-semibold text-[#4F0809]">
                        {nights} {nights === 1 ? 'Night' : 'Nights'}
                      </span>
                    </div>

                    {/* 3-Across Same-Category Available Chambers */}
                    <fieldset className="space-y-3">
                      <legend className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A6A5B]">
                        Available in {activeCategory || 'Selected Category'} (
                        {sameCategoryRooms.length})
                      </legend>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {sameCategoryRooms.map((room) => {
                          const isSelected = selectedRoom?.id === room.id;
                          const hk = getRoomHousekeepingMeta(room.housekeeping_state);
                          const roomRate = getRoomRateMinor(room);

                          return (
                            <label
                              key={room.id}
                              className={`relative flex flex-col justify-between gap-2.5 p-3.5 rounded-2xl border cursor-pointer transition-all min-h-[112px] ${
                                isSelected
                                  ? 'border-[#4F0809] bg-[#FAF7F2] ring-1 ring-[#D8AA67]'
                                  : 'border-[#E8DFCE] bg-white hover:border-[#D8AA67]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="radio"
                                    name="selectedRoomId"
                                    value={room.id}
                                    checked={isSelected}
                                    onChange={() => handleSelectChamber(room.id)}
                                    className="accent-[#4F0809] w-4 h-4 shrink-0 cursor-pointer"
                                  />
                                  <span className="text-sm font-semibold text-[#4F0809] truncate">
                                    Room #{room.room_number}
                                  </span>
                                </div>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${hk.pillClass}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${hk.dotClass}`} />
                                  {hk.label}
                                </span>
                              </div>

                              <div className="text-xs text-[#6A5A4E] leading-snug">
                                <p className="font-medium text-[#4F0809] truncate">
                                  {getRoomTitle(room)}
                                </p>
                                <p className="text-[11px] text-[#8C755C] truncate">
                                  {getRoomBedType(room)}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-[#EDE5D8] flex items-center justify-between gap-1">
                                <span className="text-xs font-bold text-[#9C7A45]">
                                  {formatMoney(roomRate)}/N
                                </span>
                                <span className="text-[10px] font-mono text-[#8C755C] truncate max-w-[100px]">
                                  {room.id}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {/* More Suites & Other Categories Dropdown */}
                      {otherSuitesRooms.length > 0 && (
                        <div className="pt-2">
                          <button
                            type="button"
                            aria-expanded={moreSuitesOpen}
                            aria-controls="more-suites-dropdown-panel"
                            onClick={() => setMoreSuitesOpen((o) => !o)}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-[#DFD3C3] bg-[#FAF7F2] hover:bg-white hover:border-[#D8AA67] text-xs font-semibold text-[#4F0809] transition-colors cursor-pointer"
                          >
                            <span className="inline-flex items-center gap-2">
                              <BedDouble className="w-4 h-4 text-[#9C7A45]" />
                              <span>
                                More Suites &amp; Other Categories ({otherSuitesRooms.length})
                              </span>
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-[#9C7A45] transition-transform duration-200 ${
                                moreSuitesOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {moreSuitesOpen && (
                            <div
                              id="more-suites-dropdown-panel"
                              className="mt-3 p-3.5 rounded-2xl border border-[#E8DFCE] bg-[#FAF7F2]/75 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
                            >
                              {otherSuitesRooms.map((room) => {
                                const isSelected = selectedRoom?.id === room.id;
                                const hk = getRoomHousekeepingMeta(room.housekeeping_state);
                                return (
                                  <button
                                    key={room.id}
                                    type="button"
                                    onClick={() => {
                                      handleSelectChamber(room.id);
                                      setMoreSuitesOpen(false);
                                    }}
                                    className={`text-left flex flex-col justify-between gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'border-[#4F0809] bg-white ring-1 ring-[#D8AA67]'
                                        : 'border-[#E8DFCE] bg-white hover:border-[#D8AA67]'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1.5 w-full">
                                      <span className="text-xs font-semibold text-[#4F0809] truncate">
                                        Room #{room.room_number}
                                      </span>
                                      <span
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${hk.pillClass}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${hk.dotClass}`} />
                                        {hk.label}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#5C4E42] truncate">
                                      {getRoomTitle(room)}
                                    </p>
                                    <div className="flex items-center justify-between text-[11px] text-[#7A6A5B]">
                                      <span className="font-semibold text-[#9C7A45]">
                                        {formatMoney(getRoomRateMinor(room))}/N
                                      </span>
                                      <span className="font-mono text-[10px] truncate max-w-[90px]">
                                        {room.id}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {step1Errors.room && (
                        <div
                          role="alert"
                          className="p-3.5 rounded-2xl bg-[#FDF3F2] border border-[#F5C2C0] text-xs text-[#9C231B] flex items-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{step1Errors.room}</span>
                        </div>
                      )}
                    </fieldset>

                    {/* Dates & Read-Only Locked Guest Count */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="book-check-in"
                          className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C4E42]"
                        >
                          Check-In Date <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                        </label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 text-[#9C7A45] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="book-check-in"
                            type="date"
                            name="checkIn"
                            required
                            min={todayYMD}
                            value={checkIn}
                            onChange={(e) => {
                              const nextIn = e.target.value;
                              setCheckIn(nextIn);
                              let nextOut = checkOut;
                              if (checkOut && nextIn >= checkOut) {
                                const dt = new Date(`${nextIn}T00:00:00`);
                                dt.setDate(dt.getDate() + 1);
                                nextOut = dt.toISOString().split('T')[0];
                                setCheckOut(nextOut);
                              }
                              if (selectedRoom?.id) {
                                router.replace(
                                  buildRoomBookHref(selectedRoom.id, {
                                    checkIn: nextIn,
                                    checkOut: nextOut,
                                    guests: partySize,
                                  }),
                                  { scroll: false }
                                );
                              }
                            }}
                            className="w-full min-h-[48px] pl-10 pr-3.5 rounded-2xl bg-[#FAF7F2] border border-[#DFD3C3] text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] focus-visible:ring-2 focus-visible:ring-[#D8AA67]/60"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="book-check-out"
                          className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C4E42]"
                        >
                          Check-Out Date <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                        </label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 text-[#9C7A45] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="book-check-out"
                            type="date"
                            name="checkOut"
                            required
                            min={checkIn || getFormattedDateOffset(1)}
                            value={checkOut}
                            aria-invalid={Boolean(stepAttempted[1] && step1Errors.checkOut)}
                            onChange={(e) => {
                              const nextOut = e.target.value;
                              setCheckOut(nextOut);
                              if (selectedRoom?.id) {
                                router.replace(
                                  buildRoomBookHref(selectedRoom.id, {
                                    checkIn,
                                    checkOut: nextOut,
                                    guests: partySize,
                                  }),
                                  { scroll: false }
                                );
                              }
                            }}
                            className={`w-full min-h-[48px] pl-10 pr-3.5 rounded-2xl bg-[#FAF7F2] border text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] focus-visible:ring-2 focus-visible:ring-[#D8AA67]/60 ${
                              stepAttempted[1] && step1Errors.checkOut
                                ? 'border-[#B3261E] bg-[#FDF3F2]'
                                : 'border-[#DFD3C3]'
                            }`}
                          />
                        </div>
                        {stepAttempted[1] && step1Errors.checkOut && (
                          <p className="text-xs text-[#B3261E] flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{step1Errors.checkOut}</span>
                          </p>
                        )}
                      </div>

                      {/* Locked Guests Count (cannot be modified on booking page) */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5C4E42]">
                          Total Guests (Locked)
                        </span>
                        <div
                          aria-readonly="true"
                          className="w-full min-h-[48px] px-3.5 rounded-2xl bg-[#F4EFE6] border border-[#E8DFCE] text-sm font-semibold text-[#4F0809] flex items-center justify-between gap-2 select-none"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#9C7A45]" />
                            <span>
                              {partySize} {partySize === 1 ? 'Guest' : 'Guests'}
                            </span>
                          </span>
                          <Lock className="w-3.5 h-3.5 text-[#8C755C]" aria-hidden="true" />
                        </div>
                      </div>
                    </div>

                    {/* Check-In After 12 Noon / Check-Out Before 11 AM + Early/Late Counter Fee Notice */}
                    <div className="rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] p-4 sm:p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#4F0809]">
                          <Clock className="w-4 h-4 text-[#9C7A45]" />
                          <span>Check-In &amp; Check-Out Timings</span>
                        </span>
                        <span className="text-[11px] font-semibold text-[#9C7A45] bg-white border border-[#E8DFCE] px-3 py-1 rounded-full">
                          Check-in after 12:00 Noon • Check-out before 11:00 AM
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="book-checkin-time"
                            className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5C4E42]"
                          >
                            Check-In Arrival Window
                          </label>
                          <select
                            id="book-checkin-time"
                            value={checkInTime}
                            onChange={(e) => setCheckInTime(e.target.value)}
                            className="w-full min-h-[48px] px-3.5 rounded-xl bg-white border border-[#DFD3C3] text-sm text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] cursor-pointer"
                          >
                            {CHECK_IN_TIMING_OPTIONS.map((slot) => (
                              <option key={slot.label} value={slot.label}>
                                {slot.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="book-checkout-time"
                            className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5C4E42]"
                          >
                            Check-Out Departure Window
                          </label>
                          <select
                            id="book-checkout-time"
                            value={checkOutTime}
                            onChange={(e) => setCheckOutTime(e.target.value)}
                            className="w-full min-h-[48px] px-3.5 rounded-xl bg-white border border-[#DFD3C3] text-sm text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] cursor-pointer"
                          >
                            {CHECK_OUT_TIMING_OPTIONS.map((slot) => (
                              <option key={slot.label} value={slot.label}>
                                {slot.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div
                        className={`rounded-xl px-4 py-3 border text-xs leading-relaxed flex items-start gap-2.5 ${
                          earlyCheckInOpted || lateCheckOutOpted
                            ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                            : 'bg-white border-[#E8DFCE] text-[#6A5A4E]'
                        }`}
                      >
                        <AlertCircle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            earlyCheckInOpted || lateCheckOutOpted
                              ? 'text-amber-700'
                              : 'text-[#9C7A45]'
                          }`}
                        />
                        <span>
                          {earlyCheckInOpted || lateCheckOutOpted
                            ? 'Early Check-In / Late Check-Out opted: additional timing charges will apply and will be settled on the reception counter upon arrival.'
                            : 'Standard timing is Check-in after 12:00 Noon and Check-out before 11:00 AM. If Early Check-In or Late Check-Out is opted, extra charges will apply and will be settled on the counter on arrival.'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ===================================================================== */}
                {/* STEP 2: LOCKED-COUNT GUEST PROFILES + SPECIAL PREFERENCES AT BOTTOM    */}
                {/* ===================================================================== */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EDE5D8]">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9C7A45]">
                          Step 02 of 04 • Guest Registry
                        </span>
                        <h2
                          id="active-step-heading"
                          ref={stepHeadingRef}
                          tabIndex={-1}
                          className="text-2xl sm:text-3xl font-semibold text-[#4F0809] mt-0.5 focus:outline-none"
                          style={{
                            fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                          }}
                        >
                          Guest Information ({partySize}{' '}
                          {partySize === 1 ? 'Guest' : 'Guests'})
                        </h2>
                      </div>

                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4EFE6] border border-[#E8DFCE] text-xs font-semibold text-[#4F0809]">
                        <Lock className="w-3.5 h-3.5 text-[#9C7A45]" />
                        <span>
                          {partySize} {partySize === 1 ? 'Guest' : 'Guests'} Fixed
                        </span>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {guestsInfo.map((guest, idx) => {
                        const isPrimary = idx === 0;
                        const nameErr = stepAttempted[2] && step2Errors[`guest_${idx}_name`];
                        const phoneErr = stepAttempted[2] && step2Errors[`guest_${idx}_phone`];
                        const emailErr = isPrimary && stepAttempted[2] && step2Errors.guest_0_email;
                        const dobErr = stepAttempted[2] && step2Errors[`guest_${idx}_dob`];

                        return (
                          <div
                            key={idx}
                            className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#4F0809]">
                                {isPrimary
                                  ? 'Guest #1 • Primary Reservation Holder'
                                  : `Guest #${idx + 1} • Accompanying Guest`}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E8DFCE] text-[10px] font-semibold text-[#9C7A45]">
                                {isPrimary ? 'Name, Mobile, Email & DOB' : 'Name, Mobile & DOB'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label
                                  htmlFor={`guest-name-${idx}`}
                                  className="text-xs font-semibold text-[#5C4E42]"
                                >
                                  Full Name <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                                </label>
                                <input
                                  id={`guest-name-${idx}`}
                                  type="text"
                                  required
                                  minLength={2}
                                  autoComplete={isPrimary ? 'name' : 'off'}
                                  placeholder={
                                    isPrimary
                                      ? 'e.g. Kunwar Vikramaditya Rathore'
                                      : `Guest ${idx + 1} Full Name`
                                  }
                                  value={guest.fullName}
                                  aria-invalid={Boolean(nameErr)}
                                  onChange={(e) =>
                                    updateGuestField(idx, { fullName: e.target.value })
                                  }
                                  className={`w-full min-h-[48px] px-3.5 rounded-xl bg-white border text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] ${
                                    nameErr ? 'border-[#B3261E] bg-[#FDF3F2]' : 'border-[#DFD3C3]'
                                  }`}
                                />
                                {nameErr && (
                                  <p className="text-xs text-[#B3261E] flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{nameErr}</span>
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label
                                  htmlFor={`guest-phone-${idx}`}
                                  className="text-xs font-semibold text-[#5C4E42]"
                                >
                                  Mobile Number <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                                </label>
                                <input
                                  id={`guest-phone-${idx}`}
                                  type="tel"
                                  inputMode="tel"
                                  required
                                  autoComplete={isPrimary ? 'tel' : 'off'}
                                  placeholder="+91 98290 12345"
                                  value={guest.phone}
                                  aria-invalid={Boolean(phoneErr)}
                                  onChange={(e) =>
                                    updateGuestField(idx, { phone: e.target.value })
                                  }
                                  className={`w-full min-h-[48px] px-3.5 rounded-xl bg-white border text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] ${
                                    phoneErr ? 'border-[#B3261E] bg-[#FDF3F2]' : 'border-[#DFD3C3]'
                                  }`}
                                />
                                {phoneErr && (
                                  <p className="text-xs text-[#B3261E] flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{phoneErr}</span>
                                  </p>
                                )}
                              </div>

                              {isPrimary && (
                                <div className="flex flex-col gap-1.5">
                                  <label
                                    htmlFor="guest-email-0"
                                    className="text-xs font-semibold text-[#5C4E42]"
                                  >
                                    Email Address <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                                  </label>
                                  <input
                                    id="guest-email-0"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    autoCorrect="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    placeholder="guest@example.com"
                                    value={guest.email}
                                    aria-invalid={Boolean(emailErr)}
                                    onChange={(e) =>
                                      updateGuestField(0, { email: e.target.value })
                                    }
                                    className={`w-full min-h-[48px] px-3.5 rounded-xl bg-white border text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] ${
                                      emailErr
                                        ? 'border-[#B3261E] bg-[#FDF3F2]'
                                        : 'border-[#DFD3C3]'
                                    }`}
                                  />
                                  {emailErr && (
                                    <p className="text-xs text-[#B3261E] flex items-center gap-1">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>{emailErr}</span>
                                    </p>
                                  )}
                                </div>
                              )}

                              <div className={`flex flex-col gap-1.5 ${isPrimary ? '' : 'sm:col-span-2'}`}>
                                <label
                                  htmlFor={`guest-dob-${idx}`}
                                  className="text-xs font-semibold text-[#5C4E42]"
                                >
                                  Date of Birth (DOB){' '}
                                  <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                                </label>
                                <input
                                  id={`guest-dob-${idx}`}
                                  type="date"
                                  required
                                  max={todayYMD}
                                  value={guest.dob}
                                  aria-invalid={Boolean(dobErr)}
                                  onChange={(e) => updateGuestField(idx, { dob: e.target.value })}
                                  className={`w-full min-h-[48px] px-3.5 rounded-xl bg-white border text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] ${
                                    dobErr ? 'border-[#B3261E] bg-[#FDF3F2]' : 'border-[#DFD3C3]'
                                  }`}
                                />
                                {dobErr && (
                                  <p className="text-xs text-[#B3261E] flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{dobErr}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Special Preferences Section at Bottom of Step 2 */}
                    <div className="pt-2 border-t border-[#EDE5D8] flex flex-col gap-2">
                      <label
                        htmlFor="book-special-preferences"
                        className="text-xs font-bold uppercase tracking-[0.14em] text-[#4F0809]"
                      >
                        Special Preferences &amp; Concierge Requests
                      </label>
                      <span className="text-xs text-[#7A6A5B]">
                        Share feather pillow requests, heritage dining setup, celebration décor, or
                        airport pickup preferences.
                      </span>
                      <textarea
                        id="book-special-preferences"
                        name="notes"
                        rows={3}
                        placeholder="e.g. Vegetarian royal thali preference, lake-facing quiet courtyard preference, Udaipur airport cab..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-[#FAF7F2] border border-[#DFD3C3] text-base text-[#2B2018] placeholder:text-[#A39383] focus:outline-none focus-visible:border-[#4F0809] focus-visible:ring-2 focus-visible:ring-[#D8AA67]/60"
                      />
                    </div>
                  </div>
                )}

                {/* ===================================================================== */}
                {/* STEP 3: COUNTER VS UPLOAD-NOW + REQUIRED AADHAAR MATCH + UNIQUENESS   */}
                {/* ===================================================================== */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EDE5D8]">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9C7A45]">
                          Step 03 of 04 • Police Verification Dossier
                        </span>
                        <h2
                          id="active-step-heading"
                          ref={stepHeadingRef}
                          tabIndex={-1}
                          className="text-2xl sm:text-3xl font-semibold text-[#4F0809] mt-0.5 focus:outline-none"
                          style={{
                            fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                          }}
                        >
                          Guest Identity Verification
                        </h2>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF7F2] border border-[#E8DFCE] text-xs font-semibold text-[#4F0809]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#9C7A45]" />
                        <span>Express or Counter Check-In</span>
                      </span>
                    </div>

                    {/* Choice: Upload Now (Faster Check-In) vs Submit IDs at Counter */}
                    <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <legend className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A6A5B] mb-2">
                        Choose ID Submission Option
                      </legend>

                      <label
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          idSubmissionMode === 'upload_now'
                            ? 'border-[#4F0809] bg-[#FAF7F2] ring-1 ring-[#D8AA67]'
                            : 'border-[#E8DFCE] bg-white hover:border-[#D8AA67]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="idSubmissionMode"
                          checked={idSubmissionMode === 'upload_now'}
                          onChange={() => setIdSubmissionMode('upload_now')}
                          className="mt-1 accent-[#4F0809] w-4 h-4 shrink-0 cursor-pointer"
                        />
                        <div>
                          <span className="block text-sm font-semibold text-[#4F0809]">
                            Upload IDs Now (Faster Check-In)
                          </span>
                          <span className="block text-xs text-[#6A5A4E] mt-0.5 font-light">
                            Required Aadhaar image upload + matching unique ID numbers for express
                            key handover.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                          idSubmissionMode === 'submit_at_counter'
                            ? 'border-[#4F0809] bg-[#FAF7F2] ring-1 ring-[#D8AA67]'
                            : 'border-[#E8DFCE] bg-white hover:border-[#D8AA67]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="idSubmissionMode"
                          checked={idSubmissionMode === 'submit_at_counter'}
                          onChange={() => setIdSubmissionMode('submit_at_counter')}
                          className="mt-1 accent-[#4F0809] w-4 h-4 shrink-0 cursor-pointer"
                        />
                        <div>
                          <span className="block text-sm font-semibold text-[#4F0809]">
                            Submit IDs at Counter on Arrival
                          </span>
                          <span className="block text-xs text-[#6A5A4E] mt-0.5 font-light">
                            Present original government ID documents for verification at reception
                            counter during check-in.
                          </span>
                        </div>
                      </label>
                    </fieldset>

                    {idSubmissionMode === 'submit_at_counter' ? (
                      <div className="rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] p-5 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#4F0809]">
                          <ShieldCheck className="w-4 h-4 text-[#9C7A45]" />
                          <span>Counter Verification Selected ({partySize} Guests)</span>
                        </div>
                        <p className="text-xs text-[#6A5A4E] leading-relaxed">
                          All accompanying guests listed below must present valid original
                          government-issued photo IDs (Aadhaar / Passport / Driving License) at the
                          reception desk before key handover.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {guestsInfo.map((g, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-full bg-white border border-[#E8DFCE] text-xs font-medium text-[#4F0809]"
                            >
                              Guest #{i + 1}: {g.fullName || 'Guest'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <p className="text-xs sm:text-sm text-[#6A5A4E] font-light leading-relaxed bg-[#FAF7F2] border border-[#E8DFCE] rounded-2xl p-4">
                          Guest names are synced from Step 2 (editable below). Upload each guest&apos;s{' '}
                          <strong>Aadhaar image (required for Aadhaar verification)</strong> to
                          auto-detect the 12-digit number, confirm it in both fields, and ensure every
                          guest enters their own unique Aadhaar number.
                        </p>

                        {aadhaarEntries.map((entry, idx) => {
                          const inputId = `step3-id-upload-${idx}`;
                          const nameErr = stepAttempted[3] && step3Errors[`id_${idx}_name`];
                          const imgErr = stepAttempted[3] && step3Errors[`id_${idx}_image`];
                          const aadhaarErr = stepAttempted[3] && step3Errors[`id_${idx}_aadhaar`];
                          const confirmErr = stepAttempted[3] && step3Errors[`id_${idx}_confirm`];
                          const sourceGuestName = guestsInfo[idx]?.fullName || '';

                          return (
                            <div
                              key={idx}
                              className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] space-y-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#4F0809]">
                                  Guest #{idx + 1} ID Verification
                                </span>

                                <div className="flex items-center gap-2">
                                  <label
                                    htmlFor={`id-type-${idx}`}
                                    className="text-[11px] font-medium text-[#7A6A5B]"
                                  >
                                    Document:
                                  </label>
                                  <select
                                    id={`id-type-${idx}`}
                                    value={entry.idType}
                                    onChange={(e) =>
                                      updateIdEntry(idx, {
                                        idType: e.target.value as 'aadhaar' | 'other',
                                        aadhaarNumber: '',
                                        confirmAadhaarNumber: '',
                                        ocrStatus: 'idle',
                                        ocrMessage: '',
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-full bg-white border border-[#DFD3C3] text-xs font-semibold text-[#4F0809] cursor-pointer"
                                  >
                                    <option value="aadhaar">Aadhaar Verification</option>
                                    <option value="other">Passport / Driving License</option>
                                  </select>
                                </div>
                              </div>

                              {/* Editable Guest Full Name (Auto-Fetched from Step 2) */}
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <label
                                    htmlFor={`id-guest-name-${idx}`}
                                    className="text-xs font-semibold text-[#5C4E42]"
                                  >
                                    Name on {entry.idType === 'aadhaar' ? 'Aadhaar Card' : 'ID'}{' '}
                                    <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                                  </label>
                                  {entry.nameCustomizedInStep3 && sourceGuestName && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateIdEntry(idx, {
                                          fullName: sourceGuestName,
                                          nameCustomizedInStep3: false,
                                        })
                                      }
                                      className="text-[10px] font-semibold text-[#9C7A45] hover:underline cursor-pointer"
                                    >
                                      Sync Step 2 Name
                                    </button>
                                  )}
                                </div>
                                <input
                                  id={`id-guest-name-${idx}`}
                                  type="text"
                                  required
                                  value={entry.fullName}
                                  placeholder="Full name as on ID"
                                  aria-invalid={Boolean(nameErr)}
                                  onChange={(e) =>
                                    updateIdEntry(idx, {
                                      fullName: e.target.value,
                                      nameCustomizedInStep3: true,
                                    })
                                  }
                                  className={`w-full min-h-[48px] px-3.5 rounded-xl bg-white border text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] ${
                                    nameErr ? 'border-[#B3261E] bg-[#FDF3F2]' : 'border-[#DFD3C3]'
                                  }`}
                                />
                                {nameErr && (
                                  <p className="text-xs text-[#B3261E] flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{nameErr}</span>
                                  </p>
                                )}
                              </div>

                              {/* Required ID Image Upload FIRST -> Triggers Automatic OCR */}
                              <div
                                className={`rounded-2xl bg-white border border-dashed p-4 space-y-3 ${
                                  imgErr ? 'border-[#B3261E] bg-[#FDF3F2]/50' : 'border-[#D8AA67]'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="space-y-0.5">
                                    <span className="block text-xs font-semibold text-[#4F0809]">
                                      Upload{' '}
                                      {entry.idType === 'aadhaar' ? 'Aadhaar Card Image' : 'ID Scan'}{' '}
                                      <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                                    </span>
                                    <span className="block text-[11px] text-[#7A6A5B]">
                                      {entry.idType === 'aadhaar'
                                        ? 'Mandatory for Aadhaar verification — auto-detects Aadhaar digits when added.'
                                        : 'Mandatory document scan for express counter check-in.'}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <input
                                      id={inputId}
                                      type="file"
                                      accept="image/*"
                                      className="sr-only"
                                      onChange={(e) => handleIdUpload(idx, e.target.files?.[0])}
                                    />
                                    <label
                                      htmlFor={inputId}
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAF7F2] border border-[#DFD3C3] hover:border-[#4F0809] text-xs font-semibold text-[#4F0809] cursor-pointer transition-colors"
                                    >
                                      <Upload className="w-3.5 h-3.5 text-[#9C7A45]" />
                                      <span>
                                        {entry.aadhaarImage ? 'Replace Image' : 'Upload ID Image'}
                                      </span>
                                    </label>

                                    {entry.aadhaarImage && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setLightboxTitle(
                                              `${entry.fullName || `Guest #${idx + 1}`} — ID Card`
                                            );
                                            setLightboxSrc(entry.aadhaarImage);
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#4F0809] text-[#FAF7F2] text-xs font-semibold hover:bg-[#670E10] cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-[#D8AA67]" />
                                          <span>Preview</span>
                                        </button>
                                        <button
                                          type="button"
                                          aria-label={`Remove Guest ${idx + 1} ID image`}
                                          onClick={() =>
                                            updateIdEntry(idx, {
                                              aadhaarImage: '',
                                              ocrStatus: 'idle',
                                              ocrMessage: '',
                                            })
                                          }
                                          className="p-2 rounded-full text-[#8C755C] hover:text-[#B3261E] hover:bg-[#FAF7F2] cursor-pointer"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {imgErr && (
                                  <p className="text-xs text-[#B3261E] flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>{imgErr}</span>
                                  </p>
                                )}

                                {entry.ocrStatus !== 'idle' && (
                                  <div
                                    className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl border ${
                                      entry.ocrStatus === 'scanning'
                                        ? 'bg-[#FAF7F2] border-[#E8DFCE] text-[#6A5A4E]'
                                        : entry.ocrStatus === 'detected'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-amber-50 border-amber-200 text-amber-800'
                                    }`}
                                  >
                                    {entry.ocrStatus === 'scanning' ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-[#9C7A45]" />
                                    ) : entry.ocrStatus === 'detected' ? (
                                      <ScanLine className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
                                    ) : (
                                      <FileImage className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                                    )}
                                    <span>{entry.ocrMessage}</span>
                                  </div>
                                )}
                              </div>

                              {/* Dual Aadhaar Number Fields (Must Match Each Other & Differ Between Guests) */}
                              {entry.idType === 'aadhaar' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-1.5">
                                    <label
                                      htmlFor={`id-guest-aadhaar-${idx}`}
                                      className="text-xs font-semibold text-[#5C4E42]"
                                    >
                                      12-Digit Aadhaar Number{' '}
                                      <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                                    </label>
                                    <input
                                      id={`id-guest-aadhaar-${idx}`}
                                      type="text"
                                      inputMode="numeric"
                                      required
                                      placeholder="XXXX XXXX XXXX"
                                      value={entry.aadhaarNumber}
                                      aria-invalid={Boolean(aadhaarErr)}
                                      onChange={(e) =>
                                        updateIdEntry(idx, {
                                          aadhaarNumber: formatAadhaarDigits(e.target.value),
                                        })
                                      }
                                      className={`w-full min-h-[48px] px-3.5 rounded-xl bg-white border font-mono text-base text-[#2B2018] tracking-wider focus:outline-none focus-visible:border-[#4F0809] ${
                                        aadhaarErr
                                          ? 'border-[#B3261E] bg-[#FDF3F2]'
                                          : 'border-[#DFD3C3]'
                                      }`}
                                    />
                                    {aadhaarErr ? (
                                      <p className="text-xs text-[#B3261E] flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{aadhaarErr}</span>
                                      </p>
                                    ) : (
                                      <span className="text-[11px] text-[#8C755C]">
                                        Editable before or after auto-scan
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-1.5">
                                    <label
                                      htmlFor={`id-guest-aadhaar-confirm-${idx}`}
                                      className="text-xs font-semibold text-[#5C4E42]"
                                    >
                                      Confirm Aadhaar Number{' '}
                                      <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                                    </label>
                                    <input
                                      id={`id-guest-aadhaar-confirm-${idx}`}
                                      type="text"
                                      inputMode="numeric"
                                      required
                                      placeholder="Re-enter XXXX XXXX XXXX"
                                      value={entry.confirmAadhaarNumber}
                                      aria-invalid={Boolean(confirmErr)}
                                      onChange={(e) =>
                                        updateIdEntry(idx, {
                                          confirmAadhaarNumber: formatAadhaarDigits(e.target.value),
                                        })
                                      }
                                      className={`w-full min-h-[48px] px-3.5 rounded-xl bg-white border font-mono text-base text-[#2B2018] tracking-wider focus:outline-none focus-visible:border-[#4F0809] ${
                                        confirmErr
                                          ? 'border-[#B3261E] bg-[#FDF3F2]'
                                          : 'border-[#DFD3C3]'
                                      }`}
                                    />
                                    {confirmErr ? (
                                      <p className="text-xs text-[#B3261E] flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{confirmErr}</span>
                                      </p>
                                    ) : entry.confirmAadhaarNumber.replace(/\D/g, '').length ===
                                        12 &&
                                      entry.confirmAadhaarNumber.replace(/\D/g, '') ===
                                        entry.aadhaarNumber.replace(/\D/g, '') ? (
                                      <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                                        <Check className="w-3.5 h-3.5" />
                                        Aadhaar numbers match
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-[#8C755C]">
                                        Must match Guest #{idx + 1} Aadhaar field
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  <label
                                    htmlFor={`id-guest-aadhaar-${idx}`}
                                    className="text-xs font-semibold text-[#5C4E42]"
                                  >
                                    Passport / Driving License Number{' '}
                                    <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                                  </label>
                                  <input
                                    id={`id-guest-aadhaar-${idx}`}
                                    type="text"
                                    required
                                    placeholder="Document Number"
                                    value={entry.aadhaarNumber}
                                    aria-invalid={Boolean(aadhaarErr)}
                                    onChange={(e) =>
                                      updateIdEntry(idx, {
                                        aadhaarNumber: e.target.value.toUpperCase(),
                                      })
                                    }
                                    className={`w-full min-h-[48px] px-3.5 rounded-xl bg-white border font-mono text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] ${
                                      aadhaarErr
                                        ? 'border-[#B3261E] bg-[#FDF3F2]'
                                        : 'border-[#DFD3C3]'
                                    }`}
                                  />
                                  {aadhaarErr && (
                                    <p className="text-xs text-[#B3261E] flex items-center gap-1">
                                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                      <span>{aadhaarErr}</span>
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ===================================================================== */}
                {/* STEP 4: PAYMENT SETTLEMENT + MANDATORY TNR REFERENCE INPUT            */}
                {/* ===================================================================== */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#EDE5D8]">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9C7A45]">
                          Step 04 of 04 • Palace Settlement
                        </span>
                        <h2
                          id="active-step-heading"
                          ref={stepHeadingRef}
                          tabIndex={-1}
                          className="text-2xl sm:text-3xl font-semibold text-[#4F0809] mt-0.5 focus:outline-none"
                          style={{
                            fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                          }}
                        >
                          Payment Options &amp; Confirmation
                        </h2>
                      </div>
                      <span
                        className="text-xl sm:text-2xl font-bold text-[#4F0809]"
                        style={{
                          fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                        }}
                      >
                        {formatMoney(totalTariffMinor)}
                      </span>
                    </div>

                    {/* Stay Recap Strip */}
                    <div className="rounded-2xl bg-[#FAF7F2] border border-[#E8DFCE] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[#8C755C] uppercase tracking-wider font-semibold block">
                          Chamber
                        </span>
                        <span className="text-[#4F0809] font-semibold mt-0.5 block">
                          Room #{selectedRoom?.room_number} •{' '}
                          {selectedRoom ? getRoomTitle(selectedRoom) : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8C755C] uppercase tracking-wider font-semibold block">
                          Stay Dates
                        </span>
                        <span className="text-[#4F0809] font-semibold mt-0.5 block">
                          {formatStayDate(checkIn)} &rarr; {formatStayDate(checkOut)} ({nights}N)
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8C755C] uppercase tracking-wider font-semibold block">
                          ID Verification Mode
                        </span>
                        <span className="text-[#4F0809] font-semibold mt-0.5 block">
                          {partySize} {partySize === 1 ? 'Guest' : 'Guests'} •{' '}
                          {idSubmissionMode === 'upload_now' ? 'Uploaded Online' : 'Counter Arrival'}
                        </span>
                      </div>
                    </div>

                    {(earlyCheckInOpted || lateCheckOutOpted) && (
                      <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-950 flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <span>
                          <strong>Counter Settlement Add-on:</strong> Selected Early Check-In / Late
                          Check-Out charges will be added and settled on the reception counter upon
                          arrival.
                        </span>
                      </div>
                    )}

                    {/* Payment Plan: 100% Now OR Pay on Arrival */}
                    <fieldset className="space-y-3">
                      <legend className="text-xs font-bold uppercase tracking-[0.14em] text-[#7A6A5B]">
                        1. Choose Payment Option
                      </legend>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {
                            id: 'pay_100_now' as PaymentPlan,
                            title: 'Pay 100% Now',
                            amount: formatMoney(totalTariffMinor),
                            desc: 'Instant full settlement via UPI QR or Card / NEFT with TNR verification',
                          },
                          {
                            id: 'pay_on_arrival' as PaymentPlan,
                            title: 'Pay on Arrival',
                            amount: `${formatMoney(0)} Due Now`,
                            desc: `Reserve immediately & settle ${formatMoney(
                              totalTariffMinor
                            )} at reception counter on arrival`,
                          },
                        ].map((opt) => {
                          const isSelected = paymentPlan === opt.id;
                          return (
                            <label
                              key={opt.id}
                              className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'border-[#4F0809] bg-[#FAF7F2] ring-1 ring-[#D8AA67]'
                                  : 'border-[#E8DFCE] bg-white hover:border-[#D8AA67]'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="radio"
                                  name="paymentPlan"
                                  checked={isSelected}
                                  onChange={() => setPaymentPlan(opt.id)}
                                  className="mt-0.5 accent-[#4F0809] w-4 h-4 shrink-0 cursor-pointer"
                                />
                                <div>
                                  <span className="block text-xs font-bold text-[#4F0809]">
                                    {opt.title}
                                  </span>
                                  <span className="block text-base font-bold text-[#9C7A45] mt-0.5">
                                    {opt.amount}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] text-[#7A6A5B] pl-6">{opt.desc}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    {paymentPlan === 'pay_100_now' ? (
                      /* Settlement Method + Mandatory TNR Field */
                      <div className="rounded-2xl border border-[#E8DFCE] bg-[#FAF7F2] p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#4F0809]">
                            2. Pay 100% Online • Amount:{' '}
                            <span className="text-[#9C7A45]">{formatMoney(payableNowMinor)}</span>
                          </span>
                          <div className="inline-flex rounded-full bg-white border border-[#E8DFCE] p-1">
                            <button
                              type="button"
                              onClick={() => setOnlineMethod('upi')}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                                onlineMethod === 'upi'
                                  ? 'bg-[#4F0809] text-[#FAF7F2]'
                                  : 'text-[#5C4E42] hover:text-[#4F0809]'
                              }`}
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>UPI QR</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setOnlineMethod('card')}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                                onlineMethod === 'card'
                                  ? 'bg-[#4F0809] text-[#FAF7F2]'
                                  : 'text-[#5C4E42] hover:text-[#4F0809]'
                              }`}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Card / NEFT</span>
                            </button>
                          </div>
                        </div>

                        {onlineMethod === 'upi' ? (
                          <div className="flex flex-col sm:flex-row items-center gap-5 bg-white rounded-2xl border border-[#E8DFCE] p-4">
                            <div className="w-36 h-36 rounded-2xl border border-[#E8DFCE] bg-white p-2 flex items-center justify-center shrink-0">
                              {upiQrDataUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={upiQrDataUrl}
                                  alt="Rajmahal Palace UPI Payment QR"
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <QrCode className="w-10 h-10 text-[#9C7A45] animate-pulse" />
                              )}
                            </div>
                            <div className="flex-1 w-full space-y-2">
                              <p className="text-sm font-semibold text-[#4F0809]">
                                Scan QR &amp; Complete Payment of {formatMoney(payableNowMinor)}
                              </p>
                              <p className="text-xs text-[#6A5A4E]">
                                Palace UPI VPA:{' '}
                                <code className="font-mono font-semibold text-[#4F0809]">
                                  rajmahalpalace@sbi
                                </code>
                              </p>
                              <p className="text-[11px] text-[#7A6A5B]">
                                After paying via GPay / PhonePe / Paytm, enter your Transaction
                                Reference Number (TNR / UTR) below to confirm your stay.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-2xl border border-[#E8DFCE] p-4">
                            <div className="flex flex-col gap-1 sm:col-span-2">
                              <label
                                htmlFor="card-holder-name"
                                className="text-xs font-semibold text-[#5C4E42]"
                              >
                                Cardholder / Account Name
                              </label>
                              <input
                                id="card-holder-name"
                                type="text"
                                autoComplete="cc-name"
                                placeholder="Name on card or bank transfer"
                                value={cardHolderName}
                                onChange={(e) => setCardHolderName(e.target.value)}
                                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#FAF7F2] border border-[#DFD3C3] text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809]"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor="card-last4"
                                className="text-xs font-semibold text-[#5C4E42]"
                              >
                                Card Last 4 Digits (Optional)
                              </label>
                              <input
                                id="card-last4"
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                placeholder="4242"
                                value={cardLastFour}
                                onChange={(e) =>
                                  setCardLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))
                                }
                                className="w-full min-h-[46px] px-3.5 rounded-xl bg-[#FAF7F2] border border-[#DFD3C3] font-mono text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809]"
                              />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#6A5A4E] pt-3 sm:pt-5">
                              <Landmark className="w-4 h-4 text-[#9C7A45] shrink-0" />
                              <span>Bank / Card Ref verified via TNR below</span>
                            </div>
                          </div>
                        )}

                        {/* Mandatory TNR Input */}
                        <div className="bg-white rounded-2xl border border-[#E8DFCE] p-4 flex flex-col gap-1.5">
                          <label
                            htmlFor="payment-tnr-input"
                            className="text-xs font-bold uppercase tracking-[0.12em] text-[#4F0809]"
                          >
                            Transaction Reference Number (TNR / UTR){' '}
                            <span aria-hidden="true" className="text-[#9C3D3D]">*</span>
                          </label>
                          <input
                            id="payment-tnr-input"
                            type="text"
                            name="tnrNumber"
                            required
                            minLength={6}
                            placeholder="Enter 6–16 digit TNR / UTR (e.g. 432981049211)"
                            value={tnrNumber}
                            aria-invalid={Boolean(stepAttempted[4] && step4Errors.tnr)}
                            onChange={(e) => setTnrNumber(e.target.value.toUpperCase())}
                            className={`w-full min-h-[48px] px-4 rounded-xl bg-[#FAF7F2] border font-mono text-base text-[#2B2018] focus:outline-none focus-visible:border-[#4F0809] ${
                              stepAttempted[4] && step4Errors.tnr
                                ? 'border-[#B3261E] bg-[#FDF3F2]'
                                : 'border-[#DFD3C3]'
                            }`}
                          />
                          {stepAttempted[4] && step4Errors.tnr ? (
                            <p className="text-xs text-[#B3261E] flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{step4Errors.tnr}</span>
                            </p>
                          ) : (
                            <span className="text-[11px] text-[#7A6A5B]">
                              Mandatory to confirm online payment before issuing official pass.
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Pay on Arrival Counter Settlement Card */
                      <div className="rounded-2xl border border-[#D8AA67]/70 bg-[#FAF7F2] p-5 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-white border border-[#E8DFCE] flex items-center justify-center shrink-0">
                            <Landmark className="w-5 h-5 text-[#9C7A45]" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#4F0809] block">
                              2. Pay on Arrival at Reception Counter
                            </span>
                            <p className="text-sm font-medium text-[#2B2018]">
                              {formatMoney(0)} payable online now — settle{' '}
                              <span className="font-bold text-[#4F0809]">
                                {formatMoney(totalTariffMinor)}
                              </span>{' '}
                              via Cash, UPI, or Card upon check-in at the Palace Reception Desk.
                            </p>
                            <p className="text-xs text-[#6A5A4E] leading-relaxed">
                              Confirming now reserves this chamber immediately and updates its suite
                              registry status as unavailable without requiring any online TNR.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Terms Acceptance */}
                    <div className="pt-2 border-t border-[#EDE5D8] space-y-3">
                      <div className="flex items-start gap-3">
                        <input
                          id="book-terms"
                          type="checkbox"
                          checked={termsAccepted}
                          aria-invalid={Boolean(stepAttempted[4] && step4Errors.terms)}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 w-5 h-5 accent-[#4F0809] rounded cursor-pointer shrink-0"
                        />
                        <label
                          htmlFor="book-terms"
                          className="text-sm text-[#5C4E42] leading-relaxed cursor-pointer"
                        >
                          I accept the{' '}
                          <span className="font-semibold text-[#4F0809]">
                            Rajmahal Heritage Guarantee
                          </span>{' '}
                          — Check-in after 12:00 Noon, Check-out before 11:00 AM (early check-in /
                          late check-out charges settled on arrival at reception counter).
                        </label>
                      </div>

                      {stepAttempted[4] && step4Errors.terms && (
                        <p className="text-xs text-[#B3261E] flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{step4Errors.terms}</span>
                        </p>
                      )}

                      {apiError && (
                        <div
                          role="alert"
                          className="p-4 rounded-2xl bg-[#FDF3F2] border border-[#F5C2C0] text-sm text-[#9C231B] flex items-center gap-2.5"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{apiError}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ===================================================================== */}
                {/* STEPPER FOOTER NAVIGATION                                             */}
                {/* ===================================================================== */}
                <div className="pt-5 border-t border-[#EDE5D8] flex flex-wrap items-center justify-between gap-3">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="h-12 px-6 rounded-full border border-[#DFD3C3] bg-[#FAF7F2] hover:bg-white hover:border-[#D8AA67] text-xs font-semibold uppercase tracking-[0.14em] text-[#4F0809] inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 text-[#9C7A45]" />
                      <span>Previous</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 4 ? (
                    <button
                      key="stepper-next-btn"
                      type="button"
                      onClick={handleNextStep}
                      className="h-12 px-8 rounded-full bg-[#4F0809] hover:bg-[#670E10] text-[#FAF7F2] text-xs font-semibold uppercase tracking-[0.16em] inline-flex items-center gap-2.5 shadow-[0_10px_26px_-10px_rgba(79,8,9,0.45)] transition-all cursor-pointer ml-auto"
                    >
                      <span>
                        {currentStep === 1
                          ? 'Next: Guest Details'
                          : currentStep === 2
                          ? 'Next: Guest IDs'
                          : 'Next: Payment'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#D8AA67]" />
                    </button>
                  ) : (
                    <button
                      key="stepper-submit-btn"
                      type="submit"
                      disabled={isSubmitting}
                      onClick={() => {
                        allowExplicitSubmitRef.current = true;
                      }}
                      className="h-12 px-8 rounded-full bg-[#4F0809] hover:bg-[#670E10] disabled:opacity-60 text-[#FAF7F2] text-xs font-semibold uppercase tracking-[0.16em] inline-flex items-center gap-2.5 shadow-[0_12px_30px_-10px_rgba(79,8,9,0.45)] transition-all cursor-pointer ml-auto"
                    >
                      <span>
                        {isSubmitting
                          ? 'Confirming Reservation...'
                          : paymentPlan === 'pay_on_arrival'
                          ? 'Confirm Pay-on-Arrival Booking'
                          : `Confirm Payment (${formatMoney(payableNowMinor)})`}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#D8AA67]" />
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>
        )}
      </div>

      {/* ── Accessible Native Lightbox Dialog for Uploaded Aadhaar Preview ── */}
      <dialog
        ref={lightboxDialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="lightbox-dialog-title"
        className="m-auto w-[calc(100vw-2rem)] max-w-xl rounded-3xl border border-[#D8AA67] bg-[#FAF7F2] p-0 text-[#2B2018] shadow-[0_32px_90px_-15px_rgba(35,10,14,0.45)] backdrop:bg-[#241F1A]/65 backdrop:backdrop-blur-xs backdrop:overflow-hidden backdrop:overscroll-contain modal:overscroll-contain"
      >
        {lightboxSrc && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h1
                id="lightbox-dialog-title"
                className="text-xl font-semibold text-[#4F0809]"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                {lightboxTitle}
              </h1>
              <button
                type="button"
                autoFocus
                aria-label="Close identity card preview"
                onClick={() => setLightboxSrc(null)}
                className="w-9 h-9 rounded-full bg-white border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center hover:border-[#D8AA67] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full overflow-hidden rounded-2xl border border-[#E8DFCE] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxSrc}
                alt={lightboxTitle}
                className="w-full h-auto max-h-[65dvh] object-contain mx-auto"
              />
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
