/**
 * @file tag-service.ts
 * @description Application service for normalized highlight labels.
 */

import type { ITagRepository } from '@/shared/repositories/i-tag-repository';
import type { ITagLabelResolver } from '@/shared/services/i-tag-label-resolver';
import type { TagEntity } from '@/shared/types/tag-entity';
import {
  mergeHighlightLabels,
  normalizeHighlightTags,
} from '@/shared/utils/highlight-metadata';
import type { ILogger } from '@/shared/utils/logger';

export class TagService implements ITagLabelResolver {
  constructor(
    private readonly localRepository: ITagRepository,
    private readonly cloudRepository: ITagRepository | null,
    private readonly isAuthenticated: () => boolean,
    private readonly logger: ILogger
  ) {}

  async listByUser(): Promise<TagEntity[]> {
    return this.localRepository.listAll();
  }

  async getLabelsForHighlight(highlightId: string): Promise<string[]> {
    return this.localRepository.getLabelsForHighlight(highlightId);
  }

  async getLabelsForHighlights(highlightIds: string[]): Promise<Map<string, string[]>> {
    return this.localRepository.getLabelsForHighlights(highlightIds);
  }

  async setHighlightLabels(highlightId: string, names: string[]): Promise<void> {
    const normalized = normalizeHighlightTags(names);
    await this.localRepository.setHighlightLabels(highlightId, normalized);

    if (this.isAuthenticated() && this.cloudRepository) {
      try {
        await this.cloudRepository.setHighlightLabels(highlightId, normalized);
      } catch (error) {
        this.logger.warn('[TagService] cloud label write failed; local copy kept', {
          highlightId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /** Dual-read during migration: union junction labels with legacy metadata.tags. */
  mergeWithMetadataFallback(
    junctionLabels?: string[],
    metadataTags?: string[]
  ): string[] | undefined {
    return mergeHighlightLabels(junctionLabels, metadataTags);
  }
}
