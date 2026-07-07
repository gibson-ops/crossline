// Magic-link interstitial. The email links HERE (a side-effect-free GET) so
// email-scanner prefetches can't consume the one-time token; the human clicks
// through to the real verify endpoint.
import { useSearchParams } from 'react-router';

export function meta() {
  return [{ title: 'Sign in — Crossline' }];
}

export default function VerifySignin() {
  const [params] = useSearchParams();
  const token = params.get('token');

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <p className="text-[length:var(--text-body)] text-ink-muted">
          This sign-in link is incomplete. Request a new one from the{' '}
          <a href="/login" className="font-medium text-ink">
            sign-in page
          </a>
          .
        </p>
      </main>
    );
  }

  const verifyUrl = `/api/auth/magic-link/verify?token=${encodeURIComponent(token)}&callbackURL=/`;

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-[length:var(--text-page)] font-semibold">Almost in</h1>
        <p className="mt-2 text-[length:var(--text-body)] text-ink-muted">
          Tap continue to finish signing in to Crossline.
        </p>
        <a
          href={verifyUrl}
          className="mt-6 inline-block w-full rounded-full bg-action px-3.5 py-2.5 text-[length:var(--text-body)] font-medium text-ink-inverse transition-colors duration-150 hover:bg-action-hover"
        >
          Continue to Crossline
        </a>
        <p className="mt-4 text-[length:var(--text-meta)] text-ink-faint">
          Links work once and expire after 15 minutes.
        </p>
      </div>
    </main>
  );
}
