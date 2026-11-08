'use client';

import { useLayoutEffect, useRef } from 'react';

/** Animate actual row movement, without delaying React state or changing page order. */
export function useAnimatedList(ids: string[]) {
  const ref = useRef<HTMLOListElement>(null);
  const previous = useRef(new Map<string, { top: number; left: number }>());
  const running = useRef<Animation[]>([]);
  const identity = ids.join(',');
  useLayoutEffect(() => {
    running.current.forEach(animation => animation.cancel());
    running.current = [];
    const next = new Map<string, { top: number; left: number }>();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const node of Array.from(ref.current?.children || [])) {
      const row = node as HTMLElement;
      const id = row.dataset.fileId;
      if (!id) continue;
      const position = { top: row.offsetTop, left: row.offsetLeft };
      const before = previous.current.get(id);
      next.set(id, position);
      if (!reduced && before && typeof row.animate === 'function') {
        const x = before.left - position.left, y = before.top - position.top;
        if (x || y) running.current.push(row.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }));
      }
    }
    previous.current = next;
    return () => { running.current.forEach(animation => animation.cancel()); };
  }, [identity]);
  return ref;
}
