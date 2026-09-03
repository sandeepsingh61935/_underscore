/**
 * @file vault-sync-service.test.ts
 * @description Unit tests for Local Vault Mirror Sync service (path generation, frontmatter, delta sync).
 */
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  buildObsidianFrontmatter,
  buildVaultPageMarkdown,
  checkPermission,
  clearVaultDirectoryHandle,
  getVaultDirectoryHandle,
  getVaultFilePath,
  isFileSystemAccessSupported,
  sanitizeFileSlug,
  saveVaultDirectoryHandle,
  syncHighlightsToVaultDirectory,
  verifyPermission,
  type VaultHighlightItem,
} from '@/web/services/vault-sync-service';

describe('Vault Path and Slug Sanitization', () => {
  it('derives domain folder and clean filename from a standard URL', () => {
    const item: VaultHighlightItem = {
      domain: 'danluu.com',
      url: 'https://danluu.com/systems-talk',
      quote: 'Great talk on systems',
      savedAt: 1725364800000,
    };
    const { folder, filename } = getVaultFilePath(item);
    expect(folder).toBe('danluu.com');
    expect(filename).toBe('systems-talk.md');
  });

  it('handles root page "/" mapping to index.md', () => {
    const item: VaultHighlightItem = {
      domain: 'example.com',
      url: 'https://example.com/',
      quote: 'Home quote',
      savedAt: 1725364800000,
    };
    const { folder, filename } = getVaultFilePath(item);
    expect(folder).toBe('example.com');
    expect(filename).toBe('index.md');
  });

  it('strips illegal OS characters (:, ?, *, <, >, |, \\, /, ") from filename', () => {
    const rawSlug = 'article:title?with*illegal<chars>and|bars"and/slashes';
    const sanitized = sanitizeFileSlug(rawSlug);
    expect(sanitized).not.toMatch(/[/\\?%*:|"<>]/);
    expect(sanitized).toBe('article-title-with-illegal-chars-and-bars-and-slashes');

    const item: VaultHighlightItem = {
      domain: 'test.org',
      url: 'https://test.org/why:is-this*broken?',
      quote: 'quote',
      savedAt: 1725364800000,
    };
    const { folder, filename } = getVaultFilePath(item);
    expect(folder).toBe('test.org');
    expect(filename).toBe('why-is-this-broken.md');
  });

  it('cleans tracking query parameters but keeps meaningful path identity', () => {
    const item: VaultHighlightItem = {
      domain: 'blog.site.co',
      url: 'https://blog.site.co/post-1?utm_source=twitter&utm_medium=social&v=42',
      quote: 'quote',
      savedAt: 1725364800000,
    };
    const { folder, filename } = getVaultFilePath(item);
    expect(folder).toBe('blog.site.co');
    expect(filename).toBe('post-1-v-42.md');
  });

  it('truncates filename to a safe 100-character ceiling', () => {
    const veryLongSlug = 'a'.repeat(150);
    const item: VaultHighlightItem = {
      domain: 'example.com',
      url: `https://example.com/${veryLongSlug}`,
      quote: 'quote',
      savedAt: 1725364800000,
    };
    const { filename } = getVaultFilePath(item);
    expect(filename.length).toBeLessThanOrEqual(104); // 100 chars + '.md'
    expect(filename.endsWith('.md')).toBe(true);
    const baseName = filename.replace(/\.md$/, '');
    expect(baseName.length).toBeLessThanOrEqual(100);
  });
});

describe('Frontmatter & Markdown Generation', () => {
  it('generates valid YAML frontmatter with required Obsidian/Dataview fields', () => {
    const frontmatter = buildObsidianFrontmatter({
      title: 'Systems Talk',
      url: 'https://danluu.com/systems-talk',
      source: 'https://danluu.com/systems-talk#:~:text=reliable',
      domain: 'danluu.com',
      tags: ['systems', 'engineering'],
      updated: '2026-09-03',
      highlightCount: 3,
    });

    expect(frontmatter).toContain('---');
    expect(frontmatter).toContain('title: "Systems Talk"');
    expect(frontmatter).toContain('url: "https://danluu.com/systems-talk"');
    expect(frontmatter).toContain('source: "https://danluu.com/systems-talk#:~:text=reliable"');
    expect(frontmatter).toContain('domain: "danluu.com"');
    expect(frontmatter).toContain('tags: [systems, engineering]');
    expect(frontmatter).toContain('updated: 2026-09-03');
    expect(frontmatter).toContain('highlight_count: 3');
  });

  it('handles empty tags and quotes in title properly', () => {
    const frontmatter = buildObsidianFrontmatter({
      title: 'Saying "Hello" in Rust',
      url: 'https://example.com/rust',
      source: 'https://example.com/rust',
      domain: 'example.com',
      tags: [],
      updated: '2026-09-03',
      highlightCount: 1,
    });

    expect(frontmatter).toContain('title: "Saying \\"Hello\\" in Rust"');
    expect(frontmatter).toContain('tags: []');
    expect(frontmatter).toContain('highlight_count: 1');
  });

  it('builds full vault page markdown combining frontmatter and formatted highlight blocks', () => {
    const pageMarkdown = buildVaultPageMarkdown({
      title: 'Sample Article',
      url: 'https://example.com/article',
      domain: 'example.com',
      highlights: [
        {
          id: 'hl-1',
          text: 'This is the first notable sentence.',
          url: 'https://example.com/article',
          domain: 'example.com',
          sectionKey: '/article',
          createdAt: new Date('2026-09-03T12:00:00Z'),
          tags: ['reading'],
          note: 'Essential insight',
        },
        {
          id: 'hl-2',
          text: 'Second point here.',
          url: 'https://example.com/article',
          domain: 'example.com',
          sectionKey: '/article',
          createdAt: new Date('2026-09-03T13:00:00Z'),
        },
      ],
    });

    expect(pageMarkdown).toMatch(/^---\n/);
    expect(pageMarkdown).toContain('highlight_count: 2');
    expect(pageMarkdown).toContain('**1.**');
    expect(pageMarkdown).toContain('> "This is the first notable sentence."');
    expect(pageMarkdown).toContain('[tags] reading');
    expect(pageMarkdown).toContain('[note] Essential insight');
    expect(pageMarkdown).toContain('**2.**');
    expect(pageMarkdown).toContain('> "Second point here."');
  });
});

describe('Delta Detection & Mock File System Writer', () => {
  interface MockFile {
    content: string;
    closed: boolean;
  }

  function createMockDirectoryHandle(name = 'TestVault') {
    const subdirs = new Map<string, any>();

    const dirHandle = {
      name,
      kind: 'directory' as const,
      getDirectoryHandle: async (folderName: string, _opts?: { create?: boolean }) => {
        if (!subdirs.has(folderName)) {
          const subFiles = new Map<string, MockFile>();
          const subHandle = {
            name: folderName,
            kind: 'directory' as const,
            getFileHandle: async (fileName: string, _fileOpts?: { create?: boolean }) => {
              return {
                name: fileName,
                kind: 'file' as const,
                createWritable: async () => {
                  const fileRecord: MockFile = { content: '', closed: false };
                  subFiles.set(fileName, fileRecord);
                  return {
                    write: async (data: string) => {
                      fileRecord.content += data;
                    },
                    close: async () => {
                      fileRecord.closed = true;
                    },
                  };
                },
              };
            },
            _getFiles: () => subFiles,
          };
          subdirs.set(folderName, subHandle);
        }
        return subdirs.get(folderName);
      },
      _getSubdirs: () => subdirs,
    };

    return dirHandle;
  }

  it('writes page markdown to domain directory and filename on mock file handle', async () => {
    const rootHandle = createMockDirectoryHandle();
    const highlights: VaultHighlightItem[] = [
      {
        id: 'h1',
        domain: 'example.com',
        url: 'https://example.com/system-design',
        quote: 'Distributed consensus is hard.',
        savedAt: 1725364800000,
        tags: ['distributed'],
      },
    ];

    const result = await syncHighlightsToVaultDirectory(highlights, rootHandle as any);

    expect(result.totalPages).toBe(1);
    expect(result.writtenPages).toBe(1);
    expect(result.skippedPages).toBe(0);
    expect(result.failedPages).toBe(0);

    const subdirs = rootHandle._getSubdirs();
    expect(subdirs.has('example.com')).toBe(true);
    const domainDir = subdirs.get('example.com');
    const domainFiles = domainDir._getFiles();
    expect(domainFiles.has('system-design.md')).toBe(true);
    const writtenFile = domainFiles.get('system-design.md');
    expect(writtenFile.closed).toBe(true);
    expect(writtenFile.content).toContain('title: "system-design"');
    expect(writtenFile.content).toContain('> "Distributed consensus is hard."');
  });

  it('skips rewriting pages whose timestamps are not newer than metadata lastModified (granular delta)', async () => {
    const rootHandle = createMockDirectoryHandle();
    const highlights: VaultHighlightItem[] = [
      {
        id: 'h1',
        domain: 'example.com',
        url: 'https://example.com/page-1',
        quote: 'First quote',
        savedAt: 1000,
      },
      {
        id: 'h2',
        domain: 'example.com',
        url: 'https://example.com/page-2',
        quote: 'Second quote',
        savedAt: 2000,
      },
    ];

    // Seed metadata: page-1 was synced at timestamp 1000, page-2 is older or not present
    const meta = {
      lastSyncedAt: new Date(1000).toISOString(),
      files: {
        'example.com/page-1.md': { lastModified: 1000 },
      },
    };

    const result = await syncHighlightsToVaultDirectory(highlights, rootHandle as any, {
      getMeta: () => meta,
      saveMeta: () => {},
    });

    expect(result.totalPages).toBe(2);
    expect(result.writtenPages).toBe(1); // only page-2 written
    expect(result.skippedPages).toBe(1); // page-1 skipped
    expect(result.failedPages).toBe(0);

    const domainDir = rootHandle._getSubdirs().get('example.com');
    const files = domainDir._getFiles();
    expect(files.has('page-1.md')).toBe(false); // not rewritten!
    expect(files.has('page-2.md')).toBe(true);
  });

  it('continues syncing other files when one write operation fails (non-blocking error)', async () => {
    const rootHandle = createMockDirectoryHandle();
    // Intentionally make getDirectoryHandle fail for 'locked.com'
    const origGetDir = rootHandle.getDirectoryHandle;
    rootHandle.getDirectoryHandle = async (name: string, opts?: { create?: boolean }) => {
      if (name === 'locked.com') {
        throw new Error('Directory locked by another process');
      }
      return origGetDir(name, opts);
    };

    const highlights: VaultHighlightItem[] = [
      {
        id: 'h1',
        domain: 'locked.com',
        url: 'https://locked.com/note',
        quote: 'Locked note',
        savedAt: 2000,
      },
      {
        id: 'h2',
        domain: 'healthy.com',
        url: 'https://healthy.com/note',
        quote: 'Healthy note',
        savedAt: 2000,
      },
    ];

    const result = await syncHighlightsToVaultDirectory(highlights, rootHandle as any);

    expect(result.totalPages).toBe(2);
    expect(result.writtenPages).toBe(1);
    expect(result.failedPages).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.filePath).toBe('locked.com/note.md');
    expect(result.errors[0]?.error).toContain('Directory locked');

    const healthyDir = rootHandle._getSubdirs().get('healthy.com');
    expect(healthyDir._getFiles().has('note.md')).toBe(true);
  });
});

describe('Permission Lifecycle & Directory Handle Persistence', () => {
  it('detects File System Access API availability', () => {
    const orig = (window as any).showDirectoryPicker;
    try {
      delete (window as any).showDirectoryPicker;
      expect(isFileSystemAccessSupported()).toBe(false);

      (window as any).showDirectoryPicker = () => Promise.resolve({} as any);
      expect(isFileSystemAccessSupported()).toBe(true);
    } finally {
      if (orig) {
        (window as any).showDirectoryPicker = orig;
      } else {
        delete (window as any).showDirectoryPicker;
      }
    }
  });

  it('verifyPermission returns true if queryPermission is already granted', async () => {
    const mockHandle = {
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
    };
    const result = await verifyPermission(mockHandle as any, true);
    expect(result).toBe(true);
  });

  it('verifyPermission requests permission if queryPermission is prompt', async () => {
    let requested = false;
    const mockHandle = {
      queryPermission: async () => 'prompt',
      requestPermission: async () => {
        requested = true;
        return 'granted';
      },
    };
    const result = await verifyPermission(mockHandle as any, true);
    expect(requested).toBe(true);
    expect(result).toBe(true);
  });

  it('verifyPermission returns false if user denies permission', async () => {
    const mockHandle = {
      queryPermission: async () => 'prompt',
      requestPermission: async () => 'denied',
    };
    const result = await verifyPermission(mockHandle as any, true);
    expect(result).toBe(false);
  });

  it('checkPermission queries permission state without prompting', async () => {
    const mockHandle = {
      queryPermission: async () => 'prompt',
    };
    const state = await checkPermission(mockHandle as any, true);
    expect(state).toBe('prompt');
  });

  it('persists, retrieves, and clears directory handle in IndexedDB', async () => {
    const fakeHandle = { name: 'MyObsidianVault', kind: 'directory' };
    await saveVaultDirectoryHandle(fakeHandle as any);

    const retrieved = await getVaultDirectoryHandle();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('MyObsidianVault');

    await clearVaultDirectoryHandle();
    const afterClear = await getVaultDirectoryHandle();
    expect(afterClear).toBeNull();
  });
});


