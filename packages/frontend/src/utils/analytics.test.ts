import { describe, expect, it, vi } from 'vitest';
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

describe('page views before count.js has loaded', () => {
  it('are held and sent once the script loads', async () => {
    vi.stubEnv('VITE_GOATCOUNTER_URL', 'https://trytagstats.goatcounter.com/count');
    const script: { dataset: Record<string, string>; onload?: () => void } = { dataset: {} };
    const win: { goatcounter?: unknown } = {};
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', {
      querySelector: () => null,
      createElement: () => script,
      head: { appendChild: () => undefined },
    });
    const { initAnalytics, trackPageView } = await import('./analytics');
    expect(initAnalytics()).toBe(true);
    trackPageView('/teams/8024');
    const count = vi.fn();
    win.goatcounter = { count };
    expect(count).not.toHaveBeenCalled();
    script.onload?.();
    expect(count).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledWith({ path: '/teams/8024' });
    trackPageView('/leagues');
    expect(count).toHaveBeenLastCalledWith({ path: '/leagues' });
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
