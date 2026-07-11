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
  password: z.string().min(6),
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
