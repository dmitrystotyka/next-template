'use client';

import { useEffect, useEffectEvent } from 'react';

type Options = Pick<AddEventListenerOptions, 'capture' | 'passive' | 'once'>;

/**
 * Attach an event listener with automatic cleanup. The handler always sees
 * the latest props/state (`useEffectEvent`) without re-attaching.
 *
 * Target:
 * - omitted → `window`;
 * - `'document'` → `document` (a string, so it is safe to pass during SSR);
 * - an element or `null` — keep it in state via a callback ref, so a node
 *   that mounts later still gets the listener:
 *
 * @example
 * useEventListener('resize', () => setWidth(window.innerWidth));
 * useEventListener('visibilitychange', onVisibility, 'document');
 *
 * const [node, setNode] = useState<HTMLDivElement | null>(null);
 * useEventListener('keydown', onKeyDown, node);
 * <div ref={setNode} tabIndex={-1} />
 */
export function useEventListener<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  target?: undefined,
  options?: Options,
): void;
export function useEventListener<K extends keyof DocumentEventMap>(
  event: K,
  handler: (e: DocumentEventMap[K]) => void,
  target: 'document',
  options?: Options,
): void;
export function useEventListener<K extends keyof HTMLElementEventMap>(
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  target: HTMLElement | null,
  options?: Options,
): void;
export function useEventListener(
  event: string,
  handler: (e: Event) => void,
  target?: HTMLElement | 'document' | null,
  { capture = false, passive, once }: Options = {},
): void {
  const onEvent = useEffectEvent((e: Event) => handler(e));

  useEffect(() => {
    const node: EventTarget | null =
      target === undefined ? window : target === 'document' ? document : target;
    if (!node) return;

    const listener = (e: Event) => onEvent(e);
    const opts: AddEventListenerOptions = { capture };
    if (passive !== undefined) opts.passive = passive;
    if (once !== undefined) opts.once = once;

    node.addEventListener(event, listener, opts);
    return () => node.removeEventListener(event, listener, { capture });
  }, [event, target, capture, passive, once]);
}
