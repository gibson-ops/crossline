# Plan

The spec and the build plan are kept in one Claude Doc, not in this repository:

- Spec: https://claude.ai/artifact/QqQq7guJkPuiAWTBVtRGzg#988ea033-c666
- Build plan: https://claude.ai/artifact/QqQq7guJkPuiAWTBVtRGzg#375c39f8-5a59

## The first local version

One person's "My list" and morning email, from that person's own calls and mail, running locally
and built as if it were going to production. Hosting and other users come after it works.

| Step                           | What is built                                                                                                     | Done when                                                                                | Status          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------- |
| 1. Foundation                  | Repository, app skeleton, local Postgres with migrations at startup, stylesheet build, checks                     | The app starts from an empty database, migrates itself, and all checks pass              | Done 2026-11-10 |
| 2. Design system               | The app's own components on a gallery page, with mockups of "My list", the email and call review                  | Approved on phone and desktop, in light and dark                                         | Next            |
| 3. Sign-in and the core tables | Passkey and Google sign-in closed to new sign-ups; organization, parties, audiences, to-dos, the action log, undo | Sign-in works both ways, an unlisted account is refused, a change is undone from the log |                 |
| 4. "My list"                   | The list and drawer on real tables, with corrections                                                              | To-dos are added, edited, completed and corrected on a phone                             |                 |
| 5. Intake                      | Gmail, Calendar and Wispr Flow connectors, the source ledger, the extractor, the call review pass                 | A real call and a real email each become to-dos with their quotes                        |                 |
| 6. The morning email           | The composer, the MJML renderer, the schedule, the sent-messages view                                             | Five workdays of emails worth keeping on                                                 |                 |

## Decisions that shape the code

- Design kit: daisyUI, Winter in light mode, Dark's colors with Winter's shape in dark mode.
- Email: MJML, with colors converted from the daisyUI theme at build time.
- Database: Postgres through `remix/data-table`, migrations as SQL files applied at startup.
- No hosting, remote repository or other users until the first local version works.
