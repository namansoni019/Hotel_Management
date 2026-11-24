'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface PalaceDatePickerProps {
  value: string; // ISO format: "YYYY-MM-DD"
  onChange: (val: string) => void;
  minDate?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function PalaceDatePicker({
  value,
  onChange,
  minDate,
  label,
  required,
  placeholder = 'Select date',
  className = '',
}: PalaceDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to today
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const [viewYear, setViewYear] = useState<number>(validDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(validDate.getMonth());

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Format date helper: returns "YYYY-MM-DD"
  const formatDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  // Display label for trigger
  const formatDisplay = (val: string) => {
    if (!val) return placeholder;
    const d = new Date(val + 'T00:00:00');
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSelectDay = (day: number) => {
    const dateStr = formatDateStr(viewYear, viewMonth, day);
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const now = new Date();
    const str = formatDateStr(now.getFullYear(), now.getMonth(), now.getDate());
    onChange(str);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setIsOpen(false);
  };

  const handleSelectTomorrow = () => {
    const tom = new Date(Date.now() + 86400000);
    const str = formatDateStr(tom.getFullYear(), tom.getMonth(), tom.getDate());
    onChange(str);
    setViewYear(tom.getFullYear());
    setViewMonth(tom.getMonth());
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
          {label} {required && '*'}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-3.5 rounded-xl border border-[#E8DFCE] text-xs sm:text-sm bg-[#F5ECDC] hover:bg-[#EFE2CC] focus:bg-[#EFE2CC] font-semibold text-[#4F0809] flex items-center justify-between text-left focus:border-[#4F0809] focus:outline-none transition cursor-pointer shadow-2xs group"
      >
        <span className={value ? 'text-[#4F0809]' : 'text-[#856B4D]/60'}>
          {formatDisplay(value)}
        </span>
        <div className="w-7 h-7 rounded-lg bg-[#EFE2CC] group-hover:bg-[#E8DFCE] flex items-center justify-center transition">
          <CalendarIcon className="w-3.5 h-3.5 text-[#8F6628]" />
        </div>
      </button>

      {/* Royal Themed Minimal Popover Calendar */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 w-72 bg-[#FDF8EE] border border-[#D8AA67]/60 rounded-2xl shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Month / Year */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#E8DFCE]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] flex items-center justify-center transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span
                className="text-base font-bold text-[#4F0809] tracking-wide block leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <span className="text-[9px] uppercase tracking-widest font-bold text-[#8F6628]">
                Palace Calendar
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-lg bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] flex items-center justify-center transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="text-[10px] font-bold text-[#856B4D] uppercase py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Previous month padding days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayIndex + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="w-8 h-8 flex items-center justify-center text-[11px] text-[#856B4D]/30 font-medium select-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDateStr(viewYear, viewMonth, day);
              const isSelected = value === dateStr;
              const isToday = dateStr === todayStr;
              const isDisabled = minDate && dateStr < minDate;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={!!isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={`w-8 h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition cursor-pointer ${
                    isDisabled
                      ? 'text-[#856B4D]/30 cursor-not-allowed'
                      : isSelected
                      ? 'bg-[#4F0809] text-[#FFF8EB] shadow-xs font-bold ring-1 ring-[#D8AA67]'
                      : isToday
                      ? 'border border-[#D8AA67] text-[#4F0809] bg-[#F5ECDC]/80 font-bold hover:bg-[#EFE2CC]'
                      : 'text-[#4F0809] hover:bg-[#F5ECDC] hover:text-[#4F0809]'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="mt-3 pt-2.5 border-t border-[#E8DFCE] flex items-center justify-between text-[10px]">
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2 py-1 rounded-md bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] font-bold transition cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#8F6628]" />
              Today
            </button>
            <button
              type="button"
              onClick={handleSelectTomorrow}
              className="px-2 py-1 rounded-md bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] font-bold transition cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-md bg-[#4F0809] hover:bg-[#651012] text-[#FFF8EB] font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
