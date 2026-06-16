/**
 * @file layer-8-storybook-purge.test.ts
 * @description Acceptance tests for Layer 8 — Storybook Deletion.
 *
 * These tests verify the observable file-system state that proves Storybook
 * infrastructure has been fully removed. They exercise the public surface of the
 * deletion (directory presence, file counts) rather than the mechanism (git rm).
 *
 * Shell acceptance criteria from the PRD (§ Testing Decisions):
 *   - find src -name '*.stories.tsx' | wc -l  → 0
 *   - .storybook/ directory does not exist
 *   - storybook-static/ directory does not exist
 *
 * Run with: npx vitest run tests/unit/harness/layer-8-storybook-purge.test.ts
 */
import { access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '../../..');
const SRC_ROOT = join(REPO_ROOT, 'src');

// ---------------------------------------------------------------------------
// Helper: run `find` and return matching paths.
// ---------------------------------------------------------------------------
function findFiles(dir: string, name: string): string[] {
  try {
    const output = execFileSync('find', [dir, '-name', name], {
      encoding: 'utf8',
      timeout: 15_000,
    });
    return output
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Helper: resolves if a path exists on disk, rejects otherwise.
// ---------------------------------------------------------------------------
async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Layer 8 acceptance tests
// ---------------------------------------------------------------------------
describe('Layer 8 — Storybook Deletion: file-system acceptance criteria', () => {
  it('1. no *.stories.tsx files remain anywhere under src/', () => {
    const found = findFiles(SRC_ROOT, '*.stories.tsx');
    expect(found, `Found story files: ${found.join(', ')}`).toHaveLength(0);
  });

  it('2. .storybook/ config directory has been deleted', async () => {
    const exists = await pathExists(join(REPO_ROOT, '.storybook'));
    expect(exists, '.storybook/ directory still exists').toBe(false);
  });

  it('3. storybook-static/ build artifact directory has been deleted', async () => {
    const exists = await pathExists(join(REPO_ROOT, 'storybook-static'));
    expect(exists, 'storybook-static/ directory still exists').toBe(false);
  });

  it('4. package.json has no storybook or chromatic references', async () => {
    const { readFile } = await import('node:fs/promises');
    const pkg = await readFile(join(REPO_ROOT, 'package.json'), 'utf8');
    expect(pkg).not.toMatch(/storybook/i);
    expect(pkg).not.toMatch(/chromatic/i);
  });
});

describe('Layer 8 — ESLint guard: no-storybook-files rule', () => {
  it('5. eslint.config.js does not import eslint-plugin-storybook', async () => {
    const { readFile } = await import('node:fs/promises');
    const config = await readFile(join(REPO_ROOT, 'eslint.config.js'), 'utf8');
    expect(config).not.toMatch(/eslint-plugin-storybook/);
    expect(config).not.toMatch(/flat\/recommended/);
  });

  it('6. eslint.config.js contains the no-storybook-files guard rule', async () => {
    const { readFile } = await import('node:fs/promises');
    const config = await readFile(join(REPO_ROOT, 'eslint.config.js'), 'utf8');
    expect(config).toMatch(/no-storybook-files|stories/);
    expect(config).toMatch(/\.stories\./);
  });
});

describe('Layer 8 — Agent guidance: Storybook references cleaned up', () => {
  it('7. tests/visual/components.spec.ts has been deleted (Storybook-dependent visual tests)', async () => {
    const exists = await pathExists(join(REPO_ROOT, 'tests/visual/components.spec.ts'));
    expect(exists, 'tests/visual/components.spec.ts still exists').toBe(false);
  });
});
