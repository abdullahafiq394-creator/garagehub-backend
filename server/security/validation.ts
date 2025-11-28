import { z } from 'zod';

/**
 * Password validation schema - Enterprise grade
 * Minimum 8 characters, must contain:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (!@#$%^&*)');

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

/**
 * Phone validation schema (Malaysia format)
 */
export const phoneSchema = z.string()
  .regex(/^(\+?60|0)[0-9]{8,10}$/, 'Invalid Malaysian phone number format');

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, ''); // Remove javascript: protocol
}

/**
 * Validate and sanitize user registration data
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(50).transform(sanitizeString),
  lastName: z.string().min(1, 'Last name is required').max(50).transform(sanitizeString),
  phone: phoneSchema.optional(),
  role: z.enum(['customer', 'workshop', 'supplier', 'runner', 'towing']),
});

/**
 * Validate login credentials
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().optional() // For 2FA
});

/**
 * Validate password change
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
