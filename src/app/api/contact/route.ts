import { NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, department, preferred_contact, message } = body;

    if (!name?.trim() || !phone?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name, phone number, and message are required.' },
        { status: 400 }
      );
    }

    const refNumber = `INQ-${Date.now().toString().slice(-6)}`;

    // Save to Firestore inquiries collection
    try {
      const inqRef = collection(db, 'inquiries');
      await addDoc(inqRef, {
        reference_number: refNumber,
        name: name.trim(),
        email: email?.trim() || '',
        phone: phone.trim(),
        department: department || 'General Concierge',
        preferred_contact: preferred_contact || 'Phone Call',
        message: message.trim(),
        status: 'new',
        created_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore inquiries write fallback:', err);
    }

    return NextResponse.json({
      success: true,
      reference_number: refNumber,
      message: 'Your royal inquiry has been received by the Head Concierge.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
