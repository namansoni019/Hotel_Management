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

const OUTLET_MAPPINGS: Record<string, string> = {
  restaurant: 'e0000000-0000-0000-0000-000000000001',
  cafe: 'e0000000-0000-0000-0000-000000000002',
  'out-restaurant': 'e0000000-0000-0000-0000-000000000001',
  'out-cafe': 'e0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000001': 'e0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002': 'e0000000-0000-0000-0000-000000000002',
};

export async function GET() {
  try {
    const outlets = dataRepository.getOutlets();
    let tableRecords: any[] = [];

    try {
      const [tblSnap, qrSnap] = await Promise.all([
        getDocs(collection(db, 'tables')),
        getDocs(collection(db, 'qr_tokens')),
      ]);

      if (!tblSnap.empty) {
        const dbTables = tblSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        const dbQRs = qrSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

        tableRecords = dbTables.map((t: any) => {
          const qrObj = dbQRs.find((q: any) => q.table_id === t.id);
          const cleanNum = (t.table_number || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const token = qrObj?.token || `table-${cleanNum}`;
          const outlet =
            outlets.find((o) => o.id === t.outlet_id || OUTLET_MAPPINGS[o.type] === t.outlet_id) || outlets[0];
          const isCafeOutlet = t.outlet_id === 'e0000000-0000-0000-0000-000000000002' || String(t.outlet_id).includes('cafe') || outlet?.type === 'cafe';
          const venueCode = isCafeOutlet ? 'c' : 'r';
          const targetUrl = `/menu?qr=${venueCode}&table=${t.table_number}`;

          return {
            id: qrObj?.id || `qr-${t.id}`,
            table_id: t.id,
            type: 'table' as const,
            label: `Table ${t.table_number}`,
            location: `${outlet?.name || 'Palace Dining'} (Area)`,
            outletName: outlet?.name || 'Rajmahal Royal Dining',
            token,
            targetUrl,
            isActive: qrObj?.is_active ?? t.is_active ?? true,
            capacity: t.capacity || 4,
            tableStatus: t.status || 'available',
          };
        });

        return NextResponse.json({
          success: true,
          records: tableRecords,
          totalCount: tableRecords.length,
          tableCount: tableRecords.length,
          roomCount: 0,
        });
      }
    } catch {
      // Fallback
    }

    const memoryTables = dataRepository.getTables();
    const memoryQRs = dataRepository.getQRTokens();

    tableRecords = memoryTables.map((table) => {
      const outlet = outlets.find((o) => o.id === table.outlet_id) || outlets[0];
      const cleanNum = table.table_number.toLowerCase().replace(/[^a-z0-9]/g, '');
      const qrObj = memoryQRs.find((q) => q.table_id === table.id);
      const token = qrObj?.token || table.code || `table-${cleanNum}`;

      const isCafeOutlet = table.outlet_id === 'e0000000-0000-0000-0000-000000000002' || String(table.outlet_id).includes('cafe') || outlet?.type === 'cafe';
      const venueCode = isCafeOutlet ? 'c' : 'r';
      const targetUrl = `/menu?qr=${venueCode}&table=${table.table_number}`;

      return {
        id: qrObj?.id || `qr-${table.id}`,
        table_id: table.id,
        type: 'table' as const,
        label: `Table ${table.table_number}`,
        location: `${outlet?.name || 'Palace Dining'} (${table.location || 'Dining Area'})`,
        outletName: outlet?.name || 'Rajmahal Royal Dining',
        token,
        targetUrl,
        isActive: qrObj?.is_active ?? table.is_active ?? true,
        capacity: table.capacity || 4,
        tableStatus: table.status || 'available',
      };
    });

    return NextResponse.json({
      success: true,
      records: tableRecords,
      totalCount: tableRecords.length,
      tableCount: tableRecords.length,
      roomCount: 0,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { table_number, identifier, venue, target_type, outlet_id, capacity, location } = body;
    const rawNum = identifier || table_number;

    if (!rawNum) {
      return NextResponse.json({ success: false, error: 'Identifier / Number is required (e.g. T-42)' }, { status: 400 });
    }

    const cleanNum = String(rawNum).trim().toUpperCase().replace(/^TABLE\s*/i, '');
    const cleanToken = cleanNum.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isCafe = venue === 'cafe' || outlet_id === 'out-cafe' || String(outlet_id).includes('cafe') || String(location).toLowerCase().includes('caf');
    const venueCode = isCafe ? 'c' : 'r';
    const type = target_type || 'table';

    let targetUrl = `/menu?qr=${venueCode}&table=${cleanNum}`;
    let tokenStr = `table-${cleanToken}`;
    if (type === 'room') {
      targetUrl = `/menu?qr=${venueCode}&room=${cleanNum}`;
      tokenStr = `room-${cleanToken}`;
    } else if (type === 'hall') {
      targetUrl = `/menu?qr=${venueCode}&hall=${cleanNum}`;
      tokenStr = `hall-${cleanToken}`;
    }

    const targetOutletUUID = isCafe
      ? 'e0000000-0000-0000-0000-000000000002'
      : 'e0000000-0000-0000-0000-000000000001';

    const createdTableId = `tab-${Date.now()}`;

    try {
      await setDoc(doc(db, 'tables', createdTableId), {
        id: createdTableId,
        outlet_id: targetOutletUUID,
        table_number: cleanNum,
        capacity: Number(capacity) || 4,
        location: location || (isCafe ? 'Heritage Café' : 'Grand Darbar'),
        status: 'available',
        is_active: true,
        created_at: serverTimestamp(),
      });

      await setDoc(doc(db, 'qr_tokens', `qr-${createdTableId}`), {
        id: `qr-${createdTableId}`,
        table_id: createdTableId,
        token: tokenStr,
        target_url: targetUrl,
        is_active: true,
        created_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Error inserting table to Firestore:', err);
    }

    const newTable = dataRepository.addTable({
      outlet_id: targetOutletUUID,
      table_number: cleanNum,
      capacity: Number(capacity) || 4,
      location: location || (isCafe ? 'Heritage Café' : 'Grand Darbar'),
      status: 'available',
      is_active: true,
    });
    newTable.id = createdTableId;
    newTable.code = tokenStr;

    return NextResponse.json({
      success: true,
      table: newTable,
      token: tokenStr,
      targetUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const updated = dataRepository.toggleQRTokenActive(id);

    try {
      await updateDoc(doc(db, 'qr_tokens', id), {
        is_active: updated?.is_active ?? true,
      });
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      dataRepository.clearAllTables();
      try {
        const [qSnap, tSnap] = await Promise.all([
          getDocs(collection(db, 'qr_tokens')),
          getDocs(collection(db, 'tables')),
        ]);
        await Promise.all([
          ...qSnap.docs.map((d) => deleteDoc(d.ref)),
          ...tSnap.docs.map((d) => deleteDoc(d.ref)),
        ]);
      } catch {
        // Ignored
      }
      return NextResponse.json({ success: true, message: 'All QR codes and tables cleared.' });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'id parameter is required' }, { status: 400 });
    }

    dataRepository.deleteQRToken(id);

    try {
      await Promise.all([
        deleteDoc(doc(db, 'qr_tokens', id)),
        deleteDoc(doc(db, 'tables', id)),
      ]);
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
