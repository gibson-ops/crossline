// The Crossline board — one calm page of owned commitments.
// List rows (not cards), org brand colors as the only vivid color, ink actions.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { id } from '@instantdb/react';
import { db } from '../lib/db';
import { activityOp } from '../lib/activity';
import { toast } from '../lib/toast';
import { useFlip } from '../lib/use-flip';
import { Select } from './select';

/* ----------------------------------------------------------------- types */

export type BoardOrg = { id: string; name: string; brandColor?: string | null };
export type Visibility = 'workspace' | 'org' | 'private';
export type BoardTask = {
  id: string;
  title: string;
  status: string; // 'open' | 'in_progress' | 'done' (proposed never reaches the board)
  dueDate?: string | Date | null;
  completedAt?: string | Date | null;
  createdAt: string | Date;
  owningOrgId: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  visibility?: string | null; // null == 'workspace'
};
export type BoardPerson = { id: string; name: string };
export type BoardData = {
  workspaceId: string;
  workspaceName: string;
  orgs: BoardOrg[];
  tasks: BoardTask[];
  people: { id: string; name: string }[];
  myOrgIds: string[];
};

export const toDate = (v: string | number | Date | null | undefined): Date | null =>
  v == null ? null : v instanceof Date ? v : new Date(v);

/** Monday 00:00 of the current week — the carryover boundary. */
export function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

const dueFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/* ------------------------------------------------------- live query shape */

export const boardQuery = (workspaceId: string, instantUserId: string) => ({
  workspaces: {
    $: { where: { id: workspaceId } },
    members: { org: {} },
    memberProfiles: {}, // people, for assignee matching
    tasks: { owningOrg: {}, assignee: {} },
  },
  profiles: {
    $: { where: { '$user.id': instantUserId } },
    orgMemberships: { org: {} },
  },
});

/** Shape a raw query result (loader/admin or live/client) into BoardData. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function shapeBoard(res: any): BoardData | null {
  const ws = res?.workspaces?.[0];
  if (!ws) return null;
  const orgs: BoardOrg[] = (ws.members ?? [])
    .map((m: any) => m.org)
    .filter(Boolean)
    .map((o: any) => ({ id: o.id, name: o.name, brandColor: o.brandColor }));
  const people: { id: string; name: string }[] = (ws.memberProfiles ?? [])
    .filter((p: any) => p?.name)
    .map((p: any) => ({ id: p.id, name: p.name }));
  // "This week" hygiene: done items from previous weeks leave the board
  // (they stay in the data + audit log; the board is the current picture).
  const weekStart = startOfWeek();
  const tasks: BoardTask[] = (ws.tasks ?? [])
    .filter((t: any) => t.status !== 'proposed')
    .filter((t: any) => {
      if (t.status !== 'done' || !t.completedAt) return true;
      return new Date(t.completedAt) >= weekStart;
    })
    .map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.dueDate ?? null,
      completedAt: t.completedAt ?? null,
      createdAt: t.createdAt,
      owningOrgId: t.owningOrg?.id ?? null,
      assigneeId: t.assignee?.id ?? null,
      assigneeName: t.assignee?.name ?? null,
      visibility: t.visibility ?? null,
    }));
  const myOrgIds: string[] = (res?.profiles?.[0]?.orgMemberships ?? [])
    .map((m: any) => m.org?.id)
    .filter(Boolean);
  return {
    workspaceId: ws.id,
    workspaceName: ws.name,
    orgs,
    tasks,
    people,
    myOrgIds,
  };
}

/* ------------------------------------------------------------ scope toggle */

