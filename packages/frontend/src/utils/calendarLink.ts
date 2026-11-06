import { addDays, addHours, format, parseISO } from 'date-fns';
import { fixtureCalendarDate } from './format';

export interface CalendarFixture {
  fixtureDate: string;
  fixtureTime: string | null;
  pitch: string | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
}

/**
 * Google Calendar "create event" link for a fixture. It opens the user's own
 * calendar with the details filled in; nothing is saved until they confirm.
 *
 * Fixture times are UK venue wall times, so the link passes them as floating
 * local times with ctz=Europe/London instead of converting to UTC here. Spawtz
 * does not publish how long a game lasts, so a one-hour block is used and the
 * user can adjust it before saving.
 */
export function googleCalendarUrl(
  fixture: CalendarFixture,
  venueName?: string | null
): string | null {
  const cal = fixtureCalendarDate(fixture.fixtureDate);
  if (!cal) return null;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${fixture.homeTeam.name} v ${fixture.awayTeam.name}`,
  });

  const day = parseISO(cal);
  const timeMatch = fixture.fixtureTime?.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const start = new Date(day);
    start.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
    const end = addHours(start, 1);
    params.set(
      'dates',
      `${format(start, "yyyyMMdd'T'HHmmss")}/${format(end, "yyyyMMdd'T'HHmmss")}`
    );
    params.set('ctz', 'Europe/London');
    // Spawtz does not publish how long a game lasts, so the end time is a
    // placeholder. Say so inside the event itself, where it stays visible
    // while the user reviews it before saving.
    params.set('details', 'End time is a 1-hour estimate; adjust it before saving.');
  } else {
    // No kick-off time: all-day event.
    params.set('dates', `${format(day, 'yyyyMMdd')}/${format(addDays(day, 1), 'yyyyMMdd')}`);
  }

  const location = [venueName, fixture.pitch].filter(Boolean).join(', ');
  if (location) params.set('location', location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
