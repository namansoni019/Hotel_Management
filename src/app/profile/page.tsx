'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { subscribeToAuth, signOutUser, getUserProfile } from '@/lib/firebase/auth';
import type { FirebaseUser } from '@/lib/firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  BedDouble,
  UtensilsCrossed,
  PartyPopper,
  LogOut,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Loader2,
  ShoppingBag,
  Clock,
  Edit3,
  Check,
  X,
  LogIn,
  ExternalLink,
  Crown,
  MapPin,
} from 'lucide-react';
import { OrdersDrawer } from '@/components/orders/orders-drawer';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profileData, setProfileData] = useState<{ name?: string; phone?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Orders drawer trigger state
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [ordersCount, setOrdersCount] = useState(0);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setEditName(currentUser.displayName || '');
        const data = await getUserProfile(currentUser.uid);
        if (data) {
          setProfileData(data);
          if (data.name) setEditName(data.name);
          if (data.phone) setEditPhone(data.phone);
        }
      }
      setLoading(false);
    });

    // Check device / local order count
    try {
      const raw = localStorage.getItem('rajmahal_user_order_ids_v1');
      if (raw) {
        const ids = JSON.parse(raw);
        setOrdersCount(Array.isArray(ids) ? ids.length : 0);
      }
    } catch {}

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setProfileData(null);
    router.refresh();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setSaveSuccess(false);

    try {
      // 1. Update Firebase Auth displayName
      if (auth.currentUser && editName.trim()) {
        await updateProfile(auth.currentUser, {
          displayName: editName.trim(),
        });
      }

      // 2. Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          name: editName.trim(),
          phone: editPhone.trim(),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      setProfileData((prev) => ({
        ...prev,
        name: editName.trim(),
        phone: editPhone.trim(),
      }));

      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Error updating user profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center space-y-3.5">
        <Loader2 className="w-8 h-8 text-[#9C7A45] animate-spin" />
        <p
          className="text-sm font-medium text-[#856B4D]"
          style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
        >
          Welcoming to Royal Palace Sanctuary...
        </p>
      </div>
    );
  }

  const fullName =
    profileData?.name ||
    user?.displayName ||
    (user?.email ? user.email.split('@')[0] : 'Royal Guest');
  const initial = (fullName.charAt(0) || 'R').toUpperCase();
  const phone = profileData?.phone || user?.phoneNumber || '';
  const createdDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Active Guest Session';

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] pt-32 sm:pt-36 lg:pt-40 pb-44 sm:pb-48 lg:pb-52 px-4 sm:px-6 lg:px-8 selection:bg-[#4F0809] selection:text-[#FFF8EB] text-[#4F0809]">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* ── 1. Top Navigation & Action Pills ── */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#FAF3E0] border border-[#E8DFCE] text-xs font-bold text-[#4F0809] transition cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#9C7A45]" />
            <span>Return to Sanctuary</span>
          </Link>

          {user ? (
            <button
              onClick={handleSignOut}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-rose-50 border border-[#E8DFCE] hover:border-rose-200 text-xs font-bold text-[#856B4D] hover:text-rose-700 transition cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              href="/login?redirect=/profile"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#4F0809] hover:bg-[#3D0607] text-xs font-bold text-[#FFF8EB] transition cursor-pointer shadow-xs active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5 text-[#D8AA67]" />
              <span>Sign In to Account</span>
            </Link>
          )}
        </div>

        {/* ── 2. Success Alert Banner ── */}
        {saveSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">Your royal profile details have been updated successfully!</span>
            </div>
            <button
              onClick={() => setSaveSuccess(false)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── 3. Light Minimal Hero Profile Card ── */}
        <div className="w-full rounded-3xl p-6 sm:p-8 bg-white border border-[#E8DFCE] shadow-[0_8px_30px_rgba(20,5,5,0.05)] relative overflow-hidden transition-all">
          {/* Subtle Ambient Gold Glow */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-gradient-to-br from-[#D8AA67]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            {/* Grand Monogram Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#FAF3E0] to-[#EFE2CC] text-[#4F0809] font-bold text-3xl sm:text-4xl flex items-center justify-center border-2 border-[#D8AA67]/50 shadow-sm ring-4 ring-[#FAF7F2] shrink-0">
              {initial}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-[#FAF3E0] border border-[#D8AA67]/40 text-[#9C7A45] text-[10px] font-bold tracking-widest uppercase">
                <Sparkles className="w-3 h-3 text-[#D8AA67]" />
                <span>{user ? 'Patron of Rajmahal' : 'Guest Palace Patron'}</span>
              </div>

              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#4F0809] truncate"
                style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
              >
                {fullName}
              </h1>

              <p className="text-xs sm:text-sm text-[#856B4D] truncate">
                {user?.email || 'Guest Explorer • Orders linked to this device session'}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {user ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] hover:bg-[#FAF3E0] border border-[#E8DFCE] text-xs font-bold text-[#4F0809] transition cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Edit3 className="w-3 h-3 text-[#9C7A45]" />
                    <span>{isEditing ? 'Close Editor' : 'Edit Profile'}</span>
                  </button>
                ) : (
                  <Link
                    href="/login?redirect=/profile"
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#4F0809] text-white hover:bg-[#3D0607] text-xs font-bold transition shadow-xs active:scale-95"
                  >
                    <LogIn className="w-3 h-3 text-[#D8AA67]" />
                    <span>Sign In to Sync Orders</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setIsOrdersOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] hover:bg-[#FAF3E0] border border-[#E8DFCE] text-xs font-bold text-[#4F0809] transition cursor-pointer shadow-2xs active:scale-95"
                >
                  <ShoppingBag className="w-3 h-3 text-[#9C7A45]" />
                  <span>View Orders {ordersCount > 0 && `(${ordersCount})`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Inline Profile Editor Form ── */}
          {isEditing && user && (
            <form onSubmit={handleSaveProfile} className="mt-6 pt-5 border-t border-[#E8DFCE] space-y-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C7A45] block">
                Update Royal Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#856B4D] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    placeholder="e.g. Maharaj Vikram"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-hidden text-xs text-[#4F0809] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#856B4D] mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-hidden text-xs text-[#4F0809] font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#856B4D] hover:text-[#4F0809] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-1.5 rounded-full bg-[#4F0809] hover:bg-[#3D0607] text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-[#D8AA67]" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── 4. Guest Session Notice (if not logged in) ── */}
        {!user && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E8DFCE] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#4F0809]">
                Synchronize Your Royal Experience
              </h3>
              <p className="text-xs text-[#856B4D] leading-relaxed">
                Sign in to link food orders, royal suite reservations, and member tariffs across devices.
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <Link
                href="/login?redirect=/profile"
                className="px-4 py-1.5 rounded-full bg-[#4F0809] text-white text-xs font-bold shadow-xs hover:bg-[#3D0607] transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 rounded-full bg-white hover:bg-[#FAF7F2] border border-[#E8DFCE] text-xs font-bold text-[#4F0809] transition shadow-2xs"
              >
                Register
              </Link>
            </div>
          </div>
        )}

        {/* ── 5. Guest Details Grid (Light Minimal) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8DFCE] shadow-2xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-[#9C7A45]" />
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#856B4D] font-bold">
                Email Address
              </p>
              <p className="text-xs sm:text-sm font-bold text-[#4F0809] truncate mt-0.5">
                {user?.email || 'Guest Explorer'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8DFCE] shadow-2xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-[#9C7A45]" />
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#856B4D] font-bold">
                Contact Number
              </p>
              <p className="text-xs sm:text-sm font-bold text-[#4F0809] truncate mt-0.5">
                {phone || (user ? 'Not Provided' : 'Device Guest')}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E8DFCE] shadow-2xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-[#9C7A45]" />
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[#856B4D] font-bold">
                Member Since
              </p>
              <p className="text-xs sm:text-sm font-bold text-[#4F0809] truncate mt-0.5">
                {createdDate}
              </p>
            </div>
          </div>
        </div>

        {/* ── 6. Palace Concierge & Experiences Hub (Light Minimal) ── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DFCE] shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#E8DFCE] pb-4">
            <div>
              <h2
                className="text-xl sm:text-2xl font-bold text-[#4F0809]"
                style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
              >
                Royal Guest Privileges &amp; Services
              </h2>
              <p className="text-xs text-[#856B4D] mt-0.5">
                Explore palace dining, chambers, and bespoke concierge experiences
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#9C7A45]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Service 1: Palace Food & Orders */}
            <button
              type="button"
              onClick={() => setIsOrdersOpen(true)}
              className="group p-4 rounded-2xl bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] border border-[#E8DFCE] hover:border-[#D8AA67]/60 transition-all flex flex-col justify-between text-left cursor-pointer active:scale-[0.99] shadow-2xs"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center group-hover:bg-[#FAF3E0] transition-colors">
                  <ShoppingBag className="w-4 h-4 text-[#9C7A45]" />
                </div>
                <h3
                  className="font-bold text-sm text-[#4F0809]"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  Food &amp; Dining Orders
                </h3>
                <p className="text-[11px] text-[#856B4D] leading-relaxed">
                  Track live kitchen orders, receipts, and re-order royal dishes.
                </p>
              </div>
              <div className="mt-3.5 flex items-center text-xs font-bold text-[#4F0809] group-hover:translate-x-1 transition-transform">
                <span>View Orders</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#9C7A45]" />
              </div>
            </button>

            {/* Service 2: Your Bookings */}
            <Link
              href="/bookings"
              className="group p-4 rounded-2xl bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] border border-[#E8DFCE] hover:border-[#D8AA67]/60 transition-all flex flex-col justify-between shadow-2xs active:scale-[0.99]"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center group-hover:bg-[#FAF3E0] transition-colors">
                  <BedDouble className="w-4 h-4 text-[#9C7A45]" />
                </div>
                <h3
                  className="font-bold text-sm text-[#4F0809]"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  Your Bookings
                </h3>
                <p className="text-[11px] text-[#856B4D] leading-relaxed">
                  View your royal stay passes, receipts, or verify co-guest codes.
                </p>
              </div>
              <div className="mt-3.5 flex items-center text-xs font-bold text-[#4F0809] group-hover:translate-x-1 transition-transform">
                <span>View Bookings</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#9C7A45]" />
              </div>
            </Link>

            {/* Service 3: Palace Dining */}
            <Link
              href="/restaurant"
              className="group p-4 rounded-2xl bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] border border-[#E8DFCE] hover:border-[#D8AA67]/60 transition-all flex flex-col justify-between shadow-2xs active:scale-[0.99]"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center group-hover:bg-[#FAF3E0] transition-colors">
                  <UtensilsCrossed className="w-4 h-4 text-[#9C7A45]" />
                </div>
                <h3
                  className="font-bold text-sm text-[#4F0809]"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  Palace Dining
                </h3>
                <p className="text-[11px] text-[#856B4D] leading-relaxed">
                  Experience traditional Rajasthani thalis and table dining.
                </p>
              </div>
              <div className="mt-3.5 flex items-center text-xs font-bold text-[#4F0809] group-hover:translate-x-1 transition-transform">
                <span>Explore Dining</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#9C7A45]" />
              </div>
            </Link>

            {/* Service 4: Banquets & Events */}
            <Link
              href="/hotel"
              className="group p-4 rounded-2xl bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] border border-[#E8DFCE] hover:border-[#D8AA67]/60 transition-all flex flex-col justify-between shadow-2xs active:scale-[0.99]"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E8DFCE] text-[#4F0809] flex items-center justify-center group-hover:bg-[#FAF3E0] transition-colors">
                  <PartyPopper className="w-4 h-4 text-[#9C7A45]" />
                </div>
                <h3
                  className="font-bold text-sm text-[#4F0809]"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  Banquets &amp; Galas
                </h3>
                <p className="text-[11px] text-[#856B4D] leading-relaxed">
                  Host grand royal celebrations, weddings, and palace galas.
                </p>
              </div>
              <div className="mt-3.5 flex items-center text-xs font-bold text-[#4F0809] group-hover:translate-x-1 transition-transform">
                <span>Enquire Hall</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1 text-[#9C7A45]" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 7. Integrated Orders Drawer ── */}
      <OrdersDrawer
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        initialTab="menu_list"
      />
    </div>
  );
}
