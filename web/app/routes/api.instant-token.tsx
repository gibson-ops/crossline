// The auth → InstantDB bridge. The client calls this after (and on each) login:
// Better Auth session (cookie) is verified, a profile is provisioned on first
// login, and an Instant session token is minted for db.auth.signInWithToken().
// This is what gives the browser an `auth.id` for InstantDB's CEL rules.
import { auth } from '../lib/auth.server';
import { adminDb, ensureInstantIdentity } from '../lib/instant.server';

export async function action({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    return Response.json({ error: 'not signed in' }, { status: 401 });
  }

  const email = session.user.email;
  const { profileId } = await ensureInstantIdentity(email, session.user.name);
  const token = await adminDb.auth.createToken({ email });

  return Response.json({ token, profileId });
}
