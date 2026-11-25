'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ArrowRight,
  BedDouble,
  PartyPopper,
  Users,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Lock,
  X,
  Dog,
  Check,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type TabType = 'rooms' | 'hall';
type TooltipPanelType = 'calendar' | 'guests' | 'hallOccasion' | 'hallCalendar' | 'hallCapacity';

interface StaySuggestion {
  label: string;
  sublabel: string;
  nights: number;
}

const STAY_SUGGESTIONS: StaySuggestion[] = [
  { label: '✨ Custom Dates', sublabel: 'Pick Any Range', nights: 0 },
  { label: '1 Night', sublabel: 'Quick Day Stay', nights: 1 },
  { label: '2 Nights', sublabel: 'Weekend Getaway', nights: 2 },
  { label: '3 Nights', sublabel: 'Royal Retreat (Popular)', nights: 3 },
  { label: '5 Nights', sublabel: 'Heritage Exploration', nights: 5 },
  { label: '7 Nights', sublabel: 'Full Imperial Week', nights: 7 },
];

interface EventOccasionOption {
  id: string;
  title: string;
  badge: string;
  subtext: string;
  icon: string;
}

const EVENT_OCCASION_OPTIONS: EventOccasionOption[] = [
  {
    id: 'birthday',
    title: 'Birthday Celebration',
    badge: 'Popular',
    subtext: 'Royal courtyard celebration, candle illumination, cake ceremony & live flute/folk music.',
    icon: '🎂',
  },
  {
    id: 'anniversary',
    title: 'Anniversary & Milestone Party',
    badge: 'Romantic',
    subtext: 'Silver & golden milestone soiree with candlelit lakefront dining and champagne toast.',
    icon: '💍',
  },
  {
    id: 'date',
    title: 'Romantic Candlelight Dinner',
    badge: 'Private',
    subtext: 'Exclusive Jharokha alcove table, bespoke royal degustation menu & private butler.',
    icon: '🕯️',
  },
  {
    id: 'corporate',
    title: 'Corporate Retreat & Conference',
    badge: 'Executive',
    subtext: 'High-definition AV projection, executive royal dining & cocktail networking lounge.',
    icon: '💼',
  },
  {
    id: 'sangeet',
    title: 'Pre-Wedding & Sangeet Gathering',
    badge: 'Festive',
    subtext: 'Traditional marigold floral decor, vibrant Ghoomar performance & multi-course Rajasthani feast.',
    icon: '🪕',
  },
  {
    id: 'family',
    title: 'Royal Family Reunion & Gathering',
    badge: 'Heritage',
    subtext: 'Private palace courtyard reserved for multigenerational family dinners & memories.',
    icon: '👑',
  },
  {
    id: 'hightea',
    title: 'Sunset High Tea & Soirée',
    badge: 'Afternoon',
    subtext: 'Palace terrace gathering with Rajasthani savories, herbal infusions & panoramic lake sunset.',
    icon: '🫖',
  },
];

interface HallCapacityOption {
  id: string;
  title: string;
  subtext: string;
  badge: string;
}

const HALL_CAPACITY_OPTIONS: HallCapacityOption[] = [
  {
    id: '25-35',
    title: '25 – 35 Guests',
    subtext: 'Intimate Gathering & Family Feasts',
    badge: 'Cozy Royal',
  },
  {
    id: '35-50',
    title: '35 – 50 Guests',
    subtext: 'Party Hall Standard Booking',
    badge: 'Most Popular',
  },
  {
    id: '50-75',
    title: '50 – 75 Guests',
    subtext: 'Celebration Hall & Courtyard Terrace',
    badge: 'Celebrations',
  },
  {
    id: '75-100',
    title: '75 – 100 Guests',
    subtext: 'Grand Mewar Banquet & Sangeet',
    badge: 'Grand Feast',
  },
  {
    id: '100+',
    title: '100+ Guests',
    subtext: 'Full Palace Courtyard & Amphitheatre',
    badge: 'Imperial Gala',
  },
];

