import { getDatabase } from './connection.js';
import { logger } from '../utils/logger.js';

export async function initializeSchema(): Promise<void> {
  const db = getDatabase();

  logger.info('Initializing database schema...');

  // Split schema into individual statements for libSQL batch execution
  const statements = [
    // REFERENCE DATA TABLES
    `CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS leagues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_league_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      region_id INTEGER REFERENCES regions(id),
      venue_name TEXT,
      day_of_week TEXT,
      format TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_season_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      start_date DATE,
      end_date DATE,
      is_current INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS divisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_division_id INTEGER NOT NULL,
      league_id INTEGER NOT NULL REFERENCES leagues(id),
      season_id INTEGER NOT NULL REFERENCES seasons(id),
      name TEXT NOT NULL,
      tier INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_scraped_at DATETIME,
      UNIQUE(external_division_id, league_id, season_id)
    )`,

    // TEAM DATA
    `CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_team_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS team_divisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      division_id INTEGER NOT NULL REFERENCES divisions(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, division_id)
    )`,

    // STANDINGS DATA
    `CREATE TABLE IF NOT EXISTS standings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id),
      division_id INTEGER NOT NULL REFERENCES divisions(id),
      position INTEGER NOT NULL,
      played INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      forfeits_for INTEGER DEFAULT 0,
      forfeits_against INTEGER DEFAULT 0,
      points_for INTEGER DEFAULT 0,
      points_against INTEGER DEFAULT 0,
      point_difference INTEGER DEFAULT 0,
      bonus_points INTEGER DEFAULT 0,
      total_points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(team_id, division_id)
    )`,

    // FIXTURES DATA
    `CREATE TABLE IF NOT EXISTS fixtures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_fixture_id INTEGER,
      division_id INTEGER NOT NULL REFERENCES divisions(id),
      home_team_id INTEGER NOT NULL REFERENCES teams(id),
      away_team_id INTEGER NOT NULL REFERENCES teams(id),
      fixture_date DATE NOT NULL,
      fixture_time TIME,
      pitch TEXT,
      round_number INTEGER,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT DEFAULT 'scheduled',
      is_forfeit INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(division_id, home_team_id, away_team_id, fixture_date)
    )`,

    // STATISTICS/AWARDS DATA
    `CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_player_id INTEGER,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS player_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id),
      team_id INTEGER NOT NULL REFERENCES teams(id),
      division_id INTEGER NOT NULL REFERENCES divisions(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, team_id, division_id)
    )`,

    `CREATE TABLE IF NOT EXISTS player_awards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id),
      team_id INTEGER NOT NULL REFERENCES teams(id),
      division_id INTEGER NOT NULL REFERENCES divisions(id),
      fixture_id INTEGER REFERENCES fixtures(id),
      award_type TEXT NOT NULL,
      award_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, division_id, award_type)
    )`,

    // SCRAPING METADATA
    `CREATE TABLE IF NOT EXISTS scrape_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_type TEXT NOT NULL,
      target_id INTEGER,
      status TEXT DEFAULT 'pending',
      started_at DATETIME,
      completed_at DATETIME,
      error_message TEXT,
      items_processed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // INDEXES
    `CREATE INDEX IF NOT EXISTS idx_leagues_region ON leagues(region_id)`,
    `CREATE INDEX IF NOT EXISTS idx_divisions_league ON divisions(league_id)`,
    `CREATE INDEX IF NOT EXISTS idx_divisions_season ON divisions(season_id)`,
    `CREATE INDEX IF NOT EXISTS idx_standings_division ON standings(division_id)`,
    `CREATE INDEX IF NOT EXISTS idx_standings_team ON standings(team_id)`,
    `CREATE INDEX IF NOT EXISTS idx_fixtures_division ON fixtures(division_id)`,
    `CREATE INDEX IF NOT EXISTS idx_fixtures_date ON fixtures(fixture_date)`,
    `CREATE INDEX IF NOT EXISTS idx_fixtures_home_team ON fixtures(home_team_id)`,
    `CREATE INDEX IF NOT EXISTS idx_fixtures_away_team ON fixtures(away_team_id)`,
    `CREATE INDEX IF NOT EXISTS idx_player_awards_player ON player_awards(player_id)`,
    `CREATE INDEX IF NOT EXISTS idx_player_awards_division ON player_awards(division_id)`,
  ];

  await db.batch(statements);

  logger.info('Database schema initialized');
}
