import { get, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: get('/'),
  // For the host's health check and for monitoring: answers whether the database is reachable.
  health: get('/health'),
  // The design system: the app's components and mockups of its main screens, on made-up data.
  // Each page takes ?theme=winter or ?theme=dark to force a theme; without it, the device decides.
  design: route('/design', {
    gallery: get('/'),
    // ?open=<to-do id> shows that to-do's detail.
    myList: get('/my-list'),
    // ?stretch=<stretch id> picks the stretch being confirmed.
    callReview: get('/call-review'),
    // The morning email shown in frames at desktop and phone widths.
    email: get('/email'),
    // The email's HTML exactly as it would be sent.
    emailRaw: get('/email/raw'),
  }),
})
