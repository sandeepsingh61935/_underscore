/**
 * @file vault-sync-service.ts
 * @description Local Vault Mirror Sync service via HTML5 File System Access API.
 * Pure web-only module: isolates file system writing and markdown generation.
 */

import { openDB } from 'idb';

import {
  formatHighlightBlock,
  type ExportableHighlight,
} from '@/shared/highlight-export';
import { cleanSearchParams } from '@/shared/utils/normalize-page-url';
import { buildTextFragmentUrl } from '@/shared/utils/text-fragment';

export interface VaultHighlightItem {
  id?: string;
  domain: string;
  url?: string;
  path?: string;
  title?: string;
  quote?: string;
  text?: string;
  note?: string;
  tags?: string[];
  savedAt?: number;
  createdAt?: Date | string | number;
  updatedAt?: Date | string | number;
  selector?: {
    exact?: string;
    prefix?: string;
    suffix?: string;
  };
}

export interface VaultFilePath {
  folder: string;
  filename: string;
}

export interface ObsidianFrontmatterOptions {
  title: string;
  url: string;
  source: string;
  domain: string;
  tags: string[];
  updated: string;
  highlightCount: number;
}

export interface VaultPageMarkdownOptions {
  title: string;
  url: string;
  domain: string;
  highlights: ExportableHighlight[];
  updated?: string;
}

