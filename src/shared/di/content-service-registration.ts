/**
 * @file content-service-registration.ts
 * @description Service registration for content scripts (browser context)
 *
 * Registers services that are ONLY available in content script context:
 * - Mode Manager
 * - Highlight Modes (Basic, Pro, 10x-Pro)
 * - Command Factory
 *
 * These services use DOM APIs (document, CSS.highlights) which are NOT available
 * in Service Worker context. DO NOT import this file in background scripts.
 */

import { registerBaseServices } from './base-service-registration';
import type { Container } from './container';

import { CommandFactory } from '@/content/commands/command-factory';
import { BasicMode } from '@/content/modes/basic-mode';
import type { IHighlightMode } from '@/content/modes/highlight-mode.interface';
import { ModeManager } from '@/content/modes/mode-manager';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ProMode } from '@/content/modes/pro-mode';
import { ProXaiMode } from '@/content/modes/pro-xai-mode';
import { IpcHighlightRepository } from '@/content/repositories/ipc-highlight-repository';
import { IpcReadableHighlightRepository } from '@/content/repositories/ipc-readable-highlight-repository';
import { LocalCacheIpcRepository } from '@/content/repositories/local-cache-ipc-repository';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type {
  IWritableHighlightRepository,
  IReadableHighlightRepository,
  IHighlightRepository,
} from '@/shared/repositories/i-highlight-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Register all content script services
 *
 * @param container - IoC container
 */
export function registerContentServices(container: Container): void {
  // Register base services first
  registerBaseServices(container);

  // ============================================
  // MODE MANAGEMENT LAYER (Content Script Only)
  // ============================================

  /**
   * Mode Manager - Singleton
   * Coordinates mode switching and delegates operations
   */
  container.registerSingleton<IModeManager>('modeManager', () => {
    const eventBus = container.resolve<EventBus>('eventBus');
    const logger = container.resolve<ILogger>('logger');
    return new ModeManager(eventBus, logger);
  });

  /**
   * ModeStateManager - Singleton
   * Source of truth for the current mode. Consumed by the read IPC adapter.
   */
  container.registerSingleton<ModeStateManager>('modeStateManager', () => {
    const eventBus = container.resolve<EventBus>('eventBus');
    const modeManager = container.resolve<ModeManager>('modeManager');
    const logger = container.resolve<ILogger>('logger');
    return new ModeStateManager(eventBus, modeManager, logger);
  });

  // ============================================
  // MODE LAYER (Content Script Only - requires DOM APIs)
  // ============================================

  /**
   * Basic Mode - Transient
   * Permanent local persistence on this device.
   */
  container.registerTransient<IHighlightMode>('basicMode', () => {
    const facade = container.resolve<RepositoryFacade>('repositoryFacade');
    const basicStorage = container.resolve<IStorage>('basicStorage');
    const eventBus = container.resolve<EventBus>('eventBus');
    const logger = container.resolve<ILogger>('logger');
    return new BasicMode(facade, basicStorage, eventBus, logger);
  });

  /**
   * Pro Mode - Transient
   * Persistent highlighting (IndexedDB) + server sync.
   * Created fresh when activated. Replaces the former Vault (cloud) mode.
   */
  container.registerTransient<IHighlightMode>('proMode', () => {
    const facade = container.resolve<RepositoryFacade>('repositoryFacade');
    const eventBus = container.resolve<EventBus>('eventBus');
    const logger = container.resolve<ILogger>('logger');
    const highlightReader = container.resolve<IReadableHighlightRepository>(
      'ipcReadableHighlightRepository'
    );
    return new ProMode(facade, eventBus, logger, { highlightReader });
  });

  /**
   * 10x-Pro Mode - Transient
   * Everything in Pro, plus AI capability flags. Replaces the former Gen
   * (ai) mode, which previously had no registered highlight mode class.
   */
  container.registerTransient<IHighlightMode>('proXaiMode', () => {
    const facade = container.resolve<RepositoryFacade>('repositoryFacade');
    const eventBus = container.resolve<EventBus>('eventBus');
    const logger = container.resolve<ILogger>('logger');
    const highlightReader = container.resolve<IReadableHighlightRepository>(
      'ipcReadableHighlightRepository'
    );
    return new ProXaiMode(facade, eventBus, logger, { highlightReader });
  });

  // ============================================
  // COMMAND LAYER (Content Script Only)
  // ============================================

  /**
   * Command Factory - Singleton
   * Centralizes command creation and dependency injection
   */
  container.registerSingleton<CommandFactory>('commandFactory', () => {
    return new CommandFactory(container);
  });

  // ============================================
  // IPC HIGHLIGHT REPOSITORY (Content -> SW bridge)
  // ============================================

  /**
   * IpcHighlightRepository - Singleton
   * Sends highlight writes across the content-script to SW boundary.
   * Read-only is intentional: content-side reads go through RepositoryFacade.
   * Used by Basic / Pro modes for writes only.
   */
  container.registerSingleton<IWritableHighlightRepository>(
    'ipcHighlightRepository',
    () => {
      const messageBus = container.resolve<IMessageBus>('messageBus');
      return new IpcHighlightRepository(messageBus);
    }
  );

  /**
   * LocalCacheIpcRepository - Singleton (content context only)
   *
   * Rebinds the 'repository' DI token (which base-service-registration.ts
   * binds to a pure InMemoryHighlightRepository) to this composite, so the
   * content-side RepositoryFacade wraps local-cache + IPC-write-forwarding
   * instead of in-memory-only. Modes' this.facade.add(...) calls now
   * transparently dual-write: local cache (for sync UI reads) and IPC
   * (for background persistence to IndexedDB).
   *
   * Background context is unaffected — repository-container-registration.ts
   * rebinds 'repositoryFacade' there to use DualWriteRepository.
   */
  container.registerSingleton<IHighlightRepository>('repository', () => {
    const messageBus = container.resolve<IMessageBus>('messageBus');
    return new LocalCacheIpcRepository(messageBus);
  });

  /**
   * IpcReadableHighlightRepository - Singleton
   * Read-side IPC adapter. Used by restoreHighlights() on page load to
   * pull persisted highlights from the background's real store (the
   * local in-memory cache is empty after a reload). Mode is read per
   * call from the ModeStateManager so a mode switch takes effect on
   * the next restore.
   */
  container.registerSingleton<IReadableHighlightRepository>(
    'ipcReadableHighlightRepository',
    () => {
      const messageBus = container.resolve<IMessageBus>('messageBus');
      const modeState = container.resolve<ModeStateManager>('modeStateManager');
      return new IpcReadableHighlightRepository(messageBus, () => modeState.getMode());
    }
  );
}
