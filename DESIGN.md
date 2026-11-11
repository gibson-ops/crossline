---
name: Crossline
description: A team's promises, each shown with the words it came from.
colors:
  base-100: 'oklch(100% 0 0)'
  base-200: 'oklch(97.466% 0.011 259.822)'
  base-300: 'oklch(93.268% 0.016 262.751)'
  base-content: 'oklch(41.886% 0.053 255.824)'
  primary: 'oklch(56.86% 0.255 257.57)'
  primary-content: 'oklch(100% 0 0)'
  neutral: 'oklch(19.616% 0.063 257.651)'
  neutral-content: 'oklch(83.923% 0.012 257.651)'
  success: 'oklch(58% 0.13 165)'
  warning: 'oklch(64% 0.15 65)'
  error: 'oklch(58% 0.21 25)'
  dark-base-100: 'oklch(25.33% 0.016 252.42)'
  dark-base-200: 'oklch(23.26% 0.014 253.1)'
  dark-base-300: 'oklch(21.15% 0.012 254.09)'
  dark-base-content: 'oklch(97.807% 0.029 256.847)'
  dark-primary: 'oklch(58% 0.233 277.117)'
  dark-primary-content: 'oklch(100% 0 0)'
  dark-neutral: 'oklch(92% 0.02 257)'
  dark-neutral-content: 'oklch(22% 0.03 257)'
  dark-success: 'oklch(76% 0.177 163.223)'
  dark-warning: 'oklch(82% 0.189 84.429)'
  dark-error: 'oklch(71% 0.194 13.428)'
typography:
  headline:
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1.375
  heading:
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.43
  row-title:
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.43
  body:
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.43
  detail:
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.33
  button-label:
    fontFamily: 'ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 600
rounded:
  field: '0.5rem'
  box: '1rem'
  selector: '1rem'
  full: '9999px'
spacing:
  row-y: '8px'
  row-x: '12px'
  pane: '16px'
  group: '20px'
  column: '24px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-content}'
    typography: '{typography.button-label}'
    rounded: '{rounded.field}'
    height: '2rem'
    padding: '0 12px'
  button-neutral:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.neutral-content}'
    typography: '{typography.button-label}'
    rounded: '{rounded.field}'
    height: '2rem'
    padding: '0 12px'
  button-plain:
    backgroundColor: '{colors.base-200}'
    textColor: '{colors.base-content}'
    typography: '{typography.button-label}'
    rounded: '{rounded.field}'
    height: '2rem'
    padding: '0 12px'
  group-surface:
    backgroundColor: '{colors.base-100}'
    textColor: '{colors.base-content}'
    rounded: '{rounded.box}'
  row:
    typography: '{typography.row-title}'
    padding: '8px 12px'
  quote-bubble:
    backgroundColor: '{colors.base-300}'
    textColor: '{colors.base-content}'
    typography: '{typography.body}'
    rounded: '{rounded.field}'
    padding: '8px 16px'
  quote-bubble-marked:
    backgroundColor: '{colors.neutral}'
    textColor: '{colors.neutral-content}'
    rounded: '{rounded.field}'
    padding: '8px 16px'
  suggestion:
    textColor: '{colors.base-content}'
    typography: '{typography.body}'
    rounded: '{rounded.field}'
    padding: '6px 12px'
  kind-badge:
    backgroundColor: '{colors.base-200}'
    textColor: '{colors.base-content}'
    typography: '{typography.detail}'
    rounded: '{rounded.selector}'
    height: '1.25rem'
  person-chip:
    backgroundColor: '{colors.base-200}'
    textColor: '{colors.base-content}'
    typography: '{typography.body}'
    rounded: '{rounded.selector}'
    height: '1.75rem'
  field-input:
    backgroundColor: '{colors.base-100}'
    textColor: '{colors.base-content}'
    rounded: '{rounded.field}'
    height: '2rem'
---

# Design System: Crossline

## Overview

**Creative North Star: "The Quoted Promise"**

Crossline shows a promise with the words it came from. The quote is the one loud shape in the system: a filled speech bubble, on the to-do, in call review and in the morning email. Everything around it is quiet so the quote and the day's order are what the eye finds.

The look is daisyUI 5 on Tailwind 4. Light mode is daisyUI's Winter with five values changed for contrast. Dark mode is daisyUI's Dark colors with Winter's corner sizes and flat look, and a light neutral. Only colors change between modes. Parts are daisyUI's own: list rows, ghost badges, chat bubbles, fieldsets, a dock on phones.

