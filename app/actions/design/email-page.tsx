import type { Handle } from 'remix/component'

import { callReviews, groupedTodos, handled, meetings, today, todos, type Todo } from '../../data/sample.ts'
import type { MorningEmailData, MorningEmailItem } from '../../email/morning-email.ts'
import { MUTED, Shell } from '../../ui/parts.tsx'
import { Document } from '../document.tsx'
import { designHref } from './hrefs.ts'

/**
 * The made-up morning email's content, built from the same sample data as "My list".
 * @param origin the app's address, so links in the email are absolute
 */
export function sampleMorningEmail(origin: string): MorningEmailData {
  const link = (path: string) => new URL(path, origin).toString()
  const toItem = (todo: Todo, withQuote: boolean): MorningEmailItem => ({
    title: todo.title,
    urgent: todo.dueNow ? `Due ${todo.due.toLowerCase()}` : undefined,
    detail: [todo.source.label, todo.due && !todo.dueNow ? `Due ${todo.due}` : null, `Size ${todo.size}`]
      .filter(Boolean)
      .join(' · '),
    href: link(`/design/my-list?open=${todo.id}`),
    quote: withQuote ? { speaker: todo.source.speaker, text: todo.source.quote } : undefined,
  })
  const [doNow, next, after] = groupedTodos()
  const suggested = todos.filter((todo) => todo.suggestion)

  return {
    organization: 'Northfield Supply',
    heading: today.heading,
    // The email lists a suggested to-do under its own heading, so it is counted there, not under Next.
    summary: `${meetings.length} meetings · ${doNow.todos.length} to do now · ${next.todos.length - suggested.length} next · ${suggested.length} waiting for your answer`,
    meetings: meetings.map(({ time, title, detail }) => ({ time, title, detail })),
    doNow: doNow.todos.map((todo) => toItem(todo, true)),
    // A suggested to-do appears once, under "Waiting for your answer".
    next: next.todos.filter((todo) => !todo.suggestion).map((todo) => toItem(todo, false)),
    after: after.todos.slice(0, 2).map((todo) => toItem(todo, false)),
    afterTotal: after.todos.length,
    suggestions: suggested.map((todo) => ({
      title: todo.title,
      reason: todo.suggestion ?? '',
      yesHref: link(`/design/my-list?open=${todo.id}`),
      noHref: link(`/design/my-list?open=${todo.id}`),
    })),
    callsToReview: callReviews.map((call) => ({
      title: call.title,
      detail: `${call.when} · ${call.detail}`,
      href: link('/design/call-review'),
    })),
    handled,
    listHref: link('/design/my-list'),
    settingsHref: link('/design'),
    schedule: 'weekdays at 7:00',
  }
}

/** The morning email as it would arrive, in a frame at a desktop width and one at a phone width. */
export function EmailPage(handle: Handle<{ theme: string | null }>) {
  return () => {
    const { theme } = handle.props
    const rawHref = '/design/email/raw'
    return (
      <Document title="Morning email" theme={theme ?? undefined}>
        <Shell initials={today.initials}>
          <main class="mx-auto max-w-6xl px-3 pt-4 pb-6 lg:px-6">
            <header class="mb-4 px-1">
              <h1 class="text-xl font-semibold">Morning email</h1>
              <p class={`max-w-prose text-sm ${MUTED}`}>
                This is the HTML that would be sent, rendered by MJML with colors and corner sizes converted
                from the app's theme. Email is light only, because Gmail ignores a dark setting.{' '}
                <a class="link" href={rawHref}>
                  Open the email by itself
                </a>
                {' or '}
                <a class="link" href={designHref('/design', { theme })}>
                  go back to the gallery
                </a>
                .
              </p>
            </header>

            <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
              <figure class="hidden min-w-0 lg:block">
                <figcaption class="mb-1.5 px-1 text-sm font-semibold">Desktop, 640 wide</figcaption>
                <iframe
                  class="border-base-300 rounded-box h-[60rem] w-[40rem] border"
                  src={rawHref}
                  title="The morning email at desktop width"
                ></iframe>
              </figure>
              <figure class="min-w-0">
                <figcaption class="mb-1.5 px-1 text-sm font-semibold">Phone, 375 wide</figcaption>
                <iframe
                  class="border-base-300 rounded-box h-[60rem] w-[375px] max-w-full border"
                  src={rawHref}
                  title="The morning email at phone width"
                ></iframe>
              </figure>
            </div>
          </main>
        </Shell>
      </Document>
    )
  }
}
