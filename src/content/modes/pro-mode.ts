/**
 * Pro Mode
 *
 * Philosophy: "Permanent & Reliable" - Store forever, recover from anything.
 * Requires authentication. Replaces the former CloudMode (renamed only —
 * behavior is unchanged).
 *
 * Features:
 * - Permanent storage (IndexedDB)
 * - Robust 3-Tier Re-anchoring (XPath -> Position -> Fuzzy)
 * - Server Sync
 * - Collections & Tags
 *
 * Architectural Compliance:
 * - Implements IPersistentMode
 * - Uses CloudModeService Facade for complex persistence logic
 */

import { BaseHighlightMode } from './base-highlight-mode';
import type { HighlightData, DeletionConfig } from './highlight-mode.interface';
import type { IPersistentMode, ModeCapabilities } from './mode-interfaces';

import { serializeRange } from '@/content/utils/range-converter';

import { CloudModeService } from '@/services/cloud-mode-service';
import { MultiSelectorEngine } from '@/services/multi-selector-engine';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import { generateContentHash } from '@/shared/utils/content-hash';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import { EventName } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export interface ProModeDeps {
  /** IPC read path to hydrate the facade after page reload (empty local cache). */
  highlightReader?: IReadableHighlightRepository;
}

export class ProMode extends BaseHighlightMode implements IPersistentMode {
  protected cloudService: CloudModeService;
  private readonly highlightReader?: IReadableHighlightRepository;

  // Widened to 'pro' | 'pro_xai' so ProXaiMode (which extends this class and
  // shares all its persistence/sync behavior) can override with its own
  // literal without violating property-override covariance rules.
  get name(): 'pro' | 'pro_xai' {
    return 'pro' as const;
  }

  constructor(
    facade: RepositoryFacade,
    eventBus: EventBus,
    logger: ILogger,
    deps: ProModeDeps = {}
  ) {
    super(eventBus, logger, facade);
    this.highlightReader = deps.highlightReader;
    // Same DI facade as modes — never a private empty InMemory store.
    this.cloudService = new CloudModeService(facade, new MultiSelectorEngine(), logger);
  }

  override async onActivate(): Promise<void> {
    await super.onActivate();
    await this.restore();

    // Subscribe to bridged events from background (Real-Time Sync)
    // We use runtime.onMessage because EventBus is not shared between context (Background <-> Content)
    chrome.runtime.onMessage.addListener(this.handleRuntimeMessage.bind(this));
  }

  override async onDeactivate(): Promise<void> {
    await super.onDeactivate();
    // Remove listener (optional, as listener is tied to content script lifecycle)
    chrome.runtime.onMessage.removeListener(this.handleRuntimeMessage.bind(this));
  }

  /**
   * Handle bridged events from background
   */
  private async handleRuntimeMessage(message: any, _sender: any, _sendResponse: any): Promise<void> {
    // Only handle internal bridged events
    if (!message || !message.type || !message.type.startsWith('remote:highlight')) return;

    this.logger.info('[PRO] [MSG] Received remote event', { type: message.type, id: message.payload?.id });

    try {
      switch (message.type) {
        case EventName.REMOTE_HIGHLIGHT_CREATED: // 'remote:highlight:created'
          await this.handleRemoteHighlightCreated(message.payload);
          break;
        case EventName.REMOTE_HIGHLIGHT_UPDATED: // 'remote:highlight:updated'
          await this.handleRemoteHighlightUpdated(message.payload);
          break;
        case EventName.REMOTE_HIGHLIGHT_DELETED: // 'remote:highlight:deleted'
          await this.handleRemoteHighlightDeleted(message.payload);
          break;
      }
    } catch (error) {
      this.logger.error('[PRO] Failed to handle remote event', error as Error);
    }
  }

