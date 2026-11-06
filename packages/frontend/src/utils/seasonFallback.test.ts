import { describe, it, expect } from 'vitest';
import type { Season } from '@trytag/shared';
import { nextSeasonFallback } from './seasonFallback';

function season(id: number, name: string, isCurrent = false): Season {
  return {
    id,
    externalSeasonId: id,
    name,
    startDate: null,
    endDate: null,
    isCurrent,
  };
}

describe('nextSeasonFallback', () => {
  // Live shape seen on Battersea Park Astro in Nov 2026: the list arrives with the
  // oldest season first and the current season (84) has no divisions yet.
  const seasons = [
    season(20, 'Winter 2025/26'),
    season(78, 'Autumn 2026'),
    season(84, 'Winter 2026/27', true),
  ];

  it('falls back to the newest untried season, not the first in list order', () => {
    const tried = new Set(['84']);
    expect(nextSeasonFallback(seasons, tried, '84')?.id).toBe(78);
  });

  it('keeps walking back through seasons that also have no divisions', () => {
    const tried = new Set(['84', '78']);
    expect(nextSeasonFallback(seasons, tried, '78')?.id).toBe(20);
  });

  it('skips the currently selected season even when it is not marked tried yet', () => {
    expect(nextSeasonFallback(seasons, new Set(), '84')?.id).toBe(78);
  });

  it('returns undefined when every season has been tried', () => {
    const tried = new Set(['84', '78', '20']);
    expect(nextSeasonFallback(seasons, tried, '84')).toBeUndefined();
  });

  it('handles a single-season league', () => {
    expect(nextSeasonFallback([season(5, 'Summer 2026')], new Set(), '5')).toBeUndefined();
  });
});
