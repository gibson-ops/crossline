// OAuth 2.1 authorization-server discovery. MCP clients fetch this to learn the
// authorize/token/registration endpoints (Better Auth serves the metadata).
import { oAuthDiscoveryMetadata } from 'better-auth/plugins';
import { auth } from '../lib/auth.server';

export function loader({ request }: { request: Request }) {
  return oAuthDiscoveryMetadata(auth)(request);
}
