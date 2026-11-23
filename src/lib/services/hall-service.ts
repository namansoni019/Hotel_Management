import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { Hall, EventLead } from '@/lib/types';

export const hallService = {
  async getHall(): Promise<Hall> {
    try {
      const docRef = doc(db, 'halls', 'crystal_ballroom');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        return {
          id: snap.id,
          property_id: d.property_id || 'd0000000-0000-0000-0000-000000000001',
          name: d.name,
          capacity: d.capacity,
          description: d.description,
          photos: d.photos || ['/images/hall/crystal-ballroom.jpg'],
          packages: d.packages || [],
        };
      }
    } catch (err) {
      console.warn('Firestore getHall fallback:', err);
    }
    return dataRepository.getHall();
  },

  async getEventLeads(): Promise<EventLead[]> {
    try {
      const colRef = collection(db, 'event_leads');
      const q = query(colRef, orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as EventLead[];
      }
    } catch (err) {
      console.warn('Firestore getEventLeads fallback:', err);
    }
    return dataRepository.getEventLeads();
  },

  async createEventLead(data: {
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    eventType: string;
    expectedGuests: number;
    seatingLayout?: string;
    setupNeeds?: string;
    notes?: string;
  }): Promise<EventLead> {
    const localLead = dataRepository.createEventLead(data);

    try {
      const docRef = doc(db, 'event_leads', localLead.id);
      await setDoc(docRef, {
        ...localLead,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore createEventLead error:', err);
    }

    return localLead;
  },

  async updateLeadStatus(
    leadId: string,
    updates: { status: EventLead['status']; quote_amount_minor?: number }
  ): Promise<EventLead | null> {
    try {
      const docRef = doc(db, 'event_leads', leadId);
      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore updateLeadStatus fallback:', err);
    }
    const leads = dataRepository.getEventLeads();
    const found = leads.find((l) => l.id === leadId || l.reference_code === leadId);
    if (found) {
      found.status = updates.status;
      if (updates.quote_amount_minor !== undefined) {
        found.quote_amount_minor = updates.quote_amount_minor;
      }
      return found;
    }
    return null;
  },
};
