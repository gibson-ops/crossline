// The MCP resource server. withMcpAuth validates the OAuth access token (issued
// by our Better Auth authorization server) and hands us the session; we resolve
// it to an email + profile and serve the tool set scoped to that user.
import { withMcpAuth } from 'better-auth/plugins';
import { auth, getUserEmailById } from '../lib/auth.server';
import { ensureInstantIdentity } from '../lib/instant.server';
import { crosslineMcpHandler } from '../lib/mcp.server';

const handler = withMcpAuth(auth, async (req, session) => {
  const email = await getUserEmailById(session.userId);
  if (!email) {
    return new Response(JSON.stringify({ error: 'unknown user' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  const { profileId } = await ensureInstantIdentity(email);
  return crosslineMcpHandler({ email, profileId })(req);
});

export function loader({ request }: { request: Request }) {
  return handler(request);
}

export function action({ request }: { request: Request }) {
  return handler(request);
}
