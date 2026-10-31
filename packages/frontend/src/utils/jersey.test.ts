import { describe, it, expect } from 'vitest';
import { jerseyStyle, md5Hex } from './jersey';

describe('md5Hex', () => {
  it('matches known md5 digests', () => {
    expect(md5Hex('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(md5Hex('taghetti junctioners')).toBe('937a0c00affd2b212087ba3433b1a2f3');
    expect(md5Hex('paddington beers')).toBe('4a643b177ceb6088fd82666fb85345c4');
  });
});

describe('jerseyStyle', () => {
  it('is the same for the same name, ignoring case and spacing around it', () => {
    expect(jerseyStyle('  Come On Tryleen ')).toEqual(jerseyStyle('come on tryleen'));
  });
  it('reproduces the approved concept values', () => {
    // From the concept generator: hue 323, 2 hoops, v-neck, white trim, initials TJ.
    const tj = jerseyStyle('Taghetti Junctioners');
    expect(tj.primary).toBe('hsl(323.0, 60%, 46%)');
    expect(tj.hoops).toBe(2);
    expect(tj.vNeck).toBe(true);
    expect(tj.trim).toBe('#ffffff');
    expect(tj.initials).toBe('TJ');
    const ct = jerseyStyle('Come On Tryleen');
    expect(ct.hoops).toBe(3);
    expect(ct.vNeck).toBe(false);
    expect(ct.initials).toBe('CT');
  });
  it('uses two letters for a single word name', () => {
    expect(jerseyStyle('Taggers').initials).toBe('TA');
  });
});
