import { describe, it, expect } from 'vitest';
import { googleCalendarUrl } from './calendarLink';

const fixture = {
  fixtureDate: '2026-11-09',
  fixtureTime: '20:00',
  pitch: 'Pitch 3',
  homeTeam: { name: 'At least we try-ed' },
  awayTeam: { name: 'Tags Evasion' },
};

describe('googleCalendarUrl', () => {
  it('builds a timed event in the venue timezone', () => {
    const url = googleCalendarUrl(fixture, 'Battersea Park Astro')!;
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://calendar.google.com/calendar/render');
    const p = parsed.searchParams;
    expect(p.get('action')).toBe('TEMPLATE');
    expect(p.get('text')).toBe('At least we try-ed v Tags Evasion');
    // Floating local wall time plus the venue timezone, not a UTC conversion.
    expect(p.get('dates')).toBe('20261109T200000/20261109T210000');
    expect(p.get('ctz')).toBe('Europe/London');
    expect(p.get('location')).toBe('Battersea Park Astro, Pitch 3');
    // The placeholder end time is disclosed inside the event itself.
    expect(p.get('details')).toContain('1-hour estimate');
  });

  it('builds an all-day event when there is no kick-off time', () => {
    const url = googleCalendarUrl({ ...fixture, fixtureTime: null })!;
    const p = new URL(url).searchParams;
    expect(p.get('dates')).toBe('20261109/20261110');
    expect(p.get('ctz')).toBeNull();
    expect(p.get('details')).toBeNull();
  });

  it('omits location when neither venue nor pitch is known', () => {
    const url = googleCalendarUrl({ ...fixture, pitch: null })!;
    expect(new URL(url).searchParams.get('location')).toBeNull();
  });

  it('uses pitch alone when no venue name is available', () => {
    const url = googleCalendarUrl(fixture)!;
    expect(new URL(url).searchParams.get('location')).toBe('Pitch 3');
  });

  it('returns null when the fixture has no usable date', () => {
    expect(googleCalendarUrl({ ...fixture, fixtureDate: '' })).toBeNull();
  });
});
