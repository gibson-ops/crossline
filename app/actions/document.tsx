import type { Handle, RemixNode } from 'remix/component'
import { ImportMap } from 'remix/component/server'

import { scriptEntry } from '../assets.ts'

export interface DocumentProps {
  children?: RemixNode
  /** The page's own title; the app name is appended. */
  title?: string
}

const APP_NAME = 'Crossline'

/**
 * The shared HTML shell. The theme is not set here: the stylesheet makes Winter the default
 * and switches to the dark theme when the device asks for dark (styles/app.css).
 */
export function Document(handle: Handle<DocumentProps>) {
  return () => {
    const { children, title } = handle.props
    const { href, importMap, preloads } = scriptEntry

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="color-scheme" content="light dark" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <title>{title ? `${title} · ${APP_NAME}` : APP_NAME}</title>
          <link rel="stylesheet" href="/app.css" />
          <ImportMap value={importMap} />
          {preloads.map((preloadHref) => (
            <link key={preloadHref} rel="modulepreload" href={preloadHref} />
          ))}
          <script type="module" src={href}></script>
        </head>
        <body>{children}</body>
      </html>
    )
  }
}
