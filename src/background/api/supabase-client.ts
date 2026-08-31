/**
 * @file supabase-client.ts
 * @description Supabase API client implementation
 * @architecture Facade Pattern - wraps Supabase SDK, implements IAPIClient
 */

import type { SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

import { APIErrorHandler } from './api-error-handler';
import type { APIError } from './api-errors';
import { AuthenticationError, TimeoutError, ValidationError } from './api-errors';
import { HTTPSValidator } from './https-validator';
import type {
  IAPIClient,
  SyncEvent,
  PushResult,
  Collection,
} from './interfaces/i-api-client';

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import {
  serializeHighlightMetadataForCloud,
  serializeHighlightTextForCloud,
  serializeTimestampForCloud,
  transformHighlightRow,
} from '@/shared/utils/supabase-highlight-row';

/**
 * RLS verification — required policy signature for each protected table.
 *
 * Used by the startup tripwire (see `verifyRls`) to assert that the
 * policies documented in `docs/06-security/rls-policies.md` are present
 * in the Supabase project. The tripwire is best-effort: a query failure
 * logs a warning and the app continues to start. Production RLS is the
 * primary control; the tripwire is a regression detector.
 *
 * @see docs/04-adrs/016-rls-verification-strategy.md
 * @see docs/06-security/rls-policies.md
 */
type RlsCommand = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
type RlsPolicyRole = 'authenticated' | 'anon';

interface RequiredPolicy {
  /** Postgres policy name (e.g. "highlights_select_own"). */
  name: string;
  /** The DML command the policy covers. */
  command: RlsCommand;
  /** The role the policy is granted to. */
  role: RlsPolicyRole;
}

const REQUIRED_RLS_TABLES = ['highlights', 'sync_events', 'collections'] as const;
type RlsTable = (typeof REQUIRED_RLS_TABLES)[number];

const REQUIRED_RLS_POLICIES: Record<RlsTable, RequiredPolicy[]> = {
  highlights: [
    { name: 'highlights_select_own', command: 'SELECT', role: 'authenticated' },
    { name: 'highlights_insert_own', command: 'INSERT', role: 'authenticated' },
    { name: 'highlights_update_own', command: 'UPDATE', role: 'authenticated' },
    { name: 'highlights_delete_own', command: 'DELETE', role: 'authenticated' },
  ],
  sync_events: [
    { name: 'sync_events_select_own', command: 'SELECT', role: 'authenticated' },
    { name: 'sync_events_insert_own', command: 'INSERT', role: 'authenticated' },
  ],
  collections: [
    { name: 'collections_select_own', command: 'SELECT', role: 'authenticated' },
    { name: 'collections_insert_own', command: 'INSERT', role: 'authenticated' },
    { name: 'collections_update_own', command: 'UPDATE', role: 'authenticated' },
    { name: 'collections_delete_own', command: 'DELETE', role: 'authenticated' },
  ],
};

interface PgPolicyRow {
  schemaname?: string;
  tablename?: string;
  policyname?: string;
  cmd?: string;
  roles?: string[] | string | null;
}

interface RlsRpcRow {
  table_name?: string;
  rls_enabled?: boolean;
  policy_count?: number;
}

/**
 * Supabase configuration
 */
export interface SupabaseConfig {
  /** Supabase project URL */
  url: string;

  /** Supabase anon/public key */
  anonKey: string;

  /** Request timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
}

/**
 * Supabase client implementation
 * Wraps Supabase SDK and provides type-safe API operations
 */
export class SupabaseClient implements IAPIClient {
  private sdkClient: SupabaseSDKClient;
  private readonly timeoutMs: number;

  /**
   * In-flight RLS verification promise.
   *
   * The tripwire (`verifyRls`) is fired from the constructor and runs
   * asynchronously. Tests can `await client.rlsVerification` to wait
   * for the check to settle. In production, callers should not depend
   * on this — the tripwire is fire-and-forget by design.
   */
  readonly rlsVerification: Promise<void>;

  get supabase(): SupabaseSDKClient {
    return this.sdkClient;
  }

  constructor(
    private readonly authManager: IAuthManager,
    private readonly logger: ILogger,
    config: SupabaseConfig,
    injectedClient?: SupabaseSDKClient
  ) {
    // Enforce HTTPS for security (prevents MITM attacks)
    HTTPSValidator.validate(config.url);

    this.sdkClient = injectedClient ?? createClient(config.url, config.anonKey);
    this.timeoutMs = config.timeoutMs ?? 5000;

    this.logger.debug('SupabaseClient initialized', {
      url: config.url,
      timeoutMs: this.timeoutMs,
    });

    // Runtime tripwire (ADR-016). Fire-and-forget: never blocks
    // construction. Failures are logged and swallowed.
    this.rlsVerification = this.verifyRls();
  }

  /**
   * Runtime RLS tripwire.
   *
   * Queries the `pg_policies` catalog view for the protected tables and
   * compares the result against the policy signature in
   * `docs/06-security/rls-policies.md`. Logs a warning for any gap.
   *
   * This is intentionally non-fatal: a misconfigured RLS is a serious
   * security regression, but it is not a reason to prevent the
   * extension from starting. The warning surfaces in the console for
   * operators, and the application keeps running with the client-side
   * `user_id` filters as defense in depth.
   *
   * If PostgREST does not expose `pg_catalog` (the default on Supabase
   * Cloud), the query will fail and a warning is logged. In that case
   * the tripwire is a no-op for the session and the operator should
   * add the `public.verify_rls()` RPC — see "Future work" in the
   * policies doc.
   *
   * @see docs/04-adrs/016-rls-verification-strategy.md
   * @see docs/06-security/rls-policies.md
   */
  private async verifyRls(): Promise<void> {
    // Preferred path: call public.verify_rls() RPC. PostgREST does
    // not expose pg_catalog on Supabase Cloud, so the .from('pg_policies')
    // path is a no-op there. The RPC is SECURITY DEFINER — anon/authenticated
    // roles can call it (see docs/03-implementation/supabase_schema.sql §6
    // and ADR-016 "Future work: RPC for tripwire").
    // Falls through to the pg_policies path if the SDK does not
    // expose .rpc() (older test mocks, non-Supabase clients).
    const rpcFn = (
      this.sdkClient as unknown as {
        rpc?: (
          name: string,
          params?: Record<string, unknown>
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc;
    if (typeof rpcFn === 'function') {
      try {
        const response = (await this.withTimeout(
          rpcFn.call(this.sdkClient, 'verify_rls', {})
        )) as { data: RlsRpcRow[] | null; error: { message: string } | null };

        if (response.error) {
          this.logger.warn('verify_rls RPC returned an error; RLS is unverified', {
            error: response.error.message,
          });
          return;
        }

        const rpcRows = response.data ?? [];
        for (const table of REQUIRED_RLS_TABLES) {
          const row = rpcRows.find((r) => r.table_name === table);
          const required = REQUIRED_RLS_POLICIES[table];
          if (!row) {
            this.logger.warn(
              'verify_rls RPC did not return a row for a protected table',
              {
                table,
              }
            );
            continue;
          }
          if (!row.rls_enabled) {
            this.logger.warn(
              'RLS disabled on protected table — production may be vulnerable',
              {
                table,
              }
            );
          } else if ((row.policy_count ?? 0) < required.length) {
            this.logger.warn(
              'RLS policy count below required — production may be vulnerable',
              {
                table,
                required: required.length,
                present: row.policy_count,
              }
            );
          }
        }
        return;
      } catch (error) {
        this.logger.warn('verify_rls RPC threw; falling back to pg_policies query', {
          error: (error as Error).message,
        });
        // fall through to the legacy path below
      }
    }

    let rows: PgPolicyRow[] | null = null;
    let fetchError: Error | null = null;

    try {
      const response = (await this.withTimeout(
        this.sdkClient
          .from('pg_policies')
          .select('schemaname,tablename,policyname,cmd,roles')
          .in('tablename', [...REQUIRED_RLS_TABLES])
      )) as { data: PgPolicyRow[] | null; error: { message: string } | null };

      if (response.error) {
        fetchError = new Error(response.error.message);
      } else {
        rows = response.data ?? [];
      }
    } catch (error) {
      fetchError = error as Error;
    }

    if (fetchError || rows === null) {
      this.logger.warn(
        'RLS verification could not query pg_policies (PostgREST does not expose pg_catalog, or query failed). RLS is unverified for this session.',
        {
          error: fetchError?.message,
        }
      );
      return;
    }

    for (const table of REQUIRED_RLS_TABLES) {
      const tableRows = rows.filter((row) => row.tablename === table);
      const required = REQUIRED_RLS_POLICIES[table];

      const present = new Set(
        tableRows.map((row) => {
          const cmd = (row.cmd ?? '').toUpperCase();
          const roleList = Array.isArray(row.roles) ? row.roles : [];
          // The catalog can list policies with multiple roles; we
          // only need to confirm the required role is present.
          const role = roleList.includes('authenticated')
            ? 'authenticated'
            : roleList.includes('anon')
              ? 'anon'
              : '';
          return `${cmd}|${role}`;
        })
      );

      const missing = required.filter(
        (policy) => !present.has(`${policy.command}|${policy.role}`)
      );

      if (missing.length > 0) {
        this.logger.warn('RLS policy gap detected — production may be vulnerable', {
          table,
          missingPolicies: missing.map((m) => `${m.name} (${m.command} for ${m.role})`),
        });
      }
    }
  }

  // ==================== Highlight Operations ====================

  async createHighlight(data: HighlightDataV2): Promise<void> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    this.logger.debug('Creating highlight in Supabase', { id: data.id });

    try {
      const response = (await this.withTimeout(
        this.sdkClient.from('highlights').insert({
          id: data.id,
          user_id: user.id,
          url: data.url || '', // Use URL from highlight data, not background context
          text: serializeHighlightTextForCloud(data),
          color_role: data.colorRole,
          selectors: data.ranges[0]?.selector,
          content_hash: data.contentHash,
          metadata: serializeHighlightMetadataForCloud(data.metadata),
          created_at: serializeTimestampForCloud(data.createdAt),
          updated_at: new Date().toISOString(),
        })
      )) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      this.logger.debug('Highlight created successfully', { id: data.id });
    } catch (error) {
      this.logger.error('Failed to create highlight', error as Error, { id: data.id });
      throw error;
    }
  }

  async updateHighlight(id: string, updates: Partial<HighlightDataV2>): Promise<void> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    this.logger.debug('Updating highlight', { id, fields: Object.keys(updates) });

    try {
      // Build update payload (only include provided fields)
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.text !== undefined) {
        payload['text'] = serializeHighlightTextForCloud({
          ...updates,
          text: updates.text,
        } as HighlightDataV2);
      }
      if (updates.colorRole !== undefined) payload['color_role'] = updates.colorRole;
      if (updates.contentHash !== undefined)
        payload['content_hash'] = updates.contentHash;
      if ('metadata' in updates) {
        payload['metadata'] = serializeHighlightMetadataForCloud(updates.metadata);
      }

      const response = (await this.withTimeout(
        this.sdkClient
          .from('highlights')
          .update(payload)
          .eq('id', id)
          .eq('user_id', user.id) // Ensure user owns highlight
      )) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      this.logger.debug('Highlight updated successfully', { id });
    } catch (error) {
      this.logger.error('Failed to update highlight', error as Error, { id });
      throw error;
    }
  }

  async deleteHighlight(id: string): Promise<void> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    this.logger.debug('Soft-deleting highlight', { id });

    try {
      // Soft delete: set deleted_at timestamp
      const response = (await this.withTimeout(
        this.sdkClient
          .from('highlights')
          .update({
            deleted_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
      )) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      this.logger.debug('Highlight soft-deleted successfully', { id });
    } catch (error) {
      this.logger.error('Failed to delete highlight', error as Error, { id });
      throw error;
    }
  }

  async restoreHighlight(id: string): Promise<void> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    this.logger.debug('Restoring soft-deleted highlight', { id });

    try {
      const response = (await this.withTimeout(
        this.sdkClient
          .from('highlights')
          .update({ deleted_at: null })
          .eq('id', id)
          .eq('user_id', user.id)
      )) as { error?: { message: string } | null };

      if (response.error) {
        throw this.transformError(response.error);
      }
    } catch (error) {
      this.logger.error('Failed to restore highlight', error as Error, { id });
      throw error;
    }
  }

  async softDeleteAllHighlights(): Promise<void> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    this.logger.warn('Soft-deleting ALL highlights for user', { userId: user.id });

    try {
      const response = (await this.withTimeout(
        this.sdkClient
          .from('highlights')
          .update({
            deleted_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .is('deleted_at', null) // Only update active ones
      )) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      this.logger.info('All highlights soft-deleted successfully');
    } catch (error) {
      this.logger.error('Failed to clear highlights', error as Error);
      throw error;
    }
  }

  async getHighlights(url?: string): Promise<HighlightDataV2[]> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    this.logger.debug('Fetching highlights', { url });

    try {
      let query = this.sdkClient
        .from('highlights')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null); // Exclude soft-deleted

      if (url) {
        query = query.eq('url', url);
      }

      const response = (await this.withTimeout(query)) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      // Transform Supabase rows to HighlightDataV2
      const highlights = (response.data || []).map((row: any) =>
        transformHighlightRow(row)
      );

      this.logger.debug('Highlights fetched', { count: highlights.length });
      return highlights;
    } catch (error) {
      this.logger.error('Failed to fetch highlights', error as Error, { url });
      throw error;
    }
  }

  async getHighlightsChangedSince(since: Date | null): Promise<HighlightDataV2[]> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    try {
      let query = this.sdkClient
        .from('highlights')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (since) {
        query = query.gte('updated_at', since.toISOString());
      }

      const response = (await this.withTimeout(query)) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      return (response.data || []).map((row: any) => transformHighlightRow(row));
    } catch (error) {
      this.logger.error('Failed to fetch changed highlights', error as Error);
      throw error;
    }
  }

  async getDeletedHighlightIdsSince(since: Date | null): Promise<string[]> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    try {
      let query = this.sdkClient
        .from('highlights')
        .select('id')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (since) {
        query = query.gte('deleted_at', since.toISOString());
      }

      const response = (await this.withTimeout(query)) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      return (response.data || [])
        .map((row: { id?: string }) => row.id)
        .filter((id: string | undefined): id is string => typeof id === 'string');
    } catch (error) {
      this.logger.error('Failed to fetch deleted highlight ids', error as Error);
      throw error;
    }
  }

  // ==================== Sync Operations ====================

  async pushEvents(events: SyncEvent[]): Promise<PushResult> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    this.logger.debug('Pushing events to Supabase', { count: events.length });

    try {
      // Batch insert events
      const response = (await this.withTimeout(
        this.sdkClient
          .from('sync_events')
          .insert(
            events.map((event) => ({
              event_id: event.event_id,
              user_id: event.user_id,
              type: event.type,
              data: event.data,
              timestamp: event.timestamp,
              device_id: event.device_id,
              vector_clock: event.vector_clock,
              checksum: event.checksum,
            }))
          )
          .select('event_id')
      )) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      const syncedIds = (response.data || []).map(
        (row: { event_id: string }) => row.event_id
      );
      const failedIds = events
        .map((e) => e.event_id)
        .filter((id) => !syncedIds.includes(id));

      this.logger.debug('Events pushed', {
        synced: syncedIds.length,
        failed: failedIds.length,
      });

      return {
        synced_event_ids: syncedIds,
        failed_event_ids: failedIds,
      };
    } catch (error) {
      this.logger.error('Failed to push events', error as Error, {
        count: events.length,
      });
      throw error;
    }
  }

  async pullEvents(since: number): Promise<SyncEvent[]> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    this.logger.debug('Pulling events from Supabase', { since });

    try {
      const response = (await this.withTimeout(
        this.sdkClient
          .from('sync_events')
          .select('*')
          .eq('user_id', user.id)
          .gt('timestamp', since)
          .order('timestamp', { ascending: true }) // CRITICAL: chronological order
      )) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      const events = (response.data || []) as SyncEvent[];

      this.logger.debug('Events pulled', { count: events.length });
      return events;
    } catch (error) {
      this.logger.error('Failed to pull events', error as Error, { since });
      throw error;
    }
  }

  // ==================== Collection Operations ====================

  async createCollection(name: string, description?: string): Promise<Collection> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Validate name
    if (!name || name.length === 0 || name.length > 100) {
      throw new ValidationError('Collection name must be 1-100 characters', 'name');
    }

    this.logger.debug('Creating collection', { name });

    try {
      const response = (await this.withTimeout(
        this.sdkClient
          .from('collections')
          .insert({
            user_id: user.id,
            name,
            description: description || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()
      )) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      const collection = this.transformCollectionRow(response.data);

      this.logger.debug('Collection created', { id: collection.id });
      return collection;
    } catch (error) {
      this.logger.error('Failed to create collection', error as Error, { name });
      throw error;
    }
  }

  async getCollections(): Promise<Collection[]> {
    const user = this.authManager.currentUser;
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    this.logger.debug('Fetching collections');

    try {
      const response = (await this.withTimeout(
        this.sdkClient
          .from('collections')
          .select('*, highlights(count)')
          .eq('user_id', user.id)
      )) as any;

      if (response.error) {
        throw this.transformError(response.error);
      }

      const collections = (response.data || []).map((row: any) =>
        this.transformCollectionRow(row)
      );

      this.logger.debug('Collections fetched', { count: collections.length });
      return collections;
    } catch (error) {
      this.logger.error('Failed to fetch collections', error as Error);
      throw error;
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Add timeout to Supabase query
   */
  private async withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(this.timeoutMs)), this.timeoutMs)
    );

    return Promise.race([promise, timeout]);
  }

  /**
   * Transform Supabase error to domain error
   * @deprecated Use APIErrorHandler.handle() instead
   */
  private transformError(error: any): APIError {
    return APIErrorHandler.handle(error);
  }

  /**
   * Transform Supabase collection row to Collection
   */
  private transformCollectionRow(row: any): Collection {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      highlight_count: row.highlights?.[0]?.count || 0,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
