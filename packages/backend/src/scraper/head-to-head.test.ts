import { describe, it, expect } from 'vitest';
import { buildHeadToHead, invertHeadToHead, type SeasonResults } from './head-to-head.js';
import type { TeamResultRow } from './parsers/team-results.parser.js';

function row(over: Partial<TeamResultRow>): TeamResultRow {
  return {
    date: '2026-01-01', time: '20:00', court: 'Pitch A', opponentTeamId: 1, opponentName: 'Opp',
    teamScore: 5, opponentScore: 3, labelAbove: null, labelBelow: null, ...over,
  };
}
const season = (rows: TeamResultRow[], seasonId = 94, divisionId = 1): SeasonResults => ({
  seasonId, divisionId, seasonName: `S${seasonId}`, divisionName: 'Div', rows,
});

describe('buildHeadToHead', () => {
  it('matches by team id, never by name', () => {
    const r = buildHeadToHead(1, [season([
      row({ opponentTeamId: 1, opponentName: 'Same Name' }),
      row({ opponentTeamId: 2, opponentName: 'Same Name', date: '2026-01-08' }),
    ])]);
    expect(r.record.played).toBe(1);
  });

  it('keeps two same-day games and counts both', () => {
    const r = buildHeadToHead(1, [season([
      row({ time: '20:00', teamScore: 0, opponentScore: 10 }),
      row({ time: '20:19', teamScore: 0, opponentScore: 10 }),
    ])]);
    expect(r.record).toMatchObject({ played: 2, lost: 2, pointsFor: 0, pointsAgainst: 20 });
  });

  it('does not count a season twice if it is supplied twice', () => {
    const s = season([row({})]);
    const r = buildHeadToHead(1, [s, s]);
    expect(r.record.played).toBe(1);
    expect(r.seasonsCovered).toHaveLength(1);
  });

  it('counts a game once when the same season is supplied under another division id', () => {
    const r = buildHeadToHead(1, [
      season([row({ date: '2026-10-18', time: '14:00', teamScore: 13, opponentScore: 11 })], 100, 8788),
      season([row({ date: '2026-10-18', time: '14:00', teamScore: 13, opponentScore: 11 })], 100, 9999),
    ]);
    expect(r.record).toMatchObject({ played: 1, won: 1, pointsFor: 13, pointsAgainst: 11 });
  });

  it('keeps two identical-looking games inside one page, and the same game in a different season', () => {
    const twice = row({ time: '20:00', teamScore: 5, opponentScore: 3 });
    const r = buildHeadToHead(1, [season([twice, twice], 100, 1), season([twice], 101, 2)]);
    expect(r.record.played).toBe(3);
  });

  it('counts labelled games in the record and reports how many have a label', () => {
    const r = buildHeadToHead(1, [season([
      row({ date: '2026-01-01' }),
      row({ date: '2026-01-08', labelBelow: 'Interdivisional Friendly', teamScore: 10, opponentScore: 0 }),
      row({ date: '2026-01-15', labelAbove: '3rd/4th Playoff', teamScore: 2, opponentScore: 2 }),
    ])]);
    expect(r.record).toMatchObject({ played: 3, won: 2, drawn: 1, pointsFor: 17, pointsAgainst: 5 });
    expect(r.labelledCount).toBe(2);
    expect(r.meetings.map((m) => m.labels[0])).toEqual(['3rd/4th Playoff', 'Interdivisional Friendly', undefined]);
  });

  it('sums across seasons and reports coverage', () => {
    const r = buildHeadToHead(1, [
      season([row({ teamScore: 7, opponentScore: 11 })], 94, 1),
      season([row({ teamScore: 9, opponentScore: 9 })], 95, 2),
    ]);
    expect(r.record).toMatchObject({ played: 2, lost: 1, drawn: 1, pointsFor: 16, pointsAgainst: 20 });
    expect(r.seasonsCovered).toEqual(['S94 - Div', 'S95 - Div']);
  });

  it('inverts to the other team\'s point of view', () => {
    const r = invertHeadToHead(buildHeadToHead(1, [season([
      row({ teamScore: 7, opponentScore: 11 }),
      row({ date: '2026-01-08', teamScore: 5, opponentScore: 5 }),
    ])]));
    expect(r.record).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, pointsFor: 16, pointsAgainst: 12 });
    expect(r.meetings.find((m) => m.date === '2026-01-01')).toMatchObject({ teamScore: 11, opponentScore: 7, result: 'W' });
  });
});
