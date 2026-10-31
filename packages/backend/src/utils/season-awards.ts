import type { PlayerAwardWithDetails, StandingWithDivision } from '@trytag/shared';

/**
 * A team's Player of the Match rows are stored one per division, across every season it has played.
 * For one season, keep the rows of the divisions the team played in that season (same league as the
 * given division) and add each player's rows together so every player appears once.
 * Returns an empty list when the division is not among the team's standings.
 */
export function seasonAwardsForDivision(
  awards: PlayerAwardWithDetails[],
  standings: StandingWithDivision[],
  divisionId: number,
): PlayerAwardWithDetails[] {
  const anchor = standings.find((s) => s.divisionId === divisionId);
  if (!anchor || anchor.seasonId === undefined) return [];
  const divisionIds = new Set(
    standings
      .filter((s) => s.seasonId === anchor.seasonId && s.leagueId === anchor.leagueId)
      .map((s) => s.divisionId),
  );
  const byPlayer = new Map<number, PlayerAwardWithDetails>();
  for (const award of awards) {
    if (!divisionIds.has(award.divisionId)) continue;
    const existing = byPlayer.get(award.playerId);
    if (existing) existing.awardCount += award.awardCount;
    else byPlayer.set(award.playerId, { ...award });
  }
  return [...byPlayer.values()].sort(
    (a, b) => b.awardCount - a.awardCount || a.player.name.localeCompare(b.player.name),
  );
}
