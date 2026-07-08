// Crossline MCP tool surface. Every tool runs through adminDb.asUser(email), so
// the exact CEL permission rules that govern the web app govern AI clients too —
// no admin power leaks through MCP. Writes attribute to the caller's profile.
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { id } from '@instantdb/admin';
import { adminDb } from './instant.server';
import { activityOp } from './activity';

const dueFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const fmtDate = (v: unknown) => (v ? dueFmt.format(new Date(v as string)) : null);

type Caller = { email: string; profileId: string };

/** activityOp writes via the web `db` singleton; here we build the same chunk on adminDb-asUser. */
function scopedActivity(
  scoped: ReturnType<typeof adminDb.asUser>,
  args: { type: string; workspaceId: string; actorProfileId: string; taskId?: string; meta?: Record<string, unknown> },
) {
  return scoped.tx.activities[id()]
    .update({ type: args.type, workspaceId: args.workspaceId, createdAt: new Date(), ...(args.meta ? { meta: args.meta } : {}) })
    .link({ workspace: args.workspaceId, actor: args.actorProfileId, ...(args.taskId ? { task: args.taskId } : {}) });
}

/** Build the per-request MCP handler bound to a caller's identity. */
export function crosslineMcpHandler(caller: Caller) {
  const scoped = adminDb.asUser({ email: caller.email });

  return createMcpHandler(
    (server) => {
      server.tool(
        'list_workspaces',
        "List the partnerships (workspaces) you're part of, with their member companies.",
        {},
        async () => {
          const res = await scoped.query({ workspaces: { members: { org: {} } } });
          const lines = res.workspaces.map((w) => {
            const orgs = (w.members ?? []).map((m) => m.org?.name).filter(Boolean).join(', ');
            return `• ${w.name}\n  id: ${w.id}\n  companies: ${orgs}`;
          });
          return {
            content: [
              { type: 'text', text: lines.length ? lines.join('\n\n') : "You're not in any workspaces yet." },
            ],
          };
        },
      );

      server.tool(
        'list_tasks',
        'List the open (and optionally completed) commitments in a workspace, grouped by owning company.',
        {
          workspaceId: z.string().describe('Workspace id from list_workspaces'),
          include_done: z.boolean().optional().describe('Include completed tasks (default false)'),
        },
        async ({ workspaceId, include_done }) => {
          const res = await scoped.query({
            workspaces: { $: { where: { id: workspaceId } }, members: { org: {} }, tasks: { owningOrg: {}, assignee: {} } },
          });
          const ws = res.workspaces[0];
          if (!ws) return { content: [{ type: 'text', text: 'Workspace not found or not visible to you.' }] };
          const byOrg = new Map<string, string[]>();
          for (const t of ws.tasks ?? []) {
            if (t.status === 'proposed') continue;
            if (t.status === 'done' && !include_done) continue;
            const org = t.owningOrg?.name ?? 'Unassigned';
            const bits = [
              t.status === 'done' ? '[done]' : '[ ]',
              t.title,
              t.assignee?.name ? `— ${t.assignee.name}` : '',
              fmtDate(t.dueDate) ? `(due ${fmtDate(t.dueDate)})` : '',
              `#${t.id}`,
            ].filter(Boolean);
            if (!byOrg.has(org)) byOrg.set(org, []);
            byOrg.get(org)!.push('  ' + bits.join(' '));
          }
          if (byOrg.size === 0) return { content: [{ type: 'text', text: 'Nothing on the board.' }] };
          const out = [...byOrg.entries()].map(([org, rows]) => `${org}\n${rows.join('\n')}`).join('\n\n');
          return { content: [{ type: 'text', text: out }] };
        },
      );

      server.tool(
        'create_task',
        'Add a commitment to a workspace, owned by one of its companies.',
        {
          workspaceId: z.string(),
          owningOrgId: z.string().describe('Owning company id (from list_workspaces companies)'),
          title: z.string(),
          dueDate: z.string().optional().describe('YYYY-MM-DD'),
        },
        async ({ workspaceId, owningOrgId, title, dueDate }) => {
          const taskId = id();
          try {
            await scoped.transact([
              scoped.tx.tasks[taskId]
                .update({
                  title,
                  status: 'open',
                  workspaceId,
                  createdAt: new Date(),
                  ...(dueDate ? { dueDate: new Date(dueDate + 'T12:00:00') } : {}),
                })
                .link({ workspace: workspaceId, owningOrg: owningOrgId, creator: caller.profileId }),
              scopedActivity(scoped, {
                type: 'task.created',
                workspaceId,
                actorProfileId: caller.profileId,
                taskId,
                meta: { taskTitle: title, via: 'mcp' },
              }),
            ]);
            return { content: [{ type: 'text', text: `Created "${title}" (#${taskId}).` }] };
          } catch {
            return { content: [{ type: 'text', text: "Couldn't create that — you may not have access to that company or workspace." }], isError: true };
          }
        },
      );

      server.tool(
        'complete_task',
        'Mark a task done, or reopen it.',
        {
          taskId: z.string(),
          done: z.boolean().optional().describe('true = mark done (default), false = reopen'),
        },
        async ({ taskId, done }) => {
          const isDone = done !== false;
          const cur = await scoped.query({ tasks: { $: { where: { id: taskId } } } });
          const task = cur.tasks[0];
          if (!task) return { content: [{ type: 'text', text: 'Task not found or not visible.' }] };
          try {
            await scoped.transact([
              scoped.tx.tasks[taskId].update(isDone ? { status: 'done', completedAt: new Date() } : { status: 'open', completedAt: null }),
              scopedActivity(scoped, {
                type: isDone ? 'task.completed' : 'task.reopened',
                workspaceId: task.workspaceId as string,
                actorProfileId: caller.profileId,
                taskId,
                meta: { taskTitle: task.title },
              }),
            ]);
            return { content: [{ type: 'text', text: `"${task.title}" is now ${isDone ? 'done' : 'open'}.` }] };
          } catch {
            return { content: [{ type: 'text', text: "Couldn't update that task." }], isError: true };
          }
        },
      );
    },
    { serverInfo: { name: 'crossline', version: '0.1.0' } },
    { basePath: '/api' },
  );
}
