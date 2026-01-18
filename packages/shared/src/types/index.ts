// ============================================
// REGION & LEAGUE TYPES
// ============================================

export interface Region {
  id: number;
  name: string;
  slug: string;
}

export interface League {
  id: number;
  externalLeagueId: number;
  name: string;
  regionId: number;
  venueName: string | null;
  dayOfWeek: string | null;
  format: string | null;
}

export interface Season {
  id: number;
  externalSeasonId: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export interface Division {
  id: number;
  externalDivisionId: number;
  leagueId: number;
  seasonId: number;
  name: string;
  tier: number | null;
}

// ============================================
// TEAM TYPES
// ============================================

export interface Team {
  id: number;
  externalTeamId: number;
  name: string;
}

export interface TeamPositionHistory {
  week: number;
  position: number;
}

export interface TeamSeasonStats {
  period: 'last3' | 'season' | 'allTime';
  avgScored: number;
  avgConceded: number;
  avgPoints: number;
  biggestWin: string | null; // "10 - 0"
  biggestLoss: string | null; // "3 - 17"
}

export interface TeamPreviousSeason {
  leagueName: string;
  seasonName: string;
  divisionName: string;
  leagueId?: number;
  seasonId?: number;
  divisionId?: number;
}

export interface TeamProfile extends Team {
  currentDivision?: Division;
  currentStanding?: Standing;
  recentFixtures?: Fixture[];
  upcomingFixtures?: Fixture[];
  playerAwards?: PlayerAward[];
  positionHistory?: TeamPositionHistory[];
  seasonStats?: TeamSeasonStats[];
  previousSeasons?: TeamPreviousSeason[];
}

// ============================================
// STANDINGS TYPES
// ============================================

export interface Standing {
  id: number;
  teamId: number;
  divisionId: number;
  position: number;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  forfeitsFor: number;
  forfeitsAgainst: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  bonusPoints: number;
  totalPoints: number;
}

export interface StandingWithDivision extends Standing {
  divisionName: string;
  leagueId: number;
  leagueName: string;
  seasonName: string;
}

export interface StandingWithTeam extends Standing {
  team: Team;
  form?: string; // Last 5 results as "WWLDW" (oldest to newest)
}

// ============================================
// FIXTURE TYPES
// ============================================

export type FixtureStatus = 'scheduled' | 'completed' | 'postponed' | 'cancelled' | 'live';

export interface Fixture {
  id: number;
  externalFixtureId: number | null;
  divisionId: number;
  homeTeamId: number;
  awayTeamId: number;
  fixtureDate: string;
  fixtureTime: string | null;
  pitch: string | null;
  roundNumber: number | null;
  homeScore: number | null;
  awayScore: number | null;
  status: FixtureStatus;
  isForfeit: boolean;
}

export interface FixtureWithTeams extends Fixture {
  homeTeam: Team;
  awayTeam: Team;
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface Player {
  id: number;
  externalPlayerId: number | null;
  name: string;
}

export interface PlayerAward {
  id: number;
  playerId: number;
  teamId: number;
  divisionId: number;
  fixtureId: number | null;
  awardType: string;
  awardCount: number;
}

export interface PlayerAwardWithDetails extends PlayerAward {
  player: Player;
  team: Team;
}

export interface PlayerStatistics {
  id: number;
  playerId: number;
  teamId: number;
  divisionId: number;
  totalPomAwards: number;
  totalTries: number;
  gamesPlayed: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    lastUpdated?: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ============================================
// SCRAPER TYPES
// ============================================

export interface ScrapedLeagueListItem {
  leagueId: number;
  seasonId: number;
  divisionId: number;
  leagueName: string;
  seasonName: string;
  divisionName: string;
  region: string;
  externalId?: string;
}

export interface ScrapedStandingRow {
  position: number;
  teamId: number;
  teamName: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  forfeitsFor: number;
  forfeitsAgainst: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  bonusPoints: number;
  totalPoints: number;
}

export interface ScrapedFixture {
  fixtureId?: number;
  date: string;
  time: string | null;
  pitch: string | null;
  round?: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: FixtureStatus;
}

export interface ScrapedPlayerAward {
  playerName: string;
  teamName: string;
  teamId?: number;
  awardCount: number;
  awardType: string;
}

export interface ScrapedTeamProfile {
  teamId: number;
  teamName: string;
  positionHistory: TeamPositionHistory[];
  seasonStats: TeamSeasonStats[];
  previousSeasons: TeamPreviousSeason[];
  playerAwards: ScrapedPlayerAward[];
}

// ============================================
// CONSTANTS
// ============================================

export const BASE_URL = 'https://trytagrugby.spawtz.com';

export const ENDPOINTS = {
  LEAGUE_LIST: '/ActionController/LeagueList',
  STANDINGS: '/Leagues/Standings',
  FIXTURES: '/Leagues/Fixtures',
  STATISTICS: '/Leagues/Statistics',
  TEAM_PROFILE: '/Leagues/TeamProfile',
} as const;
