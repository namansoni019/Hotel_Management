import { NextResponse } from 'next/server';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { Outlet, Order, Table } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let outlets: Outlet[] = [];
    let tables: Table[] = [];
    let orders: Order[] = [];

    try {
      const [outSnap, tblSnap, ordSnap] = await Promise.all([
        getDocs(collection(db, 'outlets')),
        getDocs(collection(db, 'tables')),
        getDocs(collection(db, 'orders')),
      ]);

      outlets = !outSnap.empty
        ? (outSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Outlet[])
        : dataRepository.getOutlets();

      tables = !tblSnap.empty
        ? (tblSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Table[])
        : dataRepository.getTables();

      orders = !ordSnap.empty
        ? (ordSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[])
        : dataRepository.getOrders();
    } catch {
      outlets = dataRepository.getOutlets();
      tables = dataRepository.getTables();
      orders = dataRepository.getOrders();
    }

    outlets.sort((a, b) => (a.type === 'restaurant' ? -1 : 1));

    // Calculate real operational metrics dynamically
    const enrichedOutlets = outlets.map((outlet) => {
      // Ensure palace branding
      let displayName = outlet.name;
      let displayImage = outlet.image_url;
      let roomServiceEnabled = outlet.room_service_enabled ?? (outlet.type === 'restaurant');
      if (outlet.type === 'restaurant') {
        displayName = 'Rajmahal Royal Dining';
        displayImage = '/images/dining/rajasthani-restaurant.png';
        roomServiceEnabled = true;
      } else if (outlet.type === 'cafe') {
        displayName = 'The Palace Courtyard Café & Lounge';
        displayImage = '/images/dining/cafe-lounge.png';
        roomServiceEnabled = false;
      }

      const outletTables = tables.filter(
        (t) =>
          t.outlet_id === outlet.id ||
          (outlet.type === 'restaurant' ? t.table_number.startsWith('T-') : t.table_number.startsWith('C-'))
      );
      const outletOrders = orders.filter(
        (o) =>
          o.outlet_id === outlet.id ||
          (outlet.type === 'restaurant' && (o.outlet_id?.includes('1') || !o.outlet_id)) ||
          (outlet.type === 'cafe' && o.outlet_id?.includes('2'))
      );

      // Active KOTs (orders currently in kitchen flow)
      const activeOrders = outletOrders.filter((o) =>
        ['placed', 'accepted', 'in_kitchen', 'ready_for_pickup'].includes(o.status)
      );

      // Revenue today
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = outletOrders.filter(
        (o) => o.created_at.startsWith(today) && o.status !== 'cancelled'
      );
      const todayRevenueMinor = todayOrders.reduce((sum, o) => sum + (o.total_minor || 0), 0);

      // Table occupancy
      const occupiedTables = outletTables.filter((t) => t.status === 'occupied').length;

      // Pending action items
      const pendingAlerts: string[] = [];
      if (outlet.is_paused) pendingAlerts.push('Service currently paused by royal management');
      if (activeOrders.length > 5) pendingAlerts.push(`${activeOrders.length} active orders in kitchen queue`);
      if (occupiedTables === outletTables.length && outletTables.length > 0)
        pendingAlerts.push('All palace tables at 100% capacity');

      return {
        ...outlet,
        name: displayName,
        image_url: displayImage,
        room_service_enabled: roomServiceEnabled,
        metrics: {
          total_tables: outletTables.length,
          occupied_tables: occupiedTables,
          table_occupancy_pct: outletTables.length
            ? Math.round((occupiedTables / outletTables.length) * 100)
            : 0,
          active_kots: activeOrders.length,
          today_orders_count: todayOrders.length,
          today_revenue_minor: todayRevenueMinor,
          avg_ticket_minor: todayOrders.length
            ? Math.round(todayRevenueMinor / todayOrders.length)
            : 0,
          pending_alerts: pendingAlerts,
          operating_status: outlet.is_paused
            ? 'paused'
            : outlet.is_active
            ? 'active'
            : 'closed',
        },
      };
    });

    return NextResponse.json({
      success: true,
      outlets: enrichedOutlets,
      summary: {
        total_outlets: outlets.length,
        active_outlets: outlets.filter((o) => o.is_active && !o.is_paused).length,
        total_active_kots: enrichedOutlets.reduce((s, o) => s + o.metrics.active_kots, 0),
        total_today_revenue_minor: enrichedOutlets.reduce((s, o) => s + o.metrics.today_revenue_minor, 0),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, operating_hours } = body;

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const newOutlet = dataRepository.addOutlet({
      name,
      type,
      operating_hours: operating_hours || '07:00 AM – 11:00 PM',
      operating_days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: true },
      dine_in_enabled: true,
      pickup_enabled: true,
      delivery_enabled: type === 'restaurant',
      room_service_enabled: type === 'restaurant',
      pickup_lead_minutes: 20,
      delivery_lead_minutes: 40,
      delivery_fee_minor: 4000,
      min_delivery_order_minor: 20000,
      delivery_estimate: '30-45 mins',
      is_paused: false,
      is_active: true,
      tax_rate_bps: 500,
      service_charge_bps: 250,
      property_id: dataRepository.getProperty().id,
    });

    try {
      await setDoc(doc(db, 'outlets', newOutlet.id), {
        id: newOutlet.id,
        property_id: newOutlet.property_id,
        name: newOutlet.name,
        type: newOutlet.type,
        operating_hours: newOutlet.operating_hours,
        dine_in_enabled: newOutlet.dine_in_enabled,
        pickup_enabled: newOutlet.pickup_enabled,
        delivery_enabled: newOutlet.delivery_enabled,
        is_paused: newOutlet.is_paused,
        created_at: serverTimestamp(),
      });

      await addDoc(collection(db, 'audit_events'), {
        actor_name: 'Administrator',
        actor_role: 'Administrator',
        action_type: 'PRICE_CHANGE',
        entity_type: 'Outlet',
        entity_id: newOutlet.id,
        details: `Created new palace outlet: ${newOutlet.name} (${newOutlet.type})`,
        ip_address: '127.0.0.1',
        created_at: serverTimestamp(),
      });
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: true, outlet: newOutlet }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, patch } = body;

    if (!id || !patch) {
      return NextResponse.json(
        { success: false, error: 'Outlet ID and patch data are required' },
        { status: 400 }
      );
    }

    const updated = dataRepository.updateOutlet(id, patch);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Outlet not found' }, { status: 404 });
    }

    try {
      const allowedKeys = [
        'name',
        'type',
        'operating_hours',
        'dine_in_enabled',
        'pickup_enabled',
        'delivery_enabled',
        'pickup_lead_minutes',
        'delivery_lead_minutes',
        'delivery_fee_minor',
        'min_delivery_order_minor',
        'delivery_estimate',
        'is_paused',
        'tax_rate_bps',
        'service_charge_bps',
      ];

      const dbPatch: Record<string, any> = {};
      for (const col of allowedKeys) {
        if (col in patch) {
          dbPatch[col] = (patch as any)[col];
        }
      }
      dbPatch.updated_at = new Date().toISOString();

      await updateDoc(doc(db, 'outlets', id), dbPatch);

      let detailDesc = `Updated outlet ${updated.name} settings`;
      if ('is_paused' in patch || 'is_active' in patch) {
        detailDesc = `${updated.name} marked ${patch.is_paused ? 'closed' : 'open'}`;
      } else if (
        'dine_in_enabled' in patch ||
        'room_service_enabled' in patch ||
        'delivery_enabled' in patch ||
        'pickup_enabled' in patch
      ) {
        detailDesc = `Channel availability updated for ${updated.name}`;
      } else if ('operating_hours' in patch) {
        detailDesc = `Operating schedule updated for ${updated.name}`;
      } else if ('operating_days' in patch) {
        detailDesc = `Operating days updated for ${updated.name}`;
      }

      await addDoc(collection(db, 'audit_events'), {
        actor_name: 'Administrator',
        actor_role: 'Administrator',
        action_type: 'PRICE_CHANGE',
        entity_type: 'Outlet',
        entity_id: id,
        details: detailDesc,
        ip_address: '127.0.0.1',
        created_at: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn('Firestore update warning:', dbErr);
    }

    return NextResponse.json({ success: true, outlet: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Outlet ID is required' }, { status: 400 });
    }
    const deleted = dataRepository.deleteOutlet(id);
    try {
      await deleteDoc(doc(db, 'outlets', id));
    } catch {
      // Ignored
    }
    return NextResponse.json({ success: true, deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
