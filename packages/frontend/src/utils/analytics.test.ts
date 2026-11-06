import { describe, expect, it } from 'vitest';
import { analyticsEndpoint, pagePath } from './analytics';

describe('analyticsEndpoint', () => {
  it('is off when unset or blank', () => {
    expect(analyticsEndpoint(undefined)).toBeNull();
    expect(analyticsEndpoint('')).toBeNull();
    expect(analyticsEndpoint('   ')).toBeNull();
  });

  it('accepts only a goatcounter.com count endpoint over https', () => {
    expect(analyticsEndpoint('https://trytagstats.goatcounter.com/count')).toBe('https://trytagstats.goatcounter.com/count');
    expect(analyticsEndpoint('http://trytagstats.goatcounter.com/count')).toBeNull();
    expect(analyticsEndpoint('https://evil.example.com/count')).toBeNull();
    expect(analyticsEndpoint('https://trytagstats.goatcounter.com/count?x=1')).toBeNull();
  });
});

describe('pagePath', () => {
  it('keeps the pathname and falls back to /', () => {
    expect(pagePath('/teams/8024')).toBe('/teams/8024');
    expect(pagePath('')).toBe('/');
  });
});
