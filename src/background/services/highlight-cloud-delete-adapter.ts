import type { SupabaseClient } from '@/background/api/supabase-client';
import type { HighlightCloudDeletePort } from '@/background/services/highlight-delete-service';

/** Cloud soft-delete adapter for HighlightDeleteService (Pro / signed-in). */
export class HighlightCloudDeleteAdapter implements HighlightCloudDeletePort {
  constructor(private readonly supabaseClient: SupabaseClient) {}

  deleteHighlight(id: string): Promise<void> {
    return this.supabaseClient.deleteHighlight(id);
  }

  restoreHighlight(id: string): Promise<void> {
    return this.supabaseClient.restoreHighlight(id);
  }

  softDeleteAllHighlights(): Promise<void> {
    return this.supabaseClient.softDeleteAllHighlights();
  }
}
