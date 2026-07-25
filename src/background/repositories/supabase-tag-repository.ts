/**
 * @file supabase-tag-repository.ts
 * @description Cloud implementation of ITagRepository via Supabase tables.
 */

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { SupabaseClient } from '@/background/api/supabase-client';
import type { ITagRepository } from '@/shared/repositories/i-tag-repository';
import type { TagEntity } from '@/shared/types/tag-entity';
import { normalizeHighlightTags } from '@/shared/utils/highlight-metadata';
import type { ILogger } from '@/shared/utils/logger';

export class SupabaseTagRepository implements ITagRepository {
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly authManager: IAuthManager,
    private readonly logger: ILogger,
  ) {}

  private getUserId(): string | null {
    return this.authManager.currentUser?.id ?? null;
  }

  async listAll(): Promise<TagEntity[]> {
    const userId = this.getUserId();
    if (!userId) return [];

    const { data, error } = await this.supabaseClient.supabase
      .from('tags')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      this.logger.error('[SupabaseTagRepo] listAll failed', error);
      throw error;
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: new Date(row.created_at),
    }));
  }

  async getLabelsForHighlight(highlightId: string): Promise<string[]> {
    const map = await this.getLabelsForHighlights([highlightId]);
    return map.get(highlightId) ?? [];
  }

  async getLabelsForHighlights(highlightIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (highlightIds.length === 0) return result;

    const userId = this.getUserId();
    if (!userId) return result;

    const { data, error } = await this.supabaseClient.supabase
      .from('highlight_tags')
      .select('highlight_id, tags!inner(name)')
      .eq('user_id', userId)
      .in('highlight_id', highlightIds);

    if (error) {
      this.logger.error('[SupabaseTagRepo] getLabelsForHighlights failed', error);
      throw error;
    }

    for (const row of data ?? []) {
      const highlightId = row.highlight_id as string;
      const tagRow = row.tags as { name: string } | { name: string }[] | null;
      const name = Array.isArray(tagRow) ? tagRow[0]?.name : tagRow?.name;
      if (!name) continue;
      const existing = result.get(highlightId) ?? [];
      existing.push(name);
      result.set(highlightId, existing);
    }

    for (const [id, names] of result) {
      result.set(id, normalizeHighlightTags(names));
    }

    return result;
  }

  async setHighlightLabels(highlightId: string, names: string[]): Promise<void> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const normalized = normalizeHighlightTags(names);
    const client = this.supabaseClient.supabase;

    const tagIds: string[] = [];
    for (const name of normalized) {
      const { data, error } = await client
        .from('tags')
        .upsert({ user_id: userId, name }, { onConflict: 'user_id,name', ignoreDuplicates: false })
        .select('id')
        .single();

      if (error) {
        const { data: existing, error: findError } = await client
          .from('tags')
          .select('id')
          .eq('user_id', userId)
          .eq('name', name)
          .maybeSingle();

        if (findError || !existing) {
          this.logger.error('[SupabaseTagRepo] upsert tag failed', error);
          throw error;
        }
        tagIds.push(existing.id);
      } else if (data) {
        tagIds.push(data.id);
      }
    }

    const { error: deleteError } = await client
      .from('highlight_tags')
      .delete()
      .eq('highlight_id', highlightId)
      .eq('user_id', userId);

    if (deleteError) {
      this.logger.error('[SupabaseTagRepo] delete junction failed', deleteError);
      throw deleteError;
    }

    if (tagIds.length === 0) return;

    const rows = tagIds.map((tagId) => ({
      highlight_id: highlightId,
      tag_id: tagId,
      user_id: userId,
    }));

    const { error: insertError } = await client.from('highlight_tags').insert(rows);
    if (insertError) {
      this.logger.error('[SupabaseTagRepo] insert junction failed', insertError);
      throw insertError;
    }

    this.logger.debug('[SupabaseTagRepo] setHighlightLabels', { highlightId, count: normalized.length });
  }
}
