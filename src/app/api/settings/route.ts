import { NextResponse } from 'next/server';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    try {
      const [propSnap, outSnap, tblSnap] = await Promise.all([
        getDocs(collection(db, 'properties')),
        getDocs(collection(db, 'outlets')),
        getDocs(collection(db, 'tables')),
      ]);

      const property = !propSnap.empty
        ? { id: propSnap.docs[0].id, ...propSnap.docs[0].data() }
        : dataRepository.getProperty();

      const outlets = !outSnap.empty
        ? outSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        : dataRepository.getOutlets();

      const tables = !tblSnap.empty
        ? tblSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        : [];

      return NextResponse.json({
        success: true,
        property,
        outlets,
        tables,
      });
    } catch {
      // Fallback
    }

    return NextResponse.json({
      success: true,
      property: dataRepository.getProperty(),
      outlets: dataRepository.getOutlets(),
      tables: [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { property, outlet } = body;

    if (property) {
      try {
        const propId = property.id || 'prop-rajmahal';
        await setDoc(
          doc(db, 'properties', propId),
          {
            name: property.name,
            address: property.address,
            phone: property.phone,
            email: property.email,
            booking_policy: property.booking_policy,
            cancellation_terms: property.cancellation_terms,
            deposit_percent: property.deposit_percent,
            timezone: property.timezone,
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch {
        // Ignored
      }
      dataRepository.updateProperty(property);
    }

    if (outlet && outlet.id) {
      try {
        await updateDoc(doc(db, 'outlets', outlet.id), {
          name: outlet.name,
          is_paused: outlet.is_paused,
          dine_in_enabled: outlet.dine_in_enabled,
          pickup_enabled: outlet.pickup_enabled,
          delivery_enabled: outlet.delivery_enabled,
          delivery_fee_minor: outlet.delivery_fee_minor,
          min_delivery_order_minor: outlet.min_delivery_order_minor,
          pickup_lead_minutes: outlet.pickup_lead_minutes,
          delivery_lead_minutes: outlet.delivery_lead_minutes,
          tax_rate_bps: outlet.tax_rate_bps,
          service_charge_bps: outlet.service_charge_bps,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Ignored
      }
      dataRepository.updateOutlet(outlet.id, outlet);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
