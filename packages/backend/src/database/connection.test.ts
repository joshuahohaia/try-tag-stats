import { describe, it, expect } from 'vitest';
import type { Client } from '@libsql/client';
import { isTransientConnectionError, retryTransient, retryReads } from './connection.js';

const dropped = () => Object.assign(new Error('fetch failed'), { cause: new Error('other side closed') });

function fakeClient(failures: number, error: Error) {
  const calls: string[] = [];
  let left = failures;
  const client = {
    execute: async (stmt: string | { sql: string }) => {
      calls.push(typeof stmt === 'string' ? stmt : stmt.sql);
      if (left-- > 0) throw error;
      return { rows: [] };
    },
  } as unknown as Client;
  return { client, calls };
}

describe('database connection retry', () => {
  it('recognises dropped connections only', () => {
    expect(isTransientConnectionError(dropped())).toBe(true);
    expect(isTransientConnectionError(new Error('SQLITE_ERROR: no such table'))).toBe(false);
    expect(isTransientConnectionError(new Error('Unauthorized: 401'))).toBe(false);
  });

  it('retryTransient succeeds after transient errors and gives up when exhausted', async () => {
    let calls = 0;
    expect(await retryTransient(async () => { if (++calls < 3) throw dropped(); return 'ok'; }, [1, 1, 1])).toBe('ok');
    calls = 0;
    await expect(retryTransient(async () => { calls++; throw dropped(); }, [1, 1])).rejects.toThrow('fetch failed');
    expect(calls).toBe(3);
  });

  it('retries reads on a dropped connection', async () => {
    const { client, calls } = fakeClient(2, dropped());
    await retryReads(client, 60000, [1, 1, 1]).execute({ sql: 'SELECT * FROM seasons', args: [] });
    expect(calls).toHaveLength(3);
  });

  it('never replays writes', async () => {
    for (const sql of ['INSERT INTO seasons (name) VALUES (1)', 'UPDATE seasons SET name = 1', 'DELETE FROM seasons']) {
      const { client, calls } = fakeClient(1, dropped());
      await expect(retryReads(client, 60000, [1, 1, 1]).execute(sql)).rejects.toThrow('fetch failed');
      expect(calls).toHaveLength(1);
    }
  });

  it('does not retry terminal errors on reads', async () => {
    for (const err of [new Error('SQLITE_ERROR: no such table: x'), new Error('Unauthorized')]) {
      const { client, calls } = fakeClient(1, err);
      await expect(retryReads(client, 60000, [1, 1, 1]).execute('SELECT 1')).rejects.toThrow();
      expect(calls).toHaveLength(1);
    }
  });

  it('refreshes the connection with a read after an idle gap, before a write', async () => {
    const { client, calls } = fakeClient(0, dropped());
    const wrapped = retryReads(client, 0, [1]);
    await new Promise((r) => setTimeout(r, 5));
    await wrapped.execute('INSERT INTO seasons (name) VALUES (1)');
    expect(calls).toEqual(['SELECT 1', 'INSERT INTO seasons (name) VALUES (1)']);
  });

  it('still reports a write failure after the idle refresh, without replaying it', async () => {
    const { client, calls } = fakeClient(2, dropped());
    const wrapped = retryReads(client, 0, []);
    await new Promise((r) => setTimeout(r, 5));
    await expect(wrapped.execute('UPDATE seasons SET name = 1')).rejects.toThrow('fetch failed');
    expect(calls).toEqual(['SELECT 1', 'UPDATE seasons SET name = 1']);
  });
});
