import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseStandings, parsePhases } from './standings.parser.js';

// Trimmed copy of a real Spawtz page: LeagueId=747, SeasonId=100, PhaseId=87 (Cup and Plate).
const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'phase-standings.fixture.html'), 'utf8');

describe('phase standings page', () => {
  it('reads the phase dropdown', () => {
    expect(parsePhases(html)).toEqual([
      { phaseId: 0, name: 'First phase' },
      { phaseId: 87, name: 'Phase 2' },
    ]);
  });

  it('returns no phases for a page without a dropdown', () => {
    expect(parsePhases('<html><body><table></table></body></html>')).toEqual([]);
  });

  it('keeps Cup and Plate as separate tables with their own division ids', () => {
    const { tables, standings } = parseStandings(html);
    expect(tables.map((t) => [t.heading, t.divisionId, t.standings.length])).toEqual([
      ['Cup', 184, 6],
      ['Plate', 185, 6],
    ]);
    expect(standings.length).toBe(12);
    const cupTeams = new Set(tables[0].standings.map((r) => r.teamId));
    const plateTeams = new Set(tables[1].standings.map((r) => r.teamId));
    expect([...cupTeams].filter((id) => plateTeams.has(id))).toEqual([]);
    expect(tables[0].standings.map((r) => r.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('leaves divisionId null when rows disagree', () => {
    const mixed = `<h3>X</h3><table><tr><td>Team</td><td>Pld</td><td>Pts</td></tr>
      <tr><td><a href="/T?TeamId=1&DivisionId=5">A</a></td><td>1</td><td>3</td></tr>
      <tr><td><a href="/T?TeamId=2&DivisionId=6">B</a></td><td>1</td><td>0</td></tr></table>`;
    const { tables } = parseStandings(mixed);
    expect(tables[0].divisionId).toBeNull();
  });
});
