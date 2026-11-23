import { NextRequest, NextResponse } from 'next/server';
import { signUpWithEmail } from '@/lib/firebase/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, phone } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const userCredential = await signUpWithEmail(
      normalizedEmail,
      String(password),
      fullName ? String(fullName).trim() : '',
      phone ? String(phone).trim() : ''
    );

    return NextResponse.json({
      success: true,
      user: {
        id: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
      },
      message: 'Account created successfully with Firebase.',
    });
  } catch (err: unknown) {
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj?.code || '';
    if (code.includes('email-already-in-use')) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please Sign In.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: errorObj?.message || 'Failed to create account.' },
      { status: 400 }
    );
  }
}
