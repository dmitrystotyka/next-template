'use client';

import { useEffect, useState } from 'react';

type Options = Omit<IntersectionObserverInit, 'threshold'> & {
  threshold?: number | number[];
  /** Disconnect after the first intersection (useful for lazy loading). */
  freezeOnceVisible?: boolean;
};

type IntersectionResult<T extends Element> = {
  /** Callback ref — attach to the observed element (works when it mounts later). */
  ref: (node: T | null) => void;
  entry: IntersectionObserverEntry | null;
  isIntersecting: boolean;
};

/**
 * Subscribe to `IntersectionObserver` for one element.
 *
 * @example
 * const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({ threshold: 0.2 });
 * <div ref={ref}>{isIntersecting ? <Chart /> : null}</div>
 */
export function useIntersectionObserver<T extends Element>({
  freezeOnceVisible = false,
  root = null,
  rootMargin,
  threshold,
}: Options = {}): IntersectionResult<T> {
  const [node, setNode] = useState<T | null>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const frozen = (entry?.isIntersecting ?? false) && freezeOnceVisible;

  // `threshold` may be an inline array literal — a fresh reference every
  // render. Key the effect on its VALUE so the observer isn't recreated.
  const thresholdKey = JSON.stringify(threshold ?? 0);

  useEffect(() => {
    if (!node || frozen || typeof IntersectionObserver === 'undefined') return;

    const init: IntersectionObserverInit = {
      root,
      threshold: JSON.parse(thresholdKey) as number | number[],
    };
    if (rootMargin !== undefined) init.rootMargin = rootMargin;

    const observer = new IntersectionObserver(([next]) => {
      if (next) setEntry(next);
    }, init);

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, root, rootMargin, thresholdKey, frozen]);

  return { ref: setNode, entry, isIntersecting: entry?.isIntersecting ?? false };
}
