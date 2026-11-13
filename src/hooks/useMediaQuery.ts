'use client';

import { useSyncExternalStore } from 'react';

// One MediaQueryList per query string for the whole app — `getSnapshot`
// runs on every store check, and `window.matchMedia()` allocates + parses
// the query each call.
const mqlCache = new Map<string, MediaQueryList>();

function getMediaQueryList(query: string): MediaQueryList {
  let mql = mqlCache.get(query);
  if (!mql) {
    mql = window.matchMedia(query);
    mqlCache.set(query, mql);
  }
  return mql;
}

const getServerSnapshot = () => false;

/**
 * Hook for tracking media query state.
 * Uses useSyncExternalStore for safe SSR hydration.
 * Returns `false` on the server and during hydration.
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
 */
export function useMediaQuery(query: string): boolean {
  // React Compiler keeps both closures stable per `query` — no useCallback.
  const subscribe = (callback: () => void) => {
    const mediaQuery = getMediaQueryList(query);
    mediaQuery.addEventListener('change', callback);
    return () => mediaQuery.removeEventListener('change', callback);
  };
  const getSnapshot = () => getMediaQueryList(query).matches;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
