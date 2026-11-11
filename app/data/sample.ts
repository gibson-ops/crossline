/**
 * Made-up sample data for the design pages (`/design/...`). Nothing here comes from a real
 * organization or person. It goes away once pages read from the database.
 */

export type Kind = 'todo' | 'reply' | 'followup' | 'meeting'
export type Priority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4'
export type Size = 'S' | 'M' | 'L' | 'XL'

export interface Source {
  /** Where the to-do was picked up, e.g. "Call with Priya Shah". */
  label: string
  /** Display date of the source, e.g. "Mon, Nov 9". */
  when: string
  /** The line the to-do was taken from. */
  quote: string
  /** Who said or wrote the line. */
  speaker: string
  /** Link text back into the source, e.g. "Open the call at 14:32". */
  linkText: string
}

export interface Todo {
  id: string
  title: string
  kind: Kind
  priority: Priority
  size: Size
  /** Display text for the due date; empty when undated. */
  due: string
  /** ISO date for the date input, YYYY-MM-DD; empty when undated. */
  dueDate: string
  /** True when the due date is today or past. */
  dueNow: boolean
  /** Name of the loop this to-do belongs to, with how many other open to-dos it has. */
  loop?: { name: string; openCount: number }
  source: Source
  /** Set when the app suggests raising this to-do to "Next". */
  suggestion?: string
  /** Everyone allowed to see this to-do. */
  audience: string[]
}

export interface Meeting {
  id: string
  time: string
  title: string
  detail: string
}

export interface CallReview {
  id: string
  title: string
  when: string
  detail: string
  needsCheck: boolean
}

export const KIND_LABEL: Record<Kind, string> = {
  todo: 'To-do',
  reply: 'Reply owed',
  followup: 'Follow-up',
  meeting: 'Meeting',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  P0: 'P0 · Do now',
  P1: 'P1 · Next',
  P2: 'P2 · After',
  P3: 'P3 · Later',
  P4: 'P4 · Someday',
}

export const SIZE_LABEL: Record<Size, string> = {
  S: 'S · under an hour',
  M: 'M · up to a day',
  L: 'L · several days',
  XL: 'XL · a week or more',
}

/** The six fixed reasons a person can give when a to-do is wrong. */
export const CORRECTION_REASONS = [
  'Already done',
  'Not mine',
  'Not a real to-do',
  'No longer needed',
  "It's this other thing",
  'Wrong details',
] as const

export const today = { heading: 'Tuesday, November 10', viewer: 'Morgan Ellis', initials: 'ME' }

export const meetings: Meeting[] = [
  { id: 'm1', time: '9:30', title: 'Weekly team sync', detail: '45 min · Dana, Priya, Luis' },
  { id: 'm2', time: '1:00', title: 'Brightwell pilot check-in', detail: '30 min · Priya and 2 guests' },
  { id: 'm3', time: '3:30', title: '1:1 with Dana', detail: '30 min' },
]

