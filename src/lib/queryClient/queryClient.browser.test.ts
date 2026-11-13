// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { getQueryClient } from '@/lib/queryClient';

describe('getQueryClient (browser)', () => {
  it('reuses one singleton across calls — a re-render must not drop the cache', () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });
});
