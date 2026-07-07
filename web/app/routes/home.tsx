// The board — Crossline's one page.
// SSR: loader verifies the Better Auth session and reads the board as the user
// (admin SDK scoped via asUser, so CEL rules apply) for a no-flash first paint.
// Live: the client signs into InstantDB via the bridge token, then db.useQuery
// takes over with realtime data. Loader data is the fallback until it connects.
import { useState } from 'react';
import { redirect } from 'react-router';
import { auth } from '../lib/auth.server';
import {
  adminDb,
  ensureInstantIdentity,
  resolveCurrentWorkspace,
  sortWorkspaces,
} from '../lib/instant.server';
import { db } from '../lib/db';
import { authClient } from '../lib/auth-client';
import { useInstantSession } from '../lib/use-instant-session';
import { TopBar, OrgPills } from '../components/topbar';
import {
  boardQuery,
  shapeBoard,
  ScopeToggle,
  OrgSection,
  IngestComposer,
  EmptyBoard,
  useWeekStart,
  type BoardData,
} from '../components/board';

export function meta() {
  return [{ title: 'Crossline' }];
}

export async function loader({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) {
    // Failed magic-link verifications land on "/?error=…" — carry it to /login.
    const error = new URL(request.url).searchParams.get('error');
    throw redirect(error ? `/login?error=${encodeURIComponent(error)}` : '/login');
  }
  const email = session.user.email;

  // Signed in. Provision the Instant identity if this is a first login —
  // a missing identity/workspace is NOT a reason to bounce back to /login.
  const { instantUserId, profileId, workspaces } = await ensureInstantIdentity(
    email,
    session.user.name,
  );
  const workspaceId = resolveCurrentWorkspace(request, workspaces);

  let board: BoardData | null = null;
  if (workspaceId) {
    // Query AS the user so the CEL permission rules govern what SSR sees.
    const scoped = adminDb.asUser({ email });
    const res = await scoped.query(boardQuery(workspaceId, instantUserId));
    board = shapeBoard(res);
  }

  return {
    board,
    email,
    profileId,
    instantUserId,
    workspaces: sortWorkspaces(workspaces),
    engineUrl: process.env.ENGINE_URL ?? 'http://localhost:8787',
  };
}

// Repeat client-side navigations reuse the first result — the page's live
// InstantDB query refreshes content immediately, so the snapshot only seeds
// first paint. Identity values in it are stable for the session. Keyed by the
// current-workspace cookie so switching workspaces doesn't serve a stale board.
let homeCache: { key: string; data: Awaited<ReturnType<typeof loader>> } | undefined;
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<Awaited<ReturnType<typeof loader>>> }) {
  const key = document.cookie.match(/(?:^|; )crossline_ws=([^;]+)/)?.[1] ?? 'default';
  if (homeCache?.key !== key) homeCache = { key, data: await serverLoader() };
  return homeCache.data;
}
clientLoader.hydrate = false as const;

export default function Home({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { board: ssrBoard, email, profileId, instantUserId, engineUrl, workspaces } = loaderData;
  const instantUser = useInstantSession();
  const weekStart = useWeekStart();
  const [scope, setScope] = useState<'mine' | 'all'>('all');
  const [composing, setComposing] = useState(false);

  // Live subscription once the browser session exists; SSR data until then.
  const workspaceId = ssrBoard?.workspaceId ?? null;
  const live = db.useQuery(
    instantUser && workspaceId ? boardQuery(workspaceId, instantUserId) : null,
  );
  const board = (live.data ? shapeBoard(live.data) : null) ?? ssrBoard;

  if (!board) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 text-center">
        <h1 className="text-[length:var(--text-page)] font-semibold">No workspace yet</h1>
        <p className="mt-2 text-[length:var(--text-body)] text-ink-muted">
          You're signed in as <span className="font-medium text-ink">{email}</span>. Start a
          partnership of your own, or ask whoever set one up to add you.
        </p>
        <a
          href="/workspaces/new"
          className="mt-6 rounded-full bg-action px-5 py-2.5 text-[length:var(--text-body)] font-medium text-ink-inverse transition-colors hover:bg-action-hover"
        >
          Create a workspace
        </a>
        <button
          type="button"
          onClick={() => authClient.signOut().then(() => (window.location.href = '/login'))}
          className="mt-4 text-[length:var(--text-meta)] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          Use a different email
        </button>
      </main>
    );
  }

  const myOrg = board.orgs.find((o) => board.myOrgIds.includes(o.id));
  const visibleOrgs =
    scope === 'mine' && myOrg ? board.orgs.filter((o) => board.myOrgIds.includes(o.id)) : board.orgs;
  const tasksByOrg = (orgId: string) =>
    board.tasks
      .filter((t) => t.owningOrgId === orgId)
      .sort((a, b) => {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return ad - bd;
      });

  return (
    <>
      <TopBar
        workspaceId={board.workspaceId}
        workspaceName={board.workspaceName}
        orgs={board.orgs}
        profileId={profileId}
        email={email}
        workspaces={workspaces}
      />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-7">
        <OrgPills orgs={board.orgs} />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[length:var(--text-page)] font-semibold">This week</h1>
          {!composing && (
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="rounded-full bg-action px-4 py-2 text-[length:var(--text-body)] font-medium text-ink-inverse transition-colors duration-150 hover:bg-action-hover"
            >
              Add meeting notes
            </button>
          )}
        </div>

        <div className="mt-5">
          <ScopeToggle scope={scope} onChange={setScope} myOrgName={myOrg?.name} />
        </div>

      {composing && (
        <IngestComposer
          board={board}
          engineUrl={engineUrl}
          profileId={profileId}
          onClose={() => setComposing(false)}
        />
      )}

        {board.tasks.length === 0 && !composing ? (
          <EmptyBoard onAdd={() => setComposing(true)} />
        ) : (
          // Keyed by scope so switching My company ↔ Everyone re-enters gently.
          <div key={scope} className="fade-rise">
            {visibleOrgs.map((org) => (
              <OrgSection
                key={org.id}
                org={org}
                tasks={tasksByOrg(org.id)}
                weekStart={weekStart}
                workspaceId={board.workspaceId}
                profileId={profileId}
                isMyOrg={board.myOrgIds.includes(org.id)}
                people={board.people}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