export function ScopeToggle(props: {
  scope: 'mine' | 'all';
  onChange: (s: 'mine' | 'all') => void;
  myOrgName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // The active-pill highlight is one element that slides between segments.
  const [pill, setPill] = useState<{ x: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const active = containerRef.current?.querySelector<HTMLElement>(`[data-seg='${props.scope}']`);
    if (active) setPill({ x: active.offsetLeft, width: active.offsetWidth });
  }, [props.scope, props.myOrgName]);

  const seg = (key: 'mine' | 'all', label: string) => (
    <button
      type="button"
      data-seg={key}
      onClick={() => props.onChange(key)}
      aria-pressed={props.scope === key}
      className={
        'relative z-10 rounded-full px-3.5 py-1.5 text-[length:var(--text-meta)] font-medium transition-colors duration-150 ' +
        (props.scope === key
          ? 'text-ink' + (pill ? '' : ' bg-raised shadow-sm') // pre-hydration fallback
          : 'text-ink-muted hover:text-ink')
      }
    >
      {label}
    </button>
  );
  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center gap-0.5 rounded-full bg-sunken p-0.5"
      role="group"
      aria-label="Which commitments to show"
    >
      {pill && (
        <span
          aria-hidden
          className="absolute top-0.5 bottom-0.5 left-0 rounded-full bg-raised shadow-sm transition-[transform,width] duration-200 ease-[var(--ease-out-quart)]"
          style={{ transform: `translateX(${pill.x}px)`, width: pill.width }}
        />
      )}
      {seg('mine', props.myOrgName ?? 'My company')}
      {seg('all', 'Everyone')}
    </div>
  );
}

/* ------------------------------------------------------- visibility picker */

/**
 * Who can see this — plain words, default Everyone. Only offered for records
 * your own org owns (the permission rules reject anything else anyway).
 */
export function VisibilityPicker(props: {
  value: Visibility;
  onChange: (v: Visibility) => void;
  orgName: string;
  ariaLabel?: string;
}) {
  return (
    <Select
      value={props.value}
      onChange={(v) => props.onChange(v as Visibility)}
      ariaLabel={props.ariaLabel ?? 'Who can see this'}
      options={[
        { value: 'workspace', label: 'Everyone' },
        { value: 'org', label: `Just ${props.orgName}` },
        { value: 'private', label: 'Just me' },
      ]}
    />
  );
}

/** Person picker for assignment — all workspace people, or nobody. */
function AssigneePicker(props: {
  value: string;
  onChange: (profileId: string) => void;
  people: BoardPerson[];
}) {
  // Radix reserves the empty-string value; use a sentinel for "nobody".
  return (
    <Select
      value={props.value || 'none'}
      onChange={(v) => props.onChange(v === 'none' ? '' : v)}
      ariaLabel="Assignee"
      options={[
        { value: 'none', label: 'No assignee' },
        ...[...props.people]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => ({ value: p.id, label: p.name })),
      ]}
    />
  );
}

/** Row chip naming the audience of a scoped task. */
function ScopeChip({ visibility, orgName }: { visibility?: string | null; orgName: string }) {
  if (visibility !== 'org' && visibility !== 'private') return null;
  return (
    <span className="rounded-full bg-sunken px-1.5 py-px text-ink-faint">
      {visibility === 'org' ? `just ${orgName}` : 'just you'}
    </span>
  );
}

/* --------------------------------------------------------------- task row */

