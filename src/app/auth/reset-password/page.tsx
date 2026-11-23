'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPasswordReset, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AuthLogo } from '@/components/auth/auth-logo';
import { AuthCornerArt } from '@/components/auth/auth-corner-art';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (oobCode) {
        await confirmPasswordReset(auth, oobCode, password);
      } else if (auth.currentUser) {
        await updatePassword(auth.currentUser, password);
      } else {
        throw new Error('Invalid or expired password reset link. Please request a new one.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code || '';
      if (code.includes('invalid-action-code') || code.includes('expired-action-code')) {
        setError('This reset link has expired or has already been used. Please request a new one.');
      } else {
        setError(errorObj?.message || 'Failed to update password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#F7F3EB] overflow-x-hidden">
      <AuthCornerArt />

      <div className="relative z-10 w-full max-w-[440px] sm:max-w-[460px] flex flex-col items-center">
        <AuthLogo className="mb-6 sm:mb-8" />

        <div className="w-full bg-[#FFFFFF] rounded-2xl shadow-[0_12px_40px_rgba(79,8,9,0.06)] border border-[#E8DFCE] p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1
              className="text-2xl sm:text-3xl font-bold text-[#4F0809] mb-1.5"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              Reset Palace Password
            </h1>
            <p className="text-xs sm:text-sm text-[#735D45]">
              Choose a secure password for your royal sanctuary account.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#4F0809]">Password Updated</h3>
              <p className="text-xs text-[#735D45]">
                Your password has been reset successfully. Redirecting you to sign in...
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#735D45] uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A89279] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-[#FAF6F0] border border-[#E8DFCE] focus:border-[#C99A52] focus:bg-white focus:outline-none text-[#4F0809] placeholder-[#A89279]/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A89279] hover:text-[#4F0809] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#735D45] uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A89279] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full h-11 pl-10 pr-10 text-xs sm:text-sm rounded-xl bg-[#FAF6F0] border border-[#E8DFCE] focus:border-[#C99A52] focus:bg-white focus:outline-none text-[#4F0809] placeholder-[#A89279]/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A89279] hover:text-[#4F0809] transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-2 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-xs font-bold uppercase tracking-[0.12em] transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#D8AA67]" />
                ) : (
                  <>
                    <span>Confirm New Password</span>
                    <ArrowRight className="w-4 h-4 text-[#D8AA67]" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-[#E8DFCE]/60 text-center">
            <Link
              href="/login"
              className="text-xs text-[#856B4D] hover:text-[#4F0809] font-medium transition-colors"
            >
              Return to Palace Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#4F0809]" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
