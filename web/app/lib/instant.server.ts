// InstantDB admin client for the RR8 server (identity-server side).
// Used for: the auth→Instant bridge (createToken), first-login profile
// provisioning, and SSR loaders (scoped via asUser). Peer actor of InstantDB.
import { init, id } from '@instantdb/admin';
import schema from '../../../instant.schema';

// Environments = separate Instant apps; INSTANT_APP_ID selects one (dev fallback).
export const APP_ID = process.env.INSTANT_APP_ID ?? 'c7f2d8d8-41f2-4272-a25a-eb2d6a344a31';

const adminToken = process.env.INSTANTDB_ADMIN_TOKEN;
if (!adminToken) throw new Error('INSTANTDB_ADMIN_TOKEN not set (run via infisical-agent)');

export const adminDb = init({ appId: APP_ID, adminToken, schema });

export type InstantIdentity = {
  instantUserId: string;
  profileId: string;
  workspaces: { id: string; name: string }[];
};

/**
 * Resolve a signed-in person's full Instant identity — $user, profile, and
 * workspace access — provisioning on first login. The warm path (every page
 * load after the first) is a SINGLE InstantDB query; keep it that way, loader
 * latency is user-visible navigation time.
 */
export async function ensureInstantIdentity(
  email: string,
  name?: string | null,
): Promise<InstantIdentity> {
  const res = await adminDb.query({
    profiles: { $: { where: { '$user.email': email } }, $user: {}, workspaces: {} },
  });
  const existing = res.profiles[0];
  if (existing?.$user) {
    return {
      instantUserId: existing.$user.id,
      profileId: existing.id,
      workspaces: (existing.workspaces ?? []).map((w) => ({ id: w.id, name: w.name })),
    };
  }

  // Cold path — first login: create the $user (via createToken) and a profile.
  let instantUser = await adminDb.auth.getUser({ email }).catch(() => null);
  if (!instantUser) {
    await adminDb.auth.createToken({ email });
    instantUser = await adminDb.auth.getUser({ email });
  }
  if (!instantUser) throw new Error(`could not provision Instant user for ${email}`);

  const profileId = id();
  await adminDb.transact(
    adminDb.tx.profiles[profileId]
      .update({ name: name?.trim() || email.split('@')[0], createdAt: new Date() })
      .link({ $user: instantUser.id }),
  );
  return { instantUserId: instantUser.id, profileId, workspaces: [] };
}

/* --------------------------------------------------- workspace selection */

export const CURRENT_WS_COOKIE = 'crossline_ws';

/** A stable, name-sorted view of the user's workspaces (for the switcher). */
export function sortWorkspaces(workspaces: { id: string; name: string }[]) {
  return [...workspaces].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Pick the workspace to render: the one named in the `crossline_ws` cookie if
 * the user still belongs to it, else the first (name-sorted) one. Returns null
 * when the user has no workspaces.
 */
export function resolveCurrentWorkspace(
  request: Request,
  workspaces: { id: string; name: string }[],
): string | null {
  const sorted = sortWorkspaces(workspaces);
  if (sorted.length === 0) return null;
  const cookie = request.headers.get('cookie') ?? '';
  const m = cookie.match(new RegExp(`(?:^|; )${CURRENT_WS_COOKIE}=([^;]+)`));
  const wanted = m ? decodeURIComponent(m[1]) : null;
  if (wanted && sorted.some((w) => w.id === wanted)) return wanted;
  return sorted[0].id;
}

/* ----------------------------------------------------- workspace creation */

const ORG_PALETTE = ['#1f5eff', '#0fa968', '#e0532f', '#7c3aed', '#d97706', '#0891b2'];

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'org';
}

export type NewWorkspaceInput = {
  name: string;
  orgs: { name: string; mine: boolean }[]; // exactly one `mine: true`
};

/**
 * Self-serve workspace creation — the privileged path (orgs, memberships, and
 * the profile→workspaces cache are all server-only writes). Creates the
 * workspace, its partner orgs (fresh; slugs de-duped globally), a Shared
 * folder, seats the creator into the org they marked as theirs, and refreshes
 * their access cache. Returns the new workspace id.
 */
export async function createWorkspace(
  creatorProfileId: string,
  input: NewWorkspaceInput,
): Promise<string> {
  const name = input.name.trim();
  const orgs = input.orgs.map((o) => ({ ...o, name: o.name.trim() })).filter((o) => o.name);
  if (!name) throw new Error('workspace name is required');
  if (orgs.length === 0) throw new Error('at least one organization is required');
  if (orgs.filter((o) => o.mine).length !== 1) throw new Error('mark exactly one org as yours');

  // Ensure globally-unique slugs (orgs.slug is a uniqueness constraint).
  const existing = await adminDb.query({ orgs: {} });
  const taken = new Set(existing.orgs.map((o) => o.slug));
  const now = new Date();
  const wsId = id();

  const ops: ReturnType<typeof adminDb.tx.workspaces[string]['update']>[] = [];
  ops.push(
    adminDb.tx.workspaces[wsId].update({ name, createdAt: now }) as never,
    adminDb.tx.folders[id()].update({ name: 'Shared', workspaceId: wsId, createdAt: now }).link({ workspace: wsId }) as never,
  );

  let myOrgId: string | null = null;
  orgs.forEach((o, i) => {
    let slug = slugify(o.name);
    if (taken.has(slug)) {
      let n = 2;
      while (taken.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    taken.add(slug);
    const orgId = id();
    if (o.mine) myOrgId = orgId;
    ops.push(
      adminDb.tx.orgs[orgId].update({
        name: o.name,
        slug,
        brandColor: ORG_PALETTE[i % ORG_PALETTE.length],
        createdAt: now,
      }) as never,
      adminDb.tx.workspaceMembers[id()]
        .update({ role: 'member', status: 'active', joinedAt: now })
        .link({ workspace: wsId, org: orgId }) as never,
    );
  });

  // Seat the creator into their org + refresh the access cache.
  ops.push(
    adminDb.tx.orgMembers[id()]
      .update({ role: 'admin', joinedAt: now })
      .link({ profile: creatorProfileId, org: myOrgId! }) as never,
    adminDb.tx.profiles[creatorProfileId].link({ workspaces: wsId }) as never,
  );

  await adminDb.transact(ops);
  return wsId;
}
