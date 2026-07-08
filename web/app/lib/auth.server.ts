// Better Auth — the identity server (runs inside the RR8 server).
// Auth credentials/sessions live in OUR Neon Postgres (clean SQL we own);
// app-side identity (profiles) lives in InstantDB, linked by email → $user.
import { betterAuth } from 'better-auth';
import { magicLink, mcp, jwt } from 'better-auth/plugins';
import pg from 'pg';

const connectionString = process.env.NEON_DEFAULT_CONNECTION_STRING;
if (!connectionString) throw new Error('NEON_DEFAULT_CONNECTION_STRING not set (run via infisical-agent)');

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// pg Pool. Idle timeout balances two costs: every cold connect to Neon is a
// full TLS handshake (~0.5-1s added to whichever page load pays it), while
// long-lived idle connections work against Railway scale-to-zero. 60s keeps
// navigation bursts warm; an idle service still quiesces within a minute.
const pool = new pg.Pool({
  connectionString,
  max: 3,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
});
// REQUIRED: Neon terminates idle connections on its side; without this listener
// an idle-client error is an unhandled 'error' event and CRASHES the process.
// With it, the pool just discards the dead client and dials a fresh one.
pool.on('error', (err) => {
  console.warn('pg pool: idle connection dropped (replaced on next use):', err.message);
});

/**
 * Send the magic-link email — Resend when configured, console in dev.
 * The emailed link goes to OUR interstitial page (/verify-signin), not the raw
 * verify endpoint: corporate email scanners (Outlook SafeLinks etc.) prefetch
 * links with GET, which would consume the one-time token before the human clicks.
 */
async function sendMagicLinkEmail(email: string, url: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // Dev fallback: surface the link in the server log.
    // eslint-disable-next-line no-console
    console.log(`\n🔗 Magic link for ${email}:\n${url}\n`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? 'Crossline <login@mail.crosslineapp.com>',
      to: [email],
      subject: 'Your Crossline sign-in link',
      text: `Sign in to Crossline:\n\n${url}\n\nThis link expires shortly. If you didn't request it, ignore this email.`,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
}

/** Resolve a Better Auth user id (from an OAuth access token) to its email. */
export async function getUserEmailById(userId: string): Promise<string | null> {
  const res = await pool.query('SELECT email FROM "user" WHERE id = $1 LIMIT 1', [userId]);
  return res.rows[0]?.email ?? null;
}

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:5173',
  emailAndPassword: { enabled: false }, // passwordless only
  session: {
    // Serve getSession() from a signed cookie for 5 min instead of hitting
    // Neon on every page load — loader latency is navigation time.
    cookieCache: { enabled: true, maxAge: 300 },
  },
  ...(googleEnabled
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        },
      }
    : {}),
  plugins: [
    magicLink({
      expiresIn: 900, // 15 min — busy people don't check email in 5
      sendMagicLink: async ({ email, token }) => {
        const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:5173';
        const link = `${base}/verify-signin?token=${encodeURIComponent(token)}`;
        await sendMagicLinkEmail(email, link);
      },
    }),
    // JWKS for token verification (published at /api/auth/jwks).
    jwt(),
    // Turns Better Auth into the OAuth 2.1 / OIDC authorization server for MCP:
    // dynamic client registration, PKCE authorize/token, and consent — with our
    // existing magic-link page as the login step. The MCP resource server lives
    // at /api/mcp (same web service; see routes/api.mcp.ts).
    mcp({
      loginPage: '/login',
      resource: `${process.env.BETTER_AUTH_URL ?? 'http://localhost:5173'}/api/mcp`,
    }),
  ],
});
