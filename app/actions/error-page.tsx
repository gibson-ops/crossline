import type { Handle } from 'remix/component'

import { Document } from './document.tsx'

export interface ErrorPageProps {
  title: string
  message: string
  /** Shown for server errors so the person can quote it and the log line can be found. */
  requestId?: string
}

/** The page for an expected failure: not found, a conflict, or a database error. */
export function ErrorPage(handle: Handle<ErrorPageProps>) {
  return () => {
    const { title, message, requestId } = handle.props
    return (
      <Document title={title}>
        <main class="mx-auto max-w-xl px-4 py-12">
          <h1 class="text-2xl font-semibold">{title}</h1>
          <p class="mt-2">{message}</p>
          {requestId ? <p class="text-base-content/70 mt-2 text-sm">Request id: {requestId}</p> : null}
          <p class="mt-4">
            <a class="btn" href="/">
              Back to the start
            </a>
          </p>
        </main>
      </Document>
    )
  }
}
