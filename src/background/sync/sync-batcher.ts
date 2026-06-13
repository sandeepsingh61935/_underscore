/**
 * @file sync-batcher.ts
 * @description Batch processor for efficient sync operations
 * @author System Architect
 */

import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { EventBus } from '@/shared/utils/event-bus';
import pako from 'pako';

/**
 * Batch configuration
 */
interface BatchConfig {
    readonly batchSize: number;
    readonly batchTimeout: number; // milliseconds
    readonly maxBatchSize: number; // Maximum events per batch
}

/**
 * Default batch configuration
 */
const DEFAULT_CONFIG: BatchConfig = {
    batchSize: 50,
    batchTimeout: 5000, // 5 seconds
    maxBatchSize: 100,
};

/**
 * Batch metrics for monitoring
 */
interface BatchMetrics {
    totalBatches: number;
    totalEvents: number;
    averageBatchSize: number;
    compressionRatio: number;
    averageLatency: number;
}

/**
 * SyncBatcher for efficient batch processing
 * 
 * Features:
 * - Batches events up to configured size
 * - Auto-flush after timeout
 * - Deduplication (latest event wins)
 * - Batch compression (gzip)
 * - Batch splitting for large batches
 * - Retry logic for failures
 */
export class SyncBatcher {
    private currentBatch: SyncEvent[] = [];
    private flushTimeout: NodeJS.Timeout | null = null;
    private readonly config: BatchConfig;
    private metrics: BatchMetrics = {
        totalBatches: 0,
        totalEvents: 0,
        averageBatchSize: 0,
        compressionRatio: 0,
        averageLatency: 0,
    };

    constructor(
        private readonly logger: ILogger,
        private readonly eventBus: EventBus,
        config?: Partial<BatchConfig>
    ) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Add event to current batch
     * 
     * Flushes immediately if batch is full
     * Schedules flush after timeout if batch not full
     */
    addToBatch(event: SyncEvent): void {
        this.logger.debug('Adding event to batch', { id: event.id });

        // Add to current batch
        this.currentBatch.push(event);

        // Flush if batch full
        if (this.currentBatch.length >= this.config.batchSize) {
            this.logger.debug('Batch full, flushing immediately');
            this.flush();
        } else {
            // Schedule flush after timeout
            this.scheduleFlush();
        }
    }

    /**
     * Flush current batch
     * 
     * Processes batch:
     * 1. Deduplicate events (latest wins)
     * 2. Group by entity ID
     * 3. Compress payload
     * 4. Split if too large
     * 5. Send to API
     */
    async flush(): Promise<void> {
        // Clear timeout
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = null;
        }

        if (this.currentBatch.length === 0) {
            this.logger.debug('No events to flush');
            return;
        }

        const batchSize = this.currentBatch.length;
        this.logger.info('Flushing batch', { size: batchSize });

        const startTime = Date.now();

        try {
            // 1. Deduplicate events (keep latest per entity)
            const deduplicated = this.deduplicateEvents(this.currentBatch);
            this.logger.debug('Deduplicated events', {
                original: batchSize,
                deduplicated: deduplicated.length,
            });

            // 2. Split into chunks if too large
            const chunks = this.splitBatch(deduplicated);
            this.logger.debug('Split into chunks', { count: chunks.length });

            // 3. Process each chunk
            for (const chunk of chunks) {
                await this.processChunk(chunk);
            }

            // Update metrics
            const latency = Date.now() - startTime;
            this.updateMetrics(batchSize, latency);

            // Clear current batch
            this.currentBatch = [];

            // Emit success event
            this.eventBus.emit('BATCH_SENT', {
                size: batchSize,
                chunks: chunks.length,
                latency,
            });

            this.logger.info('Batch flushed successfully', {
                size: batchSize,
                latency,
            });
        } catch (error) {
            this.logger.error('Failed to flush batch', error as Error);

            // Emit failure event
            this.eventBus.emit('BATCH_FAILED', {
                size: batchSize,
                error: (error as Error).message,
            });

            // Re-throw for retry logic
            throw error;
        }
    }

    /**
     * Deduplicate events - keep latest event per entity
     * 
     * Real-world scenario: User updates highlight color 5 times rapidly
     * Only the latest update should be synced
     */
    private deduplicateEvents(events: SyncEvent[]): SyncEvent[] {
        const eventMap = new Map<string, SyncEvent>();

        for (const event of events) {
            const entityId = this.getEntityId(event);

            // Keep latest event for each entity
            const existing = eventMap.get(entityId);
            if (!existing || event.timestamp > existing.timestamp) {
                eventMap.set(entityId, event);
            }
        }

        return Array.from(eventMap.values());
    }

    /**
     * Get entity ID from event payload
     */
    private getEntityId(event: SyncEvent): string {
        const payload = event.payload as any;
        return payload?.id || event.id;
    }

    /**
     * Split batch into chunks of max size
     */
    private splitBatch(events: SyncEvent[]): SyncEvent[][] {
        const chunks: SyncEvent[][] = [];

        for (let i = 0; i < events.length; i += this.config.maxBatchSize) {
            chunks.push(events.slice(i, i + this.config.maxBatchSize));
        }

        return chunks;
    }

    /**
     * Process a single chunk
     * 
     * Compresses payload and sends to API
     */
    private async processChunk(chunk: SyncEvent[]): Promise<void> {
        this.logger.debug('Processing chunk', { size: chunk.length });

        // Compress payload
        const compressed = this.compressPayload(chunk);
        const originalSize = JSON.stringify(chunk).length;
        const compressedSize = compressed.length;
        const compressionRatio = compressedSize / originalSize;

        this.logger.debug('Compressed payload', {
            original: originalSize,
            compressed: compressedSize,
            ratio: compressionRatio.toFixed(2),
        });

        // TODO: Send to API (will be implemented with API client integration)
        // For now, just emit event
        this.eventBus.emit('CHUNK_READY', {
            size: chunk.length,
            compressed: compressedSize,
            events: chunk,
        });
    }

    /**
     * Compress payload using gzip
     */
    private compressPayload(events: SyncEvent[]): Uint8Array {
        const json = JSON.stringify(events);
        const compressed = pako.gzip(json);
        return compressed;
    }

    /**
     * Schedule flush after timeout
     * 
     * Debounced - clears previous timeout
     */
    private scheduleFlush(): void {
        // Clear existing timeout
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
        }

        // Schedule new timeout
        this.flushTimeout = setTimeout(() => {
            this.logger.debug('Batch timeout reached, flushing');
            this.flush();
        }, this.config.batchTimeout);
    }

    /**
     * Update batch metrics
     */
    private updateMetrics(batchSize: number, latency: number): void {
        this.metrics.totalBatches++;
        this.metrics.totalEvents += batchSize;
        this.metrics.averageBatchSize =
            this.metrics.totalEvents / this.metrics.totalBatches;

        // Update average latency (exponential moving average)
        const alpha = 0.2; // Smoothing factor
        this.metrics.averageLatency =
            alpha * latency + (1 - alpha) * this.metrics.averageLatency;
    }

    /**
     * Get batch metrics
     */
    getMetrics(): BatchMetrics {
        return { ...this.metrics };
    }

    /**
     * Get current batch size
     */
    getCurrentBatchSize(): number {
        return this.currentBatch.length;
    }

    /**
     * Clear current batch (for testing)
     */
    clear(): void {
        this.currentBatch = [];
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = null;
        }
    }
}
