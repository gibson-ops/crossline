// Seed the customer-zero workspace (ThreatZero · Stand 4 Kind · Target River).
//
// Idempotent: every record uses a FIXED UUID, so `update` acts as an upsert —
// re-running refreshes the same records instead of duplicating them.
//
// Run:  infisical-agent run --env=dev -- npx tsx scripts/seed.ts
// (INSTANTDB_ADMIN_TOKEN comes from Infisical; people use .example placeholder
//  emails per the no-personal-info rule — display-only, no real accounts.)
import { init } from '@instantdb/admin';
import schema from '../instant.schema';

const APP_ID = process.env.INSTANT_APP_ID ?? 'c7f2d8d8-41f2-4272-a25a-eb2d6a344a31';
const adminToken = process.env.INSTANTDB_ADMIN_TOKEN;
if (!adminToken) throw new Error('INSTANTDB_ADMIN_TOKEN not set (run via infisical-agent)');

const db = init({ appId: APP_ID, adminToken, schema });

// --- fixed ids (stable across runs) -----------------------------------------
const W = 'a0000000-0000-4000-8000-000000000001'; // workspace

const ORG = {
  tz: 'b0000000-0000-4000-8000-000000000001',
  s4k: 'b0000000-0000-4000-8000-000000000002',
  tr: 'b0000000-0000-4000-8000-000000000003',
};
const WM = {
  tz: 'c0000000-0000-4000-8000-000000000001',
  s4k: 'c0000000-0000-4000-8000-000000000002',
  tr: 'c0000000-0000-4000-8000-000000000003',
};
const P = {
  james: 'd0000000-0000-4000-8000-000000000001',
  maya: 'd0000000-0000-4000-8000-000000000002',
  colin: 'd0000000-0000-4000-8000-000000000003',
};
const OM = {
  james: 'e0000000-0000-4000-8000-000000000001',
  maya: 'e0000000-0000-4000-8000-000000000002',
  colin: 'e0000000-0000-4000-8000-000000000003',
};
const PROJECT = { fall: 'f0000000-0000-4000-8000-000000000001' };
const MEETING = { kickoff: 'a1000000-0000-4000-8000-000000000001' };
const T = Array.from({ length: 9 }, (_, i) => `a2000000-0000-4000-8000-00000000000${i + 1}`);
const FOLDER = {
  shared: 'a3000000-0000-4000-8000-000000000001',
  marketing: 'a3000000-0000-4000-8000-000000000002',
};

const now = new Date();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000);

const SAMPLE_TRANSCRIPT = `Weekly partnership sync — ThreatZero / Stand 4 Kind / Target River

Attendees: James (ThreatZero), Maya (Stand 4 Kind), Colin (Target River)

James: Thanks for hopping on. Quick recap — the fall school-district campaign is our
big push. ThreatZero will have the co-branded landing page copy drafted by Friday.
Maya: Great. Stand 4 Kind will pull the district contact list together — give us a
week. We also owe everyone the updated speaker bios.
Colin: Target River will mock up two ad concepts for the campaign by next Wednesday,
and we'll get the media plan draft over the week after.
James: One more — we need pricing one-pagers for the bundled offering. I'll own that.
Maya: And I'll confirm the assembly dates with the pilot schools before month end.
Colin: Last thing — everyone send raw logos and brand kits to the shared folder so
we can keep creative consistent.`;

