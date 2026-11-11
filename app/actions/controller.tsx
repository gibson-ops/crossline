import { Effect } from 'effect'
import { createController } from 'remix/router'

import { Database } from '../../services/database.ts'
import { assets } from '../assets.ts'
import { respond } from '../effect.tsx'
import { routes } from '../routes.ts'
import { HomePage } from './home-page.tsx'

export default createController(routes, {
  actions: {
    async assets(context) {
      return (await assets.fetch(context.request)) ?? new Response('Not Found', { status: 404 })
    },

    home(context) {
      return context.render(<HomePage />)
    },

    /** 200 with the schema's state when the database answers; 500 when it doesn't. */
    health(context) {
      return respond(
        context,
        Effect.gen(function* () {
          const database = yield* Database
          return yield* database.health
        }),
        (health) => Response.json({ ok: true, database: 'ok', migrationsApplied: health.migrationsApplied }),
        // Health is read by machines, so failures answer JSON even though this is a GET.
        () => Response.json({ ok: false, database: 'unreachable' }, { status: 500 }),
      )
    },
  },
})
