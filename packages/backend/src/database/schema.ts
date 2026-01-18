import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

// ===========
// Core Tables
// ===========

export const regions = pgTable(
  'regions',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('regions_name_idx').on(table.name),
  })
);

export const leagues = pgTable(
  'leagues',
  {
    id: serial('id').primaryKey(),
    externalLeagueId: integer('external_league_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    regionId: integer('region_id').references(() => regions.id),
    venueName: varchar('venue_name', { length: 255 }),
    dayOfWeek: varchar('day_of_week', { length: 50 }),
    format: varchar('format', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    externalIdIdx: uniqueIndex('leagues_external_id_idx').on(table.externalLeagueId),
  })
);

export const seasons = pgTable(
  'seasons',
  {
    id: serial('id').primaryKey(),
    externalSeasonId: integer('external_season_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    isCurrent: boolean('is_current').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    externalIdIdx: uniqueIndex('seasons_external_id_idx').on(table.externalSeasonId),
  })
);

export const divisions = pgTable(
  'divisions',
  {
    id: serial('id').primaryKey(),
    externalDivisionId: integer('external_division_id').notNull(),
    leagueId: integer('league_id')
      .references(() => leagues.id)
      .notNull(),
    seasonId: integer('season_id')
      .references(() => seasons.id)
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    tier: integer('tier'),
    lastScrapedAt: timestamp('last_scraped_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueIdx: uniqueIndex('divisions_unique_idx').on(
      table.externalDivisionId,
      table.leagueId,
      table.seasonId
    ),
  })
);

export const teams = pgTable(
  'teams',
  {
    id: serial('id').primaryKey(),
    externalTeamId: integer('external_team_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    externalIdIdx: uniqueIndex('teams_external_id_idx').on(table.externalTeamId),
  })
);

export const players = pgTable(
  'players',
  {
    id: serial('id').primaryKey(),
    externalPlayerId: integer('external_player_id'),
    name: varchar('name', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('players_name_idx').on(table.name),
    externalIdIdx: uniqueIndex('players_external_id_idx').on(table.externalPlayerId),
  })
);

export const fixtures = pgTable(
  'fixtures',
  {
    id: serial('id').primaryKey(),
    externalFixtureId: integer('external_fixture_id'),
    divisionId: integer('division_id')
      .references(() => divisions.id)
      .notNull(),
    homeTeamId: integer('home_team_id')
      .references(() => teams.id)
      .notNull(),
    awayTeamId: integer('away_team_id')
      .references(() => teams.id)
      .notNull(),
    fixtureDate: timestamp('fixture_date').notNull(),
    fixtureTime: varchar('fixture_time', { length: 50 }),
    pitch: varchar('pitch', { length: 255 }),
    roundNumber: integer('round_number'),
    homeScore: integer('home_score'),
    awayScore: integer('away_score'),
    status: text('status', { enum: ['scheduled', 'completed', 'postponed'] }).notNull(),
    isForfeit: boolean('is_forfeit').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueIdx: uniqueIndex('fixtures_unique_idx').on(
      table.divisionId,
      table.homeTeamId,
      table.awayTeamId,
      table.fixtureDate
    ),
  })
);

export const standings = pgTable(
  'standings',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .references(() => teams.id)
      .notNull(),
    divisionId: integer('division_id')
      .references(() => divisions.id)
      .notNull(),
    position: integer('position').notNull(),
    played: integer('played').notNull(),
    wins: integer('wins').notNull(),
    losses: integer('losses').notNull(),
    draws: integer('draws').notNull(),
    forfeitsFor: integer('forfeits_for').notNull(),
    forfeitsAgainst: integer('forfeits_against').notNull(),
    pointsFor: integer('points_for').notNull(),
    pointsAgainst: integer('points_against').notNull(),
    pointDifference: integer('point_difference').notNull(),
    bonusPoints: integer('bonus_points').notNull(),
    totalPoints: integer('total_points').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueIdx: uniqueIndex('standings_unique_idx').on(table.teamId, table.divisionId),
  })
);

export const playerAwards = pgTable(
  'player_awards',
  {
    id: serial('id').primaryKey(),
    playerId: integer('player_id')
      .references(() => players.id)
      .notNull(),
    teamId: integer('team_id')
      .references(() => teams.id)
      .notNull(),
    divisionId: integer('division_id')
      .references(() => divisions.id)
      .notNull(),
    fixtureId: integer('fixture_id').references(() => fixtures.id),
    awardType: varchar('award_type', { length: 50 }).notNull(),
    awardCount: integer('award_count').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqueIdx: uniqueIndex('player_awards_unique_idx').on(
      table.playerId,
      table.divisionId,
      table.awardType
    ),
  })
);

