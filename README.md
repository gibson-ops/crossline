# Crossline

Radically-simple coordination for partnerships between separate companies:
weekly meeting notes → AI-extracted action items owned by the right company,
tracked to done. A Gibson Ops product.

## Layout (npm workspaces)

- `web/` — React Router 8 SSR app + Better Auth (identity server)
- `engine/` — Hono service: transcript ingest (streaming Claude extraction) + QStash jobs
- `shared/` — shared utilities
- `instant.schema.ts` / `instant.perms.ts` — the InstantDB data model + CEL permission rules (imported by both web and engine)
- `scripts/` — ops (provision, seed, grant-access, schedules) run via `infisical-agent run --env=<env> -- npx tsx scripts/<x>.ts`

## Stack

InstantDB (realtime data + permissions) · Neon Postgres (auth) · Claude (extraction) ·
Resend (email) · Upstash QStash (schedules) · Railway (hosting) · Infisical (secrets).

## Develop

Secrets come from Infisical, never committed. Run a service:

```
infisical-agent run --env=dev -- npm run dev -w web
infisical-agent run --env=dev -- npm run dev -w engine
```

Tests (real services): `infisical-agent run --env=dev -- npm test`
