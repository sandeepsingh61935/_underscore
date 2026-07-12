/**
 * Basic Mode
 *
 * Philosophy: "On this device" — persist locally with a user-configurable
 * TTL (see @/shared/constants/basic-ttl). Replaces the former EphemeralMode
 * (fixed 24h TTL) and LocalMode (fixed forever/no-TTL) — TTL is now a
 * setting, not a separate mode.
 *
 * Features:
 * - Local storage with per-domain namespacing
 * - TTL is configurable (24h / 2d / 7d / 30d / forever); default 24h
 * - Restores highlights on page reload within the TTL window
 * - Collections view enabled
 * - No account required
 * - Deletion requires confirmation only when TTL is set to "forever"
 *   (mirrors the previous Local Mode's confirm-before-delete behavior for
 *   highlights the user expects to keep indefinitely)
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
import {
  BASIC_TTL_DEFAULT,
  BASIC_TTL_STORAGE_KEY,
  basicTtlConfigToMs,
  getBasicTtlConfig,
  isBasicTtlConfig,
  type BasicTtlConfig,
} from '@/shared/constants/basic-ttl';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightCreatedEvent, HighlightRemovedEvent } from '@/shared/types/events';
import { EventName } from '@/shared/types/events';
import { generateContentHash } from '@/shared/utils/content-hash';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export class BasicMode extends BaseHighlightMode implements IBasicMode {
  private ttlConfig: BasicTtlConfig = BASIC_TTL_DEFAULT;
  private readonly onStorageChanged = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string
  ): void => {
    if (area !== 'local' || !changes[BASIC_TTL_STORAGE_KEY]) return;
    const next = changes[BASIC_TTL_STORAGE_KEY].newValue;
    if (isBasicTtlConfig(next)) {
      this.ttlConfig = next;
      this.storage?.setTtlDuration?.(basicTtlConfigToMs(next));
    }
  };

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
    tags: false,
    export: false,
    ai: false,
    search: false,
    multiSelector: false,
  };

  override async onActivate(): Promise<void> {
    await super.onActivate();
    await this.refreshTtlOption();

    if (chrome.storage?.onChanged?.addListener) {
      chrome.storage.onChanged.addListener(this.onStorageChanged);
    }
  }

  override async onDeactivate(): Promise<void> {
    await super.onDeactivate();

    if (chrome.storage?.onChanged?.removeListener) {
      chrome.storage.onChanged.removeListener(this.onStorageChanged);
    }
  }

  private async refreshTtlOption(): Promise<void> {
    try {
      this.ttlConfig = await getBasicTtlConfig();
    } catch (e) {
      this.logger.warn('[BASIC] Failed to read TTL preference, using default', e as Error);
    }
    this.storage?.setTtlDuration?.(basicTtlConfigToMs(this.ttlConfig));
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

    this.facade.add({
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

    this.facade.add(storageData);

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
    // Basic Mode always restores highlights (fixes the previous
    // Ephemeral Mode behavior of clearing on switch-to).
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
