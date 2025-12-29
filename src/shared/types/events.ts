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
// Error Events
// ============================================================================

export interface ErrorEvent extends BaseEvent {
  type: 'error:occurred';
  error: Error;
  context?: string;
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
  | HighlightSavedEvent
  | HighlightLoadedEvent
  | ErrorEvent;

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

  // Color
  COLOR_CHANGED: 'color:changed',

  // Storage (Future)
  HIGHLIGHT_SAVED: 'highlight:saved',
  HIGHLIGHT_LOADED: 'highlight:loaded',

  // Errors
  ERROR_OCCURRED: 'error:occurred',
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
