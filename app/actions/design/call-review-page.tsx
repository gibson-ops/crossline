import type { Handle } from 'remix/component'

import { callToReview, initials, today, type CallToReview, type ReviewStretch } from '../../data/sample.ts'
import { Group, MUTED, PersonChip, Quote, ROW, Shell } from '../../ui/parts.tsx'
import { Document } from '../document.tsx'
import { designHref } from './hrefs.ts'

export interface CallReviewPageProps {
  /** Theme forced by ?theme=, or null to follow the device. */
  theme: string | null
  /** The stretch being confirmed, from ?stretch=; defaults to the first open one. */
  stretchId: string | null
}

/**
 * Call review: the person confirms who said a line only where the answer decides who owns a
 * to-do. One stretch is shown at a time, with the line in question marked; the to-dos the call
 * produced sit beside it, each showing whether it waits on a check.
 */
export function CallReviewPage(handle: Handle<CallReviewPageProps>) {
  return () => {
    const { theme } = handle.props
    const call = callToReview
    const current =
      call.stretches.find((stretch) => stretch.id === handle.props.stretchId) ??
      call.stretches.find((stretch) => stretch.status === 'open') ??
      call.stretches[0]
    const openCount = call.stretches.filter((stretch) => stretch.status === 'open').length

    return (
      <Document title={call.title} theme={theme ?? undefined}>
        <Shell active="calls" initials={today.initials}>
          <main class="mx-auto max-w-6xl px-3 pt-4 pb-6 lg:px-6">
            <header class="mb-4 px-1">
              <h1 class="text-xl font-semibold">{call.title}</h1>
              <p class={`text-sm ${MUTED}`}>
                {call.when} · {call.length} · recorded by {call.recorders.join(' and ')}
              </p>
            </header>

            <div class="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start lg:gap-6">
              <StretchCheck call={call} stretch={current} theme={theme} />

              <div class="space-y-4 lg:sticky lg:top-16">
                <Group id="call-todos" title="To-dos from this call" count={call.todos.length}>
                  {call.todos.map((todo) => (
                    <li key={todo.title} class={ROW}>
                      <span
                        class={`status ${todo.waitingOn ? 'status-warning' : 'status-success'}`}
                        aria-hidden="true"
                      ></span>
                      <div>
                        <div class="text-sm font-medium">{todo.title}</div>
                        <div class={`text-xs ${MUTED}`}>
                          {todo.owner} · at {todo.at} ·{' '}
                          {todo.waitingOn ? `waits on check ${checkNumber(call, todo.waitingOn)}` : 'added'}
                        </div>
                      </div>
                    </li>
                  ))}
                </Group>

                <div class="flex items-center gap-3 px-1">
                  <button type="button" class="btn btn-sm btn-primary" disabled={openCount > 0}>
                    Mark reviewed
                  </button>
                  <p class={`text-sm ${MUTED}`}>
                    {openCount > 0
                      ? `${openCount} ${openCount === 1 ? 'check' : 'checks'} left. To-dos that wait are added once they are answered.`
                      : 'Every check is answered.'}
                  </p>
                </div>
              </div>
            </div>
          </main>
        </Shell>
      </Document>
    )
  }
}

/** The 1-based position of a stretch among the call's checks. */
function checkNumber(call: CallToReview, stretchId: string): number {
  return call.stretches.findIndex((stretch) => stretch.id === stretchId) + 1
}

function StretchCheck(handle: Handle<{ call: CallToReview; stretch: ReviewStretch; theme: string | null }>) {
  return () => {
    const { call, stretch, theme } = handle.props
    const [viewer, other] = call.people
    const number = checkNumber(call, stretch.id)

    return (
      <section class="bg-base-100 border-base-300 rounded-box border" aria-labelledby="check-question">
        {/* Which check this is, and a way to move between them. */}
        <nav
          class="border-base-300 flex flex-wrap items-center gap-2 border-b px-4 py-2.5"
          aria-label="Speaker checks"
        >
          <span class="me-1 text-sm font-medium">
            Check {number} of {call.stretches.length}
          </span>
          {call.stretches.map((item, index) => (
            <a
              key={item.id}
              class={`btn btn-xs ${item.id === stretch.id ? 'outline-base-content outline-2' : ''}`}
              aria-current={item.id === stretch.id ? 'step' : undefined}
              href={designHref('/design/call-review', { theme, stretch: item.id })}
            >
              <span
                class={`status ${item.status === 'answered' ? 'status-success' : 'status-warning'}`}
                aria-hidden="true"
              ></span>
              {index + 1}
              <span class="sr-only">{item.status === 'answered' ? ', answered' : ', open'}</span>
            </a>
          ))}
        </nav>

        <div class="space-y-3 p-4">
          <div>
            <h2 id="check-question" class="text-base font-semibold">
              {stretch.question}
            </h2>
            <p class={`text-sm ${MUTED}`}>
              The recorder's labels and the wording disagree here. The marked line decides who owns a to-do.
            </p>
          </div>

          <div>
            {stretch.turns.map((turn) => (
              <Quote
                key={turn.index}
                speaker={turn.derived}
                when={turn.at}
                text={turn.text}
                mine={turn.derived === viewer}
                marked={turn.carriesPromise}
                note={turn.labeled === turn.derived ? undefined : `The recorder labeled this ${turn.labeled}`}
              />
            ))}
          </div>

          {stretch.status === 'answered' ? (
            <div class="bg-base-200 rounded-field flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span class="grow">
                You confirmed <span class="font-medium">{stretch.answer}</span> said the marked line.
              </span>
              <button type="button" class="btn btn-xs">
                Change
              </button>
            </div>
          ) : (
            <fieldset class="space-y-2">
              <legend class="text-sm font-medium">Who said the marked line?</legend>
              <div class="grid gap-2 sm:grid-cols-2">
                <AnswerButton name={viewer} hint="1" />
                <AnswerButton name={other} hint="2" />
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-sm">
                  Swap the whole stretch
                  <kbd class="kbd kbd-xs hidden lg:inline-flex">S</kbd>
                </button>
                <button type="button" class="btn btn-sm btn-ghost">
                  Not sure
                  <kbd class="kbd kbd-xs hidden lg:inline-flex">N</kbd>
                </button>
              </div>
            </fieldset>
          )}
        </div>
      </section>
    )
  }
}

/** One of the two people as an answer. The keyboard hint shows only where a keyboard is likely. */
function AnswerButton(handle: Handle<{ name: string; hint: string }>) {
  return () => (
    <button type="button" class="btn h-auto justify-start gap-2 py-2">
      <PersonChip name={handle.props.name} initials={initials(handle.props.name)} />
      <span class="grow"></span>
      <kbd class="kbd kbd-xs hidden lg:inline-flex">{handle.props.hint}</kbd>
    </button>
  )
}
