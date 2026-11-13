'use client';

// Controller is a client-only react-hook-form API — without this directive a
// Server Component importing the UI barrel pulls it into the RSC build.
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';

import { Input, type InputProps } from '@/components/UI/Input';

// id/aria-invalid/aria-describedby are also omitted — Input derives them
// from the error state; caller overrides would break that wiring.
type FormFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = Omit<
  InputProps,
  | 'name'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'onBlur'
  | 'ref'
  | 'error'
  | 'id'
  | 'aria-invalid'
  | 'aria-describedby'
  | 'type'
> & {
  control: Control<TFieldValues>;
  name: TName;
  /**
   * Text-like inputs only — the value is a string. Numbers: `z.coerce.number()`
   * in the schema; checkbox/radio/file need their own Controller.
   */
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url';
};

/**
 * Type-safe field bridge between react-hook-form and `<Input>`.
 *
 * Validation messages come from the resolver attached to `useForm`
 * (`useZodForm`) — no need to thread errors manually.
 *
 * @example
 * const form = useZodForm(contactSchema(messages), { defaultValues: { email: '' } });
 *
 * <form onSubmit={form.handleSubmit(onSubmit)}>
 *   <FormField control={form.control} name="email" label={t('email')} type="email" />
 * </form>
 */
function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  control,
  name,
  ...rest
}: FormFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...rest}
          name={field.name}
          value={String(field.value ?? '')}
          onChange={field.onChange}
          onBlur={field.onBlur}
          ref={field.ref}
          disabled={field.disabled ?? rest.disabled}
          error={fieldState.error?.message ?? null}
        />
      )}
    />
  );
}

export { FormField };
export type { FormFieldProps };
