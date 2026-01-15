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
