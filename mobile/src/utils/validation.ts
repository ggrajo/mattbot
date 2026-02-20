import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters');

export const totpCodeSchema = z
  .string()
  .length(6, 'Code must be exactly 6 digits')
  .regex(/^\d{6}$/, 'Code must contain only digits');

export const recoveryCodeSchema = z
  .string()
  .min(1, 'Recovery code is required')
  .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/i, 'Invalid recovery code format (e.g. ABCD-1234)');

export function validateField<T>(schema: z.ZodType<T>, value: unknown): string | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    return result.error.errors[0]?.message;
  }
  return undefined;
}
