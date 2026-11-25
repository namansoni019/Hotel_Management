import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { roomsService } from '@/lib/services/rooms-service';
import { getRoomRateMinor, getRoomTitle } from '@/lib/utils/room-display';
import type {
  GuestAadhaarDetail,
  Reservation,
  ReservationGuestDetail,
  ReservationStatus,
} from '@/lib/types';

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

function serializeReservation(id: string, raw: Record<string, unknown>): Reservation {
  const { created_at, updated_at: _updatedAt, ...rest } = raw;
  void _updatedAt;
  return {
    ...(rest as Omit<Reservation, 'id' | 'created_at'>),
    id,
    created_at: toIsoTimestamp(created_at),
  } as Reservation;
}

function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `RAJ${suffix}`;
}

export interface CreateReservationInput {
  roomTypeId: string;
  roomId?: string;
  roomNumber?: string;
  rateMinor?: number;
  checkIn: string;
  checkOut: string;
  checkInTime?: string;
  checkOutTime?: string;
  earlyCheckInOpted?: boolean;
  lateCheckOutOpted?: boolean;
  idSubmissionMode?: 'upload_now' | 'submit_at_counter';
  partySize: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  primaryGuestUid?: string | null;
  notes?: string;
  guestsDetails?: ReservationGuestDetail[];
  aadhaarDetails?: GuestAadhaarDetail[];
  depositAmountMinor?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentReference?: string | null;
}

