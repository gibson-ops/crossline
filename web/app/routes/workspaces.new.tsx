// Create a new workspace (partnership). A focused full-page form — name the
// partnership, list the partner orgs, mark which one is yours. The privileged
// writes happen server-side; on success we set the current-workspace cookie
// and land on the fresh board.
import { useState } from 'react';
import { redirect, useNavigation, useSubmit, Link } from 'react-router';
import { auth } from '../lib/auth.server';
import {
  ensureInstantIdentity,
  createWorkspace,
  CURRENT_WS_COOKIE,
  type NewWorkspaceInput,
} from '../lib/instant.server';

export function meta() {
  return [{ title: 'New workspace — Crossline' }];
}

export async function loader({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) throw redirect('/login');
  return { email: session.user.email };
}

export async function action({ request }: { request: Request }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.email) throw redirect('/login');
  const { profileId } = await ensureInstantIdentity(session.user.email, session.user.name);

  const form = await request.formData();
  const name = String(form.get('name') ?? '');
  const orgNames = form.getAll('orgName').map(String);
  const mineIndex = Number(form.get('mine') ?? -1);
  const orgs = orgNames
    .map((n, i) => ({ name: n, mine: i === mineIndex }))
    .filter((o) => o.name.trim());

  try {
    const wsId = await createWorkspace(profileId, { name, orgs } as NewWorkspaceInput);
    return redirect('/', {
      headers: {
        'Set-Cookie': `${CURRENT_WS_COOKIE}=${wsId}; Path=/; Max-Age=31536000; SameSite=Lax`,
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not create the workspace.' };
  }
}

export default function NewWorkspace({
  actionData,
}: {
  actionData?: { error?: string };
}) {
  const submit = useSubmit();
  const nav = useNavigation();
  const busy = nav.state !== 'idle';
  const [orgs, setOrgs] = useState<string[]>(['', '']);
  const [mine, setMine] = useState(0);

  function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit(e.currentTarget);
  }

  const canSubmit =
    orgs.filter((o) => o.trim()).length >= 1 && orgs[mine]?.trim();

  return (
    <main className="mx-auto max-w-lg px-5 pb-24 pt-16">
      <Link
        to="/"
        prefetch="intent"
        className="text-[length:var(--text-meta)] font-medium text-ink-muted transition-colors hover:text-ink"
      >
        ← Back
      </Link>
      <h1 className="mt-4 text-[length:var(--text-page)] font-semibold">New workspace</h1>
      <p className="mt-1.5 text-[length:var(--text-body)] text-ink-muted">
        A shared page for one partnership. Name it, then list the companies at the table.
      </p>

      <form method="post" onSubmit={submitForm} className="mt-8 space-y-6">
        <label className="block">
          <span className="text-[length:var(--text-meta)] font-medium text-ink">Workspace name</span>
          <input
            name="name"
            required
            autoFocus
            placeholder="e.g. NFC Assure · Gibson Ops · MachineWeaver"
            className="mt-1.5 w-full rounded-[length:var(--radius-field)] border border-line bg-raised px-3 py-2 text-[length:var(--text-body)] text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </label>

        <div>
          <span className="text-[length:var(--text-meta)] font-medium text-ink">Companies</span>
          <p className="mb-2 text-[length:var(--text-meta)] text-ink-faint">
            Pick the one that's yours — you'll be seated there.
          </p>
          <div className="space-y-2">
            {orgs.map((val, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <label className="flex items-center gap-2" title="This is my company">
                  <input
                    type="radio"
                    name="mine"
                    value={i}
                    checked={mine === i}
                    onChange={() => setMine(i)}
                    className="h-4 w-4 accent-[color:var(--action)]"
                  />
                </label>
                <input
                  name="orgName"
                  value={val}
                  onChange={(e) =>
                    setOrgs((os) => os.map((o, j) => (j === i ? e.target.value : o)))
                  }
                  placeholder={`Company ${i + 1}`}
                  className="flex-1 rounded-[length:var(--radius-field)] border border-line bg-raised px-3 py-1.5 text-[length:var(--text-body)] text-ink placeholder:text-ink-faint focus:outline-none"
                />
                {orgs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrgs((os) => os.filter((_, j) => j !== i));
                      if (mine >= i && mine > 0) setMine((m) => m - 1);
                    }}
                    aria-label={`Remove company ${i + 1}`}
                    className="text-[length:var(--text-meta)] text-ink-faint transition-colors hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOrgs((os) => [...os, ''])}
            className="mt-2.5 text-[length:var(--text-meta)] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            + Add company
          </button>
        </div>

        {actionData?.error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-[length:var(--text-meta)] text-danger">
            {actionData.error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5">
          <Link
            to="/"
            className="rounded-full px-4 py-2 text-[length:var(--text-body)] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="rounded-full bg-action px-5 py-2 text-[length:var(--text-body)] font-medium text-ink-inverse transition-colors duration-150 hover:bg-action-hover disabled:opacity-40"
          >
            {busy ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </form>
    </main>
  );
}
