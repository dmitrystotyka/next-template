// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

describe('resolveAppUrl (own routes) — browser', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the address-bar origin, not NEXT_PUBLIC_CLIENT_URL (preview / LAN hosts)', async () => {
    vi.stubEnv('NEXT_PUBLIC_CLIENT_URL', 'https://site.example');
    vi.resetModules();
    const { resolveAppUrl } = await import('@/services/api/http');

    expect(window.location.origin).not.toBe('https://site.example');
    expect(resolveAppUrl('/api/health')).toBe(`${window.location.origin}/api/health`);
  });
});
