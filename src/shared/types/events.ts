/**
 * @file events.ts
 * @description TypeScript type definitions for application events
 */

/**
 * Base event interface - all events extend this
 */
export interface BaseEvent {
  type: string;
  timestamp: Date;
}

// ============================================================================
// Selection Events
// ============================================================================

export interface SelectionCreatedEvent extends BaseEvent {
  type: 'selection:created';
  selection: Selection;
}

// ============================================================================
// Highlight Events
// ============================================================================

export interface HighlightData {
  id: string;
  text: string;
  color: string;
  type?: 'underscore' | 'highlight' | 'box';
  createdAt?: Date;
  range?: any; // SerializedRange
  ranges?: any[]; // SerializedRange[]
}

export interface HighlightCreatedEvent extends BaseEvent {
  type: 'highlight:created';
  highlight: HighlightData;
}

export interface HighlightRemovedEvent extends BaseEvent {
  type: 'highlight:removed';
  highlightId: string;
}

export interface HighlightsClearedEvent extends BaseEvent {
  type: 'highlights:cleared';
  count: number;
}

export interface HighlightClickedEvent extends BaseEvent {
  type: 'highlight:clicked';
  highlightId: string;
}

// ============================================================================
// Color Events
// ============================================================================

export interface ColorChangedEvent extends BaseEvent {
  type: 'color:changed';
  color: string;
  previousColor: string;
}

// ============================================================================
// Theme Events
// ============================================================================

export interface ThemeChangedEvent extends BaseEvent {
  type: 'theme:changed';
  isDark: boolean;
  sourceColor: string;
}

// ============================================================================
// Storage Events (Future - Vault Mode)
// ============================================================================

export interface HighlightSavedEvent extends BaseEvent {
  type: 'highlight:saved';
  highlightId: string;
}

export interface HighlightLoadedEvent extends BaseEvent {
  type: 'highlight:loaded';
  count: number;
}

// ============================================================================
// Migration Events
// ============================================================================

export interface MigrationStartedEvent extends BaseEvent {
  type: 'migration:started';
  total: number;
}

export interface MigrationProgressEvent extends BaseEvent {
  type: 'migration:progress';
  migrated: number;
  total: number;
  failed: number;
}

export interface MigrationCompletedEvent extends BaseEvent {
  type: 'migration:completed';
  result: {
    migrated: number;
    failed: number;
    skipped: number;
  };
}

export interface MigrationFailedEvent extends BaseEvent {
  type: 'migration:failed';
  error: Error;
}

export interface MigrationRolledBackEvent extends BaseEvent {
  type: 'migration:rolled-back';
}

// ============================================================================
// Error Events
// ============================================================================

export interface ErrorEvent extends BaseEvent {
  type: 'error:occurred';
  error: Error;
  context?: string;
}

export interface AuthStateChangedEvent extends BaseEvent {
  type: 'auth:state:changed';
  isAuthenticated: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user?: any;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * All application events
 */
export type AppEvent =
  | SelectionCreatedEvent
  | HighlightCreatedEvent
  | HighlightRemovedEvent
  | HighlightsClearedEvent
  | HighlightClickedEvent
  | ColorChangedEvent
  | ThemeChangedEvent
  | HighlightSavedEvent
  | HighlightLoadedEvent
  | MigrationStartedEvent
  | MigrationProgressEvent
  | MigrationCompletedEvent
  | MigrationFailedEvent
  | MigrationRolledBackEvent
  | ErrorEvent
  | AuthStateChangedEvent;

/**
 * Event names as const enum for type safety and autocomplete
 */
export const EventName = {
  // Selection
  SELECTION_CREATED: 'selection:created',

  // Highlights
  HIGHLIGHT_CREATED: 'highlight:created',
  HIGHLIGHT_REMOVED: 'highlight:removed',
  HIGHLIGHTS_CLEARED: 'highlights:cleared',
  HIGHLIGHT_CLICKED: 'highlight:clicked',
  CLEAR_SELECTION: 'clear:selection',

  // Remote Changes (Real-Time Sync)
  REMOTE_HIGHLIGHT_CREATED: 'remote:highlight:created',
  REMOTE_HIGHLIGHT_UPDATED: 'remote:highlight:updated',
  REMOTE_HIGHLIGHT_DELETED: 'remote:highlight:deleted',

  // Network
  NETWORK_STATUS_CHANGED: 'network:status:changed',

  // Color
  COLOR_CHANGED: 'color:changed',

  // Theme
  THEME_CHANGED: 'theme:changed',

  // Storage (Future)
  HIGHLIGHT_SAVED: 'highlight:saved',
  HIGHLIGHT_LOADED: 'highlight:loaded',

  // Migration
  MIGRATION_STARTED: 'migration:started',
  MIGRATION_PROGRESS: 'migration:progress',
  MIGRATION_COMPLETED: 'migration:completed',
  MIGRATION_FAILED: 'migration:failed',
  MIGRATION_ROLLED_BACK: 'migration:rolled-back',

  // Errors
  ERROR_OCCURRED: 'error:occurred',

  // Auth
  AUTH_STATE_CHANGED: 'auth:state:changed',
} as const;

/**
 * Type helper for event names
 */
export type EventNameType = (typeof EventName)[keyof typeof EventName];

/**
 * Helper to create events with automatic timestamp
 */
export function createEvent<T extends Partial<BaseEvent>>(event: T): T & BaseEvent {
  return {
    ...event,
    timestamp: new Date(),
  } as T & BaseEvent;
}
