# Crossline MVP audit — 2026-07-04

Goal: customer-zero (TZ · S4K · TR) runs their weekly ritual end-to-end and the product
feels **usable, professional, and not fragile**. Deployment is out of scope here.

Status legend: 🔴 must fix for MVP · 🟡 should fix · ⚪ consciously deferred (post-MVP)

## 1. Functional gaps

| # | Item | Level | Notes |
|---|---|---|---|
| F1 | **No manual task add.** Everything must come through meeting notes; real usage needs "quick add" per org. | 🔴 | Inline add row per org section |
| F2 | **No task edit after confirm.** A typo'd title/due date is permanent. | 🔴 | Inline title edit + due date edit |
| F3 | **No task delete.** Mis-extracted or duplicate tasks are permanent. | 🔴 | Delete affordance + audit entry |
| F4 | **Assignees never set on new tasks.** Extraction returns `assigneeName` but confirm ignores it; `BoardData.people` is dead code. | 🔴 | Match by name against workspace profiles, link on confirm |
| F5 | **Done tasks never age out.** Board accumulates every completed task forever — feels like a prototype after week 2. | 🔴 | Hide `done` items completed before the current week (they live in history/audit) |
| F6 | **No sign-out from the board.** Only the no-workspace screen has it. | 🔴 | Quiet footer: "Signed in as X · Sign out" |
| F7 | Profile names default to email local-part ("jaredsassistant") — audit log & digests read poorly. | 🟡 | Set via grant-access args now; self-serve name edit post-MVP |
| F8 | File/folder delete. Accidental uploads are permanent. | 🟡 | File delete with confirm |
| F9 | Duplicate file names collide (Instant `$files.path` is unique). | 🟡 | Unique path prefix per upload |
| F10 | Change assignee/owner after creation; projects UI; invitations UI | ⚪ | Post-MVP by design |

## 2. Fragility

| # | Item | Level | Notes |
|---|---|---|---|
| R1 | **Failed client writes are silent.** If a transact is rejected (perms/auth edge), the optimistic update reverts with zero feedback. | 🔴 | Minimal toast ("Couldn't save — try again") |
| R2 | **Extraction fetch has no timeout.** A hung engine = "Reading your notes…" forever. | 🔴 | 90s abort + error state |
| R3 | Engine accepts unbounded transcripts (cost + abuse surface). | 🔴 | Server-side length cap + friendly client cap |
| R4 | Error boundary is the RR scaffold (stack-trace UI). Crashes look broken, not handled. | 🔴 | On-brand error + 404 pages |
| R5 | ~~pg pool crash on idle drop~~ | ✅ | Fixed (error listener + auto-restart wrappers) |
| R6 | Session expiry mid-use → next nav redirects to /login (acceptable); live socket keeps working meanwhile. | ⚪ | Fine for MVP |

## 3. Security / permissions

| # | Item | Level | Notes |
|---|---|---|---|
| S1 | **Zero automated permission tests.** The CEL rules ARE the security boundary for a multi-org product; a regression is invisible until a partner sees another partnership's data. | 🔴 | Integration suite against real InstantDB: non-member denied, member allowed, audit-log immutability, actor forgery denied, server-only joins locked |
| S2 | `$files` perms are auth-only (any signed-in user can list/upload all files). | 🟡 | Acceptable for customer-zero; MUST tighten before second workspace. Tracked in perms TODO |
| S3 | Invitation tokens stored raw (no invites flow live yet). | ⚪ | Hash when invites ship |
| S4 | Engine auth paths (401/403/400) untested in CI. | 🟡 | Covered in test suite below |

## 4. Testing

Current state: real-service verification scripts (`test-extract`) + browser flows run manually.
Missing for "not fragile":

| # | Item | Level |
|---|---|---|
| T1 | **Vitest integration suite** (real InstantDB + real engine, per Jared's no-mocks preference): permission rules (S1), engine `/ingest/extract` auth+validation paths, digest bucketing logic. | 🔴 |
| T2 | Extraction quality check: sample transcript → assert owners/dates (real Claude call; pennies). | 🟡 |
| T3 | Scripted login e2e (request link → IMAP → verify) as a repeatable script. | 🟡 (exists ad-hoc; formalize post-MVP) |

## 5. Polish

| # | Item | Level | Notes |
|---|---|---|---|
| P1 | **Favicon + page meta are RR defaults.** First thing a browser tab shows. | 🔴 | Crossline mark, correct titles |
| P2 | **Contrast: `--ink-faint` meta text ≈ 3:1 — fails WCAG AA** for 13px text (due dates!). | 🔴 | Darken token / promote dates to muted |
| P3 | Empty extraction result ("Found 0 action items") reads like a bug. | 🔴 | Friendly copy + guidance |
| P4 | Composer on mobile unverified. | 🟡 | Verify at 390px |
| P5 | Extraction latency ~24s. Acceptable with status lines; test `effort: medium` for ~2x speedup if quality holds. | 🟡 | Measure before changing |
| P6 | Digest/scan email rendering verified in Migadu only. | 🟡 | Jared's inboxes render fine (delivered samples) |

## Added post-audit (2026-07-06): visibility scoping v1

Tasks + meetings can be scoped **Everyone** (default) / **Just \<org\>** / **Just me** so
individuals and single orgs can run non-partnership work on the same board (adoption
driver for Jared + James). Enforced in the permission rules (create doubles as the
forgery guard), mirrored onto audit entries (no title leaks via the log), scoped items
excluded from digests (v1 leak guard), 6 new security tests (27 total). Ingest of a
scoped meeting locks task ownership to your org. **Follow-ups:** folder scoping,
per-org digest variants so scoped tasks get reminders too.

## Added post-audit (2026-07-06, round 2): streaming + chrome

Streaming extraction (proposals appear one-by-one over SSE, ~3-6s, cancellable,
persistent meeting controls, per-proposal assignee pickers); transcript cap raised
60k→300k with surfaced server errors; effort tuned low (2.3× faster, identical
quality, benchmarked); app chrome (top bar, user menu, org pills, click-to-rename
workspace); task rows redesigned (right-aligned date column, fixed modifier order,
hover-corner Edit); custom Radix selects; 36 tests.

## Consciously simple (not gaps)

One page per partnership · no settings surface · no roles/permissions UI · transparency-first
(everyone edits everything) · org = accountability label not a lock · first workspace only.

## Execution order

1. S1+T1 test suite (security first — everything else changes code the tests should cover)
2. F1-F6 board functionality + R1-R3 hardening
3. P1-P3 + R4 chrome/polish
4. Re-verify flows in browser; screenshots; update Jared
