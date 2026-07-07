// Wipe the demo workspace's coordination data (tasks, meetings, activities,
// folders) so a fresh `seed.ts` run yields a PRISTINE demo board — plain
// re-seeding only upserts the fixed rows and leaves test leftovers behind.
//   infisical-agent run --env=dev -- npx tsx scripts/reset-demo.ts
//   infisical-agent run --env=dev -- npx tsx scripts/seed.ts
import { init } from '@instantdb/admin';
import schema from '../instant.schema';

const APP_ID = process.env.INSTANT_APP_ID ?? 'c7f2d8d8-41f2-4272-a25a-eb2d6a344a31';
const WORKSPACE = 'a0000000-0000-4000-8000-000000000001';

const adminToken = process.env.INSTANTDB_ADMIN_TOKEN;
if (!adminToken) throw new Error('INSTANTDB_ADMIN_TOKEN not set (run via infisical-agent)');
const db = init({ appId: APP_ID, adminToken, schema });

async function main() {
  const res = await db.query({
    tasks: { $: { where: { workspaceId: WORKSPACE } } },
    meetings: { $: { where: { workspaceId: WORKSPACE } } },
    activities: { $: { where: { workspaceId: WORKSPACE } } },
    folders: { $: { where: { workspaceId: WORKSPACE } } },
  });
  const ops = [
    ...res.tasks.map((t) => db.tx.tasks[t.id].delete()),
    ...res.meetings.map((m) => db.tx.meetings[m.id].delete()),
    ...res.activities.map((a) => db.tx.activities[a.id].delete()),
    ...res.folders.map((f) => db.tx.folders[f.id].delete()),
  ];
  if (ops.length) await db.transact(ops);
  console.log(
    `✓ wiped ${res.tasks.length} tasks, ${res.meetings.length} meetings, ` +
      `${res.activities.length} activities, ${res.folders.length} folders — now run seed.ts`,
  );
}

main().catch((e) => {
  console.error('reset-demo failed:', e);
  process.exit(1);
});
