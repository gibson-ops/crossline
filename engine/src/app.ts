// Crossline coordination engine (Hono, serverless / scale-to-zero on Railway).
//
// Responsibilities (grow over time): ingest (transcript -> AI -> proposed commitments),
// channel webhooks (inbound), and QStash job callbacks (/jobs/*: deliver, scan-due,
// weekly-digest). It reads/writes InstantDB as a trusted admin peer; it does NOT own
// authentication (that's the RR8 identity server) — it validates per-channel credentials
// (UI channel: the caller's Instant session token).
//
// The app is exported WITHOUT a listener so tests can drive it via app.request();
// src/index.ts is the serving entrypoint.
import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { Receiver } from '@upstash/qstash';
import { verifyWorkspaceAccess, getWorkspaceOrgs } from './lib/instant';
import { extractCommitments, extractCommitmentsStream, EXTRACTION_MODEL } from './lib/extract';
import { runWeeklyDigest, runScanDue } from './lib/jobs';

/**
 * Hard cap on pasted transcripts — cost/abuse guard only. Real transcripts are
 * big: a 1-hour meeting is ~50-60k chars, so the ceiling must sit far above
 * that (300k ≈ a 4-5 hour transcript ≈ pennies of input tokens).
 */
export const MAX_TRANSCRIPT_CHARS = 300_000;

const app = new Hono();

// The web app calls the engine cross-origin (different service). Real auth is
// the bearer token on each request; CORS just permits the browser call.
app.use(
  '*',
  cors({
    origin: (origin) =>
      origin &&
      (origin.startsWith('http://localhost:') ||
        origin.endsWith('.argo.gibsonops.com') ||
        origin === (process.env.WEB_ORIGIN ?? ''))
        ? origin
        : undefined,
    allowHeaders: ['Authorization', 'Content-Type'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, service: 'crossline-engine' }));

/**
 * Transcript → proposed commitments. Stateless in v1: nothing is persisted here;
 * the client shows the proposals for review and writes confirmed tasks itself
 * (direct InstantDB writes under CEL rules).
 *
 * Auth (UI channel): Authorization: Bearer <instant refresh token>.
 */
app.post('/ingest/extract', async (c) => {
  const bearer = c.req.header('authorization');
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined;
  if (!token) return c.json({ error: 'missing bearer token' }, 401);

  let body: { transcript?: string; workspaceId?: string; meetingDate?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400);
  }
  const { transcript, workspaceId } = body;
  if (!transcript?.trim() || !workspaceId) {
    return c.json({ error: 'transcript and workspaceId are required' }, 400);
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return c.json(
      { error: `transcript too long (max ${MAX_TRANSCRIPT_CHARS.toLocaleString()} characters)` },
      400,
    );
  }

  // Independent lookups — run in parallel (each is an InstantDB round-trip).
  const [caller, orgs] = await Promise.all([
    verifyWorkspaceAccess(token, workspaceId),
    getWorkspaceOrgs(workspaceId),
  ]);
  if (!caller) return c.json({ error: 'not authorized for this workspace' }, 403);
  if (orgs.length === 0) return c.json({ error: 'workspace has no member orgs' }, 400);

  const meetingDate = body.meetingDate ?? new Date().toISOString().slice(0, 10);
  try {
    const { extraction, usage } = await extractCommitments({
      transcript,
      meetingDate,
      orgs,
      // benchmarked identical quality at low/medium/high on this task; low is
      // 2.3x faster than the default. Bump via env if real-world quality dips.
      effort: (process.env.EXTRACTION_EFFORT as 'low' | 'medium' | 'high' | undefined) ?? 'low',
    });
    return c.json({ ...extraction, meta: { model: EXTRACTION_MODEL, usage } });
  } catch (err) {
    console.error('extraction failed:', err);
    return c.json({ error: 'extraction failed' }, 502);
  }
});

/**
 * Streaming variant of /ingest/extract: Server-Sent Events, one `proposal`
 * event per action item as the model finds it, then `done` with the full
 * validated extraction (or `error`). Same auth + validation as the JSON route.
 */
app.post('/ingest/extract-stream', async (c) => {
  const bearer = c.req.header('authorization');
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined;
  if (!token) return c.json({ error: 'missing bearer token' }, 401);

  let body: { transcript?: string; workspaceId?: string; meetingDate?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid JSON body' }, 400);
  }
  const { transcript, workspaceId } = body;
  if (!transcript?.trim() || !workspaceId) {
    return c.json({ error: 'transcript and workspaceId are required' }, 400);
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    return c.json(
      { error: `transcript too long (max ${MAX_TRANSCRIPT_CHARS.toLocaleString()} characters)` },
      400,
    );
  }

  const [caller, orgs] = await Promise.all([
    verifyWorkspaceAccess(token, workspaceId),
    getWorkspaceOrgs(workspaceId),
  ]);
  if (!caller) return c.json({ error: 'not authorized for this workspace' }, 403);
  if (orgs.length === 0) return c.json({ error: 'workspace has no member orgs' }, 400);

  const meetingDate = body.meetingDate ?? new Date().toISOString().slice(0, 10);
  return streamSSE(c, async (stream) => {
    try {
      const { extraction, usage } = await extractCommitmentsStream(
        {
          transcript: transcript!,
          meetingDate,
          orgs,
          effort:
            (process.env.EXTRACTION_EFFORT as 'low' | 'medium' | 'high' | undefined) ?? 'low',
        },
        async (proposal, index) => {
          await stream.writeSSE({ event: 'proposal', data: JSON.stringify({ proposal, index }) });
        },
      );
      await stream.writeSSE({
        event: 'done',
        data: JSON.stringify({ ...extraction, meta: { model: EXTRACTION_MODEL, usage } }),
      });
    } catch (err) {
      console.error('stream extraction failed:', err);
      await stream.writeSSE({ event: 'error', data: JSON.stringify({ error: 'extraction failed' }) });
    }
  });
});

/* ---------------------------------------------------------------- QStash jobs
   QStash POSTs to these on schedules (registered at deploy):
     weekly-digest  Mon 07:00 America/Denver   cron: 0 7 * * 1
     scan-due       daily 07:00 America/Denver cron: 0 7 * * *
   Every request must carry a valid Upstash-Signature (JWT signed with our
   signing keys). ALLOW_UNSIGNED_JOBS=1 bypasses for local testing only. */

const qstashReceiver =
  process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY
    ? new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
      })
    : null;

async function verifyQStash(c: Context): Promise<boolean> {
  if (process.env.ALLOW_UNSIGNED_JOBS === '1') return true;
  const signature = c.req.header('upstash-signature');
  if (!signature || !qstashReceiver) return false;
  try {
    await qstashReceiver.verify({ signature, body: await c.req.text() });
    return true;
  } catch {
    return false;
  }
}

app.post('/jobs/weekly-digest', async (c) => {
  if (!(await verifyQStash(c))) return c.json({ error: 'invalid signature' }, 401);
  const summary = await runWeeklyDigest();
  console.log('weekly-digest:', summary);
  return c.json(summary);
});

app.post('/jobs/scan-due', async (c) => {
  if (!(await verifyQStash(c))) return c.json({ error: 'invalid signature' }, 401);
  const summary = await runScanDue();
  console.log('scan-due:', summary);
  return c.json(summary);
});

// --- TODO ---------------------------------------------------------------------
// POST /jobs/deliver        QStash callback: deliver a domain event to a channel
// POST /webhooks/:channel   inbound channel events (slack, email replies, PM tools)

export default app;