function CheckIcon() {
  return (
    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TaskRow({
  task,
  weekStart,
  workspaceId,
  profileId,
  orgName,
  isMyOrg,
  people,
}: {
  task: BoardTask;
  weekStart: Date;
  workspaceId: string;
  profileId: string | null;
  orgName: string;
  isMyOrg: boolean;
  people: BoardPerson[];
}) {
  const done = task.status === 'done';
  const due = toDate(task.dueDate);
  const created = toDate(task.createdAt);
  const now = new Date();
  const overdue = !done && due != null && due.getTime() < now.setHours(0, 0, 0, 0);
  const carried = !done && created != null && created < weekStart;

  const [editing, setEditing] = useState(false);

  function toggle() {
    const taskOp = db.tx.tasks[task.id].update(
      done
        ? { status: 'open', completedAt: null }
        : { status: 'done', completedAt: new Date() },
    );
    // Audit trail: who checked/unchecked what, in the same transaction.
    db.transact(
      profileId
        ? [
            taskOp,
            activityOp({
              type: done ? 'task.reopened' : 'task.completed',
              workspaceId,
              actorProfileId: profileId,
              taskId: task.id,
              meta: { taskTitle: task.title },
              visibility: task.visibility,
            }),
          ]
        : [taskOp],
    ).catch(() => toast("That didn't save — check your connection and try again"));
  }

  if (editing) {
    return (
      <TaskEditRow
        task={task}
        workspaceId={workspaceId}
        profileId={profileId}
        orgName={orgName}
        isMyOrg={isMyOrg}
        people={people}
        onClose={() => setEditing(false)}
      />
    );
  }

  const hasMeta = Boolean(task.assigneeName) || carried || task.visibility === 'org' || task.visibility === 'private';

  return (
    <li
      data-flip-key={task.id}
      className={'group relative flex items-start gap-3.5 py-3.5 transition-opacity duration-200 ' + (done ? 'opacity-55' : '')}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={done ? `Mark "${task.title}" not done` : `Mark "${task.title}" done`}
        className={
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-200 active:scale-90 ' +
          (done
            ? 'border-action bg-action text-ink-inverse'
            : 'border-line-strong text-transparent hover:border-ink hover:text-line-strong')
        }
      >
        <span className={done ? 'check-pop' : undefined}>
          <CheckIcon />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        {/* Title line — the due date docks to a fixed right column so dates
            align vertically down the board (they're the thing people scan for). */}
        <div className="flex flex-wrap items-baseline gap-x-3">
          <p className={'min-w-0 flex-1 text-[length:var(--text-body)] leading-snug ' + (done ? 'text-ink-muted' : 'text-ink')}>
            {task.title}
          </p>
          {due && (
            <span
              className={
                'ml-auto shrink-0 text-[length:var(--text-meta)] tabular-nums ' +
                (overdue ? 'font-medium text-danger' : 'text-ink-faint')
              }
            >
              {dueFmt.format(due)}
              {overdue ? ' · overdue' : ''}
            </span>
          )}
        </div>
        {/* Modifier line — fixed order: person, carried, audience. */}
        {hasMeta && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[length:var(--text-meta)] text-ink-faint">
            {task.assigneeName && <span>{task.assigneeName}</span>}
            {carried && (
              <span className="rounded-full border border-line px-1.5 py-px text-ink-faint">
                carried over
              </span>
            )}
            <ScopeChip visibility={task.visibility} orgName={orgName} />
          </p>
        )}
      </div>
      {!done && (
        // Bottom-right overlay: keeps the due-date column flush to the edge —
        // there's nearly always free space down here.
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit "${task.title}"`}
          className="absolute bottom-1.5 right-0 rounded-md bg-raised/90 px-1.5 py-0.5 text-[length:var(--text-meta)] font-medium text-ink-faint opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
        >
          Edit
        </button>
      )}
    </li>
  );
}

/** Inline edit mode for a task row: title, due date, assignee, visibility, delete. */
function TaskEditRow({
  task,
  workspaceId,
  profileId,
  orgName,
  isMyOrg,
  people,
  onClose,
}: {
  task: BoardTask;
  workspaceId: string;
  profileId: string | null;
  orgName: string;
  isMyOrg: boolean;
  people: BoardPerson[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(() => {
    const d = toDate(task.dueDate);
    return d ? d.toISOString().slice(0, 10) : '';
  });
  const [visibility, setVisibility] = useState<Visibility>(
    (task.visibility as Visibility) || 'workspace',
  );
  const [assignee, setAssignee] = useState(task.assigneeId ?? '');

  function save() {
    const newTitle = title.trim();
    if (!newTitle) return;
    const changedTitle = newTitle !== task.title;
    const oldDue = toDate(task.dueDate)?.toISOString().slice(0, 10) ?? '';
    const changedDue = dueDate !== oldDue;
    const changedVis = visibility !== ((task.visibility as Visibility) || 'workspace');
    const changedAssignee = assignee !== (task.assigneeId ?? '');
    if (!changedTitle && !changedDue && !changedVis && !changedAssignee) {
      onClose();
      return;
    }
    let taskOp = db.tx.tasks[task.id].update({
      title: newTitle,
      dueDate: dueDate ? new Date(dueDate + 'T12:00:00') : null,
      ...(changedVis ? { visibility } : {}),
    });
    if (changedAssignee) {
      taskOp = assignee
        ? taskOp.link({ assignee })
        : taskOp.unlink({ assignee: task.assigneeId! });
    }
    db.transact(
      profileId
        ? [
            taskOp,
            activityOp({
              type: 'task.edited',
              workspaceId,
              actorProfileId: profileId,
              taskId: task.id,
              meta: { from: task.title, to: newTitle, due: dueDate || null },
              visibility,
            }),
          ]
        : [taskOp],
    ).catch(() => toast("That didn't save — try again"));
    onClose();
  }

  function remove() {
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    const delOp = db.tx.tasks[task.id].delete();
    // No task link on the audit entry — the task is gone; meta keeps the record.
    db.transact(
      profileId
        ? [
            delOp,
            activityOp({
              type: 'task.deleted',
              workspaceId,
              actorProfileId: profileId,
              meta: { taskTitle: task.title },
              visibility: task.visibility,
            }),
          ]
        : [delOp],
    ).catch(() => toast("Couldn't delete that — try again"));
  }

  return (
    <li data-flip-key={task.id} className="py-2.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="space-y-2"
      >
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          aria-label="Task title"
          className="w-full rounded-[length:var(--radius-field)] border border-line bg-raised px-2.5 py-1 text-[length:var(--text-body)] text-ink focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <AssigneePicker value={assignee} onChange={setAssignee} people={people} />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Due date"
            className="rounded-[length:var(--radius-field)] border border-line bg-transparent px-2 py-1 text-[length:var(--text-meta)] text-ink-muted"
          />
          {isMyOrg && (
            <VisibilityPicker value={visibility} onChange={setVisibility} orgName={orgName} />
          )}
          <span className="ml-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={remove}
              className="text-[length:var(--text-meta)] font-medium text-danger/80 hover:text-danger"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[length:var(--text-meta)] font-medium text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-action px-3.5 py-1 text-[length:var(--text-meta)] font-medium text-ink-inverse hover:bg-action-hover"
            >
              Save
            </button>
          </span>
        </div>
      </form>
    </li>
  );
}

/* -------------------------------------------------------------- org section */

export function OrgSection({
  org,
  tasks,
  weekStart,
  workspaceId,
  profileId,
  isMyOrg,
  people,
}: {
  org: BoardOrg;
  tasks: BoardTask[];
  weekStart: Date;
  workspaceId: string;
  profileId: string | null;
  isMyOrg: boolean;
  people: BoardPerson[];
}) {
  const open = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');
  // FLIP-animate rows sliding to their new spot when checking/unchecking reorders them.
  const listRef = useFlip<HTMLUListElement>(
    [...open, ...done].map((t) => t.id).join('|'),
  );
  return (
    <section className="mt-10 first:mt-6" aria-label={`${org.name} commitments`}>
      <header className="flex items-baseline gap-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 self-center rounded-full"
          style={{ backgroundColor: org.brandColor ?? 'var(--ink-faint)' }}
          aria-hidden
        />
        <h2 className="text-[length:var(--text-title)] font-semibold text-ink">{org.name}</h2>
        <span className="ml-auto text-[length:var(--text-meta)] tabular-nums text-ink-faint">
          {done.length} of {tasks.length} done
        </span>
      </header>
      {tasks.length === 0 ? (
        <p className="mt-3 border-t border-line pt-3.5 text-[length:var(--text-meta)] text-ink-faint">
          Nothing on {org.name}'s plate this week.
        </p>
      ) : (
        <ul ref={listRef} className="mt-2 divide-y divide-line border-t border-line">
          {open.map((t) => (
            <TaskRow key={t.id} task={t} weekStart={weekStart} workspaceId={workspaceId} profileId={profileId} orgName={org.name} isMyOrg={isMyOrg} people={people} />
          ))}
          {done.map((t) => (
            <TaskRow key={t.id} task={t} weekStart={weekStart} workspaceId={workspaceId} profileId={profileId} orgName={org.name} isMyOrg={isMyOrg} people={people} />
          ))}
        </ul>
      )}
      <QuickAdd orgId={org.id} orgName={org.name} workspaceId={workspaceId} profileId={profileId} isMyOrg={isMyOrg} people={people} />
    </section>
  );
}

/** Manual task entry — the escape hatch for work that never came from a meeting. */
function QuickAdd({
  orgId,
  orgName,
  workspaceId,
  profileId,
  isMyOrg,
  people,
}: {
  orgId: string;
  orgName: string;
  workspaceId: string;
  profileId: string | null;
  isMyOrg: boolean;
  people: BoardPerson[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('workspace');

  function add() {
    const t = title.trim();
    if (!t) return;
    const taskId = id();
    const taskOp = db.tx.tasks[taskId]
      .update({
        title: t,
        status: 'open',
        workspaceId,
        createdAt: new Date(),
        ...(dueDate ? { dueDate: new Date(dueDate + 'T12:00:00') } : {}),
        ...(isMyOrg && visibility !== 'workspace' ? { visibility } : {}),
      })
      .link({
        workspace: workspaceId,
        owningOrg: orgId,
        ...(assignee ? { assignee } : {}),
        ...(profileId ? { creator: profileId } : {}),
      });
    db.transact(
      profileId
        ? [
            taskOp,
            activityOp({
              type: 'task.created',
              workspaceId,
              actorProfileId: profileId,
              taskId,
              meta: { taskTitle: t, via: 'quick-add' },
              visibility: isMyOrg ? visibility : null,
            }),
          ]
        : [taskOp],
    ).catch(() => toast("Couldn't add that — try again"));
    setTitle('');
    setDueDate('');
    setAssignee('');
    setVisibility('workspace');
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2.5 text-[length:var(--text-meta)] font-medium text-ink-faint transition-colors hover:text-ink"
      >
        + Add task
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
      className="mt-3 space-y-2"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        placeholder={`What does ${orgName} need to do?`}
        aria-label={`New task for ${orgName}`}
        className="w-full rounded-[length:var(--radius-field)] border border-line bg-raised px-2.5 py-1 text-[length:var(--text-body)] text-ink placeholder:text-ink-faint focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <AssigneePicker value={assignee} onChange={setAssignee} people={people} />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Due date (optional)"
          className="rounded-[length:var(--radius-field)] border border-line bg-transparent px-2 py-1 text-[length:var(--text-meta)] text-ink-muted"
        />
        {isMyOrg && (
          <VisibilityPicker value={visibility} onChange={setVisibility} orgName={orgName} />
        )}
        <span className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[length:var(--text-meta)] font-medium text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded-full bg-action px-3.5 py-1 text-[length:var(--text-meta)] font-medium text-ink-inverse hover:bg-action-hover disabled:opacity-40"
          >
            Add
          </button>
        </span>
      </div>
    </form>
  );
}

/* --------------------------------------------------------- ingest composer */

type Proposal = {
  title: string;
  ownerOrgId: string;
  assigneeName: string | null;
  assigneeId: string; // resolved against workspace people; editable on review
  dueDate: string | null;
  sourceQuote: string;
  confidence: number;
  include: boolean;
};

const EXTRACT_LINES = ['Reading your notes…', 'Finding commitments…', 'Matching owners…'];

/** Labeled meeting date + audience controls — shown while editing AND on review. */
function MeetingControls(props: {
  meetingDate: string;
  onDateChange: (d: string) => void;
  visibility: Visibility;
  onVisibilityChange: (v: Visibility) => void;
  orgName?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {props.orgName && (
        <label className="flex items-center gap-1.5 text-[length:var(--text-meta)] text-ink-faint">
          Visible to
          <VisibilityPicker
            value={props.visibility}
            onChange={props.onVisibilityChange}
            orgName={props.orgName}
            ariaLabel="Who can see this meeting"
          />
        </label>
      )}
      <label className="flex items-center gap-1.5 text-[length:var(--text-meta)] text-ink-faint">
        Meeting date
        <input
          type="date"
          value={props.meetingDate}
          onChange={(e) => props.onDateChange(e.target.value)}
          className="rounded-[length:var(--radius-field)] border border-line bg-transparent px-2 py-1 text-[length:var(--text-meta)] text-ink-muted"
        />
      </label>
    </div>
  );
}

export function IngestComposer(props: {
  board: BoardData;
  engineUrl: string;
  profileId: string | null;
  onClose: () => void;
}) {
  const { board } = props;
  const [phase, setPhase] = useState<'edit' | 'extracting' | 'review' | 'saving' | 'error'>('edit');
  const [transcript, setTranscript] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  // Who can see this meeting + its tasks. Scoped meetings can only produce
  // tasks owned by YOUR org — anything else would leak by construction.
  const [meetingVisibility, setMeetingVisibility] = useState<Visibility>('workspace');
  const myOrg = board.orgs.find((o) => board.myOrgIds.includes(o.id));
  const scoped = meetingVisibility !== 'workspace' && myOrg != null;
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const auth = db.useAuth();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (phase !== 'extracting') return;
    const t = setInterval(() => setLineIdx((i) => (i + 1) % EXTRACT_LINES.length), 2600);
    return () => clearInterval(t);
  }, [phase]);

  /**
   * Streaming extraction: proposals arrive one by one over SSE and appear in
   * the list as the model finds them. Cancel aborts and returns to the notes.
   */
  async function extract() {
    const token = auth.user?.refresh_token;
    if (!token) {
      setErrorMsg('Still connecting — try again in a second.');
      setPhase('error');
      return;
    }
    setPhase('extracting');
    setProposals([]);
    setLineIdx(0);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 120_000); // never strand the user
    try {
      const res = await fetch(`${props.engineUrl}/ingest/extract-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transcript, workspaceId: board.workspaceId, meetingDate }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        // Surface the server's reason (e.g. "transcript too long…") — a generic
        // "try again" on a 400 sends people into a retry loop that can't succeed.
        const detail = await res
          .json()
          .then((d) => (typeof d?.error === 'string' ? d.error : null))
          .catch(() => null);
        throw new Error(detail ?? `extract failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let sawDone = false;
      // Parse SSE frames (blocks separated by a blank line).
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split('\n\n');
        buf = frames.pop() ?? '';
        for (const frame of frames) {
          let event = 'message';
          let data = '';
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (!data) continue;
          const payload = JSON.parse(data);
          if (event === 'proposal') {
            const p = payload.proposal as Omit<Proposal, 'include' | 'assigneeId'>;
            setProposals((ps) => [
              ...ps,
              { ...p, include: true, assigneeId: matchPerson(p.assigneeName) ?? '' },
            ]);
          } else if (event === 'done') {
            sawDone = true;
          } else if (event === 'error') {
            throw new Error(payload.error ?? 'extraction failed');
          }
        }
      }
      if (!sawDone) throw new Error('stream ended before completion');
      setPhase('review');
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        // user cancelled (or hard timeout): back to the notes, nothing lost
        setProposals([]);
        setPhase('edit');
        return;
      }
      console.error(e);
      const msg = e instanceof Error ? e.message : '';
      // Show server-provided reasons verbatim; fall back to the generic line.
      const isDetail = msg && !msg.startsWith('extract failed') && !msg.includes('stream ended');
      setErrorMsg(isDetail ? msg : "Couldn't read those notes — try again.");
      setPhase('error');
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
    }
  }

  /** Match an extracted first name ("Maya") to a workspace member's profile. */
  function matchPerson(name: string | null): string | null {
    if (!name) return null;
    const n = name.trim().toLowerCase();
    if (!n) return null;
    const hit = board.people.find((p) => {
      const full = p.name.toLowerCase();
      return full === n || full.split(' ')[0] === n;
    });
    return hit?.id ?? null;
  }

  async function confirm() {
    setPhase('saving');
    const accepted = proposals.filter((p) => p.include).map((p) => ({ ...p, taskId: id() }));
    const meetingId = id();
    const now = new Date();
    const ops = [
      db.tx.meetings[meetingId]
        .update({
          rawTranscript: transcript,
          meetingDate: new Date(meetingDate + 'T12:00:00'),
          source: 'paste',
          status: 'confirmed',
          workspaceId: board.workspaceId,
          createdAt: now,
          title: null,
          ...(scoped ? { visibility: meetingVisibility } : {}),
        })
        .link({
          workspace: board.workspaceId,
          ...(props.profileId ? { uploader: props.profileId } : {}),
        }),
      ...accepted.map((p) =>
        db.tx.tasks[p.taskId]
          .update({
            title: p.title,
            status: 'open',
            workspaceId: board.workspaceId,
            createdAt: now,
            ...(p.dueDate ? { dueDate: new Date(p.dueDate + 'T12:00:00') } : {}),
            sourceQuote: p.sourceQuote,
            confidence: p.confidence,
            // tasks inherit the meeting's visibility
            ...(scoped ? { visibility: meetingVisibility } : {}),
          })
          .link({
            workspace: board.workspaceId,
            // scoped meetings can only produce tasks owned by YOUR org
            owningOrg: scoped ? myOrg!.id : p.ownerOrgId,
            sourceMeeting: meetingId,
            ...(props.profileId ? { creator: props.profileId } : {}),
            ...(p.assigneeId ? { assignee: p.assigneeId } : {}),
          }),
      ),
      // Audit trail: one entry for the ingest, one per created task.
      ...(props.profileId
        ? [
            activityOp({
              type: 'meeting.ingested',
              workspaceId: board.workspaceId,
              actorProfileId: props.profileId,
              meta: { taskCount: accepted.length, meetingDate },
              visibility: scoped ? meetingVisibility : null,
            }),
            ...accepted.map((p) =>
              activityOp({
                type: 'task.created',
                workspaceId: board.workspaceId,
                actorProfileId: props.profileId!,
                taskId: p.taskId,
                meta: { taskTitle: p.title },
                visibility: scoped ? meetingVisibility : null,
              }),
            ),
          ]
        : []),
    ];
    try {
      await db.transact(ops);
      props.onClose();
    } catch (e) {
      console.error(e);
      toast("Couldn't add those to the board — try again");
      setPhase('review');
    }
  }

  const included = proposals.filter((p) => p.include).length;
  const streaming = phase === 'extracting';
  const reviewing = phase === 'review' || phase === 'saving';

  return (
    <div className="fade-rise mt-6 rounded-2xl border border-line bg-raised p-5">
      {/* Persistent header: the meeting's date + audience are adjustable from
          start to finish — they only become real when the tasks are added. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[length:var(--text-title)] font-semibold">
          {reviewing && proposals.length > 0
            ? `Found ${proposals.length} action item${proposals.length === 1 ? '' : 's'}`
            : 'Add meeting notes'}
        </h2>
        <MeetingControls
          meetingDate={meetingDate}
          onDateChange={setMeetingDate}
          visibility={meetingVisibility}
          onVisibilityChange={setMeetingVisibility}
          orgName={myOrg?.name}
        />
      </div>

      {(phase === 'edit' || phase === 'error') && (
        <>
          <textarea
            ref={areaRef}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste the meeting notes or transcript here — messy is fine."
            className="mt-4 min-h-44 w-full resize-y bg-transparent text-[length:var(--text-body)] leading-relaxed placeholder:text-ink-faint focus:outline-none"
          />
          {phase === 'error' && errorMsg && (
            <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-[length:var(--text-meta)] text-danger">{errorMsg}</p>
          )}
          <div className="mt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-full px-4 py-2 text-[length:var(--text-body)] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!transcript.trim()}
              onClick={extract}
              className="rounded-full bg-action px-5 py-2 text-[length:var(--text-body)] font-medium text-ink-inverse transition-colors duration-150 hover:bg-action-hover disabled:opacity-40"
            >
              Extract action items
            </button>
          </div>
        </>
      )}

      {streaming && (
        <div className="mt-5 flex items-center gap-2.5" role="status" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-faint"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
          <p className="text-[length:var(--text-body)] text-ink-muted">
            {proposals.length === 0
              ? EXTRACT_LINES[lineIdx]
              : `${proposals.length} found — still reading…`}
          </p>
        </div>
      )}

      {reviewing && proposals.length === 0 ? (
        <>
          <p className="mt-3 max-w-md text-[length:var(--text-body)] text-ink-muted">
            These notes didn't contain any clear commitments. Notes work best when they
            capture who agreed to do what — "James will send the one-pager by Tuesday."
          </p>
          <div className="mt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setPhase('edit')}
              className="rounded-full bg-action px-5 py-2 text-[length:var(--text-body)] font-medium text-ink-inverse transition-colors duration-150 hover:bg-action-hover"
            >
              Back to notes
            </button>
          </div>
        </>
      ) : (
        (streaming || reviewing) &&
        proposals.length > 0 && (
          <>
            {reviewing && (
              <p className="mt-1 text-[length:var(--text-meta)] text-ink-faint">
                {scoped
                  ? `Only ${meetingVisibility === 'org' ? myOrg!.name : 'you'} will see these.`
                  : 'Check the owners, then add them to the board.'}
              </p>
            )}
            <ul className="mt-4 divide-y divide-line border-t border-line">
              {proposals.map((p, idx) => (
                <li
                  key={idx}
                  className={'fade-rise flex items-start gap-3 py-3 ' + (p.include ? '' : 'opacity-45')}
                >
                  <input
                    type="checkbox"
                    checked={p.include}
                    onChange={(e) =>
                      setProposals((ps) => ps.map((q, i) => (i === idx ? { ...q, include: e.target.checked } : q)))
                    }
                    aria-label={`Include "${p.title}"`}
                    className="mt-1.5 h-4.5 w-4.5 accent-[color:var(--action)]"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      value={p.title}
                      onChange={(e) =>
                        setProposals((ps) => ps.map((q, i) => (i === idx ? { ...q, title: e.target.value } : q)))
                      }
                      aria-label="Action item title"
                      className="w-full bg-transparent text-[length:var(--text-body)] text-ink focus:outline-none"
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[length:var(--text-meta)]">
                      {scoped ? (
                        <span className="rounded-full bg-sunken px-2 py-0.5 text-ink-faint">
                          {meetingVisibility === 'org' ? `just ${myOrg!.name}` : 'just you'}
                        </span>
                      ) : (
                        <Select
                          value={p.ownerOrgId}
                          onChange={(v) =>
                            setProposals((ps) => ps.map((q, i) => (i === idx ? { ...q, ownerOrgId: v } : q)))
                          }
                          ariaLabel="Owning company"
                          options={board.orgs.map((o) => ({ value: o.id, label: o.name }))}
                        />
                      )}
                      <AssigneePicker
                        value={p.assigneeId}
                        onChange={(v) =>
                          setProposals((ps) => ps.map((q, i) => (i === idx ? { ...q, assigneeId: v } : q)))
                        }
                        people={board.people}
                      />
                      <input
                        type="date"
                        value={p.dueDate ?? ''}
                        onChange={(e) =>
                          setProposals((ps) =>
                            ps.map((q, i) => (i === idx ? { ...q, dueDate: e.target.value || null } : q)),
                          )
                        }
                        aria-label="Due date"
                        className="rounded-full border border-line bg-transparent px-2 py-0.5 text-ink-muted"
                      />
                      {p.confidence < 0.8 && p.include && (
                        <span className="text-ink-faint">double-check owner</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )
      )}

      {streaming && (
        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="rounded-full px-4 py-2 text-[length:var(--text-body)] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}

      {reviewing && proposals.length > 0 && (
        <div className="mt-4 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setPhase('edit')}
            className="rounded-full px-4 py-2 text-[length:var(--text-body)] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Back
          </button>
          <button
            type="button"
            disabled={included === 0 || phase === 'saving'}
            onClick={confirm}
            className="rounded-full bg-action px-5 py-2 text-[length:var(--text-body)] font-medium text-ink-inverse transition-colors duration-150 hover:bg-action-hover disabled:opacity-40"
          >
            {phase === 'saving' ? 'Adding…' : `Add ${included} to the board`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- empty state */

export function EmptyBoard({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <p className="text-[length:var(--text-title)] font-medium text-ink">
        Your partnership's page is ready.
      </p>
      <p className="mt-1.5 max-w-sm text-[length:var(--text-body)] text-ink-muted">
        Paste your first meeting's notes and watch them become action items each company owns.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-6 rounded-full bg-action px-5 py-2.5 text-[length:var(--text-body)] font-medium text-ink-inverse transition-colors hover:bg-action-hover"
      >
        Add meeting notes
      </button>
    </div>
  );
}

export function useWeekStart() {
  return useMemo(() => startOfWeek(), []);
}
