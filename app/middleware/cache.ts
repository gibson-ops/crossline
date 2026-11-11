import type { Middleware } from 'remix/router'

/**
 * Pages and JSON are personal and change with every edit, so nothing caches them:
 * `Cache-Control: no-store` unless the response already chose a policy (static files and
 * fingerprinted assets set their own).
 */
export function noStoreByDefault(): Middleware {
  return async (_context, next) => {
    const response = await next()
    if (response.headers.has('Cache-Control')) return response
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', 'no-store')
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }
}
