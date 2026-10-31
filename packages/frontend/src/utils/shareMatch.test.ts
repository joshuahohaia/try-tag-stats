import { describe, it, expect } from 'vitest';
import { buildShareText, whatsappShareUrl } from './shareMatch';

const fx = {
  fixtureDate: '2026-11-08',
  fixtureTime: '14:00',
  pitch: 'Pitch A',
  homeTeam: { name: 'Taghetti Junctioners' },
  awayTeam: { name: 'Come On Tryleen' },
};

describe('buildShareText', () => {
  it('lists teams, date, time, pitch and the match link', () => {
    expect(buildShareText(fx, 'https://example.test/fixtures/8517')).toBe(
      'Taghetti Junctioners v Come On Tryleen\nSun 8 Nov at 2:00pm\nPitch A\nhttps://example.test/fixtures/8517'
    );
  });
  it('leaves out time and pitch when unknown', () => {
    expect(buildShareText({ ...fx, fixtureTime: null, pitch: null }, 'https://x.test/f/1')).toBe(
      'Taghetti Junctioners v Come On Tryleen\nSun 8 Nov\nhttps://x.test/f/1'
    );
  });
});

describe('whatsappShareUrl', () => {
  it('has no phone number and encodes the text', () => {
    const url = whatsappShareUrl('A & B\nhttps://x.test/?a=1&b=2');
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(url).not.toMatch(/wa\.me\/\d/);
    expect(decodeURIComponent(url.slice('https://wa.me/?text='.length))).toBe('A & B\nhttps://x.test/?a=1&b=2');
  });
});
