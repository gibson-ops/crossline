/** Query-string values the design pages pass along. Null and undefined are left out. */
export interface DesignQuery {
  theme?: string | null
  open?: string | null
  stretch?: string | null
}

/**
 * Builds a link to a design page, keeping the forced theme.
 * @param path the page's path, e.g. "/design/my-list"
 * @param query values to carry; empty ones are dropped
 * @returns a relative URL such as "/design/my-list?theme=dark&open=t1"
 */
export function designHref(path: string, query: DesignQuery = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value)
  }
  const text = params.toString()
  return text ? `${path}?${text}` : path
}

/** The themes a design page may be forced into. Anything else follows the device. */
export const FORCED_THEMES = ['winter', 'dark']

/**
 * Reads ?theme= from a request URL.
 * @returns "winter", "dark", or null to follow the device
 */
export function forcedTheme(url: URL): string | null {
  const requested = url.searchParams.get('theme')
  return requested && FORCED_THEMES.includes(requested) ? requested : null
}
