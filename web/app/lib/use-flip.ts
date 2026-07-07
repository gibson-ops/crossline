// FLIP animation for list reordering: measure each [data-flip-key] child's
// position before and after a render, then play the inverted delta as a
// transform (never a layout property). Respects prefers-reduced-motion.
import { useLayoutEffect, useRef } from 'react';

/**
 * @param orderKey a string that changes whenever the list order/membership changes
 * @returns ref for the list container element
 */
export function useFlip<T extends HTMLElement>(orderKey: string) {
  const ref = useRef<T>(null);
  const prevTops = useRef<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nextTops = new Map<string, number>();
    for (const child of el.querySelectorAll<HTMLElement>('[data-flip-key]')) {
      const key = child.dataset.flipKey!;
      const top = child.getBoundingClientRect().top;
      const before = prevTops.current.get(key);
      if (!reduced && before != null) {
        const dy = before - top;
        if (Math.abs(dy) > 2) {
          child.animate(
            [{ transform: `translateY(${dy}px)` }, { transform: 'none' }],
            { duration: 240, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
          );
        }
      }
      nextTops.set(key, top);
    }
    prevTops.current = nextTops;
  }, [orderKey]);

  return ref;
}
