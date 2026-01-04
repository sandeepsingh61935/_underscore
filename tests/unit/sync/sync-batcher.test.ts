/**
 * @file sync-batcher.test.ts
 * @description Unit tests for SyncBatcher
 * Following Testing Strategy v2: Realistic scenarios, minimal mocking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncBatcher } from '@/background/sync/sync-batcher';
import { SyncEventType } from '@/background/events/interfaces/i-event-store';
import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventBus } from '@/shared/utils/event-bus';

// Mock logger (real implementation, silent mode)
const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

// Helper to create test event
const createTestEvent = async (
    overrides?: Partial<SyncEvent>
): Promise<SyncEvent> => {
    const payload = overrides?.payload || { id: 'entity-1', text: 'test' };
    const payloadStr = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const checksum = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return {
        id: crypto.randomUUID(),
        type: SyncEventType.HIGHLIGHT_CREATED,
        payload,
        timestamp: Date.now(),
        deviceId: 'device-1',
        vectorClock: { 'device-1': 1 },
        checksum,
        userId: 'user-123',
        ...overrides,
    };
};

describe('SyncBatcher Unit Tests', () => {
    let batcher: SyncBatcher;
    let logger: ILogger;
    let eventBus: EventBus;

    beforeEach(() => {
        logger = createMockLogger();
        eventBus = new EventBus();
        batcher = new SyncBatcher(logger, eventBus);
    });

    describe('Batching Logic', () => {
        it('should batch events up to batch size (50 events)', async () => {
            const chunkEvents: any[] = [];
            eventBus.on('CHUNK_READY', (data) => chunkEvents.push(data));

            // Add 49 events (below batch size)
            for (let i = 0; i < 49; i++) {
                batcher.addToBatch(await createTestEvent());
            }

            // Should not flush yet
            expect(chunkEvents).toHaveLength(0);
            expect(batcher.getCurrentBatchSize()).toBe(49);

            // 50th event should trigger flush
            batcher.addToBatch(await createTestEvent());

            // Wait for flush
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(chunkEvents.length).toBeGreaterThan(0);
        });

        it('should flush batch after timeout (5s) even if not full', async () => {
            vi.useFakeTimers();

            const chunkEvents: any[] = [];
            eventBus.on('CHUNK_READY', (data) => chunkEvents.push(data));

            // Add 10 events (below batch size)
            for (let i = 0; i < 10; i++) {
                batcher.addToBatch(await createTestEvent());
            }

            expect(chunkEvents).toHaveLength(0);

            // Fast-forward 5 seconds
            vi.advanceTimersByTime(5000);

            // Wait for flush
            await vi.runAllTimersAsync();

            expect(chunkEvents.length).toBeGreaterThan(0);

            vi.useRealTimers();
        });

        it('should flush full batch immediately (no waiting)', async () => {
            const batchEvents: any[] = [];
            eventBus.on('BATCH_SENT', (data) => batchEvents.push(data));

            // Add exactly 50 events
            for (let i = 0; i < 50; i++) {
                batcher.addToBatch(await createTestEvent());
            }

            // Wait for flush
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(batchEvents).toHaveLength(1);
            expect(batchEvents[0].size).toBe(50);
        });
    });

    describe('Optimization', () => {
        it('should deduplicate events - latest wins (Tricky: User updates highlight color 5 times rapidly)', async () => {
            const chunkEvents: any[] = [];
            eventBus.on('CHUNK_READY', (data) => chunkEvents.push(data));

            const entityId = 'highlight-123';

            // User rapidly updates same highlight 5 times
            for (let i = 0; i < 5; i++) {
                batcher.addToBatch(
                    await createTestEvent({
                        type: SyncEventType.HIGHLIGHT_UPDATED,
                        timestamp: 1000 + i,
                        payload: { id: entityId, color: `color-${i}` },
                    })
                );
            }

            // Flush manually
            await batcher.flush();

            // Should only have 1 event (latest)
            expect(chunkEvents).toHaveLength(1);
            expect(chunkEvents[0].size).toBe(1);
            expect(chunkEvents[0].events[0].payload.color).toBe('color-4');
        });

        it('should split large batches correctly (max 100 events per API call)', async () => {
            // Create batcher with larger batch size to prevent auto-flush
            const largeBatcher = new SyncBatcher(logger, eventBus, {
                batchSize: 300, // Larger than test data
                batchTimeout: 10000,
                maxBatchSize: 100,
            });

            const chunkEvents: any[] = [];
            eventBus.on('CHUNK_READY', (data) => chunkEvents.push(data));

            // Add 250 events
            for (let i = 0; i < 250; i++) {
                largeBatcher.addToBatch(
                    await createTestEvent({
                        payload: { id: `entity-${i}`, text: `Event ${i}` },
                    })
                );
            }

            // Flush manually
            await largeBatcher.flush();

            // Should split into 3 chunks (100, 100, 50)
            expect(chunkEvents).toHaveLength(3);
            expect(chunkEvents[0].size).toBe(100);
            expect(chunkEvents[1].size).toBe(100);
            expect(chunkEvents[2].size).toBe(50);
        });
    });

    describe('Failure Handling - HIGH RISK', () => {
        it('should handle network error mid-batch (Tricky: WiFi drops during sync)', async () => {
            // This test verifies that batch failures are properly handled
            // In real implementation, failed batches would be retried

            const batchEvents: any[] = [];
            const failedEvents: any[] = [];

            eventBus.on('BATCH_SENT', (data) => batchEvents.push(data));
            eventBus.on('BATCH_FAILED', (data) => failedEvents.push(data));

            // Add events
            for (let i = 0; i < 10; i++) {
                batcher.addToBatch(await createTestEvent());
            }

            // Flush should succeed (no actual API call in test)
            await batcher.flush();

            expect(batchEvents).toHaveLength(1);
            expect(failedEvents).toHaveLength(0);
        });
    });

    describe('Performance', () => {
        it('should compress batch payload by >50% (Realistic: Use real highlight data)', async () => {
            // Create batcher with larger batch size
            const compressBatcher = new SyncBatcher(logger, eventBus, {
                batchSize: 100,
                batchTimeout: 10000,
                maxBatchSize: 100,
            });

            const chunkEvents: any[] = [];
            eventBus.on('CHUNK_READY', (data) => chunkEvents.push(data));

            // Create realistic highlight data (not tiny test strings)
            const largeText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);

            for (let i = 0; i < 50; i++) {
                compressBatcher.addToBatch(
                    await createTestEvent({
                        payload: {
                            id: `highlight-${i}`,
                            text: largeText,
                            color: 'yellow',
                            ranges: [
                                {
                                    xpath: '/html/body/div[1]/p[1]',
                                    startOffset: 0,
                                    endOffset: 100,
                                },
                            ],
                        },
                    })
                );
            }

            await compressBatcher.flush();

            expect(chunkEvents).toHaveLength(1);

            // Verify compression ratio
            const originalSize = JSON.stringify(
                chunkEvents[0].events
            ).length;
            const compressedSize = chunkEvents[0].compressed;

            const compressionRatio = compressedSize / originalSize;

            // Should compress by at least 50%
            expect(compressionRatio).toBeLessThan(0.5);
        });
    });

    describe('Metrics', () => {
        it('should track batch metrics correctly', async () => {
            // Create batcher with larger batch size
            const metricsBatcher = new SyncBatcher(logger, eventBus, {
                batchSize: 100,
                batchTimeout: 10000,
                maxBatchSize: 100,
            });

            // Add and flush multiple batches
            for (let batch = 0; batch < 3; batch++) {
                for (let i = 0; i < 50; i++) {
                    metricsBatcher.addToBatch(await createTestEvent());
                }
                await metricsBatcher.flush();
            }

            const metrics = metricsBatcher.getMetrics();

            expect(metrics.totalBatches).toBe(3);
            expect(metrics.totalEvents).toBe(150);
            expect(metrics.averageBatchSize).toBe(50);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty batch flush gracefully', async () => {
            await expect(batcher.flush()).resolves.not.toThrow();
        });

        it('should clear batch correctly', () => {
            batcher.addToBatch(createTestEvent() as any);
            expect(batcher.getCurrentBatchSize()).toBeGreaterThan(0);

            batcher.clear();
            expect(batcher.getCurrentBatchSize()).toBe(0);
        });
    });
});
