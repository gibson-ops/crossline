// Protected-resource metadata (RFC 9728). On a 401 from /api/mcp, clients fetch
// this to discover which authorization server guards the resource.
import { oAuthProtectedResourceMetadata } from 'better-auth/plugins';
import { auth } from '../lib/auth.server';

export function loader({ request }: { request: Request }) {
  return oAuthProtectedResourceMetadata(auth)(request);
}
