import { describe, it, expect } from 'vitest';
import {
  formatFixtureDate,
  fixtureCalendarDate,
  venueCalendarDate,
  formatTime,
} from './format';

describe('fixtureCalendarDate', () => {
  it('returns plain calendar dates verbatim', () => {
    expect(fixtureCalendarDate('2026-10-30')).toBe('2026-10-30');
  });

  it('takes the date portion of full ISO timestamps without conversion', () => {
    // 23:30 UTC is already the next day in some timezones; the stored
    // calendar date must be preserved as-is (venue timezone semantics).
    expect(fixtureCalendarDate('2026-10-30T23:30:00.000Z')).toBe('2026-10-30');
  });

  it('returns empty string for missing or malformed input', () => {
    expect(fixtureCalendarDate(null)).toBe('');
    expect(fixtureCalendarDate(undefined)).toBe('');
    expect(fixtureCalendarDate('not-a-date')).toBe('');
  });
});

describe('venueCalendarDate', () => {
  it('formats in Europe/London, independent of the system timezone', () => {
    // 30 Oct 2026 22:30 UTC is 22:30 in London (GMT) -> still the 30th
    expect(venueCalendarDate(new Date(Date.UTC(2026, 9, 30, 22, 30)))).toBe('2026-10-30');
    // 15 Jul 2026 22:30 UTC is 23:30 in London (BST) -> still the 15th
    expect(venueCalendarDate(new Date(Date.UTC(2026, 6, 15, 22, 30)))).toBe('2026-07-15');
    // ...but 15 Jul 2026 23:30 UTC is 00:30 on the 16th in London (BST)
    expect(venueCalendarDate(new Date(Date.UTC(2026, 6, 15, 23, 30)))).toBe('2026-07-16');
  });
});

describe('formatFixtureDate', () => {
  it('labels today, tomorrow and yesterday', () => {
    const now = new Date(2026, 9, 30, 12, 0); // 30 Oct 2026, midday local
    expect(formatFixtureDate('2026-10-30', now)).toBe('Today');
    expect(formatFixtureDate('2026-10-31', now)).toBe('Tomorrow');
    expect(formatFixtureDate('2026-10-29', now)).toBe('Yesterday');
  });

  it('falls back to dd/MM/yyyy for other dates', () => {
    const now = new Date(2026, 9, 30, 12, 0);
    expect(formatFixtureDate('2026-11-07', now)).toBe('07/11/2026');
  });

  it('is correct within a minute of midnight (venue timezone)', () => {
    // 30 Oct 2026 23:59 GMT = 23:59 UTC
    expect(formatFixtureDate('2026-10-30', new Date(Date.UTC(2026, 9, 30, 23, 59)))).toBe('Today');
    // 31 Oct 2026 00:01 GMT = 00:01 UTC
    expect(formatFixtureDate('2026-10-30', new Date(Date.UTC(2026, 9, 31, 0, 1)))).toBe('Yesterday');
    expect(formatFixtureDate('2026-10-31', new Date(Date.UTC(2026, 9, 30, 23, 59)))).toBe('Tomorrow');
  });

  it('is correct across UK DST transitions', () => {
    // British Summer Time: London is UTC+1
    // 15 Jul 2026 22:30 UTC = 23:30 BST on the 15th
    const bstEvening = new Date(Date.UTC(2026, 6, 15, 22, 30));
    expect(formatFixtureDate('2026-07-15', bstEvening)).toBe('Today');
    expect(formatFixtureDate('2026-07-16', bstEvening)).toBe('Tomorrow');
    // Clocks go back on 25 Oct 2026: 25 Oct 22:30 UTC = 23:30 BST on the 25th
    const clockChange = new Date(Date.UTC(2026, 9, 25, 22, 30));
    expect(formatFixtureDate('2026-10-25', clockChange)).toBe('Today');
    expect(formatFixtureDate('2026-10-26', clockChange)).toBe('Tomorrow');
    // Month rollover: 31 Oct 23:30 GMT = 23:30 UTC
    expect(formatFixtureDate('2026-11-01', new Date(Date.UTC(2026, 9, 31, 23, 30)))).toBe('Tomorrow');
  });

  it('uses the venue calendar for viewers in other timezones', () => {
    // 30 Oct 2026 13:00 UTC: it is already 31 Oct in Sydney (UTC+11) but
    // still 30 Oct at the UK venue. A fixture on the 30th is Today, not Yesterday.
    const sydneyNextDay = new Date(Date.UTC(2026, 9, 30, 13, 0));
    expect(formatFixtureDate('2026-10-30', sydneyNextDay)).toBe('Today');
    // 30 Oct 2026 06:00 UTC: it is still 29 Oct in Los Angeles (UTC-7 in PDT)
    // but already 30 Oct at the UK venue.
    const laPreviousDay = new Date(Date.UTC(2026, 9, 30, 6, 0));
    expect(formatFixtureDate('2026-10-30', laPreviousDay)).toBe('Today');
  });

  it('accepts full ISO timestamps by calendar date portion', () => {
    const now = new Date(2026, 9, 30, 12, 0);
    expect(formatFixtureDate('2026-10-30T00:00:00.000Z', now)).toBe('Today');
  });

  it('handles missing input gracefully', () => {
    expect(formatFixtureDate(null)).toBe('');
    expect(formatFixtureDate(undefined)).toBe('');
  });
});

describe('formatTime (unchanged behaviour)', () => {
  it('formats 24-hour times to UK 12-hour format', () => {
    expect(formatTime('20:00')).toBe('8:00pm');
    expect(formatTime('09:30')).toBe('9:30am');
    expect(formatTime('00:15')).toBe('12:15am');
    expect(formatTime('12:00')).toBe('12:00pm');
  });
});
