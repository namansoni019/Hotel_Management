'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Compass,
  Car,
  Plane,
  Train,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'Suite & Heritage Room Bookings',
    preferred_contact: 'Phone Call',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ reference: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Accordion FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      setErrorMessage('Please provide your name, contact phone number, and inquiry message.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessInfo({ reference: data.reference_number || 'INQ-ROYAL' });
        setFormData({
          name: '',
          email: '',
          phone: '',
          department: 'Suite & Heritage Room Bookings',
          preferred_contact: 'Phone Call',
          message: '',
        });
      } else {
        setErrorMessage(data.error || 'Failed to submit inquiry. Please call concierge directly.');
      }
    } catch {
      setErrorMessage('Network error. Please call our 24x7 Royal Desk at +91 98765 43210.');
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: 'How do I arrange early check-in or late check-out?',
      a: 'Early check-in from 10:00 AM and late check-out up to 04:00 PM are subject to suite availability. Please inform our concierge at least 24 hours in advance so our royal khansama and housekeeping can prepare your chambers.',
    },
    {
      q: 'Do you provide airport and railway station transfers?',
      a: 'Yes, we provide luxury chauffeur-driven transfers from Maharana Pratap Airport (Udaipur) and Udaipur City Railway Station. Vintage car arrival transfers are also available on request for Palace Suite reservations.',
    },
    {
      q: 'Is valet parking available on-site at the Palace?',
      a: 'Yes, complimentary secured valet parking and a covered chauffeur resting lounge are available round-the-clock at the Palace Porch for all resident guests and dining patrons.',
    },
    {
      q: 'Can I book private candlelit courtyard dining or anniversary events?',
      a: 'Absolutely. Our Courtyard Pavilion and Sheesh Mahal terrace can be exclusively booked for candlelit dinners, royal anniversary celebrations, and private thali feasts with live classical sitar musicians.',
    },
    {
      q: 'What is the cancellation policy for room and suite bookings?',
      a: 'Standard reservations can be modified or cancelled free of charge up to 48 hours prior to check-in. For festive seasons and royal wedding hall buyouts, special cancellation terms apply as detailed during booking confirmation.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FBF6EF] text-[#302421]">
      {/* ── 1. Hero Banner ── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-24 overflow-hidden bg-[#2A0506]">
        {/* Background Image with Rich Royal Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero_haveli.jpg"
            alt="Rajmahal Heritage Palace Udaipur"
            className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1A0304]/90 via-[#4F0809]/80 to-[#2A0506]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          {/* Breadcrumb */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-[#D8AA67]/40 text-[11px] font-semibold text-[#D8AA67] tracking-wider uppercase mb-5">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span>&rsaquo;</span>
            <span className="text-white">Contact Concierge</span>
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-8 h-px bg-[#D8AA67]/60" />
            <span className="w-2 h-2 rotate-45 bg-[#D8AA67]" />
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#D8AA67]">
              Royal Concierge &amp; Guest Relations
            </span>
            <span className="w-2 h-2 rotate-45 bg-[#D8AA67]" />
            <span className="w-8 h-px bg-[#D8AA67]/60" />
          </div>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#FFF8EB] mb-4"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Connect with The Palace
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#FDF8EE]/85 leading-relaxed font-light">
            Whether planning an opulent royal stay, reserving a banquet for timeless celebrations, or
            requesting bespoke transfers — our heritage concierge is at your service 24 hours a day.
          </p>

          {/* Quick Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-[#FFF8EB]/90">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Desk: 24&times;7 Live</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/15">
              <Clock className="w-3.5 h-3.5 text-[#D8AA67]" />
              <span>Guaranteed 2-Hour Response</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/15">
              <MapPin className="w-3.5 h-3.5 text-[#D8AA67]" />
              <span>Lake Pichola Precinct, Udaipur</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Top Highlights 3-Card Grid ── */}
      <section className="relative z-20 -mt-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Direct Telephones */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8DCD2] shadow-xl hover:shadow-2xl hover:border-[#B78A48] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#4F0809]/10 border border-[#4F0809]/20 flex items-center justify-center text-[#4F0809] mb-4 group-hover:bg-[#4F0809] group-hover:text-white transition-colors">
              <Phone className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#B78A48]">
              Royal Concierge &amp; Desk
            </span>
            <h3
              className="text-lg font-bold text-[#4F0809] mt-0.5 mb-2"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              24&times;7 Telephones
            </h3>
            <div className="space-y-1 text-xs text-[#302421]">
              <p className="font-semibold text-sm text-[#4F0809]">+91 98765 43210</p>
              <p className="text-[#81736D]">+91 294 242 8888 (Boardline)</p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E8DCD2] flex items-center justify-between">
              <a
                href="tel:+919876543210"
                className="text-xs font-bold text-[#4F0809] hover:text-[#680b0c] flex items-center gap-1"
              >
                <span>Call Now</span>
                <span className="text-sm">&rarr;</span>
              </a>
              <a
                href="https://wa.me/919876543210?text=Namaste%20Rajmahal%20Concierge,%20I%20would%20like%20to%20inquire%20about..."
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 hover:bg-emerald-100 transition"
              >
                WhatsApp
              </a>
            </div>
          </div>

          {/* Card 2: Electronic Correspondence */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8DCD2] shadow-xl hover:shadow-2xl hover:border-[#B78A48] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#4F0809]/10 border border-[#4F0809]/20 flex items-center justify-center text-[#4F0809] mb-4 group-hover:bg-[#4F0809] group-hover:text-white transition-colors">
              <Mail className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#B78A48]">
              Official Correspondence
            </span>
            <h3
              className="text-lg font-bold text-[#4F0809] mt-0.5 mb-2"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Email &amp; Inquiries
            </h3>
            <div className="space-y-1 text-xs text-[#302421]">
              <p className="font-semibold text-sm text-[#4F0809] truncate">reservations@rajmahalhotel.in</p>
              <p className="text-[#81736D] truncate">info@rajmahalhotel.in</p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E8DCD2] flex items-center justify-between">
              <a
                href="mailto:reservations@rajmahalhotel.in"
                className="text-xs font-bold text-[#4F0809] hover:text-[#680b0c] flex items-center gap-1"
              >
                <span>Compose Mail</span>
                <span className="text-sm">&rarr;</span>
              </a>
              <span className="text-[10px] text-[#81736D] font-medium">&lt; 2hr reply guarantee</span>
            </div>
          </div>

          {/* Card 3: Palace Address & Location */}
          <div className="bg-white rounded-2xl p-6 border border-[#E8DCD2] shadow-xl hover:shadow-2xl hover:border-[#B78A48] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-[#4F0809]/10 border border-[#4F0809]/20 flex items-center justify-center text-[#4F0809] mb-4 group-hover:bg-[#4F0809] group-hover:text-white transition-colors">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#B78A48]">
              Heritage Precinct
            </span>
            <h3
              className="text-lg font-bold text-[#4F0809] mt-0.5 mb-2"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Palace Address
            </h3>
            <div className="space-y-1 text-xs text-[#302421]">
              <p className="font-medium text-[#302421] leading-relaxed">
                Lake Palace Road, Pichola, Udaipur, Rajasthan 313001
              </p>
              <p className="text-[11px] text-[#81736D]">Valet parking &amp; Porch Chauffeur bay</p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E8DCD2] flex items-center justify-between">
              <a
                href="https://maps.google.com/?q=Lake+Palace+Road+Pichola+Udaipur+Rajasthan+313001"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#4F0809] hover:text-[#680b0c] flex items-center gap-1"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3 h-3 text-[#B78A48]" />
              </a>
              <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Pichola Precinct
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Main Two-Column Section: Inquiry Form & Details ── */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#E8DCD2] shadow-xl">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rotate-45 bg-[#B78A48]" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#B78A48]">
                  Personalised Service
                </span>
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#4F0809]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Send a Message to the Concierge
              </h2>
              <p className="text-xs sm:text-sm text-[#81736D] mt-1">
                Please leave your details below. Our Guest Relations Manager will attend to your request
                promptly.
              </p>
            </div>

            {/* Success Feedback Card */}
            {successInfo && (
              <div className="mb-6 p-5 rounded-2xl bg-[#F0FDF4] border border-emerald-300 text-emerald-900 animate-in fade-in duration-300">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-950">
                      Dhanyavaad! Your Inquiry Has Been Transmitted
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Reference Number: <span className="font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-950">{successInfo.reference}</span>. Our Head Concierge will contact you via your preferred channel within 2 hours.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSuccessInfo(null)}
                      className="mt-3 text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
                    >
                      Submit another inquiry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Feedback */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#4F0809] mb-1.5">
                    Your Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Maharaja Vikramaditya"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/40 text-xs text-[#302421] focus:bg-white focus:border-[#4F0809] focus:outline-none transition shadow-2xs"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-[#4F0809] mb-1.5">
                    Contact Number / WhatsApp <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/40 text-xs text-[#302421] focus:bg-white focus:border-[#4F0809] focus:outline-none transition shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-[#4F0809] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. guest@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/40 text-xs text-[#302421] focus:bg-white focus:border-[#4F0809] focus:outline-none transition shadow-2xs"
                  />
                </div>

                {/* Department / Category */}
                <div>
                  <label className="block text-xs font-semibold text-[#4F0809] mb-1.5">
                    Inquiry Department
                  </label>
                  <div className="relative">
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/40 text-xs text-[#302421] focus:bg-white focus:border-[#4F0809] focus:outline-none pr-8 cursor-pointer shadow-2xs"
                    >
                      <option value="Suite & Heritage Room Bookings">Suite &amp; Room Bookings</option>
                      <option value="Royal Dining & Table Reservations">Royal Heritage Dining &amp; Thali</option>
                      <option value="The Palace Courtyard Café & Lounge">The Palace Courtyard Café</option>
                      <option value="Royal Banquets, Weddings & Hall Bookings">Royal Weddings &amp; Banquets</option>
                      <option value="Airport / Railway Chauffeur Transfers">Airport / Chauffeur Transfers</option>
                      <option value="General Concierge Request">General Guest Assistance</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#81736D] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Preferred Contact Mode */}
              <div>
                <label className="block text-xs font-semibold text-[#4F0809] mb-1.5">
                  Preferred Contact Mode
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {['Phone Call', 'WhatsApp Message', 'Email'].map((mode) => (
                    <label
                      key={mode}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
                        formData.preferred_contact === mode
                          ? 'border-[#4F0809] bg-[#4F0809] text-white shadow-2xs'
                          : 'border-[#E8DCD2] bg-white text-[#81736D] hover:bg-[#FBF6EF]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="preferred_contact"
                        value={mode}
                        checked={formData.preferred_contact === mode}
                        onChange={() => setFormData({ ...formData, preferred_contact: mode })}
                        className="hidden"
                      />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold text-[#4F0809] mb-1.5">
                  Your Message or Special Requirements <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your dates of stay, number of guests, celebratory occasions, or specific culinary requests..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/40 text-xs text-[#302421] focus:bg-white focus:border-[#4F0809] focus:outline-none transition shadow-2xs"
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] text-white text-xs font-bold tracking-wider uppercase shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#D8AA67]" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-[#D8AA67]" />
                      <span>Transmit Royal Inquiry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Palace Information & Experience Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Palace Timings Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#E8DCD2] shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#4F0809]/10 text-[#4F0809] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3
                  className="text-lg font-bold text-[#4F0809]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Palace Timings &amp; Service Hours
                </h3>
              </div>

              <div className="space-y-3 divide-y divide-[#E8DCD2]/60 text-xs text-[#302421]">
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-semibold text-[#4F0809]">Front Desk &amp; Concierge</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
                    24 Hours Open
                  </span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-semibold">Check-in / Check-out</span>
                  <span className="text-[#81736D]">02:00 PM / 11:00 AM</span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-semibold">Royal Dining (Restaurant)</span>
                  <span className="text-[#81736D]">12:30 PM &ndash; 11:00 PM</span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-semibold">Courtyard Café &amp; Lounge</span>
                  <span className="text-[#81736D]">08:00 AM &ndash; 11:30 PM</span>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-semibold">Palace Pool &amp; Garden</span>
                  <span className="text-[#81736D]">07:00 AM &ndash; 08:00 PM</span>
                </div>
              </div>
            </div>

            {/* Arrival & Distance Guide */}
            <div className="bg-[#4F0809] text-white rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#D8AA67]" />
                <h3
                  className="text-lg font-bold text-[#FFF8EB]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Distances &amp; Arrival Guide
                </h3>
              </div>

              <div className="space-y-3 text-xs text-[#FDF8EE]/90">
                <div className="flex items-start gap-3">
                  <Plane className="w-4 h-4 text-[#D8AA67] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Maharana Pratap Airport (UDR)</p>
                    <p className="text-[11px] text-[#FDF8EE]/70">24 km &bull; Approx. 35 mins via Airport Road</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Train className="w-4 h-4 text-[#D8AA67] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">Udaipur City Railway Station</p>
                    <p className="text-[11px] text-[#FDF8EE]/70">3.5 km &bull; Approx. 10 mins</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-[#D8AA67] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">City Palace Complex &amp; Pichola Ghats</p>
                    <p className="text-[11px] text-[#FDF8EE]/70">1.2 km &bull; Walking or 4 mins car ride</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 text-[11px] text-[#D8AA67] flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 shrink-0" />
                <span>Complimentary royal vintage pick-up for Palace Suites</span>
              </div>
            </div>

            {/* Direct Instant Action */}
            <div className="bg-[#FBF6EF] border border-[#E8DCD2] rounded-3xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#4F0809]">Instant WhatsApp Concierge</h4>
                  <p className="text-[11px] text-[#81736D]">Chat directly with royal hospitality</p>
                </div>
              </div>
              <a
                href="https://wa.me/919876543210?text=Namaste,%20I%20would%20like%20to%20inquire%20about%20booking%20at%20Rajmahal%20Heritage."
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition shrink-0"
              >
                Chat Now
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Interactive Map Section ── */}
      <section className="py-12 bg-white border-y border-[#E8DCD2]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rotate-45 bg-[#B78A48]" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#B78A48]">
                  Palace Location
                </span>
              </div>
              <h2
                className="text-2xl sm:text-3xl font-bold text-[#4F0809]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Find Us on Lake Palace Road
              </h2>
              <p className="text-xs sm:text-sm text-[#81736D] mt-1">
                Nestled in the historic Pichola quarter with serene water panoramas and heritage charm.
              </p>
            </div>

            <a
              href="https://maps.google.com/?q=Lake+Palace+Road+Pichola+Udaipur+Rajasthan+313001"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] text-white text-xs font-semibold shadow-md transition shrink-0"
            >
              <span>Get Driving Directions</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#D8AA67]" />
            </a>
          </div>

          {/* Map Frame */}
          <div className="rounded-3xl overflow-hidden border border-[#E8DCD2] shadow-2xl h-[360px] sm:h-[420px] relative bg-slate-100">
            <iframe
              title="Rajmahal Heritage Grand Map Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14512.651590748524!2d73.676008!3d24.576395!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3967e565787654321%3A0x123456789abcdef!2sLake%20Palace%20Rd%2C%20Pichola%2C%20Udaipur%2C%20Rajasthan%20313001!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            />
          </div>
        </div>
      </section>

      {/* ── 5. Frequently Asked Questions (FAQ) ── */}
      <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rotate-45 bg-[#B78A48]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#B78A48]">
              Concierge Guidance
            </span>
            <span className="w-1.5 h-1.5 rotate-45 bg-[#B78A48]" />
          </div>
          <h2
            className="text-2xl sm:text-3xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Frequently Asked Inquiries
          </h2>
          <p className="text-xs sm:text-sm text-[#81736D] mt-1">
            Answers to common questions regarding arrivals, check-in, dining, and royal facilities.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E8DCD2] overflow-hidden shadow-xs transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-[#4F0809] hover:bg-[#FBF6EF]/50 transition cursor-pointer"
                >
                  <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }} className="text-base sm:text-lg">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#B78A48] transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 text-xs text-[#81736D] leading-relaxed border-t border-[#E8DCD2]/50 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
