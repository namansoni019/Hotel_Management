/**
 * Contact / General Inquiry Service
 * Saves guest contact form submissions to the Firestore `inquiries` collection.
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type InquiryCategory =
  | 'general'
  | 'reservation'
  | 'dining'
  | 'events'
  | 'feedback'
  | 'other';

export interface ContactInquiryPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  category: InquiryCategory;
  message: string;
  user_uid?: string | null;
}

export interface ContactInquiry extends ContactInquiryPayload {
  id: string;
  status: 'new' | 'contacted' | 'resolved';
  created_at: string;
}

export const INQUIRY_CATEGORIES: { value: InquiryCategory; label: string }[] = [
  { value: 'general', label: 'General Information' },
  { value: 'reservation', label: 'Room Reservation' },
  { value: 'dining', label: 'Dining & Restaurant' },
  { value: 'events', label: 'Events & Celebrations' },
  { value: 'feedback', label: 'Feedback & Suggestions' },
  { value: 'other', label: 'Other' },
];

export const contactService = {
  async submitInquiry(data: ContactInquiryPayload): Promise<string> {
    const payload = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || null,
      subject: data.subject.trim(),
      category: data.category,
      message: data.message.trim(),
      user_uid: data.user_uid || null,
      status: 'new',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'inquiries'), payload);
    return docRef.id;
  },

  formatTimestamp(ts: Timestamp | string | null | undefined): string {
    if (!ts) return '';
    if (typeof ts === 'string') return ts;
    if (ts && typeof ts === 'object' && 'toDate' in ts) {
      return (ts as Timestamp).toDate().toISOString();
    }
    return '';
  },
};
