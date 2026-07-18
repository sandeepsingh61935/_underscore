/**
 * Basic Mode (Guest)
 *
 * Philosophy: permanent local storage on this device — no TTL, no expiry UI.
 * Sign in to unlock Pro storage, sync, and gated features.
 */

import { BaseHighlightMode } from './base-highlight-mode';
import type { HighlightData, DeletionConfig } from './highlight-mode.interface';
import type { IBasicMode, ModeCapabilities } from './mode-interfaces';

import { serializeRange } from '@/content/utils/range-converter';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightCreatedEvent, HighlightRemovedEvent } from '@/shared/types/events';
import { EventName } from '@/shared/types/events';
import { generateContentHash } from '@/shared/utils/content-hash';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export class BasicMode extends BaseHighlightMode implements IBasicMode {
  get name(): 'basic' {
    return 'basic' as const;
  }

  constructor(
    facade: RepositoryFacade,
    storage: IStorage,
    eventBus: EventBus,
    logger: ILogger
  ) {
    super(eventBus, logger, facade);
    this.storage = storage;
  }

  readonly capabilities: ModeCapabilities = {
    persistence: 'local',
    undo: true,
    sync: false,
    collections: true,
    tags: true,
    export: false,
    ai: false,
    mcp: false,
    search: true,
    multiSelector: false,
  };

  override async onActivate(): Promise<void> {
    await super.onActivate();
  }

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
    const existing = this.facade.findByContentHash(contentHash);

    if (existing && existing.id) {
      this.logger.info('Duplicate content detected - returning existing highlight (Basic Mode)', {
        existingId: existing.id,
      });
      return existing.id;
    }

    const id = this.generateId();
    const serializedRange = serializeRange(range);

    if (!serializedRange) {
      throw new Error('Failed to serialize range');
    }

    const now = new Date();
    const runtimeHighlight = {
      id,
      text,
      colorRole,
      type: 'underscore' as const,
      createdAt: now,
      updatedAt: now,
      ranges: [serializedRange],
      liveRanges: [range],
    };

    await this.renderAndRegister(runtimeHighlight as unknown as HighlightData);

    const { toStorageFormat } = await import('@/content/highlight-type-bridge');
    const storageData = await toStorageFormat({
      ...runtimeHighlight,
      color: colorRole,
    });

    await this.facade.addPersisted({
      ...storageData,
      url: normalizePageUrl(window.location.href),
      updatedAt: now,
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

    this.logger.info('Created highlight in Basic Mode', { id });

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

    const pageUrl = data.url ?? normalizePageUrl(window.location.href);
    const now = new Date();

    await this.facade.addPersisted({
      ...storageData,
      url: pageUrl,
      updatedAt: (data as { updatedAt?: Date }).updatedAt ?? now,
    });

    this.eventBus.emit(EventName.HIGHLIGHT_CREATED, {
      type: EventName.HIGHLIGHT_CREATED,
      highlight: {
        id: data.id,
        text: data.text,
        colorRole: data.colorRole,
        ranges: data.ranges,
      },
    });
  }

  async updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void> {
    const existing = this.data.get(id);
    if (!existing) {
      throw new Error(`Highlight ${id} not found`);
    }

    const updated = { ...existing, ...updates };

    if (updates.colorRole && updates.colorRole !== existing.colorRole) {
      await super.removeHighlight(id);
      await this.renderAndRegister(updated);
    } else {
      this.data.set(id, updated);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.facade.update(id, updates as any);
  }

  override async removeHighlight(id: string): Promise<void> {
    this.logger.info('Removing highlight (Basic Mode)', { id });

    await super.removeHighlight(id);

    this.facade.remove(id);

    this.logger.info('Highlight removed completely (Basic Mode)', { id });
  }

  async clearAll(): Promise<void> {
    const count = this.data.size;
    this.logger.info('Clearing all highlights in Basic Mode', { count });

    CSS.highlights.clear();
    this.highlights.clear();
    this.data.clear();
    this.facade.clear();

    if (this.storage) {
      await this.storage.saveEvent({
        type: 'highlights.cleared',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        count,
      });
    }

    this.logger.info('All highlights cleared (Basic Mode, with storage event)', { count });
  }

  override async onHighlightCreated(event: HighlightCreatedEvent): Promise<void> {
    this.logger.debug('[BASIC] onHighlightCreated called', {
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
    this.logger.debug('[BASIC] Persisting removal event');

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
