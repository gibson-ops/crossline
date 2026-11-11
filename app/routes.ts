import { get, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: get('/'),
  // For the host's health check and for monitoring: answers whether the database is reachable.
  health: get('/health'),
})
