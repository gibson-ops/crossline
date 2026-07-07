// Permission-rule security suite — runs against the REAL InstantDB app using
// admin impersonation (db.asUser). These rules ARE the multi-org security
// boundary; a regression here means one partnership can see another's data.
//
//   infisical-agent run --env=dev -- npm test
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { id, init } from '@instantdb/admin';
import schema from '../instant.schema';

const APP_ID = 'c7f2d8d8-41f2-4272-a25a-eb2d6a344a31';
const WORKSPACE = 'a0000000-0000-4000-8000-000000000001'; // seeded demo workspace
const MEMBER = 'jaredsassistant@gibsonops.com'; // granted seat (grant-access.ts)
const OUTSIDER = 'outsider@crosslineapp.com'; // authed user with NO workspace

const admin = init({
  appId: APP_ID,
  adminToken: process.env.INSTANTDB_ADMIN_TOKEN!,
  schema,
});

const TZ_COLLEAGUE = 'jared@threatzero.org'; // second ThreatZero member (granted)
const S4K_MEMBER = 's4k-member@crosslineapp.com'; // member of a DIFFERENT org in the workspace

const asMember = admin.asUser({ email: MEMBER });
const asOutsider = admin.asUser({ email: OUTSIDER });
const asGuest = admin.asUser({ guest: true });
const asTzColleague = admin.asUser({ email: TZ_COLLEAGUE });
const asS4kMember = admin.asUser({ email: S4K_MEMBER });

let memberProfileId: string;
let otherProfileId: string; // someone else's profile (seeded James/Maya/Colin)
let tzOrgId: string;
let s4kOrgId: string;

beforeAll(async () => {
  // Ensure the outsider identity exists (authed, profiled, NO workspace).
  await admin.auth.createToken({ email: OUTSIDER });
  const outsiderUser = await admin.auth.getUser({ email: OUTSIDER });
  const oRes = await admin.query({
    profiles: { $: { where: { '$user.id': outsiderUser!.id } } },
  });
  if (!oRes.profiles[0]) {
    await admin.transact(
      admin.tx.profiles[id()]
        .update({ name: 'Outsider', createdAt: new Date() })
        .link({ $user: outsiderUser!.id }),
    );
  }

  const mRes = await admin.query({
    profiles: { $: { where: { '$user.email': MEMBER } } },
  });
  memberProfileId = mRes.profiles[0]!.id;

  const others = await admin.query({
    workspaces: { $: { where: { id: WORKSPACE } }, memberProfiles: {} },
  });
  const other = others.workspaces[0]!.memberProfiles!.find((p) => p.id !== memberProfileId);
  otherProfileId = other!.id;

  // Org ids + a member seat in a DIFFERENT org (Stand 4 Kind) for cross-org cases.
  const orgs = await admin.query({ orgs: { members: { profile: { $user: {} } } } });
  tzOrgId = orgs.orgs.find((o) => o.name === 'ThreatZero')!.id;
  const s4k = orgs.orgs.find((o) => o.name === 'Stand 4 Kind')!;
  s4kOrgId = s4k.id;

  await admin.auth.createToken({ email: S4K_MEMBER });
  const s4kUser = await admin.auth.getUser({ email: S4K_MEMBER });
  const s4kRes = await admin.query({ profiles: { $: { where: { '$user.id': s4kUser!.id } } } });
  let s4kProfileId = s4kRes.profiles[0]?.id;
  if (!s4kProfileId) {
    s4kProfileId = id();
    await admin.transact(
      admin.tx.profiles[s4kProfileId]
        .update({ name: 'S4K Tester', createdAt: new Date() })
        .link({ $user: s4kUser!.id }),
    );
  }
  const alreadyMember = s4k.members?.some((m) => m.profile?.id === s4kProfileId);
  if (!alreadyMember) {
    await admin.transact(
      admin.tx.orgMembers[id()]
        .update({ role: 'member', joinedAt: new Date() })
        .link({ profile: s4kProfileId, org: s4kOrgId }),
    );
  }
  await admin.transact(admin.tx.profiles[s4kProfileId].link({ workspaces: WORKSPACE }));
});

