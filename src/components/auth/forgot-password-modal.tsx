'use client';

import React, { useState } from 'react';
import { sendPasswordReset } from '@/lib/firebase/auth';
import { X, Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  defaultEmail = '',
}) => {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSuccess(true);
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code || '';
      if (code.includes('user-not-found')) {
        setError('No account found with this email address. Please verify or create an account.');
      } else {
        setError(errorObj?.message || 'Unable to send reset instructions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
      <div className="relative w-full max-w-md bg-[#FAF8F3] border border-[#EADBCE] rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-[#EADBCE]/50 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-700">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3
              className="text-2xl font-bold text-[#670E10]"
              style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
            >
              Check Your Inbox
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              We have dispatched password recovery instructions to <strong className="text-zinc-900">{email}</strong>. Please follow the link in the email to establish your new royal passcode.
            </p>
            <button
              onClick={handleClose}
              className="w-full mt-2 py-3 rounded-xl bg-[#073B34] text-white text-xs font-semibold hover:bg-[#0A4B42] transition-colors cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center pb-2">
              <h3
                className="text-2xl font-bold text-[#670E10]"
                style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
              >
                Reset Your Password
              </h3>
              <p className="text-xs text-zinc-600 mt-1">
                Enter your registered email address to receive password recovery instructions.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8A7D70]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="royal.guest@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FDFBF7] border border-[#E5DEC9] rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#073B34] focus:border-[#073B34] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#073B34] text-white text-sm font-medium hover:bg-[#0A4B42] active:bg-[#052C27] flex items-center justify-center space-x-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
