import type { Handle } from 'remix/component'

import {
  CORRECTION_REASONS,
  KIND_LABEL,
  PRIORITY_LABEL,
  SIZE_LABEL,
  callReviews,
  daySummary,
  groupedTodos,
  initials,
  meetings,
  today,
  type Priority,
  type Size,
  type Todo,
} from '../../data/sample.ts'
import { Icon } from '../../ui/icons.tsx'
import {
  DetailLine,
  Field,
  Group,
  MUTED,
  PersonChip,
  Quote,
  ROW,
  ROW_OPEN,
  RowQuote,
  Shell,
  Suggestion,
} from '../../ui/parts.tsx'
import { Document } from '../document.tsx'
import { PanelKeys } from '../public/panel-keys.tsx'
import { designHref } from './hrefs.ts'

export interface MyListPageProps {
  /** Theme forced by ?theme=, or null to follow the device. */
  theme: string | null
  /** The to-do whose detail is open, from ?open=, or null. */
  open: Todo | null
}

/**
 * "My list": what needs the person today, in order of work.
 * - Wide screens: to-dos in the main column; meetings and calls to review in a side column,
 *   which the detail pane replaces while a to-do is open, so the list stays in view.
 * - Phones: one column (meetings, to-dos, calls), and the detail as a full-screen sheet.
 */
export function MyListPage(handle: Handle<MyListPageProps>) {
  return () => {
    const { theme, open } = handle.props
    const closeHref = designHref('/design/my-list', { theme })

    return (
      <Document title="My list" theme={theme ?? undefined}>
        <Shell active="list" initials={today.initials}>
          <main class="mx-auto max-w-6xl px-3 pt-4 pb-6 lg:px-6">
            <header class="mb-4 px-1">
              <h1 class="text-xl font-semibold">{today.heading}</h1>
              <p class={`text-sm ${MUTED}`}>{daySummary()}</p>
            </header>

            {/* One column on phones (the wrappers vanish and `order-*` sorts the groups); two on wide screens. */}
            <div class="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-6">
              <div class="contents lg:block lg:space-y-5">
                {groupedTodos().map((group) => (
                  <Group
                    key={group.key}
                    id={`group-${group.key}`}
                    title={group.title}
                    count={group.todos.length}
                    class="order-2"
                  >
                    {group.todos.map((todo) => (
                      <TodoRow key={todo.id} todo={todo} theme={theme} isOpen={open?.id === todo.id} />
                    ))}
                  </Group>
                ))}
              </div>

              <aside class="contents lg:sticky lg:top-16 lg:block lg:space-y-5">
                {open ? (
                  <Detail todo={open} closeHref={closeHref} />
                ) : (
                  <>
                    <Group id="meetings" title="Meetings today" count={meetings.length} class="order-1">
                      {meetings.map((meeting) => (
                        <li key={meeting.id} class={ROW}>
                          <div class="w-10 text-sm font-medium tabular-nums">{meeting.time}</div>
                          <div>
                            <div class="text-sm font-medium">{meeting.title}</div>
                            <div class={`text-xs ${MUTED}`}>{meeting.detail}</div>
                          </div>
                        </li>
                      ))}
                    </Group>

                    <Group id="calls" title="Calls to review" count={callReviews.length} class="order-3">
                      {callReviews.map((call) => (
                        <li key={call.id} class={ROW}>
                          <span
                            class={`status ${call.needsCheck ? 'status-warning' : 'status-success'}`}
                            aria-hidden="true"
                          ></span>
                          <div>
                            <div class="text-sm font-medium">{call.title}</div>
                            <div class={`text-xs ${MUTED}`}>
                              {call.when} · {call.detail}
                            </div>
                          </div>
                          <a class="btn btn-sm" href={designHref('/design/call-review', { theme })}>
                            Review
                          </a>
                        </li>
                      ))}
                    </Group>
                  </>
                )}
              </aside>
            </div>
          </main>
        </Shell>
        <PanelKeys openId={open?.id ?? null} closeHref={closeHref} focusId="detail-title" />
      </Document>
    )
  }
}

function TodoRow(handle: Handle<{ todo: Todo; theme: string | null; isOpen: boolean }>) {
  return () => {
    const { todo, theme, isOpen } = handle.props
    return (
      <li class={`${ROW} ${isOpen ? ROW_OPEN : ''}`}>
        <input type="checkbox" class="checkbox checkbox-sm" aria-label={`Mark done: ${todo.title}`} />
        <a
          class="min-w-0"
          href={designHref('/design/my-list', { theme, open: todo.id })}
          aria-current={isOpen ? 'true' : undefined}
          data-rmx-reset-scroll="manual"
          data-rmx-reset-focus="manual"
        >
          <div class="text-sm font-medium">{todo.title}</div>
          <RowDetail todo={todo} />
        </a>
        {/* What must be done now shows the words it came from, without opening it. */}
        {todo.priority === 'P0' ? <RowQuote speaker={todo.source.speaker} text={todo.source.quote} /> : null}
        {todo.suggestion ? <Suggestion question="Suggested for Next." reason={todo.suggestion} /> : null}
      </li>
    )
  }
}

