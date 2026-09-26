/**
 * @file server-audit-sink.ts
 * @description Fire-and-forget forwarder for auth audit events to the
 * Supabase Edge ingest (`auth-audit`). Fail-open by design: logging must
 * never block authentication. Never throws.
 */

import type { ILogger } from '@/shared/interfaces/i-logger';

export type ServerAuditAction = 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'TOKEN_REFRESH';

/**
 * Resolves the caller's Supabase access token, or null when there is no
 * session (e.g. pre-auth LOGIN_FAILED). No token → event stays local-only.
 */
export type AccessTokenProvider = () => Promise<string | null>;

export class ServerAuditSink {
  constructor(
    private readonly functionsBaseUrl: string,
    private readonly anonKey: string,
    private readonly tokenProvider: AccessTokenProvider,
    private readonly logger: ILogger
  ) {}

  async forward(
    action: ServerAuditAction,
    // Kept for call-site symmetry with IAuditLogger; the server derives the
    // user from the JWT and ignores any client-claimed identity.
    _userId: string,
    provider?: string
  ): Promise<void> {
    try {
      const token = await this.tokenProvider();
      if (!token) {
        this.logger.debug('Server audit skipped (no session)', { action });
        return;
      }

      const res = await fetch(`${this.functionsBaseUrl}/functions/v1/auth-audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.anonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, provider }),
      });

      if (!res.ok) {
        this.logger.debug('Server audit rejected', { action, status: res.status });
      }
    } catch (err) {
      // Fail open: sink outage (or missing table / migration not run yet)
      // must never break sign-in.
      this.logger.debug('Server audit unreachable', {
        action,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/** Build the Edge Functions base URL from the Supabase project URL. */
export function resolveFunctionsBaseUrl(supabaseUrl: string): string {
  return supabaseUrl.trim().replace(/\/+$/, '');
}
