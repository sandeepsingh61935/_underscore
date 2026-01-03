/**
 * Sprint Mode TTL Expiration Integration Tests
 *
 * Validates that Sprint Mode correctly:
 * - Auto-deletes highlights after 4-hour TTL
 * - Preserves highlights within TTL window
 * - Cleans expired highlights on periodic check
 * - Handles mixed expired/valid highlights
 * - Emits cleanup events on TTL expiration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SprintMode } from '@/content/modes/sprint-mode';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

// Mock Highlight API
class MockHighlight {
  constructor(public range: Range) {}
}
global.Highlight = MockHighlight as any;

// Mock CSS.highlights
global.CSS = {
  highlights: new Map(),
} as any;

describe('Sprint Mode - TTL Expiration Integration', () => {
  let sprintMode: SprintMode;
  let mockRepository: IHighlightRepository;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Reset CSS.highlights
    (global.CSS.highlights as Map<string, any>).clear();

    // Mock repository
    mockRepository = {
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      findByContentHash: vi.fn().mockResolvedValue(null),
      getAll: vi.fn().mockResolvedValue([]),
    } as any;

    // Mock storage
    mockStorage = {
      saveEvent: vi.fn().mockResolvedValue(undefined),
      loadEvents: vi.fn().mockResolvedValue([]),
      clearEvents: vi.fn().mockResolvedValue(undefined),
    } as any;

    // Mock EventBus
    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    // Mock Logger
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as any;

    // Create SprintMode instance
    sprintMode = new SprintMode(mockRepository, mockStorage, mockEventBus, mockLogger);
  });

  it('should auto-delete highlights after 4-hour TTL', async () => {
    // Create highlight with past expiration (already expired)
    const pastDate = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago

    // Manually add expired highlight to mode's internal data
    const expiredData = {
      id: 'expired-123',
      text: 'Expired highlight',
      contentHash: 'hash-expired',
      colorRole: 'yellow',
      type: 'underscore' as const,
      ranges: [],
      liveRanges: [],
      createdAt: pastDate,
      expiresAt: new Date(pastDate.getTime() + 4 * 60 * 60 * 1000), // 4 hours from creation (1 hour ago)
    };

    // Access private data map (for testing)
    (sprintMode as any).data.set('expired-123', expiredData);

    // Run cleanup
    const cleanedCount = await sprintMode.cleanExpiredHighlights();

    // Verify expired highlight was removed
    expect(cleanedCount).toBe(1);
    expect(mockRepository.remove).toHaveBeenCalledWith('expired-123');
  });

  it('should preserve highlights within TTL window', async () => {
    // Create highlight with future expiration (still valid)
    const now = new Date();
    const futureExpiration = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

    const validData = {
      id: 'valid-123',
      text: 'Valid highlight',
      contentHash: 'hash-valid',
      colorRole: 'yellow',
      type: 'underscore' as const,
      ranges: [],
      liveRanges: [],
      createdAt: now,
      expiresAt: futureExpiration,
    };

    // Add valid highlight
    (sprintMode as any).data.set('valid-123', validData);

    // Run cleanup
    const cleanedCount = await sprintMode.cleanExpiredHighlights();

    // Verify no highlights were removed
    expect(cleanedCount).toBe(0);
    expect(mockRepository.remove).not.toHaveBeenCalled();
  });

  it('should clean expired highlights on periodic check', async () => {
    // Setup: Add multiple highlights with different expiration times
    const now = Date.now();

    // Expired highlight
    const expired1 = {
      id: 'expired-1',
      text: 'Expired 1',
      contentHash: 'hash-1',
      colorRole: 'yellow',
      type: 'underscore' as const,
      ranges: [],
      liveRanges: [],
      createdAt: new Date(now - 5 * 60 * 60 * 1000),
      expiresAt: new Date(now - 1 * 60 * 60 * 1000), // Expired 1 hour ago
    };

    // Valid highlight
    const valid1 = {
      id: 'valid-1',
      text: 'Valid 1',
      contentHash: 'hash-2',
      colorRole: 'blue',
      type: 'underscore' as const,
      ranges: [],
      liveRanges: [],
      createdAt: new Date(now),
      expiresAt: new Date(now + 3 * 60 * 60 * 1000), // Expires in 3 hours
    };

    (sprintMode as any).data.set('expired-1', expired1);
    (sprintMode as any).data.set('valid-1', valid1);

    // Run periodic cleanup
    const cleanedCount = await sprintMode.cleanExpiredHighlights();

    // Verify only expired highlight was removed
    expect(cleanedCount).toBe(1);
    expect(mockRepository.remove).toHaveBeenCalledWith('expired-1');
    expect(mockRepository.remove).not.toHaveBeenCalledWith('valid-1');
  });

  it('should handle mixed expired/valid highlights', async () => {
    const now = Date.now();

    // Add 3 highlights: 2 expired, 1 valid
    const highlights = [
      {
        id: 'expired-1',
        text: 'Expired 1',
        contentHash: 'hash-1',
        colorRole: 'yellow',
        type: 'underscore' as const,
        ranges: [],
        liveRanges: [],
        createdAt: new Date(now - 6 * 60 * 60 * 1000),
        expiresAt: new Date(now - 2 * 60 * 60 * 1000), // Expired
      },
      {
        id: 'valid-1',
        text: 'Valid 1',
        contentHash: 'hash-2',
        colorRole: 'blue',
        type: 'underscore' as const,
        ranges: [],
        liveRanges: [],
        createdAt: new Date(now),
        expiresAt: new Date(now + 2 * 60 * 60 * 1000), // Valid
      },
      {
        id: 'expired-2',
        text: 'Expired 2',
        contentHash: 'hash-3',
        colorRole: 'green',
        type: 'underscore' as const,
        ranges: [],
        liveRanges: [],
        createdAt: new Date(now - 5 * 60 * 60 * 1000),
        expiresAt: new Date(now - 1 * 60 * 60 * 1000), // Expired
      },
    ];

    highlights.forEach((h) => (sprintMode as any).data.set(h.id, h));

    // Run cleanup
    const cleanedCount = await sprintMode.cleanExpiredHighlights();

    // Verify 2 expired highlights removed, 1 valid preserved
    expect(cleanedCount).toBe(2);
    expect(mockRepository.remove).toHaveBeenCalledWith('expired-1');
    expect(mockRepository.remove).toHaveBeenCalledWith('expired-2');
    expect(mockRepository.remove).not.toHaveBeenCalledWith('valid-1');
  });

  it('should emit cleanup event on TTL expiration', async () => {
    const now = Date.now();

    // Add expired highlight
    const expired = {
      id: 'expired-123',
      text: 'Expired',
      contentHash: 'hash-expired',
      colorRole: 'yellow',
      type: 'underscore' as const,
      ranges: [],
      liveRanges: [],
      createdAt: new Date(now - 5 * 60 * 60 * 1000),
      expiresAt: new Date(now - 1 * 60 * 60 * 1000),
    };

    (sprintMode as any).data.set('expired-123', expired);

    // Run cleanup
    await sprintMode.cleanExpiredHighlights();

    // Verify cleanup event was emitted to storage
    expect(mockStorage.saveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'highlights.ttl_cleanup',
        count: 1,
        ids: ['expired-123'],
      })
    );
  });
});