/** The shared detail line, filled from a to-do. */
function RowDetail(handle: Handle<{ todo: Todo }>) {
  return () => {
    const { todo } = handle.props
    return (
      <DetailLine
        kind={todo.kind === 'todo' ? undefined : KIND_LABEL[todo.kind]}
        source={todo.source.label}
        due={todo.due || undefined}
        dueNow={todo.dueNow}
        size={todo.size}
      />
    )
  }
}

function Detail(handle: Handle<{ todo: Todo; closeHref: string }>) {
  return () => {
    const { todo, closeHref } = handle.props
    return (
      <section
        class="bg-base-100 border-base-300 lg:rounded-box fixed inset-0 z-30 flex flex-col overflow-y-auto overscroll-contain lg:static lg:z-auto lg:max-h-[calc(100dvh-9.5rem)] lg:border"
        aria-labelledby="detail-title"
      >
        <header class="border-base-300 flex items-start gap-2 border-b py-3 ps-4 pe-2">
          <div class="grow">
            <h2 id="detail-title" tabindex={-1} class="text-base leading-snug font-semibold outline-none">
              {todo.title}
            </h2>
            <RowDetail todo={todo} />
          </div>
          <a
            class="btn btn-ghost btn-sm btn-square"
            href={closeHref}
            aria-label="Close"
            data-rmx-reset-scroll="manual"
          >
            <Icon name="close" class="size-4" />
          </a>
        </header>

        <div class="grow space-y-5 p-4">
          <div class="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select class="select select-sm w-full" name="priority">
                {(Object.keys(PRIORITY_LABEL) as Priority[]).map((priority) => (
                  <option key={priority} value={priority} selected={priority === todo.priority}>
                    {PRIORITY_LABEL[priority]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Size">
              <select class="select select-sm w-full" name="size">
                {(Object.keys(SIZE_LABEL) as Size[]).map((size) => (
                  <option key={size} value={size} selected={size === todo.size}>
                    {SIZE_LABEL[size]}
                  </option>
                ))}
              </select>
            </Field>
            {/* Why this P2 is listed under Next: its stored priority is unchanged until answered. */}
            {todo.suggestion ? (
              <p class={`col-span-2 -mt-1 text-xs ${MUTED}`}>
                Suggested for Next, and listed there until you answer.
              </p>
            ) : null}
            <Field label="Due" class="col-span-2">
              <input type="date" class="input input-sm w-full" name="due" defaultValue={todo.dueDate} />
            </Field>
          </div>

          <section aria-labelledby="detail-source">
            <h3 id="detail-source" class="text-sm font-semibold">
              Where this came from
            </h3>
            <p class={`text-sm ${MUTED}`}>{todo.source.label}</p>
            <div class="mt-2">
              <Quote
                speaker={todo.source.speaker}
                when={todo.source.when}
                text={todo.source.quote}
                mine={todo.source.speaker === today.viewer}
              />
            </div>
            <a class="link link-hover mt-1 inline-flex items-center gap-1 text-sm font-medium" href="#">
              {todo.source.linkText}
              <Icon name="chevron" class="size-4" />
            </a>
          </section>

          {todo.loop ? (
            <section aria-labelledby="detail-loop">
              <h3 id="detail-loop" class="text-sm font-semibold">
                Part of
              </h3>
              <a class="btn btn-sm mt-1.5" href="#">
                <Icon name="loop" class="size-4" />
                {todo.loop.name}
                <span class={`font-normal ${MUTED}`}>{todo.loop.openCount} open</span>
              </a>
            </section>
          ) : null}

          <section aria-labelledby="detail-audience">
            <h3 id="detail-audience" class="text-sm font-semibold">
              Who can see this
            </h3>
            <ul class="mt-1.5 flex flex-wrap gap-1.5">
              {todo.audience.map((name) => (
                <li key={name}>
                  <PersonChip name={name} initials={initials(name)} />
                </li>
              ))}
            </ul>
          </section>

          <details class="collapse-arrow bg-base-200 collapse">
            <summary class="collapse-title min-h-0 py-2.5 text-sm font-medium">
              Something wrong with this?
            </summary>
            <div class="collapse-content space-y-3">
              <fieldset class="grid grid-cols-2 gap-x-3 gap-y-2">
                <legend class="sr-only">What is wrong</legend>
                {CORRECTION_REASONS.map((reason) => (
                  <label key={reason} class="flex items-center gap-2 text-sm">
                    <input type="radio" class="radio radio-sm" name="reason" value={reason} />
                    {reason}
                  </label>
                ))}
              </fieldset>
              <textarea
                class="textarea textarea-sm w-full"
                rows={2}
                name="note"
                aria-label="Anything to add (optional)"
                placeholder="Anything to add (optional)"
              ></textarea>
              <button type="button" class="btn btn-sm">
                Send correction
              </button>
            </div>
          </details>
        </div>

        <footer class="border-base-300 bg-base-100 sticky bottom-0 flex gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" class="btn btn-primary btn-sm grow">
            Mark done
          </button>
          <button type="button" class="btn btn-sm">
            Snooze
          </button>
        </footer>
      </section>
    )
  }
}
