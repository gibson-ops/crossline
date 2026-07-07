// Crossline — InstantDB schema (the shared source of truth for app data).
//
// Tenancy model:
//   • orgs are GLOBAL company identities (one "Target River", not one per partnership).
//   • a workspace is a partnership, jointly + EQUALLY owned by its member orgs.
//   • person ↔ org is many-to-many (orgMembers) — a person can represent several companies.
//   • org ↔ workspace is many-to-many (workspaceMembers) — a company can be in many partnerships.
//   • a person's workspace access = the workspaces their orgs belong to. Resolving that
//     live is a 2-hop graph walk, so we keep a DENORMALIZED profiles↔workspaces link as a
//     fast cache that the CEL permission rules read (kept in sync when memberships change).
//   • every tenant-scoped record also carries a `workspaceId` string for cheap rule checks.
//
// Secrets (channel OAuth tokens) do NOT live here — they stay in the engine's secure store.

import { i } from '@instantdb/core';

const _schema = i.schema({
  entities: {
    // --- system entities (InstantDB built-ins; declared verbatim per `instant-cli pull`) —
    // the schema file must include these for links that reference them to validate.
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $streams: i.entity({
      abortReason: i.string().optional(),
      clientId: i.string().unique().indexed(),
      done: i.boolean().optional(),
      size: i.number().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),

    // --- identity -------------------------------------------------------------
    // One profile per person (linked to the built-in $users). Auth itself lives in
    // Better Auth / Neon; this is the app-side identity everything links to.
    profiles: i.entity({
      name: i.string(),
      avatarUrl: i.string().optional(),
      createdAt: i.date().indexed(),
    }),

    // --- tenancy --------------------------------------------------------------
    orgs: i.entity({
      name: i.string(),
      slug: i.string().unique().optional(), // normalized handle; helps dedupe
      brandColor: i.string().optional(),
      createdAt: i.date().indexed(),
    }),
    workspaces: i.entity({
      name: i.string(),
      createdAt: i.date().indexed(),
    }),
    // person ↔ org  (a person's membership in a company)
    orgMembers: i.entity({
      role: i.string(), // 'admin' | 'member'  (all-equal in v0)
      title: i.string().optional(),
      joinedAt: i.date().indexed(),
    }),
    // org ↔ workspace  (a company's seat in a partnership) — equal ownership, no privileged creator
    workspaceMembers: i.entity({
      role: i.string(), // 'admin' | 'member'  (all-equal in v0)
      status: i.string(), // 'active' | 'pending'  (a pending seat = an unclaimed org slot)
      joinedAt: i.date().indexed(),
    }),
    // org-slot invitations: created against a specific (workspace, org) so every invitee
    // to a company joins the SAME org record — no create-your-own-org race.
    invitations: i.entity({
      email: i.string().indexed(),
      token: i.string().unique().indexed(),
      status: i.string(), // 'pending' | 'accepted' | 'revoked'
      createdAt: i.date().indexed(),
    }),

    // --- coordination data ----------------------------------------------------
    meetings: i.entity({
      title: i.string().optional(),
      meetingDate: i.date().indexed(),
      rawTranscript: i.string(),
      source: i.string(), // 'paste' | 'upload'
      status: i.string(), // 'proposed' | 'confirmed'
      workspaceId: i.string().indexed(),
      createdAt: i.date().indexed(),
      // null/'workspace' = all partner orgs · 'org' = uploader's org · 'private' = uploader only
      visibility: i.string().indexed().optional(),
    }),
    // "commitments" — the owned, tracked action items.
    tasks: i.entity({
      title: i.string(),
      notes: i.string().optional(),
      status: i.string().indexed(), // 'proposed' | 'open' | 'in_progress' | 'done'
      dueDate: i.date().indexed().optional(),
      completedAt: i.date().optional(),
      sourceQuote: i.string().optional(), // provenance from the transcript
      confidence: i.number().optional(), // AI extraction confidence 0..1
      workspaceId: i.string().indexed(),
      createdAt: i.date().indexed(),
      // null/'workspace' = all partner orgs · 'org' = owning org only · 'private' = creator only
      visibility: i.string().indexed().optional(),
    }),
    projects: i.entity({
      name: i.string(),
      workspaceId: i.string().indexed(),
      createdAt: i.date().indexed(),
    }),
    folders: i.entity({
      name: i.string(),
      workspaceId: i.string().indexed(),
      createdAt: i.date().indexed(),
    }),

    // --- channels (delivery config; secrets live in the engine) --------------
    contactPoints: i.entity({
      type: i.string(), // 'email' | 'sms' | 'slack'
      value: i.string(), // address / number / slack user id
      verified: i.boolean(),
    }),
    channelConfigs: i.entity({
      type: i.string(), // 'email' | 'sms' | 'slack' | 'clickup' | ...
      enabled: i.boolean(),
      destination: i.string().optional(), // NON-secret target (slack channel id, digest email, clickup list id)
      settings: i.json().optional(),
      workspaceId: i.string().indexed(),
    }),
    notificationPrefs: i.entity({
      cadence: i.string(), // 'instant' | 'digest'
      quietHours: i.json().optional(),
      workspaceId: i.string().indexed().optional(),
    }),

    // --- audit log (append-only; who did what, when) --------------------------
    activities: i.entity({
      type: i.string().indexed(), // 'task.completed' | 'task.reopened' | 'task.created' | 'task.edited' | 'task.deleted' | 'meeting.ingested' | 'file.uploaded' | 'folder.created'
      workspaceId: i.string().indexed(),
      createdAt: i.date().indexed(),
      meta: i.json().optional(), // snapshot for readability (e.g. { taskTitle }) — survives renames/deletes
      // mirrors the subject's visibility so scoped titles don't leak via the log
      visibility: i.string().indexed().optional(),
    }),
  },

  links: {
    // system links (InstantDB built-ins; verbatim from `instant-cli pull`) ------
    $streams$files: {
      forward: { on: '$streams', has: 'many', label: '$files' },
      reverse: { on: '$files', has: 'one', label: '$stream', onDelete: 'cascade' },
    },
    $usersLinkedPrimaryUser: {
      forward: { on: '$users', has: 'one', label: 'linkedPrimaryUser', onDelete: 'cascade' },
      reverse: { on: '$users', has: 'many', label: 'linkedGuestUsers' },
    },

    // identity ---------------------------------------------------------------
    profileUser: {
      forward: { on: 'profiles', has: 'one', label: '$user' },
      reverse: { on: '$users', has: 'one', label: 'profile' },
    },

    // person ↔ org -----------------------------------------------------------
    orgMemberProfile: {
      forward: { on: 'orgMembers', has: 'one', label: 'profile' },
      reverse: { on: 'profiles', has: 'many', label: 'orgMemberships' },
    },
    orgMemberOrg: {
      forward: { on: 'orgMembers', has: 'one', label: 'org' },
      reverse: { on: 'orgs', has: 'many', label: 'members' },
    },

    // org ↔ workspace --------------------------------------------------------
    workspaceMemberOrg: {
      forward: { on: 'workspaceMembers', has: 'one', label: 'org' },
      reverse: { on: 'orgs', has: 'many', label: 'workspaceMemberships' },
    },
    workspaceMemberWorkspace: {
      forward: { on: 'workspaceMembers', has: 'one', label: 'workspace' },
      reverse: { on: 'workspaces', has: 'many', label: 'members' },
    },

    // denormalized access cache: which workspaces a person can see.
    // Read by the permission rules; refreshed when orgMembers / workspaceMembers change.
    profileWorkspaces: {
      forward: { on: 'profiles', has: 'many', label: 'workspaces' },
      reverse: { on: 'workspaces', has: 'many', label: 'memberProfiles' },
    },

    // invitations ------------------------------------------------------------
    invitationWorkspace: {
      forward: { on: 'invitations', has: 'one', label: 'workspace' },
      reverse: { on: 'workspaces', has: 'many', label: 'invitations' },
    },
    invitationOrg: {
      forward: { on: 'invitations', has: 'one', label: 'org' },
      reverse: { on: 'orgs', has: 'many', label: 'invitations' },
    },

    // meetings ---------------------------------------------------------------
    meetingWorkspace: {
      forward: { on: 'meetings', has: 'one', label: 'workspace' },
      reverse: { on: 'workspaces', has: 'many', label: 'meetings' },
    },
    meetingUploader: {
      forward: { on: 'meetings', has: 'one', label: 'uploader' },
      reverse: { on: 'profiles', has: 'many', label: 'uploadedMeetings' },
    },

    // tasks (commitments) ----------------------------------------------------
    taskWorkspace: {
      forward: { on: 'tasks', has: 'one', label: 'workspace' },
      reverse: { on: 'workspaces', has: 'many', label: 'tasks' },
    },
    taskOwningOrg: {
      forward: { on: 'tasks', has: 'one', label: 'owningOrg' },
      reverse: { on: 'orgs', has: 'many', label: 'ownedTasks' },
    },
    taskAssignee: {
      forward: { on: 'tasks', has: 'one', label: 'assignee' },
      reverse: { on: 'profiles', has: 'many', label: 'assignedTasks' },
    },
    taskSourceMeeting: {
      forward: { on: 'tasks', has: 'one', label: 'sourceMeeting' },
      reverse: { on: 'meetings', has: 'many', label: 'tasks' },
    },
    taskProject: {
      forward: { on: 'tasks', has: 'one', label: 'project' },
      reverse: { on: 'projects', has: 'many', label: 'tasks' },
    },

    // projects ---------------------------------------------------------------
    projectWorkspace: {
      forward: { on: 'projects', has: 'one', label: 'workspace' },
      reverse: { on: 'workspaces', has: 'many', label: 'projects' },
    },
    projectOwningOrg: {
      forward: { on: 'projects', has: 'one', label: 'owningOrg' },
      reverse: { on: 'orgs', has: 'many', label: 'ownedProjects' },
    },

    // folders + files --------------------------------------------------------
    folderWorkspace: {
      forward: { on: 'folders', has: 'one', label: 'workspace' },
      reverse: { on: 'workspaces', has: 'many', label: 'folders' },
    },
    folderOrg: {
      forward: { on: 'folders', has: 'one', label: 'org' },
      reverse: { on: 'orgs', has: 'many', label: 'folders' },
    },
    fileFolder: {
      forward: { on: 'folders', has: 'many', label: 'files' },
      reverse: { on: '$files', has: 'one', label: 'folder' },
    },

    // channels ---------------------------------------------------------------
    contactPointProfile: {
      forward: { on: 'contactPoints', has: 'one', label: 'profile' },
      reverse: { on: 'profiles', has: 'many', label: 'contactPoints' },
    },
    channelConfigOrg: {
      forward: { on: 'channelConfigs', has: 'one', label: 'org' },
      reverse: { on: 'orgs', has: 'many', label: 'channelConfigs' },
    },
    channelConfigWorkspace: {
      forward: { on: 'channelConfigs', has: 'one', label: 'workspace' },
      reverse: { on: 'workspaces', has: 'many', label: 'channelConfigs' },
    },
    notificationPrefProfile: {
      forward: { on: 'notificationPrefs', has: 'one', label: 'profile' },
      reverse: { on: 'profiles', has: 'many', label: 'notificationPrefs' },
    },

    taskCreator: {
      forward: { on: 'tasks', has: 'one', label: 'creator' },
      reverse: { on: 'profiles', has: 'many', label: 'createdTasks' },
    },

    // audit log ----------------------------------------------------------------
    activityActor: {
      forward: { on: 'activities', has: 'one', label: 'actor' },
      reverse: { on: 'profiles', has: 'many', label: 'activities' },
    },
    activityWorkspace: {
      forward: { on: 'activities', has: 'one', label: 'workspace' },
      reverse: { on: 'workspaces', has: 'many', label: 'activities' },
    },
    activityTask: {
      forward: { on: 'activities', has: 'one', label: 'task' },
      reverse: { on: 'tasks', has: 'many', label: 'activities' },
    },
  },
});

// Typed export (per InstantDB's convention).
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
