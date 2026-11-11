/**
 * The email cannot read the app's theme directly, so its colors are a generated copy.
 * This test fails when the copy has drifted from the theme: run `npm run email:theme`.
 */
import * as assert from 'remix/assert'
import { describe, it } from 'remix/test'

import { emailTheme } from '../app/email/theme.generated.ts'
// The generator is a plain script (no types); it exports the function the script itself runs.
// @ts-expect-error -- scripts/email-theme.mjs has no type declarations
import { buildEmailTheme } from '../scripts/email-theme.mjs'

/** WCAG relative luminance of a 6-digit hex color. */
function luminance(hex: string): number {
  const channels = [0, 1, 2].map((index) => {
    const value = Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** WCAG contrast ratio between two hex colors, from 1 to 21. */
function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].toSorted((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('email theme', () => {
  it('matches the daisyUI theme the app uses', () => {
    assert.deepEqual({ ...emailTheme }, buildEmailTheme())
  })

  it('keeps text readable (WCAG AA, 4.5:1)', () => {
    assert.ok(contrast(emailTheme.text, emailTheme.surface) >= 4.5)
    assert.ok(contrast(emailTheme.muted, emailTheme.surface) >= 4.5)
    assert.ok(contrast(emailTheme.muted, emailTheme.page) >= 4.5)
    assert.ok(contrast(emailTheme.primaryText, emailTheme.primary) >= 4.5)
    assert.ok(contrast(emailTheme.neutralText, emailTheme.neutral) >= 4.5)
  })
})
