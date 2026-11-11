import * as http from 'node:http'
import { createRequestListener } from 'remix/node-fetch-server'

import { assets } from './app/assets.ts'
import { createAppRouter } from './app/router.tsx'
import { LiveBase, startRuntime } from './app/runtime.ts'

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 44100
const hmrProxyPort = process.env.HMR_PROXY_PORT ? Number.parseInt(process.env.HMR_PROXY_PORT, 10) : null
const isHmr = process.env.REMIX_NODE_HMR === '1'

// Initialize before listening: a bad config or a failed migration stops startup here.
const runtime = await startRuntime(LiveBase).catch((error: unknown) => {
  console.error(`Startup failed: ${String(error)}`)
  process.exit(1)
})
const router = createAppRouter(runtime)

// The app sits behind a reverse proxy in every environment, so trust its forwarded headers.
const server = http.createServer(createRequestListener(router.fetch, { trustProxy: true }))

server.listen(port, () => {
  if (isHmr) {
    import('remix/node-hmr/runtime').then((nodeHmr) => nodeHmr.emitServerReady())
  }

  console.log(`Server listening on http://localhost:${hmrProxyPort ?? port}`)
})

let shuttingDown = false

/** Stops accepting requests, then closes the asset server and the database pool, once. */
function shutdown() {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  server.close(() => Promise.allSettled([assets.close(), runtime.dispose()]).finally(() => process.exit(0)))
  server.closeAllConnections()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
