/**
 * @file supabase-highlight-row.ts
 * @description Map Supabase `highlights` rows to HighlightDataV2.
 */

import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import {
  normalizeHighlightTags,
  sanitizeHighlightNote,
} from '@/shared/utils/highlight-metadata';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';
import { normalizePresentation } from '@/shared/utils/highlight-presentation';

export interface SupabaseHighlightMetadata {
  notes?: string;
  tags?: string[];
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation;
}

export interface SupabaseHighlightRow {
  id: string;
  user_id?: string;
  url?: string;
  text?: string;
  color_role?: string;
  content_hash?: string;
  selectors?: unknown;
  metadata?: SupabaseHighlightMetadata | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export function serializeHighlightMetadataForCloud(
  metadata: SupabaseHighlightMetadata | undefined,
): SupabaseHighlightMetadata | null {
  if (!metadata) return null;

  const notes = metadata.notes !== undefined ? sanitizeHighlightNote(metadata.notes) : undefined;
  const tags = metadata.tags !== undefined ? normalizeHighlightTags(metadata.tags) : undefined;
  const sourceKind = metadata.sourceKind === 'code' ? 'code' : undefined;
  const language =
    typeof metadata.language === 'string' && metadata.language.trim()
      ? metadata.language.trim().slice(0, 32).toLowerCase()
      : undefined;
  const presentation = normalizePresentation(metadata.presentation);

  if (!notes && (!tags || tags.length === 0) && !sourceKind && !presentation) {
    return null;
  }

  return {
    ...(notes ? { notes } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    ...(sourceKind ? { sourceKind } : {}),
    ...(language ? { language } : {}),
    ...(presentation ? { presentation } : {}),
  };
}

export function serializeHighlightTextForCloud(data: HighlightDataV2): string {
  return data.text;
}

/** IndexedDB and IPC may leave timestamps as ISO strings instead of Date. */
export function serializeTimestampForCloud(value: Date | string | number | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

export function parseHighlightTextFromCloud(rawText: string | undefined | null): {
  text: string;
} {
  return { text: rawText ?? '' };
}

export function transformHighlightRow(row: SupabaseHighlightRow): HighlightDataV2 {
  const { text } = parseHighlightTextFromCloud(row.text);
  const selector = row.selectors as HighlightDataV2['ranges'][number]['selector'] | null | undefined;
  const cloudMetadata = serializeHighlightMetadataForCloud(row.metadata ?? undefined);

  return {
    id: row.id,
    userId: row.user_id,
    url: row.url ?? '',
    text,
    contentHash: row.content_hash ?? '',
    colorRole: (row.color_role ?? 'yellow') as HighlightDataV2['colorRole'],
    type: 'underscore',
    ranges: [
      {
        xpath: '',
        startOffset: 0,
        endOffset: text.length,
        text,
        textBefore: '',
        textAfter: '',
        selector: selector?.type === 'TextQuoteSelector' ? selector : undefined,
      },
    ],
    createdAt: new Date(row.created_at ?? Date.now()),
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    metadata: cloudMetadata
      ? {
          source: 'sync' as const,
          ...(cloudMetadata.notes ? { notes: cloudMetadata.notes } : {}),
          ...(cloudMetadata.tags && cloudMetadata.tags.length > 0
            ? { tags: cloudMetadata.tags }
            : {}),
          ...(cloudMetadata.sourceKind === 'code'
            ? { sourceKind: 'code' as const }
            : {}),
          ...(cloudMetadata.language ? { language: cloudMetadata.language } : {}),
          ...(cloudMetadata.presentation
            ? { presentation: cloudMetadata.presentation }
            : {}),
        }
      : undefined,
  };
}

export function isHighlightRowSoftDeleted(row: SupabaseHighlightRow): boolean {
  return row.deleted_at != null && row.deleted_at !== '';
}

export function getHighlightRowUpdatedTime(row: SupabaseHighlightRow): number {
  if (row.updated_at) {
    return new Date(row.updated_at).getTime();
  }
  if (row.created_at) {
    return new Date(row.created_at).getTime();
  }
  return 0;
}

export function isRemoteHighlightNewer(
  remote: HighlightDataV2,
  local: HighlightDataV2 | null | undefined
): boolean {
  if (!local) {
    return true;
  }

  const remoteTs = remote.updatedAt?.getTime() ?? new Date(remote.createdAt).getTime();
  const localTs = local.updatedAt?.getTime() ?? new Date(local.createdAt).getTime();
  return remoteTs > localTs;
}
