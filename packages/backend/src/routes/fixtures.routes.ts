import { Router } from 'express';
import {
  fixtureRepository,
  teamRepository,
  standingRepository,
  playerAwardRepository,
} from '../database/repositories/index.js';
import { scraperOrchestrator } from '../scraper/index.js';
import { logger } from '../utils/logger.js';
import type {
  FixtureWithTeams,
  FixtureDetail,
  TeamComparisonData,
  HeadToHeadData,
  TeamSeasonStats,
} from '@trytag/shared';

const router = Router();

// GET /api/v1/fixtures - List fixtures (upcoming or recent)
router.get('/', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const type = (req.query.type as string) || 'upcoming';
  const teamIdsParam = req.query.teamIds as string;

  let fixtures: FixtureWithTeams[] = [];

  if (teamIdsParam) {
    const teamIds = teamIdsParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    if (type === 'recent') {
      fixtures = await fixtureRepository.findRecentByTeams(teamIds, limit);

      // Fallback to scraper if DB returns empty
      if (fixtures.length === 0 && teamIds.length > 0) {
        const allScrapedFixtures: FixtureWithTeams[] = [];

        for (const teamId of teamIds) {
          const team = await teamRepository.findById(teamId);
          if (!team?.externalTeamId) continue;

          const profileData = await scraperOrchestrator.fetchTeamProfile(team.externalTeamId);
          if (!profileData?.fixtureHistory?.length) continue;

          // Sort by date descending
          const sortedFixtures = [...profileData.fixtureHistory]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

          // Transform to FixtureWithTeams format
          for (const f of sortedFixtures) {
            const opponentTeam = await teamRepository.findByExternalId(f.awayTeamId);
            allScrapedFixtures.push({
              id: -(allScrapedFixtures.length + 1),
              externalFixtureId: null,
              divisionId: 0,
              homeTeamId: team.id,
              awayTeamId: opponentTeam?.id || f.awayTeamId,
              fixtureDate: f.date,
              fixtureTime: f.time,
              pitch: f.pitch,
              roundNumber: null,
              homeScore: f.homeScore,
              awayScore: f.awayScore,
              status: f.status,
              isForfeit: false,
              homeTeam: {
                id: team.id,
                externalTeamId: team.externalTeamId,
                name: team.name,
              },
              awayTeam: {
                id: opponentTeam?.id || f.awayTeamId,
                externalTeamId: f.awayTeamId,
                name: opponentTeam?.name || f.awayTeamName,
              },
            });
          }
        }

        // Sort all scraped fixtures by date and limit
        fixtures = allScrapedFixtures
          .sort((a, b) => new Date(b.fixtureDate).getTime() - new Date(a.fixtureDate).getTime())
          .slice(0, limit);
      }
    } else {
      fixtures = await fixtureRepository.findUpcomingByTeams(teamIds, limit);

      // Fallback to scraper if DB returns empty
      if (fixtures.length === 0 && teamIds.length > 0) {
        const allScrapedFixtures: FixtureWithTeams[] = [];

        for (const teamId of teamIds) {
          const team = await teamRepository.findById(teamId);
          if (!team?.externalTeamId) continue;

          const profileData = await scraperOrchestrator.fetchTeamProfile(
            team.externalTeamId,
          );
          if (!profileData?.upcomingFixtures?.length) continue;

          // Transform to FixtureWithTeams format
          for (const f of profileData.upcomingFixtures) {
            const opponentTeam = await teamRepository.findByExternalId(f.awayTeamId);
            allScrapedFixtures.push({
              id: -(allScrapedFixtures.length + 1),
              externalFixtureId: null,
              divisionId: 0,
              homeTeamId: team.id,
              awayTeamId: opponentTeam?.id || f.awayTeamId,
              fixtureDate: f.date,
              fixtureTime: f.time,
              pitch: f.pitch,
              roundNumber: null,
              homeScore: f.homeScore,
              awayScore: f.awayScore,
              status: f.status,
              isForfeit: false,
              homeTeam: {
                id: team.id,
                externalTeamId: team.externalTeamId,
                name: team.name,
              },
              awayTeam: {
                id: opponentTeam?.id || f.awayTeamId,
                externalTeamId: f.awayTeamId,
                name: opponentTeam?.name || f.awayTeamName,
              },
            });
          }
        }

        // Sort all scraped fixtures by date and limit
        fixtures = allScrapedFixtures
          .sort(
            (a, b) =>
              new Date(a.fixtureDate).getTime() -
              new Date(b.fixtureDate).getTime(),
          )
          .slice(0, limit);
      }
    }
  } else {
    // Global list
    if (type === 'recent') {
      fixtures = await fixtureRepository.findRecent(undefined, limit);
    } else {
      fixtures = await fixtureRepository.findUpcoming(undefined, limit);
    }
  }

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});



