import { Router } from 'express';
import { logger } from '../utils/logger.js';
import {
  TeamPositionHistory,
  TeamSeasonStats,
  TeamPreviousSeason,
} from '@trytag/shared';
import {
  teamRepository,
  standingRepository,
  fixtureRepository,
  playerAwardRepository,
  divisionRepository,
  leagueRepository,
  seasonRepository,
} from '../database/repositories/index.js';
import { scraperOrchestrator } from '../scraper/index.js';
import { getHeadToHead, PILOT_LEAGUE_EXTERNAL_IDS, type SeasonContext } from '../scraper/head-to-head.service.js';
import { invertHeadToHead } from '../scraper/head-to-head.js';
import { getTeamPhaseResults } from '../scraper/phase-results.service.js';

const router = Router();

// GET /api/v1/teams - Get all teams
router.get('/', async (_req, res) => {
  const teams = await teamRepository.findAll();
  res.json({
    success: true,
    data: teams,
    meta: { total: teams.length },
  });
});

// GET /api/v1/teams/batch - Get multiple teams by IDs
router.get('/batch', async (req, res) => {
  const idsParam = req.query.ids as string;
  if (!idsParam) {
    res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'ids query parameter required' },
    });
    return;
  }

  const ids = idsParam.split(',').map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
  const teams = await teamRepository.findByIds(ids);

  res.json({
    success: true,
    data: teams,
    meta: { total: teams.length },
  });
});

