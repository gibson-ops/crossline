import { createController } from 'remix/router'

import { todos } from '../../data/sample.ts'
import { renderMorningEmail } from '../../email/morning-email.ts'
import { routes } from '../../routes.ts'
import { CallReviewPage } from './call-review-page.tsx'
import { EmailPage, sampleMorningEmail } from './email-page.tsx'
import { GalleryPage } from './gallery-page.tsx'
import { forcedTheme } from './hrefs.ts'
import { MyListPage } from './my-list-page.tsx'

/** The design system pages. They read made-up data and save nothing. */
export default createController(routes.design, {
  actions: {
    gallery(context) {
      return context.render(<GalleryPage theme={forcedTheme(context.url)} />)
    },

    myList(context) {
      const openId = context.url.searchParams.get('open')
      const open = todos.find((todo) => todo.id === openId) ?? null
      return context.render(<MyListPage theme={forcedTheme(context.url)} open={open} />)
    },

    callReview(context) {
      return context.render(
        <CallReviewPage
          theme={forcedTheme(context.url)}
          stretchId={context.url.searchParams.get('stretch')}
        />,
      )
    },

    email(context) {
      return context.render(<EmailPage theme={forcedTheme(context.url)} />)
    },

    /** The email's HTML exactly as it would be sent, with links pointing back at this app. */
    async emailRaw(context) {
      const html = await renderMorningEmail(sampleMorningEmail(context.url.origin))
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    },
  },
})
