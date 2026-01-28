import { getDatabase } from '../connection.js';
import type { Player } from '@trytag/shared';
import type { Row } from '@libsql/client';

function rowToPlayer(row: Row): Player {
  return {
    id: row.id as number,
    externalPlayerId: row.external_player_id as number | null,
    name: row.name as string,
  };
}

export const playerRepository = {
  async findAll(): Promise<Player[]> {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM players ORDER BY name');
    return result.rows.map(rowToPlayer);
  },

  async findById(id: number): Promise<Player | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM players WHERE id = ?',
      args: [id],
    });
    return result.rows[0] ? rowToPlayer(result.rows[0]) : null;
  },

  async findByName(name: string): Promise<Player | null> {
    const db = getDatabase();
    const result = await db.execute({
      sql: 'SELECT * FROM players WHERE name = ?',
      args: [name],
    });
    return result.rows[0] ? rowToPlayer(result.rows[0]) : null;
  },

  async upsert(name: string, externalPlayerId?: number): Promise<Player> {
    const db = getDatabase();

    // Check if player exists by external ID (if provided)
    if (externalPlayerId) {
      const existingByExtIdResult = await db.execute({
        sql: 'SELECT * FROM players WHERE external_player_id = ?',
        args: [externalPlayerId],
      });
      const existingByExtId = existingByExtIdResult.rows[0];
      if (existingByExtId) {
        // Update name if changed
        if (existingByExtId.name !== name) {
          await db.execute({
            sql: 'UPDATE players SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            args: [name, existingByExtId.id],
          });
          return { ...rowToPlayer(existingByExtId), name };
        }
        return rowToPlayer(existingByExtId);
      }
    }

    // Check if player exists by name (deduplication strategy)
    const existingByNameResult = await db.execute({
      sql: 'SELECT * FROM players WHERE name = ?',
      args: [name],
    });
    const existingByName = existingByNameResult.rows[0];
    if (existingByName) {
      // If we have an external ID now but didn't before, update it
      if (externalPlayerId && existingByName.external_player_id !== externalPlayerId) {
        await db.execute({
          sql: 'UPDATE players SET external_player_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [externalPlayerId, existingByName.id],
        });
        return { ...rowToPlayer(existingByName), externalPlayerId };
      }
      return rowToPlayer(existingByName);
    }

    // Create new player
    const result = await db.execute({
      sql: 'INSERT INTO players (name, external_player_id) VALUES (?, ?) RETURNING *',
      args: [name, externalPlayerId || null],
    });
    return rowToPlayer(result.rows[0]);
  },
};
