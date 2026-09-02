/**
 * @file useHighlightExport.ts
 * @description Hook for scoped highlight export (markdown and spreadsheet).
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
  buildScopedExport,
  copyTextToClipboard,
  downloadBinaryFile,
  downloadTextFile,
  partitionExportable,
  toExportableHighlight,
  type ExportableHighlight,
  type ExportFormat,
  type ExportScope,
} from '@/shared/highlight-export';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { bundleArtifactsForExport } from '@/shared/llm/llm-artifact-service';
import { loadAllLlmArtifacts } from '@/shared/llm/llm-artifact-store';
import { GET_EXPORTABLE_HIGHLIGHTS } from '@/shared/schemas/message-schemas';

/** Scopes where file export is allowed in the UI. */
export type ExportViewScope =
  | { kind: 'library' }
  | { kind: 'domain'; domain: string }
  | { kind: 'section'; domain: string; sectionKey: string };

/**
 * True only inside an extension page (popup/sidepanel/options) where IPC works.
 * Plain web app origins must return false even if a chrome stub is injected.
 */
export function isExtensionContext(): boolean {
  try {
    if (typeof window !== 'undefined') {
      const proto = window.location?.protocol ?? '';
      // Web app (http/https) always uses Supabase paths — never chrome.runtime IPC.
      if (proto === 'http:' || proto === 'https:') return false;
    }
    return (
      typeof chrome !== 'undefined' &&
      typeof chrome.runtime !== 'undefined' &&
      chrome.runtime.id !== undefined &&
      typeof chrome.runtime.sendMessage === 'function'
    );
  } catch {
    return false;
  }
}

/** Copies plain highlight text to the clipboard (per-highlight action). */
export async function copyHighlightPlainText(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    await copyTextToClipboard(trimmed);
    toast.success('Copied to clipboard');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Copy failed');
  }
}

interface ExportableHighlightPayload {
  id: string;
  text: string;
  url: string;
  domain: string;
  sectionKey: string;
  createdAt: string;
  tags?: string[];
  note?: string;
}

export type FetchExportableHighlights = (
  scope: ExportScope
) => Promise<ExportableHighlight[]>;

function mapPayload(items: ExportableHighlightPayload[]): ExportableHighlight[] {
  return items.map((item) => ({
    id: item.id,
    text: item.text,
    url: item.url,
    domain: item.domain,
    sectionKey: item.sectionKey,
    createdAt: new Date(item.createdAt),
    tags: item.tags,
    note: item.note,
  }));
}

export async function fetchExportableHighlightsWeb(
  scope: ExportScope
): Promise<ExportableHighlight[]> {
  const { getWebSupabaseClient } = await import('@/shared/auth/supabase-web-client');
  const supabase = getWebSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return [];

  let query = supabase
    .from('highlights')
    .select('id, url, text, metadata, created_at')
    .eq('user_id', session.user.id)
    .is('deleted_at', null);

  if (scope.kind === 'domain') {
    query = query.ilike('url', `%${scope.domain}%`);
  } else if (scope.kind === 'highlight') {
    query = query.eq('id', scope.highlightId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const mapped = (data ?? [])
    .map((row) => {
      const metadata = row.metadata as { notes?: string; tags?: string[] } | null;
      return toExportableHighlight({
        id: row.id,
        text: row.text ?? '',
        url: row.url ?? '',
        contentHash: '',
        colorRole: 'yellow',
        type: 'underscore',
        ranges: [],
        createdAt: new Date(row.created_at ?? Date.now()),
        metadata: metadata
          ? { source: 'sync', notes: metadata.notes, tags: metadata.tags }
          : undefined,
      });
    })
    .filter((item): item is ExportableHighlight => item !== null);

  if (scope.kind === 'section') {
    return mapped.filter(
      (item) => item.domain === scope.domain && item.sectionKey === scope.sectionKey
    );
  }

  if (scope.kind === 'highlight') {
    return mapped.filter((item) => item.id === scope.highlightId);
  }

  if (scope.kind === 'domain') {
    return mapped.filter((item) => item.domain === scope.domain);
  }

  return mapped;
}

function deliverExport(result: ReturnType<typeof buildScopedExport>): void {
  if (result.format === 'xlsx' && result.xlsxBuffer) {
    downloadBinaryFile(
      result.filename,
      result.xlsxBuffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return;
  }

  if (result.markdown) {
    downloadTextFile(result.filename, result.markdown);
  }
}

export async function executeHighlightExport(
  scope: ExportScope,
  fetchHighlights: FetchExportableHighlights,
  format: ExportFormat = 'md'
): Promise<boolean> {
  const highlights = await fetchHighlights(scope);
  const { included } = partitionExportable(highlights);

  if (included.length === 0) {
    toast.error('No highlights available to export in this scope');
    return false;
  }

  const allArtifacts = await loadAllLlmArtifacts();
  const artifacts = bundleArtifactsForExport(allArtifacts, scope);
  const result = buildScopedExport(highlights, scope, format, artifacts);
  deliverExport(result);
  toast.success('Download started');
  return true;
}

export interface UseHighlightExportResult {
  exportFile: (format: ExportFormat) => Promise<void>;
  isBusy: boolean;
  canExport: boolean;
}

export function useHighlightExport(
  scope: ExportViewScope,
  options?: { enabled?: boolean }
): UseHighlightExportResult {
  const enabled = options?.enabled ?? true;
  const [isBusy, setIsBusy] = useState(false);

  const getExportableAction = useIpcAction<
    { scope: ExportScope },
    { highlights: ExportableHighlightPayload[] }
  >(GET_EXPORTABLE_HIGHLIGHTS);

  const fetchHighlights = useCallback<FetchExportableHighlights>(
    async (fetchScope) => {
      if (isExtensionContext()) {
        const result = await getExportableAction({ scope: fetchScope });
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch highlights for export');
        }
        if (!result.data) {
          throw new Error('Failed to fetch highlights for export');
        }
        return mapPayload(result.data.highlights);
      }
      return fetchExportableHighlightsWeb(fetchScope);
    },
    [getExportableAction]
  );

  const exportFile = useCallback(
    async (format: ExportFormat) => {
      if (!enabled || isBusy) return;

      setIsBusy(true);
      try {
        await executeHighlightExport(scope, fetchHighlights, format);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Export failed');
      } finally {
        setIsBusy(false);
      }
    },
    [enabled, isBusy, fetchHighlights, scope]
  );

  return {
    exportFile,
    isBusy,
    canExport: enabled,
  };
}