Screens are dense. A day fits on one screen: rows are tighter than daisyUI's default, type is small, and there is no decoration. Phone and desk carry equal weight.

**Key Characteristics:**

- Every color and corner comes from the theme in `styles/app.css`.
- One system sans, small sizes, tabular numerals everywhere.
- Flat: no shadows. Depth is a white surface with a hairline border on a pale page.
- One saturated blue, used for one action on a screen.
- Status is a small dot. Words stay in the text color.
- A quote is filled. A suggestion is dashed.

## Colors

Cool blue-gray surfaces, slate-blue text, one saturated blue, and a near-black navy for the strongest mark. Colors are named by job, never by hue.

### Primary

- **Action Blue** (`primary`, with white `primary-content`): the one main action on a screen (Mark done, Mark reviewed, Open my list). Also the selection tint (22%), the text cursor and focus rings on links.

### Neutral

- **Surface White** (`base-100`): raised surfaces: lists, panes, the top bar, the dock, fields.
- **Page Frost** (`base-200`): the page behind surfaces, and quiet fills inside a surface (plain buttons, badges, chips, the correction box, an answered check).
- **Rule Blue-Gray** (`base-300`): borders, rules, and the fill of a quote bubble.
- **Slate Text** (`base-content`): all text. Secondary text is the same color at 80%.
- **Ink Navy** (`neutral`, with `neutral-content`): the strongest thing on a surface: the current place in the top bar, a firm yes, the marked line in call review, avatars. In dark mode it flips to a light fill with dark text so it still stands out.

### Status

| Token     | Means                                | Shown as                                                         |
| --------- | ------------------------------------ | ---------------------------------------------------------------- |
| `success` | Done, added, looks right             | Dot; soft fill of a "done" notice                                |
| `warning` | Waits on you                         | Dot                                                              |
| `error`   | Due today or past due; a failed save | Dot; soft fill of a "problem" notice; border of an invalid field |

### Theme changes from stock daisyUI

| Mode  | Value                             | Change                | Why                                                 |
| ----- | --------------------------------- | --------------------- | --------------------------------------------------- |
| Light | `primary-content`                 | White                 | Winter's pale blue label is 3.6:1 on the primary    |
| Light | `success`, `warning`, `error`     | Deeper                | They are small dots and must reach 3:1 on white     |
| Light | `error-content`                   | White                 | Set in the theme; no part uses it yet               |
| Dark  | Corner sizes, `--depth: 0`        | Winter's              | Only colors change with the mode                    |
| Dark  | `neutral`, `neutral-content`      | Light fill, dark text | Dark's near-black neutral recedes on a dark surface |
| Dark  | `primary-content`                 | White                 | Dark's own label is 4.1:1 on its primary            |
| Both  | Field, checkbox and radio borders | 65% of the text color | daisyUI's 20% is about 1.4:1                        |
| Both  | Placeholders                      | 80% of the text color | Same step as secondary text                         |

### Measured contrast

| Pair                                            | Light      | Dark        |
| ----------------------------------------------- | ---------- | ----------- |
| Text on `base-100` / `base-200`                 | 8.5 / 7.9  | 14.8 / 15.6 |
| Secondary text (80%) on `base-100` / `base-200` | 4.9 / 4.7  | 9.9 / 10.4  |
| Primary button label                            | 4.7        | 4.7         |
| Status dots on `base-100`                       | 3.5 to 4.8 | 5.5 to 9.0  |
| Field border on `base-100`                      | 3.4        | 7.0         |

### Named Rules

**The Theme-Only Rule.** Colors and shapes come only from the theme. No literal colors, no palette classes, no `dark:` variants. An organization's brand is a change to the theme blocks in `styles/app.css` and nothing else.

**The Dot-Not-Word Rule.** Status colors are dots and fills, never text. The words beside a dot stay in the text color, at medium weight when urgent.

**The One Primary Rule.** One primary action per screen. A firm choice is neutral. Everything else is plain or ghost.

**The Eighty Rule.** Secondary text is `text-base-content/80` (the `MUTED` constant). It is the lightest step that keeps 4.5:1 on both `base-100` and `base-200`. Do not go lighter, and do not put it on a quote bubble.

## Typography

