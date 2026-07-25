import { z } from 'zod';

import { OAuthProvider } from '@/background/auth/interfaces/i-auth-manager';

export const OAuthProviderSchema = z.enum([
  OAuthProvider.GOOGLE,
  OAuthProvider.APPLE,
  OAuthProvider.FACEBOOK,
  OAuthProvider.TWITTER,
]);

export const LoginPayloadSchema = z.object({
  provider: OAuthProviderSchema,
});

export const EmailAuthPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const SessionBridgePayloadSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

export const SyncAuthSessionPayloadSchema = z.union([
  SessionBridgePayloadSchema,
  z.null(),
]);

export type SessionBridgePayload = z.infer<typeof SessionBridgePayloadSchema>;

/** Exactly 6 numeric digits — matches Supabase's configured otp_length. */
export const OtpCodeSchema = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');

export const EmailOnlyPayloadSchema = z.object({
  email: z.string().email(),
});

export const VerifyOtpPayloadSchema = z.object({
  email: z.string().email(),
  token: OtpCodeSchema,
});

export const UpdatePasswordPayloadSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});
