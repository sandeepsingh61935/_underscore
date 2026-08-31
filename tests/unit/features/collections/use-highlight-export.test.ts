/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  executeHighlightExport,
  type FetchExportableHighlights,
} from '@/features/collections/hooks/useHighlightExport';
import type { ExportableHighlight } from '@/shared/highlight-export';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/shared/highlight-export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/highlight-export')>();
  return {
    ...actual,
    downloadTextFile: vi.fn(),
    downloadBinaryFile: vi.fn(),
  };
});

import { toast } from 'sonner';
import { downloadBinaryFile, downloadTextFile } from '@/shared/highlight-export';

const sampleHighlight: ExportableHighlight = {
  id: 'h-1',
  text: 'Important quote.',
  url: 'https://example.com/docs',
  domain: 'example.com',
  sectionKey: '/docs',
  colorRole: 'yellow',
  createdAt: new Date('2026-06-13'),
};

describe('executeHighlightExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads markdown when highlights are available', async () => {
    const fetchHighlights: FetchExportableHighlights = vi.fn(async () => [
      sampleHighlight,
    ]);

    const ok = await executeHighlightExport(
      { kind: 'section', domain: 'example.com', sectionKey: '/docs' },
      fetchHighlights,
      'md'
    );

    expect(ok).toBe(true);
    expect(downloadTextFile).toHaveBeenCalled();
    expect(downloadBinaryFile).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Download started');
  });

  it('downloads xlsx when spreadsheet format is requested', async () => {
    const fetchHighlights: FetchExportableHighlights = vi.fn(async () => [
      sampleHighlight,
    ]);

    const ok = await executeHighlightExport({ kind: 'library' }, fetchHighlights, 'xlsx');

    expect(ok).toBe(true);
    expect(downloadBinaryFile).toHaveBeenCalled();
    expect(downloadTextFile).not.toHaveBeenCalled();
  });

  it('shows an error when no exportable highlights exist', async () => {
    const fetchHighlights: FetchExportableHighlights = vi.fn(async () => [
      { ...sampleHighlight, text: '' },
    ]);

    const ok = await executeHighlightExport(
      { kind: 'domain', domain: 'example.com' },
      fetchHighlights
    );

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      'No highlights available to export in this scope'
    );
    expect(downloadTextFile).not.toHaveBeenCalled();
  });
});
