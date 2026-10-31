import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parsePhaseResults } from './phase-results.parser.js';

// Trimmed copy of a real Spawtz page: LeagueId=747, SeasonId=100, PhaseId=87 (Cup and Plate).
const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'phase-standings.fixture.html'), 'utf8');

describe('phase results from standings tooltips', () => {
  const tables = parsePhaseResults(html);
  const cup = tables.find((t) => t.divisionId === 184)!;

  it('finds each played game once, from the winner or both drawers', () => {
    expect(cup.games.length).toBe(9);
    const key = (g: { date: string; homeTeamId: number; awayTeamId: number }) => `${g.date}|${g.homeTeamId}|${g.awayTeamId}`;
    expect(new Set(cup.games.map(key)).size).toBe(9);
  });

  it('reads At least we try-ed (8024) as three wins, with the losers named by the opponent lines', () => {
    const mine = cup.games.filter((g) => g.homeTeamId === 8024 || g.awayTeamId === 8024);
    expect(mine.map((g) => [g.date, g.time, g.homeTeamName, g.awayTeamName, g.outcome])).toEqual([
      ['2026-10-12', '20:40', 'At least we try-ed', 'Popping Tags', 'H'],
      ['2026-10-19', '21:20', 'Pink Panthers', 'At least we try-ed', 'A'],
      ['2026-10-26', '20:00', 'Ruckin’ scrum caps', 'At least we try-ed', 'A'],
    ]);
  });

  it('derives a loss for a team with no tooltip lines (Paddington Beers, 0 W 3 L)', () => {
    const losses = cup.games.filter((g) => (g.homeTeamId === 14073 && g.outcome === 'A') || (g.awayTeamId === 14073 && g.outcome === 'H'));
    expect(losses.length).toBe(3);
  });

  it('records a draw once and counts it for both teams', () => {
    const draws = cup.games.filter((g) => g.outcome === 'D');
    expect(draws.length).toBe(1);
    expect(cup.verifiedTeamIds).toContain(draws[0].homeTeamId);
    expect(cup.verifiedTeamIds).toContain(draws[0].awayTeamId);
  });

  it('only trusts teams whose games add up to their W, D and L', () => {
    expect(cup.verifiedTeamIds.length).toBe(6);
    const broken = html.replace('<td class="played">3</td><td>3</td><td>0</td><td>0</td>', '<td class="played">3</td><td>2</td><td>1</td><td>0</td>');
    const cup2 = parsePhaseResults(broken).find((t) => t.divisionId === 184)!;
    expect(cup2.unverifiedTeamIds).toContain(8024);
    expect(cup2.verifiedTeamIds).not.toContain(8024);
  });

  it('returns nothing for a page without standings tables', () => {
    expect(parsePhaseResults('<html><body><p>Hi</p></body></html>')).toEqual([]);
  });
});

describe('parsePhaseResults with the division Results table', () => {
  const divHtml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'phase-division.fixture.html'), 'utf8');

  it('attaches real scores to games and keeps home and away sides', () => {
    const [table] = parsePhaseResults(divHtml);
    const g = table.games.find((x) => x.date === '2026-10-12' && x.homeTeamName === 'At least we try-ed');
    expect(g).toBeDefined();
    expect(g!.homeScore).toBe(10);
    expect(g!.awayScore).toBe(5);
    expect(g!.outcome).toBe('H');
    expect(table.verifiedTeamIds).toContain(8024);
  });

  it('scores every verified game of a team and totals equal the standings For/Against', () => {
    const [table] = parsePhaseResults(divHtml);
    const mine = table.games.filter((x) => x.homeTeamId === 8024 || x.awayTeamId === 8024);
    expect(mine).toHaveLength(3);
    expect(mine.every((x) => x.homeScore !== undefined)).toBe(true);
    const pf = mine.reduce((a, x) => a + (x.homeTeamId === 8024 ? x.homeScore! : x.awayScore!), 0);
    const pa = mine.reduce((a, x) => a + (x.homeTeamId === 8024 ? x.awayScore! : x.homeScore!), 0);
    expect([pf, pa]).toEqual([39, 18]);
  });

  it('drops scores that disagree with the standings totals but keeps the result', () => {
    const bad = divHtml.replace('>10 - 5<', '>10 - 6<');
    const [table] = parsePhaseResults(bad);
    const g = table.games.find((x) => x.date === '2026-10-12' && x.homeTeamName === 'At least we try-ed');
    expect(g!.homeScore).toBeUndefined();
    expect(g!.outcome).toBe('H');
  });
});
