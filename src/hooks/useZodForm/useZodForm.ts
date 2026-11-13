'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type FieldValues, useForm, type UseFormProps } from 'react-hook-form';

import type { z } from 'zod';

/**
 * `useForm` wired to a Zod schema — the client half of "one schema on both
 * sides": the Server Action re-validates with the SAME schema. Schemas are
 * factories taking translated messages (no hardcoded strings):
 *
 * @example
 * export const contactSchema = (m: { email: string }) => z.object({ email: z.email(m.email) });
 *
 * const t = useTranslations('contact');
 * const form = useZodForm(contactSchema({ email: t('error_email') }), {
 *   defaultValues: { email: '' },
 * });
 * <FormField control={form.control} name="email" label={t('email')} />
 */
export function useZodForm<Input extends FieldValues, Output extends FieldValues>(
  schema: z.ZodType<Output, Input>,
  props: Omit<UseFormProps<Input, unknown, Output>, 'resolver'> = {},
) {
  return useForm<Input, unknown, Output>({ ...props, resolver: zodResolver(schema) });
}