// GET /api/v1/teams/:id - Get team profile
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // Try to find by internal ID first, then fall back to external ID
    let team = await teamRepository.findById(id);
    if (!team) {
      team = await teamRepository.findByExternalId(id);
    }

    if (!team) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team not found' },
      });
      return;
    }

    const teamId = team.id; // Use internal ID for all lookups
    const standings = await standingRepository.findByTeam(teamId);
    let upcomingFixtures = await fixtureRepository.findUpcoming(teamId, 5);
    let recentFixtures = await fixtureRepository.findRecent(teamId, 10);
    const playerAwards = await playerAwardRepository.findByTeam(teamId);

    // Fetch live profile data from website (position history, stats, previous seasons, fixture history)
    let positionHistory: TeamPositionHistory[] = [];
    let seasonStats: TeamSeasonStats[] = [];
    let previousSeasons: TeamPreviousSeason[] = [];
    let profileFetchedAt: string | undefined;
    let profileStale = false;

    // Only fetch if we have an external team ID
    if (team.externalTeamId) {
      try {
        // Build context from first standing (for getting external IDs needed by Spawtz)
        let context: { leagueId?: number; seasonId?: number; divisionId?: number } | undefined;
        if (standings.length > 0) {
          const division = await divisionRepository.findById(standings[0].divisionId);
          if (division) {
            const league = await leagueRepository.findById(division.leagueId);
            const season = await seasonRepository.findById(division.seasonId);
            context = {
              leagueId: league?.externalLeagueId,
              seasonId: season?.externalSeasonId,
              divisionId: division.externalDivisionId,
            };
          }
        }
        const profileData = await scraperOrchestrator.fetchTeamProfile(team.externalTeamId, context);
        if (profileData) {
          profileFetchedAt = profileData.fetchedAt ? new Date(profileData.fetchedAt).toISOString() : undefined;
          profileStale = profileData.stale === true;
          positionHistory = profileData.positionHistory;
          seasonStats = profileData.seasonStats;
          previousSeasons = profileData.previousSeasons;

          // If any fixture history is found from the scraped profile, use it
          if (profileData.fixtureHistory && profileData.fixtureHistory.length > 0) {
            // Transform scraped fixtures to match FixtureWithTeams format
            const sortedFixtures = [...profileData.fixtureHistory].sort((a, b) => {
              const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
              if (dateCompare !== 0) return dateCompare;
              if (!a.time && !b.time) return 0;
              if (!a.time) return 1;
              if (!b.time) return -1;
              return b.time.localeCompare(a.time);
            });
            const transformedFixtures = [];
            for (let idx = 0; idx < sortedFixtures.length; idx++) {
              const f = sortedFixtures[idx];
              const opponentTeam = await teamRepository.findByExternalId(f.awayTeamId);
              const opponentId = opponentTeam?.id || f.awayTeamId;

              // Try to find matching fixture in database to get real ID
              const dbFixture = await fixtureRepository.findByTeamsAndDate(team.id, opponentId, f.date);

              transformedFixtures.push({
                id: dbFixture?.id ?? -idx - 1,
                externalFixtureId: dbFixture?.externalFixtureId ?? null,
                divisionId: dbFixture?.divisionId ?? 0,
                homeTeamId: team.id,
                awayTeamId: opponentId,
                fixtureDate: f.date,
                fixtureTime: f.time,
                pitch: f.pitch,
                roundNumber: dbFixture?.roundNumber ?? null,
                homeScore: f.homeScore,
                awayScore: f.awayScore,
                status: f.status,
                isForfeit: dbFixture?.isForfeit ?? false,
                homeTeam: {
                  id: team.id,
                  externalTeamId: team.externalTeamId,
                  name: team.name,
                },
                awayTeam: {
                  id: opponentId,
                  externalTeamId: f.awayTeamId,
                  name: opponentTeam?.name || f.awayTeamName,
                },
              });
            }
            recentFixtures = transformedFixtures;
          }

          // If any upcoming fixtures are found from the scraped profile, use them
          if (profileData.upcomingFixtures && profileData.upcomingFixtures.length > 0) {
            const sortedFixtures = [...profileData.upcomingFixtures].sort((a, b) => {
              const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
              if (dateCompare !== 0) return dateCompare;
              if (!a.time && !b.time) return 0;
              if (!a.time) return -1;
              if (!b.time) return 1;
              return a.time.localeCompare(b.time);
            });
            const transformedFixtures = [];
            for (let idx = 0; idx < sortedFixtures.length; idx++) {
              const f = sortedFixtures[idx];
              const opponentTeam = await teamRepository.findByExternalId(f.awayTeamId);
              const opponentId = opponentTeam?.id || f.awayTeamId;

              // Try to find matching fixture in database to get real ID
              const dbFixture = await fixtureRepository.findByTeamsAndDate(team.id, opponentId, f.date);

              transformedFixtures.push({
                id: dbFixture?.id ?? -idx - 1,
                externalFixtureId: dbFixture?.externalFixtureId ?? null,
                divisionId: dbFixture?.divisionId ?? 0,
                homeTeamId: team.id,
                awayTeamId: opponentId,
                fixtureDate: f.date,
                fixtureTime: f.time,
                pitch: f.pitch,
                roundNumber: dbFixture?.roundNumber ?? null,
                homeScore: f.homeScore,
                awayScore: f.awayScore,
                status: f.status,
                isForfeit: dbFixture?.isForfeit ?? false,
                homeTeam: {
                  id: team.id,
                  externalTeamId: team.externalTeamId,
                  name: team.name,
                },
                awayTeam: {
                  id: opponentId,
                  externalTeamId: f.awayTeamId,
                  name: opponentTeam?.name || f.awayTeamName,
                },
              });
            }
            upcomingFixtures = transformedFixtures;
          }
        }
      } catch (scraperError) {
        // Log but don't fail the request if scraper fails
        logger.error({ error: scraperError }, 'Failed to fetch team profile from scraper');
      }
    }

    // Later-phase (e.g. Phase 2) games. The Spawtz team page only lists first-phase games, so add
    // played games of the team's other phases from the division standings page. They carry the real
    // score from its Results table; a game whose score cannot be verified keeps a result only.
    if (team.externalTeamId && standings.length > 0) {
      try {
        const currentSeasonId = standings[0].seasonId;
        const seen = new Set<number>();
        const extra = [];
        for (const st of standings) {
          if (st.seasonId !== currentSeasonId || seen.has(st.divisionId)) continue;
          seen.add(st.divisionId);
          const division = await divisionRepository.findById(st.divisionId);
          if (!division || division.phaseId == null) continue;
          const league = await leagueRepository.findById(division.leagueId);
          const season = await seasonRepository.findById(division.seasonId);
          if (!league || !season) continue;
          const games = await getTeamPhaseResults(
            league.externalLeagueId,
            season.externalSeasonId,
            division.phaseId,
            division.externalDivisionId,
            team.externalTeamId
          );
          for (const g of games) {
            const home = g.homeTeamId === team.externalTeamId;
            const oppExternal = home ? g.awayTeamId : g.homeTeamId;
            const oppName = home ? g.awayTeamName : g.homeTeamName;
            const opp = await teamRepository.findByExternalId(oppExternal);
            const oppId = opp?.id ?? oppExternal;
            // Outcome from this team's side: H = this team won.
            const outcome = g.outcome === 'D' ? 'D' : (g.outcome === 'H') === home ? 'H' : 'A';
            // With a real score, keep the true home and away sides; result-only games keep this team first.
            const hasScore = g.homeScore !== undefined && g.awayScore !== undefined;
            const teamIsHome = hasScore ? home : true;
            if (recentFixtures.some((f) => f.fixtureDate === g.date && (f.awayTeamId === oppId || f.homeTeamId === oppId))) continue;
            extra.push({
              id: -1000 - extra.length,
              externalFixtureId: null,
              divisionId: division.id,
              homeTeamId: teamIsHome ? team.id : oppId,
              awayTeamId: teamIsHome ? oppId : team.id,
              fixtureDate: g.date,
              fixtureTime: g.time,
              pitch: null,
              roundNumber: null,
              homeScore: hasScore ? g.homeScore! : null,
              awayScore: hasScore ? g.awayScore! : null,
              status: 'completed' as const,
              isForfeit: false,
              outcome: (hasScore && !home ? (outcome === 'H' ? 'A' : outcome === 'A' ? 'H' : 'D') : outcome) as 'H' | 'A' | 'D',
              homeTeam: teamIsHome
                ? { id: team.id, externalTeamId: team.externalTeamId, name: team.name }
                : { id: oppId, externalTeamId: oppExternal, name: opp?.name || oppName },
              awayTeam: teamIsHome
                ? { id: oppId, externalTeamId: oppExternal, name: opp?.name || oppName }
                : { id: team.id, externalTeamId: team.externalTeamId, name: team.name },
            });
          }
        }
        if (extra.length > 0) {
          recentFixtures = [...recentFixtures, ...extra].sort((a, b) => {
            const d = new Date(b.fixtureDate).getTime() - new Date(a.fixtureDate).getTime();
            if (d !== 0) return d;
            if (!a.fixtureTime && !b.fixtureTime) return 0;
            if (!a.fixtureTime) return 1;
            if (!b.fixtureTime) return -1;
            return b.fixtureTime.localeCompare(a.fixtureTime);
          });
        }
      } catch (phaseError) {
        logger.error({ error: phaseError }, 'Failed to add later-phase results to team profile');
      }
    }

    res.json({
      success: true,
      data: {
        ...team,
        standings,
        upcomingFixtures,
        recentFixtures,
        playerAwards,
        positionHistory,
        seasonStats,
        previousSeasons,
        profileFetchedAt,
        profileStale,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching team profile');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch team profile' },
    });
  }
});

