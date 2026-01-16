import { getDatabase } from '../connection.js';
import type { PlayerAward, PlayerAwardWithDetails } from '@trytag/shared';

interface PlayerAwardRow {
  id: number;
  player_id: number;
  team_id: number;
  division_id: number;
  fixture_id: number | null;
  award_type: string;
  award_count: number;
  created_at: string;
}

interface PlayerAwardWithDetailsRow extends PlayerAwardRow {
  player_name: string;
  external_player_id: number | null;
  team_name: string;
  external_team_id: number;
}

function rowToPlayerAward(row: PlayerAwardRow): PlayerAward {
  return {
    id: row.id,
    playerId: row.player_id,
    teamId: row.team_id,
    divisionId: row.division_id,
    fixtureId: row.fixture_id,
    awardType: row.award_type,
    awardCount: row.award_count,
  };
}

function rowToPlayerAwardWithDetails(row: PlayerAwardWithDetailsRow): PlayerAwardWithDetails {
  return {
    ...rowToPlayerAward(row),
    player: {
        id: row.player_id,
        externalPlayerId: row.external_player_id,
        name: row.player_name
    },
    team: {
        id: row.team_id,
        externalTeamId: row.external_team_id,
        name: row.team_name
    }
  };
}

export const playerAwardRepository = {
  findByDivision(divisionId: number): PlayerAwardWithDetails[] {
    const db = getDatabase();
    const rows = db.prepare(`
        SELECT pa.*,
               p.name as player_name, p.external_player_id,
               t.name as team_name, t.external_team_id
        FROM player_awards pa
        INNER JOIN players p ON pa.player_id = p.id
        INNER JOIN teams t ON pa.team_id = t.id
        WHERE pa.division_id = ?
        ORDER BY pa.award_count DESC, p.name ASC
    `).all(divisionId) as PlayerAwardWithDetailsRow[];

    return rows.map(rowToPlayerAwardWithDetails);
  },

  findByDivisionIds(divisionIds: number[]): PlayerAwardWithDetails[] {
    if (divisionIds.length === 0) return [];
    const db = getDatabase();
    const placeholders = divisionIds.map(() => '?').join(',');
    const rows = db.prepare(`
        SELECT pa.*,
               p.name as player_name, p.external_player_id,
               t.name as team_name, t.external_team_id
        FROM player_awards pa
        INNER JOIN players p ON pa.player_id = p.id
        INNER JOIN teams t ON pa.team_id = t.id
        WHERE pa.division_id IN (${placeholders})
        ORDER BY pa.division_id, pa.award_count DESC, p.name ASC
    `).all(...divisionIds) as PlayerAwardWithDetailsRow[];

    return rows.map(rowToPlayerAwardWithDetails);
  },

  findByTeam(teamId: number): PlayerAwardWithDetails[] {
    const db = getDatabase();
    const rows = db.prepare(`
        SELECT pa.*,
               p.name as player_name, p.external_player_id,
               t.name as team_name, t.external_team_id
        FROM player_awards pa
        INNER JOIN players p ON pa.player_id = p.id
        INNER JOIN teams t ON pa.team_id = t.id
        WHERE pa.team_id = ?
        ORDER BY pa.award_count DESC, p.name ASC
    `).all(teamId) as PlayerAwardWithDetailsRow[];

    return rows.map(rowToPlayerAwardWithDetails);
  },

  upsert(data: Omit<PlayerAward, 'id'>): PlayerAward {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO player_awards (player_id, team_id, division_id, fixture_id, award_type, award_count)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(player_id, division_id, award_type) DO UPDATE SET
        award_count = excluded.award_count,
        team_id = excluded.team_id,
        fixture_id = excluded.fixture_id
      RETURNING *
    `);
    
    const row = stmt.get(
      data.playerId,
      data.teamId,
      data.divisionId,
      data.fixtureId,
      data.awardType,
      data.awardCount
    ) as PlayerAwardRow;
    
    return rowToPlayerAward(row);
  },
};
