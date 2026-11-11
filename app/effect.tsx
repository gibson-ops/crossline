import { Cause, Effect, Exit } from 'effect'

import type { AppError } from '../domain/errors.ts'
import { ErrorPage } from './actions/error-page.tsx'
import { RequestId } from './middleware/request-log.ts'
import { Runtime } from './middleware/runtime.ts'
import type { AppContext } from './router.tsx'
import type { AppServices } from './runtime.ts'

/**
 * The one bridge from a controller into Effect. Runs `program`, hands its value to `onSuccess`,
 * and maps typed failures to responses. Controllers never call `runPromise` themselves.
 *
 * @param context the request context (carries the runtime)
 * @param program what the action does, with every expected failure in its error type
 * @param onSuccess turns the program's value into the response
 * @param onError optional per-route handling for expected errors (e.g. re-render a form with
 *   the message); return undefined to fall back to the default mapping
 */
export async function respond<A>(
  context: AppContext,
  program: Effect.Effect<A, AppError, AppServices>,
  onSuccess: (value: A) => Response | Promise<Response>,
  onError?: (error: AppError) => Response | Promise<Response> | undefined,
): Promise<Response> {
  const exit = await context.get(Runtime).runPromiseExit(program)
  if (Exit.isSuccess(exit)) return onSuccess(exit.value)
  const failure = Cause.findErrorOption(exit.cause)
  if (failure._tag === 'Some') {
    const error = failure.value
    // A database failure is expected in type but not in life: its details go to the log,
    // keyed by the request id the error page shows.
    if (error._tag === 'StoreError') {
      console.error(
        JSON.stringify({
          time: new Date().toISOString(),
          level: 'error',
          event: 'store',
          id: context.get(RequestId),
          error: error.message,
        }),
      )
    }
    return (
      (await onError?.(error)) ??
      (context.method === 'GET' ? errorPage(context, error) : errorResponse(error))
    )
  }
  // A defect (bug or crash): rethrow so the server boundary logs it and answers 500.
  throw Cause.squash(exit.cause)
}

/** HTTP status for each expected error. */
function statusOf(error: AppError): number {
  switch (error._tag) {
    case 'NotFound':
      return 404
    case 'ValidationError':
      return 400
    case 'ConflictError':
      return 409
    case 'StoreError':
      return 500
  }
}

/** An expected error on a page request, as an HTML page with the matching status. */
export function errorPage(context: AppContext, error: AppError): Response {
  const status = statusOf(error)
  const title = error._tag === 'NotFound' ? 'Not found' : 'Something went wrong'
  const message =
    error._tag === 'NotFound'
      ? `There's no ${error.what} here.`
      : error._tag === 'StoreError'
        ? 'The data could not be read. The details are in the server log.'
        : 'That request conflicts with the current data. Reload and try again.'
  return context.render(
    <ErrorPage
      title={title}
      message={message}
      requestId={status === 500 ? context.get(RequestId) : undefined}
    />,
    { status },
  )
}

/** Default JSON mapping for expected errors (autosave and other fetch requests). */
export function errorResponse(error: AppError): Response {
  const status = statusOf(error)
  switch (error._tag) {
    case 'NotFound':
      return Response.json({ ok: false, error: `No ${error.what} ${error.id}` }, { status })
    case 'ValidationError':
      return Response.json({ ok: false, field: error.field, error: error.message }, { status })
    case 'ConflictError':
      return Response.json(
        { ok: false, field: error.field, error: 'Changed since you opened it', current: error.current },
        { status },
      )
    case 'StoreError':
      // The driver's message can name tables and values, so it goes to the log, not the reply.
      return Response.json({ ok: false, error: 'The data could not be read or saved' }, { status })
  }
}
