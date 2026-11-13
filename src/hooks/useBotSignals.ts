'use client';

import { useEffect, useRef } from 'react';

import type { BotSignals } from '@/lib/botGuard';

/**
 * Client half of the form bot guard (server half: `isLikelyBot` in
 * `@/lib/botGuard`). Render `<Honeypot ref={honeypotRef} />` inside the form
 * and spread `collect()` into the Server Action input.
 *
 * @example
 * const bot = useBotSignals();
 * <form onSubmit={form.handleSubmit((v) => submitContact({ ...v, ...bot.collect() }))}>
 *   <Honeypot ref={bot.honeypotRef} />
 */
export function useBotSignals() {
  const honeypotRef = useRef<HTMLInputElement>(null);
  // Stamped in an effect: render stays pure, and effect time ≈ "the user can
  // see the form", which is what the min-fill-time check measures.
  const mountedAtRef = useRef(0);
  useEffect(() => {
    if (mountedAtRef.current === 0) mountedAtRef.current = Date.now();
  }, []);

  const collect = (): BotSignals => ({
    honeypot: honeypotRef.current?.value ?? '',
    elapsedMs: mountedAtRef.current ? Date.now() - mountedAtRef.current : 0,
  });

  return { honeypotRef, collect };
}
