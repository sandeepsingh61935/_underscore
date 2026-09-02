/**
 * @file types.ts
 * @description Scope and DTO types for highlight copy/export.
 */

export type ExportFormat = 'md' | 'xlsx';

export type ExportScope =
  | { kind: 'library' }
  | { kind: 'domain'; domain: string }
  | { kind: 'section'; domain: string; sectionKey: string }
  | { kind: 'highlight'; highlightId: string };

export interface ExportableHighlight {
  id: string;
  text: string;
  url: string;
  domain: string;
  sectionKey: string;
  createdAt: Date;
  tags?: string[];
  note?: string;
}

export interface ExportStats {
  included: number;
  omitted: number;
  domains: number;
}

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  stats: ExportStats;
  markdown?: string;
  xlsxBuffer?: ArrayBuffer;
}
