import { z } from 'zod';

// ============================================
// REGION & LEAGUE SCHEMAS
// ============================================

export const RegionSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const LeagueSchema = z.object({
  id: z.number(),
  externalLeagueId: z.number(),
  name: z.string(),
  regionId: z.number(),
  venueName: z.string().nullable(),
  dayOfWeek: z.string().nullable(),
  format: z.string().nullable(),
});

export const SeasonSchema = z.object({
  id: z.number(),
  externalSeasonId: z.number(),
  name: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isCurrent: z.boolean(),
});

export const DivisionSchema = z.object({
  id: z.number(),
  externalDivisionId: z.number(),
  leagueId: z.number(),
  seasonId: z.number(),
  name: z.string(),
  tier: z.number().nullable(),
});

// ============================================
// TEAM SCHEMAS
// ============================================

export const TeamSchema = z.object({
  id: z.number(),
  externalTeamId: z.number(),
  name: z.string(),
});

// ============================================
// STANDINGS SCHEMAS
// ============================================

export const StandingSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  divisionId: z.number(),
  position: z.number(),
  played: z.number(),
  wins: z.number(),
  losses: z.number(),
  draws: z.number(),
  forfeitsFor: z.number(),
  forfeitsAgainst: z.number(),
  pointsFor: z.number(),
  pointsAgainst: z.number(),
  pointDifference: z.number(),
  bonusPoints: z.number(),
  totalPoints: z.number(),
});

export const StandingWithTeamSchema = StandingSchema.extend({
  team: TeamSchema,
});

// ============================================
// FIXTURE SCHEMAS
// ============================================

export const FixtureStatusSchema = z.enum([
  'scheduled',
  'completed',
  'postponed',
  'cancelled',
  'live',
]);

export const FixtureSchema = z.object({
  id: z.number(),
  externalFixtureId: z.number().nullable(),
  divisionId: z.number(),
  homeTeamId: z.number(),
  awayTeamId: z.number(),
  fixtureDate: z.string(),
  fixtureTime: z.string().nullable(),
  pitch: z.string().nullable(),
  roundNumber: z.number().nullable(),
  homeScore: z.number().nullable(),
  awayScore: z.number().nullable(),
  status: FixtureStatusSchema,
  isForfeit: z.boolean(),
});

export const FixtureWithTeamsSchema = FixtureSchema.extend({
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
});

// ============================================
// STATISTICS SCHEMAS
// ============================================

export const PlayerSchema = z.object({
  id: z.number(),
  externalPlayerId: z.number().nullable(),
  name: z.string(),
});

export const PlayerAwardSchema = z.object({
  id: z.number(),
  playerId: z.number(),
  teamId: z.number(),
  divisionId: z.number(),
  fixtureId: z.number().nullable(),
  awardType: z.string(),
  awardCount: z.number(),
});

export const PlayerAwardWithDetailsSchema = PlayerAwardSchema.extend({
  player: PlayerSchema,
  team: TeamSchema,
});

export const PlayerStatisticsSchema = z.object({
  id: z.number(),
  playerId: z.number(),
  teamId: z.number(),
  divisionId: z.number(),
  totalPomAwards: z.number(),
  totalTries: z.number(),
  gamesPlayed: z.number(),
});

// ============================================
// API RESPONSE SCHEMAS
// ============================================

export const ApiMetaSchema = z.object({
  total: z.number().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
  lastUpdated: z.string().optional(),
});

export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: ApiMetaSchema.optional(),
  });
}

export const ApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

// ============================================
// SCRAPER VALIDATION SCHEMAS
// ============================================

export const ScrapedLeagueListItemSchema = z.object({
  leagueId: z.number(),
  seasonId: z.number(),
  divisionId: z.number(),
  leagueName: z.string(),
  seasonName: z.string(),
  divisionName: z.string(),
  region: z.string(),
});

