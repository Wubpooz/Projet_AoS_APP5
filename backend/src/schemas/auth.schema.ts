import { z } from 'zod';

export const registerBodySchema = z.object({
  email: z.email().describe('User email address').meta({ example: 'user@example.com' }), // without meta, generates random string (zod-to-openapi does not generate examples for z.string().email() (v3 or v4). It only maps the format.)
  password: z.string().min(8).describe('User password (minimum 8 characters)').meta({ example: 'pozajaopjioeahifohaieofae' }),
  name: z.string().min(1).max(200).optional().describe('User display name').meta({ example: 'John Doe' }),
}) satisfies z.Schema<{ email: string; password: string; name?: string }>;

export const loginBodySchema = z.object({
  email: z.email().describe('User email address').meta({ example: 'user@example.com' }),
  password: z.string().min(8).describe('User password').meta({ example: 'pozajaopjioeahifohaieofae'}),
}) satisfies z.Schema<{ email: string; password: string }>;

export const messageResponseSchema = z.object({
  message: z.string(),
  user: z.unknown().optional(),
  session: z.unknown().optional(),
  sessionToken: z.string().optional(),
}) satisfies z.Schema<{ message: string; user?: unknown; session?: unknown; sessionToken?: string }>;

export const forgotPasswordBodySchema = z.object({
  email: z.email().describe('User email address').meta({ example: 'user@example.com' }),
}) satisfies z.Schema<{ email: string }>;

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1).describe('Password reset token'),
  newPassword: z.string().min(8).describe('New password (minimum 8 characters)').meta({ example: 'newpassword123' }),
}) satisfies z.Schema<{ token: string; newPassword: string }>;