import { format, parseISO } from 'date-fns';

/**
 * Format a 24-hour time string to UK 12-hour format
 * e.g., "20:00" -> "8:00pm", "09:30" -> "9:30am"
 */
export function formatTime(time: string | null | undefined): string | null {
  if (!time) return null;

  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;

  const hours = parseInt(match[1], 10);
  const minutes = match[2];

  if (hours === 0) {
    return `12:${minutes}am`;
  } else if (hours < 12) {
    return `${hours}:${minutes}am`;
  } else if (hours === 12) {
    return `12:${minutes}pm`;
  } else {
    return `${hours - 12}:${minutes}pm`;
  }
}

/**
 * Format an ISO date string to UK format
 * e.g., "2026-01-12" -> "12/01/2026"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';

  try {
    const date = parseISO(dateStr);
    return format(date, 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Format date and time together
 * e.g., "2026-01-12", "20:00" -> "12/01/2026 at 8:00pm"
 */
export function formatDateTime(
  dateStr: string | null | undefined,
  timeStr: string | null | undefined
): string {
  const date = formatDate(dateStr);
  const time = formatTime(timeStr);

  if (date && time) {
    return `${date} at ${time}`;
  }
  return date || '';
}

// Fixtures are played at UK venues and the API stores fixture dates as UK
// calendar dates, so day labels are computed in the venue timezone, not the
// viewer's. This stays correct for viewers abroad and across UK DST changes
// (Intl applies the Europe/London rules itself).
const VENUE_TIME_ZONE = 'Europe/London';

const venueDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VENUE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Calendar date (YYYY-MM-DD) of a moment in the venue timezone.
 * Never derived with toISOString(), which is UTC and can be a day off
 * around midnight.
 */
export function venueCalendarDate(date: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return venueDateFormatter.format(date);
}

/**
 * Extract the calendar date (YYYY-MM-DD) from an API date value.
 * The API returns fixture dates as plain calendar dates (e.g. "2026-10-30")
 * in the venue's timezone; full ISO timestamps are tolerated by taking the
 * date portion verbatim, without timezone conversion.
 */
export function fixtureCalendarDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

/**
 * Format a fixture date with friendly labels for near dates: "Today",
 * "Tomorrow" or "Yesterday" when it matches the venue calendar
 * (Europe/London), otherwise UK dd/MM/yyyy. Day arithmetic uses calendar
 * components, so it is correct across midnight and DST changes.
 */
export function formatFixtureDate(
  dateStr: string | null | undefined,
  now: Date = new Date()
): string {
  const cal = fixtureCalendarDate(dateStr);
  if (!cal) return formatDate(dateStr);

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (cal === venueCalendarDate(now)) return 'Today';
  if (cal === venueCalendarDate(tomorrow)) return 'Tomorrow';
  if (cal === venueCalendarDate(yesterday)) return 'Yesterday';
  return formatDate(cal);
}
