// Audit-log writes. Include the returned op in the SAME db.transact() as the
// mutation it describes — the log entry and the change land atomically.
// CEL enforces append-only + actor-is-self; there's no UI for these yet.
import { id } from '@instantdb/react';
import { db } from './db';

export type ActivityType =
  | 'task.completed'
  | 'task.reopened'
  | 'task.created'
  | 'task.edited'
  | 'task.deleted'
  | 'meeting.ingested'
  | 'file.uploaded'
  | 'folder.created'
  | 'workspace.renamed';

export function activityOp(args: {
  type: ActivityType;
  workspaceId: string;
  actorProfileId: string;
  taskId?: string;
  meta?: Record<string, unknown>;
  /** mirror the subject's visibility so scoped titles don't leak via the log */
  visibility?: string | null;
}) {
  return db.tx.activities[id()]
    .update({
      type: args.type,
      workspaceId: args.workspaceId,
      createdAt: new Date(),
      ...(args.meta ? { meta: args.meta } : {}),
      ...(args.visibility && args.visibility !== 'workspace' ? { visibility: args.visibility } : {}),
    })
    .link({
      workspace: args.workspaceId,
      actor: args.actorProfileId,
      ...(args.taskId ? { task: args.taskId } : {}),
    });
}
