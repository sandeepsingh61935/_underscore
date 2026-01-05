/**
 * @file sync-container-registration.ts
 * @description DI container registration for sync engine layer
 * @architecture Dependency Injection - centralized service registration
 */

import type { Container } from '@/background/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { ISyncQueue } from '@/background/sync/interfaces/i-sync-queue';
import type { INetworkDetector } from '@/background/sync/interfaces/i-network-detector';
import type { IRateLimiter } from '@/background/sync/interfaces/i-rate-limiter';
import { SyncQueue } from '@/background/sync/sync-queue';
import { SyncBatcher } from '@/background/sync/sync-batcher';
import { OfflineQueue } from '@/background/sync/offline-queue';
import { NetworkDetector } from '@/background/sync/network-detector';
import { RateLimiter } from '@/background/sync/rate-limiter';
import { SyncStatus } from '@/background/sync/sync-status';
import { EventBus } from '@/background/utils/event-bus';

/**
 * Register sync engine components in DI container
 * 
 * Registered services:
 * - 'eventBus' → EventBus (event-driven communication)
 * - 'networkDetector' → NetworkDetector (online/offline detection)
 * - 'syncQueue' → SyncQueue (persistent sync queue with priority)
 * - 'syncBatcher' → SyncBatcher (batch processing with compression)
 * - 'offlineQueue' → OfflineQueue (offline event storage)
 * - 'rateLimiter' → RateLimiter (DoS protection)
 * - 'syncStatus' → SyncStatus (sync state tracking)
 * 
 * Dependencies required:
 * - 'logger' → ILogger
 * 
 * @example
 * ```typescript
 * const container = new Container();
 * 
 * // Register logger first
 * container.registerSingleton('logger', () => new Logger());
 * 
 * // Register sync components
 * registerSyncComponents(container);
 * 
 * // Resolve
 * const syncQueue = container.resolve<ISyncQueue>('syncQueue');
 * ```
 */
export function registerSyncComponents(container: Container): void {
    // ==================== EventBus ====================

    /**
     * EventBus (event-driven communication)
     * Shared event bus for all sync components
     * 
     * Features:
     * - Pub/sub pattern
     * - Type-safe event emission
     * - Multiple subscribers per event
     */
    container.registerSingleton('eventBus', () => {
        return new EventBus();
    });

    // ==================== NetworkDetector ====================

    /**
     * NetworkDetector (offline-first architecture)
     * Detects online/offline transitions
     * 
     * Features:
     * - navigator.onLine detection
     * - Network Information API for connection type
     * - Event-based notifications
     * 
     * Refs: ADR-001 (Event Sourcing - offline-first)
     */
    container.registerSingleton<INetworkDetector>('networkDetector', () => {
        const logger = container.resolve<ILogger>('logger');
        return new NetworkDetector(logger);
    });

    // ==================== RateLimiter ====================

    /**
     * RateLimiter (CRITICAL - DoS protection)
     * Token bucket algorithm for rate limiting
     * 
     * Features:
     * - Per-user per-operation buckets
     * - Configurable rate limits (sync: 10/min, auth: 5/15min, api: 100/min)
     * - Metrics tracking
     * - Automatic bucket cleanup
     * 
     * Refs: docs/06-security/threat-model.md#T7
     */
    container.registerSingleton<IRateLimiter>('rateLimiter', () => {
        const logger = container.resolve<ILogger>('logger');
        const eventBus = container.resolve<EventBus>('eventBus');
        return new RateLimiter(logger, eventBus);
    });

    // ==================== SyncQueue ====================

    /**
     * SyncQueue (core sync component)
     * Persistent queue with priority support
     * 
     * Features:
     * - IndexedDB persistence
     * - Priority queue (DELETE > UPDATE > CREATE)
     * - FIFO within same priority
     * - Retry logic with exponential backoff
     * - Dead letter queue for failed events
     * - Queue overflow protection
     * 
     * CRITICAL: Events MUST be dequeued in chronological order
     * 
     * Refs: ADR-001 (Event Sourcing)
     */
    container.registerSingleton<ISyncQueue>('syncQueue', () => {
        const logger = container.resolve<ILogger>('logger');
        const eventBus = container.resolve<EventBus>('eventBus');
        const networkDetector = container.resolve<INetworkDetector>('networkDetector');
        return new SyncQueue(logger, eventBus, networkDetector);
    });

    // ==================== SyncBatcher ====================

    /**
     * SyncBatcher (batch optimization)
     * Batches events for efficient sync
     * 
     * Features:
     * - Configurable batch size (default: 50)
     * - Auto-flush after timeout (default: 5s)
     * - Deduplication (latest event wins)
     * - Batch splitting (max 100 per API call)
     * - Gzip compression
     * - Metrics tracking
     */
    container.registerSingleton('syncBatcher', () => {
        const logger = container.resolve<ILogger>('logger');
        const eventBus = container.resolve<EventBus>('eventBus');
        return new SyncBatcher(logger, eventBus);
    });

    // ==================== OfflineQueue ====================

    /**
     * OfflineQueue (offline-first support)
     * Queues events when network is unavailable
     * 
     * Features:
     * - IndexedDB persistence
     * - Auto-sync when network reconnects
     * - Chronological ordering
     * - Queue size monitoring
     */
    container.registerSingleton('offlineQueue', () => {
        const logger = container.resolve<ILogger>('logger');
        const eventBus = container.resolve<EventBus>('eventBus');
        const networkDetector = container.resolve<INetworkDetector>('networkDetector');
        return new OfflineQueue(logger, eventBus, networkDetector);
    });

    // ==================== SyncStatus ====================

    /**
     * SyncStatus (sync state tracking)
     * Tracks current sync state and progress
     * 
     * Features:
     * - State management (idle/syncing/error/offline/rate_limited)
     * - Progress tracking (0-100%)
     * - chrome.storage persistence
     * - Event emission for UI integration
     */
    container.registerSingleton('syncStatus', () => {
        const logger = container.resolve<ILogger>('logger');
        const eventBus = container.resolve<EventBus>('eventBus');
        return new SyncStatus(logger, eventBus);
    });
}
