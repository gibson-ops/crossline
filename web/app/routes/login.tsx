// Sign-in screen — passwordless only (magic link now; Google appears once
// GOOGLE_CLIENT_ID is configured). Styling is functional for now; the real
// design pass (tokens + Impeccable) lands with the board.
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { authClient } from '../lib/auth-client';

export function meta() {
  return [{ title: 'Sign in — Crossline' }];
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [params] = useSearchParams();
  // A failed magic-link verification redirects here with ?error=…
  const linkError = params.get('error');

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState('sending');
    const { error } = await authClient.signIn.magicLink({
      email: email.trim(),
      callbackURL: '/',
    });
    setState(error ? 'error' : 'sent');
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="text-[length:var(--text-page)] font-semibold">Crossline</h1>
        <p className="mt-1 mb-8 text-[length:var(--text-body)] text-ink-muted">
          One shared page for your partnership.
        </p>

        {linkError && state === 'idle' && (
          <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[length:var(--text-meta)] text-danger">
            That sign-in link expired or was already used. Enter your email for a fresh one.
          </p>
        )}

        {state === 'sent' ? (
          <div className="rounded-2xl border border-line bg-raised p-6">
            <p className="font-medium text-ink">Check your email</p>
            <p className="mt-1 text-[length:var(--text-body)] text-ink-muted">
              We sent a sign-in link to <span className="font-medium text-ink">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={sendLink} className="space-y-3">
            <input
              type="email"
              required
              autoFocus
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[length:var(--radius-field)] border border-line bg-raised px-3.5 py-2.5 text-[length:var(--text-body)] text-ink placeholder:text-ink-faint focus:outline-none"
            />
            <button
              type="submit"
              disabled={state === 'sending'}
              className="w-full rounded-full bg-action px-3.5 py-2.5 text-[length:var(--text-body)] font-medium text-ink-inverse transition-colors duration-150 hover:bg-action-hover disabled:opacity-50"
            >
              {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            {state === 'error' && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-[length:var(--text-meta)] text-danger">
                Couldn't send the link. Try again.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
