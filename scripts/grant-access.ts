// Grant a real user access to an org (and its workspaces) — the privileged,
// server-only membership write. Replaces the invite UI for v1.
//   infisical-agent run --env=dev -- npx tsx scripts/grant-access.ts <email> <org-slug> [role] [title]
// Example:
//   infisical-agent run --env=dev -- npx tsx scripts/grant-access.ts jared@gibsonops.com threatzero admin "Engineering"
import { init, id } from '@instantdb/admin';
import schema from '../instant.schema';

const APP_ID = process.env.INSTANT_APP_ID ?? 'c7f2d8d8-41f2-4272-a25a-eb2d6a344a31';
const adminToken = process.env.INSTANTDB_ADMIN_TOKEN;
if (!adminToken) throw new Error('INSTANTDB_ADMIN_TOKEN not set (run via infisical-agent)');
const db = init({ appId: APP_ID, adminToken, schema });

async function main() {
  const [email, orgSlug, role = 'admin', title] = process.argv.slice(2);
  if (!email || !orgSlug) {
    console.error('usage: grant-access.ts <email> <org-slug> [role] [title]');
    process.exit(1);
  }

  // 1. Ensure the Instant $user exists (creates it if this email never logged in).
  const token = await db.auth.createToken({ email });
  void token;
  const user = await db.auth.getUser({ email });

  // 2. Ensure a profile linked to that $user.
  const pRes = await db.query({ profiles: { $: { where: { '$user.id': user.id } } } });
  let profileId = pRes.profiles[0]?.id;
  if (!profileId) {
    profileId = id();
    await db.transact(
      db.tx.profiles[profileId]
        .update({ name: email.split('@')[0], createdAt: new Date() })
        .link({ $user: user.id }),
    );
    console.log(`created profile ${profileId} for ${email}`);
  }

  // 3. Find the org and its workspaces.
  const oRes = await db.query({
    orgs: {
      $: { where: { slug: orgSlug } },
      members: { profile: {} },
      workspaceMemberships: { workspace: {} },
    },
  });
  const org = oRes.orgs[0];
  if (!org) throw new Error(`org with slug "${orgSlug}" not found`);

  // 4. orgMember (person ↔ org) — idempotent.
  const already = (org.members ?? []).some((m) => m.profile?.id === profileId);
  if (already) {
    console.log(`${email} is already a member of ${org.name}`);
  } else {
    await db.transact(
      db.tx.orgMembers[id()]
        .update({ role, ...(title ? { title } : {}), joinedAt: new Date() })
        .link({ profile: profileId, org: org.id }),
    );
    console.log(`added ${email} to ${org.name} as ${role}`);
  }

  // 5. Refresh the denormalized profile→workspaces access cache.
  const workspaceIds = (org.workspaceMemberships ?? [])
    .map((wm) => wm.workspace?.id)
    .filter((wid): wid is string => Boolean(wid));
  if (workspaceIds.length) {
    await db.transact(db.tx.profiles[profileId].link({ workspaces: workspaceIds }));
    console.log(`linked ${email} into ${workspaceIds.length} workspace(s)`);
  }

  console.log('✓ done');
}

main().catch((e) => {
  console.error('grant-access failed:', e);
  process.exit(1);
});
