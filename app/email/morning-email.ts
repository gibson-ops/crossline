/**
 * The morning email, written in MJML and rendered to the table-based HTML that Gmail and
 * Outlook need. Colors and corner sizes come from `theme.generated.ts`, so the email looks like
 * it belongs with the app. Email is light only: Gmail ignores a dark-mode preference.
 */
import mjml2html from 'mjml'

import { emailTheme, type EmailTheme } from './theme.generated.ts'

export interface MorningEmailItem {
  title: string
  /** One line under the title: where it came from, when it is due, its size. */
  detail: string
  /** Shown in bold before the detail when the to-do is due now, e.g. "Due today". */
  urgent?: string
  /** Signed-in page for this item. */
  href: string
  /** The line the to-do came from, shown for the items to do now. */
  quote?: { speaker: string; text: string }
}

export interface MorningEmailData {
  /** The organization's label, for the footer. */
  organization: string
  /** The date as the heading, e.g. "Tuesday, November 10". */
  heading: string
  /** One line of counts under the heading. */
  summary: string
  meetings: { time: string; title: string; detail: string }[]
  doNow: MorningEmailItem[]
  next: MorningEmailItem[]
  /** A few from "after", so the person sees what is coming. */
  after: MorningEmailItem[]
  /** How many to-dos are in "after" altogether; the email shows only the first few. */
  afterTotal: number
  /** Suggestions waiting for a yes or no. */
  suggestions: { title: string; reason: string; yesHref: string; noHref: string }[]
  callsToReview: { title: string; detail: string; href: string }[]
  /** What was handled since the last email, as short statements. */
  handled: string[]
  /** Page with the full list. */
  listHref: string
  /** Page where the person changes when this email is sent. */
  settingsHref: string
  /** When the email is sent, for the footer, e.g. "weekdays at 7:00". */
  schedule: string
}

const FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

