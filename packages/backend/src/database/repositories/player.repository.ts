import { getDatabase } from '../connection.js';
import type { Player } from '@trytag/shared';

interface PlayerRow {
  id: number;
  external_player_id: number | null;
  name: string;
  created_at: string;
  updated_at: string;
}

function rowToPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    externalPlayerId: row.external_player_id,
    name: row.name,
  };
}

export const playerRepository = {
  findAll(): Player[] {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM players ORDER BY name').all() as PlayerRow[];
    return rows.map(rowToPlayer);
  },

  findById(id: number): Player | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM players WHERE id = ?').get(id) as PlayerRow | undefined;
    return row ? rowToPlayer(row) : null;
  },

  findByName(name: string): Player | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM players WHERE name = ?').get(name) as PlayerRow | undefined;
    return row ? rowToPlayer(row) : null;
  },

  upsert(name: string, externalPlayerId?: number): Player {
    const db = getDatabase();
    
    // Check if player exists by external ID (if provided)
    if (externalPlayerId) {
        const existingByExtId = db.prepare('SELECT * FROM players WHERE external_player_id = ?').get(externalPlayerId) as PlayerRow | undefined;
        if (existingByExtId) {
            // Update name if changed? Maybe.
            if (existingByExtId.name !== name) {
                db.prepare('UPDATE players SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, existingByExtId.id);
                return { ...rowToPlayer(existingByExtId), name };
            }
            return rowToPlayer(existingByExtId);
        }
    }

    // Check if player exists by name (deduplication strategy)
    const existingByName = db.prepare('SELECT * FROM players WHERE name = ?').get(name) as PlayerRow | undefined;
    if (existingByName) {
        // If we have an external ID now but didn't before, update it
        if (externalPlayerId && existingByName.external_player_id !== externalPlayerId) {
             db.prepare('UPDATE players SET external_player_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
               .run(externalPlayerId, existingByName.id);
             return { ...rowToPlayer(existingByName), externalPlayerId };
        }
        return rowToPlayer(existingByName);
    }

    // Create new player
    const stmt = db.prepare('INSERT INTO players (name, external_player_id) VALUES (?, ?) RETURNING *');
    const row = stmt.get(name, externalPlayerId || null) as PlayerRow;
    return rowToPlayer(row);
  },
};