// The workspace is LIVE data (Jared + James use it) — remove the test seat so
// "S4K Tester" never lingers in assignee pickers or digest recipients.
afterAll(async () => {
  const res = await admin.query({
    profiles: { $: { where: { '$user.email': S4K_MEMBER } }, orgMemberships: {} },
  });
  const p = res.profiles[0];
  if (!p) return;
  await admin.transact([
    admin.tx.profiles[p.id].unlink({ workspaces: WORKSPACE }),
    ...(p.orgMemberships ?? []).map((m) => admin.tx.orgMembers[m.id].delete()),
  ]);
});

describe('workspace data isolation', () => {
  it('member can read workspace tasks', async () => {
    const res = await asMember.query({ tasks: { $: { where: { workspaceId: WORKSPACE } } } });
    expect(res.tasks.length).toBeGreaterThan(0);
  });

  it('outsider reads ZERO workspace tasks', async () => {
    const res = await asOutsider.query({ tasks: { $: { where: { workspaceId: WORKSPACE } } } });
    expect(res.tasks.length).toBe(0);
  });

  it('guest reads ZERO workspace tasks', async () => {
    const res = await asGuest.query({ tasks: { $: { where: { workspaceId: WORKSPACE } } } });
    expect(res.tasks.length).toBe(0);
  });

  it('outsider reads ZERO meetings / folders / activities', async () => {
    const res = await asOutsider.query({
      meetings: { $: { where: { workspaceId: WORKSPACE } } },
      folders: { $: { where: { workspaceId: WORKSPACE } } },
      activities: { $: { where: { workspaceId: WORKSPACE } } },
    });
    expect(res.meetings.length).toBe(0);
    expect(res.folders.length).toBe(0);
    expect(res.activities.length).toBe(0);
  });

  it('outsider sees only their own profile', async () => {
    const res = await asOutsider.query({ profiles: {} });
    expect(res.profiles.map((p) => p.name)).toEqual(['Outsider']);
  });

  it('outsider CANNOT create a task in the workspace', async () => {
    await expect(
      asOutsider.transact(
        asOutsider.tx.tasks[id()]
          .update({ title: 'intrusion', status: 'open', workspaceId: WORKSPACE, createdAt: new Date() })
          .link({ workspace: WORKSPACE }),
      ),
    ).rejects.toThrow();
  });

  it('member CAN create and delete a task', async () => {
    const taskId = id();
    await asMember.transact(
      asMember.tx.tasks[taskId]
        .update({ title: 'perms-test task', status: 'open', workspaceId: WORKSPACE, createdAt: new Date() })
        .link({ workspace: WORKSPACE }),
    );
    await asMember.transact(asMember.tx.tasks[taskId].delete());
  });
});

describe('audit log integrity', () => {
  it('member CANNOT log an activity as someone else (actor forgery)', async () => {
    await expect(
      asMember.transact(
        asMember.tx.activities[id()]
          .update({ type: 'task.completed', workspaceId: WORKSPACE, createdAt: new Date() })
          .link({ workspace: WORKSPACE, actor: otherProfileId }),
      ),
    ).rejects.toThrow();
  });

  it('activities are append-only: creator cannot update or delete', async () => {
    const actId = id();
    await asMember.transact(
      asMember.tx.activities[actId]
        .update({ type: 'task.completed', workspaceId: WORKSPACE, createdAt: new Date(), meta: { test: true } })
        .link({ workspace: WORKSPACE, actor: memberProfileId }),
    );
    await expect(
      asMember.transact(asMember.tx.activities[actId].update({ type: 'task.reopened' })),
    ).rejects.toThrow();
    await expect(asMember.transact(asMember.tx.activities[actId].delete())).rejects.toThrow();
    // cleanup with admin powers (bypasses rules by design)
    await admin.transact(admin.tx.activities[actId].delete());
  });
});

