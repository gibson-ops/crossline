// Keep the browser's InstantDB session in sync with the Better Auth session.
// Shared by every authed route (board, files).
import { useEffect, useState } from 'react';
import { db } from './db';

export function useInstantSession() {
  const { isLoading, user } = db.useAuth();
  const [bridging, setBridging] = useState(false);
  useEffect(() => {
    if (isLoading || user || bridging) return;
    setBridging(true);
    fetch('/api/instant-token', { method: 'POST' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`bridge ${r.status}`))))
      .then(({ token }) => db.auth.signInWithToken(token))
      .catch((e) => console.error('instant bridge failed:', e))
      .finally(() => setBridging(false));
  }, [isLoading, user, bridging]);
  return user;
}
