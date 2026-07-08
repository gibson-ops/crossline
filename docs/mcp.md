# Crossline MCP server

Connect any AI client (Claude, Cursor, etc.) to Crossline over an OAuth-secured
remote MCP endpoint. You act as *yourself* — every tool is bound by the same
permission rules as the web app, so an AI client can only see and touch what you
can. No admin access is exposed.

## Endpoint

```
https://crosslineapp.com/api/mcp
```

Add it as a **remote / custom MCP server** in your client. On first use the
client discovers the OAuth server, registers itself (dynamic client
registration), and opens a browser: sign in with your Crossline magic link and
it connects. No token to paste.

## Tools (v1)

| Tool | What it does |
|---|---|
| `list_workspaces` | Your partnerships + their member companies (with ids) |
| `list_tasks` | Open (and optionally done) commitments in a workspace, grouped by company |
| `create_task` | Add a commitment owned by one of the companies |
| `complete_task` | Mark a task done, or reopen it |

Writes are attributed to you and recorded in the audit log (`via: mcp`).

## How it works

- **Authorization server**: Better Auth (the same identity server behind the web
  app) via its `mcp` + `jwt` plugins — OIDC discovery, dynamic client
  registration, PKCE, JWKS, magic-link login as the consent step.
- **Resource server**: `/api/mcp` in the web service, guarded by `withMcpAuth`.
  It validates the OAuth access token, resolves it to your profile, and runs
  every tool through `adminDb.asUser(email)` so InstantDB's CEL rules apply.
- **Discovery**: `/.well-known/oauth-authorization-server` and
  `/.well-known/oauth-protected-resource`.

## Not yet (easy adds now the framework works)

- More tools: `edit_task`, `add_meeting_notes` (run extraction from your AI),
  assignee/visibility args on create, workspace creation.
- An explicit consent screen (currently auto-grants right after login).
- A UI to review/revoke connected AI clients.
