// The app chrome: Crossline mark + workspace identity on the left, navigation
// and the user menu on the right. Standard on purpose — people know where to
// look for who-am-I and sign-out.
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { db } from '../lib/db';
import { activityOp } from '../lib/activity';
import { authClient } from '../lib/auth-client';
import { toast } from '../lib/toast';
import type { BoardOrg } from './board';

export type WorkspaceRef = { id: string; name: string };

/** Switch the active workspace: set the preference cookie, hard-reload home. */
function switchWorkspace(id: string) {
  document.cookie = `crossline_ws=${id}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.location.href = '/'; // full reload bypasses the clientLoader snapshot cache
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 10 6" className="h-1.5 w-2.5" fill="none" aria-hidden>
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrosslineMark() {
  return (
    <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden>
      <rect width="64" height="64" rx="14" fill="var(--action)" />
      <path d="M16 44 L48 20" stroke="var(--ink-inverse)" strokeWidth="7" strokeLinecap="round" />
      <path d="M16 20 L48 44" stroke="oklch(0.72 0.11 70)" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

/** Workspace name with the member-org dots. Click to rename; when the user
 *  belongs to more than one workspace, a caret opens the switcher. */
function WorkspaceIdentity(props: {
  workspaceId: string;
  workspaceName: string;
  orgs: BoardOrg[];
  profileId: string | null;
  workspaces: WorkspaceRef[];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(props.workspaceName);
  const others = props.workspaces.filter((w) => w.id !== props.workspaceId);

  function save() {
    const newName = name.trim();
    setEditing(false);
    if (!newName || newName === props.workspaceName) {
      setName(props.workspaceName);
      return;
    }
    db.transact(
      props.profileId
        ? [
            db.tx.workspaces[props.workspaceId].update({ name: newName }),
            activityOp({
              type: 'workspace.renamed',
              workspaceId: props.workspaceId,
              actorProfileId: props.profileId,
              meta: { from: props.workspaceName, to: newName },
            }),
          ]
        : [db.tx.workspaces[props.workspaceId].update({ name: newName })],
    ).catch(() => {
      setName(props.workspaceName);
      toast("Couldn't rename the workspace — try again");
    });
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 gap-1" aria-hidden>
        {props.orgs.map((o) => (
          <span
            key={o.id}
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: o.brandColor ?? 'var(--ink-faint)' }}
          />
        ))}
      </span>
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') {
              setName(props.workspaceName);
              setEditing(false);
            }
          }}
          aria-label="Workspace name"
          className="w-56 rounded-md border border-line bg-raised px-1.5 py-0.5 text-[length:var(--text-meta)] font-medium text-ink focus:outline-none"
        />
      ) : (
        <span className="hidden items-center sm:flex">
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Rename workspace"
            className="truncate text-[length:var(--text-meta)] font-medium text-ink transition-colors hover:text-ink-muted"
          >
            {props.workspaceName}
          </button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              aria-label="Switch or create workspace"
              className="ml-1 flex h-5 w-5 items-center justify-center rounded text-ink-faint transition-colors hover:bg-sunken hover:text-ink"
            >
              <ChevronDown />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={6}
                className="z-50 min-w-56 rounded-xl border border-line bg-raised p-1 shadow-lg"
              >
                {others.length > 0 && (
                  <>
                    <div className="px-2.5 py-1 text-[length:var(--text-meta)] text-ink-faint">
                      Switch workspace
                    </div>
                    {others.map((w) => (
                      <DropdownMenu.Item
                        key={w.id}
                        onSelect={() => switchWorkspace(w.id)}
                        className="cursor-pointer truncate rounded-lg px-2.5 py-1.5 text-[length:var(--text-meta)] text-ink outline-none data-[highlighted]:bg-sunken"
                      >
                        {w.name}
                      </DropdownMenu.Item>
                    ))}
                    <DropdownMenu.Separator className="my-1 h-px bg-line" />
                  </>
                )}
                <DropdownMenu.Item asChild>
                  <Link
                    to="/workspaces/new"
                    className="block cursor-pointer rounded-lg px-2.5 py-1.5 text-[length:var(--text-meta)] font-medium text-ink outline-none data-[highlighted]:bg-sunken"
                  >
                    + New workspace
                  </Link>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </span>
      )}
    </span>
  );
}

export function TopBar(props: {
  workspaceId?: string;
  workspaceName?: string;
  orgs?: BoardOrg[];
  profileId?: string | null;
  email: string;
  workspaces?: WorkspaceRef[];
}) {
  const { pathname } = useLocation();
  const initial = (props.email[0] ?? '?').toUpperCase();

  const navLink = (to: string, label: string) => (
    <Link
      to={to}
      className={
        'whitespace-nowrap rounded-full px-3 py-1 text-[length:var(--text-meta)] font-medium transition-colors ' +
        (pathname === to ? 'bg-sunken text-ink' : 'text-ink-muted hover:text-ink')
      }
      prefetch="intent"
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-raised">
      <div className="mx-auto flex h-12 max-w-4xl items-center gap-3 px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Crossline home">
          <CrosslineMark />
          <span className="text-[length:var(--text-body)] font-semibold tracking-tight">
            Crossline
          </span>
        </Link>
        {props.workspaceId && props.workspaceName && (
          <>
            <span className="h-4 w-px shrink-0 bg-line" aria-hidden />
            <WorkspaceIdentity
              workspaceId={props.workspaceId}
              workspaceName={props.workspaceName}
              orgs={props.orgs ?? []}
              profileId={props.profileId ?? null}
              workspaces={props.workspaces ?? [{ id: props.workspaceId, name: props.workspaceName }]}
            />
          </>
        )}
        <nav className="ml-auto flex items-center gap-1">
          {navLink('/', 'This week')}
          {navLink('/files', 'Files')}
        </nav>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger
            aria-label="Account menu"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-sunken text-[length:var(--text-meta)] font-semibold text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            {initial}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-52 rounded-xl border border-line bg-raised p-1 shadow-lg"
            >
              <div className="px-2.5 py-1.5 text-[length:var(--text-meta)] text-ink-faint">
                Signed in as
                <div className="truncate font-medium text-ink">{props.email}</div>
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-line" />
              <DropdownMenu.Item
                onSelect={() => authClient.signOut().then(() => (window.location.href = '/login'))}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[length:var(--text-meta)] font-medium text-ink outline-none data-[highlighted]:bg-sunken"
              >
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

/** The participating partners, each with real presence — echoes the section dots. */
export function OrgPills({ orgs }: { orgs: BoardOrg[] }) {
  if (orgs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {orgs.map((o) => (
        <span
          key={o.id}
          className="inline-flex items-center gap-2 rounded-full bg-sunken px-3 py-1 text-[length:var(--text-meta)] text-ink-muted"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: o.brandColor ?? 'var(--ink-faint)' }}
            aria-hidden
          />
          {o.name}
        </span>
      ))}
    </div>
  );
}