  /**
   * Handle remote highlight creation
   * CRITICAL: Must use { skipSync: true } to prevent infinite loops
   */
  private async handleRemoteHighlightCreated(data: HighlightData): Promise<void> {
    // 1. Deduplication Check
    if (this.highlights.has(data.id)) {
      this.logger.debug('[PRO] Skipping remote highlight (already exists)', { id: data.id });
      return;
    }

    this.logger.info('[PRO] Process remote highlight', { id: data.id });

    try {
      // Step 1: Save to DB (Local Only)
      // Precondition: `data` is a server-side highlight payload (HighlightDataV2) and
      // does NOT carry `liveRanges`. The live DOM Range is only added below (line 107)
      // for `renderAndRegister`. Persisting a Range object to IDB would throw
      // DataCloneError — Bug A.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.facade.add(data as any);

      this.logger.info('[PRO] Saved remote highlight to local DB. Attempting instant render...');

      // Instant Render: Restore range and inject CSS
      const restoreResult = await this.cloudService.restoreHighlight(data as any);

      if (restoreResult.range) {
        const fullData = { ...data, liveRanges: [restoreResult.range] } as unknown as HighlightData;
        await this.renderAndRegister(fullData);

        this.logger.info('[PRO] [FAST] Instant render successful', {
          id: data.id,
          tier: restoreResult.restoredUsing
        });
      } else {
        this.logger.warn('[PRO] Instant render failed - range could not be restored');
      }

    } catch (e) {
      this.logger.error('Failed to handle remote highlight', e as Error);
    }
  }

  /**
   * Handle remote highlight deletion
   */
  private async handleRemoteHighlightDeleted(payload: { id: string }): Promise<void> {
    const id = payload?.id;
    if (!id) return;

    this.logger.info('[PRO] Handling remote deleted', { id });

    // 2. Remove from page session only (background already deleted via library sync).
    await this.detachFromPage(id);
  }

  /**
   * Handle remote highlight update
   */
  private async handleRemoteHighlightUpdated(data: HighlightData): Promise<void> {
    const id = data?.id;
    if (!id) return;

    this.logger.info('[PRO] Handling remote updated', { id });

    // Conflict Detection: Log when update arrives for existing highlight
    // Note: Without updatedAt timestamps, we can't determine "who wins"
    // This just provides observability for potential concurrent edits
    const localHighlight = this.data.get(id);
    if (localHighlight) {
      this.logger.info('[PRO] [STAT] Update received for existing highlight (potential concurrent edit)', {
        highlightId: id,
        hasLocalVersion: true,
        resolution: 'Last-Write-Wins (accepting remote)'
      });
    }

    // 1. Update local repository (LWW resolution).
    // The RepositoryFacade doesn't accept options; skipSync is wired at
    // the DualWriteRepository layer if needed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.facade.update(id, data as any);

    // 2. Update properties if changed (e.g. Color)
    if (data.colorRole && localHighlight && data.colorRole !== localHighlight.colorRole) {
      await super.removeHighlight(id);
      await this.renderAndRegister({ ...localHighlight, ...data });
    } else {
      // Update internal data
      this.data.set(id, data as any);
    }
  }

  readonly capabilities: ModeCapabilities = {
    persistence: 'indexeddb',
    undo: true,
    sync: true,
    collections: true,
    tags: true,
    export: true,
    ai: false,
    mcp: false,
    search: true,
    multiSelector: true,
  };

  override shouldRestore(): boolean {
    // Pro Mode handles its own restoration via onActivate() -> restore()
    // We must return FALSE here to prevent content.ts from running the default restoreHighlights()
    // which would clear the repository and replay incompatible events from other modes.
    this.logger.info('[DEBUG] ProMode.shouldRestore() called - returning false');
    return false;
  }

