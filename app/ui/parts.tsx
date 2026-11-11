/**
 * The app's own components. Each is a thin, named composition of daisyUI parts, so pages say
 * what a thing is (`TodoRow`, `Quote`) and the look stays in one place. Colors and shapes come
 * from the theme only: no literal colors, no palette classes, no `dark:` variants.
 */
import type { Handle, RemixNode } from 'remix/component'

import { Icon, type IconName } from './icons.tsx'

/** Secondary text. `/80` is the lightest step that keeps 4.5:1 on both surface colors. */
export const MUTED = 'text-base-content/80'

/** The four places a person can go. `key` is what a page passes as `active`. */
const DESTINATIONS: { key: string; label: string; icon: IconName; href: string }[] = [
  { key: 'list', label: 'My list', icon: 'list', href: '/design/my-list' },
  { key: 'calls', label: 'Calls', icon: 'phone', href: '/design/call-review' },
  { key: 'loops', label: 'Loops', icon: 'loop', href: '#' },
  { key: 'memory', label: 'Memory', icon: 'book', href: '#' },
]

export interface ShellProps {
  /** Which destination is current: 'list', 'calls', 'loops' or 'memory'. */
  active?: string
  /** The viewer's initials, for the account button. */
  initials: string
  children?: RemixNode
}

/**
 * The frame every signed-in page sits in: a top bar with the destinations on wide screens, and
 * the same destinations as a dock on phones.
 */