/** Escapes text for use inside MJML (which is XML). */
function esc(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Builds the email's MJML.
 * @param data what the email says
 * @param theme colors and corner sizes; defaults to the app's theme
 * @returns MJML markup, ready for `renderMorningEmail`
 */
export function morningEmailMjml(data: MorningEmailData, theme: EmailTheme = emailTheme): string {
  /** A section heading with its count. */
  const heading = (title: string, count: number | string) => `
      <mj-text padding="16px 20px 4px" font-size="13px" font-weight="600" color="${theme.text}">
        ${esc(title)} <span style="font-weight:400;color:${theme.muted}">${count}</span>
      </mj-text>`

  /** One to-do: a linked title, a detail line, and the quote when there is one. */
  const item = (entry: MorningEmailItem) => `
      <mj-text padding="6px 20px">
        <a href="${esc(entry.href)}" style="color:${theme.text};font-weight:600;text-decoration:none">${esc(entry.title)}</a><br />
        <span style="font-size:12px;color:${theme.muted}">${entry.urgent ? `<span style="font-weight:600;color:${theme.text}">${esc(entry.urgent)}</span> · ` : ''}${esc(entry.detail)}</span>
        ${
          entry.quote
            ? `<div style="margin-top:6px;padding:8px 12px;background:${theme.page};border-radius:${theme.radiusField}px;font-size:13px">
                 <span style="font-size:12px;font-weight:600">${esc(entry.quote.speaker)}</span><br />${esc(entry.quote.text)}
               </div>`
            : ''
        }
      </mj-text>`

  const rule = `<mj-divider border-width="1px" border-color="${theme.border}" padding="10px 20px 0" />`

  const sections: string[] = []

  if (data.meetings.length > 0) {
    sections.push(`${heading('Meetings today', data.meetings.length)}
      <mj-table padding="2px 20px 6px" color="${theme.text}" font-size="14px" line-height="20px">
        ${data.meetings
          .map(
            (meeting) => `<tr>
          <td style="width:52px;padding:4px 0;font-weight:600;vertical-align:top">${esc(meeting.time)}</td>
          <td style="padding:4px 0">${esc(meeting.title)}<br /><span style="font-size:12px;color:${theme.muted}">${esc(meeting.detail)}</span></td>
        </tr>`,
          )
          .join('')}
      </mj-table>`)
  }

  if (data.doNow.length > 0)
    sections.push(heading('Do now', data.doNow.length) + data.doNow.map(item).join(''))
  if (data.next.length > 0) sections.push(heading('Next', data.next.length) + data.next.map(item).join(''))
  if (data.after.length > 0)
    sections.push(
      heading(
        'After',
        data.after.length < data.afterTotal
          ? `first ${data.after.length} of ${data.afterTotal}`
          : data.afterTotal,
      ) + data.after.map(item).join(''),
    )

  // In the app the buttons say "Keep here", because the to-do is listed under Next there.
  // The email lists suggestions under their own heading, so it names the place.
  if (data.suggestions.length > 0) {
    sections.push(
      heading('Waiting for your answer', data.suggestions.length) +
        data.suggestions
          .map(
            (suggestion) => `
      <mj-text padding="6px 20px">
        <span style="font-weight:600">Suggested for Next.</span> ${esc(suggestion.title)}<br />
        <span style="font-size:12px;color:${theme.muted}">${esc(suggestion.reason)}</span><br />
        <a href="${esc(suggestion.yesHref)}" style="display:inline-block;margin-top:8px;padding:6px 14px;background:${theme.neutral};color:${theme.neutralText};border-radius:${theme.radiusField}px;font-size:13px;font-weight:600;text-decoration:none">Keep in Next</a>
        <a href="${esc(suggestion.noHref)}" style="display:inline-block;margin:8px 0 0 6px;padding:5px 13px;border:1px solid ${theme.border};color:${theme.text};border-radius:${theme.radiusField}px;font-size:13px;font-weight:600;text-decoration:none">Move back</a>
      </mj-text>`,
          )
          .join(''),
    )
  }

  if (data.callsToReview.length > 0) {
    sections.push(
      heading('Calls to review', data.callsToReview.length) +
        data.callsToReview
          .map(
            (call) => `
      <mj-text padding="6px 20px">
        <a href="${esc(call.href)}" style="color:${theme.text};font-weight:600;text-decoration:none">${esc(call.title)}</a><br />
        <span style="font-size:12px;color:${theme.muted}">${esc(call.detail)}</span>
      </mj-text>`,
          )
          .join(''),
    )
  }

  if (data.handled.length > 0) {
    sections.push(`${heading('Handled since yesterday', data.handled.length)}
      <mj-text padding="2px 20px 6px" font-size="13px" color="${theme.muted}">
        ${data.handled.map(esc).join('<br />')}
      </mj-text>`)
  }

  return `<mjml>
  <mj-head>
    <mj-title>${esc(data.heading)}</mj-title>
    <mj-preview>${esc(data.summary)}</mj-preview>
    <mj-attributes>
      <mj-all font-family="${FONT}" />
      <mj-text font-size="14px" line-height="20px" color="${theme.text}" padding="0 20px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="${theme.page}" width="600px">
    <mj-section padding="20px 0 8px">
      <mj-column>
        <mj-text padding="0 20px" font-size="20px" line-height="26px" font-weight="600">${esc(data.heading)}</mj-text>
        <mj-text padding="2px 20px 0" font-size="13px" color="${theme.muted}">${esc(data.summary)}</mj-text>
      </mj-column>
    </mj-section>

    <mj-section background-color="${theme.surface}" border="1px solid ${theme.border}" border-radius="${theme.radiusBox}px" padding="0 0 14px">
      <mj-column>
        ${sections.join(rule)}
      </mj-column>
    </mj-section>

    <mj-section padding="14px 0 4px">
      <mj-column>
        <mj-button href="${esc(data.listHref)}" align="left" padding="0 20px" background-color="${theme.primary}" color="${theme.primaryText}" border-radius="${theme.radiusField}px" font-size="14px" font-weight="600" inner-padding="9px 16px">Open my list</mj-button>
      </mj-column>
    </mj-section>

    <mj-section padding="8px 0 24px">
      <mj-column>
        <mj-text font-size="12px" line-height="18px" color="${theme.muted}">
          Crossline sends this to you for ${esc(data.organization)} on ${esc(data.schedule)}.
          <a href="${esc(data.settingsHref)}" style="color:${theme.muted}">Change when it is sent</a>.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`
}

/**
 * Renders the email to HTML.
 * @returns the HTML to send
 * @throws when MJML reports a markup error, so a broken email is never sent
 */
export async function renderMorningEmail(
  data: MorningEmailData,
  theme: EmailTheme = emailTheme,
): Promise<string> {
  const result = await mjml2html(morningEmailMjml(data, theme), { validationLevel: 'strict' })
  if (result.errors.length > 0) {
    throw new Error(
      `The morning email's markup is invalid: ${result.errors.map((error) => error.formattedMessage).join('; ')}`,
    )
  }
  return result.html
}
