/**
 * @file tag-query-web.ts
 * @description Web-app Supabase helpers for normalized highlight labels.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { TagEntity } from '@/shared/types/tag-entity';
import { mergeHighlightLabels, normalizeHighlightTags } from '@/shared/utils/highlight-metadata';

export async function fetchUserTagsWeb(supabase: SupabaseClient, userId: string): Promise<TagEntity[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at),
  }));
}

export async function fetchHighlightLabelsWeb(
  supabase: SupabaseClient,
  userId: string,
  highlightIds: string[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (highlightIds.length === 0) return result;

  const { data, error } = await supabase
    .from('highlight_tags')
    .select('highlight_id, tags!inner(name)')
    .eq('user_id', userId)
    .in('highlight_id', highlightIds);

  if (error) throw error;

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

export async function setHighlightLabelsWeb(
  supabase: SupabaseClient,
  userId: string,
  highlightId: string,
  names: string[],
): Promise<void> {
  const normalized = normalizeHighlightTags(names);
  const tagIds: string[] = [];

  for (const name of normalized) {
    const { data, error } = await supabase
      .from('tags')
      .upsert({ user_id: userId, name }, { onConflict: 'user_id,name' })
      .select('id')
      .single();

    if (error || !data) {
      const { data: existing, error: findError } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', userId)
        .eq('name', name)
        .maybeSingle();
      if (findError || !existing) throw error ?? findError;
      tagIds.push(existing.id);
    } else {
      tagIds.push(data.id);
    }
  }

  const { error: deleteError } = await supabase
    .from('highlight_tags')
    .delete()
    .eq('highlight_id', highlightId)
    .eq('user_id', userId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;

  const { error: insertError } = await supabase.from('highlight_tags').insert(
    tagIds.map((tagId) => ({
      highlight_id: highlightId,
      tag_id: tagId,
      user_id: userId,
    })),
  );
  if (insertError) throw insertError;
}

export function mergeLabelsForHighlight(
  junctionLabels: string[] | undefined,
  metadataTags: string[] | undefined,
): string[] | undefined {
  return mergeHighlightLabels(junctionLabels, metadataTags);
}