**Body Font:** the system sans (Tailwind's default stack). No web font is loaded.

**Character:** Small, even and plain. Hierarchy comes from weight and from the 80% step, not from size jumps.

### Hierarchy

| Role         | Size                     | Weight                | Used for                                                             |
| ------------ | ------------------------ | --------------------- | -------------------------------------------------------------------- |
| Headline     | 20px                     | Semibold (600)        | The page title, once per page                                        |
| Title        | 16px, snug               | Semibold (600)        | Pane title, the question in call review, the wordmark                |
| Heading      | 14px                     | Semibold (600)        | Group headings, section headings inside a pane                       |
| Row title    | 14px                     | Medium (500)          | Row titles, names, legends, the lead words of a suggestion           |
| Body         | 14px                     | Regular (400)         | Running text, quotes, notices                                        |
| Detail       | 12px                     | Regular (400), at 80% | The line under a title, hints, quote headers and footers, badge text |
| Button label | 12px (`sm`), 11px (`xs`) | Semibold (600)        | daisyUI's own button sizes                                           |

Avatar initials are 12px, and 10px inside a chip.

### Named Rules

**The Tabular Rule.** Numerals are tabular on the whole page, so times and counts line up in columns.

**The Three Weights Rule.** Regular, medium, semibold. Medium marks the thing a row is about. Semibold marks a heading or a button.

## Layout

| Fact           | Value                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------- |
| Page width     | Centered, 72rem maximum                                                                      |
| Page padding   | 12px; 24px from 1024px                                                                       |
| Columns        | One below 1024px; from 1024px, a fluid main column and a fixed 26rem side column, 24px apart |
| Between groups | 20px                                                                                         |
| Row            | 12px sides, 8px top and bottom, 12px between parts                                           |
| Pane padding   | 16px, with 20px between its sections                                                         |
| Top bar        | Sticky, 48px, destinations centered from 640px                                               |
| Dock           | Below 640px, fixed to the bottom, replaces the top bar's destinations                        |
| Side column    | Sticky, 64px from the top                                                                    |

- **Master and detail.** Opening a to-do replaces the side column with its detail pane, so the list stays in view. The open state lives in the URL.
- **On phones** the detail is a full-screen sheet with its actions pinned to the bottom, above the safe area. Groups reorder into one column: meetings, to-dos, calls.
- **Density.** A row is a title and one detail line. Only "Do now" rows show their quote in the list, cut to one line (two on phones).
- **The email** is one 600px column with 20px side padding: a heading on the page color, one bordered surface holding every section, then the primary button and a footer.

## Elevation & Depth

Flat. There are no shadows, and `--depth` is 0 in both modes. A surface is `base-100` with a 1px `base-300` border sitting on the `base-200` page. Sections inside a surface are split by a 1px rule. The open row is lit with an 8% tint of the text color, which reads the same in both modes.

### Named Rules

**The Flat Rule.** Never add a shadow. To raise something, give it a surface and a border. To mark it, tint it or fill it with neutral.

## Shapes

| Token      | Size   | Used on                                                             |
| ---------- | ------ | ------------------------------------------------------------------- |
| `box`      | 1rem   | Groups, panes, trays, notices, the email's surface                  |
| `field`    | 0.5rem | Buttons, inputs, quote bubbles, the suggestion outline, quiet fills |
| `selector` | 1rem   | Badges, chips, status dots, checkboxes, focus rings                 |
| Full       | Circle | Avatars                                                             |

Borders are 1px. Solid means structure. Dashed means tentative, and only the suggestion uses it. A quote bubble has one square corner with a tail on the speaker's side. Icons are 2px stroke outlines (Lucide paths) in the text color, 16px inline and 20px in the dock.

## Components

### Buttons

- **Shape:** gently rounded (0.5rem), 32px tall (`sm`) on screens, 24px (`xs`) inside rows and the check stepper.
- **Primary:** Action Blue fill, white label. One per screen. Grows to fill the pane footer.
- **Neutral:** Ink Navy fill. A firm choice ("Keep here", "Yes") and the current item in a set (the current check, the chosen theme).
- **Plain:** Page Frost fill. Every other action ("Snooze", "Review", "Send correction").
- **Ghost:** no fill. The least commitment ("Not sure") and the square close button.
- **States:** disabled is a pale fill with faint text. Busy shows a spinner on the button itself. A key hint is a small `kbd` at the end of the label, shown from 1024px only.

### Rows and groups

- **Group:** a 14px semibold heading with its count at 80%, sitting on the page; below it one bordered surface of rows.
- **Row:** a small checkbox, then a medium title over a detail line. The title and detail line are one link that opens the detail.
- **Detail line:** kind badge (only when it is not a plain to-do), source, due date, size. 12px at 80%, wrapping freely.
- **Open row:** an 8% tint of the text color.
- **Finished row:** checked, title struck through, everything at 80%.
- **Empty list:** a medium line saying what belongs here and an 80% line saying how it gets here.

### The quote (signature)

- **Shape:** a daisyUI chat bubble: filled with Rule Blue-Gray, 0.5rem corners, a tail on the speaker's side.
- **Sides:** other people on the left, the viewer on the right.
- **Header and footer:** speaker in medium with the time at 80% above; an optional 80% note below ("The recorder labeled this ...").
- **Marked:** the line a decision turns on is filled with neutral. One marked line per stretch.
- **In a row:** the same bubble, speaker's name in medium then the words, one line (two on phones).
- **In the email:** a filled block in the page color with 8px corners, the speaker's name in semibold on its own line. No tail.

### The suggestion

- **Shape:** a 1px dashed outline at 40% of the text color, 0.5rem corners, no fill. It sits under the row it is about.
- **Content:** the claim in medium ("Suggested for Next."), the reason in regular, then two `xs` buttons: neutral to accept, plain to decline.
- It is the app speaking, so it is never filled like a quote.

### Status, badges and people

- **Status dot:** a small round dot before the words. Never alone: the words carry the meaning.
- **Due:** a date that is today or past gets an error dot and medium text in the full text color. Other dates are plain detail text.
- **Kind badge:** small ghost badge (Page Frost fill, full text color, pill corners).
- **Person chip:** a 28px ghost badge holding a 20px avatar and the name.
- **Avatar:** initials on neutral in a circle, 32px standing alone.

### Fields

- **Style:** white fill, 1px border at 65% of the text color, 0.5rem corners, 32px tall. A semibold legend above, an optional 80% hint below.
- **Error:** the border takes the error color and the hint names the fix. The hint text stays in the text color.
- **Disabled:** Page Frost fill, no border, faint text.
- **Checkbox and radio:** small, same 65% border.
- **Corrections:** a collapsed "Something wrong with this?" box on Page Frost holding six radio reasons, a note and a plain button.

### Notices

- A soft fill of the status color (8% over the surface), a matching dot, and text in the text color. Shown next to the control that caused it, never as a toast. A problem names its fix.

### Navigation

- **Top bar:** white, 48px, a bottom rule. Wordmark left, four destinations centered, the account avatar right. The current destination is a neutral pill.
- **Dock (phones):** the same four destinations with a 20px icon over a label. The current one has a short bar under it.
- **Keyboard:** Escape closes the detail pane. When a detail opens, focus moves to its heading. Links and summaries get a 2px primary focus ring, offset 2px.

### The morning email

| Fact        | Value                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Mode        | Light only (Gmail ignores a dark setting)                                                                           |
| Values      | `app/email/theme.generated.ts`, written by `npm run email:theme` from the Winter theme; a test fails when it drifts |
| Type        | System sans; 20px heading, 14px body, 13px section headings and buttons, 12px detail                                |
| Sections    | Section heading with its count at 80%, split by 1px rules, inside one bordered 16px-corner surface                  |
| Due now     | Semibold text in the text color before the detail. No dot                                                           |
| Suggestions | Their own section, "Waiting for your answer", with a neutral and an outlined button. No dashed outline              |
| Primary     | One: "Open my list"                                                                                                 |

## Do's and Don'ts

### Do:

- **Do** take every color and corner from the theme: `bg-base-100`, `text-base-content`, `btn-primary`, `rounded-box`, `rounded-field`.
- **Do** use `MUTED` (`text-base-content/80`) for all secondary text.
- **Do** show status as a dot with words beside it in the text color.
- **Do** keep one primary button on a screen, and use neutral for a firm choice.
- **Do** show a quote as a filled speech bubble with the speaker named, and a suggestion as a dashed outline with its two answers.
- **Do** use `ROW` for every list row, and `Group` for every titled list.
- **Do** put the result of an action next to the control that caused it.
- **Do** make every new part work in both modes with no mode-specific classes, and check it in both.
- **Do** change email colors in `styles/app.css`, then run `npm run email:theme`.

### Don't:

- **Don't** write a literal color, a palette class such as `text-gray-700`, or a `dark:` variant.
- **Don't** color text with a status color.
- **Don't** add a second primary action to a screen.
- **Don't** fill a suggestion or dash a quote.
- **Don't** go lighter than 80% for text.
- **Don't** add shadows or raise `--depth`.
- **Don't** hand-edit `app/email/theme.generated.ts`, and don't give the email a dark version.
- **Don't** use toasts.