  /**
   * Create highlight from existing data (e.g., Undo/Restore)
   */
  async createFromData(data: HighlightData, _options?: { skipSync?: boolean }): Promise<void> {
    // 1. Ensure live ranges exist
    if (!data.liveRanges || data.liveRanges.length === 0) {
      this.logger.warn('[PRO] createFromData called without live ranges', data.id);
      return;
    }

    // 2. Persist
    const range = data.liveRanges[0]!;

    // Use saveHighlight to ensure persistence + selectors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.cloudService.saveHighlight(data as any, range);

    // 3. Render
    await this.renderAndRegister(data);

    // 4. Update Repository (Idempotent check)
    // Note: repository is RepositoryFacade with sync API (get/has, not findById)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alreadyExists = this.facade.get?.(data.id) || this.facade.has?.(data.id);
    if (!alreadyExists) {
      // Strip runtime-only fields (liveRanges) before persisting — Bug A.
      const { toStorageFormat } = await import('@/content/highlight-type-bridge');
      const { liveRanges: _lr, ...persisted } = data as HighlightData & { liveRanges?: Range[] };
      const storageData = await toStorageFormat({
        ...persisted,
        color: data.colorRole,
        type: 'underscore',
        createdAt: data.createdAt ?? new Date(),
        ranges: data.ranges,
      });
      this.facade.add({
        ...storageData,
        url: data.url ?? normalizePageUrl(window.location.href),
      });
    } else {
      this.logger.debug('[PRO] Skipping duplicate repo add during create', {
        id: data.id,
      });
    }
  }

