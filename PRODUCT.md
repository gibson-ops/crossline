# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Members of a small team, a handful of people who share customers and projects and talk mostly on
calls, in email and by text. Each person has their own promises to keep and wants to know, without
effort, what needs them today. The first user is the person who builds it, on his own calls and
mail; the rest of his team follows once it works for him.

People read it in two places with equal weight: on a phone, in the morning and between calls, and
at a desk beside other work.

## Product Purpose

One place remembers what a team has promised and learned. It tells each person what needs them
each morning, and it answers when asked.

It exists because promises made on calls and in email get dropped: nobody wrote them down, or the
person who did was not the person who made them. Success is that a promise made on Monday's call
is on the right person's list on Tuesday, with the words it came from, and that the person trusts
the list enough to work from it.

## Positioning

A per-person daily brief built from email and meetings can be bought. What cannot be bought, and
what this product is for:

- A shared record of who promised what, checked against who actually said it on the call.
- A list of who can see each item, so private sources stay private.
- Corrections that are always easy and never required, so wrong items cost one tap.

## Operating Context

- **Everything is a to-do**, of four kinds: to-do, reply owed, follow-up, meeting. A meeting is a
  to-do bound to its time.
- **To-dos are added automatically** from calls, email and calendar, each with the quote it came
  from and a link back to the source. The owner deletes the wrong ones.
- **Priority is an order of work:** P0 do now, P1 next, P2 after, P3 later, P4 someday. Size is
  S, M, L or XL. Priority sorts before due date.
- **Suggestions sort as if accepted** (the owner's decision: "sort by suggestion priority"). When
  a dated to-do's due date comes inside the lead time its size needs, the app suggests raising it
  to Next. The to-do is then listed under Next with the suggestion on it, so the person sees it
  in time, but its stored priority does not change until they answer. A no sends it back, and
  the follow-up is whether the date or the size is off. Only a person puts a to-do in Do now.
- **Loops** group related to-dos.
- **The morning email** is the main product: today's meetings, what to do now and next, a few
  from after, suggestions waiting for an answer, calls awaiting review, and what was handled.
- **Call review:** a recorder's speaker labels can be wrong for long stretches, so the app
  re-derives who said each line, asks the person to confirm only the stretches where the speaker
  matters, and only then adds to-dos.
- **Corrections** take one of six fixed reasons: Already done, Not mine, Not a real to-do, No
  longer needed, It's this other thing, Wrong details.

## Capabilities and Constraints

- Web app on Remix 3 and Effect 4, Postgres, server-rendered with small browser entries.
  Forms work without JavaScript; panel state lives in the URL.
- The interface is built from daisyUI 5 parts on Tailwind 4. Colors and shapes come only from
  the theme, so an organization's brand is a theme setting.
- The email is HTML email (MJML) and must look like it belongs with the app.
- Nothing about one organization is in the code: names and settings are data.
- Not yet built: sign-in, the data model, intake, the email. The first version serves one person.

## Brand Commitments

- The name is Crossline.
- Voice: short, plain statements in everyday words. No filler, no encouragement, no emoji, no
  jokes. It states what needs the person and where it came from.
- Themes, chosen by the owner: daisyUI's Winter in light mode; daisyUI's Dark colors with
  Winter's corner sizes and flat look in dark mode.

## Evidence on Hand

- A design trial of "My list" with a detail drawer on daisyUI, which the owner approved:
  `~/code/gibson-ops/crossline-design-trial` (`app/actions/daisy-page.tsx`).
- No logo, no customer quotes, no screenshots of a finished product. Sample data in mockups is
  made up and must not name a real organization or person.

## Product Principles

1. **Show where it came from.** Every to-do carries its quote and its source.
2. **Wrong items are cheap.** Correcting or deleting takes one tap and no explanation.
3. **It never nags.** A short list of what needs the person beats a complete one.
4. **Private stays private.** Each item is visible only to its audience.
5. **Dense enough to see the day.** A screen should hold the day without scrolling past air.

## Accessibility & Inclusion

WCAG AA contrast in both themes, every action reachable by keyboard, focus managed when a panel
opens and closes, and reduced motion honored.
