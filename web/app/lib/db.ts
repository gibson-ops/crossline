// InstantDB client (browser + SSR-safe init). The App ID is public by design;
// all access control lives in instant.perms.ts (CEL rules on the server).
//
// Environments = separate Instant apps. Set VITE_INSTANT_APP_ID (build-time)
// to point at the prod app; the fallback is the dev app.
import { init } from '@instantdb/react';
import schema from '../../../instant.schema';

export const APP_ID =
  (import.meta.env.VITE_INSTANT_APP_ID as string | undefined) ??
  'c7f2d8d8-41f2-4272-a25a-eb2d6a344a31';

export const db = init({
  appId: APP_ID,
  schema,
  useDateObjects: true,
});
