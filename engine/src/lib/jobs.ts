// QStash job handlers — the reminder loop that keeps busy partners honest.
// Both jobs walk every workspace, build a per-org picture of open commitments,
// and email the workspace's REAL members (profiles linked to a $user with an
// email; seeded display-only people have none, so they're naturally skipped).
import { db } from './instant';
import { sendEmail } from './email';

// Public web-app URL for links in emails (argo in dev, prod domain at deploy).
const APP_URL = process.env.APP_URL ?? 'https://crossline.argo.gibsonops.com';

type OrgBucket = {
  orgName: string;
  overdue: { title: string; due: Date }[];
  dueSoon: { title: string; due: Date }[]; // within the horizon (digest: this week)
  openNoDate: string[];
};

const dayFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'America/Denver',
});

/** Gather every workspace with its orgs, open tasks, and real member emails. */
async function loadWorkspaces() {
  const res = await db.query({
    workspaces: {
      members: { org: {} },
      tasks: { owningOrg: {} },
      memberProfiles: { $user: {} },
    },
  });
  return res.workspaces.map((ws) => {
    const orgNames = new Map<string, string>();
    for (const m of ws.members ?? []) if (m.org) orgNames.set(m.org.id, m.org.name);
    // v1 leak guard: digests go to ALL workspace members, so org-/private-scoped
    // tasks are excluded entirely. Per-org digest variants are the follow-up.
    const open = (ws.tasks ?? []).filter(
      (t) =>
        (t.status === 'open' || t.status === 'in_progress') &&
        (!t.visibility || t.visibility === 'workspace'),
    );
    const emails = (ws.memberProfiles ?? [])
      .map((p) => p.$user?.email)
      .filter((e): e is string => Boolean(e));
    return { id: ws.id, name: ws.name, orgNames, open, emails };
  });
}

/** Bucket a workspace's open tasks per org against a due-date horizon. */
export function bucketByOrg(
  open: { title: string; dueDate?: string | number | Date | null; owningOrg?: { id: string; name: string } | null }[],
  orgNames: Map<string, string>,
  horizon: Date,
  now: Date,
): OrgBucket[] {
  const buckets = new Map<string, OrgBucket>();
  const bucketFor = (orgId: string | undefined) => {
    const key = orgId ?? 'unowned';
    if (!buckets.has(key)) {
      buckets.set(key, {
        orgName: (orgId && orgNames.get(orgId)) ?? 'Unassigned',
        overdue: [],
        dueSoon: [],
        openNoDate: [],
      });
    }
    return buckets.get(key)!;
  };
  for (const t of open) {
    const b = bucketFor(t.owningOrg?.id);
    const due = t.dueDate ? new Date(t.dueDate) : null;
    if (!due) b.openNoDate.push(t.title);
    else if (due < now) b.overdue.push({ title: t.title, due });
    else if (due <= horizon) b.dueSoon.push({ title: t.title, due });
    else b.openNoDate.push(t.title); // beyond horizon: list as open, no urgency
  }
  return [...buckets.values()].filter(
    (b) => b.overdue.length || b.dueSoon.length || b.openNoDate.length,
  );
}

function renderText(wsName: string, buckets: OrgBucket[], heading: string): string {
  const lines: string[] = [`${heading} — ${wsName}`, ''];
  for (const b of buckets) {
    lines.push(`${b.orgName}`);
    for (const t of b.overdue) lines.push(`  ⚠ OVERDUE · ${t.title} (was due ${dayFmt.format(t.due)})`);
    for (const t of b.dueSoon) lines.push(`  • ${t.title} — due ${dayFmt.format(t.due)}`);
    for (const t of b.openNoDate) lines.push(`  • ${t.title}`);
    lines.push('');
  }
  lines.push(`Open the board: ${APP_URL}/`);
  return lines.join('\n');
}

/** Warm, minimal HTML matching the product's voice. */
function renderHtml(wsName: string, buckets: OrgBucket[], heading: string): string {
  const section = (b: OrgBucket) => `
    <h3 style="margin:20px 0 6px;font-size:15px;color:#33302b;">${b.orgName}</h3>
    ${b.overdue.map((t) => `<p style="margin:4px 0;color:#a13c22;">⚠ Overdue · ${t.title} <span style="color:#8a8377;">(was due ${dayFmt.format(t.due)})</span></p>`).join('')}
    ${b.dueSoon.map((t) => `<p style="margin:4px 0;color:#33302b;">${t.title} <span style="color:#8a8377;">— due ${dayFmt.format(t.due)}</span></p>`).join('')}
    ${b.openNoDate.map((t) => `<p style="margin:4px 0;color:#6b6660;">${t.title}</p>`).join('')}`;
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:8px 4px;background:#faf8f4;">
    <p style="font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#8a8377;margin:16px 0 2px;">${wsName}</p>
    <h2 style="margin:0 0 4px;font-size:19px;color:#26231f;">${heading}</h2>
    ${buckets.map(section).join('')}
    <p style="margin:24px 0;"><a href="${APP_URL}/" style="color:#26231f;font-weight:600;">Open the board →</a></p>
  </div>`;
}

/**
 * Weekly digest: everything open, grouped by org, overdue first.
 * Returns a summary for the QStash response body / logs.
 */
export async function runWeeklyDigest(): Promise<{ workspaces: number; emails: number }> {
  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 86400_000);
  let emails = 0;
  const workspaces = await loadWorkspaces();
  for (const ws of workspaces) {
    if (!ws.emails.length || !ws.open.length) continue;
    const buckets = bucketByOrg(ws.open, ws.orgNames, weekOut, now);
    if (!buckets.length) continue;
    const heading = 'This week in your partnership';
    await sendEmail({
      to: ws.emails,
      subject: `${ws.name} — this week`,
      text: renderText(ws.name, buckets, heading),
      html: renderHtml(ws.name, buckets, heading),
    });
    emails += 1;
  }
  return { workspaces: workspaces.length, emails };
}

/**
 * Daily due-scan: only overdue + due-in-48h items. Silent when there's nothing
 * urgent — no noise, per the product's calm mandate.
 */
export async function runScanDue(): Promise<{ workspaces: number; emails: number }> {
  const now = new Date();
  const soon = new Date(now.getTime() + 2 * 86400_000);
  let emails = 0;
  const workspaces = await loadWorkspaces();
  for (const ws of workspaces) {
    if (!ws.emails.length) continue;
    const buckets = bucketByOrg(ws.open, ws.orgNames, soon, now)
      .map((b) => ({ ...b, openNoDate: [] })) // urgency only
      .filter((b) => b.overdue.length || b.dueSoon.length);
    if (!buckets.length) continue;
    const heading = 'Due now';
    await sendEmail({
      to: ws.emails,
      subject: `${ws.name} — due & overdue`,
      text: renderText(ws.name, buckets, heading),
      html: renderHtml(ws.name, buckets, heading),
    });
    emails += 1;
  }
  return { workspaces: workspaces.length, emails };
}
