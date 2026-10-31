import type { FixtureWithTeams } from '@trytag/shared';

export type MatchLookup =
  | { kind: 'none' }
  | { kind: 'one'; fixture: FixtureWithTeams }
  | { kind: 'many'; fixtures: FixtureWithTeams[] };

/**
 * Finds the match for a team page link. Identity is the two database team ids and the date,
 * plus the kick-off time when the link carries one. Names are never used.
 *
 * Team, opponent and date alone can match more than one game (a double header). In that case
 * nothing is picked: the caller gets every candidate and must ask the user. The same game listed
 * twice in the payload (identical in every field) counts once.
 */
export function lookupMatch(
  fixtures: FixtureWithTeams[],
  teamId: number,
  opponentId: number,
  date: string,
  time?: string
): MatchLookup {
  const candidates = fixtures.filter(
    (f) =>
      f.homeTeam.id === teamId &&
      f.awayTeam.id === opponentId &&
      f.fixtureDate === date &&
      (time === undefined || (f.fixtureTime ?? '') === time)
  );
  const seen = new Set<string>();
  const unique = candidates.filter((f) => {
    const key = [f.id, f.fixtureDate, f.fixtureTime, f.pitch, f.homeScore, f.awayScore, f.status].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length === 0) return { kind: 'none' };
  if (unique.length === 1) return { kind: 'one', fixture: unique[0] };
  return { kind: 'many', fixtures: unique };
}

/** Path to the internal match page for a team page fixture. */
export function matchPath(f: Pick<FixtureWithTeams, 'homeTeam' | 'awayTeam' | 'fixtureDate' | 'fixtureTime'>) {
  return {
    to: '/matches/$teamId/$opponentId/$date' as const,
    params: {
      teamId: String(f.homeTeam.id),
      opponentId: String(f.awayTeam.id),
      date: f.fixtureDate,
    },
    search: f.fixtureTime ? { time: f.fixtureTime } : {},
  };
}

/**
 * The API falls back to the external (Try Tag Rugby) team id when it has no stored team for the
 * opponent, and then reports that same number as both ids. A number that is only an external id
 * must never be used as an internal team route, so such a team is treated as unresolved.
 */
export function isResolvedTeam(t: { id: number; externalTeamId?: number | null }): boolean {
  return t.externalTeamId == null || t.id !== t.externalTeamId;
}
