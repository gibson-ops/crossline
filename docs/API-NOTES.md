# API notes

Facts verified against the **installed** packages, for this app's exact versions. Remix 3 and
Effect 4 are newer than any model's training, so this file and the installed docs are the source,
not memory. Re-verify after an upgrade.

| Package                           | Version | Docs to read first                                                                                             |
| --------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `remix`                           | 3.2.0   | `.agents/skills/remix/SKILL.md`, then `node_modules/remix/INDEX.md` → `guides/*.md` → `src/<module>/README.md` |
| `effect`                          | 4.1.2   | `node_modules/effect/AGENTS.md`, then `node_modules/effect/ai-docs/src/**`                                     |
| `pg`                              | 8.23.1  | through `remix/data-table/postgres` (`node_modules/remix/src/data-table-postgres/README.md`)                   |
| `tailwindcss`, `@tailwindcss/cli` | 4.3.5   | https://tailwindcss.com/docs                                                                                   |
| `daisyui`                         | 5.7.50  | https://daisyui.com/llms.txt (every part's class names, syntax and rules in one file)                          |
| `typescript`                      | 7.0.2   |                                                                                                                |

Online: https://docs.remix.run ("Working with agents"; any page as Markdown by adding `.md`).
`npx remix doctor` after structural changes.

## This app

Verified 2026-11-10 while building the foundation.

- **Node 24 is required** (`engines`), and the agent shell's `node` is 22. Run the server with
  `argo run go-crossline -- env PATH=$HOME/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin NODE_ENV=development node --env-file-if-exists=.env --import remix/node-tsx server.ts`.
- **Local Postgres** is `compose.yaml` (`npm run db:up`), Postgres 17 on 127.0.0.1:5441.
- **Migrations** are SQL files in `db/migrations/<NNNN_name>/up.sql` (and `down.sql`), applied by
  `db.migrate(await loadMigrations(dir))` from `remix/data-table` when the `Database` service is
  built, which is before the server listens. The runner takes a Postgres advisory lock, records
  each migration in `data_table_migrations` with a checksum, and throws if an applied file changed.
  Never edit an applied migration: add a new one.
- **Raw SQL** is `db.exec(sql\`…\`)`with`sql`from`remix/data-table`; values interpolate as
parameters. The result has `rows`.
- **`pg` is CommonJS**: `import pg from 'pg'` then `const { Client } = pg`. A named import is not
  reliable. oxlint's `import/no-named-as-default-member` flags both `pg.Client` and the
  destructuring, so that one line carries a disable comment.
- **A service that owns a resource** uses `Effect.acquireRelease` inside `Layer.effect`
  (`effect/ai-docs/src/01_effect/05_resources/10_acquire-release.ts`). `runtime.dispose()` runs the
  release, which closes the pool.
- **Tests use a real Postgres.** `test/app.ts` creates an empty database per test app from
  `TEST_DATABASE_URL` and drops it with `drop database … with (force)` on close.
- **The stylesheet** is built by `npm run css` (Tailwind CLI) into `public/app.css`, which is not
  committed. The server has no watcher for it: `npm run css:watch` in a second terminal, or
  rebuild and restart.
- **Themes.** `styles/app.css` makes Winter the default and Dark the `--prefersdark` theme, then
  overrides the built-in Dark's four shape values with Winter's (`@plugin 'daisyui/theme' { name:
'dark'; … }`), so only colors change with the mode.

- **The email theme** is a generated copy of the daisyUI theme (`app/email/theme.generated.ts`),
  because email clients read neither CSS variables nor `oklch()`. `npm run email:theme` rebuilds
  it: `scripts/email-theme.mjs` reads `node_modules/daisyui/theme/winter.css` plus the app's own
  `@plugin 'daisyui/theme' { name: 'winter'; … }` block in `styles/app.css`, and lowers the colors
  to hex with Lightning CSS (`transform` with `targets: { ie: 11 << 16 }`). `test/email-theme.test.ts`
  fails when the copy has drifted, and checks the email's text contrast.
- **MJML 5.4.1** renders in this stack: `await mjml2html(markup, { validationLevel: 'strict' })`
  returns `{ html, errors }` (it is async). Types come from `@types/mjml`. MJML attributes take
  hex colors only. The email is built as an MJML string, with every value escaped for XML.