// GET /api/v1/fixtures/:id - Get fixture detail with head-to-head data
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const fixture = await fixtureRepository.findById(id);

    if (!fixture) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Fixture not found' },
      });
      return;
    }

    const divisionId = fixture.divisionId;

    // Helper function to get team comparison data
    async function getTeamComparisonData(teamId: number): Promise<TeamComparisonData> {
      const standings = await standingRepository.findByTeam(teamId);
      const currentStanding = standings.find(s => s.divisionId === divisionId);

      // Calculate recent form from last 5 fixtures
      const recentFixtures = await fixtureRepository.findRecent(teamId, 5);
      const form = recentFixtures
        .filter(f => f.status === 'completed' && f.homeScore !== null && f.awayScore !== null)
        .map(f => {
          const isHome = f.homeTeamId === teamId;
          const teamScore = isHome ? f.homeScore! : f.awayScore!;
          const oppScore = isHome ? f.awayScore! : f.homeScore!;
          if (teamScore > oppScore) return 'W';
          if (teamScore < oppScore) return 'L';
          return 'D';
        })
        .reverse()
        .join('');

      const playerAwards = await playerAwardRepository.findByTeam(teamId);

      // Try to get season stats from scraper
      let seasonStats: TeamSeasonStats[] = [];
      const team = await teamRepository.findById(teamId);
      if (team?.externalTeamId) {
        try {
          const profileData = await scraperOrchestrator.fetchTeamProfile(team.externalTeamId);
          if (profileData?.seasonStats) {
            seasonStats = profileData.seasonStats;
          }
        } catch (err) {
          logger.error({ error: err }, 'Failed to fetch team profile for fixture detail');
        }
      }

      return {
        standing: currentStanding
          ? {
              ...currentStanding,
              team: { id: teamId, externalTeamId: team?.externalTeamId || 0, name: team?.name || '' },
              form,
            }
          : null,
        recentForm: form,
        seasonStats,
        playerAwards,
      };
    }

    // Get comparison data for both teams
    const [homeTeamProfile, awayTeamProfile] = await Promise.all([
      getTeamComparisonData(fixture.homeTeamId),
      getTeamComparisonData(fixture.awayTeamId),
    ]);

    // Get head-to-head history
    const recentMeetings = await fixtureRepository.findHeadToHead(
      fixture.homeTeamId,
      fixture.awayTeamId,
      5
    );

    // Calculate H2H record
    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;

    for (const meeting of recentMeetings) {
      if (meeting.homeScore === null || meeting.awayScore === null) continue;

      const homeIsOriginalHome = meeting.homeTeamId === fixture.homeTeamId;
      const homeTeamScore = homeIsOriginalHome ? meeting.homeScore : meeting.awayScore;
      const awayTeamScore = homeIsOriginalHome ? meeting.awayScore : meeting.homeScore;

      if (homeTeamScore > awayTeamScore) homeWins++;
      else if (awayTeamScore > homeTeamScore) awayWins++;
      else draws++;
    }

    const headToHead: HeadToHeadData = {
      homeWins,
      awayWins,
      draws,
      recentMeetings,
    };

    const fixtureDetail: FixtureDetail = {
      ...fixture,
      homeTeamProfile,
      awayTeamProfile,
      headToHead,
    };

    res.json({
      success: true,
      data: fixtureDetail,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching fixture detail');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch fixture detail' },
    });
  }
});

export { router as fixturesRouter };
