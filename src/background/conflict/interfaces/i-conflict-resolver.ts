/**
 * @file i-conflict-resolver.ts
 * @description Interface for resolving conflicts using various strategies
 * @see docs/05-quality-framework/01-system-design-patterns.md (Strategy Pattern)
 */

import type { SyncEvent } from '../../events/event-types';
import type { Conflict, ConflictType } from './i-conflict-detector';
import type { VectorClock } from './i-vector-clock-manager';

/**
 * Resolution strategies for conflicts
 * 
 * Different strategies are appropriate for different conflict types:
 * - METADATA_CONFLICT: MERGE, LAST_WRITE_WINS
 * - DELETE_CONFLICT: LOCAL_WINS, REMOTE_WINS, MANUAL
 * - POSITION_CONFLICT: KEEP_BOTH, LAST_WRITE_WINS
 * - CONTENT_CONFLICT: MANUAL, LAST_WRITE_WINS
 */
export enum ResolutionStrategy {
    /**
     * Last-Write-Wins: Choose event with most recent timestamp
     * - Simple and deterministic
     * - May lose data if timestamps are close
     * - Good for metadata conflicts
     */
    LAST_WRITE_WINS = 'last_write_wins',

    /**
     * Keep-Both: Create two separate highlights
     * - Preserves all data
     * - May create duplicates
     * - Good for position conflicts
     */
    KEEP_BOTH = 'keep_both',

    /**
     * Merge: Combine non-conflicting fields
     * - Best effort to preserve all changes
     * - Only works for metadata conflicts
     * - Example: merge tags, keep newer color
     */
    MERGE = 'merge',

    /**
     * Manual: Prompt user to resolve
     * - User makes final decision
     * - Required for content conflicts
     * - Timeout defaults to LAST_WRITE_WINS
     */
    MANUAL = 'manual',

    /**
     * Local-Wins: Always choose local version
     * - Simple policy
     * - Good for offline-first scenarios
     */
    LOCAL_WINS = 'local_wins',

    /**
     * Remote-Wins: Always choose remote version
     * - Server authority
     * - Good for server-authoritative data
     */
    REMOTE_WINS = 'remote_wins',
}

/**
 * Result of conflict resolution
 */
export interface ResolutionResult {
    /** Resolved event (with merged vector clock) */
    readonly resolvedEvent: SyncEvent;

    /** Strategy used for resolution */
    readonly strategy: ResolutionStrategy;

    /** Merged vector clock from both sides */
    readonly mergedClock: VectorClock;

    /** Timestamp when resolution occurred */
    readonly resolvedAt: number;
}

/**
 * Conflict Resolver Interface
 * 
 * Resolves conflicts using pluggable strategies (Strategy Pattern).
 * All strategies must merge vector clocks to maintain causality.
 * 
 * **Resolution Flow**:
 * 1. Validate strategy is applicable to conflict type
 * 2. Apply strategy to get resolved event
 * 3. Merge vector clocks from both sides
 * 4. Emit resolution event
 * 5. Return resolved event
 * 
 * **Vector Clock Merging** (CRITICAL):
 * - Always merge clocks: merge(local.clock, remote.clock)
 * - Ensures resolved event is causally after both conflicting events
 * - Prevents future conflicts on same entity
 * 
 * @see ResolutionStrategy for available strategies
 */
export interface IConflictResolver {
    /**
     * Resolve a conflict using specified strategy
     * 
     * @param conflict - Conflict to resolve
     * @param strategy - Resolution strategy to use
     * @returns Resolved event with merged vector clock
     * @throws {ResolutionStrategyError} If strategy invalid or incompatible
     * @throws {UnresolvableConflictError} If resolution fails
     * 
     * @example
     * const resolved = await resolver.resolve(conflict, ResolutionStrategy.LAST_WRITE_WINS);
     * // resolved.resolvedEvent has merged vector clock
     */
    resolve(
        conflict: Conflict,
        strategy: ResolutionStrategy
    ): Promise<SyncEvent>;

    /**
     * Check if strategy can resolve this conflict type
     * 
     * @param conflict - Conflict to check
     * @param strategy - Strategy to validate
     * @returns true if strategy is applicable, false otherwise
     * 
     * **Compatibility Matrix**:
     * - METADATA_CONFLICT: All strategies except KEEP_BOTH
     * - DELETE_CONFLICT: LOCAL_WINS, REMOTE_WINS, MANUAL (not MERGE)
     * - POSITION_CONFLICT: All strategies
     * - CONTENT_CONFLICT: MANUAL, LAST_WRITE_WINS, LOCAL_WINS, REMOTE_WINS
     * 
     * @example
     * if (!resolver.canResolve(conflict, strategy)) {
     *   // Choose different strategy
     * }
     */
    canResolve(conflict: Conflict, strategy: ResolutionStrategy): boolean;

    /**
     * Get list of applicable strategies for conflict
     * 
     * @param conflict - Conflict to analyze
     * @returns Array of applicable strategies (ordered by preference)
     * 
     * @example
     * const strategies = resolver.getAvailableStrategies(conflict);
     * // Try first strategy, fallback to others if needed
     */
    getAvailableStrategies(conflict: Conflict): ResolutionStrategy[];

    /**
     * Get resolution metrics
     * 
     * @returns Metrics snapshot
     */
    getMetrics(): ResolutionMetrics;
}

/**
 * Metrics for conflict resolution
 */
export interface ResolutionMetrics {
    /** Total conflicts resolved */
    totalResolved: number;

    /** Resolutions by strategy */
    resolutionsByStrategy: Record<ResolutionStrategy, number>;

    /** Failed resolutions */
    totalFailed: number;

    /** Average resolution time (ms) */
    averageResolutionTime: number;

    /** Manual resolution rate (%) */
    manualResolutionRate: number;
}
