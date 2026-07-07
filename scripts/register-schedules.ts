// Register the production QStash schedules → engine job endpoints.
// Idempotent: lists existing schedules and skips ones already pointing at the
// same destination+cron. Run AFTER api.crosslineapp.com is live:
//   infisical-agent run --env=prod -- npx tsx scripts/register-schedules.ts
// QStash is multi-region; the account lives in us-east-1. Signing keys are also
// region-specific, so the engine's QSTASH_*_SIGNING_KEY must match this region.
const QSTASH = `${process.env.QSTASH_BASE_URL ?? 'https://qstash-us-east-1.upstash.io'}/v2`;
const token = process.env.QSTASH_TOKEN;
if (!token) throw new Error('QSTASH_TOKEN not set (run via infisical-agent --env=prod)');

const API = process.env.ENGINE_PUBLIC_URL ?? 'https://api.crosslineapp.com';
const SCHEDULES = [
  { path: '/jobs/weekly-digest', cron: 'CRON_TZ=America/Denver 0 7 * * 1' },
  { path: '/jobs/scan-due', cron: 'CRON_TZ=America/Denver 0 7 * * *' },
];

async function main() {
  const listed = await fetch(`${QSTASH}/schedules`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  // Upstash may return a bare array or wrap it — normalize both.
  const existing = (Array.isArray(listed) ? listed : (listed.schedules ?? [])) as {
    destination: string;
    cron: string;
    scheduleId: string;
  }[];

  for (const s of SCHEDULES) {
    const dest = `${API}${s.path}`;
    const dup = existing.find((e) => e.destination === dest && e.cron === s.cron);
    if (dup) {
      console.log(`= exists: ${dest} [${s.cron}] (${dup.scheduleId})`);
      continue;
    }
    // QStash expects the destination URL raw in the path (not percent-encoded).
    const res = await fetch(`${QSTASH}/schedules/${dest}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Upstash-Cron': s.cron,
        'Upstash-Retries': '3',
      },
    });
    if (!res.ok) throw new Error(`schedule create failed ${res.status}: ${await res.text()}`);
    const { scheduleId } = (await res.json()) as { scheduleId: string };
    console.log(`+ created: ${dest} [${s.cron}] (${scheduleId})`);
  }
}

main().catch((e) => {
  console.error('register-schedules failed:', e);
  process.exit(1);
});
