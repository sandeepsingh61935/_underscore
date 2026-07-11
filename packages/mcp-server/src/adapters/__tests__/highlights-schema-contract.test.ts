import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { HIGHLIGHTS_SELECT_COLUMNS } from '../cloud-highlight-text.js';
import {
  DEPRECATED_HIGHLIGHT_COLUMNS,
  HIGHLIGHTS_CLOUD_COLUMNS,
  parseSelectColumns,
  REQUIRED_HIGHLIGHTS_MIGRATION_COLUMNS,
} from '../highlights-schema-contract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const adapterSource = readFileSync(join(__dirname, '../supabase-adapter.ts'), 'utf8');
const migrationSql = readFileSync(
  join(__dirname, '../../../../../supabase/migrations/20260711170000_highlights_metadata_and_schema_align.sql'),
  'utf8',
);

describe('highlights schema contract', () => {
  const selectColumns = parseSelectColumns(HIGHLIGHTS_SELECT_COLUMNS);

  it('excludes deprecated top-level columns from HIGHLIGHTS_SELECT_COLUMNS', () => {
    for (const deprecated of DEPRECATED_HIGHLIGHT_COLUMNS) {
      expect(selectColumns).not.toContain(deprecated);
    }
  });

  it('includes only canonical columns from highlights-schema.md', () => {
    for (const column of selectColumns) {
      expect(HIGHLIGHTS_CLOUD_COLUMNS).toContain(column);
    }
  });

  it('includes metadata (post-migration requirement for notes/tags)', () => {
    expect(selectColumns).toContain('metadata');
  });

  it('includes every migration-required column used by MCP reads', () => {
    for (const column of REQUIRED_HIGHLIGHTS_MIGRATION_COLUMNS) {
      expect(selectColumns).toContain(column);
    }
  });

  it('uses HIGHLIGHTS_SELECT_COLUMNS for every supabase-adapter .select() call', () => {
    const selectCalls = [...adapterSource.matchAll(/\.select\(([^)]+)\)/g)];
    expect(selectCalls.length).toBeGreaterThan(0);

    for (const match of selectCalls) {
      expect(match[1]?.trim()).toBe('HIGHLIGHTS_SELECT_COLUMNS');
    }
  });

  it('does not reference deprecated columns in supabase-adapter source', () => {
    for (const deprecated of DEPRECATED_HIGHLIGHT_COLUMNS) {
      expect(adapterSource).not.toContain(`'${deprecated}'`);
      expect(adapterSource).not.toContain(`"${deprecated}"`);
    }
  });

  it('migration ADD COLUMN statements cover non-core SELECT columns', () => {
    const coreColumns = new Set(['id', 'url', 'text', 'created_at', 'updated_at']);
    const migrationOnlyColumns = selectColumns.filter((column) => !coreColumns.has(column));

    const addColumnMatches = [
      ...migrationSql.matchAll(/ADD COLUMN IF NOT EXISTS\s+(\w+)/gi),
    ].map((match) => match[1]);

    for (const column of migrationOnlyColumns) {
      expect(addColumnMatches).toContain(column);
    }
  });
});
