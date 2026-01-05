/**
 * @file migration-service.ts
 * @description Data migration service for schema versioning
 *
 * Design Patterns Applied:
 * - Strategy Pattern: Different migration strategies per version
 * - Adapter Pattern: Adapts old data to new schema
 * - Builder Pattern: Constructs migrated data step-by-step
 *
 * From Quality Framework: "Schema versioning with backward compatibility"
 */

import type { HighlightDataV1, HighlightDataV2 } from '../schemas/highlight-schema';
import { generateContentHash } from '../utils/content-hash';
import { LoggerFactory } from '../utils/logger';
import type { ILogger } from '../utils/logger';

/**
 * Migration Service
 *
 * Handles data migration between schema versions
 * Ensures backward compatibility and safe evolution
 *
 * Pattern: Strategy Pattern (different migrations per version)
 */
export class MigrationService {
  private logger: ILogger;

  constructor() {
    this.logger = LoggerFactory.getLogger('MigrationService');
  }

  /**
   * Migrate V1 highlight to V2
   *
   * V1 Schema: { id, text, color (hex), type, ranges, createdAt? }
   * V2 Schema: { version: 2, id, text, contentHash, colorRole, type, ranges, createdAt }
   *
   * Changes:
   * - Add version: 2
   * - Add contentHash (SHA-256)
   * - Convert color (hex) → colorRole (semantic)
   * - Keep color for backward compat
   * - Add metadata.source = 'migration'
   */
  async migrateV1ToV2(v1: HighlightDataV1): Promise<HighlightDataV2> {
    this.logger.debug('Migrating V1 to V2', {
      id: v1.id,
      hasColor: !!v1.color,
    });

    // Generate content hash
    const contentHash = await generateContentHash(v1.text);

    // Infer semantic color role from hex color
    const colorRole = this.inferColorRole(v1.color);

    // Build V2 data
    const v2: HighlightDataV2 = {
      version: 2,
      id: v1.id,
      text: v1.text,
      contentHash,
      colorRole,
      color: v1.color, // Keep for backward compatibility
      type: v1.type,
      ranges: v1.ranges,
      createdAt: v1.createdAt || new Date(),
      metadata: {
        source: 'migration',
      },
    };

    this.logger.info('Migrated V1 to V2', {
      id: v2.id,
      colorRole: v2.colorRole,
      originalColor: v1.color,
    });

    return v2;
  }

  /**
   * Infer semantic color role from hex color
   *
   * Maps old hex colors to new semantic design tokens
   * Fallback: 'yellow' (default highlight color)
   */
  private inferColorRole(
    hexColor: string | undefined
  ): 'yellow' | 'orange' | 'blue' | 'green' | 'purple' | 'pink' | 'teal' {
    // [OK] Defensive: Handle undefined/null color
    if (!hexColor) {
      this.logger.warn('No color provided, defaulting to yellow');
      return 'yellow';
    }

    const colorMap: Record<
      string,
      'yellow' | 'orange' | 'blue' | 'green' | 'purple' | 'pink' | 'teal'
    > = {
      // Yellow shades
      '#FFEB3B': 'yellow',
      '#FFF176': 'yellow',
      '#FFEE58': 'yellow',

      // Orange shades
      '#FFB74D': 'orange',
      '#FF9800': 'orange',
      '#FFA726': 'orange',

      // Blue shades
      '#64B5F6': 'blue',
      '#2196F3': 'blue',
      '#42A5F5': 'blue',

      // Green shades
      '#81C784': 'green',
      '#4CAF50': 'green',
      '#66BB6A': 'green',

      // Purple shades
      '#BA68C8': 'purple',
      '#9C27B0': 'purple',
      '#AB47BC': 'purple',

      // Pink shades
      '#F06292': 'pink',
      '#E91E63': 'pink',
      '#EC407A': 'pink',

      // Teal shades
      '#4DB6AC': 'teal',
      '#009688': 'teal',
      '#26A69A': 'teal',
    };

    const normalized = hexColor.toUpperCase();
    const inferred = colorMap[normalized] || 'yellow';

    if (!colorMap[normalized]) {
      this.logger.warn('Unknown hex color, defaulting to yellow', {
        hexColor,
        inferred,
      });
    }

    return inferred;
  }

  /**
   * Check if data needs migration
   *
   * Returns true if data is in old format (V1 or unversioned)
   */
  needsMigration(data: any): boolean {
    // V2 has version: 2 and contentHash
    const isV2 = data.version === 2 && data.contentHash && data.colorRole;

    // If not V2, needs migration
    return !isV2;
  }

  /**
   * Auto-detect version and migrate to latest
   *
   * Handles:
   * - Unversioned data (treat as V1)
   * - V1 data (explicit version: 1)
   * - V2 data (pass through)
   */
  async migrateToLatest(data: any): Promise<HighlightDataV2> {
    // Already V2 - no migration needed
    if (!this.needsMigration(data)) {
      this.logger.debug('Data already V2', { id: data.id });
      return data as HighlightDataV2;
    }

    // Treat as V1 and migrate
    this.logger.info('Auto-migrating to V2', {
      id: data.id,
      hasVersion: 'version' in data,
    });

    return this.migrateV1ToV2(data);
  }
}
