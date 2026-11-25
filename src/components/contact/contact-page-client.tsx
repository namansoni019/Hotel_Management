'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Star,
  Sparkles,
  Navigation,
} from 'lucide-react';
import { MandalaOrnament, HeritageDivider } from '@/components/ui/heritage-ornaments';
import {
  contactService,
  INQUIRY_CATEGORIES,
  type ContactInquiryPayload,
  type InquiryCategory,
} from '@/lib/services/contact-service';
import { subscribeToAuth, type FirebaseUser } from '@/lib/firebase/auth';

/* ── Minimal field animation hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.07, rootMargin: '0px 0px -20px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible] as const;
}

/* ── WhatsApp SVG ── */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l7.3-1.37c1.45.78 3.08 1.2 4.74 1.2 5.46 0 9.91-4.45 9.91-9.91C23.95 6.45 19.5 2 12.04 2zm0 1.67c4.24 0 7.69 3.45 7.69 7.69 0 4.24-3.45 7.69-7.69 7.69-1.43 0-2.82-.38-4.04-1.1l-.29-.17-3.12.82.83-3.04-.18-.31c-.8-1.27-1.22-2.74-1.22-4.35 0-4.24 3.45-7.69 7.69-7.69zm-2.1 5.33c-.18 0-.47.07-.71.33-.24.26-.92.9-.92 2.2s.95 2.55 1.08 2.72c.13.17 1.86 2.84 4.51 3.98.63.27 1.12.43 1.51.55.63.2 1.21.17 1.66.11.51-.08 1.56-.64 1.78-1.26.22-.61.22-1.14.16-1.24-.07-.11-.24-.17-.51-.3-.26-.13-1.55-.77-1.79-.86-.24-.08-.41-.13-.59.13-.17.27-.68.86-.83 1.03-.15.18-.3.2-.57.07-.26-.13-1.11-.41-2.11-1.3-.78-.7-1.31-1.56-1.46-1.82-.15-.27-.02-.41.12-.54.12-.12.26-.31.39-.46.13-.15.18-.26.26-.43.09-.18.05-.33-.02-.46-.07-.13-.59-1.56-.81-2.08-.21-.51-.43-.44-.59-.45-.15-.01-.33-.01-.5-.01z" />
    </svg>
  );
}

/* ── Instagram SVG ── */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

/* ── Facebook SVG ── */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

/* ── Info Card ── */
function InfoCard({
  icon,
  title,
  lines,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
  href?: string;
}) {
  const content = (
    <div className="flex gap-4 items-start">
      <div className="shrink-0 w-11 h-11 rounded-2xl bg-[#4F0809]/10 flex items-center justify-center text-[#4F0809]">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#9C7A45] mb-1">{title}</p>
        {lines.map((l, i) => (
          <p key={i} className="text-sm text-[#3B1F0E] leading-relaxed">{l}</p>
        ))}
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="group block p-4 rounded-2xl border border-[#E8DFCE] bg-white hover:border-[#D8AA67] hover:shadow-[0_6px_18px_rgba(79,8,9,0.07)] transition-all duration-300"
        aria-label={title}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="p-4 rounded-2xl border border-[#E8DFCE] bg-white">
      {content}
    </div>
  );
}