describe('visibility scoping (org / private)', () => {
  it('org-scoped task: visible to BOTH owning-org members, invisible to other orgs', async () => {
    const taskId = id();
    await asMember.transact(
      asMember.tx.tasks[taskId]
        .update({ title: 'TZ internal: renew SOC2', status: 'open', workspaceId: WORKSPACE, createdAt: new Date(), visibility: 'org' })
        .link({ workspace: WORKSPACE, owningOrg: tzOrgId, creator: memberProfileId }),
    );
    const [mine, colleague, s4k] = await Promise.all([
      asMember.query({ tasks: { $: { where: { id: taskId } } } }),
      asTzColleague.query({ tasks: { $: { where: { id: taskId } } } }),
      asS4kMember.query({ tasks: { $: { where: { id: taskId } } } }),
    ]);
    expect(mine.tasks.length).toBe(1);
    expect(colleague.tasks.length).toBe(1); // same org sees it
    expect(s4k.tasks.length).toBe(0); // partner org does NOT
    await admin.transact(admin.tx.tasks[taskId].delete());
  });

  it('private task: invisible even to a same-org colleague', async () => {
    const taskId = id();
    await asMember.transact(
      asMember.tx.tasks[taskId]
        .update({ title: 'personal: book flights', status: 'open', workspaceId: WORKSPACE, createdAt: new Date(), visibility: 'private' })
        .link({ workspace: WORKSPACE, owningOrg: tzOrgId, creator: memberProfileId }),
    );
    const [mine, colleague] = await Promise.all([
      asMember.query({ tasks: { $: { where: { id: taskId } } } }),
      asTzColleague.query({ tasks: { $: { where: { id: taskId } } } }),
    ]);
    expect(mine.tasks.length).toBe(1);
    expect(colleague.tasks.length).toBe(0);
    await admin.transact(admin.tx.tasks[taskId].delete());
  });

  it('CANNOT create an org-scoped task owned by an org you are not in', async () => {
    await expect(
      asMember.transact(
        asMember.tx.tasks[id()]
          .update({ title: 'forged', status: 'open', workspaceId: WORKSPACE, createdAt: new Date(), visibility: 'org' })
          .link({ workspace: WORKSPACE, owningOrg: s4kOrgId, creator: memberProfileId }),
      ),
    ).rejects.toThrow();
  });

  it("CANNOT create a private task with someone else as creator", async () => {
    await expect(
      asMember.transact(
        asMember.tx.tasks[id()]
          .update({ title: 'forged', status: 'open', workspaceId: WORKSPACE, createdAt: new Date(), visibility: 'private' })
          .link({ workspace: WORKSPACE, owningOrg: tzOrgId, creator: otherProfileId }),
      ),
    ).rejects.toThrow();
  });

  it('scoped audit entries do not leak: private activity invisible to colleagues', async () => {
    const actId = id();
    await asMember.transact(
      asMember.tx.activities[actId]
        .update({ type: 'task.completed', workspaceId: WORKSPACE, createdAt: new Date(), visibility: 'private', meta: { taskTitle: 'secret' } })
        .link({ workspace: WORKSPACE, actor: memberProfileId }),
    );
    const [mine, colleague] = await Promise.all([
      asMember.query({ activities: { $: { where: { id: actId } } } }),
      asTzColleague.query({ activities: { $: { where: { id: actId } } } }),
    ]);
    expect(mine.activities.length).toBe(1);
    expect(colleague.activities.length).toBe(0);
    await admin.transact(admin.tx.activities[actId].delete());
  });

  it('org-scoped meeting: visible to uploader-org members only', async () => {
    const meetingId = id();
    await admin.transact(
      admin.tx.meetings[meetingId]
        .update({
          rawTranscript: 'TZ-internal 1:1 notes',
          meetingDate: new Date(),
          source: 'paste',
          status: 'confirmed',
          workspaceId: WORKSPACE,
          createdAt: new Date(),
          visibility: 'org',
        })
        .link({ workspace: WORKSPACE, uploader: memberProfileId }),
    );
    const [colleague, s4k] = await Promise.all([
      asTzColleague.query({ meetings: { $: { where: { id: meetingId } } } }),
      asS4kMember.query({ meetings: { $: { where: { id: meetingId } } } }),
    ]);
    expect(colleague.meetings.length).toBe(1);
    expect(s4k.meetings.length).toBe(0);
    await admin.transact(admin.tx.meetings[meetingId].delete());
  });
});

describe('membership joins are server-only', () => {
  it('member CANNOT forge orgMembers', async () => {
    await expect(
      asMember.transact(
        asMember.tx.orgMembers[id()].update({ role: 'admin', joinedAt: new Date() }),
      ),
    ).rejects.toThrow();
  });

  it('member CANNOT forge workspaceMembers', async () => {
    await expect(
      asMember.transact(
        asMember.tx.workspaceMembers[id()].update({ role: 'member', status: 'active', joinedAt: new Date() }),
      ),
    ).rejects.toThrow();
  });
});
