import { getDatabase } from '../connection.js';
import type { PlayerAward, PlayerAwardWithDetails } from '@trytag/shared';
import type { Row } from '@libsql/client';

function rowToPlayerAward(row: Row): PlayerAward {
  return {
    id: row.id as number,
    playerId: row.player_id as number,
    teamId: row.team_id as number,
    divisionId: row.division_id as number,
    fixtureId: row.fixture_id as number | null,
    awardType: row.award_type as string,
    awardCount: row.award_count as number,
  };
}

function rowToPlayerAwardWithDetails(row: Row): PlayerAwardWithDetails {
  return {
    ...rowToPlayerAward(row),
    player: {
      id: row.player_id as number,
      externalPlayerId: row.external_player_id as number | null,
      name: row.player_name as string,
    },
    team: {
      id: row.team_id as number,
      externalTeamId: row.external_team_id as number,
      name: row.team_name as string,
    },
  };
}

export const playerAwardRepository = {
  async findByDivision(divisionId: number): Promise<PlayerAwardWithDetails[]> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        SELECT pa.*,
               p.name as player_name, p.external_player_id,
               t.name as team_name, t.external_team_id
        FROM player_awards pa
        INNER JOIN players p ON pa.player_id = p.id
        INNER JOIN teams t ON pa.team_id = t.id
        WHERE pa.division_id = ?
        ORDER BY pa.award_count DESC, p.name ASC
      `,
      args: [divisionId],
    });
    return result.rows.map(rowToPlayerAwardWithDetails);
  },

  async findByDivisionIds(divisionIds: number[]): Promise<PlayerAwardWithDetails[]> {
    if (divisionIds.length === 0) return [];
    const db = getDatabase();
    const placeholders = divisionIds.map(() => '?').join(',');
    const result = await db.execute({
      sql: `
        SELECT pa.*,
               p.name as player_name, p.external_player_id,
               t.name as team_name, t.external_team_id
        FROM player_awards pa
        INNER JOIN players p ON pa.player_id = p.id
        INNER JOIN teams t ON pa.team_id = t.id
        WHERE pa.division_id IN (${placeholders})
        ORDER BY pa.division_id, pa.award_count DESC, p.name ASC
      `,
      args: divisionIds,
    });
    return result.rows.map(rowToPlayerAwardWithDetails);
  },

  async findByTeam(teamId: number): Promise<PlayerAwardWithDetails[]> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        SELECT pa.*,
               p.name as player_name, p.external_player_id,
               t.name as team_name, t.external_team_id
        FROM player_awards pa
        INNER JOIN players p ON pa.player_id = p.id
        INNER JOIN teams t ON pa.team_id = t.id
        WHERE pa.team_id = ?
        ORDER BY pa.award_count DESC, p.name ASC
      `,
      args: [teamId],
    });
    return result.rows.map(rowToPlayerAwardWithDetails);
  },

  async upsert(data: Omit<PlayerAward, 'id'>): Promise<PlayerAward> {
    const db = getDatabase();
    const result = await db.execute({
      sql: `
        INSERT INTO player_awards (player_id, team_id, division_id, fixture_id, award_type, award_count)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(player_id, division_id, award_type) DO UPDATE SET
          award_count = excluded.award_count,
          team_id = excluded.team_id,
          fixture_id = excluded.fixture_id
        RETURNING *
      `,
      args: [
        data.playerId,
        data.teamId,
        data.divisionId,
        data.fixtureId,
        data.awardType,
        data.awardCount,
      ],
    });
    return rowToPlayerAward(result.rows[0]);
  },
};
