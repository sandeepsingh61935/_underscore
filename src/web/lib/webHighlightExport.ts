/**
 * Map web library rows to shared export pipeline (md / xlsx).
 * No extension IPC — pure client-side from in-memory WebHighlight[].
 */

import {
  buildScopedExport,
  downloadBinaryFile,
  downloadTextFile,
  type ExportFormat,
  type ExportableHighlight,
  type ExportScope,
} from '@/shared/highlight-export';
import type { WebHighlight } from '@/web/lib/aggregateLibrary';

export function webHighlightToExportable(h: WebHighlight): ExportableHighlight {
  const path = h.path || '/';
  return {
    id: h.id,
    text: h.quote,
    url: `https://${h.domain}${path.startsWith('/') ? path : `/${path}`}`,
    domain: h.domain,
    sectionKey: path,
    createdAt: new Date(h.savedAt),
    tags: h.tags,
    note: h.note || undefined,
  };
}

export function exportScopeFromSelection(opts: {
  domain: string | null;
  section: string | null;
}): ExportScope {
  if (opts.domain && opts.section) {
    return { kind: 'section', domain: opts.domain, sectionKey: opts.section };
  }
  if (opts.domain) {
    return { kind: 'domain', domain: opts.domain };
  }
  return { kind: 'library' };
}

export function exportWebHighlights(
  rows: WebHighlight[],
  format: ExportFormat,
  scope: ExportScope = { kind: 'library' }
): void {
  if (rows.length === 0) return;
  const exportable = rows.map(webHighlightToExportable);
  const result = buildScopedExport(exportable, scope, format);
  if (format === 'xlsx' && result.xlsxBuffer) {
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
