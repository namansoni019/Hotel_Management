import { NextResponse } from 'next/server';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outlet_id') || undefined;

    let tables = dataRepository.getTables(outletId);
    let reservations = dataRepository.getTableReservations();
    const qrTokens = dataRepository.getQRTokens();

    try {
      const tblRef = collection(db, 'tables');
      const q = outletId && outletId !== 'all' ? query(tblRef, where('outlet_id', '==', outletId)) : tblRef;
      const snap = await getDocs(q);

      if (!snap.empty) {
        const dbTables = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        const merged = dbTables.map((dbT: any) => {
          const memory = tables.find((m) => m.id === dbT.id || m.table_number === dbT.table_number);
          return {
            id: dbT.id,
            outlet_id: dbT.outlet_id,
            table_number: dbT.table_number,
            capacity: dbT.capacity || 4,
            is_active: dbT.is_active ?? true,
            status: memory?.status || 'available',
            location: memory?.location || 'Dining Area',
            code: memory?.code || `table-${(dbT.table_number || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          };
        });
        tables = merged;
      }
    } catch {
      // Fallback
    }

    if (outletId && outletId !== 'all') {
      reservations = reservations.filter((r) => r.outlet_id === outletId);
    }

    return NextResponse.json({
      success: true,
      tables,
      reservations,
      qrTokens,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'reserve') {
      const {
        guest_name,
        phone,
        email,
        outlet_id,
        outlet_name,
        table_number,
        reservation_time,
        party_size,
        notes,
      } = body;

      if (!guest_name || !phone || !table_number || !reservation_time) {
        return NextResponse.json(
          { success: false, error: 'Missing required reservation fields' },
          { status: 400 }
        );
      }

      const newReservation = dataRepository.createTableReservation({
        guest_name,
        phone,
        email,
        outlet_id: outlet_id || '',
        outlet_name: outlet_name || 'Rajmahal Royal Dining',
        table_number,
        reservation_time,
        party_size: Number(party_size) || 2,
        status: 'confirmed',
        notes,
      });

      return NextResponse.json({ success: true, reservation: newReservation }, { status: 201 });
    }

    // Default action: Add Table
    const { outlet_id, table_number, capacity, location } = body;
    if (!outlet_id || !table_number) {
      return NextResponse.json(
        { success: false, error: 'Missing outlet_id or table_number' },
        { status: 400 }
      );
    }

    const createdTable = dataRepository.addTable({
      outlet_id,
      table_number,
      capacity: Number(capacity) || 4,
      is_active: true,
      status: 'available',
      location: location || 'Dining Area',
    });

    try {
      await setDoc(doc(db, 'tables', createdTable.id), {
        id: createdTable.id,
        outlet_id: createdTable.outlet_id,
        table_number: createdTable.table_number,
        capacity: createdTable.capacity,
        is_active: createdTable.is_active,
        created_at: serverTimestamp(),
      });
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: true, table: createdTable }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (body.type === 'reservation') {
      const { id, status } = body;
      const updated = dataRepository.updateTableReservationStatus(id, status);
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Reservation not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, reservation: updated });
    }

    // Update Table fields (table_number, outlet_id, capacity, location, status, is_active)
    const { id, status, capacity, location, table_number, outlet_id, is_active } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Table id is required' }, { status: 400 });
    }

    const patchData: Partial<any> = {};
    if (status !== undefined) patchData.status = status;
    if (capacity !== undefined) patchData.capacity = Number(capacity);
    if (location !== undefined) patchData.location = location;
    if (table_number !== undefined) patchData.table_number = table_number.trim().toUpperCase();
    if (outlet_id !== undefined) patchData.outlet_id = outlet_id;
    if (is_active !== undefined) patchData.is_active = Boolean(is_active);

    const updatedTable = dataRepository.updateTable(id, patchData);

    try {
      const dbPatch: any = {};
      if (capacity !== undefined) dbPatch.capacity = Number(capacity);
      if (table_number !== undefined) dbPatch.table_number = table_number.trim().toUpperCase();
      if (outlet_id !== undefined) dbPatch.outlet_id = outlet_id;
      if (is_active !== undefined) dbPatch.is_active = Boolean(is_active);

      if (Object.keys(dbPatch).length > 0) {
        await updateDoc(doc(db, 'tables', id), dbPatch);
      }
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: true, table: updatedTable });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }

    if (type === 'reservation') {
      const deleted = dataRepository.deleteTableReservation(id);
      return NextResponse.json({ success: deleted });
    }

    const currentTable = dataRepository.getTables().find((t) => t.id === id);
    const deleted = dataRepository.deleteTable(id);

    try {
      await deleteDoc(doc(db, 'tables', id));
      if (currentTable) {
        // Also delete by table_number if ID differed
        const q = query(collection(db, 'tables'), where('table_number', '==', currentTable.table_number));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
