// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { useZodForm } from '@/hooks/useZodForm';

const schema = z.object({ email: z.email('bad email') });

describe('useZodForm', () => {
  it('validates with the schema and surfaces its (translated) message', async () => {
    const { result } = renderHook(() => useZodForm(schema, { defaultValues: { email: 'nope' } }));

    let valid = true;
    await act(async () => {
      valid = await result.current.trigger();
    });

    expect(valid).toBe(false);
    expect(result.current.getFieldState('email').error?.message).toBe('bad email');
  });

  it('passes valid input', async () => {
    const { result } = renderHook(() => useZodForm(schema, { defaultValues: { email: 'a@b.co' } }));
    await act(async () => {
      expect(await result.current.trigger()).toBe(true);
    });
  });
});
