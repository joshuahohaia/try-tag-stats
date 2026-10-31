import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { initializeSchema } from '../database/index.js';
import { teamRepository } from '../database/repositories/index.js';
import { createKitsRouter } from './kits.routes.js';
import { createRateLimiter } from '../middleware/rate-limit.js';

function appWith(limit?: { max: number; windowMs: number; perTeam: number; global: number }, proxyHops = 1) {
  const app = express();
  app.set('trust proxy', proxyHops);
  app.use(express.json());
  app.use('/api/v1/kits', createKitsRouter(limit));
  return app;
}

describe('shared team kits', () => {
  let teamId: number;
  beforeAll(async () => {
    process.env.TURSO_DATABASE_URL = 'file::memory:';
    process.env.TURSO_AUTH_TOKEN = '';
    await initializeSchema();
    teamId = (await teamRepository.upsert(990001, 'Kit Test Team')).id;
  });

  it('starts empty, saves, edits with the right version, and resets', async () => {
    const app = appWith();
    expect((await request(app).get('/api/v1/kits')).body.data).toEqual([]);

    const created = await request(app).put(`/api/v1/kits/${teamId}`).send({ primary: '#AA0000', secondary: '#ffffff', expectedVersion: null });
    expect(created.status).toBe(200);
    expect(created.body.data).toMatchObject({ teamId, primary: '#aa0000', secondary: '#ffffff', version: 1 });
    expect(typeof created.body.data.updatedAt).toBe('string');

    const edited = await request(app).put(`/api/v1/kits/${teamId}`).send({ primary: '#112233', secondary: '#445566', expectedVersion: 1 });
    expect(edited.status).toBe(200);
    expect(edited.body.data.version).toBe(2);

    const reset = await request(app).delete(`/api/v1/kits/${teamId}`).send({ expectedVersion: 2 });
    expect(reset.status).toBe(200);
    expect((await request(app).get('/api/v1/kits')).body.data).toEqual([]);
  });

  it('rejects a stale edit (409) so one of two concurrent edits cannot overwrite the other', async () => {
    const app = appWith();
    await request(app).put(`/api/v1/kits/${teamId}`).send({ primary: '#000001', secondary: '#000002', expectedVersion: null });
    const [a, b] = await Promise.all([
      request(app).put(`/api/v1/kits/${teamId}`).send({ primary: '#0000aa', secondary: '#0000bb', expectedVersion: 1 }),
      request(app).put(`/api/v1/kits/${teamId}`).send({ primary: '#00cc00', secondary: '#00dd00', expectedVersion: 1 }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.data.version).toBe(2);
    // stale reset also fails, and a create when one exists fails
    expect((await request(app).delete(`/api/v1/kits/${teamId}`).send({ expectedVersion: 1 })).status).toBe(409);
    expect((await request(app).put(`/api/v1/kits/${teamId}`).send({ primary: '#111111', secondary: '#222222', expectedVersion: null })).status).toBe(409);
    await request(app).delete(`/api/v1/kits/${teamId}`).send({ expectedVersion: 2 });
  });

  it('validates input and team existence', async () => {
    const app = appWith();
    const put = (id: string | number, body: object) => request(app).put(`/api/v1/kits/${id}`).send(body);
    expect((await put(teamId, { primary: 'red', secondary: '#ffffff', expectedVersion: null })).status).toBe(400);
    expect((await put(teamId, { primary: '#fff', secondary: '#ffffff', expectedVersion: null })).status).toBe(400);
    expect((await put(teamId, { primary: '#ffffff; DROP', secondary: '#ffffff', expectedVersion: null })).status).toBe(400);
    expect((await put(teamId, { primary: '#ffffff', secondary: '#ffffff' })).status).toBe(400);
    expect((await put('abc', { primary: '#ffffff', secondary: '#ffffff', expectedVersion: null })).status).toBe(400);
    expect((await put(424242, { primary: '#ffffff', secondary: '#ffffff', expectedVersion: null })).status).toBe(404);
    expect((await request(app).delete(`/api/v1/kits/${teamId}`).send({})).status).toBe(400);
  });

  it('rate limits writes per client with Retry-After', async () => {
    const app = appWith({ max: 2, windowMs: 60_000, perTeam: 1000, global: 1000 });
    const body = { primary: '#ffffff', secondary: '#000000', expectedVersion: 99 };
    expect((await request(app).put(`/api/v1/kits/${teamId}`).send(body)).status).toBe(409);
    expect((await request(app).put(`/api/v1/kits/${teamId}`).send(body)).status).toBe(409);
    const third = await request(app).put(`/api/v1/kits/${teamId}`).send(body);
    expect(third.status).toBe(429);
    expect(Number(third.headers['retry-after'])).toBeGreaterThan(0);
    expect((await request(app).get('/api/v1/kits')).status).toBe(200);
  });

  it('a spoofed X-Forwarded-For prefix does not escape the per-IP limit (one trusted hop)', async () => {
    const app = appWith({ max: 2, windowMs: 60_000, perTeam: 1000, global: 1000 });
    const body = { primary: '#ffffff', secondary: '#000000', expectedVersion: 99 };
    const send = (xff: string) => request(app).put(`/api/v1/kits/${teamId}`).set('X-Forwarded-For', xff).send(body);
    // the real proxy appends the true client address last; the client controls only the prefix
    expect((await send('9.9.9.1, 203.0.113.7')).status).toBe(409);
    expect((await send('9.9.9.2, 203.0.113.7')).status).toBe(409);
    expect((await send('9.9.9.3, 203.0.113.7')).status).toBe(429);
  });

  it('per-team and global caps hold even when every request claims a different IP', async () => {
    const app = appWith({ max: 1000, windowMs: 60_000, perTeam: 2, global: 3 }, 1);
    const body = { primary: '#ffffff', secondary: '#000000', expectedVersion: 99 };
    const send = (id: number, ip: string) => request(app).put(`/api/v1/kits/${id}`).set('X-Forwarded-For', ip).send(body);
    expect((await send(teamId, '10.0.0.1')).status).toBe(409);
    expect((await send(teamId, '10.0.0.2')).status).toBe(409);
    expect((await send(teamId, '10.0.0.3')).status).toBe(429); // per-team cap
    const other = (await teamRepository.upsert(990002, 'Other Kit Team')).id;
    expect((await send(other, '10.0.0.4')).status).toBe(409); // third global hit
    expect((await send(other, '10.0.0.5')).status).toBe(429); // global cap
  });

  it('limiter window resets', () => {
    let t = 0;
    const lim = createRateLimiter(1, 1000, () => t);
    const calls: number[] = [];
    const res = () => ({ setHeader() {}, status(c: number) { calls.push(c); return { json() {} }; } });
    const run = () => lim({ ip: '1.1.1.1' } as never, res() as never, () => calls.push(200));
    run(); run(); t = 1500; run();
    expect(calls).toEqual([200, 429, 200]);
  });
});
