'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Cake,
  Heart,
  Briefcase,
  PartyPopper,
  Palette,
  UtensilsCrossed,
  Volume2,
  UserCheck,
  Car,
  BedDouble,
  ShieldCheck,
} from 'lucide-react';

const HALL_IMAGES = [
  {
    src: '/images/hall/crystal-ballroom.jpg',
    title: 'The Grand Party Hall',
    caption: 'Ornate royal chandeliers, carved arches, and elegant seating for 25-50 guests.',
  },
  {
    src: '/images/events/grand-banquet.jpg',
    title: 'Birthday & Anniversary Setup',
    caption: 'Customizable theme décor, festive lighting, cake table, and grand dining.',
  },
  {
    src: '/images/events/palace-dining.jpg',
    title: 'Romantic Date & Private Dining',
    caption: 'Intimate candlelight dining, rose petal table styling, and dedicated private server.',
  },
  {
    src: '/images/events/floral-decor.jpg',
    title: 'Customizable Décor & Floral Styling',
    caption: 'Bespoke floral backdrops, fairy lights, and themed stage arrangements.',
  },
];

export function PartyHallSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Form State
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [eventType, setEventType] = useState('Birthday Party');
  const [expectedGuests, setExpectedGuests] = useState('25 - 50 Guests');
  const [eventDate, setEventDate] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<{
    referenceCode: string;
    eventType: string;
    guests: string;
    date: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HALL_IMAGES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HALL_IMAGES.length) % HALL_IMAGES.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!contactName.trim() || !contactPhone.trim()) {
      setErrorMsg('Please enter your contact name and mobile number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/hall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName,
          contactPhone,
          contactEmail,
          eventType,
          expectedGuests: 40,
          notes: `Capacity: 25-50 people | Décor: Customizable | Message: ${message}`,
          eventDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit enquiry');

      setSubmittedLead({
        referenceCode: data.lead?.reference_code || `EVT-${Math.floor(1000 + Math.random() * 9000)}`,
        eventType,
        guests: expectedGuests,
        date: eventDate,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
<section
      id="party-hall-enquiry"
      className="relative py-16 sm:py-24 bg-[#3B0507] text-[#FDF8EE] overflow-hidden selection:bg-[#D8AA67] selection:text-[#3B0507]"
    >
      {/* Subtle Background Palace Dot Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.07] bg-[radial-gradient(#D8AA67_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── 1. TOP BANNER ROW: HEADLINE & HALL SPECIFICATIONS CARD ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center mb-14 sm:mb-20">
          {/* Left: Titles & Event Types */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase text-[#D8AA67] inline-flex items-center gap-2.5 mb-2">
              <span className="w-6 h-[1px] bg-[#C99A52] lg:hidden" />
              <span>Grand Party Hall</span>
              <span className="w-6 sm:w-8 h-[1px] bg-[#C99A52]" />
            </span>

            <h2
              className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-3.5 leading-[1.02] text-[#FDF8EE]"
              style={{
                fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
              }}
            >
              A Majestic Space for <br className="hidden sm:inline" />
              Every Occasion
            </h2>

            {/* Diamond-Tipped Gold Rule */}
            <div className="flex items-center justify-center lg:justify-start gap-2 w-40 sm:w-52 mb-5">
              <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
              <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]/70" />
              <span className="h-[1px] flex-1 bg-[#C99A52]/60 lg:hidden" />
            </div>

            <p className="text-xs sm:text-base text-[#FDF8EE]/85 max-w-xl font-light leading-relaxed mb-7 sm:mb-8">
              Host your special moments in our elegant banquet hall with royal architecture, modern facilities, customizable décor, and personalized hospitality crafted for 25 to 50 guests.
            </p>

            {/* Event Tags Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full">
              {[
                { label: 'Birthday Parties', icon: Cake },
                { label: 'Anniversary Parties', icon: Heart },
                { label: 'Book for a Date (Private)', icon: Sparkles },
                { label: 'Corporate Events', icon: Briefcase },
                { label: 'Social Functions', icon: PartyPopper },
                { label: 'Customizable Décor', icon: Palette },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center space-x-2.5 px-3 py-2.5 sm:p-3 rounded-xl bg-[#4F0809]/85 hover:bg-[#4F0809] transition-colors text-left text-[11px] sm:text-xs text-[#FDF8EE]"
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D8AA67] shrink-0" />
                    <span className="font-medium leading-snug">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Jharokha-Framed Hall Specifications Card */}
          <div className="lg:col-span-5">
            <div className="rounded-t-3xl rounded-b-2xl p-6 sm:p-7 bg-[#4F0809] text-left">
              <div className="flex items-center space-x-3 pb-4 mb-5">
                <div className="w-10 h-10 rounded-full bg-[#3B0507] flex items-center justify-center text-[#D8AA67] shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    className="text-2xl font-bold text-[#FDF8EE] leading-none"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    Grand Party Hall
                  </h3>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[#D8AA67] font-semibold block mt-1">
                    Exclusive Boutique Banquet
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="flex items-start space-x-3">
                  <Users className="w-4 h-4 text-[#D8AA67] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-[#FDF8EE] block">Capacity</span>
                    <span className="text-[#D8AA67] font-bold">25 – 50 Guests</span>
                    <span className="text-[#FDF8EE]/70 block text-[11px]">
                      Ideal for intimate celebrations, date nights &amp; private gatherings
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <PartyPopper className="w-4 h-4 text-[#D8AA67] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-[#FDF8EE] block">Ideal For</span>
                    <span className="text-[#FDF8EE]/80 text-[11px] leading-relaxed block">
                      Birthdays, Anniversaries, Romantic Dates, Corporate Meets &amp; Social Functions
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Palette className="w-4 h-4 text-[#D8AA67] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-[#FDF8EE] block">Customizable Décor</span>
                    <span className="text-[#FDF8EE]/80 text-[11px] leading-relaxed block">
                      Floral backdrops, fairy lights, balloon styling, romantic candlelight &amp; stage setup
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <UtensilsCrossed className="w-4 h-4 text-[#D8AA67] mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-[#FDF8EE] block">Catering</span>
                    <span className="text-[#FDF8EE]/80 text-[11px] block">
                      Multi-Cuisine &amp; Authentic Royal Rajasthani Banqueting
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-[#FDF8EE]/70">Private bookings open</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#3B0507] text-[11px] font-semibold text-[#D8AA67]">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
                  Direct Booking Guarantee
                </span>
              </div>
            </div>
          </div>
        </div>

{/* ── 2. MAIN AREA: CHECK AVAILABILITY FORM + PHOTO CAROUSEL ── */}
        <div className="bg-[#FDF8EE] rounded-t-3xl rounded-b-2xl p-4 sm:p-8 lg:p-10 text-[#4F0809] mb-16 sm:mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Top on Mobile / Right on Desktop: Interactive Hall Photo Carousel */}
            <div className="order-1 lg:order-2 lg:col-span-6 flex flex-col justify-between">
              <div className="relative h-60 sm:h-96 w-full rounded-t-3xl rounded-b-xl overflow-hidden bg-[#EFE6D5] group">
                <Image
                  src={HALL_IMAGES[currentSlide].src}
                  alt={HALL_IMAGES[currentSlide].title}
                  fill
                  className="object-cover transition-all duration-700"
                />

                {/* Gradient shade */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#2B0507]/85 via-transparent to-transparent" />

                {/* Carousel Controls */}
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Previous slide"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#4F0809]/80 hover:bg-[#4F0809] text-[#FFF8EB] flex items-center justify-center backdrop-blur-sm transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 text-[#D8AA67]" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next slide"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#4F0809]/80 hover:bg-[#4F0809] text-[#FFF8EB] flex items-center justify-center backdrop-blur-sm transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 text-[#D8AA67]" />
                </button>

                {/* Slide Caption */}
                <div className="absolute bottom-3.5 left-4 right-4 text-left text-white">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4F0809]/95 text-[9px] font-bold text-[#F7E5C3] uppercase tracking-[0.16em] mb-1">
                    <span className="w-1 h-1 rounded-full bg-[#D8AA67]" />
                    Capacity 25–50 People
                  </span>
                  <h4
                    className="text-base sm:text-xl font-bold text-[#FFF8EB] mb-0.5 leading-snug"
                    style={{
                      fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                    }}
                  >
                    {HALL_IMAGES[currentSlide].title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-[#FFF8EB]/80 line-clamp-1">
                    {HALL_IMAGES[currentSlide].caption}
                  </p>
                </div>
              </div>

              {/* Thumbnails */}
              <div className="grid grid-cols-4 gap-2 sm:gap-2.5 mt-2.5 sm:mt-3">
                {HALL_IMAGES.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={`relative h-14 sm:h-20 rounded-xl overflow-hidden transition-all cursor-pointer ${
                      currentSlide === idx
                        ? 'opacity-100 scale-[1.02]'
                        : 'opacity-55 hover:opacity-90'
                    }`}
                  >
                    <Image src={img.src} alt={img.title} fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom on Mobile / Left on Desktop: Form */}
            <div className="order-2 lg:order-1 lg:col-span-6 text-left">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#9C7A45] block mb-1">
                Reserve Your Date
              </span>
              <h3
                className="text-2xl sm:text-3xl font-bold text-[#4F0809] mb-2"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                Check Availability &amp; Enquire
              </h3>

              {/* Ornamental Gold Divider */}
              <div className="flex items-center gap-1.5 w-32 mb-3">
                <span className="h-[1px] w-8 bg-[#C99A52]" />
                <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]/70" />
                <span className="h-[1px] flex-1 bg-[#C99A52]/30" />
              </div>

              <p className="text-xs sm:text-sm text-[#6B533B] mb-5 sm:mb-6 leading-relaxed">
                Send us your celebration requirements and our event manager will confirm availability for your 25–50 guests event.
              </p>

              {submittedLead ? (
                <div className="p-6 rounded-2xl bg-emerald-50 text-emerald-950 space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Enquiry Received Successfully!</span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-900">
                    Thank you! Your reference code is{' '}
                    <strong className="font-mono text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded">
                      {submittedLead.referenceCode}
                    </strong>
                    . Our dedicated event coordinator will call you shortly to discuss your custom décor, date, and guest arrangements.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedLead(null)}
                    className="text-xs font-bold uppercase tracking-wider text-emerald-800 underline hover:text-emerald-950 pt-1 cursor-pointer"
                  >
                    Submit Another Enquiry
                  </button>
                </div>
              ) : (
<form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 text-xs text-red-800 bg-red-50 rounded-xl">
                      {errorMsg}
                    </div>
                  )}

                  {/* Row 1: Event Type & Event Date (Always Side-by-Side on Mobile & Desktop) */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                    {/* Event Type */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                        Event Type
                      </label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full h-11 px-2.5 sm:px-3.5 rounded-xl bg-[#F5ECDC] text-xs sm:text-sm font-semibold text-[#4F0809] focus:bg-[#EFE2CC] focus:outline-none transition-colors"
                      >
                        <option value="Birthday Party">Birthday Party</option>
                        <option value="Anniversary Party">Anniversary Party</option>
                        <option value="Romantic Date & Private Dining">Book for a Date</option>
                        <option value="Corporate Event / Meeting">Corporate Event</option>
                        <option value="Social Function / Gathering">Social Function</option>
                      </select>
                    </div>

                    {/* Event Date */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                        Event Date
                      </label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full h-11 px-2.5 sm:px-3.5 rounded-xl bg-[#F5ECDC] text-xs sm:text-sm font-semibold text-[#4F0809] focus:bg-[#EFE2CC] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Row 2: Expected Guests Chips & Your Name in a Single Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                    {/* Expected Guests Chip Selector */}
                    <div className="sm:col-span-7">
                      <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                        Expected Guests (25–50)
                      </label>
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                        {[
                          { value: 'Romantic Date (2 Guests)', label: '2 Guests' },
                          { value: '25 - 35 Guests', label: '25–35' },
                          { value: '35 - 50 Guests', label: '35–50' },
                        ].map((chip) => {
                          const isSelected = expectedGuests === chip.value;
                          return (
                            <button
                              key={chip.value}
                              type="button"
                              onClick={() => setExpectedGuests(chip.value)}
                              className={`flex-1 h-11 px-2.5 rounded-full text-[11px] font-bold tracking-wide whitespace-nowrap transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#4F0809] text-[#FFF8EB]'
                                  : 'bg-[#F5ECDC] text-[#4F0809] hover:bg-[#EFE2CC]'
                              }`}
                            >
                              {chip.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Your Name */}
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                        Your Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Vikramaditya Singh"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-[#F5ECDC] text-xs sm:text-sm text-[#4F0809] placeholder:text-[#856B4D]/55 focus:bg-[#EFE2CC] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Row 3: Phone Number & Email Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-[#F5ECDC] text-xs sm:text-sm text-[#4F0809] placeholder:text-[#856B4D]/55 focus:bg-[#EFE2CC] focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="name@example.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl bg-[#F5ECDC] text-xs sm:text-sm text-[#4F0809] placeholder:text-[#856B4D]/55 focus:bg-[#EFE2CC] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Message (Optional) */}
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.14em] font-bold text-[#856B4D] mb-1.5">
                      Customizable Décor &amp; Event Requirements (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about your celebration theme, cake, floral styling, romantic table setup..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-[#F5ECDC] text-xs sm:text-sm text-[#4F0809] placeholder:text-[#856B4D]/55 focus:bg-[#EFE2CC] focus:outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Submit Pill CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#4F0809] hover:bg-[#680b0c] text-[#FFF8EB] text-xs font-bold uppercase tracking-[0.14em] transition-colors cursor-pointer inline-flex items-center justify-center space-x-2 group"
                  >
                    <span>{isSubmitting ? 'Sending Enquiry...' : 'Check Availability & Enquire'}</span>
                    <ArrowRight className="w-4 h-4 text-[#D8AA67] group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>  

        {/* ── 3. FACILITIES & AMENITIES FOR EVENTS ── */}
        <div className="text-center mb-16 sm:mb-20">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#D8AA67] block mb-1.5">
            Facilities &amp; Amenities
          </span>
          <h3
            className="text-3xl sm:text-4xl font-bold text-[#FDF8EE] mb-3"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            Everything for a Perfect Event
          </h3>

          <div className="flex items-center justify-center gap-2 w-40 mx-auto mb-8 sm:mb-10">
            <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]/70" />
            <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              {
                title: 'Customizable Décor',
                desc: 'Themes, flowers & fairy lights',
                icon: Palette,
              },
              {
                title: 'Premium Catering',
                desc: 'Royal Rajasthani & multi-cuisine',
                icon: UtensilsCrossed,
              },
              {
                title: 'Audio-Visual Setup',
                desc: 'Surround sound & projection',
                icon: Volume2,
              },
              {
                title: 'Dedicated Event Manager',
                desc: 'Seamless coordination',
                icon: UserCheck,
              },
              {
                title: 'Parking Facility',
                desc: 'Complimentary valet parking',
                icon: Car,
              },
              {
                title: 'Deluxe Rooms for Guests',
                desc: 'Comfortable stay on property',
                icon: BedDouble,
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-t-3xl rounded-b-xl bg-[#4F0809] hover:bg-[#5D0B0D] transition-colors text-center group"
                >
                  <div className="w-11 h-11 rounded-full bg-[#3B0507] flex items-center justify-center text-[#D8AA67] mb-3 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[#FDF8EE] mb-1 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-[#FDF8EE]/70 leading-tight">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. GALLERY - MOMENTS THAT MAKE MEMORIES ── */}
        <div className="text-left mb-16 sm:mb-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-2">
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#D8AA67] block mb-1">
                Gallery
              </span>
              <h3
                className="text-3xl sm:text-4xl font-bold text-[#FDF8EE]"
                style={{
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                }}
              >
                Moments that Make Memories
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous gallery image"
                className="w-9 h-9 rounded-full bg-[#4F0809] flex items-center justify-center text-[#D8AA67] hover:bg-[#D8AA67] hover:text-[#4F0809] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next gallery image"
                className="w-9 h-9 rounded-full bg-[#4F0809] flex items-center justify-center text-[#D8AA67] hover:bg-[#D8AA67] hover:text-[#4F0809] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                src: '/images/events/wedding-mandap.jpg',
                title: 'Royal Stage & Floral Arch',
              },
              {
                src: '/images/events/grand-banquet.jpg',
                title: 'Celebration Dining Table',
              },
              {
                src: '/images/events/palace-dining.jpg',
                title: 'Candlelight Date Arrangement',
              },
              {
                src: '/images/events/courtyard-night.jpg',
                title: 'Evening Illumination & Courtyard',
              },
            ].map((gal, idx) => (
              <div
                key={idx}
                className="relative h-48 sm:h-64 rounded-t-3xl rounded-b-xl overflow-hidden group"
              >
                <Image
                  src={gal.src}
                  alt={gal.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2B0507]/85 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3.5 right-3.5 text-xs font-semibold text-[#FDF8EE] leading-snug">
                  {gal.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. BOTTOM CTA BANNER ── */}
        <div className="rounded-t-3xl mb-6 sm:mb-0 rounded-b-2xl p-7 sm:p-12 text-center text-[#4F0809] bg-[#FDF8EE]">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] text-[#9C7A45] block mb-2">
            Experience Rajmahal
          </span>
          <h3
            className="text-3xl sm:text-5xl font-bold text-[#4F0809] mb-3 leading-tight"
            style={{
              fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            Plan Your Stay or Celebration Today
          </h3>

          <div className="flex items-center justify-center gap-2 w-40 sm:w-48 mx-auto mb-4">
            <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
            <span className="w-1.5 h-1.5 rotate-45 bg-[#D8AA67]/70" />
            <span className="h-[1px] flex-1 bg-[#C99A52]/60" />
          </div>

          <p className="text-xs sm:text-base text-[#6B533B] max-w-xl mx-auto mb-7 sm:mb-8 font-normal leading-relaxed">
            Whether it&apos;s a luxurious stay in our Deluxe Rooms or an intimate celebration in our 25–50 guests party hall, we are here to make it unforgettable.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href="/rooms"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full font-bold text-xs uppercase tracking-[0.14em] text-[#FFF8EB] bg-[#4F0809] hover:bg-[#680b0c] transition-colors inline-flex items-center justify-center space-x-2 group"
            >
              <BedDouble className="w-4 h-4 text-[#D8AA67]" />
              <span>Book a Deluxe Room</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D8AA67] group-hover:translate-x-1 transition-transform" />
            </a>

            <a
              href="#party-hall-enquiry"
              className="w-full sm:w-auto px-7 py-3.5 rounded-full font-bold text-xs uppercase tracking-[0.14em] text-[#4F0809] bg-[#D8AA67]/25 hover:bg-[#D8AA67]/45 transition-colors inline-flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4 text-[#9C7A45]" />
              <span>Enquire for Party Hall (25–50 Pax)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