export function Shell(handle: Handle<ShellProps>) {
  return () => {
    const { active, initials, children } = handle.props
    return (
      <div class="bg-base-200 min-h-dvh pb-20 sm:pb-0">
        <header class="navbar bg-base-100 border-base-300 sticky top-0 z-10 min-h-12 border-b px-3 py-0">
          <div class="navbar-start">
            <a class="px-1 text-base font-semibold" href="/design">
              Crossline
            </a>
          </div>
          <nav class="navbar-center hidden sm:flex" aria-label="Main">
            <ul class="menu menu-horizontal menu-sm gap-1 p-0">
              {DESTINATIONS.map((place) => (
                <li key={place.key}>
                  <a
                    class={place.key === active ? 'menu-active' : undefined}
                    aria-current={place.key === active ? 'page' : undefined}
                    href={place.href}
                  >
                    {place.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div class="navbar-end">
            <Avatar initials={initials} size="md" />
          </div>
        </header>

        {children}

        <nav class="dock dock-sm sm:hidden" aria-label="Main">
          {DESTINATIONS.map((place) => (
            <a
              key={place.key}
              class={place.key === active ? 'dock-active' : undefined}
              aria-current={place.key === active ? 'page' : undefined}
              href={place.href}
            >
              <Icon name={place.icon} class="size-5" />
              <span class="dock-label">{place.label}</span>
            </a>
          ))}
        </nav>
      </div>
    )
  }
}

/** A person's initials in a circle. `sm` sits inside a chip, `md` stands alone. */
export function Avatar(handle: Handle<{ initials: string; size: 'sm' | 'md' }>) {
  return () => {
    const small = handle.props.size === 'sm'
    return (
      <div class="avatar avatar-placeholder">
        <div class={`bg-neutral text-neutral-content rounded-full ${small ? 'w-5' : 'w-8'}`}>
          <span class={small ? 'text-[0.625rem]' : 'text-xs'}>{handle.props.initials}</span>
        </div>
      </div>
    )
  }
}

/** A person as a chip: avatar and name. Used for "who can see this" and for owners. */
export function PersonChip(handle: Handle<{ name: string; initials: string }>) {
  return () => (
    <span class="badge badge-ghost h-7 gap-1.5 ps-1 pe-2.5">
      <Avatar initials={handle.props.initials} size="sm" />
      {handle.props.name}
    </span>
  )
}

/**
 * A titled group of rows. The heading sits on the page, the rows on one raised surface.
 * @param count shown beside the title when given
 */
export function Group(
  handle: Handle<{ id: string; title: string; count?: number; class?: string; children?: RemixNode }>,
) {
  return () => {
    const { id, title, count, children } = handle.props
    return (
      <section class={handle.props.class} aria-labelledby={id}>
        <h2 id={id} class="mb-1.5 flex items-baseline gap-2 px-1 text-sm font-semibold">
          {title}
          {count === undefined ? null : <span class={`${MUTED} font-normal tabular-nums`}>{count}</span>}
        </h2>
        <ul class="list bg-base-100 border-base-300 rounded-box border">{children}</ul>
      </section>
    )
  }
}

/** Row padding shared by every list on the app: tighter than daisyUI's default, to fit the day. */
export const ROW = 'list-row items-center gap-3 px-3 py-2'

/** The row whose detail is open. A tint of the text color reads as "lit" in both themes. */
export const ROW_OPEN = 'bg-base-content/8'

/**
 * A suggestion waiting for an answer, shown under the row it is about. A suggested to-do is
 * listed where the app thinks it belongs, so the person sees it in time, but its priority does
 * not change until they answer here. It is the app speaking, so it is outlined with a dashed
 * line (daisyUI's mark for something tentative) and never filled like a quote.
 */
export function Suggestion(handle: Handle<{ question: string; reason: string }>) {
  return () => (
    <div class="list-col-wrap rounded-field border-base-content/40 flex flex-col items-start gap-x-3 gap-y-1.5 border border-dashed px-3 py-1.5 text-sm sm:flex-row sm:items-center">
      <span class="grow">
        <span class="font-medium">{handle.props.question}</span> {handle.props.reason}
      </span>
      <span class="flex shrink-0 gap-2">
        <button type="button" class="btn btn-xs btn-neutral">
          Keep here
        </button>
        <button type="button" class="btn btn-xs">
          Move back
        </button>
      </span>
    </div>
  )
}

/**
 * The line under a to-do's title: its kind (when it is not a plain to-do), where it came from,
 * when it is due and its size. Used on list rows and at the top of the detail pane.
 * @param kind the kind's label, or undefined for a plain to-do
 * @param due the due date as shown, e.g. "Fri, Nov 13"; undefined when there is none
 * @param dueNow true when the date is today or past
 */
export function DetailLine(
  handle: Handle<{ kind?: string; source: string; due?: string; dueNow?: boolean; size: string }>,
) {
  return () => {
    const { kind, source, due, dueNow, size } = handle.props
    return (
      <div class={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${MUTED}`}>
        {kind ? <KindBadge label={kind} /> : null}
        <span>{source}</span>
        {due ? <Due label={due} now={dueNow ?? false} /> : null}
        <span>Size {size}</span>
      </div>
    )
  }
}

/** What kind of to-do this is, when it is not a plain one. */
export function KindBadge(handle: Handle<{ label: string; class?: string }>) {
  return () => (
    <span class={`badge badge-sm badge-ghost ${handle.props.class ?? ''}`}>{handle.props.label}</span>
  )
}

/**
 * A due date. A date that is today or past gets a status dot; the words stay in the text color,
 * because the status colors are tuned to stand out as dots (3:1), not to be read as text (4.5:1).
 */
export function Due(handle: Handle<{ label: string; now: boolean }>) {
  return () =>
    handle.props.now ? (
      <span class="text-base-content inline-flex items-center gap-1 font-medium">
        <span class="status status-error" aria-hidden="true"></span>
        Due {handle.props.label.toLowerCase()}
      </span>
    ) : (
      <span>Due {handle.props.label}</span>
    )
}

/**
 * The line a to-do came from, shown as the speaker's own words. This is the product's signature:
 * a promise is never shown without where it came from.
 * @param mine true when the viewer said it (the bubble sits on the right, as in a chat)
 * @param note an extra line under the bubble, e.g. what the recorder labeled it as
 */
export function Quote(
  handle: Handle<{
    speaker: string
    when: string
    text: string
    mine?: boolean
    note?: string
    marked?: boolean
  }>,
) {
  return () => {
    const { speaker, when, text, mine, note, marked } = handle.props
    return (
      <div class={`chat ${mine ? 'chat-end' : 'chat-start'}`}>
        <div class="chat-header mb-0.5 text-xs">
          <span class="font-medium">{speaker}</span> <time class={MUTED}>{when}</time>
        </div>
        <div class={`chat-bubble text-sm ${marked ? 'chat-bubble-neutral' : ''}`}>{text}</div>
        {note ? <div class={`chat-footer mt-0.5 text-xs ${MUTED}`}>{note}</div> : null}
      </div>
    )
  }
}

/**
 * The quote in its compact form, for a list row: the same speech bubble as `Quote`, cut to one
 * line (two on phones, where one line holds only a few words) so the day still fits on a
 * screen. The whole line is in the to-do's detail.
 */
export function RowQuote(handle: Handle<{ speaker: string; text: string }>) {
  return () => (
    <div class="list-col-wrap chat chat-start py-0">
      <p class="chat-bubble line-clamp-2 min-h-0 max-w-full py-1 text-sm sm:line-clamp-1">
        <span class="font-medium">{handle.props.speaker}:</span> {handle.props.text}
      </p>
    </div>
  )
}

/** A labeled form control. The control is passed in, already classed (`select`, `input`...). */
export function Field(
  handle: Handle<{ label: string; hint?: string; class?: string; children?: RemixNode }>,
) {
  return () => (
    <fieldset class={`fieldset py-0 ${handle.props.class ?? ''}`}>
      <legend class="fieldset-legend pb-1">{handle.props.label}</legend>
      {handle.props.children}
      {handle.props.hint ? <p class={`label ${MUTED}`}>{handle.props.hint}</p> : null}
    </fieldset>
  )
}

/**
 * The result of an action, shown next to the control that caused it (never as a toast).
 * @param tone 'done' for a success, 'problem' for a failure that names its fix
 */
export function Notice(handle: Handle<{ tone: 'done' | 'problem'; children?: RemixNode }>) {
  return () => (
    <div
      role={handle.props.tone === 'problem' ? 'alert' : 'status'}
      class={`alert alert-soft flex items-start gap-2 px-3 py-2 text-sm ${handle.props.tone === 'problem' ? 'alert-error' : 'alert-success'}`}
    >
      <span
        class={`status mt-1.5 shrink-0 ${handle.props.tone === 'problem' ? 'status-error' : 'status-success'}`}
        aria-hidden="true"
      ></span>
      <span class="text-base-content">{handle.props.children}</span>
    </div>
  )
}

/** What a list says when it has nothing in it: what belongs here and how it gets here. */
export function Empty(handle: Handle<{ title: string; children?: RemixNode }>) {
  return () => (
    <li class="px-3 py-5">
      <p class="text-sm font-medium">{handle.props.title}</p>
      <p class={`mt-0.5 text-sm ${MUTED}`}>{handle.props.children}</p>
    </li>
  )
}
