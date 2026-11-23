import { NextResponse } from 'next/server';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { outlet_id, table_number, capacity } = body;

    if (!outlet_id || !table_number) {
      return NextResponse.json(
        { success: false, error: 'outlet_id and table_number are required' },
        { status: 400 }
      );
    }

    const tableId = `tbl-${Date.now()}`;
    const token = `qr-tbl-${table_number}-${Date.now().toString(36)}`;

    const newT = {
      id: tableId,
      outlet_id,
      table_number,
      capacity: Number(capacity) || 4,
      is_active: true,
    };

    try {
      await setDoc(doc(db, 'tables', tableId), {
        ...newT,
        created_at: serverTimestamp(),
      });

      await setDoc(doc(db, 'qr_tokens', `qr-${tableId}`), {
        id: `qr-${tableId}`,
        table_id: tableId,
        token,
        is_active: true,
        created_at: serverTimestamp(),
      });
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: true, table: newT, token }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
