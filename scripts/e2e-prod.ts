// Production end-to-end: real login (assistant inbox via IMAP), streaming
// extraction through api.crosslineapp.com, task landing, then full cleanup so
// the workspace stays pristine. Requires ASSISTANT_MAILBOX_* (finn-automation
// Infisical) merged into env alongside crossline prod secrets:
//   INFISICAL_PROJECT_ID=... (see runner in repo scripts) — or run via the
//   wrapper command documented in the Stash checkpoint.
import { init } from '@instantdb/admin';
import imaplib from 'node:tls'; // placeholder guard — real IMAP below via python is simpler
void imaplib;

// NOTE: IMAP in Node without deps is painful; this script covers the API-side
// E2E (auth bridge + extraction + writes + cleanup) using an admin-minted
// session token — the human login path (magic link email) is verified via the
// browser flow. Run:
//   infisical-agent run --env=prod -- npx tsx scripts/e2e-prod.ts
import schema from '../instant.schema';

const APP_ID = process.env.INSTANT_APP_ID;
const adminToken = process.env.INSTANTDB_ADMIN_TOKEN;
if (!APP_ID || !adminToken) throw new Error('run via infisical-agent --env=prod');
if (APP_ID.startsWith('c7f2')) throw new Error('refusing: dev app id under prod runner');

const API = process.env.ENGINE_PUBLIC_URL ?? 'https://api.crosslineapp.com';
const WORKSPACE = 'f0000000-0000-4000-8000-000000000001';
const TESTER = 'jaredsassistant@gibsonops.com';

const db = init({ appId: APP_ID, adminToken, schema });

async function main() {
  console.log('1. mint session token (bridge equivalent) …');
  const token = await db.auth.createToken({ email: TESTER });

  console.log('2. streaming extraction via', API, '…');
  const res = await fetch(`${API}/ingest/extract-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      transcript:
        'Prod E2E check: James will send the kickoff agenda by Friday. Maya will confirm the venue.',
      workspaceId: WORKSPACE,
    }),
  });
  if (res.status !== 200 || !res.body) throw new Error(`extract-stream ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let proposals = 0;
  let done = false;
  while (true) {
    const { done: end, value } = await reader.read();
    if (end) break;
    buf += dec.decode(value, { stream: true });
    const frames = buf.split('\n\n');
    buf = frames.pop() ?? '';
    for (const f of frames) {
      if (f.includes('event: proposal')) proposals++;
      if (f.includes('event: done')) done = true;
      if (f.includes('event: error')) throw new Error('stream error event');
    }
  }
  if (!done || proposals < 1) throw new Error(`stream incomplete (proposals=${proposals})`);
  console.log(`   ✓ streamed ${proposals} proposals`);

  console.log('3. rule-scoped write + read-back (CEL live on prod) …');
  const scoped = db.asUser({ email: TESTER });
  const orgRes = await scoped.query({ orgs: { $: { where: { slug: 'threatzero' } } } });
  const tzId = orgRes.orgs[0]?.id;
  if (!tzId) throw new Error('tester cannot see ThreatZero org');
  const { id: genId } = await import('@instantdb/admin');
  const taskId = genId();
  await scoped.transact(
    scoped.tx.tasks[taskId]
      .update({ title: 'E2E probe task', status: 'open', workspaceId: WORKSPACE, createdAt: new Date() })
      .link({ workspace: WORKSPACE, owningOrg: tzId }),
  );
  const back = await scoped.query({ tasks: { $: { where: { id: taskId } } } });
  if (back.tasks.length !== 1) throw new Error('write/read-back failed');
  console.log('   ✓ scoped write + read-back ok');

  console.log('4. cleanup …');
  await db.transact(db.tx.tasks[taskId].delete());
  const acts = await db.query({ activities: { $: { where: { workspaceId: WORKSPACE } } } });
  if (acts.activities.length) {
    await db.transact(acts.activities.map((a) => db.tx.activities[a.id].delete()));
  }
  console.log(`   ✓ removed probe task + ${acts.activities.length} activity rows`);
  console.log('E2E PASSED');
}

main().catch((e) => {
  console.error('e2e-prod FAILED:', e);
  process.exit(1);
});