export const todos: Todo[] = [
  {
    id: 't1',
    title: 'Send Dana the revised quote for the Harbor Point renewal',
    kind: 'reply',
    priority: 'P0',
    size: 'S',
    due: 'Today',
    dueDate: '2026-11-10',
    dueNow: true,
    loop: { name: 'Harbor Point renewal', openCount: 3 },
    source: {
      label: 'Email from Dana Reyes',
      when: 'Mon, Nov 9',
      quote: 'Can you get me the revised number by Tuesday? I present it Wednesday morning.',
      speaker: 'Dana Reyes',
      linkText: 'Open the email',
    },
    audience: ['Morgan Ellis', 'Dana Reyes'],
  },
  {
    id: 't2',
    title: "Confirm Thursday's demo time with Brightwell",
    kind: 'todo',
    priority: 'P0',
    size: 'S',
    due: 'Today',
    dueDate: '2026-11-10',
    dueNow: true,
    loop: { name: 'Brightwell pilot', openCount: 4 },
    source: {
      label: 'Call with Priya Shah',
      when: 'Mon, Nov 9',
      quote: "I'll confirm the Thursday demo slot with them first thing tomorrow.",
      speaker: 'Morgan Ellis',
      linkText: 'Open the call at 14:32',
    },
    audience: ['Morgan Ellis', 'Priya Shah'],
  },
  {
    id: 't3',
    title: 'Draft the onboarding checklist for the two new installers',
    kind: 'todo',
    priority: 'P1',
    size: 'L',
    due: 'Fri, Nov 13',
    dueDate: '2026-11-13',
    dueNow: false,
    source: {
      label: 'Weekly team sync',
      when: 'Tue, Nov 3',
      quote: "I'll take the onboarding checklist, and I'll have a draft before they start.",
      speaker: 'Morgan Ellis',
      linkText: 'Open the call at 21:05',
    },
    audience: ['Morgan Ellis', 'Dana Reyes', 'Priya Shah', 'Luis Ortega'],
  },
  {
    id: 't4',
    title: 'Has Luis sent the signed vendor form?',
    kind: 'followup',
    priority: 'P1',
    size: 'S',
    due: 'Thu, Nov 12',
    dueDate: '2026-11-12',
    dueNow: false,
    source: {
      label: 'Email to Luis Ortega',
      when: 'Thu, Nov 5',
      quote: 'Could you sign and send back the vendor form this week?',
      speaker: 'Morgan Ellis',
      linkText: 'Open the email',
    },
    audience: ['Morgan Ellis', 'Luis Ortega'],
  },
  {
    id: 't5',
    title: 'Review the insurance certificate before it lapses',
    kind: 'todo',
    priority: 'P2',
    size: 'M',
    due: 'Mon, Nov 16',
    dueDate: '2026-11-16',
    dueNow: false,
    suggestion: 'Due in 6 days, and a size M needs about a week.',
    source: {
      label: '1:1 with Dana',
      when: 'Tue, Nov 3',
      quote: 'The certificate runs out mid-month, so I need to look it over before then.',
      speaker: 'Morgan Ellis',
      linkText: 'Open the call at 08:47',
    },
    audience: ['Morgan Ellis'],
  },
  {
    id: 't6',
    title: 'Reply to Sam about the trade-show booth budget',
    kind: 'reply',
    priority: 'P1',
    size: 'S',
    due: 'Wed, Nov 11',
    dueDate: '2026-11-11',
    dueNow: false,
    source: {
      label: 'Email from Sam Whitaker',
      when: 'Mon, Nov 9',
      quote: 'Do we have a number for the booth yet? The deposit is due Friday.',
      speaker: 'Sam Whitaker',
      linkText: 'Open the email',
    },
    audience: ['Morgan Ellis', 'Sam Whitaker'],
  },
  {
    id: 't7',
    title: 'Write up notes from the supplier visit',
    kind: 'todo',
    priority: 'P2',
    size: 'M',
    due: '',
    dueDate: '',
    dueNow: false,
    source: {
      label: 'Supplier visit debrief',
      when: 'Fri, Nov 6',
      quote: "I'll write up what we saw so the others can read it.",
      speaker: 'Morgan Ellis',
      linkText: 'Open the call at 03:12',
    },
    audience: ['Morgan Ellis', 'Dana Reyes', 'Priya Shah', 'Luis Ortega'],
  },
  {
    id: 't8',
    title: 'Look into a second shipping carrier for the west region',
    kind: 'todo',
    priority: 'P2',
    size: 'L',
    due: '',
    dueDate: '',
    dueNow: false,
    source: {
      label: 'Weekly team sync',
      when: 'Tue, Nov 3',
      quote: 'I can look at whether a second carrier makes sense out west.',
      speaker: 'Morgan Ellis',
      linkText: 'Open the call at 33:40',
    },
    audience: ['Morgan Ellis', 'Dana Reyes', 'Priya Shah', 'Luis Ortega'],
  },
  {
    id: 't9',
    title: 'Update the price sheet footer with the new address',
    kind: 'todo',
    priority: 'P2',
    size: 'S',
    due: '',
    dueDate: '',
    dueNow: false,
    source: {
      label: 'Email from Priya Shah',
      when: 'Wed, Nov 4',
      quote: 'The footer still has the old address on it.',
      speaker: 'Priya Shah',
      linkText: 'Open the email',
    },
    audience: ['Morgan Ellis', 'Priya Shah'],
  },
]

export const callReviews: CallReview[] = [
  {
    id: 'c1',
    title: 'Call with Priya Shah',
    when: 'Mon, Nov 9',
    detail: '4 to-dos added · 2 lines need a speaker check',
    needsCheck: true,
  },
  {
    id: 'c2',
    title: 'Supplier visit debrief',
    when: 'Fri, Nov 6',
    detail: '2 to-dos added · speakers look right',
    needsCheck: false,
  },
]

/** A suggested to-do sorts as if it were already "Next", so it sits in that group. */
function sortsAs(todo: Todo): Priority {
  return todo.suggestion ? 'P1' : todo.priority
}

/** The list as the page shows it: one group per priority, in order of work. */
export function groupedTodos() {
  return [
    { key: 'P0', title: 'Do now', todos: todos.filter((todo) => sortsAs(todo) === 'P0') },
    { key: 'P1', title: 'Next', todos: todos.filter((todo) => sortsAs(todo) === 'P1') },
    { key: 'P2', title: 'After', todos: todos.filter((todo) => sortsAs(todo) === 'P2') },
  ]
}