export const reservationsService = {
  async getReservations(): Promise<Reservation[]> {
    const colRef = collection(db, 'reservations');
    const q = query(colRef, orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) =>
      serializeReservation(d.id, d.data() as Record<string, unknown>)
    );
  },

  async getReservationByReference(reference: string): Promise<Reservation | undefined> {
    const cleanRef = reference.trim();
    if (!cleanRef) return undefined;

    const docRef = doc(db, 'reservations', cleanRef);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return serializeReservation(snap.id, snap.data() as Record<string, unknown>);
    }

    const colRef = collection(db, 'reservations');
    const q = query(colRef, where('reference_code', '==', cleanRef.toUpperCase()));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const d = qSnap.docs[0];
      return serializeReservation(d.id, d.data() as Record<string, unknown>);
    }

    return undefined;
  },

  async getReservationsForUser(uid: string): Promise<Reservation[]> {
    const cleanUid = uid.trim();
    if (!cleanUid) return [];

    const colRef = collection(db, 'reservations');
    const [primarySnap, guestSnap] = await Promise.all([
      getDocs(query(colRef, where('primary_guest', '==', cleanUid))),
      getDocs(query(colRef, where('guests', 'array-contains', cleanUid))),
    ]);

    const byId = new Map<string, Reservation>();
    for (const d of [...primarySnap.docs, ...guestSnap.docs]) {
      byId.set(d.id, serializeReservation(d.id, d.data() as Record<string, unknown>));
    }

    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async verifyGuestBookingCode(params: {
    reservationIdOrRef: string;
    verificationCode: string;
    userUid: string;
  }): Promise<Reservation> {
    const target = await this.getReservationByReference(params.reservationIdOrRef);
    if (!target) {
      throw new Error('Reservation could not be found. Check your booking reference or link.');
    }

    const expected = (target.verification_code || target.reference_code || '').trim().toUpperCase();
    const entered = params.verificationCode.trim().toUpperCase();

    if (!entered || entered !== expected) {
      throw new Error('Invalid verification code. Please check the WhatsApp booking message.');
    }

    const uid = params.userUid.trim();
    if (!uid) {
      throw new Error('You must be signed in to verify and add this booking to your account.');
    }

    const docRef = doc(db, 'reservations', target.id);
    await updateDoc(docRef, {
      guests: arrayUnion(uid),
      updated_at: serverTimestamp(),
    });

    const refreshed = await getDoc(docRef);
    return refreshed.exists()
      ? serializeReservation(refreshed.id, refreshed.data() as Record<string, unknown>)
      : {
          ...target,
          guests: Array.from(new Set([...(target.guests || []), uid])),
        };
  },

  async createReservation(data: CreateReservationInput): Promise<Reservation> {
    const matchedRoom = data.roomId
      ? await roomsService.getRoomById(data.roomId)
      : await roomsService.getRoomById(data.roomTypeId);

    const resolvedRateMinor =
      typeof data.rateMinor === 'number' && data.rateMinor > 0
        ? data.rateMinor
        : matchedRoom
        ? getRoomRateMinor(matchedRoom)
        : 650000;

    const nowMs = Date.now();
    const resId = `res-${nowMs}`;
    const refCode = `BK-${Math.floor(1000 + Math.random() * 8999)}`;
    const verificationCode = generateVerificationCode();
    const cleanUid = data.primaryGuestUid ? data.primaryGuestUid.trim() : null;

    const reservationPayload: Reservation = {
      id: resId,
      property_id: 'd0000000-0000-0000-0000-000000000001',
      guest_id: cleanUid || `guest-${nowMs}`,
      primary_guest: cleanUid,
      guests: cleanUid ? [cleanUid] : [],
      verification_code: verificationCode,
      room_type_id: matchedRoom?.room_type_id || data.roomTypeId,
      room_id: matchedRoom?.id || data.roomId || null,
      room_number: matchedRoom?.room_number || data.roomNumber || null,
      room_type_name: matchedRoom ? getRoomTitle(matchedRoom) : null,
      check_in: data.checkIn,
      check_out: data.checkOut,
      check_in_time: data.checkInTime || 'After 12:00 Noon (Standard Check-In)',
      check_out_time: data.checkOutTime || 'Before 11:00 AM (Standard Check-Out)',
      early_check_in_opted: Boolean(data.earlyCheckInOpted),
      late_check_out_opted: Boolean(data.lateCheckOutOpted),
      id_submission_mode: data.idSubmissionMode || 'upload_now',
      party_size: data.partySize,
      rate_snapshot_minor: resolvedRateMinor,
      deposit_amount_minor: data.depositAmountMinor || 0,
      payment_method: data.paymentMethod || 'upi',
      payment_status: data.paymentStatus || 'paid',
      payment_reference: data.paymentReference || null,
      terms_snapshot:
        'Rajmahal Heritage Guarantee (Check-in after 12:00 Noon / Check-out before 11:00 AM; Early check-in & Late check-out charges settled at counter on arrival)',
      status: 'confirmed',
      reference_code: refCode,
      notes: data.notes || null,
      created_at: new Date(nowMs).toISOString(),
      guest: {
        id: cleanUid || `guest-${nowMs}`,
        name: data.guestName,
        phone: data.guestPhone,
        email: data.guestEmail || null,
        created_at: new Date(nowMs).toISOString(),
      },
      guests_details: data.guestsDetails || [],
      aadhaar_details: data.aadhaarDetails || [],
    };

    const docRef = doc(db, 'reservations', resId);
    await setDoc(docRef, {
      ...reservationPayload,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    const bookedRoomId = matchedRoom?.id || data.roomId || null;
    if (bookedRoomId) {
      try {
        await updateDoc(doc(db, 'rooms', bookedRoomId), {
          housekeeping_state: 'unavailable',
          updated_at: serverTimestamp(),
        });
      } catch (roomUpdateErr) {
        console.warn('[reservations] Could not mark room unavailable:', roomUpdateErr);
      }
    }

    return reservationPayload;
  },

  async updateReservationStatus(
    id: string,
    status: ReservationStatus,
    roomId?: string
  ): Promise<Reservation | null> {
    const docRef = doc(db, 'reservations', id);
    const updateData: Record<string, unknown> = {
      status,
      updated_at: serverTimestamp(),
    };
    if (roomId) updateData.room_id = roomId;
    await updateDoc(docRef, updateData);

    const updatedSnap = await getDoc(docRef);
    return updatedSnap.exists()
      ? serializeReservation(updatedSnap.id, updatedSnap.data() as Record<string, unknown>)
      : null;
  },
};
