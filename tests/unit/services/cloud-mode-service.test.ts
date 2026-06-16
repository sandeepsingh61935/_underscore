/**
 * @file cloud-mode-service.test.ts
 * @description Verifies that the CloudModeService module is safe to import under
 * ES module semantics (no `require()` at module load or in callable code), and
 * that restoreHighlight() can recover a DOM Range from a highlight saved with
 * a W3C TextQuoteSelector (the format the current saveHighlight writes).
 *
 * Regression: getCloudModeService() used `require('@/...')` to dodge a
 * (perceived) circular import. In an MV3 SW (`defineBackground({type:'module'})`)
 * and in vitest's ESM transform, `require` is undefined, so any caller would
 * crash. The function is `@deprecated` ("Use DI container for better
 * testability and cloud sync support") and has no live importers — the
 * correct fix is to remove it entirely.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CloudModeService } from '@/services/cloud-mode-service';
import { MockRepository } from '../../helpers/mocks/mock-repository';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';

const silentLogger = new ConsoleLogger('test', LogLevel.NONE);

describe('CloudModeService module', () => {
  it('imports cleanly under ES module semantics (no require() at load)', async () => {
    // If any top-level statement in cloud-mode-service.ts uses require(),
    // this import throws ReferenceError before the test body runs.
    const mod = await import('@/services/cloud-mode-service');
    expect(mod.CloudModeService).toBeTypeOf('function');
  });

  it('does not export a deprecated getCloudModeService that uses require()', async () => {
    // After cleanup, the deprecated factory must be gone so it cannot be
    // called by a future contributor and crash the host context.
    const mod = await import('@/services/cloud-mode-service');
    expect((mod as Record<string, unknown>)['getCloudModeService']).toBeUndefined();
  });
});

describe('CloudModeService.restoreHighlight with TextQuoteSelector', () => {
  let repository: MockRepository;
  let selectorEngine: { restore: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = new MockRepository();
    // Stub the MultiSelectorEngine so the test isolates the production
    // routing logic in restoreHighlight(). If the production code wrongly
    // routes a TextQuoteSelector through selectorEngine.restore, this stub
    // will return null — making the test fail with a clear message.
    selectorEngine = { restore: vi.fn().mockResolvedValue(null) };
    // Clear the document between tests so previously-planted text nodes
    // don't pollute findExactMatches() in TextQuoteFinder.
    document.body.innerHTML = '';
  });

  function makeHighlightWithTextQuote(): HighlightDataV2 {
    return {
      id: '11111111-1111-1111-1111-111111111111',
      text: 'highlighted phrase',
      contentHash: 'a'.repeat(64),
      colorRole: 'yellow',
      type: 'underscore',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      url: 'https://example.com/page',
      ranges: [
        {
          xpath: '/html/body',
          startOffset: 0,
          endOffset: 0,
          text: 'highlighted phrase',
          textBefore: '',
          textAfter: '',
          selector: {
            type: 'TextQuoteSelector',
            exact: 'highlighted phrase',
          },
        },
      ],
    };
  }

  it('returns a Range when the exact text exists in the document', async () => {
    // Arrange: plant the text in the document so TextQuoteFinder can locate it
    const para = document.createElement('p');
    para.textContent = 'Some leading context. highlighted phrase comes here.';
    document.body.appendChild(para);

    const service = new CloudModeService(
      repository as unknown as ConstructorParameters<typeof CloudModeService>[0],
      selectorEngine as never,
      silentLogger
    );

    // Act
    const result = await service.restoreHighlight(makeHighlightWithTextQuote());

    // Assert: a non-null Range was recovered
    expect(result.range).not.toBeNull();
    expect(result.range?.toString()).toBe('highlighted phrase');
  });

  it("reports restoredUsing as 'text-quote' for TextQuoteSelector data", async () => {
    // Arrange
    const para = document.createElement('p');
    para.textContent = 'Some leading context. highlighted phrase comes here.';
    document.body.appendChild(para);

    const service = new CloudModeService(
      repository as unknown as ConstructorParameters<typeof CloudModeService>[0],
      selectorEngine as never,
      silentLogger
    );

    // Act
    const result = await service.restoreHighlight(makeHighlightWithTextQuote());

    // Assert: tier reporting must be text-quote, not 'failed'
    expect(result.restoredUsing).toBe('text-quote');
  });

  it('does not route TextQuoteSelector data through MultiSelectorEngine.restore', async () => {
    // Arrange
    const para = document.createElement('p');
    para.textContent = 'Some leading context. highlighted phrase comes here.';
    document.body.appendChild(para);

    const service = new CloudModeService(
      repository as unknown as ConstructorParameters<typeof CloudModeService>[0],
      selectorEngine as never,
      silentLogger
    );

    // Act
    await service.restoreHighlight(makeHighlightWithTextQuote());

    // Assert: the legacy engine must not be called for a TextQuoteSelector
    // payload — it expects xpath/position/fuzzy fields that aren't there.
    expect(selectorEngine.restore).not.toHaveBeenCalled();
  });

  it('returns range=null with restoredUsing=failed when the text is not in the document', async () => {
    // Arrange: document has no matching text
    const para = document.createElement('p');
    para.textContent = 'totally unrelated content';
    document.body.appendChild(para);

    const service = new CloudModeService(
      repository as unknown as ConstructorParameters<typeof CloudModeService>[0],
      selectorEngine as never,
      silentLogger
    );

    // Act
    const result = await service.restoreHighlight(makeHighlightWithTextQuote());

    // Assert: lookup failed cleanly
    expect(result.range).toBeNull();
    expect(result.restoredUsing).toBe('failed');
  });
});
