'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { debounce, type Debounced } from '@/utils/debounce';

/**
 * Debounce a changing value. `debounced` updates after `delay` ms of silence.
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback. The returned function is stable across renders,
 * always calls the latest version of the wrapped callback, reacts to
 * `delay` changes, and cancels the pending timer on unmount.
 *
 * @example
 * const onSearch = useDebouncedCallback((q: string) => fetch(q), 300);
 * <input onChange={(e) => onSearch(e.target.value)} />
 */
export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): (...args: Args) => void {
  // A ref, not `useEffectEvent`: the debounced function is called from
  // event handlers, where Effect Events are not allowed. Layout effect →
  // updated before any event of the committed render can fire.
  const fnRef = useRef(fn);
  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  const debouncedRef = useRef<Debounced<Args> | null>(null);
  useEffect(() => {
    const debounced = debounce((...args: Args) => fnRef.current(...args), delay);
    debouncedRef.current = debounced;
    // Cancel on unmount/delay change — a pending timer must never fire
    // into an unmounted component.
    return () => debounced.cancel();
  }, [delay]);

  return (...args: Args) => debouncedRef.current?.(...args);
}
