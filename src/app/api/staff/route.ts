import { NextResponse } from 'next/server';
import { dataRepository } from '@/lib/data/repository';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StaffMember } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let staffList: StaffMember[] = [];

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('created_at', 'desc'));
      const snap = await getDocs(q);

      if (!snap.empty) {
        staffList = snap.docs.map((docSnap) => {
          const u = docSnap.data();
          return {
            id: docSnap.id,
            name: u.name || 'Staff Member',
            email: u.email || '',
            phone: u.phone || '',
            role: u.role || 'manager',
            status: u.is_active ? 'active' : 'on_leave',
            is_active: u.is_active ?? true,
            created_at: u.created_at ? new Date().toISOString() : new Date().toISOString(),
          };
        });

        if (staffList.length > 0) {
          return NextResponse.json({
            success: true,
            staff: staffList,
            totalCount: staffList.length,
            activeCount: staffList.filter((s) => s.status === 'active').length,
          });
        }
      }
    } catch (err) {
      console.warn('Firestore staff read fallback to local repository:', err);
    }

    const memoryStaff = dataRepository.getStaff();
    return NextResponse.json({
      success: true,
      staff: memoryStaff,
      totalCount: memoryStaff.length,
      activeCount: memoryStaff.filter((s) => s.status === 'active').length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, role, password } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ success: false, error: 'Mobile number is required' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ success: false, error: 'Email address is required' }, { status: 400 });
    }
    if (!role?.trim()) {
      return NextResponse.json({ success: false, error: 'Role is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const newStaff = dataRepository.addStaff({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      role: role.trim(),
      status: 'active',
      is_active: true,
      password: password,
    });

    try {
      const userRef = doc(db, 'users', newStaff.id);
      await setDoc(
        userRef,
        {
          id: newStaff.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          role: role.trim().toLowerCase(),
          is_staff: true,
          is_active: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Firestore staff user sync error:', err);
    }

    return NextResponse.json({ success: true, staff: newStaff }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Staff ID is required' }, { status: 400 });
    }

    const updated = dataRepository.updateStaff(id, {
      status,
      is_active: status === 'active',
    });

    try {
      const userRef = doc(db, 'users', id);
      await updateDoc(userRef, {
        is_active: status === 'active',
        updated_at: serverTimestamp(),
      });
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: true, staff: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      dataRepository.clearAllStaff();
      return NextResponse.json({ success: true, message: 'All staff data cleared.' });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Staff ID is required' }, { status: 400 });
    }

    const deleted = dataRepository.deleteStaff(id);

    try {
      const userRef = doc(db, 'users', id);
      await deleteDoc(userRef);
    } catch {
      // Ignored
    }

    return NextResponse.json({ success: deleted, deletedId: id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
