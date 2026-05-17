import { useEffect, useRef, type RefObject } from 'react';

export function useClickOutside<T extends HTMLElement>(handler: () => void): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (event: PointerEvent) => {
      const node = ref.current;
      if (!node || node.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener('pointerdown', listener);
    return () => document.removeEventListener('pointerdown', listener);
  }, [handler]);

  return ref;
}
