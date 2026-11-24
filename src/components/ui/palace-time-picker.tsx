'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check, Sparkles } from 'lucide-react';

interface PalaceTimePickerProps {
  value: string; // e.g. "12:00 PM"
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  className?: string;
}

// Generate 30-minute interval times for a 24-hour cycle
const TIME_SLOTS: { time: string; tag?: string }[] = [
  { time: '06:00 AM' },
  { time: '06:30 AM' },
  { time: '07:00 AM' },
  { time: '07:30 AM' },
  { time: '08:00 AM' },
  { time: '08:30 AM' },
  { time: '09:00 AM' },
  { time: '09:30 AM' },
  { time: '10:00 AM', tag: 'Early Arrival' },
  { time: '10:30 AM' },
  { time: '11:00 AM', tag: 'Standard Check-Out' },
  { time: '11:30 AM' },
  { time: '12:00 PM', tag: 'Standard Check-In' },
  { time: '12:30 PM' },
  { time: '01:00 PM' },
  { time: '01:30 PM' },
  { time: '02:00 PM', tag: 'Late Check-Out' },
  { time: '02:30 PM' },
  { time: '03:00 PM' },
  { time: '03:30 PM' },
  { time: '04:00 PM' },
  { time: '04:30 PM' },
  { time: '05:00 PM' },
  { time: '05:30 PM' },
  { time: '06:00 PM' },
  { time: '06:30 PM' },
  { time: '07:00 PM' },
  { time: '07:30 PM' },
  { time: '08:00 PM' },
  { time: '08:30 PM' },
  { time: '09:00 PM' },
  { time: '09:30 PM' },
  { time: '10:00 PM' },
  { time: '10:30 PM' },
  { time: '11:00 PM' },
  { time: '11:30 PM' },
  { time: '12:00 AM', tag: 'Midnight' },
];

export default function PalaceTimePicker({
  value,
  onChange,
  label,
  required,
  placeholder = 'Select time',
  hint,
  className = '',
}: PalaceTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomInput(value || '');
  }, [value]);

  // Handle outside click
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

  const handleSelectTime = (selected: string) => {
    onChange(selected);
    setCustomInput(selected);
    setIsOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onChange(customInput.trim());
      setIsOpen(false);
    }
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
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-[#EFE2CC] group-hover:bg-[#E8DFCE] flex items-center justify-center transition">
            <Clock className="w-3.5 h-3.5 text-[#8F6628]" />
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#856B4D] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {hint && !isOpen && (
        <p className="text-[10px] text-[#856B4D] mt-1 italic">{hint}</p>
      )}

      {/* Royal Themed Minimal Popover Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 w-72 bg-[#FDF8EE] border border-[#D8AA67]/60 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8DFCE]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#4F0809]">
              <Sparkles className="w-3 h-3 text-[#D8AA67]" />
              <span>Palace Timing</span>
            </div>
            <span className="text-[10px] text-[#856B4D] font-medium">Standard / Custom</span>
          </div>

          {/* Quick presets */}
          <div className="mb-2">
            <div className="text-[10px] uppercase font-bold text-[#856B4D] tracking-wider mb-1">
              Quick Presets
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Check-In', time: '12:00 PM' },
                { label: 'Check-Out', time: '11:00 AM' },
                { label: 'Early', time: '10:00 AM' },
                { label: 'Late Out', time: '02:00 PM' },
              ].map((preset) => {
                const isSelected = value === preset.time;
                return (
                  <button
                    key={preset.time}
                    type="button"
                    onClick={() => handleSelectTime(preset.time)}
                    className={`px-2 py-1.5 rounded-lg text-left text-xs font-medium transition cursor-pointer border ${
                      isSelected
                        ? 'bg-[#4F0809] text-[#FDF8EE] border-[#4F0809]'
                        : 'bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] border-[#E8DFCE]'
                    }`}
                  >
                    <div className="text-[9px] uppercase tracking-wider opacity-75">{preset.label}</div>
                    <div className="font-bold">{preset.time}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Slot List */}
          <div className="mt-2 pt-2 border-t border-[#E8DFCE]">
            <div className="text-[10px] uppercase font-bold text-[#856B4D] tracking-wider mb-1.5">
              All Standard Times
            </div>
            <div className="max-h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {TIME_SLOTS.map((slot) => {
                const isSelected = value === slot.time;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => handleSelectTime(slot.time)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#4F0809] text-[#FDF8EE] font-bold shadow-2xs'
                        : 'hover:bg-[#F5ECDC] text-[#302421]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Clock
                        className={`w-3 h-3 ${
                          isSelected ? 'text-[#D8AA67]' : 'text-[#856B4D]'
                        }`}
                      />
                      <span>{slot.time}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {slot.tag && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                            isSelected
                              ? 'bg-[#D8AA67]/30 text-[#FDF8EE]'
                              : 'bg-[#D8AA67]/20 text-[#8F6628]'
                          }`}
                        >
                          {slot.tag}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#D8AA67]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Time Entry Form */}
          <form onSubmit={handleCustomSubmit} className="mt-2 pt-2 border-t border-[#E8DFCE] flex gap-1.5">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. 01:15 PM"
              className="flex-1 h-8 px-2.5 rounded-lg border border-[#E8DFCE] text-xs bg-[#F5ECDC] text-[#4F0809] placeholder:text-[#856B4D]/60 focus:border-[#4F0809] focus:outline-none font-medium"
            />
            <button
              type="submit"
              className="px-2.5 h-8 bg-[#4F0809] hover:bg-[#3D0607] text-[#FDF8EE] text-[11px] font-bold rounded-lg transition cursor-pointer"
            >
              Set
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
