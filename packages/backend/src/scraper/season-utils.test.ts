import { describe, it, expect } from 'vitest';
import { pickCurrentSeasonId, shouldMarkUnseenInactive } from './season-utils.js';

describe('pickCurrentSeasonId', () => {
  it('returns the highest season id', () => {
    expect(pickCurrentSeasonId([94, 100, 97])).toBe(100);
  });
  it('returns null for an empty list', () => {
    expect(pickCurrentSeasonId([])).toBeNull();
  });
});

describe('shouldMarkUnseenInactive', () => {
  const ok = { hadErrors: false, seenDivisions: 356, previouslyActive: 400, newestSeasonOnList: 100, newestSeasonKnown: 97 };
  it('never marks after errors', () => {
    expect(shouldMarkUnseenInactive({ ...ok, hadErrors: true })).toBe(false);
  });
  it('never marks on an empty list', () => {
    expect(shouldMarkUnseenInactive({ ...ok, seenDivisions: 0 })).toBe(false);
  });
  it('skips when the list shrank by more than 20%', () => {
    expect(shouldMarkUnseenInactive({ ...ok, seenDivisions: 300 })).toBe(false);
  });
  it('skips when the list has an older season than we already know (stale page)', () => {
    expect(shouldMarkUnseenInactive({ ...ok, newestSeasonOnList: 95 })).toBe(false);
  });
  it('skips when no season was found', () => {
    expect(shouldMarkUnseenInactive({ ...ok, newestSeasonOnList: null })).toBe(false);
  });
  it('marks after a full clean sync', () => {
    expect(shouldMarkUnseenInactive(ok)).toBe(true);
  });
  it('marks on a first-ever sync', () => {
    expect(shouldMarkUnseenInactive({ ...ok, previouslyActive: 0, newestSeasonKnown: null })).toBe(true);
  });
});
