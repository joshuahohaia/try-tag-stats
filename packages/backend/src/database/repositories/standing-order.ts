export interface OrderableStanding {
  leagueId: number;
  seasonId: number;
  divisionId: number;
  phaseId: number | null;
  /** True when any team in any division of this row's phase (same league and season) has played. */
  phaseStarted: boolean;
}

/**
 * Orders a team's standings so the first row is the one to show as "current".
 *
 * Seasons stay newest first, and the first row of each league+season group keeps its place.
 * Inside a league+season group the team's rows are phases of the same season. Phase ids are
 * opaque and not proven to rise over time, so they are never used for ordering. The same rule
 * as the league page applies: the current row moves off the first phase only when exactly one
 * later phase has started. If several later phases have started, or none, the first phase stays
 * current. The other rows keep their order after it, so first-phase history stays in the list.
 */
export function orderTeamStandings<T extends OrderableStanding>(
  rows: T[]
): Omit<T, 'phaseStarted'>[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = `${row.seasonId}:${row.leagueId}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  const out: T[] = [];
  for (const group of groups.values()) {
    const startedLater = new Set(
      group.filter((r) => r.phaseId != null && r.phaseStarted).map((r) => r.phaseId)
    );
    if (startedLater.size !== 1) {
      // First phase first, then the rest in their original order.
      out.push(...group.filter((r) => r.phaseId == null), ...group.filter((r) => r.phaseId != null));
      continue;
    }
    const current = [...startedLater][0];
    out.push(
      ...group.filter((r) => r.phaseId === current),
      ...group.filter((r) => r.phaseId == null),
      ...group.filter((r) => r.phaseId != null && r.phaseId !== current)
    );
  }
  // Keep seasons newest first as the query returned them: groups are already in that order.
  return out.map(({ phaseStarted: _phaseStarted, ...rest }) => rest) as Omit<T, 'phaseStarted'>[];
}
