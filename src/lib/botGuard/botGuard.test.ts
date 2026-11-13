import { afterEach, describe, expect, it, vi } from 'vitest';

import { isLikelyBot, MIN_FILL_MS } from '@/lib/botGuard';
import { logger } from '@/utils/logger';

describe('isLikelyBot', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets a human through: empty honeypot, realistic fill time', () => {
    expect(isLikelyBot({ honeypot: '', elapsedMs: MIN_FILL_MS + 1 }, 'test')).toBe(false);
  });

  it('flags a filled honeypot, a too-fast submit and missing timing — and logs it', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    expect(isLikelyBot({ honeypot: 'ACME', elapsedMs: 10_000 }, 'test')).toBe(true);
    expect(isLikelyBot({ honeypot: '', elapsedMs: 200 }, 'test')).toBe(true);
    expect(isLikelyBot({}, 'test')).toBe(true);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('accepts a custom minimum fill time', () => {
    expect(isLikelyBot({ elapsedMs: 1500 }, 'test', 1000)).toBe(false);
  });
});
