import { clientEntry, navigate, type Handle } from 'remix/component'

interface PanelKeysProps {
  /** The id of the record whose detail is open, or null when none is. */
  openId: string | null
  /** Where Escape goes: the same page with the detail closed. */
  closeHref: string
  /** The element that takes focus when a detail opens (its heading). */
  focusId: string
}

/**
 * Keyboard behavior for a detail pane whose open state lives in the URL:
 * - Escape closes it (unless a native popover is open and should close first);
 * - when a different record opens, focus moves to the pane's heading.
 * It renders nothing visible.
 */
export const PanelKeys = clientEntry(import.meta.url, function PanelKeys(handle: Handle<PanelKeysProps>) {
  let listening = false
  let focusedFor: string | null = null

  return () => {
    const { openId, focusId } = handle.props

    handle.queueTask(() => {
      // Step 1 (once): listen for Escape for as long as this component lives.
      if (!listening) {
        listening = true
        document.addEventListener(
          'keydown',
          (event) => {
            if (event.key !== 'Escape' || event.defaultPrevented) return
            if (!handle.props.openId || document.querySelector(':popover-open')) return
            void navigate(handle.props.closeHref, { resetScroll: false })
          },
          { signal: handle.signal },
        )
      }

      // Step 2: move focus when a detail opens or switches, so keyboard and screen-reader
      // users land in it. Closing leaves focus where the browser put it.
      if (openId && openId !== focusedFor) document.getElementById(focusId)?.focus()
      focusedFor = openId
    })

    return <span hidden></span>
  }
})
