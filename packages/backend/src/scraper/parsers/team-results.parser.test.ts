import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseTeamResults } from './team-results.parser.js';

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'team-results.fixture.html'),
  'utf8'
);

describe('parseTeamResults (real Spawtz team profile, Putney Porcupines, Winter 2025/26)', () => {
  const rows = parseTeamResults(html);

  it('reads every played game and skips byes', () => {
    expect(rows).toHaveLength(11);
  });

  it('identifies opponents by TeamId from the link', () => {
    expect(rows[0]).toMatchObject({ opponentTeamId: 9739, opponentName: 'I Think We Try-Ed', teamScore: 0, opponentScore: 10 });
    expect(rows.filter((r) => r.opponentTeamId === 8024)).toHaveLength(3);
  });

  it('keeps same-day games against one opponent as separate games', () => {
    const sameDay = rows.filter((r) => r.date === '2025-11-24');
    expect(sameDay.map((r) => r.time)).toEqual(['20:00', '20:19']);
    const jan12 = rows.filter((r) => r.date === '2026-01-12' && r.opponentTeamId === 2451);
    expect(jan12.map((r) => `${r.teamScore}-${r.opponentScore}`)).toEqual(['2-3', '6-5']);
  });

  it('records label rows on the neighbouring games without guessing which owns it', () => {
    const dec1 = rows.find((r) => r.date === '2025-12-01')!;
    expect(dec1.labelBelow).toBe('Interdivisional Friendly');
    const dec8 = rows.find((r) => r.date === '2025-12-08')!;
    expect(dec8.labelAbove).toBe('Interdivisional Friendly');
    const jan26 = rows.find((r) => r.date === '2026-01-26')!;
    const feb2 = rows.find((r) => r.date === '2026-02-02')!;
    expect(jan26.labelBelow).toBe('3rd/4th Playoff');
    expect(feb2.labelAbove).toBe('3rd/4th Playoff');
  });
});