/* ── Floating label input ── */
function FloatingInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  required,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        placeholder={focused ? placeholder : ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`peer w-full px-4 pt-6 pb-2 text-sm rounded-xl border bg-white text-[#2B1810] placeholder-[#B0A090] transition-all outline-none ${
          error
            ? 'border-red-400 ring-1 ring-red-300 focus:border-red-500'
            : focused
            ? 'border-[#D8AA67] ring-1 ring-[#D8AA67]/30'
            : 'border-[#E0D8CC] hover:border-[#C8B99A]'
        }`}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 pointer-events-none font-medium transition-all duration-200 ${
          lifted
            ? 'top-1.5 text-[10px] tracking-widest uppercase text-[#9C7A45]'
            : 'top-4 text-sm text-[#8C7A6A]'
        }`}
      >
        {label}{required && <span className="text-[#4F0809] ml-0.5">*</span>}
      </label>
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}

/* ── Floating label textarea ── */
function FloatingTextarea({
  id,
  label,
  value,
  onChange,
  required,
  error,
  rows = 5,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <textarea
        id={id}
        value={value}
        required={required}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`peer w-full px-4 pt-7 pb-2 text-sm rounded-xl border bg-white text-[#2B1810] resize-none transition-all outline-none ${
          error
            ? 'border-red-400 ring-1 ring-red-300 focus:border-red-500'
            : focused
            ? 'border-[#D8AA67] ring-1 ring-[#D8AA67]/30'
            : 'border-[#E0D8CC] hover:border-[#C8B99A]'
        }`}
      />
      <label
        htmlFor={id}
        className={`absolute left-4 pointer-events-none font-medium transition-all duration-200 ${
          lifted
            ? 'top-1.5 text-[10px] tracking-widest uppercase text-[#9C7A45]'
            : 'top-4 text-sm text-[#8C7A6A]'
        }`}
      >
        {label}{required && <span className="text-[#4F0809] ml-0.5">*</span>}
      </label>
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════════ */
export function ContactPageClient() {
  const [user, setUser] = useState<FirebaseUser | null>(null);

  /* form state */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<InquiryCategory>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  /* form meta */
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* reveal refs */
  const [heroRef, heroVisible] = useReveal();
  const [formRef, formVisible] = useReveal();
  const [infoRef, infoVisible] = useReveal();

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      if (u) {
        setName((n) => n || u.displayName || '');
        setEmail((e) => e || u.email || '');
      }
    });
    return () => unsub();
  }, []);

  /* ── Validation ── */
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Your name is required.';
    if (!email.trim()) e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address.';
    if (phone && !/^[+\d\s()\-]{7,15}$/.test(phone)) e.phone = 'Enter a valid phone number.';
    if (!subject.trim()) e.subject = 'Please enter a subject.';
    if (!message.trim()) e.message = 'Please write your message.';
    else if (message.trim().length < 20) e.message = 'Please write at least 20 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── Submit ── */
  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: ContactInquiryPayload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        category,
        subject: subject.trim(),
        message: message.trim(),
        user_uid: user?.uid || null,
      };
      await contactService.submitInquiry(payload);
      setSubmitted(true);
    } catch (err) {
      console.error('[contact] submit error:', err);
      setSubmitError('Something went wrong. Please try WhatsApp or call us directly.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--cream, #fbf5e9)' }}
    >
      {/* ── 1. HERO BANNER ── */}
      <section className="relative overflow-hidden pt-28 sm:pt-36 pb-16 sm:pb-20">
        {/* Background mandala */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <MandalaOrnament position="top-right" size="520px" opacity={0.07} color="#9C7A45" />
          <MandalaOrnament position="bottom-left" size="400px" opacity={0.05} color="#4F0809" />
        </div>

        {/* Floral side arts */}
        <img
          src="/images/ornaments/floral-left.png"
          alt=""
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-40 sm:w-56 object-cover object-left opacity-10 pointer-events-none"
        />
        <img
          src="/images/ornaments/floral-right.png"
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-0 h-full w-40 sm:w-56 object-cover object-right opacity-10 pointer-events-none"
        />

        <div
          ref={heroRef}
          className={`relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center transition-all duration-700 ${
            heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D8AA67]/50 bg-white/70 backdrop-blur-sm text-[10px] font-bold tracking-widest uppercase text-[#9C7A45] mb-6 shadow-sm">
            <Sparkles className="w-3 h-3" />
            Royal Concierge Desk
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#4F0809] leading-[1.1] mb-5"
            style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
          >
            We&rsquo;d Love to
            <br />
            <span className="text-[#9C7A45]">Hear From You</span>
          </h1>

          <p className="text-base sm:text-lg text-[#6B533B] leading-relaxed max-w-xl mx-auto mb-8">
            Whether you&rsquo;re planning a royal stay, a celebration, or simply wish to know more
            about Rajmahal, our concierge team is delighted to assist.
          </p>

          {/* Quick action chips */}
          <div className="flex flex-wrap justify-center gap-2.5">
            <a
              href="tel:+919829012345"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4F0809] text-[#FFF8EB] text-xs font-semibold shadow-md hover:bg-[#680b0c] active:scale-95 transition-all"
            >
              <Phone className="w-3.5 h-3.5" />
              Call Directly
            </a>
            <a
              href="https://wa.me/919829012345"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-xs font-semibold shadow-md hover:bg-[#1ebe59] active:scale-95 transition-all"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
              WhatsApp Us
            </a>
            <a
              href="mailto:reservations@rajmahalheritage.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#D8AA67] text-[#4F0809] text-xs font-semibold hover:bg-[#FFF8EB] hover:border-[#9C7A45] active:scale-95 transition-all shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              Send Email
            </a>
          </div>
        </div>
      </section>

      <HeritageDivider className="max-w-xs mx-auto px-4 mb-10 opacity-60" />

      {/* ── 2. MAIN CONTENT: FORM + INFO ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 lg:gap-12 items-start">

          {/* ───────────── FORM PANEL ───────────── */}
          <div
            ref={formRef}
            className={`transition-all duration-700 delay-100 ${
              formVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="bg-white rounded-3xl border border-[#E8DFCE] shadow-[0_8px_32px_rgba(79,8,9,0.04)] overflow-hidden">
              {/* Form header */}
              <div className="relative px-6 sm:px-8 pt-8 pb-6 border-b border-[#EFE7D8] bg-gradient-to-br from-[#FFF8EB] via-white to-[#FAF5EC]">
                <div className="absolute top-4 right-6 opacity-10 pointer-events-none">
                  <MandalaOrnament position="top-right" size="140px" color="#9C7A45" opacity={1} />
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4F0809]/8 text-[9px] font-bold tracking-widest uppercase text-[#4F0809] mb-3">
                  <MessageSquare className="w-3 h-3" />
                  Send a Message
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-bold text-[#4F0809]"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  Write to Us
                </h2>
                <p className="text-sm text-[#7A5C3E] mt-1">
                  Our concierge team responds within 2–4 hours.
                </p>
              </div>

              {/* Success state */}
              {submitted ? (
                <div className="px-6 sm:px-8 py-14 text-center flex flex-col items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div>
                    <h3
                      className="text-2xl font-bold text-[#4F0809] mb-2"
                      style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                    >
                      Message Received!
                    </h3>
                    <p className="text-sm text-[#6B533B] max-w-sm mx-auto">
                      Thank you, <strong>{name}</strong>. Our royal concierge will get back to you at{' '}
                      <strong>{email}</strong> within 2–4 hours.
                    </p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setName('');
                        setEmail('');
                        setPhone('');
                        setSubject('');
                        setMessage('');
                        setCategory('general');
                      }}
                      className="px-5 py-2 text-xs font-semibold rounded-full border border-[#D8AA67] text-[#4F0809] hover:bg-[#FFF8EB] transition-colors"
                    >
                      Send Another
                    </button>
                    <Link
                      href="/"
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full bg-[#4F0809] text-[#FFF8EB] hover:bg-[#680b0c] transition-colors"
                    >
                      Back to Home <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="px-6 sm:px-8 py-7 space-y-5">

                  {/* Category selector */}
                  <div>
                    <label
                      htmlFor="contact-category"
                      className="block text-[10px] font-bold tracking-widest uppercase text-[#9C7A45] mb-1.5"
                    >
                      Enquiry Type
                    </label>
                    <div className="relative">
                      <select
                        id="contact-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as InquiryCategory)}
                        className="w-full appearance-none px-4 py-3 text-sm rounded-xl border border-[#E0D8CC] bg-white text-[#2B1810] hover:border-[#C8B99A] focus:border-[#D8AA67] focus:ring-1 focus:ring-[#D8AA67]/30 outline-none transition-all cursor-pointer"
                      >
                        {INQUIRY_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9C7A45] pointer-events-none" />
                    </div>
                  </div>

                  {/* Name + Email row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingInput
                      id="contact-name"
                      label="Full Name"
                      value={name}
                      onChange={setName}
                      required
                      error={errors.name}
                      placeholder="e.g. Arjun Sharma"
                    />
                    <FloatingInput
                      id="contact-email"
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      required
                      error={errors.email}
                      placeholder="you@example.com"
                    />
                  </div>

                  {/* Phone + Subject row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FloatingInput
                      id="contact-phone"
                      label="Phone (Optional)"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      error={errors.phone}
                      placeholder="+91 98290 12345"
                    />
                    <FloatingInput
                      id="contact-subject"
                      label="Subject"
                      value={subject}
                      onChange={setSubject}
                      required
                      error={errors.subject}
                      placeholder="e.g. Honeymoon Suite Enquiry"
                    />
                  </div>

                  {/* Message */}
                  <FloatingTextarea
                    id="contact-message"
                    label="Your Message"
                    value={message}
                    onChange={setMessage}
                    required
                    error={errors.message}
                    rows={5}
                  />

                  {/* Global error */}
                  {submitError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                      {submitError}
                    </p>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#4F0809] text-[#FFF8EB] font-semibold text-sm hover:bg-[#680b0c] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(79,8,9,0.25)]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending to Concierge…
                      </>
                    ) : (
                      <>
                        Send Message
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-[#9C7A45]">
                    Your details are confidential and never shared.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* ───────────── INFO PANEL ───────────── */}
          <div
            ref={infoRef}
            className={`space-y-5 transition-all duration-700 delay-200 ${
              infoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Hotel info cards */}
            <div
              className="rounded-3xl border border-[#E8DFCE] bg-white overflow-hidden shadow-[0_4px_20px_rgba(79,8,9,0.04)]"
            >
              <div className="px-6 pt-6 pb-4 border-b border-[#EFE7D8] bg-gradient-to-br from-[#FFF8EB] to-white">
                <p className="text-[10px] font-bold tracking-widest uppercase text-[#9C7A45] mb-0.5">Royal Concierge</p>
                <h3
                  className="text-xl font-bold text-[#4F0809]"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  Find the Palace
                </h3>
              </div>

              <div className="p-5 space-y-3">
                <InfoCard
                  icon={<MapPin className="w-5 h-5" />}
                  title="Palace Address"
                  lines={['Rajmahal Heritage Hotel', 'Near Lal Darwaza, Civil Lines,', 'Bikaner, Rajasthan – 334001']}
                  href="https://maps.google.com/?q=Rajmahal+Heritage+Hotel+Bikaner"
                />
                <InfoCard
                  icon={<Phone className="w-5 h-5" />}
                  title="Royal Phone Lines"
                  lines={['+91 98290 12345 (Reservations)', '+91 98290 67890 (Concierge)']}
                  href="tel:+919829012345"
                />
                <InfoCard
                  icon={<Mail className="w-5 h-5" />}
                  title="Email Concierge"
                  lines={['reservations@rajmahalheritage.com', 'info@rajmahalheritage.com']}
                  href="mailto:reservations@rajmahalheritage.com"
                />
                <InfoCard
                  icon={<Clock className="w-5 h-5" />}
                  title="Concierge Hours"
                  lines={['Front Desk: 24 × 7', 'Dining: 7 AM – 11 PM', 'Events Desk: 9 AM – 7 PM']}
                />
              </div>
            </div>

            {/* Map embed */}
            <div className="rounded-3xl overflow-hidden border border-[#E8DFCE] shadow-[0_4px_16px_rgba(79,8,9,0.04)]">
              <div className="relative">
                <iframe
                  title="Rajmahal Heritage Hotel Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3559.5!2d73.3119!3d28.0229!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjjCsDAxJzIyLjQiTiA3M8KwMTgnNDMuMiJF!5e0!3m2!1sen!2sin!4v1!5m2!1sen!2sin"
                  width="100%"
                  height="220"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block"
                />
                <a
                  href="https://maps.google.com/?q=Rajmahal+Heritage+Hotel+Bikaner"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-[#D8AA67]/50 text-[11px] font-semibold text-[#4F0809] hover:bg-[#FFF8EB] shadow-sm transition-colors"
                >
                  <Navigation className="w-3 h-3" />
                  Get Directions
                </a>
              </div>
            </div>

            {/* Social + Review strip */}
            <div className="rounded-2xl border border-[#E8DFCE] bg-white p-5 space-y-4">
              <p className="text-[10px] font-bold tracking-widest uppercase text-[#9C7A45]">Follow the Palace</p>
              <div className="flex items-center gap-3">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform shadow-sm"
                >
                  <InstagramIcon className="w-4.5 h-4.5" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform shadow-sm"
                >
                  <FacebookIcon className="w-4.5 h-4.5" />
                </a>
                <a
                  href="https://wa.me/919829012345"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform shadow-sm"
                >
                  <WhatsAppIcon className="w-4.5 h-4.5" />
                </a>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-[#EFE7D8]">
                <div className="flex">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-[#D8AA67] text-[#D8AA67]" />
                  ))}
                </div>
                <p className="text-xs text-[#6B533B]">
                  <strong className="text-[#4F0809]">4.8</strong> · 1,200+ guest reviews
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. BOTTOM FAQ STRIP ── */}
      <section
        className="border-t border-[#E8DFCE] py-14 sm:py-16"
        style={{ backgroundColor: '#FFF8EB' }}
      >
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <h2
            className="text-2xl sm:text-3xl font-bold text-[#4F0809] text-center mb-10"
            style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
          >
            Frequently Asked
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                q: 'What are the check-in & check-out times?',
                a: 'Check-in is from 12:00 noon. Check-out is by 11:00 AM. Early/late options are available at additional charges settled on arrival.',
              },
              {
                q: 'Do you have airport or station transfers?',
                a: 'Yes — we offer complimentary transfer arrangements. Contact our concierge at the time of booking to schedule.',
              },
              {
                q: 'Can I host a private event or wedding?',
                a: 'Absolutely. Rajmahal has three heritage banquet halls. Write to us or call our Events Desk at +91 98290 12345.',
              },
              {
                q: 'Is the restaurant open to walk-in guests?',
                a: 'Yes! Our royal dining room and courtyard café are open to all guests. Prior reservations are recommended for dinner.',
              },
            ].map(({ q, a }, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-[#E8DFCE] bg-white shadow-[0_2px_10px_rgba(79,8,9,0.03)]"
              >
                <p className="text-sm font-bold text-[#4F0809] mb-1.5">{q}</p>
                <p className="text-xs text-[#6B533B] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
