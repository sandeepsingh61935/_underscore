/**
 * @file format-xlsx.ts
 * @description Spreadsheet export for highlights and saved LLM artifacts.
 */

import * as XLSX from 'xlsx';

import type { ExportArtifactsBundle } from '@/shared/llm/llm-artifact-service';

import { buildFilename } from './filename';
import { partitionExportable } from './normalize';
import type { ExportableHighlight, ExportResult, ExportScope, ExportStats } from './types';

const HIGHLIGHT_HEADERS = ['#', 'Quote', 'Date', 'Source', 'Domain', 'Section', 'Tags', 'Note'];
const ARTIFACT_HEADERS = ['Kind', 'Generated', 'Question', 'Content'];

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildStats(highlights: ExportableHighlight[], omitted: number): ExportStats {
  const domains = new Set(highlights.map((h) => h.domain)).size;
  return { included: highlights.length, omitted, domains };
}

function sectionLabel(sectionKey: string): string {
  return sectionKey === '/' ? 'Home' : sectionKey;
}

function buildArtifactRows(artifacts?: ExportArtifactsBundle): string[][] {
  if (!artifacts) return [];
  const rows: string[][] = [];

  if (artifacts.domainSynthesis?.content.trim()) {
    rows.push([
      'Domain synthesis',
      artifacts.domainSynthesis.updatedAt.slice(0, 10),
      '',
      artifacts.domainSynthesis.content.trim(),
    ]);
  }

  if (artifacts.sectionSummary?.content.trim()) {
    rows.push([
      'Section summary',
      artifacts.sectionSummary.updatedAt.slice(0, 10),
      '',
      artifacts.sectionSummary.content.trim(),
    ]);
  }

  for (const qa of artifacts.scopeQueries) {
    rows.push([
      'Scope question',
      qa.updatedAt.slice(0, 10),
      qa.question ?? '',
      qa.content.trim(),
    ]);
  }

  return rows;
}

function sortedHighlights(highlights: ExportableHighlight[]): ExportableHighlight[] {
  return [...highlights].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function buildXlsxExport(
  highlights: ExportableHighlight[],
  scope: ExportScope,
  artifacts?: ExportArtifactsBundle,
): ExportResult {
  const { included, omitted } = partitionExportable(highlights);
  const exportable = included.length > 0 ? included : highlights.filter((h) => h.text.trim());
  const sorted = sortedHighlights(exportable);

  const highlightRows = sorted.map((h, index) => [
    index + 1,
    h.text,
    formatDate(h.createdAt),
    h.url,
    h.domain,
    sectionLabel(h.sectionKey),
    h.tags?.join(', ') ?? '',
    h.note ?? '',
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([HIGHLIGHT_HEADERS, ...highlightRows]),
    'Highlights',
  );

  const artifactRows = buildArtifactRows(artifacts);
  if (artifactRows.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([ARTIFACT_HEADERS, ...artifactRows]),
      'LLM',
    );
  }

  const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;

  return {
    format: 'xlsx',
    filename: buildFilename(scope, 'xlsx'),
    stats: buildStats(included, omitted),
    xlsxBuffer,
  };
}
