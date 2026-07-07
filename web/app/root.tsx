import { useEffect, useRef, useState } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
} from "react-router";

import type { Route } from "./+types/root";
import { Toaster } from "./lib/toast";
import "./app.css";

// Onest is self-hosted via @fontsource (imported in app.css) — no external font hosts.
export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Thin top progress bar while a navigation's loaders run. Fast navigations
 * still get a full sweep: the bar holds for a minimum ~380ms before finishing,
 * so it reads as a deliberate motion instead of a one-frame flicker.
 */
const NAV_BAR_MIN_MS = 380;

function NavProgress() {
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const shownAt = useRef(0);

  useEffect(() => {
    if (busy) {
      shownAt.current = Date.now();
      setState("loading");
      return;
    }
    // Finish: hold to the minimum sweep, snap to 100%, fade, unmount.
    const hold = Math.max(0, NAV_BAR_MIN_MS - (Date.now() - shownAt.current));
    const t1 = setTimeout(() => setState((s) => (s === "loading" ? "done" : s)), hold);
    const t2 = setTimeout(() => setState("idle"), hold + 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [busy]);

  if (state === "idle") return null;
  return (
    <div className="nav-progress" data-state={state} aria-hidden>
      <span />
    </div>
  );
}

export default function App() {
  return (
    <>
      <NavProgress />
      <Outlet />
      <Toaster />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const stack =
    import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 text-center">
      <h1 className="text-[length:var(--text-page)] font-semibold">
        {notFound ? "That page doesn't exist" : "Something went wrong"}
      </h1>
      <p className="mt-2 text-[length:var(--text-body)] text-ink-muted">
        {notFound
          ? "The link may be old, or the address mistyped."
          : "It's on our side, not yours. Reloading usually fixes it."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <a
          href="/"
          className="rounded-full bg-action px-5 py-2 text-[length:var(--text-body)] font-medium text-ink-inverse transition-colors hover:bg-action-hover"
        >
          Back to the board
        </a>
        {!notFound && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-[length:var(--text-body)] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            Reload
          </button>
        )}
      </div>
      {stack && (
        <details className="mt-8 w-full text-left">
          <summary className="cursor-pointer text-[length:var(--text-meta)] text-ink-faint">
            Error detail (dev only)
          </summary>
          <pre className="mt-2 w-full overflow-x-auto rounded-lg bg-sunken p-4 text-xs text-ink-muted">
            <code>{stack}</code>
          </pre>
        </details>
      )}
    </main>
  );
}
