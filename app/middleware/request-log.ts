import { createContextKey, type Middleware } from 'remix/router'

export const RequestId = createContextKey<string>()

/**
 * Assigns a request id, logs one structured line per request, and echoes the id in
 * `X-Request-Id` so an error page can quote it.
 */
export function requestLog(): Middleware<{ key: typeof RequestId; value: string }> {
  return async (context, next) => {
    const id = crypto.randomUUID().slice(0, 8)
    context.set(RequestId, id)
    const start = performance.now()
    let response: Response
    try {
      response = await next()
    } catch (error) {
      log({ level: 'error', id, method: context.method, path: context.url.pathname, error: String(error) })
      // No renderer here (it may be what failed), so a fixed page. The id is hex: safe in HTML.
      response = new Response(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Something broke</title><link rel="stylesheet" href="/app.css"></head><body><main class="mx-auto max-w-xl px-4 py-12"><h1 class="text-2xl font-semibold">Something broke</h1><p class="mt-2">The error is in the server log. Request id: ${id}</p><p class="mt-4"><a class="btn" href="/">Back to the start</a></p></main></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    }
    if (context.url.pathname.startsWith('/assets/')) return response
    log({
      level: response.status >= 500 ? 'error' : 'info',
      id,
      method: context.method,
      path: context.url.pathname,
      status: response.status,
      ms: Math.round(performance.now() - start),
      frame: context.headers.get('X-Remix-Target') ?? undefined,
    })
    const headers = new Headers(response.headers)
    headers.set('X-Request-Id', id)
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }
}

// Tests assert on responses, not log lines; keep their output readable.
const quiet = process.env.NODE_ENV === 'test'

function log(fields: Record<string, unknown>) {
  if (quiet) return
  console.log(JSON.stringify({ time: new Date().toISOString(), ...fields }))
}
