/**
 * @file types.ts
 * @description Scope and DTO types for highlight copy/export.
 */

import type { ColorRole } from '@/shared/schemas/highlight-schema';

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
  colorRole: ColorRole;
  createdAt: Date;
  tags?: string[];
  note?: string;
  decryptionStatus?: 'vault_locked' | 'failed';
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
