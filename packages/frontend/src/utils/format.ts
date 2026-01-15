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