// Helper: Format YYYY-MM-DD
function toYMD(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Helper: Parse YYYY-MM-DD to Date
function parseYMD(str: string): Date {
  const parts = str.split('-').map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

// Helper: Add days
function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

export interface BookingBarInitialSearch {
  checkIn?: string;
  checkOut?: string;
  adults?: string | number;
  children?: string | number;
  pets?: string | number;
  rooms?: string | number;
}

export function BookingBar({ initialSearch }: { initialSearch?: BookingBarInitialSearch } = {}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>('rooms');

  // Rooms Booking State
  const [checkIn, setCheckIn] = useState(initialSearch?.checkIn || '');
  const [checkOut, setCheckOut] = useState(initialSearch?.checkOut || '');
  const [adults, setAdults] = useState(() => {
    const val = Number(initialSearch?.adults);
    return Number.isFinite(val) && val > 0 ? val : 2;
  });
  const [children, setChildren] = useState(() => {
    const val = Number(initialSearch?.children);
    return Number.isFinite(val) && val >= 0 ? val : 0;
  });
  const [pets, setPets] = useState(() => {
    const val = Number(initialSearch?.pets);
    return Number.isFinite(val) && val >= 0 ? val : 0;
  });

  // Room count state: default is 1 room for 2 guests; auto-increments to 2 at 4 guests
  const [rooms, setRooms] = useState(() => {
    const val = Number(initialSearch?.rooms);
    return Number.isFinite(val) && val > 0 ? val : 1;
  });
  const [userHasCustomizedRooms, setUserHasCustomizedRooms] = useState(false);

  // Party Hall Booking State
  const [hallEventType, setHallEventType] = useState('Birthday Celebration');
  const [hallDate, setHallDate] = useState('');
  const [hallCapacity, setHallCapacity] = useState('35 – 50 Guests (Most Popular)');

  // Tooltip Dialog State with Opening / Closing Animation
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeTooltipTab, setActiveTooltipTab] = useState<TooltipPanelType>('calendar');
  const [beakLeftPx, setBeakLeftPx] = useState<number>(80);

  // Display Awareness & Collision Detection State
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [maxContentHeight, setMaxContentHeight] = useState<number>(440);

  // Calendar Navigation Month State
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectingField, setSelectingField] = useState<'in' | 'out'>('in');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Refs
  const barRootRef = useRef<HTMLDivElement>(null);
  const dialogCardRef = useRef<HTMLDivElement>(null);
  const activeTileRef = useRef<HTMLDivElement | null>(null);

  const checkInTileRef = useRef<HTMLDivElement>(null);
  const checkOutTileRef = useRef<HTMLDivElement>(null);
  const guestsTileRef = useRef<HTMLDivElement>(null);
  const hallOccasionTileRef = useRef<HTMLDivElement>(null);
  const hallDateTileRef = useRef<HTMLDivElement>(null);
  const hallCapacityTileRef = useRef<HTMLDivElement>(null);

  // Initialize dates & screen size
  useEffect(() => {
    setMounted(true);
    const now = new Date();
    const today = toYMD(now);
    const threeDaysLater = toYMD(addDays(now, 3));
    const fourteenDaysLater = toYMD(addDays(now, 14));

    setCheckIn((prev) => prev || today);
    setCheckOut((prev) => prev || threeDaysLater);
    setHallDate((prev) => prev || fourteenDaysLater);
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));

    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Format Display Date Object
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return { day: '--', monthYear: 'Select Date', weekday: '' };
    try {
      const d = parseYMD(dateStr);
      return {
        day: d.getDate().toString().padStart(2, '0'),
        monthYear: `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}`,
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      };
    } catch {
      return { day: '--', monthYear: dateStr, weekday: '' };
    }
  };

  const calculateNights = (inStr: string, outStr: string) => {
    if (!inStr || !outStr) return 1;
    try {
      const d1 = parseYMD(inStr);
      const d2 = parseYMD(outStr);
      const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  const formattedCheckIn = formatDisplayDate(checkIn);
  const formattedCheckOut = formatDisplayDate(checkOut);
  const formattedHallDate = formatDisplayDate(hallDate);
  const nightsCount = calculateNights(checkIn, checkOut);

  // Formatted Guests Summary String
  const guestsSummary = `${adults} ${adults === 1 ? 'Adult' : 'Adults'}${
    children > 0 ? `, ${children} ${children === 1 ? 'Child' : 'Children'}` : ''
  } • ${rooms} ${rooms === 1 ? 'Chamber' : 'Chambers'}${
    pets > 0 ? ` • ${pets} ${pets === 1 ? 'Pet' : 'Pets'}` : ''
  }`;

  // ── Display Awareness Calculation (No programmatic scroll) ──
  const updateDisplayAwareness = useCallback(() => {
    if (!barRootRef.current) return;
    const barRect = barRootRef.current.getBoundingClientRect();
    const windowH = window.innerHeight;
    const spaceBelow = windowH - barRect.bottom;
    const spaceAbove = barRect.top;

    const flipToTop = spaceBelow < 370 && spaceAbove > spaceBelow;
    setPlacement(flipToTop ? 'top' : 'bottom');

    const availableH = flipToTop
      ? Math.max(260, Math.min(480, spaceAbove - 28))
      : Math.max(260, Math.min(480, spaceBelow - 28));

    setMaxContentHeight(availableH);
  }, []);

  // ── Calibrate Beak / Arrow Position (Sub-pixel exact tile alignment) ──
  const calibrateBeak = useCallback((targetTile: HTMLDivElement | null) => {
    if (targetTile) {
      activeTileRef.current = targetTile;
    }
    requestAnimationFrame(() => {
      const tile = activeTileRef.current;
      if (tile && dialogCardRef.current) {
        const tileRect = tile.getBoundingClientRect();
        const dialogRect = dialogCardRef.current.getBoundingClientRect();
        const tileCenterX = tileRect.left + tileRect.width / 2;
        const leftInDialog = tileCenterX - dialogRect.left;
        const clampedPx = Math.max(20, Math.min(dialogRect.width - 20, leftInDialog));
        setBeakLeftPx(clampedPx);
      }
    });
  }, []);

  // ── Open Tooltip Dialog with Beak Alignment (No page scroll) ──
  const openTooltip = (
    panel: TooltipPanelType,
    targetTileRef: React.RefObject<HTMLDivElement | null>,
    targetDateField?: 'in' | 'out'
  ) => {
    setActiveTooltipTab(panel);
    if (targetDateField) {
      setSelectingField(targetDateField);
    }

    if (targetTileRef.current) {
      activeTileRef.current = targetTileRef.current;
    }

    updateDisplayAwareness();
    setIsClosing(false);
    setTooltipOpen(true);

    calibrateBeak(targetTileRef.current);
  };

  const closeTooltipWithAnimation = () => {
    setIsClosing(true);
    setTimeout(() => {
      setTooltipOpen(false);
      setIsClosing(false);
    }, 180);
  };

  // Re-calibrate beak whenever open state, tab, or field changes
  useEffect(() => {
    if (tooltipOpen) {
      calibrateBeak(activeTileRef.current);
    }
  }, [tooltipOpen, activeTooltipTab, selectingField, calibrateBeak]);

  // Handle outside clicks: Keep bar operatable, only close when clicking outside both bar & dialog
  useEffect(() => {
    if (!tooltipOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // If clicking inside dialog, keep open
      if (dialogCardRef.current && dialogCardRef.current.contains(target)) {
        return;
      }
      // If clicking inside booking bar, keep open (tile handlers switch active options)
      if (barRootRef.current && barRootRef.current.contains(target)) {
        return;
      }
      // Clicked outside both bar and dialog: close cleanly
      closeTooltipWithAnimation();
    };

    const handleScrollOrResize = () => {
      if (!barRootRef.current) return;
      const barRect = barRootRef.current.getBoundingClientRect();
      if (barRect.bottom < 40 || barRect.top > window.innerHeight - 40) {
        setTooltipOpen(false);
        return;
      }
      updateDisplayAwareness();
      calibrateBeak(activeTileRef.current);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [tooltipOpen, updateDisplayAwareness, calibrateBeak]);

  // ── Adults & Rooms Logic ──
  const handleAdultsChange = (newAdults: number) => {
    if (newAdults < 1 || newAdults > 10) return;
    setAdults(newAdults);

    if (newAdults === 1) {
      setRooms(1);
    } else if (!userHasCustomizedRooms) {
      if (newAdults < 4) {
        setRooms(1);
      } else {
        setRooms(2);
      }
    } else {
      setRooms((prev) => Math.min(prev, newAdults));
    }
  };

  const handleRoomsChange = (delta: number) => {
    if (adults === 1) return;
    const newRooms = rooms + delta;
    if (newRooms >= 1 && newRooms <= adults) {
      setUserHasCustomizedRooms(true);
      setRooms(newRooms);
    }
  };

  // ── Stay Suggestions Handler ──
  const applyStaySuggestion = (nights: number) => {
    if (nights === 0) {
      setIsCustomMode(true);
      setSelectingField('in');
      calibrateBeak(checkInTileRef.current);
      return;
    }

    setIsCustomMode(false);
    const baseDate = checkIn ? parseYMD(checkIn) : new Date();
    const newCheckIn = toYMD(baseDate);
    const newCheckOut = toYMD(addDays(baseDate, nights));
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
    // Auto switch focus to Check-Out in the bar
    setSelectingField('out');
    calibrateBeak(checkOutTileRef.current);
  };

  // ── Date Picking State Machine with Bar Auto-Switching ──
  const handleDateClick = (dateStr: string) => {
    const todayStr = toYMD(new Date());
    if (dateStr < todayStr) return;

    if (activeTab === 'hall' || activeTooltipTab === 'hallCalendar') {
      setHallDate(dateStr);
      return;
    }

    if (selectingField === 'in') {
      setCheckIn(dateStr);
      setIsCustomMode(true);
      if (checkOut && dateStr >= checkOut) {
        const nextDay = toYMD(addDays(parseYMD(dateStr), 1));
        setCheckOut(nextDay);
      }
      // Auto-switch to Check-Out selection IN THE BAR
      setSelectingField('out');
      calibrateBeak(checkOutTileRef.current);
    } else {
      if (dateStr > checkIn) {
        setCheckOut(dateStr);
        setIsCustomMode(true);
      } else {
        setCheckIn(dateStr);
        const nextDay = toYMD(addDays(parseYMD(dateStr), 1));
        setCheckOut(nextDay);
        setIsCustomMode(true);
        setSelectingField('out');
        calibrateBeak(checkOutTileRef.current);
      }
    }
  };

  // Hall search submit
  const handleHallSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const el = document.getElementById('party-hall-enquiry');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      router.push(
        `/hotel#party-hall-enquiry?date=${hallDate}&type=${encodeURIComponent(
          hallEventType
        )}&capacity=${encodeURIComponent(hallCapacity)}`
      );
    }
  };

  // Month Days Generator
  const getMonthDays = (baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dayNumber: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({ dayNumber: d, dateStr: toYMD(prevDate), isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i);
      days.push({ dayNumber: i, dateStr: toYMD(currDate), isCurrentMonth: true });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      days.push({ dayNumber: i, dateStr: toYMD(nextDate), isCurrentMonth: false });
    }

    return days;
  };

  const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
  const todayStr = toYMD(new Date());

  // Header Details
  const getPanelHeader = () => {
    switch (activeTooltipTab) {
      case 'calendar':
        return {
          icon: <CalendarIcon className="w-4 h-4 text-[#670E10]" />,
          title: selectingField === 'in' ? 'Select Check-In Date' : 'Select Check-Out Date',
          subtitle:
            selectingField === 'in'
              ? 'Click your arrival date in the calendar'
              : `${formattedCheckIn.day} ${formattedCheckIn.monthYear} selected • Choose departure date`,
        };
      case 'guests':
        return {
          icon: <Users className="w-4 h-4 text-[#670E10]" />,
          title: 'Guests & Chambers',
          subtitle: 'Tailor adults, children, pets & room allocation',
        };
      case 'hallOccasion':
        return {
          icon: <PartyPopper className="w-4 h-4 text-[#670E10]" />,
          title: 'Select Event Occasion',
          subtitle: 'Choose celebration atmosphere & palace setup',
        };
      case 'hallCalendar':
        return {
          icon: <CalendarIcon className="w-4 h-4 text-[#670E10]" />,
          title: 'Celebration Date',
          subtitle: 'Select the royal gathering date',
        };
      case 'hallCapacity':
        return {
          icon: <Users className="w-4 h-4 text-[#670E10]" />,
          title: 'Hall Guest Capacity',
          subtitle: 'Choose banquet seating & guest size',
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4 text-[#670E10]" />,
          title: 'Select Details',
          subtitle: 'Rajmahal Palace Booking',
        };
    }
  };

  // ── Render Connected Date Range Calendar Content ──
  const renderCalendarContent = () => {
    const monthsToDisplay = isMobile ? [calendarMonth] : [calendarMonth, nextMonth];

    return (
      <div className="flex flex-col space-y-3.5">
        {/* Quick Stay Suggestions Pills */}
        {activeTab === 'rooms' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {STAY_SUGGESTIONS.map((sug) => {
              const isSelected =
                sug.nights === 0 ? isCustomMode : !isCustomMode && nightsCount === sug.nights;
              return (
                <button
                  key={sug.label}
                  type="button"
                  onClick={() => applyStaySuggestion(sug.nights)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-[#670E10] text-[#FFF8EB] border-[#D8AA67] shadow-xs'
                      : 'bg-[#FFF8EB] text-[#4A0A0C] border-[#DFD3C3] hover:border-[#D8AA67] hover:bg-[#F5F0E6]'
                  }`}
                >
                  <span>{sug.label}</span>
                  <span className="opacity-75 text-[10px] ml-1 hidden sm:inline">({sug.sublabel})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Dual Calendar Months Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {monthsToDisplay.map((mDate, mIdx) => {
            const days = getMonthDays(mDate);
            const monthName = mDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

            return (
              <div key={monthName} className="flex flex-col">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  {mIdx === 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                      }
                      className="p-1.5 rounded-full hover:bg-black/5 text-[#670E10] transition cursor-pointer"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-7" />
                  )}

                  <h4
                    className="text-base font-bold text-[#670E10]"
                    style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                  >
                    {monthName}
                  </h4>

                  {mIdx === monthsToDisplay.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                      }
                      className="p-1.5 rounded-full hover:bg-black/5 text-[#670E10] transition cursor-pointer"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-7" />
                  )}
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-semibold text-[#8F7245]">
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                {/* Days Grid with Continuous Ribbon Design */}
                <div className="grid grid-cols-7 gap-y-1 text-center">
                  {days.map((d, dIdx) => {
                    const isPast = d.dateStr < todayStr;
                    const isCheckInDay = activeTab === 'rooms' && d.dateStr === checkIn;
                    const isCheckOutDay = activeTab === 'rooms' && d.dateStr === checkOut;
                    const isHallDay =
                      (activeTab === 'hall' || activeTooltipTab === 'hallCalendar') &&
                      d.dateStr === hallDate;
                    const isInRange =
                      activeTab === 'rooms' &&
                      checkIn &&
                      checkOut &&
                      d.dateStr > checkIn &&
                      d.dateStr < checkOut;
                    const hasRange = Boolean(activeTab === 'rooms' && checkIn && checkOut && checkOut > checkIn);

                    return (
                      <div key={`${d.dateStr}-${dIdx}`} className="relative h-8 flex items-center justify-center">
                        {/* Continuous connected range ribbon background */}
                        {hasRange && isCheckInDay && (
                          <div className="absolute inset-y-0.5 right-0 w-1/2 bg-[#EBDDC7] pointer-events-none" />
                        )}
                        {hasRange && isCheckOutDay && (
                          <div className="absolute inset-y-0.5 left-0 w-1/2 bg-[#EBDDC7] pointer-events-none" />
                        )}
                        {hasRange && isInRange && (
                          <div className="absolute inset-y-0.5 inset-x-0 bg-[#EBDDC7] pointer-events-none" />
                        )}

                        {/* Interactive Day Cell Button */}
                        <button
                          type="button"
                          disabled={isPast}
                          onClick={() => handleDateClick(d.dateStr)}
                          className={`relative z-10 text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                            isPast
                              ? 'h-8 w-8 rounded-full text-[#C5B8A5] opacity-40 cursor-not-allowed'
                              : isCheckInDay || isCheckOutDay || isHallDay
                              ? 'h-8 w-8 rounded-full bg-[#670E10] text-[#FFF8EB] font-bold shadow-xs ring-2 ring-[#D8AA67] scale-105'
                              : isInRange
                              ? 'w-full h-8 text-[#4A0A0C] font-bold hover:bg-[#D8AA67]/40'
                              : !d.isCurrentMonth
                              ? 'h-8 w-8 rounded-full text-[#B0A290] hover:bg-black/5'
                              : 'h-8 w-8 rounded-full text-[#241F1A] hover:bg-[#FFF8EB] hover:text-[#670E10] hover:ring-1 hover:ring-[#D8AA67]'
                          }`}
                        >
                          {d.dayNumber}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Dates Summary & Confirm Dates Button (Opens Rooms/Guests Dialog) */}
        <div className="pt-3 border-t border-[#DFD3C3] flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-[#241F1A]">
            <span className="font-semibold text-[#8F7245]">Selected Period:</span>
            {activeTab === 'rooms' ? (
              <span className="font-bold text-[#670E10]">
                {formattedCheckIn.day} {formattedCheckIn.monthYear} &rarr;{' '}
                {checkOut ? `${formattedCheckOut.day} ${formattedCheckOut.monthYear}` : 'Select Departure'}{' '}
                {checkOut && `(${nightsCount} ${nightsCount === 1 ? 'Night' : 'Nights'})`}
              </span>
            ) : (
              <span className="font-bold text-[#670E10]">
                {formattedHallDate.day} {formattedHallDate.monthYear} ({formattedHallDate.weekday})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              // Confirm dates automatically opens the guests / hall capacity dialog
              if (activeTab === 'rooms') {
                openTooltip('guests', guestsTileRef);
              } else {
                openTooltip('hallCapacity', hallCapacityTileRef);
              }
            }}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#670E10] to-[#801417] text-[#FFF8EB] text-xs font-bold tracking-wide shadow hover:shadow-md transition cursor-pointer flex items-center space-x-1.5"
          >
            <span>Confirm Dates &bull; Select {activeTab === 'rooms' ? 'Guests' : 'Capacity'} &rarr;</span>
          </button>
        </div>
      </div>
    );
  };

  // ── Render Guests Stepper Content ──
  const renderGuestsStepperContent = () => {
    const isSoloGuest = adults === 1;

    return (
      <div className="flex flex-col space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Adults Stepper */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#DFD3C3] flex items-center justify-between shadow-2xs">
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-[#241F1A]">Adults</span>
              <span className="text-[11px] text-[#7A6F62]">Ages 13 and above</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={adults <= 1}
                onClick={() => handleAdultsChange(adults - 1)}
                className="w-8 h-8 rounded-full border border-[#D8AA67] flex items-center justify-center text-[#670E10] hover:bg-[#FFF8EB] disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Decrease adults"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-sm text-[#241F1A]">{adults}</span>
              <button
                type="button"
                disabled={adults >= 10}
                onClick={() => handleAdultsChange(adults + 1)}
                className="w-8 h-8 rounded-full border border-[#D8AA67] flex items-center justify-center text-[#670E10] hover:bg-[#FFF8EB] disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Increase adults"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Children Stepper */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#DFD3C3] flex items-center justify-between shadow-2xs">
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-[#241F1A]">Children</span>
              <span className="text-[11px] text-[#7A6F62]">Ages 0 to 12</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={children <= 0}
                onClick={() => setChildren(Math.max(0, children - 1))}
                className="w-8 h-8 rounded-full border border-[#D8AA67] flex items-center justify-center text-[#670E10] hover:bg-[#FFF8EB] disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Decrease children"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-sm text-[#241F1A]">{children}</span>
              <button
                type="button"
                disabled={children >= 6}
                onClick={() => setChildren(Math.min(6, children + 1))}
                className="w-8 h-8 rounded-full border border-[#D8AA67] flex items-center justify-center text-[#670E10] hover:bg-[#FFF8EB] disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Increase children"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3. Pets Stepper */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#DFD3C3] flex items-center justify-between shadow-2xs">
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-[#241F1A] flex items-center gap-1.5">
                <span>Pets</span>
                <Dog className="w-3.5 h-3.5 text-[#B08D57]" />
              </span>
              <span className="text-[11px] text-[#7A6F62]">Royal pet-friendly stay</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={pets <= 0}
                onClick={() => setPets(Math.max(0, pets - 1))}
                className="w-8 h-8 rounded-full border border-[#D8AA67] flex items-center justify-center text-[#670E10] hover:bg-[#FFF8EB] disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Decrease pets"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-sm text-[#241F1A]">{pets}</span>
              <button
                type="button"
                disabled={pets >= 3}
                onClick={() => setPets(Math.min(3, pets + 1))}
                className="w-8 h-8 rounded-full border border-[#D8AA67] flex items-center justify-center text-[#670E10] hover:bg-[#FFF8EB] disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Increase pets"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4. Chambers (Rooms) Stepper */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-2xs transition-colors ${
              isSoloGuest ? 'bg-[#F5EFE6] border-[#D8AA67]/60' : 'bg-white border-[#DFD3C3]'
            }`}
          >
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-[#241F1A] flex items-center gap-1.5">
                <span>Chambers (Rooms)</span>
                {isSoloGuest && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#D8AA67]/20 text-[#670E10]">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </span>
              <span className="text-[11px] text-[#7A6F62]">
                {isSoloGuest
                  ? '1 guest = 1 chamber (locked)'
                  : adults < 4
                  ? '1 chamber default (customizable)'
                  : '2 chambers recommended'}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={isSoloGuest || rooms <= 1}
                onClick={() => handleRoomsChange(-1)}
                className="w-8 h-8 rounded-full border border-[#D8AA67] flex items-center justify-center text-[#670E10] hover:bg-[#FFF8EB] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Decrease chambers"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-sm text-[#241F1A]">{rooms}</span>
              <button
                type="button"
                disabled={isSoloGuest || rooms >= adults}
                onClick={() => handleRoomsChange(1)}
                className="w-8 h-8 rounded-full border border-[#D8AA67] flex items-center justify-center text-[#670E10] hover:bg-[#FFF8EB] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                aria-label="Increase chambers"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#DFD3C3] flex items-center justify-between gap-3">
          <span className="text-xs text-[#7A6F62] italic">
            * 1 chamber is reserved by default for up to 3 guests; 2 chambers auto-suggested for 4+ guests.
          </span>
          <button
            type="button"
            onClick={closeTooltipWithAnimation}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#670E10] to-[#801417] text-[#FFF8EB] text-xs font-bold tracking-wide shadow hover:shadow-md transition cursor-pointer"
          >
            Apply Guests &amp; Chambers
          </button>
        </div>
      </div>
    );
  };

  // ── Render Event Occasion Selection ──
  const renderOccasionContent = () => {
    return (
      <div className="flex flex-col space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8F7245]">
            Select Royal Event Occasion
          </span>
          <span className="text-xs font-semibold text-[#670E10] truncate max-w-[240px]">
            Selected: {hallEventType}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {EVENT_OCCASION_OPTIONS.map((opt) => {
            const isSelected = hallEventType === opt.title;
            return (
              <div
                key={opt.id}
                onClick={() => {
                  setHallEventType(opt.title);
                }}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#FFF8EB] border-[#670E10] shadow-md ring-2 ring-[#D8AA67]'
                    : 'bg-white border-[#DFD3C3] hover:border-[#D8AA67] hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-lg">{opt.icon}</span>
                    <span
                      className="text-base font-bold text-[#670E10] leading-tight truncate"
                      style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                    >
                      {opt.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EFE8DD] text-[#7A6F62] shrink-0 ml-1">
                    {opt.badge}
                  </span>
                </div>
                <p className="text-xs text-[#7A6F62] leading-snug mb-2 pl-6">{opt.subtext}</p>
                <div className="flex items-center justify-end">
                  {isSelected ? (
                    <span className="flex items-center text-xs font-bold text-[#670E10]">
                      <Check className="w-3.5 h-3.5 mr-1 text-[#670E10]" />
                      Selected
                    </span>
                  ) : (
                    <span className="text-xs text-[#8F7245] font-semibold">Select &rarr;</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-[#DFD3C3] flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              // Automatically proceed to Event Date
              openTooltip('hallCalendar', hallDateTileRef);
            }}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-[#670E10] to-[#801417] text-[#FFF8EB] text-xs font-bold tracking-wide shadow hover:shadow-md transition cursor-pointer"
          >
            Confirm Occasion &bull; Pick Date &rarr;
          </button>
        </div>
      </div>
    );
  };

  // ── Render Party Hall Capacity Chips ──
  const renderHallCapacityContent = () => {
    return (
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8F7245]">
            Select Guest Capacity for Celebration Hall
          </span>
          <span className="text-xs font-semibold text-[#670E10]">Selected: {hallCapacity}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {HALL_CAPACITY_OPTIONS.map((opt) => {
            const isSelected = hallCapacity.startsWith(opt.title.split(' ')[0]);
            return (
              <div
                key={opt.id}
                onClick={() => {
                  setHallCapacity(`${opt.title} (${opt.badge})`);
                }}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#FFF8EB] border-[#670E10] shadow-md ring-2 ring-[#D8AA67]'
                    : 'bg-white border-[#DFD3C3] hover:border-[#D8AA67] hover:bg-[#FAF7F2]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-base font-bold text-[#670E10]"
                    style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                  >
                    {opt.title}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EFE8DD] text-[#7A6F62]">
                    {opt.badge}
                  </span>
                </div>
                <span className="text-xs text-[#7A6F62] leading-tight mb-2">{opt.subtext}</span>
                <div className="flex items-center justify-end">
                  {isSelected ? (
                    <span className="flex items-center text-xs font-bold text-[#670E10]">
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Selected
                    </span>
                  ) : (
                    <span className="text-xs text-[#8F7245] font-semibold">Select &rarr;</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-[#DFD3C3] flex items-center justify-end">
          <button
            type="button"
            onClick={closeTooltipWithAnimation}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-[#670E10] to-[#801417] text-[#FFF8EB] text-xs font-bold tracking-wide shadow hover:shadow-md transition cursor-pointer"
          >
            Apply Capacity
          </button>
        </div>
      </div>
    );
  };

  const isRightAlignedPanel = activeTooltipTab === 'guests' || activeTooltipTab === 'hallCapacity';
  const panelHeader = getPanelHeader();

  return (
    <div ref={barRootRef} className="w-full max-w-[1080px] mx-auto relative pt-2 sm:pt-4">
      {/* ── 1. Popping-Out Tabs with Inset Fillet Curves ── */}
      <div className="relative z-20 flex flex-col sm:flex-row sm:items-end justify-between px-0">
        <div
          className="relative inline-flex items-center px-1.5 sm:px-2 pt-1.5 sm:pt-2 pb-1 rounded-t-[24px] sm:rounded-t-[28px] border-t-2 border-x-2 transition-all mx-auto sm:mx-0 sm:ml-16 md:ml-20 lg:ml-24 shadow-2xs"
          style={{
            backgroundColor: '#FAF7F2',
            borderColor: '#D8AA67',
            marginBottom: '-2px',
          }}
        >
          {/* Left Inverted Concave Fillet Curve */}
          <div className="absolute -left-[14px] sm:-left-[20px] bottom-0 w-[14px] sm:w-[20px] h-[14px] sm:h-[20px] pointer-events-none">
            <svg viewBox="0 0 20 20" preserveAspectRatio="none" className="w-full h-full block">
              <path d="M 20 0 C 20 11.045 11.045 20 0 20 L 0 23 L 23 23 L 23 0 Z" fill="#FAF7F2" />
              <path
                d="M 20 -1 L 20 0 C 20 11.045 11.045 20 0 20 L -2 20"
                fill="none"
                stroke="#D8AA67"
                strokeWidth="2"
                strokeLinecap="butt"
              />
            </svg>
          </div>

          {/* Right Inverted Concave Fillet Curve */}
          <div className="absolute -right-[14px] sm:-right-[20px] bottom-0 w-[14px] sm:w-[20px] h-[14px] sm:h-[20px] pointer-events-none">
            <svg viewBox="0 0 20 20" preserveAspectRatio="none" className="w-full h-full block">
              <path d="M 0 0 C 0 11.045 8.955 20 20 20 L 20 23 L -3 23 L -3 0 Z" fill="#FAF7F2" />
              <path
                d="M 0 -1 L 0 0 C 0 11.045 8.955 20 20 20 L 22 20"
                fill="none"
                stroke="#D8AA67"
                strokeWidth="2"
                strokeLinecap="butt"
              />
            </svg>
          </div>

          <div
            className="absolute -bottom-[2px] -left-[1px] -right-[1px] h-[4px] pointer-events-none"
            style={{ backgroundColor: '#FAF7F2' }}
          />

          {/* Segmented Control Capsule */}
          <div className="relative z-10 inline-flex">
            <button
              type="button"
              onClick={() => {
                setActiveTab('rooms');
                if (tooltipOpen) closeTooltipWithAnimation();
              }}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-full sm:rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rooms'
                  ? 'bg-gradient-to-r from-[#670E10] via-[#7B1316] to-[#550B0D] text-[#FFF8EB] scale-[1.01]'
                  : 'text-[#6B5E4F] hover:text-[#241F1A] hover:bg-black/5'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D8AA67] shrink-0" />
              <span style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)", fontSize: '15px' }}>
                <span className="hidden min-[380px]:inline">Rooms &amp; Suites</span>
                <span className="min-[380px]:hidden">Rooms</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('hall');
                if (tooltipOpen) closeTooltipWithAnimation();
              }}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 lg:px-5 py-1.5 sm:py-2 rounded-full sm:rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'hall'
                  ? 'bg-gradient-to-r from-[#670E10] via-[#7B1316] to-[#550B0D] text-[#FFF8EB] scale-[1.01]'
                  : 'text-[#6B5E4F] hover:text-[#241F1A] hover:bg-black/5'
              }`}
            >
              <PartyPopper className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D8AA67] shrink-0" />
              <span style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)", fontSize: '15px' }}>
                <span className="hidden lg:inline">Party Hall (25–50 Pax)</span>
                <span className="lg:hidden">Party Hall</span>
              </span>
            </button>
          </div>
        </div>

        <div className="hidden md:inline-flex items-center space-x-2 text-xs font-semibold text-[#670E10] bg-[#FFF8EB] px-4 py-2 rounded-full border border-[#D8AA67]/80 shadow-md self-center mb-2 mr-4 sm:mr-8">
          <Sparkles className="w-3.5 h-3.5 text-[#B08D57]" />
          <span>Direct Palace Privilege &bull; Best Tariff Guarantee</span>
        </div>
      </div>

      {/* ── 2. Master Booking Details Card ── */}
      <div
        className="relative z-10 w-full rounded-[44px] sm:rounded-full pt-2 sm:pt-2 pb-2 sm:pb-2 px-2 sm:px-2 transition-all duration-300 border-2"
        style={{
          backgroundColor: '#FAF7F2',
          borderColor: '#D8AA67',
        }}
      >
        {activeTab === 'rooms' ? (
          <search>
            <form
              action="/hotel#hotel-chambers"
              method="GET"
              aria-label="Search palace chambers"
              onSubmit={(e) => {
                e.preventDefault();
                closeTooltipWithAnimation();
                const params = new URLSearchParams();
                if (checkIn) params.set('checkIn', checkIn);
                if (checkOut) params.set('checkOut', checkOut);
                if (guestsSummary) params.set('guests', guestsSummary);
                params.set('adults', String(adults));
                params.set('children', String(children));
                params.set('pets', String(pets));
                params.set('rooms', String(rooms));
                params.set('search', '1');
                router.push(`/hotel?${params.toString()}#hotel-chambers`);
                const chambersEl = document.getElementById('hotel-chambers');
                if (chambersEl) {
                  requestAnimationFrame(() => {
                    chambersEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }
              }}
              className="grid grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1.25fr_auto] gap-[5.2px] sm:gap-3 items-center"
            >
              <input type="hidden" name="checkIn" value={checkIn} />
              <input type="hidden" name="checkOut" value={checkOut} />
              <input type="hidden" name="guests" value={guestsSummary} />
              <input type="hidden" name="adults" value={adults} />
              <input type="hidden" name="children" value={children} />
              <input type="hidden" name="pets" value={pets} />
              <input type="hidden" name="rooms" value={rooms} />
              <input type="hidden" name="search" value="1" />

            {/* 1. Check In Tile (Col-span 1 on mobile: Check In & Check Out in a row) */}
            <div
              ref={checkInTileRef}
              onClick={() => {
                if (tooltipOpen && activeTooltipTab === 'calendar' && selectingField === 'in') {
                  closeTooltipWithAnimation();
                } else {
                  openTooltip('calendar', checkInTileRef, 'in');
                }
              }}
              className={`col-span-1 relative flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-tl-[36px] rounded-tr-[18px] rounded-bl-[18px] rounded-br-[18px] sm:rounded-full border bg-white transition-all cursor-pointer group h-[54px] min-[400px]:h-[60px] sm:h-[64px] ${
                tooltipOpen && activeTooltipTab === 'calendar' && selectingField === 'in'
                  ? 'border-[#670E10] ring-1 ring-[#D8AA67] bg-[#FFF8EB]'
                  : 'border-[#DFD3C3] hover:border-[#B08D57]'
              }`}
            >
              <div className="flex flex-col text-left flex-1 min-w-0 mr-1 sm:mr-2">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-[#8F7245] leading-none mb-1">
                  Check In
                </span>
                <div className="flex items-baseline space-x-1 sm:space-x-1.5">
                  <span
                    className="text-sm sm:text-base lg:text-lg font-bold text-[#241F1A] leading-none truncate"
                    style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                  >
                    {formattedCheckIn.day} {formattedCheckIn.monthYear}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-[#7A6F62] leading-none hidden min-[400px]:inline">
                    {formattedCheckIn.weekday}
                  </span>
                </div>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[40px] sm:rounded-full bg-[#FAF7F2] flex items-center justify-center shrink-0 group-hover:border-[#B08D57] group-hover:bg-[#FFF8EB] transition-colors">
                <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#670E10] group-hover:text-[#B08D57] transition-colors" />
              </div>
            </div>

            {/* 2. Nights Separator Pill (Desktop only) */}
            <div
              onClick={() => {
                if (tooltipOpen && activeTooltipTab === 'calendar') {
                  closeTooltipWithAnimation();
                } else {
                  openTooltip('calendar', checkOutTileRef, 'out');
                }
              }}
              className="hidden lg:flex flex-col items-center justify-center px-0.5 cursor-pointer group"
            >
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-[32px] bg-[#ffffff] text-[#670E10] whitespace-nowrap flex items-center gap-1 group-hover:border-[#B08D57] group-hover:bg-[#FFF8EB] transition">
                <span>🌙</span>
                <span>
                  {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}
                </span>
              </span>
            </div>

            {/* 3. Check Out Tile (Col-span 1 on mobile: Check In & Check Out in a row) */}
            <div
              ref={checkOutTileRef}
              onClick={() => {
                if (tooltipOpen && activeTooltipTab === 'calendar' && selectingField === 'out') {
                  closeTooltipWithAnimation();
                } else {
                  openTooltip('calendar', checkOutTileRef, 'out');
                }
              }}
              className={`col-span-1 relative flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-tl-[18px] rounded-tr-[36px] rounded-bl-[18px] rounded-br-[18px] sm:rounded-full border bg-white transition-all cursor-pointer group h-[54px] min-[400px]:h-[60px] sm:h-[64px] ${
                tooltipOpen && activeTooltipTab === 'calendar' && selectingField === 'out'
                  ? 'border-[#670E10] ring-1 ring-[#D8AA67] bg-[#FFF8EB]'
                  : 'border-[#DFD3C3] hover:border-[#B08D57]'
              }`}
            >
              <div className="flex flex-col text-left flex-1 min-w-0 mr-1 sm:mr-2">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-[#8F7245] leading-none mb-1">
                  Check Out
                </span>
                <div className="flex items-baseline space-x-1 sm:space-x-1.5">
                  <span
                    className="text-sm sm:text-base lg:text-lg font-bold text-[#241F1A] leading-none truncate"
                    style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                  >
                    {formattedCheckOut.day} {formattedCheckOut.monthYear}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-[#7A6F62] leading-none hidden min-[400px]:inline">
                    {formattedCheckOut.weekday}
                  </span>
                </div>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[40px] sm:rounded-full bg-[#FAF7F2] flex items-center justify-center shrink-0 group-hover:border-[#B08D57] group-hover:bg-[#FFF8EB] transition-colors">
                <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#670E10] group-hover:text-[#B08D57] transition-colors" />
              </div>
            </div>

            {/* 4. Guests & Chambers Tile (Col-span 2 on mobile: full width row) */}
            <div
              ref={guestsTileRef}
              onClick={() => {
                if (tooltipOpen && activeTooltipTab === 'guests') {
                  closeTooltipWithAnimation();
                } else {
                  openTooltip('guests', guestsTileRef);
                }
              }}
              className={`col-span-2 lg:col-span-1 relative flex items-center justify-between px-4 py-2.5 sm:py-3 rounded-[18px] sm:rounded-full border bg-white transition-all cursor-pointer group h-[54px] min-[400px]:h-[60px] sm:h-[64px] ${
                tooltipOpen && activeTooltipTab === 'guests'
                  ? 'border-[#670E10] ring-2 ring-[#D8AA67] bg-[#FFF8EB]'
                  : 'border-[#DFD3C3] hover:border-[#B08D57]'
              }`}
            >
              <div className="flex flex-col text-left flex-1 min-w-0 mr-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8F7245] leading-none mb-1">
                  Guests &amp; Chambers
                </span>
                <span
                  className="text-sm sm:text-base font-bold text-[#241F1A] leading-none truncate"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  {guestsSummary}
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#FAF7F2] flex items-center justify-center shrink-0 group-hover:border-[#B08D57] group-hover:bg-[#FFF8EB] transition-colors">
                <Users className="w-4 h-4 text-[#670E10] group-hover:text-[#B08D57] transition-colors" />
              </div>
            </div>

            {/* 5. Search Chambers Button (Col-span 2 on mobile: full width row) */}
            <div className="col-span-2 lg:col-span-1">
              <button
                type="submit"
                className="w-full h-[52px] min-[400px]:h-[58px] sm:h-[64px] px-8 rounded-tl-[18px] rounded-tr-[18px] rounded-bl-[36px] rounded-br-[36px] sm:rounded-full font-bold tracking-wide transition-all duration-300 active:scale-[0.98] flex items-center justify-center space-x-2.5 cursor-pointer text-[#FFF8EB] border border-[#D8AA67]/80 group"
                style={{
                  background: 'linear-gradient(135deg, #670E10 0%, #7E1418 50%, #52090B 100%)',
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  fontSize: '18px',
                }}
              >
                <span className="whitespace-nowrap font-bold">Search Chambers</span>
                <ArrowRight className="w-4 h-4 text-[#D8AA67] group-hover:translate-x-1.5 transition-transform stroke-[2.5]" />
              </button>
            </div>
          </form>
          </search>
        ) : (
          /* ── Content Area: Party Hall Form ── */
          <form
            onSubmit={handleHallSearch}
            className="grid grid-cols-2 lg:grid-cols-[1.1fr_1fr_1.2fr_auto] gap-[5.2px] sm:gap-3 items-center"
          >
            {/* 1. Event Occasion (Col-span 1 on mobile: Occasion & Date in a row) */}
            <div
              ref={hallOccasionTileRef}
              onClick={() => {
                if (tooltipOpen && activeTooltipTab === 'hallOccasion') {
                  closeTooltipWithAnimation();
                } else {
                  openTooltip('hallOccasion', hallOccasionTileRef);
                }
              }}
              className={`col-span-1 relative flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-tl-[36px] rounded-tr-[18px] rounded-bl-[18px] rounded-br-[18px] sm:rounded-full border bg-white transition-all cursor-pointer group h-[54px] min-[400px]:h-[60px] sm:h-[64px] ${
                tooltipOpen && activeTooltipTab === 'hallOccasion'
                  ? 'border-[#670E10] ring-2 ring-[#D8AA67] bg-[#FFF8EB]'
                  : 'border-[#DFD3C3] hover:border-[#B08D57]'
              }`}
            >
              <div className="flex flex-col text-left flex-1 min-w-0 mr-1 sm:mr-2">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-[#8F7245] leading-none mb-1">
                  Occasion
                </span>
                <span
                  className="text-xs sm:text-base font-bold text-[#241F1A] leading-none truncate"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  {hallEventType}
                </span>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[40px] sm:rounded-full bg-[#FAF7F2] flex items-center justify-center shrink-0 group-hover:border-[#B08D57] group-hover:bg-[#FFF8EB] transition-colors">
                <PartyPopper className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#670E10] group-hover:text-[#B08D57] transition-colors" />
              </div>
            </div>

            {/* 2. Event Date (Col-span 1 on mobile: Occasion & Date in a row) */}
            <div
              ref={hallDateTileRef}
              onClick={() => {
                if (tooltipOpen && activeTooltipTab === 'hallCalendar') {
                  closeTooltipWithAnimation();
                } else {
                  openTooltip('hallCalendar', hallDateTileRef);
                }
              }}
              className={`col-span-1 relative flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-tl-[18px] rounded-tr-[36px] rounded-bl-[18px] rounded-br-[18px] sm:rounded-full border bg-white transition-all cursor-pointer group h-[54px] min-[400px]:h-[60px] sm:h-[64px] ${
                tooltipOpen && activeTooltipTab === 'hallCalendar'
                  ? 'border-[#670E10] ring-2 ring-[#D8AA67] bg-[#FFF8EB]'
                  : 'border-[#DFD3C3] hover:border-[#B08D57]'
              }`}
            >
              <div className="flex flex-col text-left flex-1 min-w-0 mr-1 sm:mr-2">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-[#8F7245] leading-none mb-1">
                  Event Date
                </span>
                <div className="flex items-baseline space-x-1 sm:space-x-1.5">
                  <span
                    className="text-xs sm:text-base lg:text-lg font-bold text-[#241F1A] leading-none truncate"
                    style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                  >
                    {formattedHallDate.day} {formattedHallDate.monthYear}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-[#7A6F62] leading-none hidden min-[400px]:inline">
                    {formattedHallDate.weekday}
                  </span>
                </div>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FAF7F2] flex items-center justify-center shrink-0 group-hover:border-[#B08D57] group-hover:bg-[#FFF8EB] transition-colors">
                <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#670E10] group-hover:text-[#B08D57] transition-colors" />
              </div>
            </div>

            {/* 3. Hall Capacity (Col-span 2 on mobile: full width row) */}
            <div
              ref={hallCapacityTileRef}
              onClick={() => {
                if (tooltipOpen && activeTooltipTab === 'hallCapacity') {
                  closeTooltipWithAnimation();
                } else {
                  openTooltip('hallCapacity', hallCapacityTileRef);
                }
              }}
              className={`col-span-2 lg:col-span-1 relative flex items-center justify-between px-4 py-2.5 sm:py-3 rounded-[18px] sm:rounded-full border bg-white transition-all cursor-pointer group h-[54px] min-[400px]:h-[60px] sm:h-[64px] ${
                tooltipOpen && activeTooltipTab === 'hallCapacity'
                  ? 'border-[#670E10] ring-2 ring-[#D8AA67] bg-[#FFF8EB]'
                  : 'border-[#DFD3C3] hover:border-[#B08D57]'
              }`}
            >
              <div className="flex flex-col text-left flex-1 min-w-0 mr-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8F7245] leading-none mb-1">
                  Hall Capacity
                </span>
                <span
                  className="text-sm sm:text-base font-bold text-[#241F1A] leading-none truncate"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  {hallCapacity}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#FAF7F2] flex items-center justify-center shrink-0 group-hover:border-[#B08D57] group-hover:bg-[#FFF8EB] transition-colors">
                <Users className="w-4 h-4 text-[#670E10] group-hover:text-[#B08D57] transition-colors" />
              </div>
            </div>

            {/* 4. Check Hall Button (Col-span 2 on mobile: full width row) */}
            <div className="col-span-2 lg:col-span-1">
              <button
                type="submit"
                className="w-full h-[52px] min-[400px]:h-[58px] sm:h-[64px] px-8 rounded-tl-[18px] rounded-tr-[18px] rounded-bl-[36px] rounded-br-[36px] sm:rounded-full font-bold tracking-wide transition-all duration-300 active:scale-[0.98] flex items-center justify-center space-x-2.5 cursor-pointer text-[#FFF8EB] border border-[#D8AA67]/80 group"
                style={{
                  background: 'linear-gradient(135deg, #670E10 0%, #7E1418 50%, #52090B 100%)',
                  fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)",
                  fontSize: '18px',
                }}
              >
                <span className="whitespace-nowrap font-bold">Check Hall</span>
                <ArrowRight className="w-4 h-4 text-[#D8AA67] group-hover:translate-x-1.5 transition-transform stroke-[2.5]" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── 3. Desktop Floating Tooltip Dialog (Anchored directly under the bar with exact beak alignment) ── */}
      {!isMobile && tooltipOpen && (
        <div
          ref={dialogCardRef}
          className={`absolute z-50 ${
            placement === 'top'
              ? 'bottom-[calc(100%+14px)] origin-bottom'
              : 'top-[calc(100%+14px)] origin-top'
          } ${
            isRightAlignedPanel
              ? 'right-0 sm:right-4 w-full max-w-[540px]'
              : activeTooltipTab === 'hallOccasion'
              ? 'left-0 sm:left-4 w-full max-w-[620px]'
              : 'left-0 sm:left-4 w-full max-w-[720px]'
          } rounded-[24px] border-2 border-[#D8AA67] bg-[#FAF7F2] shadow-[0_24px_70px_-10px_rgba(35,10,14,0.38),0_6px_20px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden ${
            placement === 'top'
              ? isClosing
                ? 'animate-tooltip-collapse-top'
                : 'animate-tooltip-expand-top'
              : isClosing
              ? 'animate-tooltip-collapse'
              : 'animate-tooltip-expand'
          }`}
        >
          {/* Tooltip Pointing Arrow / Beak pointing with pixel precision */}
          {placement === 'bottom' ? (
            <div
              className="absolute -top-[9px] w-4 h-4 rotate-45 border-t-2 border-l-2 border-[#D8AA67] bg-[#FAF7F2] -translate-x-1/2 pointer-events-none z-20 shadow-xs transition-all duration-200"
              style={{ left: `${beakLeftPx}px` }}
            />
          ) : (
            <div
              className="absolute -bottom-[9px] w-4 h-4 rotate-45 border-b-2 border-r-2 border-[#D8AA67] bg-[#FAF7F2] -translate-x-1/2 pointer-events-none z-20 shadow-xs transition-all duration-200"
              style={{ left: `${beakLeftPx}px` }}
            />
          )}

          {/* Tooltip Dialog Clean Header */}
          <div className="px-5 py-3 border-b border-[#DFD3C3] flex items-center justify-between bg-[#F5F0E6]/90">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] border border-[#D8AA67]/60 flex items-center justify-center shrink-0">
                {panelHeader.icon}
              </div>
              <div className="flex flex-col text-left">
                <span
                  className="text-base font-bold text-[#670E10] leading-none"
                  style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                >
                  {panelHeader.title}
                </span>
                <span className="text-[11px] text-[#7A6F62] mt-0.5">
                  {panelHeader.subtitle}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={closeTooltipWithAnimation}
              className="p-1.5 rounded-full bg-black/5 hover:bg-black/10 text-[#670E10] transition cursor-pointer"
              aria-label="Close tooltip dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tooltip Dialog Scrollable Content */}
          <div
            className="p-5 overflow-y-auto"
            style={{ maxHeight: `${maxContentHeight}px` }}
          >
            {(activeTooltipTab === 'calendar' || activeTooltipTab === 'hallCalendar') &&
              renderCalendarContent()}
            {activeTooltipTab === 'guests' && renderGuestsStepperContent()}
            {activeTooltipTab === 'hallOccasion' && renderOccasionContent()}
            {activeTooltipTab === 'hallCapacity' && renderHallCapacityContent()}
          </div>
        </div>
      )}

      {/* ── 4. Mobile Bottom Sheet Dialog / Drawer ── */}
      {isMobile &&
        tooltipOpen &&
        mounted &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) closeTooltipWithAnimation();
            }}
            className={`fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-end justify-center p-0 ${
              isClosing ? 'animate-fade-out-backdrop' : 'animate-fade-in-backdrop'
            }`}
          >
            <div
              className={`w-full max-h-[88vh] rounded-t-[28px] border-t-2 border-x-2 border-[#D8AA67] bg-[#FAF7F2] flex flex-col overflow-hidden ${
                isClosing ? 'animate-slide-down-modal' : 'animate-slide-up-modal'
              }`}
            >
              <div className="w-12 h-1 bg-[#D8AA67]/50 rounded-full mx-auto mt-2.5 mb-1" />

              <div className="px-5 py-3 border-b border-[#DFD3C3] flex items-center justify-between bg-[#F5F0E6]/90">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] border border-[#D8AA67]/60 flex items-center justify-center shrink-0">
                    {panelHeader.icon}
                  </div>
                  <div className="flex flex-col text-left">
                    <span
                      className="text-base font-bold text-[#670E10] leading-none"
                      style={{ fontFamily: "var(--font-display, 'Cormorant Garamond', Georgia, serif)" }}
                    >
                      {panelHeader.title}
                    </span>
                    <span className="text-[11px] text-[#7A6F62] mt-0.5 truncate max-w-[240px]">
                      {panelHeader.subtitle}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeTooltipWithAnimation}
                  className="p-2 rounded-full bg-black/5 text-[#670E10]"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto max-h-[68vh]">
                {(activeTooltipTab === 'calendar' || activeTooltipTab === 'hallCalendar') &&
                  renderCalendarContent()}
                {activeTooltipTab === 'guests' && renderGuestsStepperContent()}
                {activeTooltipTab === 'hallOccasion' && renderOccasionContent()}
                {activeTooltipTab === 'hallCapacity' && renderHallCapacityContent()}
              </div>

              <div className="p-3.5 border-t border-[#DFD3C3] bg-[#F5F0E6] flex items-center justify-between">
                <button
                  type="button"
                  onClick={closeTooltipWithAnimation}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#670E10] to-[#801417] text-[#FFF8EB] text-sm font-bold tracking-wide shadow-md transition text-center cursor-pointer"
                >
                  Confirm &bull; Continue
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
