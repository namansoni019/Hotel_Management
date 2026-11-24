import { format, parseISO, isValid } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

// Default timezone — will be overridden by property settings
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Get the current time in the property timezone.
 */
export function nowInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  return toZonedTime(new Date(), timezone);
}

/**
 * Format a UTC date/timestamp for display in the property timezone.
 * @param date - Date object or ISO string
 * @param formatStr - date-fns format string (default: 'dd MMM yyyy, hh:mm a')
 * @param timezone - IANA timezone (default: 'Asia/Kolkata')
 */
export function formatInPropertyTimezone(
  date: Date | string,
  formatStr: string = 'dd MMM yyyy, hh:mm a',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'Invalid date';
  return formatInTimeZone(d, timezone, formatStr);
}

/**
 * Format a date for display (date only, no time).
 */
export function formatDate(
  date: Date | string,
  formatStr: string = 'dd MMM yyyy',
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatInPropertyTimezone(date, formatStr, timezone);
}

/**
 * Format a time for display.
 */
export function formatTime(
  date: Date | string,
  formatStr: string = 'hh:mm a',
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatInPropertyTimezone(date, formatStr, timezone);
}

/**
 * Convert a local date (in property timezone) to UTC for storage.
 * @param localDate - Date object representing local time
 * @param timezone - IANA timezone
 */
export function toUTC(
  localDate: Date,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  return fromZonedTime(localDate, timezone);
}

/**
 * Convert a UTC date to local time in the property timezone.
 */
export function toLocalTime(
  utcDate: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const d = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  return toZonedTime(d, timezone);
}

/**
 * Format a date range for display (e.g., "15 Oct 2026 – 18 Oct 2026").
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const start = formatDate(startDate, 'dd MMM yyyy', timezone);
  const end = formatDate(endDate, 'dd MMM yyyy', timezone);
  return `${start} – ${end}`;
}

/**
 * Calculate the number of nights between two dates.
 * Check-out date is excluded (standard hotel convention).
 */
export function calculateNights(
  checkIn: Date | string,
  checkOut: Date | string
): number {
  const start = typeof checkIn === 'string' ? parseISO(checkIn) : checkIn;
  const end = typeof checkOut === 'string' ? parseISO(checkOut) : checkOut;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Check if a date is today in the property timezone.
 */
export function isToday(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const d = formatDate(date, 'yyyy-MM-dd', timezone);
  const today = formatDate(new Date(), 'yyyy-MM-dd', timezone);
  return d === today;
}

/**
 * Get today's date as a string in yyyy-MM-dd format.
 */
export function todayString(timezone: string = DEFAULT_TIMEZONE): string {
  return formatDate(new Date(), 'yyyy-MM-dd', timezone);
}

/**
 * Safely convert a Firestore Timestamp, Date, ISO string, or fallback epoch ID into epoch ms.
 */
export function getFirestoreTimestampMs(createdAt: unknown, fallbackId?: string): number {
  if (createdAt) {
    if (typeof createdAt === 'object') {
      const ts = createdAt as { seconds?: number; nanoseconds?: number; toDate?: () => Date };
      if (typeof ts.toDate === 'function') {
        const d = ts.toDate();
        if (!isNaN(d.getTime())) return d.getTime();
      }
      if (typeof ts.seconds === 'number') {
        return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
      }
    }
    if (typeof createdAt === 'number' && !isNaN(createdAt)) {
      return createdAt;
    }
    if (typeof createdAt === 'string') {
      const parsed = new Date(createdAt).getTime();
      if (!isNaN(parsed)) return parsed;
    }
  }
  if (fallbackId) {
    const match = fallbackId.match(/(\d{12,15})/);
    if (match) {
      const num = Number(match[1]);
      if (!isNaN(num)) return num;
    }
  }
  return 0;
}

/**
 * Format a Firestore created_at Timestamp or date into readable time + date labels.
 */
export function formatCreatedAtParts(
  createdAt: unknown,
  fallbackId?: string
): { timeLabel: string; dateLabel: string; fullLabel: string; ms: number } {
  const ms = getFirestoreTimestampMs(createdAt, fallbackId);
  if (!ms) {
    return { timeLabel: 'Just now', dateLabel: 'Live', fullLabel: 'Just now', ms: 0 };
  }
  const d = new Date(ms);
  const timeLabel = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const dateLabel = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return {
    timeLabel,
    dateLabel,
    fullLabel: `${dateLabel}, ${timeLabel}`,
    ms,
  };
}
