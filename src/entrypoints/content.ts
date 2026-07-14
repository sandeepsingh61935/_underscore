/**
 * Content Script Entry Point
 *
 * Architecture: DI + Event-Driven
 * - DI Container: Registers all services with clear dependencies
 * - Event Bus: Decouples highlight creation, mode switching, storage
 * - Mode Manager: Delegates behavior to current mode (Basic/Pro/10x-Pro)
 */

import '@/content/ui/delete-icon.css'; // Phase 4.3: Delete icon styles

import { browser } from 'wxt/browser';

import { ColorManager } from '@/content/color-manager';
import type { CommandFactory } from '@/content/commands/command-factory';
import { HighlightClickDetector } from '@/content/highlight-click-detector';
import { HighlightManager } from '@/content/highlight-manager';
import { HighlightRenderer } from '@/content/highlight-renderer';
import type { ModeManager, BasicMode, ProMode, ProXaiMode } from '@/content/modes';
import { SelectionDetector } from '@/content/selection-detector';
import { serializeRange, deserializeRange } from '@/content/utils/range-converter';
import { getHighlightsInRange } from '@/content/utils/get-highlights-in-range';
// import { isCloudModeEnabled } from '@/content/cloud-mode-init';
import { CommandStack } from '@/shared/patterns/command';
import type { RepositoryFacade } from '@/shared/repositories';
// (no repository type import — restoreHighlights reads via the facade)
import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { StorageService } from '@/shared/services/storage-service';
import type {
  SelectionCreatedEvent,
  HighlightCreatedEvent,
  HighlightRemovedEvent,
  HighlightClickedEvent,
} from '@/shared/types/events';
import { EventName } from '@/shared/types/events';
import { AUTH_STATE_CHANGED } from '@/shared/auth/constants';
import type { AuthStatePayload } from '@/shared/auth/auth-state-payload';
import { LIBRARY_DATA_CHANGED } from '@/shared/schemas/message-schemas';
import type { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import {
  subtractRange,
  filterTinyRanges,
  mergeAdjacentRanges,
} from '@/shared/utils/range-algebra';

import { MODE_NAMES } from '@/content/modes/mode-constants';

const logger = LoggerFactory.getLogger('ContentScript');

// Main content script initialization
export default defineContentScript({
  matches: ['<all_urls>'],
  // ADR-015: run in the ISOLATED world so page scripts cannot reach
  // content-script state. Defense-in-depth for ADR-013's content-script
  // = courier contract: even if a future change accidentally exposes a
  // global, the page cannot read or override it.
  world: 'ISOLATED',

  async main() {
    logger.info(
      'Initializing Web Highlighter Extension (Strategy Pattern + Basic Mode)...'
    );

    try {
      // Check Custom Highlight API support
      const useCustomHighlightAPI = HighlightManager.isSupported();
      logger.info('Custom Highlight API support:', { supported: useCustomHighlightAPI });

      // Create shared event bus
      // ===== DEPENDENCY INJECTION: Initialize IoC Container =====
      const { Container } = await import('@/shared/di/container');
      const { registerContentServices } = await import(
        '@/shared/di/content-service-registration'
      );

      const container = new Container();
      registerContentServices(container);

      // Resolve key services
      const storage = container.resolve<StorageService>('storage');
      const eventBus = container.resolve<EventBus>('eventBus');
      const modeManager = container.resolve<ModeManager>('modeManager');
      const repositoryFacade = container.resolve<RepositoryFacade>('repositoryFacade');
      const commandFactory = container.resolve<CommandFactory>('commandFactory');
      const ipcReadableHighlightRepository = container.resolve<IReadableHighlightRepository>('ipcReadableHighlightRepository');
      const messageBus = container.resolve<import('@/shared/interfaces/i-message-bus').IMessageBus>('messageBus');

      // Initialize Command Stack (Scope: Content Script)
      const commandStack = new CommandStack(50);

      // Initialize components
      const colorManager = new ColorManager();
      await colorManager.initialize();

      // Initialize Repository Facade (Asynchronous cache hydration)
      await repositoryFacade.initialize();

      // Register Modes (Done in container registration, but we need to ensure ModeManager knows about them)
      // Service registration lazy-loads them via factories, but ModeManager needs them registered to switch.
      // We can iterate container services or manually register.
      // The container DI registers 'basicMode', 'proMode', 'proXaiMode' as TRANSIENT.
      // ModeManager expects INSTANCES.

      // Pre-instantiate and register modes
      const basicMode = container.resolve<BasicMode>('basicMode');
      const proMode = container.resolve<ProMode>('proMode');
      const proXaiMode = container.resolve<ProXaiMode>('proXaiMode');

      modeManager.registerMode(basicMode);
      modeManager.registerMode(proMode);
      modeManager.registerMode(proXaiMode);

      // Initialize State Management Pattern
      const { ModeStateManager } = await import('@/content/modes/mode-state-manager');
      const modeStateManager = new ModeStateManager(eventBus, modeManager, logger);

      console.error(
        '[MODE-STATE] Initializing state manager at ' + new Date().toISOString()
      );
      await modeStateManager.init(); // Loads user preference
      console.error('[MODE-STATE] Initialized with mode: ' + modeStateManager.getMode());

      // Setup Message Bus for IPC (Popup ↔ Content)
      // [REMOVED] MessageBus registers a conflicting listener with legacy response format.
      // We rely on the unified listener below in this file (Lines 410+)
      // const { MessageBus } = await import('@/shared/messaging/message-bus');
      // MessageBus.setup(modeStateManager, repositoryFacade, logger);

      // Initialize Pro Mode if enabled (Separate init removed - moved to ProMode.onActivate)
      // if (isCloudModeEnabled()) {
      //   try {
      //     // We call this to ensure DB migration/setup is done, even if mode deals with restore
      //     await initializeCloudMode();
      //   } catch(e) {
      //     logger.error('[PRO] Init failed', e as Error);
      //   }
      // }

      // Keep old HighlightManager temporarily for compatibility
      const highlightManager = useCustomHighlightAPI
        ? new HighlightManager(eventBus)
        : null;
      const renderer = new HighlightRenderer(eventBus);
      const detector = new SelectionDetector(eventBus);

      // Initialize click detector for double-click deletion
      const { HighlightDOMHitTester } = await import('@/content/ui/highlight-dom-hit-tester');
      const hitTester = new HighlightDOMHitTester(repositoryFacade);

      const clickDetector = new HighlightClickDetector(eventBus, hitTester);
      clickDetector.init();

      // Initialize delete icon overlay system (Phase 4.3)
      const { DeleteIconOverlay } = await import('@/content/ui/delete-icon-overlay');
      const { HighlightHoverDetector } =
        await import('@/content/ui/highlight-hover-detector');

      const deleteIconOverlay = new DeleteIconOverlay(
        modeManager,
        repositoryFacade,
        logger,
        messageBus,
      );

      const hoverDetector = new HighlightHoverDetector(
        repositoryFacade,
        eventBus,
        logger,
        hitTester
      );

      hoverDetector.init();

      logger.info('[DELETE-ICON] Hover detector initialized');

      // Wire hover events to icon overlay
      eventBus.on(
        'highlight:hover:start',
        (event: { highlightId: string; boundingRect: DOMRect }) => {
          deleteIconOverlay.showIcon(event.highlightId, event.boundingRect);
        }
      );

      eventBus.on('highlight:hover:end', (event: { highlightId: string }) => {
        deleteIconOverlay.hideIcon(event.highlightId);
      });

      // ===== EVENT SOURCING: Wire Event → Mode Handlers (Delegate Pattern) =====
      // Observer Pattern: Modes listen to domain events and decide how to handle

      // [OK] HIGHLIGHT CREATED: Delegate to mode handler (SRP compliance)
      // Mode decides if/how to persist (Basic: Event Sourcing, Pro: IndexedDB)
      eventBus.on<HighlightCreatedEvent>(EventName.HIGHLIGHT_CREATED, async (event) => {
        try {
          await modeManager.getCurrentMode().onHighlightCreated(event);
        } catch (error) {
          logger.error('Error in mode highlight created handler:', error as Error);
        }
      });

      // [OK] HIGHLIGHT REMOVED: Delegate to mode handler (SRP compliance)
      // Mode decides if/how to persist removal (Basic: Event Sourcing, Pro: IndexedDB)
      eventBus.on<HighlightRemovedEvent>(EventName.HIGHLIGHT_REMOVED, async (event) => {
        try {
          await modeManager.getCurrentMode().onHighlightRemoved(event);
        } catch (error) {
          logger.error('Error in mode highlight removed handler:', error as Error);
        }
      });

      logger.info('Event-Mode delegation wired', {
        pattern: 'Observer + Delegation (SRP Compliance)',
        listeners: ['HIGHLIGHT_CREATED', 'HIGHLIGHT_REMOVED'],
      });

      // ===== PAGE LOAD: Restore highlights (Mode decides via shouldRestore())  =====
      const currentMode = modeManager.getCurrentMode();

      // RESTORATION STRATEGY:
      // - Basic Mode: Returns true. Generic restoreHighlights() replays events.
      // - Pro / 10x-Pro Mode: Returns false. Self-manages via onActivate() -> restore().
      // - Future Modes: Implement IMode.shouldRestore() accordingly.
      const shouldRestore = currentMode.shouldRestore();

      logger.info(`[DEBUG] Page Load: Mode=${currentMode.name} shouldRestore=${shouldRestore}`);

      if (shouldRestore) {
        logger.info('[DEBUG] Starting default restoration...');
        await restoreHighlights({
          storage,
          renderer,
          repositoryFacade,
          highlightManager,
          modeManager,
          commandFactory,
          ipcReadableHighlightRepository,
        });
      } else {
        logger.info(
          `${modeManager.getCurrentMode().name} Mode: Skipping restoration (Self-Managed)`
        );
      }

      // ===== Orchestrate: Listen to selection events =====
      eventBus.on<SelectionCreatedEvent>(EventName.SELECTION_CREATED, async (event) => {
        logger.info('Selection detected, checking for overlaps');

        try {
          // RANGE SUBTRACTION: Check if selection overlaps existing highlights
          const overlappingHighlights = getHighlightsInRange(
            event.selection,
            modeManager.getCurrentMode().getAllHighlights()
          );

          if (overlappingHighlights.length > 0) {
            logger.info('Range subtraction: Splitting overlapping highlights', {
              count: overlappingHighlights.length,
            });

            const selectionRange = event.selection.getRangeAt(0);

            // Process each overlapping highlight
            for (const existingHighlight of overlappingHighlights) {
              // Remove the existing highlight first
              if (highlightManager) {
                highlightManager.removeHighlight(existingHighlight.id);
              }
              repositoryFacade.remove(existingHighlight.id);

              // Split each range in the highlight
              const allRemainingRanges: Range[] = [];

              for (const liveRange of existingHighlight.liveRanges || []) {
                // Subtract selection from this range
                const remainingRanges = subtractRange(liveRange, selectionRange);
                allRemainingRanges.push(...remainingRanges);
              }

              // Filter out tiny ranges (< 3 chars)
              const validRanges = filterTinyRanges(allRemainingRanges, 3);

              // Merge adjacent ranges
              const mergedRanges = mergeAdjacentRanges(validRanges);

              if (mergedRanges.length > 0) {
                // Create new highlight(s) from remaining ranges
                const text = mergedRanges.map((r) => r.toString()).join(' ... ');
                const serializedRanges = mergedRanges.map((r) => serializeRange(r));

                // Generate new ID for split highlight
                const newId = `hl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                const { generateContentHash } =
                  await import('@/shared/utils/content-hash');
                const contentHash = await generateContentHash(text);

                const highlightData = {
                  id: newId,
                  text,
                  contentHash,
                  colorRole: (existingHighlight.colorRole || existingHighlight.color || 'yellow') as 'blue' | 'green' | 'orange' | 'pink' | 'purple' | 'teal' | 'yellow',
                  type: 'underscore' as const,
                  ranges: serializedRanges.filter((r): r is NonNullable<typeof r> => r != null),
                  liveRanges: mergedRanges,
                  createdAt: new Date(),
                  url: existingHighlight.url,
                };

                // [OK] Use mode's unified creation path (fixes undo/redo!)
                // Mode handles repository persistence internally - no need to call addFromData
                await modeManager.createFromData(highlightData);

                // Save event
                await storage.saveEvent({
                  type: 'highlight.created',
                  timestamp: Date.now(),
                  eventId: crypto.randomUUID(),
                  data: {
                    id: newId,
                    text,
                    type: existingHighlight.type || 'underscore',
                    ranges: serializedRanges,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any,
                });

                logger.info('Created split highlight', {
                  id: newId,
                  rangeCount: mergedRanges.length,
                });
              }

              // Save removal event for original
              await storage.saveEvent({
                type: 'highlight.removed',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                highlightId: existingHighlight.id,
              });
            }

            logger.info('Range subtraction complete');
            broadcastCount();
            return; // Don't create new highlight
          }

          // No overlaps - create new highlight as normal
          const colorRole = await colorManager.getCurrentColorRole();

          const command = commandFactory.createCreateHighlightCommand(
            event.selection,
            colorRole
          );

          await commandStack.execute(command);

          logger.info('Highlight created successfully', {
            api: highlightManager ? 'Custom Highlight API' : 'Legacy',
          });

          broadcastCount();
        } catch (error) {
          logger.error('Failed to process selection', error as Error);
        }
      });

      // ===== Handle highlight removal (Ctrl+Click) =====
      const { ContentHighlightDeleteClient } = await import(
        '@/content/services/content-highlight-delete'
      );
      const { performContentHighlightDelete } = await import(
        '@/content/services/content-highlight-delete-flow'
      );
      const contentDeleteClient = new ContentHighlightDeleteClient(messageBus);

      eventBus.on<HighlightClickedEvent>(EventName.HIGHLIGHT_CLICKED, async (event) => {
        const mode = modeManager.getCurrentMode();
        const config = mode.getDeletionConfig();
        if (!config?.showDeleteIcon) return;

        const outcome = await performContentHighlightDelete(event.highlightId, {
          deleteClient: contentDeleteClient,
          modeManager,
          getSnapshot: (id) => modeManager.getHighlight(id),
          allowUndo: config.allowUndo,
        });

        if (outcome === 'deleted') {
          logger.info('Highlight removed via Ctrl+Click', { id: event.highlightId });
          broadcastCount();
        }
      });

      // ===== Handle clear selection (double-click) =====
      eventBus.on<SelectionCreatedEvent>(EventName.CLEAR_SELECTION, async (event) => {
        const highlightsInSelection = getHighlightsInRange(
          event.selection,
          modeManager.getCurrentMode().getAllHighlights()
        );

        if (highlightsInSelection.length > 0) {
          for (const hl of highlightsInSelection) {
            // [OK] Use mode manager's unified removal
            await modeManager.removeHighlight(hl.id);

            repositoryFacade.remove(hl.id);

            await storage.saveEvent({
              type: 'highlight.removed',
              timestamp: Date.now(),
              eventId: crypto.randomUUID(),
              highlightId: hl.id,
            });
          }

          logger.info('Cleared highlights in selection', {
            count: highlightsInSelection.length,
          });
          broadcastCount();
        }
      });

      // ===== Keyboard Shortcuts =====
      document.addEventListener('keydown', async (e) => {
        // Ctrl+Z - Undo
        if (e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
          e.preventDefault();
          if (commandStack.canUndo()) {
            await commandStack.undo();
            logger.info('Undo executed');
            broadcastCount();
          }
        }

        // Ctrl+Shift+Z - Redo
        else if (e.ctrlKey && e.shiftKey && e.code === 'KeyZ') {
          e.preventDefault();
          if (commandStack.canRedo()) {
            await commandStack.redo();
            logger.info('Redo executed');
            broadcastCount();
          }
        }

        // Ctrl+Y - Redo (Windows/Linux standard)
        else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyY') {
          e.preventDefault();
          if (commandStack.canRedo()) {
            await commandStack.redo();
            logger.info('Redo executed (Ctrl+Y)');
            broadcastCount();
          }
        }

        // Removed: mode switching shortcuts (Ctrl+U/H/B) - single mode only

        // Ctrl+Shift+U - Clear all
        else if (e.ctrlKey && e.shiftKey && e.code === 'KeyU') {
          e.preventDefault();

          const count = repositoryFacade.count();

          // [OK] Call mode's clearAll (clears CSS.highlights + state + repo)
          await modeManager.getCurrentMode().clearAll();

          // [ERROR] DON'T clear storage!
          // This would wipe ALL events including creation events
          // Let event sourcing handle it naturally

          logger.info('Cleared all highlights', { count });
          broadcastCount();
        }
      });

      // Start detecting selections
      detector.init();

      // Push page body text to background for LLM context (ADR-021 §4).
      const { PageContentCache } = await import('@/content/page-content-cache');
      const pageContentCache = new PageContentCache(
        (msg) => { void browser.runtime.sendMessage(msg).catch(() => {}); },
        { debounceMs: 2_000, maxBytes: 100 * 1024 },
      );
      pageContentCache.start();
      window.addEventListener('pagehide', () => pageContentCache.stop(), { once: false });

      // Broadcast count updates to popup
      const broadcastCount = (): void => {
        browser.runtime
          .sendMessage({
            type: 'HIGHLIGHT_COUNT_UPDATE',
            count: repositoryFacade.count(),
            timestamp: Date.now(), // Added for schema validation
          })
          .catch(() => {
            // Popup may not be open, ignore error
          });
      };

      // Listen for count changes
      eventBus.on(EventName.HIGHLIGHT_CREATED, () => broadcastCount());
      eventBus.on(EventName.HIGHLIGHT_REMOVED, () => broadcastCount());
      eventBus.on(EventName.HIGHLIGHTS_CLEARED, () => broadcastCount());

      const handleAuthStateChanged = async (isAuthenticated: boolean): Promise<void> => {
        const { handleContentAuthStateChanged } = await import(
          '@/content/services/content-auth-sync'
        );
        await handleContentAuthStateChanged(isAuthenticated, {
          modeStateManager,
          modeManager,
          repositoryFacade,
          logger,
          broadcastCount,
        });
      };

      // Auth changes arrive via background runtime broadcast (not local EventBus).
      browser.runtime.onMessage.addListener((message: unknown) => {
        const msg = message as {
          type?: string;
          payload?: AuthStatePayload & {
            deletedCount?: number;
            removedIds?: string[];
            restoredIds?: string[];
            source?: string;
          };
        };
        if (msg?.type === AUTH_STATE_CHANGED && msg.payload) {
          void handleAuthStateChanged(msg.payload.isAuthenticated);
        }
        if (msg?.type === LIBRARY_DATA_CHANGED && msg.payload?.source) {
          void (async () => {
            const { handleLibraryDataChanged } = await import(
              '@/content/services/content-library-sync'
            );
            await handleLibraryDataChanged(
              {
                source: msg.payload!.source!,
                deletedCount: msg.payload!.deletedCount,
                removedIds: msg.payload!.removedIds,
                restoredIds: msg.payload!.restoredIds,
              },
              {
                modeManager,
                repositoryFacade,
                messageBus,
                currentUrl: window.location.href,
                deserializeRange,
                logger,
              },
            );
            broadcastCount();
          })();
        }
      });

      // Legacy local EventBus hook (kept for in-process tests).
      eventBus.on(EventName.AUTH_STATE_CHANGED, async (event: { isAuthenticated: boolean }) => {
        await handleAuthStateChanged(event.isAuthenticated);
      });

      // Listen for count/mode requests from popup
      browser.runtime.onMessage.addListener(
        (
          message: unknown,
          _sender: unknown,
          sendResponse: (response: unknown) => void
        ) => {
          const msg = message as {
            type: string;
            mode?: 'basic' | 'pro' | 'pro_xai';
            payload?: unknown;
          };

          if (msg && msg.type === 'GET_HIGHLIGHT_COUNT') {
            sendResponse({
              success: true,
              data: { count: repositoryFacade.count() },
            });
          } else if (msg && msg.type === 'GET_MODE') {
            sendResponse({
              success: true,
              data: { mode: modeManager.getCurrentMode().name },
            });
          } else if (msg && msg.type === 'SET_MODE') {
            // Support both top-level mode (legacy) and payload.mode (schema-compliant)
            const payloadMode = (msg.payload as { mode?: 'basic' | 'pro' | 'pro_xai' })?.mode;
            const newMode = msg.mode || payloadMode;

            if (!newMode) {
              sendResponse({ success: false, error: 'No mode specified' });
              return false; // Don't keep channel open
            }

            const isAuthenticated = Boolean(
              (msg as { isAuthenticated?: boolean }).isAuthenticated,
            );

            logger.info(`[IPC] Handling SET_MODE: ${newMode}`);

            // Handle async mode switch with immediate response
            (async () => {
              try {
                // 1. Switch mode via State Manager (includes persistence + activation)
                logger.info('[IPC] Calling modeStateManager.setMode');
                await modeStateManager.setMode(newMode, { isAuthenticated });
                logger.info('[IPC] Mode state updated successfully');

                // 2. Run restoration/clearing SYNCHRONOUSLY (before responding)
                // This ensures popup receives correct count in response
                logger.info('[IPC] Starting highlight processing for mode switch');
                if (newMode === MODE_NAMES.BASIC) {
                  // Basic Mode always restores highlights on switch-to.
                  logger.info('[IPC] Restoring highlights for Basic Mode...');
                  await restoreHighlights({
                    storage,
                    renderer,
                    repositoryFacade,
                    highlightManager,
                    modeManager,
                    commandFactory,
                    ipcReadableHighlightRepository,
                  });
                  logger.info('[IPC] Restoration complete');
                } else {
                  // Pro / 10x-Pro Mode handles its own restoration via
                  // onActivate() -> restore(). Do NOT clear here - it would
                  // wipe the highlights that were just loaded!
                  logger.info('[IPC] Pro Mode - skipping clear (self-managed restoration)');
                }

                // 3. Get final count after restoration/clearing
                const finalCount = repositoryFacade.count();
                logger.info('[IPC] Final count after mode switch', { count: finalCount });

                // 4. Send response with final state (mode + count)
                logger.info('[IPC] Sending success response with count');
                sendResponse({
                  success: true,
                  data: {
                    mode: newMode,
                    count: finalCount, // Include count in response
                  },
                });

                // 5. Broadcast count for other listeners
                broadcastCount();
              } catch (error) {
                logger.error('[IPC] SET_MODE failed', error as Error);
                sendResponse({
                  success: false,
                  error: (error as Error).message || 'Unknown error during mode switch',
                });
              }
            })();

            return true; // Keep channel open for async response
          } else if (msg && msg.type === 'CLEAR_ALL_HIGHLIGHTS') {
            logger.info('[IPC] Handling CLEAR_ALL_HIGHLIGHTS');

            (async () => {
              try {
                await modeManager.getCurrentMode().clearAll();
                broadcastCount();

                sendResponse({
                  success: true,
                  data: { cleared: true },
                });
              } catch (error) {
                logger.error('[IPC] CLEAR_ALL_HIGHLIGHTS failed', error as Error);
                sendResponse({
                  success: false,
                  error: (error as Error).message,
                });
              }
            })();

            return true; // Keep channel open for async response
          }

          return false;
        }
      );

      logger.info('Web Highlighter Extension initialized successfully');
      logger.info(`Default color role: ${await colorManager.getCurrentColorRole()}`);
      logger.info(
        'Features: Undo (Ctrl+Z), Redo (Ctrl+Shift+Z / Ctrl+Y), permanent local storage'
      );
      logger.info(`Restored ${repositoryFacade.count()} highlights from storage`);
    } catch (error) {
      logger.error('Failed to initialize extension', error as Error);
    }
  },
});

/**
 * Restore highlights from storage on page load
 */
interface RestoreContext {
  storage: StorageService;
  renderer: HighlightRenderer;
  repositoryFacade: RepositoryFacade;
  highlightManager: HighlightManager | null;
  modeManager: ModeManager;
  commandFactory: CommandFactory;
  ipcReadableHighlightRepository: IReadableHighlightRepository;
}

/**
 * Restore highlights from storage on page load
 */
async function restoreHighlights(context: RestoreContext): Promise<void> {
  const { repositoryFacade, highlightManager, modeManager, commandFactory, ipcReadableHighlightRepository } =
    context;
  try {
    const currentUrl = window.location.href;
    // Reads go through the read-side IPC adapter, not the local in-memory
    // facade. The facade is empty after a page reload (its DI container
    // is fresh); the background holds the persisted set (IDB / DualWrite
    // per mode). The adapter calls IPC_HIGHLIGHTS_FIND_BY_URL.
    const activeHighlights = await ipcReadableHighlightRepository.findByUrl(currentUrl);

    // Hydrate the synchronous in-memory facade for UI operations (hover detection, etc)
    repositoryFacade.addMany(activeHighlights);

    logger.warn(`[TARGET] Found ${activeHighlights.length} highlights to restore`);

    // Render active highlights at their original positions
    let restored = 0;
    let failed = 0;

    for (const highlightData of activeHighlights) {
      try {
        // Support both old (single range) and new (multi-range) formats
        // Cast to any to access legacy 'range' property if present
        const legacyData = highlightData as unknown as Record<string, unknown>;
        const serializedRanges =
          highlightData.ranges || (legacyData['range'] ? [legacyData['range']] : []);

        if (serializedRanges.length === 0) {
          logger.warn('No ranges to restore', { id: highlightData.id });
          failed++;
          continue;
        }

        // Deserialize all ranges
        const liveRanges: Range[] = [];
        for (const serializedRange of serializedRanges) {
          const range = deserializeRange(serializedRange);
          if (range) {
            liveRanges.push(range);
          }
        }

        if (liveRanges.length === 0) {
          logger.warn('Failed to deserialize any ranges', { id: highlightData.id });
          failed++;
          continue;
        }

        // Use Custom Highlight API if available
        if (highlightManager) {
          // [OK] CRITICAL FIX: Use mode's unified creation path!
          // This ensures the highlight is registered in mode's internal maps
          // PERFORMANCE: Use stored contentHash instead of regenerating it
          const contentHash = highlightData.contentHash || highlightData.id;

          await modeManager.createFromData({
            id: highlightData.id,
            text: highlightData.text,
            contentHash,
            colorRole: (highlightData.color || 'yellow') as 'blue' | 'green' | 'orange' | 'pink' | 'purple' | 'teal' | 'yellow',
            type: 'underscore' as const,
            ranges: serializedRanges,
            liveRanges,
            createdAt: highlightData.createdAt,
            url: highlightData.url,
          });

          // Mode's createFromData() already adds to repository - no duplication needed
          // Repository persistence is handled internally by the mode

          restored++;
        } else {
          // Legacy: only restore first range
          const selection = window.getSelection();
          if (selection && liveRanges[0]) {
            selection.removeAllRanges();
            selection.addRange(liveRanges[0]); // Legacy: only first range

            const createCommand = commandFactory.createCreateHighlightCommand(
              selection,
              highlightData.color || 'yellow'
            );

            await createCommand.execute();
            restored++;
          }
        }
      } catch (error) {
        logger.error('Failed to restore highlight', error as Error, {
          id: highlightData.id,
        });
        failed++;
      }
    }

    logger.info('Restoration complete', {
      restored,
      failed,
      total: activeHighlights.length,
    });

    // Broadcast initial count
    if (failed > 0) {
      logger.warn(
        `${failed} highlights could not be restored (content may have changed)`
      );
    }
    logger.info(
      `Restored ${restored}/${activeHighlights.length} highlights`
    );
  } catch (error) {
    logger.error('Failed to restore highlights', error as Error);
  }
}
