'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { AuthLogo } from '@/components/auth/auth-logo';
import { AuthCornerArt } from '@/components/auth/auth-corner-art';
import { TermsModal } from '@/components/auth/terms-modal';
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
} from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ emailSent?: boolean; message: string } | null>(null);

  // Modal states
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name must be at least 2 characters.';
    }

    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (!mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile Number is required.';
    } else if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Email Address is required.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Please provide a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      newErrors.password = 'Password must include both letters and numbers.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the Terms & Conditions and Privacy Policy.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setGoogleError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(
        email.trim(),
        password,
        fullName.trim(),
        mobileNumber.trim()
      );

      setSuccessInfo({
        emailSent: false,
        message: 'Account created successfully! Welcome to Rajmahal Heritage Hotel.',
      });

      router.refresh();
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code || '';
      if (code.includes('email-already-in-use')) {
        setServerError('An account with this email address already exists. Please Sign In.');
      } else if (code.includes('weak-password')) {
        setServerError('Password is too weak. Please use at least 8 characters with letters and numbers.');
      } else {
        setServerError(errorObj?.message || 'Registration failed. Please try again.');
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
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code || '';
      if (code.includes('popup-closed-by-user')) {
        // User closed popup without signing in
      } else if (code.includes('unauthorized-domain')) {
        setGoogleError('Google Sign-In is initializing. Ensure localhost is authorized in Firebase Authentication Settings.');
      } else {
        setGoogleError(errorObj?.message || 'Unable to register with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#FBF3E7] overflow-x-hidden selection:bg-[#073B34] selection:text-white">
      {/* Corner Line Art & Watercolor Foliage */}
      <AuthCornerArt />

      {/* Main Authentication Container */}
      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center py-6 sm:py-8">
        {/* Centered Rajmahal Heritage Hotel Logo */}
        <AuthLogo className="mb-5 sm:mb-6" />

        {/* Heading & Subtitle */}
        <div className="text-center mb-6 px-2">
          <h1
            className="text-[34px] sm:text-[38px] font-bold text-[#670E10] tracking-tight leading-none"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Create Your Account
          </h1>
          <p className="text-[13.5px] sm:text-[14px] text-[#1E332D] mt-2 font-normal leading-relaxed">
            Begin your royal journey with Rajmahal Heritage Hotel.
          </p>
        </div>

        {/* White Form Card */}
        <div className="w-full bg-white border border-[#E8DFCE] rounded-[24px] shadow-[0_8px_32px_-6px_rgba(60,45,25,0.06),0_2px_8px_rgba(60,45,25,0.02)] p-6 sm:p-8 transition-all">
          {successInfo ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-700 shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h2
                className="text-2xl font-bold text-[#670E10]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {successInfo.emailSent ? 'Verify Your Email' : 'Account Created!'}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed px-2">
                {successInfo.message}
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#073B34] text-white text-xs font-semibold hover:bg-[#0A4B42] transition-colors shadow-sm"
                >
                  Proceed to Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
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

              {/* 1. Full Name */}
              <div>
                <label htmlFor="fullName" className="sr-only">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7E6F60]">
                    <User className="w-[18px] h-[18px]" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors({ ...errors, fullName: '' });
                    }}
                    placeholder="Full Name"
                    className={`w-full h-[50px] pl-11 pr-4 bg-[#F5EFE6] border ${
                      errors.fullName ? 'border-red-400 bg-red-50/30' : 'border-[#DFD4C0]'
                    } rounded-[12px] text-[14px] text-zinc-900 placeholder:text-[#8C7D6F] focus:outline-none focus:ring-1 focus:ring-[#073B34] focus:border-[#073B34] focus:bg-[#F8F3EB] transition-all`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-[11px] text-red-600 mt-1 pl-1">{errors.fullName}</p>
                )}
              </div>

              {/* 2. Mobile Number */}
              <div>
                <label htmlFor="mobileNumber" className="sr-only">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7E6F60]">
                    <Phone className="w-[18px] h-[18px]" />
                  </div>
                  <input
                    id="mobileNumber"
                    name="mobileNumber"
                    type="tel"
                    autoComplete="tel"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value);
                      if (errors.mobileNumber) setErrors({ ...errors, mobileNumber: '' });
                    }}
                    placeholder="Mobile Number"
                    className={`w-full h-[50px] pl-11 pr-4 bg-[#F5EFE6] border ${
                      errors.mobileNumber ? 'border-red-400 bg-red-50/30' : 'border-[#DFD4C0]'
                    } rounded-[12px] text-[14px] text-zinc-900 placeholder:text-[#8C7D6F] focus:outline-none focus:ring-1 focus:ring-[#073B34] focus:border-[#073B34] focus:bg-[#F8F3EB] transition-all`}
                  />
                </div>
                {errors.mobileNumber && (
                  <p className="text-[11px] text-red-600 mt-1 pl-1">{errors.mobileNumber}</p>
                )}
              </div>

              {/* 3. Email Address */}
              <div>
                <label htmlFor="email" className="sr-only">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7E6F60]">
                    <Mail className="w-[18px] h-[18px]" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    placeholder="Email Address"
                    className={`w-full h-[50px] pl-11 pr-4 bg-[#F5EFE6] border ${
                      errors.email ? 'border-red-400 bg-red-50/30' : 'border-[#DFD4C0]'
                    } rounded-[12px] text-[14px] text-zinc-900 placeholder:text-[#8C7D6F] focus:outline-none focus:ring-1 focus:ring-[#073B34] focus:border-[#073B34] focus:bg-[#F8F3EB] transition-all`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-red-600 mt-1 pl-1">{errors.email}</p>
                )}
              </div>

              {/* 4. Password */}
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7E6F60]">
                    <Lock className="w-[18px] h-[18px]" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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

              {/* 5. Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#7E6F60]">
                    <Lock className="w-[18px] h-[18px]" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                    }}
                    placeholder="Confirm Password"
                    className={`w-full h-[50px] pl-11 pr-11 bg-[#F5EFE6] border ${
                      errors.confirmPassword ? 'border-red-400 bg-red-50/30' : 'border-[#DFD4C0]'
                    } rounded-[12px] text-[14px] text-zinc-900 placeholder:text-[#8C7D6F] focus:outline-none focus:ring-1 focus:ring-[#073B34] focus:border-[#073B34] focus:bg-[#F8F3EB] transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7E6F60] hover:text-zinc-800 cursor-pointer focus:outline-none"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-[11px] text-red-600 mt-1 pl-1">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Terms & Privacy Checkbox */}
              <div className="pt-1 pb-0.5">
                <label className="flex items-start space-x-2.5 text-xs text-zinc-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (errors.terms) setErrors({ ...errors, terms: '' });
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-[#073B34] focus:ring-[#073B34] border-[#DFD4C0] accent-[#073B34] cursor-pointer"
                  />
                  <span className="leading-snug text-[12px] text-[#1E332D]">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setModalType('terms');
                      }}
                      className="underline font-semibold hover:text-[#073B34] cursor-pointer"
                    >
                      Terms &amp; Conditions
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setModalType('privacy');
                      }}
                      className="underline font-semibold hover:text-[#073B34] cursor-pointer"
                    >
                      Privacy Policy.
                    </button>
                  </span>
                </label>
                {errors.terms && (
                  <p className="text-[11px] text-red-600 mt-1 pl-1">{errors.terms}</p>
                )}
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] mt-1 rounded-[12px] bg-[#073B34] text-white text-[15px] font-medium tracking-wide hover:bg-[#0A4B42] active:bg-[#052C27] flex items-center justify-center space-x-2 transition-all shadow-[0_4px_14px_rgba(7,59,52,0.25)] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
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
          )}

          {/* Bottom Switch Link */}
          <div className="text-center mt-5 pt-3.5 border-t border-[#E8DFCE]">
            <p className="text-[13px] text-[#6B5E51]">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold text-[#073B34] underline hover:text-[#0A4B42] transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Terms & Privacy Modal */}
      <TermsModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        type={modalType || 'terms'}
      />
    </div>
  );
}
