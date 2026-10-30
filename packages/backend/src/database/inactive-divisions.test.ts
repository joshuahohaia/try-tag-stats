import { describe, it, expect, beforeAll, vi } from 'vitest';

// Always use a throwaway local database, never a configured remote one.
vi.hoisted(() => {
  process.env.TURSO_DATABASE_URL = 'file:./data/test-inactive-divisions.db';
  process.env.TURSO_AUTH_TOKEN = '';
});

import { getDatabase } from './connection.js';
import { initializeSchema } from './schema.js';
import { syncRunRepository } from './repositories/sync-run.repository.js';
import {
  leagueRepository,
  seasonRepository,
  divisionRepository,
} from './repositories/index.js';

describe('inactive divisions and current season', () => {
  beforeAll(async () => {
    await initializeSchema();
  });

  it('hides unseen leagues reversibly and keeps history rows', async () => {
    const oldLeague = await leagueRepository.upsert({ externalLeagueId: 90001, name: 'Old League' });
    const newLeague = await leagueRepository.upsert({ externalLeagueId: 90002, name: 'New League' });
    const s1 = await seasonRepository.upsert({ externalSeasonId: 98001, name: 'Summer 2026' });
    const s2 = await seasonRepository.upsert({ externalSeasonId: 98002, name: 'Autumn 2026' });
    const dOld = await divisionRepository.upsert({ externalDivisionId: 1, leagueId: oldLeague.id, seasonId: s1.id, name: 'Division 1' });
    await divisionRepository.upsert({ externalDivisionId: 2, leagueId: newLeague.id, seasonId: s2.id, name: 'Division 1' });

    const db = getDatabase();
    // Pretend the old division was last seen in an earlier sync
    await db.execute({ sql: "UPDATE divisions SET last_seen_at = '2000-01-01 00:00:00' WHERE id = ?", args: [dOld.id] });

    const hidden = await divisionRepository.markUnseenInactive('2026-01-01 00:00:00');
    expect(hidden).toBeGreaterThanOrEqual(1);

    const visible = (await leagueRepository.findAll()).map((l) => l.name);
    expect(visible).toContain('New League');
    expect(visible).not.toContain('Old League');
    const all = (await leagueRepository.findAll(true)).map((l) => l.name);
    expect(all).toContain('Old League');

    // Seen again by a later sync: visible again
    await divisionRepository.upsert({ externalDivisionId: 1, leagueId: oldLeague.id, seasonId: s1.id, name: 'Division 1' });
    expect((await leagueRepository.findAll()).map((l) => l.name)).toContain('Old League');

    expect(await seasonRepository.setCurrentByExternalId(98002)).toBe(true);
    expect((await seasonRepository.findCurrent())?.name).toBe('Autumn 2026');
    const countCurrent = async () =>
      Number((await db.execute('SELECT COUNT(*) AS n FROM seasons WHERE is_current = 1')).rows[0].n);
    expect(await countCurrent()).toBe(1);
    // Unknown season: no change, still exactly one current
    expect(await seasonRepository.setCurrentByExternalId(1234567)).toBe(false);
    expect((await seasonRepository.findCurrent())?.name).toBe('Autumn 2026');
    expect(await countCurrent()).toBe(1);
    // Re-upserting an old season (re-sync) must not steal the flag
    await seasonRepository.upsert({ externalSeasonId: 98001, name: 'Summer 2026' });
    expect(await countCurrent()).toBe(1);
    expect((await seasonRepository.findCurrent())?.name).toBe('Autumn 2026');
  });

  it('records sync runs and reports last success', async () => {
    const before = (await syncRunRepository.status()).lastSuccessAt;
    const failed = await syncRunRepository.start();
    await syncRunRepository.finish(failed, false, 0, 'boom');
    let st = await syncRunRepository.status();
    expect(st.lastSuccessAt).toBe(before); // a failed run never counts as success
    expect(st.lastAttemptStatus).toBe('failed');
    const good = await syncRunRepository.start();
    await syncRunRepository.finish(good, true, 10);
    st = await syncRunRepository.status();
    expect(st.lastAttemptStatus).toBe('success');
    expect(st.lastSuccessAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  });
});
