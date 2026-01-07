/**
 * Vault Mode
 *
 * Philosophy: "Permanent & Reliable" - Store forever, recover from anything.
 *
 * Features:
 * - Permanent storage (IndexedDB)
 * - Robust 3-Tier Re-anchoring (XPath -> Position -> Fuzzy)
 * - Server Sync (Future)
 * - Collections & Tags
 *
 * Architectural Compliance:
 * - Implements IPersistentMode
 * - Uses VaultModeService Facade for complex persistence logic
 */

import { BaseHighlightMode } from './base-highlight-mode';
import type { HighlightData, DeletionConfig } from './highlight-mode.interface';
import type { IPersistentMode, ModeCapabilities } from './mode-interfaces';

import { serializeRange } from '@/content/utils/range-converter';
import { getHighlightName, injectHighlightCSS, removeHighlightCSS } from '@/content/styles/highlight-styles';
import { createVaultModeServiceWithCloudSync } from '@/services/vault-mode-service-factory';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import { generateContentHash } from '@/shared/utils/content-hash';
import { EventName } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export class VaultMode extends BaseHighlightMode implements IPersistentMode {
  private vaultService: any; // Type is VaultModeService, but import is tricky due to cyclic if not careful. Using any or proper type. Assuming import is ok.

  get name(): 'vault' {
    return 'vault' as const;
  }

  constructor(repository: IHighlightRepository, eventBus: EventBus, logger: ILogger) {
    super(eventBus, logger, repository);
    // Initialize service here with eventBus
    this.vaultService = createVaultModeServiceWithCloudSync(eventBus);
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
  private async handleRuntimeMessage(message: any, sender: any, sendResponse: any): Promise<void> {
    // Only handle internal bridged events
    if (!message || !message.type || !message.type.startsWith('remote:highlight')) return;

    this.logger.info('[VAULT] 📨 Received remote event', { type: message.type, id: message.payload?.id });

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
      this.logger.error('[VAULT] Failed to handle remote event', error as Error);
    }
  }

  /**
   * Handle remote highlight creation
   * CRITICAL: Must use { skipSync: true } to prevent infinite loops
   */
  private async handleRemoteHighlightCreated(data: HighlightData): Promise<void> {
    // 1. Deduplication Check
    if (this.highlights.has(data.id)) {
      this.logger.debug('[VAULT] Skipping remote highlight (already exists)', { id: data.id });
      return;
    }

    this.logger.info('[VAULT] Process remote highlight', { id: data.id });

    // 2. Restore logic (similar to restore(), but for single item)
    // We need to find the range. Since we have selectors in 'data', we can try to restore it.
    // However, createFromData assumes 'liveRanges' are present if we want to render immediately.
    // But data from cloud DOES NOT have live ranges.
    // We must use the selectors to FIND the range first.

    // This is tricky: createFromData expects liveRanges. 
    // We should probably use VaultModeService.restoreHighlightsForUrl LOGIC but for a single item.
    // Or, we can reuse logic.

    // Let's manually restore the range using selectors if available
    try {
      // We need to re-construct the selectors from the data
      // Ideally we use the service to do this, but service.restoreHighlightsForUrl works on ALL items in DB.
      // Here we have an in-memory item not yet in DB (or strictly speaking, it IS in cloud DB).

      // HACK: We can just use the SelectorEngine directly if exposed, OR
      // we can instantiate a temporary object to restore.
      // Actually, let's defer to a new method createFromRemoteData checks for selectors.

      // For now, let's try to assume we can save it to local DB first (skipSync=true), 
      // and THEN call restore() for just that ID? 
      // No, restore() fetches ALL.

      // Better:
      // 1. Save to Local DB (skipSync=true)
      // 2. Call internal restore logic for just this item (we might need to expose restoration logic for single item on service)

      // For MVP of THIS task, let's try to pass it to createFromData if we can get a range.
      // If we can't get a range immediately (e.g. text not found), we save it to DB anyway so it appears on next reload.

      // Step 1: Save to DB (Local Only)
      // We need to cast because 'data' might be V2 from wire vs interface
      // We need to ensure selectors are present.

      // Actually, if we just save it to DB, we can't render it without a range.
      // So we MUST find the range.

      // Let's implement a simple "find range from selector" here or use service.
      // Since `vaultService` is private, we might need to assume it has what we need or add a method.
      // But `vaultService` has `restoreHighlightRange`. We should expose it or make it public.
      // It is currently private.

      // Workaround: Use `createFromData` requires `liveRanges`.
      // If we received data, it has `ranges` array with selectors.
      // We can parse the selector.

      this.logger.warn('[VAULT] Remote highlight handling requires range restoration - Partial Implementation: Saving to DB only for refresh');

      // Save to repository (Persistent)
      // We need to access repository directly or via service options
      // We updated saveHighlight to take options!

      // We can't call saveHighlight without a range...
      // Catch-22: saveHighlight generates selectors FROM range.
      // But here we HAVE selectors and NO range.

      // We should call repository.add() directly!
      await this.repository.add(data as any, { skipSync: true });

      this.logger.info('[VAULT] Saved remote highlight to local DB. Reload to see it (Range restoration pending)');

      // TODO: Trigger a "lazy restore" or "specific restore" if possible.
      // For now, saving to DB ensures it's there.
      // To make it appear INSTANTLY involves calling the selector engine.

    } catch (e) {
      this.logger.error('Failed to handle remote highlight', e as Error);
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
    search: true,
    multiSelector: true,
  };

  override shouldRestore(): boolean {
    // Vault Mode handles its own restoration via onActivate() -> vaultService.restoreHighlightsForUrl()
    // We must return FALSE here to prevent content.ts from running the default restoreHighlights()
    // which would clear the repository and replay incompatible Sprint Mode events.
    this.logger.info('[DEBUG] VaultMode.shouldRestore() called - returning false');
    return false;
  }

  /**
   * Create highlight from existing data (e.g., Undo/Restore)
   */
  async createFromData(data: HighlightData, options?: { skipSync?: boolean }): Promise<void> {
    // 1. Ensure live ranges exist
    if (!data.liveRanges || data.liveRanges.length === 0) {
      this.logger.warn('[VAULT] createFromData called without live ranges', data.id);
      return;
    }

    // 2. Persist
    const range = data.liveRanges[0]!;

    // Use saveHighlight to ensure persistence + selectors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.vaultService.saveHighlight(data as any, range, { skipSync: options?.skipSync });

    // 3. Render
    const highlightName = getHighlightName('underscore', data.id);
    const highlight = new Highlight(...data.liveRanges);
    CSS.highlights.set(highlightName, highlight);
    this.highlights.set(data.id, highlight);
    this.data.set(data.id, data);

    // Inject CSS for visual rendering
    injectHighlightCSS('underscore', data.id, data.colorRole || 'yellow');

    // 4. Update Repository (Idempotent check)
    // Note: repository is RepositoryFacade with sync API (get/has, not findById)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alreadyExists = (this.repository as any).get?.(data.id) || (this.repository as any).has?.(data.id);
    if (!alreadyExists) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.repository.add(data as any, { skipSync: options?.skipSync });
    } else {
      this.logger.debug('[VAULT] Skipping duplicate repo add during create', {
        id: data.id,
      });
    }
  }

  async updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void> {
    // VaultModeService doesn't have partial update yet, but we can implement it or overwrite.
    // For now, get existing -> merge -> save.

    const existing = this.data.get(id);
    if (!existing) {
      this.logger.warn('[VAULT] Cannot update non-existent highlight', id);
      return;
    }

    const updated = { ...existing, ...updates };

    // Update runtime
    this.data.set(id, updated);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.add(updated as any); // Updates existing in repo
    // Correction: Repository Pattern typically separates add vs update. InMemory implementation 'add' usually overwrites or throws.
    // If 'add' throws on duplicate, we should use 'update'.
    // However, standard IRepository 'add' is often idempotent upsert in simple implementations, or strict.
    // Looking at InMemoryHighlightRepository behavior (impl inferred): Map.set(id, item) -> Upsert.
    // If specific update method exists on interface, use it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.update(id, updates as any);

    // Update storage
    // Assuming ranges didn't change, we use the first live range
    const range = existing.liveRanges && existing.liveRanges[0];
    if (range) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.vaultService.saveHighlight(updated as any, range);
    }
  }

  override async clearAll(): Promise<void> {
    await this.vaultService.clearAll();

    for (const id of this.highlights.keys()) {
      const highlightName = getHighlightName('underscore', id);
      CSS.highlights.delete(highlightName);
      removeHighlightCSS(id);
    }
    this.highlights.clear();
    this.data.clear();
    await this.repository.clear(); // If facade supports it
  }

  // IPersistentMode methods

  async saveToStorage(highlight: HighlightData): Promise<void> {
    if (!highlight.liveRanges || !highlight.liveRanges.length) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.vaultService.saveHighlight(highlight as any, highlight.liveRanges[0]!);
  }

  async loadFromStorage(_url: string): Promise<HighlightData[]> {
    const restored = await this.vaultService.restoreHighlightsForUrl();
    return restored.map(
      (r) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ ...r.highlight, liveRanges: r.range ? [r.range] : [] }) as any as HighlightData
    );
  }

  /**
   * Create a highlight in Vault Mode
   *
   * 1. Check for duplicates
   * 2. Persist to IndexedDB (via VaultModeService) with robust selectors
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

    // Deduplication via Content Hash REMOVED
    // Reason: Prevents highlighting same text in different locations (spatial duplicates).
    // Overlap detection is handled by content.ts before calling this.

    /* 
    const contentHash = await generateContentHash(text);
    const existing = await this.vaultService.findByContentHash(contentHash);
    if (existing && existing.id) {
      this.logger.info('[VAULT] Duplicate content detected', { existingId: existing.id });
      return existing.id;
    } 
    */

    const contentHash = await generateContentHash(text);

    const id = this.generateId();
    const serializedRange = serializeRange(range);
    if (!serializedRange) throw new Error('Failed to serialize range');

    // Normalize URL (remove hash fragment for consistent querying)
    const url = window.location.href.split('#')[0] || window.location.href;

    const data: HighlightData = {
      id,
      text,
      contentHash,
      url, // CRITICAL: Must include URL for findByUrl() to work
      colorRole: colorRole || 'yellow', // Default color if missing
      type: 'underscore',
      ranges: [serializedRange],
      liveRanges: [range],
      createdAt: new Date(),
    };

    if (!data.liveRanges || !data.liveRanges.length) {
      throw new Error('Cannot create highlight without live ranges');
    }
    const liveRange = data.liveRanges[0]!;

    // 1. Persist to Vault Storage (IndexedDB + Selectors)
    // This handles the "Heavy Lifting" of creating selectors and saving to DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.vaultService.saveHighlight(data as any, liveRange);

    // 2. Update Runtime API (CSS Highlights)
    const highlightName = getHighlightName('underscore', id);
    const highlight = new Highlight(range);
    CSS.highlights.set(highlightName, highlight);

    // Inject CSS for visual rendering
    injectHighlightCSS('underscore', id, colorRole || 'yellow');

    // 3. Update Internal State
    this.highlights.set(id, highlight);
    this.data.set(id, data);

    // 4. Update In-Memory Repository (for UI consistency)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.add(data as any);

    return id;
  }

  override async removeHighlight(id: string): Promise<void> {
    // 1. Remove from Storage (VaultModeService handles repository removal via DualWriteRepository)
    await this.vaultService.deleteHighlight(id);

    // 2. Remove from Runtime
    const highlight = this.highlights.get(id);

    if (highlight) {
      const highlightName = getHighlightName('underscore', id);
      CSS.highlights.delete(highlightName);
      removeHighlightCSS(id);
      this.highlights.delete(id);
    }
    this.data.delete(id);

    // 3. Remove from Session Repository (for UI consistency / HoverDetector)
    // NOTE: persistence is handled by vaultService above, but we must clear session state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((this.repository as any).remove) {
      await this.repository.remove(id);
    }
  }

  async restore(_url?: string): Promise<void> {
    // Use VaultModeService to restore from IndexedDB
    this.logger.info('[VAULT] 🔄 Starting restore process...');

    const restored = await this.vaultService.restoreHighlightsForUrl();

    this.logger.info(`[VAULT] ✅ Restoring ${restored.length} highlights`);

    if (restored.length === 0) {
      this.logger.warn('[VAULT] ⚠️ No highlights found to restore. Check if highlights were saved with correct URL.');
      return;
    }

    for (const item of restored) {
      const { highlight: storedData, range } = item;

      if (range) {
        // Register in Runtime with proper naming convention
        const highlightName = getHighlightName('underscore', storedData.id);
        const hl = new Highlight(range);
        CSS.highlights.set(highlightName, hl);
        this.highlights.set(storedData.id, hl);

        // Inject CSS for visual rendering
        injectHighlightCSS('underscore', storedData.id, storedData.colorRole || 'yellow');

        this.logger.info(`[VAULT] ✅ Restored highlight: ${storedData.id} (${storedData.text.substring(0, 30)}...)`);

        // Construct full HighlightData with live ranges
        // We cast storedData because it is V2 (persisted) and we need runtime HighlightData
        const fullData = {
          ...storedData,
          liveRanges: [range],
        } as unknown as HighlightData;

        this.data.set(storedData.id, fullData);

        // Sync to Repository (Idempotent check)
        // Note: repository is RepositoryFacade with sync API (get/has, not findById)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const exists = (this.repository as any).get?.(storedData.id) || (this.repository as any).has?.(storedData.id);
        if (!exists) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await this.repository.add(fullData as any);
        } else {
          this.logger.debug('[VAULT] Skipping duplicate restore', { id: storedData.id });
        }
      } else {
        this.logger.warn(`[VAULT] ❌ Failed to restore range for highlight: ${storedData.id}`);
      }
    }

    this.logger.info(`[VAULT] 🎉 Restoration complete: ${restored.filter(r => r.range).length}/${restored.length} highlights rendered`);
  }

  async sync(): Promise<void> {
    await this.vaultService.syncToServer();
  }

  /**
   * Deletion Configuration
   * Vault Mode: Protected deletion with sync check
   */
  override getDeletionConfig(): DeletionConfig {
    return {
      showDeleteIcon: true,
      requireConfirmation: true,
      confirmationMessage: 'Delete from vault? This cannot be undone.',
      allowUndo: false, // Vault deletions are permanent
      iconType: 'trash',
      beforeDelete: async (_id: string) => {
        // Future: Check if highlight is synced across devices
        // const isSynced = await this.vaultService.checkSyncStatus(id);
        // if (isSynced) {
        //   return confirm('This highlight is synced across devices. Delete anyway?');
        // }
        return true;
      },
    };
  }
}
