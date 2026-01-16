import type { FixtureWithTeams, StandingWithTeam, PlayerAwardWithDetails } from '@trytag/shared';

export interface FixtureInsight {
  type: 'top-clash' | 'star-player';
  text: string;
}

export const getFixtureInsights = (
  fixture: FixtureWithTeams,
  standings: StandingWithTeam[] | undefined,
  statistics: PlayerAwardWithDetails[] | undefined
): FixtureInsight[] => {
  const insights: FixtureInsight[] = [];

  // Top of the table clash
  if (standings && standings.length >= 2) {
    const homeTeamStanding = standings.find((s) => s.teamId === fixture.homeTeam.id);
    const awayTeamStanding = standings.find((s) => s.teamId === fixture.awayTeam.id);

    if (homeTeamStanding && awayTeamStanding) {
      const pos1 = homeTeamStanding.position;
      const pos2 = awayTeamStanding.position;
      if ((pos1 === 1 && pos2 === 2) || (pos1 === 2 && pos2 === 1)) {
        insights.push({
          type: 'top-clash',
          text: 'League leaders head-to-head',
        });
      }
    }
  }

  // Player of the Match watch
  if (statistics && statistics.length >= 3) {
    const topPlayerIds = statistics.slice(0, 6).map((s) => s.player.id);
    const fixturePlayerIds = statistics
      .filter((s) => s.team.id === fixture.homeTeam.id || s.team.id === fixture.awayTeam.id)
      .map((s) => s.player.id);

    const topPlayersInFixture = fixturePlayerIds.filter((p) => topPlayerIds.includes(p));

    if (topPlayersInFixture.length >= 2) {
      insights.push({
        type: 'star-player',
        text: 'Top Player of the Season contenders face off',
      });
    }
  }

  return insights;
};
