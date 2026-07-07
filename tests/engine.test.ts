// Engine route tests — drive the Hono app directly (no listener) against the
// real auth/validation paths. Extraction itself is covered by
// scripts/test-extract.ts (real Claude call, run on demand).
import { describe, expect, it } from 'vitest';
import app, { MAX_TRANSCRIPT_CHARS } from '../engine/src/app';

const extract = (init: RequestInit) => app.request('/ingest/extract', { method: 'POST', ...init });
const WORKSPACE = 'a0000000-0000-4000-8000-000000000001';

describe('/health', () => {
  it('responds ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});

describe('/ingest/extract auth + validation', () => {
  it('401 without a bearer token', async () => {
    const res = await extract({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'hi', workspaceId: WORKSPACE }),
    });
    expect(res.status).toBe(401);
  });

  it('400 on invalid JSON', async () => {
    const res = await extract({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer junk' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  it('400 when transcript/workspaceId missing', async () => {
    const res = await extract({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer junk' },
      body: JSON.stringify({ transcript: '   ' }),
    });
    expect(res.status).toBe(400);
  });

  it('400 when transcript exceeds the cap', async () => {
    const res = await extract({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer junk' },
      body: JSON.stringify({
        transcript: 'x'.repeat(MAX_TRANSCRIPT_CHARS + 1),
        workspaceId: WORKSPACE,
      }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too long/);
  });

  it('403 with an invalid token', async () => {
    const res = await extract({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not-a-real-token' },
      body: JSON.stringify({ transcript: 'real content', workspaceId: WORKSPACE }),
    });
    expect(res.status).toBe(403);
  });
});

describe('/ingest/extract-stream auth', () => {
  it('same gates as the JSON route (401 / 400 / 403 before any streaming)', async () => {
    const stream = (init: RequestInit) =>
      app.request('/ingest/extract-stream', { method: 'POST', ...init });

    const noAuth = await stream({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'hi', workspaceId: WORKSPACE }),
    });
    expect(noAuth.status).toBe(401);

    const tooLong = await stream({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer junk' },
      body: JSON.stringify({ transcript: 'x'.repeat(MAX_TRANSCRIPT_CHARS + 1), workspaceId: WORKSPACE }),
    });
    expect(tooLong.status).toBe(400);

    const badToken = await stream({
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer not-a-real-token' },
      body: JSON.stringify({ transcript: 'real content', workspaceId: WORKSPACE }),
    });
    expect(badToken.status).toBe(403);
  });
});

describe('/jobs signature gate', () => {
  it('401 without a QStash signature', async () => {
    for (const path of ['/jobs/weekly-digest', '/jobs/scan-due']) {
      const res = await app.request(path, { method: 'POST' });
      expect(res.status, path).toBe(401);
    }
  });
});
