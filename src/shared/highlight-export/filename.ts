/**
 * @file filename.ts
 * @description Derive download filenames from export scope.
 */

import type { ExportFormat, ExportScope } from './types';

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .replace(/^\/+/, '')
      .replace(/[<>:"/\\|?*\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'section'
  );
}

export function buildFilename(scope: ExportScope, format: ExportFormat = 'md'): string {
  const date = new Date().toISOString().slice(0, 10);
  const ext = format === 'xlsx' ? 'xlsx' : 'md';

  switch (scope.kind) {
    case 'library':
      return `underscore-highlights-${date}.${ext}`;
    case 'domain':
      return `${sanitizeFilenamePart(scope.domain)}-highlights.${ext}`;
    case 'section':
      return `${sanitizeFilenamePart(scope.sectionKey)}.${ext}`;
    case 'highlight':
      return `highlight-${scope.highlightId.slice(0, 8)}.${ext}`;
  }
}
