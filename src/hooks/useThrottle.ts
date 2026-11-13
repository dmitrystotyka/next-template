'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

import { throttle, type Throttled } from '@/utils/throttle';

/**
 * Throttle a callback to at most once per `delay` ms (leading + trailing
 * edge). Thin React binding over `utils/throttle` — the returned function
 * is stable across renders, reacts to `delay` changes, and clears the
 * trailing timer on unmount.
 *
 * @example
 * const onScroll = useThrottle(() => setY(window.scrollY), 100);
 * useEventListener('scroll', onScroll);
 */
export function useThrottle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): (...args: Args) => void {
  // See useDebouncedCallback: a ref because the result runs in event handlers.
  const fnRef = useRef(fn);
  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  const throttledRef = useRef<Throttled<Args> | null>(null);
  useEffect(() => {
    const throttled = throttle((...args: Args) => fnRef.current(...args), delay);
    throttledRef.current = throttled;
    return () => throttled.cancel();
  }, [delay]);

  return (...args: Args) => throttledRef.current?.(...args);
}
