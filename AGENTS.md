# Crossline agent guide

Crossline remembers what a team has promised and learned, tells each person what needs them each
morning, and answers when asked. The product spec and the build plan live in a Claude Doc;
`docs/PLAN.md` has the links and the current step.

## Rules that are not negotiable

- **Read the installed docs, not memory.** Remix 3 and Effect 4 are newer than any model's
  training. Start with `docs/API-NOTES.md`, then `.agents/skills/remix/SKILL.md`,
  `node_modules/remix/INDEX.md` and `node_modules/effect/AGENTS.md`. Record each new verified fact
  in `docs/API-NOTES.md`.
- **Nothing about one company goes in the code.** No company, person or product names, no
  addresses, no logos. Those are an instance's settings and data, and they live in the database.
  Tests and fixtures use a made-up organization.
- **An organization on every record.** Every table has a required `organization_id`
  (`test/schema.test.ts` fails otherwise). Primary keys are UUIDs.
- **Migrations apply themselves and are never edited once applied.** Add a new numbered directory
  under `db/migrations/`. Prefer adding a column over building a feature early.
- **Colors and shapes come from the daisyUI theme** in `styles/app.css`. Components use daisyUI's
  semantic names (`bg-base-100`, `text-base-content`, `btn-primary`). No literal colors, no
  palette classes such as `text-gray-700`, and no `dark:` variants.
- **Tests run against a real Postgres**, never a mock of it.
- **American English, plain language**, in code, comments, copy and commit messages.

## Commands

| Command         | What it does                                                       |
| --------------- | ------------------------------------------------------------------ |
| `npm run db:up` | Starts the local Postgres 17 in Docker, on 127.0.0.1:5441          |
| `npm run css`   | Builds `public/app.css` (`css:watch` rebuilds on change)           |
| `npm run dev`   | Builds the stylesheet, then runs the server with restart on change |
| `npm run check` | Typecheck, lint, format check and tests (needs the database up)    |

Node 24 is required. On this machine the server runs through `argo run`; the exact command is in
`docs/API-NOTES.md`.

## Layout

```
server.ts          starts the runtime (which migrates the database), then listens
app/routes.ts      the route contract; hrefs come from it
app/router.tsx     middleware and controllers
app/effect.tsx     `respond`: the one bridge from a controller into Effect
app/runtime.ts     the services, built once at startup and disposed on shutdown
app/actions/       controllers and pages; `public/` holds browser entries
app/middleware/    request log, cache policy, the runtime on the request context
domain/            pure rules, schemas and typed errors
services/          things with side effects: config, the database, later connectors and channels
db/migrations/     SQL migrations, one numbered directory each
styles/app.css     Tailwind + daisyUI and the theme
test/              the harness (a throwaway database per test app) and schema rules
docs/              API-NOTES.md (verified facts), PLAN.md (where the plan lives, current step)
```

Put top-level route actions in `app/actions/controller.tsx`; add
`app/actions/<route-key>/controller.tsx` for nested route maps. Controllers never call
`runPromise`: they pass a program to `respond`, which maps typed errors to responses.

## Comments

- JSDoc on non-obvious functions: one-line purpose, then `@param` / `@returns` with units and
  conventions.
- Multi-step work gets a short comment per step.
- Descriptive names over single letters.
