import type { Handle, RemixNode } from 'remix/component'

import { today } from '../../data/sample.ts'
import { Icon } from '../../ui/icons.tsx'
import {
  Avatar,
  DetailLine,
  Due,
  Empty,
  Field,
  Group,
  KindBadge,
  MUTED,
  Notice,
  PersonChip,
  Quote,
  ROW,
  ROW_OPEN,
  RowQuote,
  Shell,
  Suggestion,
} from '../../ui/parts.tsx'
import { Document } from '../document.tsx'
import { designHref } from './hrefs.ts'

/** The theme's semantic colors, as daisyUI names them, with what each is for in this app. */
const COLORS: { name: string; swatch: string; use: string }[] = [
  { name: 'base-100', swatch: 'bg-base-100', use: 'Raised surfaces: lists, panes, the top bar' },
  { name: 'base-200', swatch: 'bg-base-200', use: 'The page, and quiet fills inside a surface' },
  { name: 'base-300', swatch: 'bg-base-300', use: 'Borders and rules' },
  { name: 'base-content', swatch: 'bg-base-content', use: 'Text' },
  { name: 'primary', swatch: 'bg-primary', use: 'The one main action on a screen' },
  { name: 'neutral', swatch: 'bg-neutral', use: 'The current place, a firm yes, a marked line' },
  { name: 'success', swatch: 'bg-success', use: 'Status dot: done, added, looks right' },
  { name: 'warning', swatch: 'bg-warning', use: 'Status dot: waits on you' },
  { name: 'error', swatch: 'bg-error', use: 'Status dot: due now or past due' },
]

/** One titled block of the gallery. */
function Block(handle: Handle<{ id: string; title: string; note?: string; children?: RemixNode }>) {
  return () => (
    <section aria-labelledby={handle.props.id}>
      <h2 id={handle.props.id} class="px-1 text-sm font-semibold">
        {handle.props.title}
      </h2>
      {handle.props.note ? (
        <p class={`mb-2 px-1 text-sm ${MUTED}`}>{handle.props.note}</p>
      ) : (
        <div class="mb-2"></div>
      )}
      {handle.props.children}
    </section>
  )
}

/** A surface for showing loose parts, so they sit on the color they are used on. */
function Tray(handle: Handle<{ class?: string; children?: RemixNode }>) {
  return () => (
    <div class={`bg-base-100 border-base-300 rounded-box border p-4 ${handle.props.class ?? ''}`}>
      {handle.props.children}
    </div>
  )
}

/**
 * The design system on one page: the theme, every component the app owns, and each one's
 * states. The three mockups linked at the top show them in use.
 */
