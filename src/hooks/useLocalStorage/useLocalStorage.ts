'use client';

import { useRef, useSyncExternalStore } from 'react';

import { logger } from '@/utils/logger';

type Setter<T> = (value: T | ((prev: T) => T)) => void;

type Options<T> = {
  /**
   * Validate what is in storage (stale schema, manual edits). Throw → the
   * stored value is ignored and `initialValue` is used. Zod fits as-is:
   * `{ parse: schema.parse }`.
   */
  parse?: (value: unknown) => T;
};

// Same-tab sync: the `storage` event only fires in OTHER tabs, so writes
// notify every subscribed hook instance through this registry.
const keyListeners = new Map<string, Set<() => void>>();

// Parsed values keyed by storage key + raw string — `useSyncExternalStore`
// requires `getSnapshot` to return a REFERENTIALLY stable value while the
// store is unchanged (a fresh `JSON.parse` object every call would loop
// forever). Only STORED values are cached: the fallback is per hook instance.
const snapshotCache = new Map<string, { raw: string; value: unknown }>();
const INVALID = Symbol('invalid');

function emit(key: string) {
  keyListeners.get(key)?.forEach((cb) => cb());
}

function readRaw(key: string): string | null {
  // Reads can throw too (Safari lockdown mode, sandboxed iframes, blocked
  // site data) — a SecurityError during render would take the tree down.
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    logger.warn(`useLocalStorage: failed to read "${key}"`, err);
    return null;
  }
}

function readSnapshot<T>(key: string, initialValue: T, parse?: (value: unknown) => T): T {
  const raw = readRaw(key);
  if (raw === null) return initialValue;

  const cached = snapshotCache.get(key);
  if (cached?.raw === raw) return cached.value === INVALID ? initialValue : (cached.value as T);

  let value: unknown = INVALID;
  try {
    const json: unknown = JSON.parse(raw);
    value = parse ? parse(json) : json;
  } catch (err) {
    logger.warn(`useLocalStorage: ignoring invalid value of "${key}"`, err);
  }
  snapshotCache.set(key, { raw, value });
  return value === INVALID ? initialValue : (value as T);
}

/**
 * Reactive wrapper around `localStorage` built on `useSyncExternalStore`:
 * - SSR-safe — renders `initialValue` on the server and during hydration
 *   (React uses `getServerSnapshot` until hydration completes), then
 *   switches to the stored value. Components mounted AFTER hydration read
 *   storage on their first render; components in the initial HTML may show
 *   `initialValue` for one frame — gate on a mounted flag if that matters.
 * - Same-tab sync — two components with the same key see each other's writes.
 * - Cross-tab sync via the `storage` event, including removal/`clear()`.
 * - JSON serialization; optional `parse` validates what comes back.
 * - A failed write (quota, blocked storage) is logged and the value stays
 *   what storage really holds.
 *
 * `initialValue` is captured on first render — pass a literal freely, later
 * changes to it are ignored (this is what makes object defaults safe).
 *
 * @example
 * const [view, setView] = useLocalStorage<'grid' | 'list'>('view', 'grid');
 * const [prefs, setPrefs] = useLocalStorage('prefs', defaults, { parse: prefsSchema.parse });
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  { parse }: Options<T> = {},
): readonly [T, Setter<T>] {
  const initialRef = useRef(initialValue);

  // React Compiler keeps these closures stable per `key`/`parse`.
  const subscribe = (callback: () => void) => {
    let set = keyListeners.get(key);
    if (!set) {
      set = new Set();
      keyListeners.set(key, set);
    }
    set.add(callback);

    const onStorage = (e: StorageEvent) => {
      // `key === null` means storage.clear(); the storageArea guard skips
      // sessionStorage events.
      if (e.storageArea === window.localStorage && (e.key === key || e.key === null)) {
        callback();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      set.delete(callback);
      if (set.size === 0) keyListeners.delete(key);
      window.removeEventListener('storage', onStorage);
    };
  };

  const getSnapshot = () => readSnapshot(key, initialRef.current, parse);
  const getServerSnapshot = () => initialRef.current;

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set: Setter<T> = (v) => {
    const prev = readSnapshot(key, initialRef.current, parse);
    const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch (err) {
      logger.warn(`useLocalStorage: failed to write "${key}"`, err);
      return;
    }
    emit(key);
  };

  return [value, set] as const;
}
