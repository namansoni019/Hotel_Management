'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { AuthLogo } from '@/components/auth/auth-logo';
import { AuthCornerArt } from '@/components/auth/auth-corner-art';
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams?.get('redirect') || searchParams?.get('next') || '/';

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Forgot password modal
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!identifier.trim()) {
      newErrors.identifier = 'Email Address or Mobile Number is required.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setGoogleError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const rawInput = identifier.trim();
      if (!rawInput.includes('@')) {
        setServerError('Please sign in using your registered email address.');
        setLoading(false);
        return;
      }

      await signInWithEmail(rawInput, password);
      router.refresh();
      router.push(redirectTarget);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code || '';
      if (
        code.includes('user-not-found') ||
        code.includes('wrong-password') ||
        code.includes('invalid-credential') ||
        code.includes('invalid-login-credentials')
      ) {
        setServerError('Invalid email or password. Please verify your details.');
      } else if (code.includes('too-many-requests')) {
        setServerError('Too many failed attempts. Please try again in a few minutes or reset your password.');
      } else {
        setServerError(errorObj?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    setServerError(null);
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      router.refresh();
      router.push(redirectTarget);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code || '';
      if (code.includes('popup-closed-by-user')) {
        // User closed popup without signing in
      } else if (code.includes('unauthorized-domain')) {
        setGoogleError('Google Sign-In is initializing. Ensure localhost is listed in Authorized Domains in Firebase Authentication Settings.');
      } else {
        setGoogleError(errorObj?.message || 'Unable to sign in with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] flex flex-col items-center py-6 sm:py-8">
      {/* Centered Rajmahal Heritage Hotel Logo */}
      <AuthLogo className="mb-5 sm:mb-6" />

      {/* Heading & Subtitle */}
      <div className="text-center mb-6 px-2">
        <h1
          className="text-[34px] sm:text-[38px] font-bold text-[#670E10] tracking-tight leading-none"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Welcome Back
        </h1>
        <p className="text-[13.5px] sm:text-[14px] text-[#1E332D] mt-2 font-normal leading-relaxed">
          Sign in to continue your royal experience.
        </p>
      </div>

      {/* White Form Card */}
      <div className="w-full bg-white border border-[#E8DFCE] rounded-[24px] shadow-[0_8px_32px_-6px_rgba(60,45,25,0.06),0_2px_8px_rgba(60,45,25,0.02)] p-6 sm:p-8 transition-all">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Server Alert Message */}
          {serverError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2 animate-fade-in-up">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{serverError}</span>
            </div>
          )}

          {/* Google Alert Message */}
          {googleError && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start space-x-2 animate-fade-in-up">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{googleError}</span>
            </div>
          )}

          {/* 1. Email Address or Mobile Number */}
          <div>
            <label htmlFor="identifier" className="sr-only">
              Email Address or Mobile Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7E6F60]">
                <Mail className="w-[18px] h-[18px]" />
              </div>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errors.identifier) setErrors({ ...errors, identifier: '' });
                }}
                placeholder="Email Address or Mobile Number"
                className={`w-full h-[50px] pl-11 pr-4 bg-[#F5EFE6] border ${
                  errors.identifier ? 'border-red-400 bg-red-50/30' : 'border-[#DFD4C0]'
                } rounded-[12px] text-[14px] text-zinc-900 placeholder:text-[#8C7D6F] focus:outline-none focus:ring-1 focus:ring-[#073B34] focus:border-[#073B34] focus:bg-[#F8F3EB] transition-all`}
              />
            </div>
            {errors.identifier && (
              <p className="text-[11px] text-red-600 mt-1 pl-1">{errors.identifier}</p>
            )}
          </div>

          {/* 2. Password */}
          <div>
            <label htmlFor="loginPassword" className="sr-only">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7E6F60]">
                <Lock className="w-[18px] h-[18px]" />
              </div>
              <input
                id="loginPassword"
                name="loginPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                placeholder="Password"
                className={`w-full h-[50px] pl-11 pr-11 bg-[#F5EFE6] border ${
                  errors.password ? 'border-red-400 bg-red-50/30' : 'border-[#DFD4C0]'
                } rounded-[12px] text-[14px] text-zinc-900 placeholder:text-[#8C7D6F] focus:outline-none focus:ring-1 focus:ring-[#073B34] focus:border-[#073B34] focus:bg-[#F8F3EB] transition-all`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7E6F60] hover:text-zinc-800 cursor-pointer focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-red-600 mt-1 pl-1">{errors.password}</p>
            )}
          </div>

          {/* Controls: Keep me signed in + Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center space-x-2 text-zinc-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
                className="w-4 h-4 rounded text-[#073B34] focus:ring-[#073B34] border-[#DFD4C0] accent-[#073B34] cursor-pointer"
              />
              <span className="text-[12px] text-[#1E332D]">Keep me signed in</span>
            </label>

            <button
              type="button"
              onClick={() => setForgotPasswordOpen(true)}
              className="text-[12px] font-semibold text-[#073B34] underline hover:text-[#0A4B42] cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {/* Primary Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[50px] mt-1 rounded-[12px] bg-[#073B34] text-white text-[15px] font-medium tracking-wide hover:bg-[#0A4B42] active:bg-[#052C27] flex items-center justify-center space-x-2 transition-all shadow-[0_4px_14px_rgba(7,59,52,0.25)] disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4 stroke-[1.8]" />
              </>
            )}
          </button>

          {/* OR Divider */}
          <div className="relative py-2 flex items-center justify-center">
            <div className="border-t border-[#DFD4C0] w-full" />
            <span className="bg-white px-3 text-[10px] font-semibold text-[#8C7D6F] tracking-widest absolute uppercase">
              OR
            </span>
          </div>

          {/* Continue with Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full h-[50px] bg-white border border-[#DFD4C0] hover:bg-[#FAF6EE] rounded-[12px] flex items-center justify-center space-x-3 text-[14px] font-medium text-[#1F2937] transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>
        </form>

        {/* Bottom Switch Link */}
        <div className="text-center mt-5 pt-3.5 border-t border-[#E8DFCE]">
          <p className="text-[13px] text-[#6B5E51]">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold text-[#073B34] underline hover:text-[#0A4B42] transition-colors"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
        defaultEmail={identifier.includes('@') ? identifier.trim() : ''}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#FBF3E7] overflow-x-hidden selection:bg-[#073B34] selection:text-white">
      {/* Corner Line Art & Watercolor Foliage */}
      <AuthCornerArt />

      {/* Wrapped in Suspense for useSearchParams */}
      <Suspense fallback={<div className="w-12 h-12 rounded-full border-2 border-[#073B34] border-t-transparent animate-spin my-20" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
