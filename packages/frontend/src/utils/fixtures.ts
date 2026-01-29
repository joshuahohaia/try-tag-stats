import type { FixtureWithTeams, StandingWithTeam, PlayerAwardWithDetails } from '@trytag/shared';

export interface FixtureInsight {
  type: 'top-clash' | 'star-player';
  text: string;
}

/**
 * Calculate dense rank positions for player statistics.
 * Players with the same award count share the same position.
 * e.g., [5, 5, 4, 3] -> positions [1, 1, 2, 3]
 */
function getPlayerPositions(statistics: PlayerAwardWithDetails[]): Map<number, number> {
  const positions = new Map<number, number>();
  if (statistics.length === 0) return positions;

  let currentPosition = 1;
  let previousAwardCount = statistics[0].awardCount;

  statistics.forEach((stat, index) => {
    if (index > 0 && stat.awardCount < previousAwardCount) {
      currentPosition++;
      previousAwardCount = stat.awardCount;
    }
    positions.set(stat.player.id, currentPosition);
  });

  return positions;
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

  // Player of the Match watch - based on actual leaderboard positions
  if (statistics && statistics.length >= 2) {
    const playerPositions = getPlayerPositions(statistics);

    // Find players in this fixture who are in top 2 positions
    const fixtureTopPlayers = statistics
      .filter((s) => s.team.id === fixture.homeTeam.id || s.team.id === fixture.awayTeam.id)
      .filter((s) => {
        const position = playerPositions.get(s.player.id);
        return position !== undefined && position <= 2;
      });

    // Show insight if players from BOTH teams are in top 2 positions
    const homeTeamHasTop = fixtureTopPlayers.some((s) => s.team.id === fixture.homeTeam.id);
    const awayTeamHasTop = fixtureTopPlayers.some((s) => s.team.id === fixture.awayTeam.id);

    if (homeTeamHasTop && awayTeamHasTop) {
      insights.push({
        type: 'star-player',
        text: 'Player of the Season leaders face off',
      });
    } else if (fixtureTopPlayers.length >= 1) {
      // At least one top player in the fixture
      const topPlayer = fixtureTopPlayers[0];
      const position = playerPositions.get(topPlayer.player.id);
      insights.push({
        type: 'star-player',
        text: `${position === 1 ? 'League leader' : '2nd place'} in Player of the Season`,
      });
    }
  }

  return insights;
};
