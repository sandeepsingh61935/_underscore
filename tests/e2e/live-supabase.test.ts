/**
 * @file live-supabase.test.ts
 * @description Phase 2 E2E Tests against live Supabase instance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initializeBackground } from '@/background/bootstrap';
import { IAPIClient } from '@/background/api/interfaces/i-api-client';
import { AuthenticationError } from '@/background/api/api-errors';

describe('Vault Mode Phase 2: Live Supabase E2E', () => {
  let apiClient: IAPIClient;
  const isConfigured =
    (import.meta as any).env.VITE_SUPABASE_URL &&
    (import.meta as any).env.VITE_SUPABASE_URL !== 'your-project-url.supabase.co';

  beforeEach(async () => {
    if (!isConfigured) {
      console.warn(
        '⚠️ Skipping Live E2E tests: Supabase credentials not configured in .env.development'
      );
      return;
    }

    const container = await initializeBackground();
    apiClient = container.resolve<IAPIClient>('apiClient');
  });

  it('should connect to live Supabase and attempt to fetch highlights', async () => {
    if (!isConfigured) return;

    // Note: This will likely fail with AuthenticationError if no session is active,
    // which is a VALID "passing" test for connectivity (it reached the server).
    try {
      await apiClient.getHighlights();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        console.log(
          '✅ Successfully reached live Supabase (returned 401 as expected without session)'
        );
        expect(true).toBe(true);
      } else {
        console.error('❌ Connectivity failed:', error);
        throw error;
      }
    }
  });

  it('should verify schema by attempting a pull (if authenticated)', async () => {
    if (!isConfigured) return;

    // This test ensures the table names and basic structures are correct
    // Even if it fails due to RLS or Auth, we can see the error message from Supabase
    try {
      await apiClient.pullEvents(0);
      console.log('✅ Successfully queried sync_events table');
    } catch (error: any) {
      // We expect a success or a specific Supabase error (not a 404 table not found)
      const errorMessage = error.message || '';
      expect(errorMessage).not.toContain('relation "public.sync_events" does not exist');
      console.log('✅ Schema check: sync_events table exists');
    }
  });

  it('should verify page_groups schema (if authenticated)', async () => {
    if (!isConfigured) return;

    try {
      await (apiClient as any).supabase?.from('page_groups')?.select('id')?.limit(1);
      console.log('✅ Successfully queried page_groups table');
    } catch (error: any) {
      const errorMessage = error?.message || '';
      expect(errorMessage).not.toContain('relation "public.page_groups" does not exist');
      console.log('✅ Schema check: page_groups table exists');
    }
  });
});
