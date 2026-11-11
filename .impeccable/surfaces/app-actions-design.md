---
version: 1
slug: "app-actions-design"
primary_target: "app/actions/design"
related_targets: []
---

# Surface brief: the design system gallery and the three core surfaces

Scope: `/design` (component gallery), `/design/my-list`, `/design/call-review`, `/design/email`.
Mode: Operate. Built code-first.

Audience and job: one team member, on a phone or at a desk with equal weight, deciding what needs
them today and checking that each promise is really theirs. Sample data is made up.

Constraints: the visual world is pinned by the owner (daisyUI, Winter in light, Dark's colors with
Winter's shape in dark). Colors and shapes come only from the theme. The owner said a polished
result would feel wrong if it were too sparse, or chatty or cute.

Unresolved: none for this step. Real data, sign-in and saving come in later steps.

## Direction contract

THESIS: A promise is shown with the words it came from. The screen refuses the generic task app's
bare checkbox-and-due-date row: every to-do can show its line and who said it.

OWN-WORLD: daisyUI Winter: white and pale blue-gray surfaces, slate-blue text, one saturated blue
for the primary action, 1rem box corners, flat (no depth). Dark mode swaps colors only. Parts are
daisyUI's: list rows, soft badges, chat bubbles, fieldsets, a dock on phones. System sans, tabular
numerals for times and counts.

STORY: The person sees today's meetings and a short ordered list, opens one item, reads the quote
and the source, and either does it, corrects it or dismisses it.

FIRST VIEWPORT: Top bar with four destinations. Desktop: to-dos by priority in the main column,
today's meetings and calls to review in a side column; opening a to-do replaces the side column
with its detail pane, so the list stays in view. Phone: one column, a dock, and the detail as a
full-screen sheet. Rows are compact: the day fits without scrolling past air.

FORM: Master and detail in a familiar app shell, chosen by the owner's approved trial and the
spec; the signature move is the quote shown as a speaker's line (a chat bubble) on the to-do, in
call review and in the email. The roll ran after the owner had pinned this structure, so its dealt structures were not put to him. seed:689845f5a3138031

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
