// Provision the PRODUCTION workspace — the real TZ · S4K · TR partnership,
// fresh (no demo tasks/meetings). Idempotent via fixed UUIDs (prod-distinct
// from dev's a0/b0/c0 family so ids can never be confused across envs).
//   infisical-agent run --env=prod -- npx tsx scripts/provision-prod.ts
// Then seat people:
//   infisical-agent run --env=prod -- npx tsx scripts/grant-access.ts <email> <org-slug> [role]
import { init } from '@instantdb/admin';
import schema from '../instant.schema';

const APP_ID = process.env.INSTANT_APP_ID;
const adminToken = process.env.INSTANTDB_ADMIN_TOKEN;
if (!APP_ID || !adminToken) throw new Error('run via: infisical-agent run --env=prod -- …');
if (APP_ID.startsWith('c7f2')) throw new Error('refusing to provision: this is the DEV app id');

const db = init({ appId: APP_ID, adminToken, schema });

const W = 'f0000000-0000-4000-8000-000000000001';
const ORG = {
  tz: 'f1000000-0000-4000-8000-000000000001',
  s4k: 'f1000000-0000-4000-8000-000000000002',
  tr: 'f1000000-0000-4000-8000-000000000003',
};
const WM = {
  tz: 'f2000000-0000-4000-8000-000000000001',
  s4k: 'f2000000-0000-4000-8000-000000000002',
  tr: 'f2000000-0000-4000-8000-000000000003',
};
const FOLDER = 'f3000000-0000-4000-8000-000000000001';

async function main() {
  const now = new Date();
  await db.transact([
    db.tx.workspaces[W].update({ name: 'ThreatZero · Stand 4 Kind · Target River', createdAt: now }),
    db.tx.orgs[ORG.tz].update({ name: 'ThreatZero', slug: 'threatzero', brandColor: '#1f5eff', createdAt: now }),
    db.tx.orgs[ORG.s4k].update({ name: 'Stand 4 Kind', slug: 'stand-4-kind', brandColor: '#0fa968', createdAt: now }),
    db.tx.orgs[ORG.tr].update({ name: 'Target River', slug: 'target-river', brandColor: '#e0532f', createdAt: now }),
    db.tx.workspaceMembers[WM.tz].update({ role: 'member', status: 'active', joinedAt: now }).link({ workspace: W, org: ORG.tz }),
    db.tx.workspaceMembers[WM.s4k].update({ role: 'member', status: 'active', joinedAt: now }).link({ workspace: W, org: ORG.s4k }),
    db.tx.workspaceMembers[WM.tr].update({ role: 'member', status: 'active', joinedAt: now }).link({ workspace: W, org: ORG.tr }),
    db.tx.folders[FOLDER].update({ name: 'Shared', workspaceId: W, createdAt: now }).link({ workspace: W }),
  ]);

  const check = await db.query({
    workspaces: { $: { where: { id: W } }, members: { org: {} } },
  });
  const ws = check.workspaces[0];
  console.log(
    `✓ provisioned "${ws?.name}" — orgs: ${(ws?.members ?? []).map((m) => m.org?.name).join(', ')}`,
  );
  console.log('  Next: grant seats with scripts/grant-access.ts (run under --env=prod)');
}

main().catch((e) => {
  console.error('provision-prod failed:', e);
  process.exit(1);
});