/** The line of counts under the day's heading, derived from the same groups the page shows. */
export function daySummary(): string {
  const [doNow, next] = groupedTodos()
  return `${meetings.length} meetings · ${doNow.todos.length} to do now · ${next.todos.length} next`
}

/** Initials for an avatar, e.g. "Dana Reyes" -> "DR". */
export function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export interface TranscriptTurn {
  /** Position of the turn in the call, starting at 1. */
  index: number
  /** Minutes and seconds into the call, e.g. "14:32". */
  at: string
  /** Who the recorder says spoke. */
  labeled: string
  /** Who the review pass believes spoke; differs from `labeled` where the recorder was wrong. */
  derived: string
  text: string
  /** True when a to-do's owner depends on this line. */
  carriesPromise?: boolean
}

export interface ReviewStretch {
  id: string
  /** What the review pass is unsure about, in one sentence. */
  question: string
  status: 'open' | 'answered'
  /** Who the person confirmed, once answered. */
  answer?: string
  turns: TranscriptTurn[]
}

export interface CallToReview {
  title: string
  when: string
  length: string
  /** The two people on the call. The first is the viewer. */
  people: [string, string]
  recorders: string[]
  stretches: ReviewStretch[]
  /** To-dos the call produced, with whether each waits on a speaker check. */
  todos: { title: string; owner: string; at: string; quote: string; waitingOn?: string }[]
}

export const callToReview: CallToReview = {
  title: 'Call with Priya Shah',
  when: 'Mon, Nov 9',
  length: '48 min',
  people: ['Morgan Ellis', 'Priya Shah'],
  recorders: ['a desktop recorder', "the meeting's own notes"],
  stretches: [
    {
      id: 's1',
      question: 'Who offered to confirm the demo time?',
      status: 'answered',
      answer: 'Morgan Ellis',
      turns: [
        {
          index: 212,
          at: '14:21',
          labeled: 'Priya Shah',
          derived: 'Priya Shah',
          text: 'They asked for Thursday, but nobody has told them a time.',
        },
        {
          index: 213,
          at: '14:32',
          labeled: 'Priya Shah',
          derived: 'Morgan Ellis',
          text: "I'll confirm the Thursday demo slot with them first thing tomorrow.",
          carriesPromise: true,
        },
      ],
    },
    {
      id: 's2',
      question: 'Who is sending the pilot summary?',
      status: 'open',
      turns: [
        {
          index: 291,
          at: '31:05',
          labeled: 'Morgan Ellis',
          derived: 'Morgan Ellis',
          text: 'Brightwell wants something in writing before the check-in.',
        },
        {
          index: 292,
          at: '31:12',
          labeled: 'Morgan Ellis',
          derived: 'Priya Shah',
          text: 'I can send the pilot summary by Wednesday, with the numbers from last week.',
          carriesPromise: true,
        },
        {
          index: 293,
          at: '31:20',
          labeled: 'Priya Shah',
          derived: 'Morgan Ellis',
          text: 'Good. Copy me so I can forward it to their operations lead.',
        },
      ],
    },
    {
      id: 's3',
      question: 'Who will ask about the second site?',
      status: 'open',
      turns: [
        {
          index: 340,
          at: '39:48',
          labeled: 'Priya Shah',
          derived: 'Priya Shah',
          text: 'They mentioned a second site twice. Someone should ask what they mean by spring.',
        },
        {
          index: 341,
          at: '39:57',
          labeled: 'Priya Shah',
          derived: 'Morgan Ellis',
          text: "Probably me. I'll raise it on Thursday.",
          carriesPromise: true,
        },
      ],
    },
  ],
  todos: [
    {
      title: "Confirm Thursday's demo time with Brightwell",
      owner: 'Morgan Ellis',
      at: '14:32',
      quote: "I'll confirm the Thursday demo slot with them first thing tomorrow.",
    },
    {
      title: 'Send Brightwell the pilot summary by Wednesday',
      owner: 'Priya Shah',
      at: '31:12',
      quote: 'I can send the pilot summary by Wednesday, with the numbers from last week.',
      waitingOn: 's2',
    },
    {
      title: 'Ask Brightwell what they mean by a second site in spring',
      owner: 'Morgan Ellis',
      at: '39:57',
      quote: "Probably me. I'll raise it on Thursday.",
      waitingOn: 's3',
    },
    {
      title: 'Share the installer schedule with Priya',
      owner: 'Morgan Ellis',
      at: '44:10',
      quote: "I'll share the installer schedule after this call.",
    },
  ],
}

/** What was handled since the last morning email, for the email's closing section. */
export const handled = [
  'Sent Luis the vendor form',
  'Replied to Priya about the pilot scope',
  'Booked the supplier visit',
]
