/**
 * Ephemeral Mode
 *
 * Philosophy: "Light footprint" - Persist for 24 hours, then auto-clear.
 *
 * Features:
 * - 24-hour TTL (auto-delete after 24 hours)
 * - Local storage with per-domain encryption
 * - Restores highlights on page reload within TTL window
 * - Collections view enabled
 * - No account required
 *
 * Architectural Compliance:
 * - Implements IBasicMode only (Interface Segregation Principle)
 * - Encapsulates persistence logic (Single Responsibility Principle)
 *
 * @see docs/05-quality-framework/03-architecture-principles.md#interface-segregation
 */

import { BaseHighlightMode } from './base-highlight-mode';
import type { HighlightData, DeletionConfig } from './highlight-mode.interface';
import type { IBasicMode, ModeCapabilities } from './mode-interfaces';


import { serializeRange } from '@/content/utils/range-converter';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightCreatedEvent, HighlightRemovedEvent } from '@/shared/types/events';
import { EventName } from '@/shared/types/events';
import { generateContentHash } from '@/shared/utils/content-hash';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export class EphemeralMode extends BaseHighlightMode implements IBasicMode {
  get name(): 'ephemeral' {
    return 'ephemeral' as const;
  }

  constructor(
    repository: IHighlightRepository,
    storage: IStorage,
    eventBus: EventBus,
    logger: ILogger
  ) {
    super(eventBus, logger, repository);
    this.storage = storage;
  }

  readonly capabilities: ModeCapabilities = {
    persistence: 'local',
    undo: true,
    sync: false,
    collections: true,
    tags: false,
    export: false,
    ai: false,
    search: false,
    multiSelector: false,
  };

  async createHighlight(selection: Selection, colorRole: string): Promise<string> {
    if (selection.rangeCount === 0) {
      throw new Error('No range in selection');
    }

    const range = selection.getRangeAt(0);
    const text = range.toString().trim();

    if (!text) {
      throw new Error('Empty text selection');
    }

    const contentHash = await generateContentHash(text);
    const existing = await this.repository.findByContentHash(contentHash);

    if (existing && existing.id) {
      this.logger.info('Duplicate content detected (Ephemeral Mode)', {
        existingId: existing.id,
      });
      return existing.id;
    }

    const id = this.generateId();
    const serializedRange = serializeRange(range);

    if (!serializedRange) {
      throw new Error('Failed to serialize range');
    }

    const runtimeHighlight = {
      id,
      text,
      colorRole,
      type: 'underscore' as const,
      createdAt: new Date(),
      ranges: [serializedRange],
      liveRanges: [range],
    };

    await this.renderAndRegister(runtimeHighlight as unknown as HighlightData);

    const { toStorageFormat } = await import('@/content/highlight-type-bridge');
    const storageData = await toStorageFormat({
      ...runtimeHighlight,
      color: colorRole,
    });

    await this.repository.add({
      ...storageData,
      url: window.location.href,
    });

    this.eventBus.emit(EventName.HIGHLIGHT_CREATED, {
      type: EventName.HIGHLIGHT_CREATED,
      highlight: {
        id: runtimeHighlight.id,
        text: runtimeHighlight.text,
        colorRole: runtimeHighlight.colorRole,
        ranges: runtimeHighlight.ranges,
      },
    });

    this.logger.info('Created highlight in Ephemeral Mode', { id });

    return id;
  }

  async createFromData(data: HighlightData): Promise<void> {
    await this.renderAndRegister(data);

    const { toStorageFormat } = await import('@/content/highlight-type-bridge');
    const { liveRanges, ...persisted } = data as HighlightData & { liveRanges?: Range[] };
    const storageData = await toStorageFormat({
      ...persisted,
      color: data.colorRole,
      type: 'underscore',
      createdAt: data.createdAt ?? new Date(),
      ranges: data.ranges,
    });

    await this.repository.add(storageData);
  }

  async updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void> {
    const existing = this.data.get(id);
    if (!existing) return;

    const updated = { ...existing, ...updates };

    if (updates.colorRole && updates.colorRole !== existing.colorRole) {
      await super.removeHighlight(id);
      await this.renderAndRegister(updated);
    } else {
      this.data.set(id, updated);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.update(id, updates as any);
  }

  override async removeHighlight(id: string): Promise<void> {
    await super.removeHighlight(id);

    await this.repository.remove(id);

    this.logger.info('Removed highlight (Ephemeral Mode)', { id });
  }

  async clearAll(): Promise<void> {
    const count = this.data.size;

    CSS.highlights.clear();
    this.highlights.clear();
    this.data.clear();
    await this.repository.clear();

    if (this.storage) {
      await this.storage.saveEvent({
        type: 'highlights.cleared',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        count,
      });
    }

    this.logger.info('Cleared all highlights (Ephemeral Mode)', { count });
  }

  override async onHighlightCreated(event: HighlightCreatedEvent): Promise<void> {
    this.logger.debug('[EPHEMERAL] onHighlightCreated called', {
      highlightId: event.highlight.id,
      hasStorage: !!this.storage,
    });

    const { toStorageFormat } = await import('@/content/highlight-type-bridge');
    const storageData = await toStorageFormat({
      ...event.highlight,
      type: event.highlight.type || 'underscore',
      createdAt: event.highlight.createdAt || new Date(),
    });

    if (this.storage) {
      await this.storage.saveEvent({
        type: 'highlight.created',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        data: storageData,
      });
    }
  }

  override async onHighlightRemoved(event: HighlightRemovedEvent): Promise<void> {
    if (this.storage) {
      await this.storage.saveEvent({
        type: 'highlight.removed',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        highlightId: event.highlightId,
      });
    }
  }

  override shouldRestore(): boolean {
    return true;
  }

  override getDeletionConfig(): DeletionConfig {
    return {
      showDeleteIcon: true,
      requireConfirmation: false,
      allowUndo: true,
      iconType: 'remove',
    };
  }
}