async function main() {
  console.log('Seeding Crossline demo workspace…');

  const tx = db.tx;
  const ops = [
    // workspace ---------------------------------------------------------------
    tx.workspaces[W].update({ name: 'ThreatZero · Stand 4 Kind · Target River', createdAt: now }),

    // orgs ----------------------------------------------------------------------
    tx.orgs[ORG.tz].update({ name: 'ThreatZero', slug: 'threatzero', brandColor: '#1f5eff', createdAt: now }),
    tx.orgs[ORG.s4k].update({ name: 'Stand 4 Kind', slug: 'stand-4-kind', brandColor: '#0fa968', createdAt: now }),
    tx.orgs[ORG.tr].update({ name: 'Target River', slug: 'target-river', brandColor: '#e0532f', createdAt: now }),

    // workspace membership (equal seats) ---------------------------------------
    tx.workspaceMembers[WM.tz].update({ role: 'member', status: 'active', joinedAt: now }).link({ org: ORG.tz, workspace: W }),
    tx.workspaceMembers[WM.s4k].update({ role: 'member', status: 'active', joinedAt: now }).link({ org: ORG.s4k, workspace: W }),
    tx.workspaceMembers[WM.tr].update({ role: 'member', status: 'active', joinedAt: now }).link({ org: ORG.tr, workspace: W }),

    // people (display-only placeholders; no $users linked) ----------------------
    tx.profiles[P.james].update({ name: 'James', createdAt: now }),
    tx.profiles[P.maya].update({ name: 'Maya', createdAt: now }),
    tx.profiles[P.colin].update({ name: 'Colin', createdAt: now }),
    tx.orgMembers[OM.james].update({ role: 'admin', title: 'CEO', joinedAt: now }).link({ profile: P.james, org: ORG.tz }),
    tx.orgMembers[OM.maya].update({ role: 'admin', title: 'Program Director', joinedAt: now }).link({ profile: P.maya, org: ORG.s4k }),
    tx.orgMembers[OM.colin].update({ role: 'admin', title: 'Account Lead', joinedAt: now }).link({ profile: P.colin, org: ORG.tr }),
    // display profiles get workspace access cache too (harmless; they have no logins)
    tx.profiles[P.james].link({ workspaces: W }),
    tx.profiles[P.maya].link({ workspaces: W }),
    tx.profiles[P.colin].link({ workspaces: W }),

    // project -------------------------------------------------------------------
    tx.projects[PROJECT.fall].update({ name: 'Fall School-District Campaign', workspaceId: W, createdAt: now }).link({ workspace: W, owningOrg: ORG.tr }),

    // the kickoff meeting --------------------------------------------------------
    tx.meetings[MEETING.kickoff].update({
      title: 'Weekly partnership sync',
      meetingDate: daysFromNow(-2),
      rawTranscript: SAMPLE_TRANSCRIPT,
      source: 'paste',
      status: 'confirmed',
      workspaceId: W,
      createdAt: daysFromNow(-2),
    }).link({ workspace: W, uploader: P.james }),

    // folders ---------------------------------------------------------------------
    tx.folders[FOLDER.shared].update({ name: 'Shared', workspaceId: W, createdAt: now }).link({ workspace: W }),
    tx.folders[FOLDER.marketing].update({ name: 'Marketing Materials', workspaceId: W, createdAt: now }).link({ workspace: W, org: ORG.tr }),
  ];

  // tasks (commitments) — provenance from the meeting where applicable ------------
  type SeedTask = {
    id: string; title: string; org: string; status: string;
    due?: Date; assignee?: string; quote?: string; project?: string; done?: Date;
  };
  const tasks: SeedTask[] = [
    { id: T[0], title: 'Draft co-branded landing page copy', org: ORG.tz, status: 'open', due: daysFromNow(1), assignee: P.james, quote: 'ThreatZero will have the co-branded landing page copy drafted by Friday.', project: PROJECT.fall },
    { id: T[1], title: 'Pull together district contact list', org: ORG.s4k, status: 'open', due: daysFromNow(5), assignee: P.maya, quote: 'Stand 4 Kind will pull the district contact list together — give us a week.', project: PROJECT.fall },
    { id: T[2], title: 'Send updated speaker bios', org: ORG.s4k, status: 'in_progress', due: daysFromNow(3), assignee: P.maya, quote: 'We also owe everyone the updated speaker bios.' },
    { id: T[3], title: 'Mock up two ad concepts', org: ORG.tr, status: 'open', due: daysFromNow(6), assignee: P.colin, quote: 'Target River will mock up two ad concepts for the campaign by next Wednesday.', project: PROJECT.fall },
    { id: T[4], title: 'Draft media plan', org: ORG.tr, status: 'open', due: daysFromNow(13), assignee: P.colin, quote: "we'll get the media plan draft over the week after.", project: PROJECT.fall },
    { id: T[5], title: 'Write pricing one-pagers for bundled offering', org: ORG.tz, status: 'open', due: daysFromNow(-1), assignee: P.james, quote: "we need pricing one-pagers for the bundled offering. I'll own that." },
    { id: T[6], title: 'Confirm assembly dates with pilot schools', org: ORG.s4k, status: 'open', due: daysFromNow(9), assignee: P.maya, quote: "I'll confirm the assembly dates with the pilot schools before month end." },
    { id: T[7], title: 'Upload raw logos + brand kits to shared folder', org: ORG.tz, status: 'done', done: daysFromNow(-1), quote: 'everyone send raw logos and brand kits to the shared folder.' },
    { id: T[8], title: 'Set up shared campaign calendar', org: ORG.tr, status: 'done', done: daysFromNow(-3) },
  ];

  for (const t of tasks) {
    let op = tx.tasks[t.id].update({
      title: t.title,
      status: t.status,
      workspaceId: W,
      createdAt: daysFromNow(-2),
      ...(t.due ? { dueDate: t.due } : {}),
      ...(t.done ? { completedAt: t.done } : {}),
      ...(t.quote ? { sourceQuote: t.quote, confidence: 0.95 } : {}),
    });
    const links: Record<string, string> = { workspace: W, owningOrg: t.org };
    if (t.assignee) links.assignee = t.assignee;
    if (t.quote) links.sourceMeeting = MEETING.kickoff;
    if (t.project) links.project = t.project;
    ops.push(op.link(links));
  }

  await db.transact(ops);
  console.log(`✓ Seeded: 1 workspace, 3 orgs, 3 people, 1 project, 1 meeting, ${tasks.length} tasks, 2 folders`);

  // quick verification read-back
  const res = await db.query({
    workspaces: { members: { org: {} }, tasks: { owningOrg: {} } },
  });
  const ws = res.workspaces[0];
  console.log(`✓ Verified: "${ws?.name}" — ${ws?.members?.length} member orgs, ${ws?.tasks?.length} tasks`);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
