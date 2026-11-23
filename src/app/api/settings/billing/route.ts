import { NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { BillingSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  gstin: '08AAACH1234F1Z5',
  business_name: 'Rajmahal Heritage Grand Palace',
  restaurant_gst_percent: 5.0,
  rooms_gst_percent: 12.0,
  service_charge_percent: 2.5,
  service_charge_enabled: true,
  round_off_cash: true,
  delivery_charges: 50,
  delivery_free_above: 500,
  delivery_enabled: true,
  delivery_estimate_mins: 40,
  packaging_charges_pickup: 25,
  packaging_charges_delivery: 25,
  packaging_charges_enabled: true,
  packaging_note: 'Eco-friendly royal food-grade insulated packaging',
  invoice_prefix: 'RAJ-INV-',
  next_invoice_number: 1042,
  invoice_footer_note: 'Thank you for choosing Rajmahal Heritage Grand. Padharo Mhare Desh!',
};

let inMemoryBillingSettings: BillingSettings = { ...DEFAULT_BILLING_SETTINGS };

export async function GET() {
  try {
    try {
      const docRef = doc(db, 'settings', 'billing');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const firestoreData = docSnap.data() as Partial<BillingSettings>;
        inMemoryBillingSettings = {
          ...DEFAULT_BILLING_SETTINGS,
          ...firestoreData,
        };
        return NextResponse.json({
          success: true,
          settings: inMemoryBillingSettings,
        });
      }
    } catch (e) {
      // Fallback to in-memory
    }

    return NextResponse.json({
      success: true,
      settings: inMemoryBillingSettings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updatedSettings: BillingSettings = {
      ...inMemoryBillingSettings,
      ...body,
    };

    inMemoryBillingSettings = updatedSettings;

    // Persist to Firestore
    try {
      const docRef = doc(db, 'settings', 'billing');
      await setDoc(docRef, {
        ...updatedSettings,
        updated_at: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore billing settings save failed (using in-memory):', err);
    }

    // Synchronize outlet settings
    try {
      const outlets = dataRepository.getOutlets();
      for (const outlet of outlets) {
        dataRepository.updateOutlet(outlet.id, {
          delivery_fee_minor: Math.round((updatedSettings.delivery_charges || 0) * 100),
          packaging_fee_minor: Math.round((updatedSettings.packaging_charges_delivery || 0) * 100),
          delivery_enabled: updatedSettings.delivery_enabled,
          packaging_enabled: updatedSettings.packaging_charges_enabled,
          tax_rate_bps: Math.round((updatedSettings.restaurant_gst_percent || 5) * 100),
          service_charge_bps: updatedSettings.service_charge_enabled
            ? Math.round((updatedSettings.service_charge_percent || 0) * 100)
            : 0,
        });
      }
    } catch (err) {
      console.warn('Repository sync failed:', err);
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Taxes & Billing configuration updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return POST(request);
}
