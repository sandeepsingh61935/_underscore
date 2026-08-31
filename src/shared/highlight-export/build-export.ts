/**
 * @file build-export.ts
 * @description Dispatch highlight export to markdown or spreadsheet builders.
 */

import { buildMarkdownExport } from './format-markdown';
import { buildXlsxExport } from './format-xlsx';
import type {
  ExportableHighlight,
  ExportFormat,
  ExportResult,
  ExportScope,
} from './types';

import type { ExportArtifactsBundle } from '@/shared/llm/llm-artifact-service';

export function buildScopedExport(
  highlights: ExportableHighlight[],
  scope: ExportScope,
  format: ExportFormat,
  artifacts?: ExportArtifactsBundle
): ExportResult {
  if (format === 'xlsx') {
    return buildXlsxExport(highlights, scope, artifacts);
  }
  return buildMarkdownExport(highlights, scope, artifacts);
}