- **Theme changes for contrast** (all in `styles/app.css`, with the reasons beside them): Winter's
  `primary-content` is white (4.6:1 on its primary; Winter's own pale blue is 3.6:1); Winter's
  success, warning and error are deeper, so a status dot reaches 3:1 on white; Dark's `neutral`
  is light, so "neutral" is the strongest mark in both themes; field, checkbox and radio borders
  are 65% of the text color (daisyUI's 20% is about 1.4:1) through `--input-color`; placeholders
  are 80%. Secondary text is `text-base-content/80`, the lightest step that holds 4.5:1.
- **Winter's status colors are pastel fills.** Never use them as text. State is a `status` dot
  beside text in the content color.
- **One column on phones, two on wide screens, without duplicate markup:** the columns' wrappers
  are `contents` below `lg`, so their children become items of one flex column and `order-*`
  sorts them; at `lg` the wrappers become real grid columns (`app/actions/design/my-list-page.tsx`).
- **A detail pane without daisyUI's drawer:** the pane is ordinary page content chosen by `?open=`;
  on phones it is `fixed inset-0` (a full-screen sheet), on wide screens a sticky column. No
  checkbox, so no `data-rmx-key` workaround. `PanelKeys` (a client entry) closes it on Escape
  with `navigate(closeHref)` and moves focus to the pane's heading when a record opens; its
  listener is removed with `handle.signal`.
- **Forcing a theme for review:** design pages take `?theme=winter|dark`, which sets `data-theme`
  on `<html>`. Without it the device decides.

## daisyUI in Remix 3

Verified in the design trial (`~/code/gibson-ops/crossline-design-trial`), 2026-11-10.

- No script. Install is `@plugin 'daisyui'` in the CSS file; themes are listed in that block.
- `data-theme` on `<html>` picks a theme. With none set, `--default` and `--prefersdark` follow the device.
- **Drawer and page updates.** The drawer opens when its `drawer-toggle` checkbox is checked.
  A full page load with `checked` works. After an in-page navigation the box stayed unchecked,
  although the new HTML had `checked` (the drawer's content updated, the drawer stayed shut).
  Fix: `data-rmx-key` on the checkbox that changes with the state, so Remix makes a new element.
- The overlay can be a link (`<a class="drawer-overlay" href=…>`), so closing is a navigation and
  the open state lives in the URL (`?open=<id>`). Back reopens it.
- Not provided: Escape to close, and keeping focus inside the drawer. Both need a small script.
- Agent docs: https://daisyui.com/llms.txt holds every part's class names, syntax and rules.

## Remix

> Inherited from the app this one grew out of. File and component names in this section and the
> next (`EditForm`, `drawer-exit.tsx`, `PanelKeys` and so on) refer to that app until each piece
> is ported here; the facts about Remix and `@remix-run/ui` hold either way.

- **Routes / router / controllers.** `route`, `get`, `post` from `remix/routes`; `createRouter`,
  `createController` from `remix/router`. `router.map(routes.spike, controller)` mounts a nested map.
  Hrefs come from the route contract: `routes.spike.panel.href({ id })`.
- **Route params stop at `.` and `/`.** `get('/calls/:name')` never matches `/calls/x.md`; write
  `get('/calls/:name.md')` (the param is `x`). Dates need one variable, not `:year-:month-:day`.
- **Middleware typing quirk.** `formData()` as an _action-level_ `middleware` does not type
  `context.formData` (TS 7.0.2). Put it in the controller's `middleware` instead.
- **Render.** `render({ assets })` middleware, then `context.render(<Page />, { status })` in actions.
  `redirect(href, 303)` from `remix/response/redirect` for PRG.
- **Cross-origin protection.** `cop()` from `remix/middleware/cop` rejects cross-origin POSTs with
  403 (route test covers it). Tests and `curl` must send a matching `Origin`.
- **Frames.** `<Frame name="panel" src={href} />`. A link with `data-rmx-src` (frame URL) and
  `data-rmx-target="panel"` loads into that frame while the address bar follows the link's `href`,
  so `?open=ID` deep links, reload and Back all work. Frame requests carry `X-Remix-Frame` and
  `X-Remix-Target` headers; a form POST from inside a frame can redirect to the frame's own URL
  when `X-Remix-Target` is set. An empty `data-rmx-src` clears the frame (the Close link).
- **Frame failures** are owned by the app's `resolveFrame` (`remix/component` README, "Resolving
  Frames"): bounded fallback HTML or rethrow. Phase 3 uses it for the inline error + Retry.
- **Client entries.** `clientEntry(import.meta.url, function Name(handle) { … })` in a colocated
  `public/` directory (browser-reachable; no secrets). Setup runs once, returns a render function;
  read props from `handle.props` at render time. `handle.update()` re-renders; `handle.queueTask`
  runs after the render; `handle.frames.top.reload()` reloads the page's top frame.
  Not React: no hooks. Inputs use `defaultValue`, CSS uses `class`, events use `mix={on(...)}`.
- **Setup runs on the server too.** A client entry's setup and render run during server rendering:
  no `document`, `window` or `localStorage` there. Browser work goes in `handle.queueTask(...)`
  (a no-op on the server) or event handlers. A throw during server render rejects the stream;
  without `render({ onError })` it took the whole process down, so the router passes one.
- **Whole-page navigation is the default.** Intercepted links and forms re-render the whole page
  and reconcile it into the DOM; client entries keep their state (verified: text typed during a
  reload survives). Panels are plain page content, no named frame. Row links set
  `data-rmx-reset-scroll="manual"` and `data-rmx-reset-focus="manual"` so the list keeps its place
  and the panel can take focus. `navigate(href, { resetScroll })` does the same from code.
- **Exit animations.** No view transitions in 3.2.0. `persistNode` (`beforeRemove`, component
  README "Deferring Removal") and `animateExit` (`@remix-run/ui/animation`) only cover nodes a
  client component renders. A page navigation reconciles server HTML with a DOM
  diff that removes nodes outright, and it disposes client entries inside a removed node (emptying
  their DOM) just before detaching it. `drawer-exit.tsx` copies the open panel on the Navigation
  API's `navigate` event and animates the copy in a `data-rmx-preserve-dom` layer.
- **Client-owned attributes.** Page navigation reconciles `<html>` attributes too, so a
  browser-set `data-theme` was dropped on every click; `data-rmx-preserve-attrs="data-theme"`
  keeps it (component README, "Preserving Client-Owned Attributes").
- **Signals (cancellation).** Per the errors guide: event-handler signals for re-entrant event
  work, queued-task signals for work the next render invalidates, `ref` signals for element-owned
  resources, `handle.signal` for component-lifetime work. **An `on()` handler's signal aborts when
  its element unmounts**, so work that must outlive the clicked element (an autosave started from
  a "Use mine" button that then disappears) needs its own `AbortController`. Autosave keeps one per
  field; only a newer save of the same field cancels an older one.
- **Popovers and anchors.** Host `style` types accept `anchorName` / `positionAnchor` and render
  them as `anchor-name` / `position-anchor`; `popover="manual"` renders as-is. Row previews
  (`app/ui/public/row-previews.tsx`) gate on `event.pointerType`, not `(hover: hover)`: headless
  Chrome (agent-browser) reports `hover: none`, so a media-query gate can't be verified there.
- **Form results beside the form (notices).** A form POST redirects back with `?saved=`/`?error=`,
  `for=<the form's notice id>` and a stamp `n` (`withFlash`); the page renders a `Notice` client
  entry right after that form (`FormNotice`), and a page-top fallback that CSS hides with
  `.shell:has([data-notice='inline'])`. Forms opt out of the default scroll and focus reset with
  `data-rmx-reset-scroll="manual"` / `data-rmx-reset-focus="manual"` on the `<form>` itself
  (the runtime reads them from the submitting form, as from a link), so the result is seen where
  the button was. Frame fetches send `Accept: text/html`; `/loop/:id/step-done` and `/close`
  answer HTML callers with a redirect and everyone else with JSON.
- **The top frame keeps only its newest load.** `frames.top.reload()` aborts a page navigation in
  flight (and the other way round), and it reloads `frame.src`, which a POST navigation has set
  to the form's action URL. So `EditForm` waits for `navigation.transition.finished` before its
  post-save reload. An aborted `fetch` does not undo the server's write: the old autosave aborted
  an in-flight save when the same field changed again, so the earlier value was committed, its
  answer (new `expected`, page reload) was dropped, the next save conflicted with our own write,
  and the lists stayed stale. Saves of one field now queue instead (checked 2026-11-06).
- **Date inputs fire `change` per segment.** Typing `11/13` into a filled date input fires
  `change` for `11/01` first (Chrome); each one saved and committed. `EditForm` waits 700ms for a
  date to settle (and saves at once on blur).
- **Typed inputs survive reconciling.** A page update leaves an input's typed value alone (the
  diff only patches attributes); a server-rendered `data-rmx-key` that changes makes a new
  element, which is how capture and the new-loop title clear after a success.
- **Client entries match by identity, in order.** Reconciling pairs a client entry's hydration
  boundary with the next one of the same module and export, so its instance (and state) survives
  a page update and gets new props; `key` doesn't apply there. A notice re-shows on a new stamp
  by keying its own inner element. A client entry may render another (`LoopActions` renders
  `Notice`).
- **Date inputs in agent-browser.** Neither `fill`, `type` nor `keyboard type` sets a native
  `<input type="date">` in headless Chrome (the segments stay `mm/dd/yyyy`; Due and Follow up
  alike, checked 2026-11-06). Verify date autosave through the route tests or a quick action.
- **A field that comes and goes.** `EditForm` takes a field added to its `fields` prop on a later
  render (the loop drawer adds Follow up once the status is waiting): the reload after the status
  save brings the new field and its `expected_` value, and the new control saves like the others.
- **Validation.** Remix's `parse` / `parseSafe` (`remix/data-schema`) accept any Standard Schema v1,
  and `remix/data-schema/form-data` (`f.object`, `f.field`) reads the first value per name, rejects
  files and drops undeclared fields. Effect's `Schema.toStandardSchemaV1(schema)` produces one. The
  app keeps **one** validation library (Effect Schema) and uses Remix's form-data helpers only at the
  edge, if they save code.
- **Animating what a form POST changes.** A client entry that renders a list keeps its instance
  across the redirect's page update and gets the new props (the speaker check moved to the next
  stretch after each answer, Chromium 2026-11-09), so keyed children it renders are client
  inserts and removals that `animateEntrance` / `animateExit` can see. The frames themselves
  weren't sampled (this session couldn't run `agent-browser eval`); verify by eye. Don't
  call `handle.update()` from inside render when new props arrive; set the state and queue the
  DOM work (`handle.queueTask`). `form.requestSubmit(button)` from a key handler sends that
  button's `name`/`value` like a click.