const OS_RESTRICTED_REGEX = /[/\\?%*:|"<>]/g;

/**
 * Strip OS-restricted characters and normalize to safe slug.
 */
export function sanitizeFileSlug(raw: string): string {
  return raw
    .replace(OS_RESTRICTED_REGEX, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Derives folder and file name for vault mirror sync.
 * Folder: domain (sanitized).
 * Filename: slugified path + meaningful query, up to 100 characters + .md.
 */
export function getVaultFilePath(item: VaultHighlightItem): VaultFilePath {
  const rawDomain = item.domain || (item.url ? new URL(item.url).hostname : 'general');
  const folder = sanitizeFileSlug(rawDomain) || 'general';

  let rawSlug = '';
  if (item.url) {
    try {
      const parsed = new URL(item.url);
      const cleaned = cleanSearchParams(parsed.searchParams);
      const search = cleaned.toString();
      const searchSlug = search ? search.replace(/&/g, '-').replace(/=/g, '-') : '';

      const pathname = parsed.pathname.replace(/^\/+|\/+$/g, '');
      if (!pathname || pathname === 'index.html') {
        rawSlug = searchSlug ? searchSlug : 'index';
      } else {
        rawSlug = searchSlug ? `${pathname}-${searchSlug}` : pathname;
      }
    } catch {
      rawSlug = item.path || 'index';
    }
  } else if (item.path) {
    rawSlug = item.path.replace(/^\/+|\/+$/g, '') || 'index';
  } else if (item.title) {
    rawSlug = item.title;
  } else {
    rawSlug = 'index';
  }

  let sanitized = sanitizeFileSlug(rawSlug);
  if (!sanitized) {
    sanitized = 'index';
  }

  const truncated = sanitized.slice(0, 100).replace(/-+$/, '');
  const filename = `${truncated || 'index'}.md`;

  return { folder, filename };
}

/**
 * Escape double quotes for YAML double-quoted string.
 */
function escapeYamlString(val: string): string {
  return val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Formats YAML frontmatter compatible with Obsidian Dataview and Logseq.
 */
export function buildObsidianFrontmatter(opts: ObsidianFrontmatterOptions): string {
  const tagsFormatted =
    opts.tags.length > 0
      ? `[${opts.tags.map((t) => (t.includes(' ') ? `"${escapeYamlString(t)}"` : t)).join(', ')}]`
      : '[]';

  const lines: string[] = [
    '---',
    `title: "${escapeYamlString(opts.title)}"`,
    `url: "${escapeYamlString(opts.url)}"`,
    `source: "${escapeYamlString(opts.source)}"`,
    `domain: "${escapeYamlString(opts.domain)}"`,
    `tags: ${tagsFormatted}`,
    `updated: ${opts.updated}`,
    `highlight_count: ${opts.highlightCount}`,
    '---',
  ];

  return lines.join('\n');
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Builds the complete Markdown file for a single vault page.
 */
export function buildVaultPageMarkdown(opts: VaultPageMarkdownOptions): string {
  const { title, url, domain, highlights } = opts;

  let sourceUrl = url;
  const firstWithSelector = highlights.find((h) => h.selector || h.text);
  if (firstWithSelector) {
    sourceUrl = buildTextFragmentUrl(url, {
      exact: firstWithSelector.selector?.exact || firstWithSelector.text,
      prefix: firstWithSelector.selector?.prefix,
      suffix: firstWithSelector.selector?.suffix,
    });
  }

  const allTags = Array.from(new Set(highlights.flatMap((h) => h.tags || [])));
  const latestDate =
    opts.updated ||
    formatDate(
      highlights.reduce((latest, h) => {
        const d = new Date(h.createdAt);
        return d > latest ? d : latest;
      }, new Date(0))
    );

  const frontmatter = buildObsidianFrontmatter({
    title,
    url,
    source: sourceUrl,
    domain,
    tags: allTags,
    updated: latestDate,
    highlightCount: highlights.length,
  });

  const bodyBlocks = highlights
    .map((h, i) => formatHighlightBlock(h, i + 1))
    .join('\n\n');

  return `${frontmatter}\n\n# ${title}\n\n${bodyBlocks}\n`;
}

export interface VaultSyncMetadata {
  lastSyncedAt: string | null;
  files: Record<string, { lastModified: number }>;
  vaultName?: string;
}

export interface VaultSyncFileError {
  filePath: string;
  error: string;
}

export interface VaultSyncResult {
  totalPages: number;
  writtenPages: number;
  skippedPages: number;
  failedPages: number;
  errors: VaultSyncFileError[];
  lastSyncedAt: string;
}

export const VAULT_SYNC_META_KEY = 'underscore_vault_sync_meta';

export function getVaultSyncMeta(): VaultSyncMetadata {
  if (typeof localStorage === 'undefined') {
    return { lastSyncedAt: null, files: {} };
  }
  try {
    const raw = localStorage.getItem(VAULT_SYNC_META_KEY);
    if (!raw) return { lastSyncedAt: null, files: {} };
    const parsed = JSON.parse(raw);
    return {
      lastSyncedAt: parsed.lastSyncedAt ?? null,
      files: parsed.files ?? {},
      vaultName: parsed.vaultName,
    };
  } catch {
    return { lastSyncedAt: null, files: {} };
  }
}

export function saveVaultSyncMeta(meta: VaultSyncMetadata): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(VAULT_SYNC_META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearVaultSyncMeta(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(VAULT_SYNC_META_KEY);
  } catch {
    // Ignore
  }
}

function toExportable(item: VaultHighlightItem): ExportableHighlight {
  const text = item.quote || item.text || '';
  const path = item.path || '/';
  const url =
    item.url || `https://${item.domain}${path.startsWith('/') ? path : `/${path}`}`;
  let createdAt: Date;
  if (item.createdAt instanceof Date) {
    createdAt = item.createdAt;
  } else if (item.createdAt) {
    createdAt = new Date(item.createdAt);
  } else if (item.savedAt) {
    createdAt = new Date(item.savedAt);
  } else {
    createdAt = new Date();
  }

  return {
    id: item.id || crypto.randomUUID(),
    text,
    url,
    domain: item.domain,
    sectionKey: path,
    createdAt,
    tags: item.tags,
    note: item.note,
    selector: item.selector?.exact
      ? {
          exact: item.selector.exact,
          prefix: item.selector.prefix,
          suffix: item.selector.suffix,
        }
      : undefined,
  };
}

function getItemTimestamp(item: VaultHighlightItem): number {
  if (typeof item.savedAt === 'number') return item.savedAt;
  if (item.updatedAt) return new Date(item.updatedAt).getTime();
  if (item.createdAt) return new Date(item.createdAt).getTime();
  return Date.now();
}

interface PageGroup {
  folder: string;
  filename: string;
  title: string;
  url: string;
  domain: string;
  highlights: ExportableHighlight[];
  lastModified: number;
}

/**
 * Synchronizes a list of highlights into an Obsidian/Logseq vault directory.
 * Performs incremental sync based on file lastModified timestamps.
 */
export async function syncHighlightsToVaultDirectory(
  highlights: VaultHighlightItem[],
  rootHandle: FileSystemDirectoryHandle,
  options?: {
    forceFullSync?: boolean;
    getMeta?: () => VaultSyncMetadata;
    saveMeta?: (meta: VaultSyncMetadata) => void;
  }
): Promise<VaultSyncResult> {
  const getMeta = options?.getMeta ?? getVaultSyncMeta;
  const saveMeta = options?.saveMeta ?? saveVaultSyncMeta;
  const meta = getMeta();

  // Group by page
  const pageMap = new Map<string, PageGroup>();

  for (const item of highlights) {
    const { folder, filename } = getVaultFilePath(item);
    const key = `${folder}/${filename}`;
    const ts = getItemTimestamp(item);

    let group = pageMap.get(key);
    if (!group) {
      const derivedTitle =
        item.title || (filename.endsWith('.md') ? filename.slice(0, -3) : filename);
      const itemPath = item.path || '/';
      const pageUrl =
        item.url ||
        `https://${item.domain}${itemPath.startsWith('/') ? itemPath : `/${itemPath}`}`;

      group = {
        folder,
        filename,
        title: derivedTitle,
        url: pageUrl,
        domain: item.domain || folder,
        highlights: [],
        lastModified: ts,
      };
      pageMap.set(key, group);
    } else {
      if (ts > group.lastModified) {
        group.lastModified = ts;
      }
    }

    group.highlights.push(toExportable(item));
  }

  let writtenPages = 0;
  let skippedPages = 0;
  let failedPages = 0;
  const errors: VaultSyncFileError[] = [];

  for (const [pageKey, page] of pageMap.entries()) {
    const prevFile = meta.files[pageKey];
    if (
      !options?.forceFullSync &&
      prevFile &&
      prevFile.lastModified >= page.lastModified
    ) {
      skippedPages++;
      continue;
    }

    try {
      const dirHandle = await rootHandle.getDirectoryHandle(page.folder, {
        create: true,
      });
      const fileHandle = await dirHandle.getFileHandle(page.filename, { create: true });
      const writable = await fileHandle.createWritable();
      const markdown = buildVaultPageMarkdown({
        title: page.title,
        url: page.url,
        domain: page.domain,
        highlights: page.highlights,
      });
      await writable.write(markdown);
      await writable.close();

      meta.files[pageKey] = { lastModified: page.lastModified };
      writtenPages++;
    } catch (err) {
      failedPages++;
      errors.push({
        filePath: pageKey,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const nowIso = new Date().toISOString();
  meta.lastSyncedAt = nowIso;
  if (rootHandle.name) {
    meta.vaultName = rootHandle.name;
  }
  saveMeta(meta);

  return {
    totalPages: pageMap.size,
    writtenPages,
    skippedPages,
    failedPages,
    errors,
    lastSyncedAt: nowIso,
  };
}

const DB_NAME = 'underscore_vault_db';
const STORE_NAME = 'handles';
const HANDLE_KEY = 'vault_directory_handle';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<FileSystemDirectoryHandle>;
}

interface QueryableFileSystemHandle extends FileSystemHandle {
  queryPermission?: (descriptor?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: {
    mode?: 'read' | 'readwrite';
  }) => Promise<PermissionState>;
}

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function'
  );
}

export async function verifyPermission(
  fileHandle: FileSystemHandle,
  readWrite = true
): Promise<boolean> {
  if (!fileHandle) return false;
  const options: { mode?: 'read' | 'readwrite' } = {
    mode: readWrite ? 'readwrite' : 'read',
  };
  const handle = fileHandle as QueryableFileSystemHandle;
  try {
    if (typeof handle.queryPermission === 'function') {
      if ((await handle.queryPermission(options)) === 'granted') {
        return true;
      }
    }
    if (typeof handle.requestPermission === 'function') {
      if ((await handle.requestPermission(options)) === 'granted') {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function checkPermission(
  fileHandle: FileSystemHandle,
  readWrite = true
): Promise<PermissionState> {
  if (!fileHandle) return 'denied';
  const options: { mode?: 'read' | 'readwrite' } = {
    mode: readWrite ? 'readwrite' : 'read',
  };
  const handle = fileHandle as QueryableFileSystemHandle;
  try {
    if (typeof handle.queryPermission === 'function') {
      return await handle.queryPermission(options);
    }
    return 'prompt';
  } catch {
    return 'denied';
  }
}

let inMemoryHandleFallback: FileSystemDirectoryHandle | null = null;

export async function saveVaultDirectoryHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  inMemoryHandleFallback = handle;
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getDB();
    await db.put(STORE_NAME, handle, HANDLE_KEY);
  } catch {
    // Silently ignore storage or structured clone failure in test/unsupported environments
  }
}

export async function getVaultDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof indexedDB === 'undefined') return inMemoryHandleFallback;
  try {
    const db = await getDB();
    const handle = await db.get(STORE_NAME, HANDLE_KEY);
    return handle ?? inMemoryHandleFallback;
  } catch {
    return inMemoryHandleFallback;
  }
}

export async function clearVaultDirectoryHandle(): Promise<void> {
  inMemoryHandleFallback = null;
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, HANDLE_KEY);
  } catch {
    // Ignore
  }
}