export const ScrapedStandingRowSchema = z.object({
  position: z.number(),
  teamId: z.number(),
  teamName: z.string(),
  played: z.number(),
  wins: z.number(),
  losses: z.number(),
  draws: z.number(),
  forfeitsFor: z.number(),
  forfeitsAgainst: z.number(),
  pointsFor: z.number(),
  pointsAgainst: z.number(),
  pointDifference: z.number(),
  bonusPoints: z.number(),
  totalPoints: z.number(),
});

export const ScrapedFixtureSchema = z.object({
  fixtureId: z.number().optional(),
  date: z.string(),
  time: z.string().nullable(),
  pitch: z.string().nullable(),
  round: z.number().optional(),
  homeTeamId: z.number(),
  homeTeamName: z.string(),
  awayTeamId: z.number(),
  awayTeamName: z.string(),
  homeScore: z.number().nullable(),
  awayScore: z.number().nullable(),
  status: FixtureStatusSchema,
});

export const ScrapedPlayerAwardSchema = z.object({
  playerName: z.string(),
  teamName: z.string(),
  teamId: z.number().optional(),
  awardCount: z.number(),
  awardType: z.string(),
});

export const TeamPositionHistorySchema = z.object({
  week: z.number(),
  position: z.number(),
});

export const TeamSeasonStatsSchema = z.object({
  period: z.enum(['last3', 'season', 'allTime']),
  avgScored: z.number(),
  avgConceded: z.number(),
  avgPoints: z.number(),
  biggestWin: z.string().nullable(),
  biggestLoss: z.string().nullable(),
});

export const TeamPreviousSeasonSchema = z.object({
  leagueName: z.string(),
  seasonName: z.string(),
  divisionName: z.string(),
  leagueId: z.number().optional(),
  seasonId: z.number().optional(),
  divisionId: z.number().optional(),
});

export const ScrapedTeamProfileSchema = z.object({
  teamId: z.number(),
  teamName: z.string(),
  positionHistory: z.array(TeamPositionHistorySchema),
  seasonStats: z.array(TeamSeasonStatsSchema),
  previousSeasons: z.array(TeamPreviousSeasonSchema),
  playerAwards: z.array(ScrapedPlayerAwardSchema),
});

// ============================================
// ARRAY SCHEMAS FOR API RESPONSES
// ============================================

export const RegionsResponseSchema = createApiResponseSchema(z.array(RegionSchema));
export const LeaguesResponseSchema = createApiResponseSchema(z.array(LeagueSchema));
export const SeasonsResponseSchema = createApiResponseSchema(z.array(SeasonSchema));
export const DivisionsResponseSchema = createApiResponseSchema(z.array(DivisionSchema));
export const TeamsResponseSchema = createApiResponseSchema(z.array(TeamSchema));
export const StandingsResponseSchema = createApiResponseSchema(z.array(StandingWithTeamSchema));
export const FixturesResponseSchema = createApiResponseSchema(z.array(FixtureWithTeamsSchema));
export const PlayerAwardsResponseSchema = createApiResponseSchema(z.array(PlayerAwardWithDetailsSchema));

// ============================================
// TYPE EXPORTS FROM SCHEMAS
// ============================================

export type RegionInput = z.infer<typeof RegionSchema>;
export type LeagueInput = z.infer<typeof LeagueSchema>;
export type SeasonInput = z.infer<typeof SeasonSchema>;
export type DivisionInput = z.infer<typeof DivisionSchema>;
export type TeamInput = z.infer<typeof TeamSchema>;
export type StandingInput = z.infer<typeof StandingSchema>;
export type FixtureInput = z.infer<typeof FixtureSchema>;
export type PlayerInput = z.infer<typeof PlayerSchema>;
export type PlayerAwardInput = z.infer<typeof PlayerAwardSchema>;
export type ScrapedLeagueListItemInput = z.infer<typeof ScrapedLeagueListItemSchema>;
export type ScrapedStandingRowInput = z.infer<typeof ScrapedStandingRowSchema>;
export type ScrapedFixtureInput = z.infer<typeof ScrapedFixtureSchema>;
export type ScrapedPlayerAwardInput = z.infer<typeof ScrapedPlayerAwardSchema>;