- **Params in a nested map's base.** `route('/calls/:name/speakers', { show: get('/'), answer:
post('/'), recheck: post('/recheck') })` works: `get('/')` matches the base path itself and the
  child controller's `context.params.name` is typed (route tests, 2026-11-09).
- **Tests, gotchas.** `remix test <glob>` takes globs, not directories (`'domain/**/*.test.ts'`).
  `assert.partialDeepEqual` fails on a class instance (e.g. a TaggedError) against a plain object;
  compare the fields.
- **Tests.** `remix test` discovers `*.test.ts`; route tests call `router.fetch(new Request(...))`.
  The testing guide: narrowest useful test; isolate stateful app tests.
- **Production guide** (`guides/15-production.md`): validate env at startup, initialize before
  listening and shut down once, app-owned health checks, report errors without exposing them.
  Phase 6 checklist.
- **Runtime.** Node ≥ 24.3; no build step (`node --import remix/node-tsx server.ts`).
  `argo run` inherits the agent shell's PATH, whose `node` is 22 here; on Node 22 the server dies
  loading `sanitize-html` (`ERR_VM_MODULE_LINK_FAILURE`). Pass Node 24 explicitly:
  `argo run <route> -- env PATH=$HOME/.nvm/versions/node/v24.22.0/bin:/usr/bin:/bin … node …`
  (checked 2026-11-06).

- **Never `disabled` a submit button during an intercepted submit.** Remix reads the form after
  the `submit` event, so a submitter disabled even a tick later (`setTimeout`) drops out of the
  fields: an email form's `name="do" value="send"` arrived as Save and nothing was sent
  (reproduced 2026-11-09 in Chromium). Use `aria-disabled` plus a capture-phase `submit` guard
  that cancels a second submit (app/ui/public/pending-buttons.tsx).

## @remix-run/ui

Headless primitives (accordion, combobox, listbox, menu, popover, select, tabs, toggle) plus
`animation`. Unstable and versioned on its own, so pinned exactly; its only dependency is
`@remix-run/component@^1.2.0`, the same copy `remix` 3.2.0 uses (`npm ls @remix-run/component`
must show one, deduped: two copies would mean two runtimes and no shared context).

- **Shape.** Import per subpath (`import * as combobox from '@remix-run/ui/combobox'`). A
  `Context` component coordinates state; mixins attach behavior to your own elements through
  `mix` (`combobox.input()`, `.popover()`, `.list()`, `.option({ label, value, searchValue })`).
  You own markup and all styling; state comes back as attributes (`aria-selected`,
  `data-highlighted`, `hidden` on filtered options, `data-show-reason`, `data-combobox-flash`).
- **Client-entry boundary.** Everything handling events must render inside a `clientEntry`. The
  combobox renders only once `EditForm` has hydrated; the server (no JavaScript) still renders a
  plain `<select>` the Save button submits.
- **Browser reach.** `app/assets.ts` lists it in `allowPackages`. Its namespace import stays a
  bare specifier resolved by an import-map scope, added to the page only when a page renders a
  module that needs it; a later navigation adds a second import map. Chrome handles that
  natively; elsewhere `entry.ts`'s `remix/multiple-import-maps-polyfill` loads it.
- **Popover surface** (`popover.surface`, used by combobox, menu, select): `popover="manual"`,
  shown and hidden with `showPopover()` / `hidePopover()` (so it is `:popover-open`), positioned
  in JS (inline `position`, `top`, `left`, `max-height`, re-measured every frame while open).
  While open it **locks page scroll** (`overflow: hidden` on `<html>`) and swallows the next
  outside click (`stopPropagation` in the capture phase). The UA `[popover]` styles need
  overriding (`margin`, `border`, `padding`, `overflow`, `background`).
- **Combobox is pick-only by design.** Typing clears the committed value and dispatches a
  change with `value: null` on every edit; blur commits only an exact `label`/`searchValue`
  match and otherwise **clears the text**; Escape keeps an exact match and clears anything else;
  Enter with nothing highlighted does nothing. Free text ("type a new name") is built on top:
  a "Use “…”" option whose label is the draft. Gotcha: the combobox filters in its own `input`
  listener, before your re-render registers the new draft, so a draft matching no one would
  close the list. The fix relies on `searchValue` arrays being kept by reference: one array per
  field, rewritten by a capture-phase `input` listener on a wrapper (runs before the input's
  own). Re-verify after an upgrade.
- **Combobox, more gotchas.** `defaultValue` is read once (remount with a new `key` to set the
  value from outside). After a pick it writes the label into the input only at the end of its
  close transition, a sequence any re-render of the parent cancels (ours does: "Saving…"), so
  `EditForm` writes the label itself. Every option must stay rendered while closed: the
  combobox decides whether to open from the registered options.
- **Escape and the drawer.** The combobox calls `preventDefault` on Escape even with its list
  closed (it keeps or clears the draft), so a bubbling "skip prevented events" drawer handler
  could never close the drawer from that field. `PanelKeys` listens in the capture phase
  instead and stands aside while anything is `:popover-open` (the list, a row preview, the
  phone menu).
- **Animation.** `animateEntrance` / `animateExit` run on node insertion and removal, so they
  don't fit a popover surface that stays mounted. The list animates as a CSS transition between
  popover states on `spring('snappy')` (`spring.transition(...)`, a generated `linear()` easing)
  with `overlay`/`display` `allow-discrete` for the close; the combobox itself waits for that
  transition before finishing a close (only when `data-show-reason="nav"`).
- **Spring durations.** `spring('snappy').duration` is 350 (ms), not the 200 the README's preset
  table lists (the table seems to give the perceived duration; the iterator settles later).
- **Height animations.** `animateEntrance` / `animateExit` with `{ gridTemplateRows: '0fr',
opacity: 0, ...spring('snappy') }` on a `display: grid; grid-template-rows: 1fr` wrapper (child
  `overflow: hidden; min-height: 0`) grow and collapse a client-rendered box smoothly in Chrome
  (sampled per frame). A server-rendered element can't use them (hydration adopts it: no insert
  event), so `Notice` does the same with CSS: `@starting-style` plus a transition whose easing is
  the spring's `linear()` string, passed in as custom properties.
- **Native first** (the guide says so too). The phone "More" menu stays a native
  `popover="auto"` + `popovertarget`: it works without JavaScript, light-dismisses, exposes
  `aria-expanded`, closes on Escape and returns focus to the button. `menu` would add `role=menu`
  semantics, wrong for page navigation.

## Effect

- **Services.** `class X extends Context.Service<X, Interface>()('ops-app/services/X')` with a
  `static readonly layer`; build the implementation with `X.of({...})`. The id names the path.
- **Using a service.** `const exec = yield* Exec` inside `Effect.gen` (the class is yieldable).
  There is no `Exec.asEffect()`; the type of the implementation is `Exec['Service']`.
- **Functions.** `Effect.fn('X.method')(function* (...) {...})` for traced service methods;
  `Effect.fnUntraced` for hot or library-level helpers. Don't `.pipe` an `Effect.fn`; pass extra
  combinators as further arguments. Don't write functions that only wrap `Effect.gen`.
- **Errors.** `Schema.TaggedError<E>()('E', { ... })`; `return yield* new E(...)` to fail.
  Recover with `Effect.catchTag` / `catchTags`.
- **Validation and models.** All parsing of untrusted data with `Schema`, never hand-written
  predicates (the Phase 0 spike's manual checks are a placeholder). Use `Predicate` helpers instead
  of writing `isString` and friends.
- **Normalize, then check.** `OneLine.pipe(Schema.decode({ decode: SchemaGetter.transform(f), encode:
… }), Schema.check(Schema.makeFilter(…)))` runs the check on the transformed value, so input can
  be normalized before it is validated (the loop `priority` field turns `high` into `P1`, then
  checks it is one of P0–P4; `domain/models.test.ts` covers it).
- **Time.** `DateTime` (Clock-backed, testable), not `Date` / `Date.now`, inside Effect code.
- **Processes.** `effect/process` with `ChildProcessSpawner` (`ai-docs/src/60_child-process`); the
  `Exec` service wraps it.
- **Processes, verified.** `@effect/platform-node`'s spawner runs children `detached` (own process
  group) by default and, when the scope closes (timeout, interruption, shutdown), signals the whole
  group; `forceKillAfter` escalates to SIGKILL. `services/exec.test.ts` proves a grandchild dies on
  timeout. `Effect.timeoutOrElse({ duration, orElse })` interrupts the source first.
- **Integration.** One `ManagedRuntime.make(AppLayer)`; `runPromiseExit`, then `Exit.isSuccess`,
  `Cause.findErrorOption` for typed failures and `Cause.squash` for defects. Only `app/effect.ts`
  (`respond`) runs programs.
- **Lenient decoding.** `Schema.decodeUnknownResult(schema)(value)` returns a `Result`
  (`Result.isFailure(r)`, `r.success`, `Result.getOrUndefined(r)`); decode each element of an
  array on its own to drop one bad entry instead of the file (domain/speakers.ts). A `Struct`
  ignores unknown keys when decoding (`onExcessProperty: "ignore"` is the default), so
  re-encoding a decoded value would drop fields another writer added: the speaker file is
  changed as parsed JSON instead.
- **Testing.** Effect's guide uses `@effect/vitest`; this app keeps one runner (`remix test`) and
  runs service programs through a test `ManagedRuntime` built from test layers.

## Claude CLI and Wispr Flow (for the jobs)

- **`--add-dir` grants one folder.** A job's `addDirs` names `state` (the whole state dir, for the
  email draft) or `transcripts` (only `OPS_STATE_DIR/transcripts`), so the calls and speakers jobs
  can write speaker files but not the run records beside them. The folder must exist before
  Claude starts; `Jobs` creates it.
- **Headless runs use settings.json's model.** `~/.claude/settings.json` sets `"model": "haiku"`,
  so `claude -p` without `--model` runs Haiku (checked in `modelUsage`, 2026-11-09). On the
  2026-11-09 call Haiku kept Flow's swapped labels (1 of 420 turns moved, no stretches), so the
  `calls` and `speakers` jobs pass `--model opus` (`JobDefinition.model`).
- **Flow transcripts** come as `Name: text` lines in 40,000-character pages; a page boundary cuts
  a line, so the next page starts with a fragment and no label. The labels flip for long
  stretches: on one real hour-long call (2026-11-09) they ran swapped from the middle to
  the end of the call. A one-line-per-turn copy of the ~53K-character call is 420 turns,
  ~47K characters of text and ~72K of JSON.
