// Minimal toast — surface failed syncs and background errors without blocking.
// One <Toaster/> mounts in root; call toast('…') from anywhere.
import { useEffect, useState } from 'react';

type Toast = { id: number; message: string };

let listeners: ((t: Toast) => void)[] = [];
let nextId = 1;

export function toast(message: string) {
  listeners.forEach((l) => l({ id: nextId++, message }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (t: Toast) => {
      setToasts((ts) => [...ts, t]);
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 4500);
    };
    listeners.push(on);
    return () => {
      listeners = listeners.filter((l) => l !== on);
    };
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="fade-rise pointer-events-auto rounded-full bg-action px-4 py-2 text-[length:var(--text-meta)] font-medium text-ink-inverse shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
