import { logger } from '@/utils/logger';

/** Humans need a few seconds to fill even a short form. */
export const MIN_FILL_MS = 3000;

/**
 * Anti-bot metadata a form sends next to its values. Both are spoofable by a
 * determined attacker — they stop the naive spam bots that make up most of
 * the noise, at zero UX cost (no captcha).
 */
export type BotSignals = {
  /** Honeypot: an input humans never see or fill (see the client snippet below). */
  honeypot?: string;
  /** Milliseconds between "form visible" and submit. */
  elapsedMs?: number;
};

/**
 * Server-side check for a Server Action / Route Handler. A bot gets a
 * SUCCESS-shaped answer from the caller — an error would teach it which
 * input to fix.
 *
 * @example
 * // actions.ts ('use server')
 * export const submitContact = withServerAction(async (input: ContactInput & BotSignals) => {
 *   await assertSameOrigin();
 *   return limitedSubmit(input);
 * });
 * const limitedSubmit = withActionRateLimit({ limit: 5, windowSeconds: 60 }, async (input) => {
 *   const { honeypot, elapsedMs, ...values } = input;
 *   if (isLikelyBot({ honeypot, elapsedMs }, 'contact')) return { ok: true };
 *   const parsed = contactSchema(await messages()).safeParse(values); // same schema as the client
 *   …
 * });
 *
 * // Client: const bot = useBotSignals(); <Honeypot ref={bot.honeypotRef} /> in the
 * // form; submit({ ...values, ...bot.collect() }).
 */
export function isLikelyBot(
  { honeypot, elapsedMs }: BotSignals,
  scope: string,
  minFillMs = MIN_FILL_MS,
): boolean {
  const filledHoneypot = typeof honeypot === 'string' && honeypot.length > 0;
  const tooFast = typeof elapsedMs !== 'number' || elapsedMs < minFillMs;
  if (!filledHoneypot && !tooFast) return false;

  logger.warn(
    `[${scope}] bot rejected (honeypot=${filledHoneypot} elapsedMs=${elapsedMs ?? 'missing'})`,
  );
  return true;
}
