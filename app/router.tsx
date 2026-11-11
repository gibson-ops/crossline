import { createRouter, type RouterContext } from 'remix/router'
import { cop } from 'remix/middleware/cop'
import { formData } from 'remix/middleware/form-data'
import { render } from 'remix/middleware/render'
import { staticFiles } from 'remix/middleware/static'

import controller from './actions/controller.tsx'
import { ErrorPage } from './actions/error-page.tsx'
import { assets } from './assets.ts'
import { noStoreByDefault } from './middleware/cache.ts'
import { requestLog } from './middleware/request-log.ts'
import { provideRuntime } from './middleware/runtime.ts'
import { routes } from './routes.ts'
import type { AppRuntime } from './runtime.ts'

/** The app's router over a runtime: the server passes the live one, tests one on a throwaway database. */
export function createAppRouter(runtime: AppRuntime) {
  const router = createRouter({
    // Any URL no route matches.
    defaultHandler: (context) =>
      context.render(<ErrorPage title="Not found" message="There's no page at this address." />, {
        status: 404,
      }),
    middleware: [
      requestLog(),
      noStoreByDefault(),
      // Rejects cross-origin POSTs.
      cop(),
      // Not fingerprinted, so browsers revalidate (cheap with ETags) rather than keep stale copies.
      staticFiles('./public', { index: false, cacheControl: 'no-cache' }),
      // Parses POST bodies into context.formData; empty for GET.
      formData(),
      provideRuntime(runtime),
      // A component that throws while rendering is logged here instead of crashing the process.
      render({
        assets,
        onError: (error) =>
          console.error(
            JSON.stringify({
              time: new Date().toISOString(),
              level: 'error',
              event: 'render',
              error: String(error),
            }),
          ),
      }),
    ],
  })
  router.map(routes, controller)
  return router
}

export type AppContext = RouterContext<ReturnType<typeof createAppRouter>>

declare module 'remix' {
  interface RouterTypes {
    context: AppContext
  }
}
