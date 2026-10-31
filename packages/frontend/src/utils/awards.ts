import type { PlayerAwardWithDetails, StandingWithDivision } from '@trytag/shared';

export interface SeasonAward {
  playerId: number;
  name: string;
  awardCount: number;
}

/**
 * Player of the Match totals for a team's current season. The profile holds one award row per
 * division the team has played in, including earlier seasons. Keep only the divisions of the
 * current season (the season of the first standing, in the same league), then add up each player's
 * rows so one player appears once.
 */
export function currentSeasonAwards(
  awards: PlayerAwardWithDetails[] | undefined,
  standings: StandingWithDivision[] | undefined,
): SeasonAward[] {
  const current = standings?.[0];
  if (!awards || !current || current.seasonId === undefined) return [];
  const divisionIds = new Set(
    (standings ?? [])
      .filter((st) => st.seasonId === current.seasonId && st.leagueId === current.leagueId)
      .map((st) => st.divisionId),
  );
  const byPlayer = new Map<number, SeasonAward>();
  for (const award of awards) {
    if (!divisionIds.has(award.divisionId)) continue;
    const existing = byPlayer.get(award.playerId);
    if (existing) existing.awardCount += award.awardCount;
    else byPlayer.set(award.playerId, { playerId: award.playerId, name: award.player?.name || 'Unknown', awardCount: award.awardCount });
  }
  return [...byPlayer.values()].sort((a, b) => b.awardCount - a.awardCount || a.name.localeCompare(b.name));
}