export function GalleryPage(handle: Handle<{ theme: string | null }>) {
  return () => {
    const { theme } = handle.props
    return (
      <Document title="Design system" theme={theme ?? undefined}>
        <Shell initials={today.initials}>
          <main class="mx-auto max-w-6xl space-y-7 px-3 pt-4 pb-8 lg:px-6">
            <header class="px-1">
              <h1 class="text-xl font-semibold">Design system</h1>
              <p class={`max-w-prose text-sm ${MUTED}`}>
                Every part the app is built from, on made-up data. Colors and corner sizes come from the
                theme: Winter in light mode, and Dark's colors with Winter's shape in dark mode.
              </p>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <a class="btn btn-sm btn-neutral" href={designHref('/design/my-list', { theme })}>
                  My list
                </a>
                <a class="btn btn-sm btn-neutral" href={designHref('/design/call-review', { theme })}>
                  Call review
                </a>
                <a class="btn btn-sm btn-neutral" href={designHref('/design/email', { theme })}>
                  Morning email
                </a>
                <span class={`ms-2 text-sm ${MUTED}`}>Theme:</span>
                <div class="join">
                  {[
                    { label: 'Device', value: null },
                    { label: 'Winter', value: 'winter' },
                    { label: 'Dark', value: 'dark' },
                  ].map((choice) => (
                    <a
                      key={choice.label}
                      class={`btn btn-sm join-item ${theme === choice.value ? 'btn-neutral' : ''}`}
                      aria-current={theme === choice.value ? 'true' : undefined}
                      href={designHref('/design', { theme: choice.value })}
                    >
                      {choice.label}
                    </a>
                  ))}
                </div>
              </div>
            </header>

            <div class="grid gap-7 lg:grid-cols-2 lg:gap-x-6">
              <Block
                id="g-colors"
                title="Colors"
                note="Named by job, never by hue. Status colors are dots and fills, not text."
              >
                <Tray class="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                  {COLORS.map((color) => (
                    <div key={color.name} class="flex items-center gap-2.5">
                      <span
                        class={`border-base-300 rounded-field size-8 shrink-0 border ${color.swatch}`}
                      ></span>
                      <div class="min-w-0">
                        <div class="text-sm font-medium">{color.name}</div>
                        <div class={`text-xs ${MUTED}`}>{color.use}</div>
                      </div>
                    </div>
                  ))}
                </Tray>
              </Block>

              <Block
                id="g-type"
                title="Type"
                note="One system sans. Four text sizes and three weights. Small buttons and avatar initials run one step smaller."
              >
                <Tray class="space-y-2">
                  <p class="text-xl font-semibold">Page title, 20 semibold</p>
                  <p class="text-base font-semibold">Pane title, 16 semibold</p>
                  <p class="text-sm font-semibold">Group heading, 14 semibold</p>
                  <p class="text-sm font-medium">Row title, 14 medium</p>
                  <p class="text-sm">Body, 14 regular. A promise is shown with the words it came from.</p>
                  <p class={`text-xs ${MUTED}`}>Detail line, 12 regular, at 80% of the text color</p>
                  <p class="text-sm tabular-nums">
                    Times and counts use tabular numerals: 9:30 · 1:00 · 14:32
                  </p>
                </Tray>
              </Block>

              <Block
                id="g-buttons"
                title="Buttons"
                note="One primary action a screen. Neutral for a firm choice, plain for the rest."
              >
                <Tray class="space-y-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <button type="button" class="btn btn-sm btn-primary">
                      Mark done
                    </button>
                    <button type="button" class="btn btn-sm btn-neutral">
                      Yes
                    </button>
                    <button type="button" class="btn btn-sm">
                      Snooze
                    </button>
                    <button type="button" class="btn btn-sm btn-ghost">
                      Not sure
                    </button>
                    <button type="button" class="btn btn-sm btn-ghost btn-square" aria-label="Close">
                      <Icon name="close" class="size-4" />
                    </button>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <button type="button" class="btn btn-sm btn-primary" disabled>
                      Disabled
                    </button>
                    <button type="button" class="btn btn-sm" aria-busy="true">
                      <span class="loading loading-spinner loading-xs"></span>
                      Sending
                    </button>
                    <button type="button" class="btn btn-xs">
                      Small
                    </button>
                    <button type="button" class="btn btn-sm">
                      With a key
                      <kbd class="kbd kbd-xs">S</kbd>
                    </button>
                  </div>
                </Tray>
              </Block>

              <Block id="g-marks" title="Kinds, status and people">
                <Tray class="space-y-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <KindBadge label="Reply owed" />
                    <KindBadge label="Follow-up" />
                    <KindBadge label="Meeting" />
                    <span class={`text-xs ${MUTED}`}>A plain to-do has no badge.</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span class="inline-flex items-center gap-1.5">
                      <span class="status status-success" aria-hidden="true"></span>Added
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                      <span class="status status-warning" aria-hidden="true"></span>Waits on you
                    </span>
                    <span class={`inline-flex items-center gap-1.5 text-xs ${MUTED}`}>
                      <Due label="Today" now />
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <PersonChip name="Morgan Ellis" initials="ME" />
                    <PersonChip name="Dana Reyes" initials="DR" />
                    <Avatar initials="PS" size="md" />
                  </div>
                </Tray>
              </Block>
            </div>

            <div class="grid gap-7 lg:grid-cols-2 lg:gap-x-6">
              <Group id="g-rows" title="Rows" count={5}>
                <li class={ROW}>
                  <input type="checkbox" class="checkbox checkbox-sm" aria-label="Mark done: a plain row" />
                  <div>
                    <div class="text-sm font-medium">A plain row</div>
                    <DetailLine source="Weekly team sync" due="Fri, Nov 13" size="L" />
                  </div>
                </li>
                <li class={ROW}>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    aria-label="Mark done: a row to do now"
                  />
                  <div>
                    <div class="text-sm font-medium">A row to do now, with its line</div>
                    <DetailLine
                      kind="Reply owed"
                      source="Email from Dana Reyes"
                      due="Today"
                      dueNow
                      size="S"
                    />
                  </div>
                  <RowQuote speaker="Dana Reyes" text="Can you get me the revised number by Tuesday?" />
                </li>
                <li class={`${ROW} ${ROW_OPEN}`}>
                  <input type="checkbox" class="checkbox checkbox-sm" aria-label="Mark done: the open row" />
                  <div>
                    <div class="text-sm font-medium">The open row</div>
                    <DetailLine kind="Follow-up" source="Email to Luis Ortega" due="Thu, Nov 12" size="S" />
                  </div>
                </li>
                <li class={ROW}>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    aria-label="Mark done: a row with a suggestion"
                  />
                  <div>
                    <div class="text-sm font-medium">A row with a suggestion</div>
                    <DetailLine source="1:1 with Dana" due="Mon, Nov 16" size="M" />
                  </div>
                  <Suggestion
                    question="Suggested for Next."
                    reason="Due in 6 days, and a size M needs about a week."
                  />
                </li>
                <li class={ROW}>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked
                    aria-label="Mark not done: a finished row"
                  />
                  <div class={MUTED}>
                    <div class="text-sm line-through">A finished row</div>
                    <div class="mt-0.5 text-xs">Done today</div>
                  </div>
                </li>
              </Group>

              <div class="space-y-7">
                <Group id="g-empty" title="An empty list" count={0}>
                  <Empty title="Nothing to do now">
                    Only you put a to-do here. Crossline may suggest Next, never Do now.
                  </Empty>
                </Group>

                <Block
                  id="g-notices"
                  title="Notices"
                  note="Shown beside the control that caused them, never as a toast."
                >
                  <div class="space-y-2">
                    <Notice tone="done">Moved to Next.</Notice>
                    <Notice tone="problem">
                      That did not save: the due date changed since you opened it. Reload to see it.
                    </Notice>
                  </div>
                </Block>
              </div>
            </div>

            <div class="grid gap-7 lg:grid-cols-2 lg:gap-x-6">
              <Block
                id="g-quote"
                title="The quote"
                note="The line a to-do came from, as the speaker's own words. Yours sit on the right."
              >
                <Tray>
                  <Quote
                    speaker="Dana Reyes"
                    when="Mon, Nov 9"
                    text="Can you get me the revised number by Tuesday? I present it Wednesday morning."
                  />
                  <Quote
                    speaker="Morgan Ellis"
                    when="14:32"
                    text="I'll confirm the Thursday demo slot with them first thing tomorrow."
                    mine
                    marked
                    note="The recorder labeled this Priya Shah"
                  />
                </Tray>
              </Block>

              <Block id="g-fields" title="Fields">
                <Tray class="grid grid-cols-2 gap-3">
                  <Field label="Priority">
                    <select class="select select-sm w-full" name="g-priority">
                      <option>P1 · Next</option>
                      <option>P2 · After</option>
                    </select>
                  </Field>
                  <Field label="Due">
                    <input type="date" class="input input-sm w-full" name="g-due" defaultValue="2026-11-13" />
                  </Field>
                  <Field label="With a problem" hint="Pick a date that is today or later.">
                    <input
                      type="date"
                      class="input input-sm input-error w-full"
                      name="g-bad"
                      defaultValue="2026-11-01"
                      aria-invalid="true"
                    />
                  </Field>
                  <Field label="Disabled">
                    <input
                      type="text"
                      class="input input-sm w-full"
                      name="g-off"
                      defaultValue="Set by the calendar"
                      disabled
                    />
                  </Field>
                  <Field label="A note" class="col-span-2">
                    <textarea
                      class="textarea textarea-sm w-full"
                      rows={2}
                      name="g-note"
                      placeholder="Anything to add (optional)"
                    ></textarea>
                  </Field>
                  <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" class="checkbox checkbox-sm" checked />A checked box
                  </label>
                  <label class="flex items-center gap-2 text-sm">
                    <input type="radio" class="radio radio-sm" name="g-radio" checked />A chosen reason
                  </label>
                </Tray>
              </Block>
            </div>
          </main>
        </Shell>
      </Document>
    )
  }
}
