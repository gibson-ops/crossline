# Crossline

One place remembers what a team has promised and learned. It tells each person what needs them
each morning, and it answers when asked.

Start with `AGENTS.md` for the rules and layout, `docs/PLAN.md` for the plan and the current step,
and `docs/API-NOTES.md` for facts verified against the installed libraries.

## Run it locally

1. Copy `.env.example` to `.env`.
2. `npm install`
3. `npm run db:up` starts the local Postgres.
4. Start the server (the command for this machine is in `docs/API-NOTES.md`), then open the
   address in `PUBLIC_URL`.

`npm run check` runs every check.
