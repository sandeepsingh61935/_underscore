/**
 * @file run-script.ts
 * @description Test helper: invokes scripts/check-legacy-ds.sh against a directory and
 *   returns a structured result (exitCode, stdout, stderr) for assertions.
 *
 * Each test copies a single fixture category into a fresh tmp dir, runs the script,
 * and asserts: (a) the script exits non-zero (violation present) and (b) the output
 * names the category and the violating file/line.
 */
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../..');
const SCRIPT = join(REPO_ROOT, 'scripts/check-legacy-ds.sh');

export interface ScriptResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  /** Path (relative to repo root) of a fixture dir to copy into the scratch. */
  fixture?: string;
  /** Extra files to add to the scratch dir after the fixture copy. */
  extraFiles?: Record<string, string>;
  /** Args to pass to the script. Defaults to [scratchDir]. */
  scriptArgs?: string[];
  /** Timeout in ms. Default 30s. */
  timeoutMs?: number;
}

/**
 * Run the harness script against a fresh scratch directory.
 *
 * The scratch dir starts empty; the fixture (if provided) is copied to its root.
 * This isolates each test from the real src/ tree.
 */
export async function runHarness(opts: RunOptions = {}): Promise<ScriptResult> {
  const scratch = await mkdtemp(join(tmpdir(), 'harness-'));
  try {
    if (opts.fixture) {
      const src = join(__dirname, 'fixtures', opts.fixture);
      await cp(src, scratch, { recursive: true });
    }
    if (opts.extraFiles) {
      for (const [relPath, content] of Object.entries(opts.extraFiles)) {
        const abs = join(scratch, relPath);
        await mkdir(join(abs, '..'), { recursive: true });
        await writeFile(abs, content);
      }
    }

    const args = opts.scriptArgs ?? [scratch];
    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    try {
      stdout = execFileSync('bash', [SCRIPT, ...args], {
        encoding: 'utf8',
        timeout: opts.timeoutMs ?? 30_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err: unknown) {
      const e = err as { status?: number; stdout?: string; stderr?: string };
      exitCode = typeof e.status === 'number' ? e.status : 1;
      stdout = e.stdout ?? '';
      stderr = e.stderr ?? '';
    }
    return { exitCode, stdout, stderr };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