// ===================
// Junction/Pivot Tables
// ===================

export const teamDivisions = pgTable(
  'team_divisions',
  {
    teamId: integer('team_id')
      .references(() => teams.id)
      .notNull(),
    divisionId: integer('division_id')
      .references(() => divisions.id)
      .notNull(),
  },
  (table) => ({
    pk: primaryKey(table.teamId, table.divisionId),
  })
);

export const playerTeams = pgTable(
  'player_teams',
  {
    playerId: integer('player_id')
      .references(() => players.id)
      .notNull(),
    teamId: integer('team_id')
      .references(() => teams.id)
      .notNull(),
    divisionId: integer('division_id')
      .references(() => divisions.id)
      .notNull(),
  },
  (table) => ({
    pk: primaryKey(table.playerId, table.teamId, table.divisionId),
  })
);

// =======================
// Relations
// =======================

export const regionRelations = relations(regions, ({ one, many }) => ({
  leagues: many(leagues),
}));

export const leagueRelations = relations(leagues, ({ one, many }) => ({
  region: one(regions, {
    fields: [leagues.regionId],
    references: [regions.id],
  }),
  divisions: many(divisions),
}));

export const seasonRelations = relations(seasons, ({ many }) => ({
  divisions: many(divisions),
}));

export const divisionRelations = relations(divisions, ({ one, many }) => ({
  league: one(leagues, {
    fields: [divisions.leagueId],
    references: [leagues.id],
  }),
  season: one(seasons, {
    fields: [divisions.seasonId],
    references: [seasons.id],
  }),
  standings: many(standings),
  fixtures: many(fixtures),
  playerAwards: many(playerAwards),
  teamDivisions: many(teamDivisions),
  playerTeams: many(playerTeams),
}));

export const teamRelations = relations(teams, ({ many }) => ({
  standings: many(standings),
  homeFixtures: many(fixtures, { relationName: 'home_team' }),
  awayFixtures: many(fixtures, { relationName: 'away_team' }),
  playerAwards: many(playerAwards),
  teamDivisions: many(teamDivisions),
  playerTeams: many(playerTeams),
}));

export const playerRelations = relations(players, ({ many }) => ({
  playerAwards: many(playerAwards),
  playerTeams: many(playerTeams),
}));

export const fixtureRelations = relations(fixtures, ({ one, many }) => ({
  division: one(divisions, {
    fields: [fixtures.divisionId],
    references: [divisions.id],
  }),
  homeTeam: one(teams, {
    fields: [fixtures.homeTeamId],
    references: [teams.id],
    relationName: 'home_team',
  }),
  awayTeam: one(teams, {
    fields: [fixtures.awayTeamId],
    references: [teams.id],
    relationName: 'away_team',
  }),
  playerAwards: many(playerAwards),
}));

export const standingRelations = relations(standings, ({ one }) => ({
  team: one(teams, {
    fields: [standings.teamId],
    references: [teams.id],
  }),
  division: one(divisions, {
    fields: [standings.divisionId],
    references: [divisions.id],
  }),
}));

export const playerAwardRelations = relations(playerAwards, ({ one }) => ({
  player: one(players, {
    fields: [playerAwards.playerId],
    references: [players.id],
  }),
  team: one(teams, {
    fields: [playerAwards.teamId],
    references: [teams.id],
  }),
  division: one(divisions, {
    fields: [playerAwards.divisionId],
    references: [divisions.id],
  }),
  fixture: one(fixtures, {
    fields: [playerAwards.fixtureId],
    references: [fixtures.id],
  }),
}));

export const teamDivisionRelations = relations(teamDivisions, ({ one }) => ({
  team: one(teams, {
    fields: [teamDivisions.teamId],
    references: [teams.id],
  }),
  division: one(divisions, {
    fields: [teamDivisions.divisionId],
    references: [divisions.id],
  }),
}));

export const playerTeamRelations = relations(playerTeams, ({ one }) => ({
  player: one(players, {
    fields: [playerTeams.playerId],
    references: [players.id],
  }),
  team: one(teams, {
    fields: [playerTeams.teamId],
    references: [teams.id],
  }),
  division: one(divisions, {
    fields: [playerTeams.divisionId],
    references: [divisions.id],
  }),
}));