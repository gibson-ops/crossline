// Crossline — InstantDB permission rules (CEL).
//
// Security model:
//   • The boundary is the VERIFIED AUTH SESSION (auth.id), never client-supplied params.
//   • Workspace-scoped records are gated by the denormalized profile→workspaces cache:
//       data.workspaceId in auth.ref('$user.profile.workspaces.id')
//     The cache is maintained server-side (RR8 identity server / engine, as admin) whenever
//     orgMembers / workspaceMembers change. Admin SDK writes bypass these rules.
//   • Transparency-first within a partnership: every member org's people can view AND edit
//     everything in the workspace (owningOrg is an accountability label, not a lock).
//   • Privileged joins (orgMembers, workspaceMembers, invitations) are server-only writes —
//     clients can read what they need for the UI but cannot forge membership.
//   • `attrs` create is denied: clients can't invent new attribute types (schema drift).
//
// TODO(post-v1): tighten $files (enforce folder/workspace scoping on upload paths); store
// invitation token hashes instead of raw tokens.

import type { InstantRules } from '@instantdb/core';

const rules = {
  attrs: {
    allow: {
      create: 'false',
    },
  },

  $users: {
    allow: {
      view: 'auth.id == data.id',
      create: 'false',
      update: 'false',
      delete: 'false',
    },
  },

  // v1: authenticated users can manage files; workspace-scoped tightening is a TODO.
  $files: {
    allow: {
      view: 'auth.id != null',
      create: 'auth.id != null',
      delete: 'auth.id != null',
    },
  },

  // --- identity ---------------------------------------------------------------
  profiles: {
    bind: [
      'isSelf',
      "auth.id in data.ref('$user.id')",
      'sharesWorkspace',
      "auth.id in data.ref('workspaces.memberProfiles.$user.id')",
    ],
    allow: {
      view: 'isSelf || sharesWorkspace',
      create: 'false', // created by the identity server on first sign-in
      update: 'isSelf',
      delete: 'false',
    },
  },

  contactPoints: {
    bind: ['isOwner', "auth.id in data.ref('profile.$user.id')"],
    allow: {
      view: 'isOwner',
      create: 'auth.id != null',
      update: 'isOwner',
      delete: 'isOwner',
    },
  },

  notificationPrefs: {
    bind: ['isOwner', "auth.id in data.ref('profile.$user.id')"],
    allow: {
      view: 'isOwner',
      create: 'auth.id != null',
      update: 'isOwner',
      delete: 'isOwner',
    },
  },

  // --- tenancy ----------------------------------------------------------------
  orgs: {
    bind: [
      'isOrgMember',
      "auth.id in data.ref('members.profile.$user.id')",
      'sharesWorkspaceWithOrg',
      "auth.id in data.ref('workspaceMemberships.workspace.memberProfiles.$user.id')",
    ],
    allow: {
      view: 'isOrgMember || sharesWorkspaceWithOrg',
      create: 'auth.id != null',
      update: 'isOrgMember',
      delete: 'false',
    },
  },

  workspaces: {
    bind: ['isMember', "auth.id in data.ref('memberProfiles.$user.id')"],
    allow: {
      view: 'isMember',
      create: 'auth.id != null',
      update: 'isMember', // all member orgs equal (v0)
      delete: 'false', // archive later; no client deletes
    },
  },

  // person↔org join — server-only writes.
  orgMembers: {
    bind: [
      'isSelf',
      "auth.id in data.ref('profile.$user.id')",
      'isSameOrg',
      "auth.id in data.ref('org.members.profile.$user.id')",
      'sharesWorkspaceWithOrg',
      "auth.id in data.ref('org.workspaceMemberships.workspace.memberProfiles.$user.id')",
    ],
    allow: {
      view: 'isSelf || isSameOrg || sharesWorkspaceWithOrg',
      create: 'false',
      update: 'false',
      delete: 'false',
    },
  },

  // org↔workspace join — server-only writes.
  workspaceMembers: {
    bind: ['isWorkspaceMember', "auth.id in data.ref('workspace.memberProfiles.$user.id')"],
    allow: {
      view: 'isWorkspaceMember',
      create: 'false',
      update: 'false',
      delete: 'false',
    },
  },

  // org-slot invites — created/accepted via the identity server only.
  invitations: {
    bind: ['isWorkspaceMember', "auth.id in data.ref('workspace.memberProfiles.$user.id')"],
    allow: {
      view: 'isWorkspaceMember',
      create: 'false',
      update: 'false',
      delete: 'false',
    },
  },

  // --- coordination data (workspace-scoped, transparency-first) ---------------
  // Visibility scoping: null/'workspace' = every partner org; 'org' = only the
  // owning org's people (meetings: the uploader's org); 'private' = only the
  // creator/uploader. The SAME expression gates create — which doubles as the
  // forgery guard: you cannot create a scoped record you couldn't see (e.g. an
  // org-scoped task owned by an org you're not in).
  meetings: {
    bind: [
      'inWorkspace',
      "data.workspaceId in auth.ref('$user.profile.workspaces.id')",
      'isOpen',
      "data.visibility == null || data.visibility == 'workspace'",
      'inUploaderOrg',
      "auth.id in data.ref('uploader.orgMemberships.org.members.profile.$user.id')",
      'isUploader',
      "auth.id in data.ref('uploader.$user.id')",
      'canSee',
      "inWorkspace && (isOpen || (data.visibility == 'org' && inUploaderOrg) || (data.visibility == 'private' && isUploader))",
    ],
    allow: {
      view: 'canSee',
      create: 'canSee',
      update: 'canSee',
      delete: 'canSee',
    },
  },

  tasks: {
    bind: [
      'inWorkspace',
      "data.workspaceId in auth.ref('$user.profile.workspaces.id')",
      'isOpen',
      "data.visibility == null || data.visibility == 'workspace'",
      'inOwningOrg',
      "auth.id in data.ref('owningOrg.members.profile.$user.id')",
      'isCreator',
      "auth.id in data.ref('creator.$user.id')",
      'canSee',
      "inWorkspace && (isOpen || (data.visibility == 'org' && inOwningOrg) || (data.visibility == 'private' && isCreator))",
    ],
    allow: {
      view: 'canSee',
      create: 'canSee',
      update: 'canSee',
      delete: 'canSee',
    },
  },

  projects: {
    bind: ['inWorkspace', "data.workspaceId in auth.ref('$user.profile.workspaces.id')"],
    allow: {
      view: 'inWorkspace',
      create: 'inWorkspace',
      update: 'inWorkspace',
      delete: 'inWorkspace',
    },
  },

  folders: {
    bind: ['inWorkspace', "data.workspaceId in auth.ref('$user.profile.workspaces.id')"],
    allow: {
      view: 'inWorkspace',
      create: 'inWorkspace',
      update: 'inWorkspace',
      delete: 'inWorkspace',
    },
  },

  channelConfigs: {
    bind: ['inWorkspace', "data.workspaceId in auth.ref('$user.profile.workspaces.id')"],
    allow: {
      view: 'inWorkspace',
      create: 'inWorkspace',
      update: 'inWorkspace',
      delete: 'inWorkspace',
    },
  },

  // --- audit log (append-only, immutable — even workspace members can't edit it)
  // Entries mirror their subject's visibility so scoped titles don't leak here.
  activities: {
    bind: [
      'inWorkspace',
      "data.workspaceId in auth.ref('$user.profile.workspaces.id')",
      'actorIsSelf',
      "auth.id in data.ref('actor.$user.id')",
      'isOpen',
      "data.visibility == null || data.visibility == 'workspace'",
      'inActorOrg',
      "auth.id in data.ref('actor.orgMemberships.org.members.profile.$user.id')",
    ],
    allow: {
      view: "inWorkspace && (isOpen || (data.visibility == 'org' && inActorOrg) || (data.visibility == 'private' && actorIsSelf))",
      create: 'inWorkspace && actorIsSelf', // can't log as someone else
      update: 'false',
      delete: 'false',
    },
  },
} satisfies InstantRules;

export default rules;
