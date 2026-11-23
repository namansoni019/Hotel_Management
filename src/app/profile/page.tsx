'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { subscribeToAuth, signOutUser, getUserProfile } from '@/lib/firebase/auth';
import type { FirebaseUser } from '@/lib/firebase/auth';
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
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profileData, setProfileData] = useState<{ name?: string; phone?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      if (!currentUser) {
        router.push('/login?redirect=/profile');
      } else {
        setUser(currentUser);
        const data = await getUserProfile(currentUser.uid);
        if (data) {
          setProfileData(data);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    await signOutUser();
    router.refresh();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF3E7] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#670E10] animate-spin" />
        <p className="text-sm font-medium text-[#6B5E51]">Loading your royal profile...</p>
      </div>
    );
  }

  const fullName =
    profileData?.name ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Royal Guest';
  const initial = fullName.charAt(0).toUpperCase();
  const phone = profileData?.phone || user?.phoneNumber || 'Not Provided';
  const createdDate = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'October 2026';

  return (
    <div className="min-h-screen bg-[#FBF3E7] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#073B34] selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-xs sm:text-sm font-semibold text-[#670E10] hover:text-[#4f0809] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Return to Sanctuary
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center text-xs font-semibold text-red-700 hover:text-red-900 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
          </button>
        </div>

        {/* Hero Profile Card */}
        <div
          className="w-full rounded-[24px] p-6 sm:p-8 shadow-xl text-white relative overflow-hidden"
          style={{
            backgroundColor: 'var(--forest-deep, #4f0809)',
            border: '1px solid rgba(216, 170, 103, 0.35)',
          }}
        >
          {/* Subtle gold ornamentation glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#D8AA67]/20 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            {/* Grand Monogram Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-[#e1b46f] to-[#b89047] text-[#380506] font-bold text-3xl sm:text-4xl flex items-center justify-center shadow-lg ring-4 ring-[#FFF8EB]/20 shrink-0">
              {initial}
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-[#380506]/60 border border-[#D8AA67]/40 text-[#D8AA67] text-[11px] font-semibold tracking-wider uppercase">
                <Sparkles className="w-3 h-3 text-[#D8AA67]" />
                <span>Patron of Rajmahal</span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FFF8EB]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {fullName}
              </h1>
              <p className="text-xs sm:text-sm text-[#FFF8EB]/80">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Guest Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-[20px] p-5 border border-[#E8DFCE] shadow-sm flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F5EFE6] text-[#670E10] flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[11px] uppercase tracking-wider text-[#8C7D6F] font-semibold">
                Email Address
              </p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-900 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-5 border border-[#E8DFCE] shadow-sm flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F5EFE6] text-[#670E10] flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#8C7D6F] font-semibold">
                Mobile Number
              </p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-900">{phone}</p>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-5 border border-[#E8DFCE] shadow-sm flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F5EFE6] text-[#670E10] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#8C7D6F] font-semibold">
                Member Since
              </p>
              <p className="text-xs sm:text-sm font-semibold text-zinc-900">{createdDate}</p>
            </div>
          </div>
        </div>

        {/* Guest Experiences & Quick Services */}
        <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E8DFCE] shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E8DFCE] pb-4">
            <div>
              <h2
                className="text-xl sm:text-2xl font-bold text-[#670E10]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Royal Guest Services
              </h2>
              <p className="text-xs text-[#6B5E51] mt-0.5">
                Explore your privileges and reserve palace experiences
              </p>
            </div>
            <ShieldCheck className="w-6 h-6 text-[#073B34]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <Link
              href="/rooms"
              className="group p-5 rounded-2xl bg-[#FBF3E7]/60 hover:bg-[#FBF3E7] border border-[#E8DFCE] transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-[#073B34] text-[#FFF8EB] flex items-center justify-center">
                  <BedDouble className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#380506]">Suites &amp; Stays</h3>
                <p className="text-[11px] text-[#6B5E51] leading-relaxed">
                  Reserve royal chambers and heritage palace suites.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-[#073B34] group-hover:translate-x-1 transition-transform">
                <span>Book Now</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>

            <Link
              href="/restaurant"
              className="group p-5 rounded-2xl bg-[#FBF3E7]/60 hover:bg-[#FBF3E7] border border-[#E8DFCE] transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-[#073B34] text-[#FFF8EB] flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#380506]">Palace Dining</h3>
                <p className="text-[11px] text-[#6B5E51] leading-relaxed">
                  Experience royal cuisine and table dining reservations.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-[#073B34] group-hover:translate-x-1 transition-transform">
                <span>Explore Dining</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>

            <Link
              href="/hotel"
              className="group p-5 rounded-2xl bg-[#FBF3E7]/60 hover:bg-[#FBF3E7] border border-[#E8DFCE] transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-lg bg-[#073B34] text-[#FFF8EB] flex items-center justify-center">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#380506]">Hotel &amp; Banquets</h3>
                <p className="text-[11px] text-[#6B5E51] leading-relaxed">
                  Host grand weddings, royal galas, and stay in deluxe suites.
                </p>
              </div>
              <div className="mt-4 flex items-center text-xs font-semibold text-[#073B34] group-hover:translate-x-1 transition-transform">
                <span>Enquire Hall</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
