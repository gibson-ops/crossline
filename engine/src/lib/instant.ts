// InstantDB admin client — the engine is a trusted PEER actor of the data layer
// (it does not own the data; InstantDB does). Reads/writes bypass CEL rules, so
// every route must authorize explicitly via the caller's Instant session token.
import { init } from '@instantdb/admin';
import schema from '../../../instant.schema';

// Environments = separate Instant apps; INSTANT_APP_ID selects one (dev fallback).
export const APP_ID = process.env.INSTANT_APP_ID ?? 'c7f2d8d8-41f2-4272-a25a-eb2d6a344a31';

const adminToken = process.env.INSTANTDB_ADMIN_TOKEN;
if (!adminToken) throw new Error('INSTANTDB_ADMIN_TOKEN not set (run via infisical-agent)');

export const db = init({ appId: APP_ID, adminToken, schema });

export type VerifiedCaller = {
  userId: string;
  email: string | null | undefined;
  profileId: string;
};

/**
 * Resource-server auth for the UI channel: verify the caller's Instant refresh
 * token, then check the denormalized profile→workspaces cache for access.
 * Returns null when the token is invalid or the user lacks workspace access.
 */
export async function verifyWorkspaceAccess(
  refreshToken: string,
  workspaceId: string,
): Promise<VerifiedCaller | null> {
  let user;
  try {
    user = await db.auth.verifyToken(refreshToken);
  } catch {
    return null;
  }
  if (!user) return null;

  const res = await db.query({
    profiles: {
      $: { where: { '$user.id': user.id } },
      workspaces: { $: { where: { id: workspaceId } } },
    },
  });
  const profile = res.profiles[0];
  if (!profile || (profile.workspaces ?? []).length === 0) return null;

  return { userId: user.id, email: user.email, profileId: profile.id };
}

export type WorkspaceOrg = { id: string; name: string; people: string[] };

/** The member orgs of a workspace (+ their people), as context for extraction. */
export async function getWorkspaceOrgs(workspaceId: string): Promise<WorkspaceOrg[]> {
  const res = await db.query({
    workspaces: {
      $: { where: { id: workspaceId } },
      members: { org: { members: { profile: {} } } },
    },
  });
  const ws = res.workspaces[0];
  if (!ws) return [];
  return (ws.members ?? [])
    .map((m) => m.org)
    .filter((org): org is NonNullable<typeof org> => Boolean(org))
    .map((org) => ({
      id: org.id,
      name: org.name,
      people: (org.members ?? [])
        .map((om) => om.profile?.name)
        .filter((n): n is string => Boolean(n)),
    }));
}
