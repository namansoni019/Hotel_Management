import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Allow all static, image, and page routes through
  // Role and auth checks are performed seamlessly via Firebase Auth in Dashboard Layout & Profile
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