  async updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void> {
    // CloudModeService doesn't have partial update yet, but we can implement it or overwrite.
    // For now, get existing -> merge -> save.

    const existing = this.data.get(id);
    if (!existing) {
      this.logger.warn('[PRO] Cannot update non-existent highlight', id);
      return;
    }

    const updated = { ...existing, ...updates };

    // Update runtime
    if (updates.colorRole && updates.colorRole !== existing.colorRole) {
      await super.removeHighlight(id);
      await this.renderAndRegister(updated);
    } else {
      this.data.set(id, updated);
    }

    // Strip runtime-only fields (liveRanges) before persisting — Bug A.
    // `updated` carries liveRanges from `existing`; we must remove them so the
    // repository can serialize the object via structuredClone (IDB).
    const { toStorageFormat } = await import('@/content/highlight-type-bridge');
    const { liveRanges: _lrFromUpdated, ...persisted } = updated as HighlightData & { liveRanges?: Range[] };
    const storageData = await toStorageFormat({
      ...persisted,
      color: updated.colorRole,
      type: 'underscore',
      createdAt: updated.createdAt ?? new Date(),
      ranges: updated.ranges,
    });
    await this.facade.add({
      ...storageData,
      url: window.location.href,
    });

    // Also strip liveRanges from the partial update payload in case the caller
    // included it — Bug A.
    const { liveRanges: _lrFromUpdates, ...cleanUpdates } = updates as Partial<HighlightData> & { liveRanges?: Range[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.facade.update(id, cleanUpdates as any);

    // Update storage
    // Assuming ranges didn't change, we use the first live range
    const range = existing.liveRanges && existing.liveRanges[0];
    if (range) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.cloudService.saveHighlight(updated as any, range);
    }
  }

  override async clearAll(): Promise<void> {
    await this.cloudService.clearAll();

    for (const id of this.data.keys()) {
      await super.removeHighlight(id);
    }
    this.facade.clear();
  }

  // IPersistentMode methods

  async saveToStorage(highlight: HighlightData): Promise<void> {
    if (!highlight.liveRanges || !highlight.liveRanges.length) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.cloudService.saveHighlight(highlight as any, highlight.liveRanges[0]!);
  }

  async loadFromStorage(_url: string): Promise<HighlightData[]> {
    const restored = await this.cloudService.restoreHighlightsForUrl();
    return restored.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) =>
        ({ ...r.highlight, liveRanges: r.range ? [r.range] : [] }) as any as HighlightData
    );
  }

  /**
   * Create a highlight in Pro Mode
   *
   * 1. Check for duplicates
   * 2. Persist to IndexedDB (via CloudModeService) with robust selectors
   * 3. Update Runtime State (CSS.highlights, Repository)
   */
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
    if (existing?.id) {
      this.logger.info('Duplicate content detected - returning existing highlight (Pro Mode)', {
        existingId: existing.id,
      });
      return existing.id;
    }

    const id = this.generateId();
    const serializedRange = serializeRange(range);
    if (!serializedRange) throw new Error('Failed to serialize range');

    // Build the runtime highlight with the live Range for in-page rendering.
    const runtimeHighlight = {
      id,
      text,
      contentHash,
      colorRole: colorRole || 'yellow',
      type: 'underscore' as const,
      createdAt: new Date(),
      ranges: [serializedRange],
      liveRanges: [range],
    };

    if (!runtimeHighlight.liveRanges || !runtimeHighlight.liveRanges.length) {
      throw new Error('Cannot create highlight without live ranges');
    }
    const liveRange = runtimeHighlight.liveRanges[0]!;

    // 1. Persist to Vault Storage (IndexedDB + Selectors)
    // This handles the "Heavy Lifting" of creating selectors and saving to DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.cloudService.saveHighlight(runtimeHighlight as any, liveRange);

    // 2 & 3. Update Runtime API & Internal State
    await this.renderAndRegister(runtimeHighlight as unknown as HighlightData);

    // 4. Update In-Memory Repository (for UI consistency)
    // Strip runtime-only fields (liveRanges) before persisting — Bug A.
    const { toStorageFormat } = await import('@/content/highlight-type-bridge');
    const storageData = await toStorageFormat({
      ...runtimeHighlight,
      color: runtimeHighlight.colorRole,
    });
    this.facade.add({
      ...storageData,
      url: normalizePageUrl(window.location.href),
    });

    this.eventBus.emit(EventName.HIGHLIGHT_CREATED, {
      type: EventName.HIGHLIGHT_CREATED,
      highlight: runtimeHighlight as unknown as HighlightData,
      timestamp: Date.now()
    });

    return id;
  }

  override async removeHighlight(id: string): Promise<void> {
    // 1. Remove from Storage (CloudModeService handles repository removal via DualWriteRepository)
    await this.cloudService.deleteHighlight(id);

    // 2. Remove from Runtime
    await super.removeHighlight(id);

    // 3. Remove from Session Repository (for UI consistency / HoverDetector)
    // NOTE: persistence is handled by cloudService above, but we must clear session state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (this.facade.remove) {
      await this.facade.remove(id);
    }

    this.eventBus.emit(EventName.HIGHLIGHT_REMOVED, {
      type: EventName.HIGHLIGHT_REMOVED,
      highlightId: id,
      timestamp: Date.now()
    });
  }

  async restore(_url?: string): Promise<void> {
    this.logger.info('[PRO] [SYNC] Starting restore process...');

    const pageUrl = normalizePageUrl(window.location.href);
    if (this.highlightReader) {
      try {
        const stored = await this.highlightReader.findByUrl(pageUrl);
        for (const highlight of stored) {
          this.facade.rehydrate(highlight);
        }
        this.logger.info('[PRO] Hydrated facade from IPC', { count: stored.length, pageUrl });
      } catch (error) {
        this.logger.warn('[PRO] IPC hydrate failed; continuing with local cache', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const restored = await this.cloudService.restoreHighlightsForUrl();

    this.logger.info(`[PRO] [OK] Restoring ${restored.length} highlights`);

    if (restored.length === 0) {
      this.logger.warn('[PRO] [WARN] No highlights found to restore. Check if highlights were saved with correct URL.');
      return;
    }

    for (const item of restored) {
      const { highlight: storedData, range } = item;

      if (range) {
        const fullData = {
          ...storedData,
          liveRanges: [range],
        } as unknown as HighlightData;

        await this.renderAndRegister(fullData);
        this.facade.rehydrate(storedData);

        this.logger.info(`[PRO] [OK] Restored highlight: ${storedData.id} (${storedData.text.substring(0, 30)}...)`);
      } else {
        this.logger.warn(`[PRO] [FAIL] Failed to restore range for highlight: ${storedData.id}`);
      }
    }

    this.logger.info(
      `[PRO] [DONE] Restoration complete: ${restored.filter((r) => r.range).length}/${restored.length} highlights rendered`
    );
  }

  async sync(): Promise<void> {
    await this.cloudService.syncToServer();
  }

  override getDeletionConfig(): DeletionConfig {
    return {
      showDeleteIcon: true,
      requireConfirmation: false,
      allowUndo: true,
      iconType: 'trash',
    };
  }
}