// GET /api/v1/teams/:id/head-to-head/:opponentId - Meetings on record (pilot: Battersea Park Astro only)
router.get('/:id/head-to-head/:opponentId', async (req, res) => {
  try {
    const team = await teamRepository.findById(parseInt(req.params.id, 10));
    const opponent = await teamRepository.findById(parseInt(req.params.opponentId, 10));
    if (!team || !opponent) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Team not found' } });
      return;
    }

    const seasonsFor = async (teamId: number): Promise<SeasonContext[]> => {
      const standings = await standingRepository.findByTeam(teamId);
      const out: SeasonContext[] = [];
      for (const standing of standings) {
        const division = await divisionRepository.findById(standing.divisionId);
        if (!division) continue;
        const league = await leagueRepository.findById(division.leagueId);
        const season = await seasonRepository.findById(division.seasonId);
        if (!league || !season) continue;
        out.push({
          leagueId: league.externalLeagueId,
          seasonId: season.externalSeasonId,
          divisionId: division.externalDivisionId,
          seasonName: season.name,
          divisionName: division.name,
        });
      }
      return out.filter((s) => PILOT_LEAGUE_EXTERNAL_IDS.includes(s.leagueId));
    };

    const [teamSeasons, opponentSeasons] = await Promise.all([seasonsFor(team.id), seasonsFor(opponent.id)]);
    if (teamSeasons.length === 0 && opponentSeasons.length === 0) {
      res.json({ success: true, data: { supported: false, pilotLeagueExternalIds: PILOT_LEAGUE_EXTERNAL_IDS } });
      return;
    }

    // Always read the pages of the team with the lower Spawtz id (when it has Battersea
    // seasons), so A v B and B v A share the same cached pages. Flip the view if needed.
    const teamFirst =
      teamSeasons.length > 0 &&
      (opponentSeasons.length === 0 || team.externalTeamId <= opponent.externalTeamId);
    const base = teamFirst ? team : opponent;
    const other = teamFirst ? opponent : team;
    const baseSeasons = teamFirst ? teamSeasons : opponentSeasons;

    const result = await getHeadToHead(base.externalTeamId, other.externalTeamId, baseSeasons);
    const data = teamFirst ? result : { ...invertHeadToHead(result), complete: result.complete, failedSeasons: result.failedSeasons, busy: result.busy, pilotLeagueExternalIds: result.pilotLeagueExternalIds };
    res.json({ success: true, data: { supported: true, ...data } });
  } catch (err) {
    logger.error({ err }, 'Head-to-head failed');
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load head-to-head' } });
  }
});

// GET /api/v1/teams/:id/standings - Get team standings across divisions
router.get('/:id/standings', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const standings = await standingRepository.findByTeam(id);

  res.json({
    success: true,
    data: standings,
    meta: { total: standings.length },
  });
});

// GET /api/v1/teams/:id/fixtures - Get team fixtures
router.get('/:id/fixtures', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const fixtures = await fixtureRepository.findByTeam(id);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

// GET /api/v1/teams/:id/fixtures/upcoming - Get upcoming team fixtures
router.get('/:id/fixtures/upcoming', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const fixtures = await fixtureRepository.findUpcoming(id, limit);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

// GET /api/v1/teams/:id/fixtures/results - Get team results
router.get('/:id/fixtures/results', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const fixtures = await fixtureRepository.findRecent(id, limit);

  res.json({
    success: true,
    data: fixtures,
    meta: { total: fixtures.length },
  });
});

export { router as teamsRouter };
