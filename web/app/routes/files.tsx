// Files — the partnership's shared folder space. Same page language as the
// board: folders as sections, files as rows, no chrome.
import { useRef, useState } from 'react';
import { redirect } from 'react-router';
import { id } from '@instantdb/react';
import { auth } from '../lib/auth.server';
import {
  adminDb,
  ensureInstantIdentity,
  resolveCurrentWorkspace,
  sortWorkspaces,
} from '../lib/instant.server';
import { TopBar } from '../components/topbar';
import { db } from '../lib/db';
import { activityOp } from '../lib/activity';
import { useInstantSession } from '../lib/use-instant-session';

export function meta() {
  return [{ title: 'Files — Crossline' }];
}

export async function loader({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) throw redirect('/login');
  const { profileId, workspaces } = await ensureInstantIdentity(
    session.user.email,
    session.user.name,
  );
  const workspaceId = resolveCurrentWorkspace(request, workspaces);
  if (!workspaceId) throw redirect('/'); // home shows the "no workspace yet" screen
  const ws = workspaces.find((w) => w.id === workspaceId)!;
  const orgsRes = await adminDb.query({
    workspaces: { $: { where: { id: ws.id } }, members: { org: {} } },
  });
  const orgs = (orgsRes.workspaces[0]?.members ?? [])
    .map((m) => m.org)
    .filter((o): o is NonNullable<typeof o> => Boolean(o))
    .map((o) => ({ id: o.id, name: o.name, brandColor: o.brandColor ?? null }));
  return {
    workspaceId: ws.id,
    workspaceName: ws.name,
    profileId,
    email: session.user.email,
    orgs,
    workspaces: sortWorkspaces(workspaces),
  };
}

// Same session-stable snapshot caching as the board — repeat navs are instant;
// the live folders query owns freshness.
let filesCache: Awaited<ReturnType<typeof loader>> | undefined;
export async function clientLoader({ serverLoader }: { serverLoader: () => Promise<Awaited<ReturnType<typeof loader>>> }) {
  filesCache ??= await serverLoader();
  return filesCache;
}
clientLoader.hydrate = false as const;

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function FolderSection(props: {
  folder: { id: string; name: string };
  files: { id: string; path: string; url?: string | null }[];
  workspaceId: string;
  profileId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `${props.workspaceId}/${props.folder.id}/${file.name}`;
      const { data } = await db.storage.uploadFile(path, file);
      await db.transact([
        db.tx.folders[props.folder.id].link({ files: data.id }),
        activityOp({
          type: 'file.uploaded',
          workspaceId: props.workspaceId,
          actorProfileId: props.profileId,
          meta: { fileName: file.name, folderName: props.folder.name },
        }),
      ]);
    } catch (err) {
      console.error('upload failed:', err);
      alert("That upload didn't go through — try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const nameOf = (path: string) => path.split('/').pop() ?? path;

  return (
    <section className="mt-10 first:mt-6">
      <header className="flex items-baseline gap-2.5">
        <h2 className="text-[length:var(--text-title)] font-semibold text-ink">{props.folder.name}</h2>
        <span className="text-[length:var(--text-meta)] tabular-nums text-ink-faint">
          {props.files.length || 'empty'}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="ml-auto rounded-full px-3 py-1 text-[length:var(--text-meta)] font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Add file'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
      </header>
      {props.files.length === 0 ? (
        <p className="mt-3 border-t border-line pt-3.5 text-[length:var(--text-meta)] text-ink-faint">
          Nothing here yet.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line border-t border-line">
          {props.files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1 truncate text-[length:var(--text-body)] text-ink">
                {nameOf(f.path)}
              </span>
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[length:var(--text-meta)] font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  Download
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Files({ loaderData }: { loaderData: Awaited<ReturnType<typeof loader>> }) {
  const { workspaceId, workspaceName, profileId, email, orgs, workspaces } = loaderData;
  const instantUser = useInstantSession();
  const [newFolder, setNewFolder] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);

  const { data } = db.useQuery(
    instantUser
      ? { folders: { $: { where: { workspaceId } }, files: {} } }
      : null,
  );
  const folders = data?.folders ?? [];

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolder.trim();
    if (!name) return;
    await db.transact([
      db.tx.folders[id()]
        .update({ name, workspaceId, createdAt: new Date() })
        .link({ workspace: workspaceId }),
      activityOp({
        type: 'folder.created',
        workspaceId,
        actorProfileId: profileId,
        meta: { folderName: name },
      }),
    ]);
    setNewFolder('');
    setAddingFolder(false);
  }

  return (
    <>
      <TopBar
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        orgs={orgs}
        profileId={profileId}
        email={email}
        workspaces={workspaces}
      />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-7">
        <h1 className="text-[length:var(--text-page)] font-semibold">Files</h1>

      {!instantUser ? (
        <p className="mt-10 text-[length:var(--text-meta)] text-ink-faint">Loading…</p>
      ) : (
        <>
          {folders.map((f) => (
            <FolderSection
              key={f.id}
              folder={f}
              files={(f.files ?? []) as { id: string; path: string; url?: string | null }[]}
              workspaceId={workspaceId}
              profileId={profileId}
            />
          ))}
          <div className="mt-10">
            {addingFolder ? (
              <form onSubmit={createFolder} className="flex items-center gap-2.5">
                <input
                  autoFocus
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="Folder name"
                  className="rounded-[length:var(--radius-field)] border border-line bg-transparent px-3 py-1.5 text-[length:var(--text-body)] placeholder:text-ink-faint focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-full bg-action px-4 py-1.5 text-[length:var(--text-meta)] font-medium text-ink-inverse hover:bg-action-hover"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setAddingFolder(false)}
                  className="text-[length:var(--text-meta)] font-medium text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setAddingFolder(true)}
                className="text-[length:var(--text-meta)] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                + New folder
              </button>
            )}
          </div>
        </>
      )}
      </main>
    </>
  );
}
