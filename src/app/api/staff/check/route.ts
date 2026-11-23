import { NextResponse, type NextRequest } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = [
  'admin',
  'administrator',
  'manager',
  'receptionist',
  'kitchen',
  'waiter',
  'housekeeping',
  'accountant',
  'staff',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email')?.trim().toLowerCase();

    const targetEmail = emailParam;

    if (targetEmail) {
      // 1. Check in Firestore Admins / admins collection
      try {
        for (const col of ['Admins', 'admins']) {
          const adminsRef = collection(db, col);
          const q = query(adminsRef, where('email', '==', targetEmail));
          const snap = await getDocs(q);

          if (!snap.empty) {
            const adminDoc = snap.docs[0].data();
            let adminName = adminDoc.name || 'Palace Administrator';

            // Also check users collection for detailed name
            try {
              const uRef = collection(db, 'users');
              const uSnap = await getDocs(query(uRef, where('email', '==', targetEmail)));
              if (!uSnap.empty) {
                adminName = uSnap.docs[0].data().name || adminName;
              }
            } catch {
              // Ignored
            }

            return NextResponse.json({
              isStaff: true,
              isAdmin: true,
              role: 'admin',
              name: adminName,
              email: targetEmail,
            });
          }
        }
      } catch (err) {
        console.warn('Firestore Admins collection check warning:', err);
      }

      if (targetEmail === 'soninamanp7@gmail.com') {
        return NextResponse.json({
          isStaff: true,
          isAdmin: true,
          role: 'admin',
          name: 'Naman Soni (Owner)',
          email: targetEmail,
        });
      }

      // 2. Check in Firestore users collection
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', targetEmail));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const dbUser = snap.docs[0].data();
          if (dbUser.is_active !== false) {
            const roleLower = (dbUser.role || '').toLowerCase();
            const isStaff = STAFF_ROLES.includes(roleLower) || Boolean(dbUser.is_staff);
            return NextResponse.json({
              isStaff,
              role: dbUser.role || 'staff',
              name: dbUser.name || 'Staff Member',
              email: dbUser.email,
            });
          }
          return NextResponse.json({ isStaff: false });
        }
      } catch (err) {
        console.warn('Firestore staff check fallback:', err);
      }

      // 2. Check local data repository staff list
      const memoryStaff = dataRepository.getStaff().find(
        (s) => s.email.toLowerCase() === targetEmail && s.status === 'active'
      );
      if (memoryStaff) {
        return NextResponse.json({
          isStaff: true,
          role: memoryStaff.role,
          name: memoryStaff.name,
          email: memoryStaff.email,
        });
      }

      return NextResponse.json({ isStaff: false });
    }

    return NextResponse.json({ isStaff: false });
  } catch (error) {
    console.error('Error in GET /api/staff/check:', error);
    return NextResponse.json({ isStaff: false });
  }
}
