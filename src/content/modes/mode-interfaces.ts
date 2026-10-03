/**
 * @file mode-interfaces.ts
 * @description Segregated interfaces for highlight modes (Quality Framework compliant)
 *
 * Architecture:
 * - IBasicMode: Core operations (ALL modes: basic, pro, pro_xai)
 * - IPersistentMode: Persistent storage/restore (pro, pro_xai)
 * - ICollaborativeMode: Sync/conflicts (sync services / pro modes)
 * - IAIMode: Non-product / leftover AI interface (retained for type compatibility)
 *
 * Follows Interface Segregation Principle (ISP):
 * - Basic Mode: IBasicMode only (permanent device-local storage)
 * - Pro Mode: IBasicMode + IPersistentMode
 * - Pro-XAI Mode: Extends ProMode with AI/MCP capability overlay
 *
 * @see docs/05-quality-framework/03-architecture-principles.md#interface-segregation-principle
 */

import type { HighlightData } from './highlight-mode.interface';

import type { HighlightCreatedEvent, HighlightRemovedEvent } from '@/shared/types/events';

/**
 * Mode capabilities for feature discovery
 * Allows UI to query what features a mode supports
 */
export interface ModeCapabilities {
  /** Storage type: local (device-only basic), indexeddb (pro / pro_xai) */
  persistence: 'none' | 'local' | 'remote' | 'indexeddb';

  /** Undo/redo support */
  undo: boolean;

  /** Cross-device sync */
  sync: boolean;

  /** Collections/folders */
  collections: boolean;

  /** Tagging system */
  tags: boolean;

  /** Export functionality */
  export: boolean;

  /** AI-powered features */
  ai: boolean;

  /** MCP bridge + cloud MCP connectors */
  mcp: boolean;

  /** Full-text search */
  search: boolean;

  /** Multi-selector restoration (XPath+Position+Fuzzy) */
  multiSelector: boolean;

  /** Page Groups (named + colored page/domain sets) */
  groups: boolean;
}

/**
 * Basic mode operations - ALL modes implement this
 *
 * Core functionality:
 * - Lifecycle management (activate/deactivate)
 * - CRUD operations (create, read, delete)
 * - Event handling
 * - Capability discovery
 */
export interface IBasicMode {
  /** Mode identifier */
  readonly name: 'basic' | 'pro' | 'pro_xai';

  /** Mode capabilities for feature discovery */
  readonly capabilities: ModeCapabilities;

  // Lifecycle
  onActivate(): Promise<void>;
  onDeactivate(): Promise<void>;

  // Core operations
  createHighlight(selection: Selection, colorRole: string): Promise<string>;
  createFromData(data: HighlightData): Promise<void>;
  removeHighlight(id: string): Promise<void>;
  getHighlight(id: string): HighlightData | null;
  getAllHighlights(): HighlightData[];
  clearAll(): Promise<void>;

  // Event handlers - modes decide their own behavior
  onHighlightCreated(event: HighlightCreatedEvent): Promise<void>;
  onHighlightRemoved(event: HighlightRemovedEvent): Promise<void>;

  // Restoration control
  shouldRestore(): boolean;
}

/**
 * Persistent storage operations - Pro and Pro-XAI modes
 *
 * Features:
 * - Highlight restoration from storage
 * - Update operations (tags, colors, notes)
 * - Multi-selector persistence
 */
export interface IPersistentMode {
  /**
   * Restore highlights for given URL
   * Uses multi-selector strategy (XPath → Position → Fuzzy)
   */
  restore(url: string): Promise<void>;

  /**
   * Update existing highlight properties
   * Used for: color changes, tag updates, note edits
   */
  updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void>;

  /**
   * Save highlight to persistent storage
   * (IndexedDB underscored_pro for Pro / Pro-XAI)
   */
  saveToStorage(highlight: HighlightData): Promise<void>;

  /**
   * Load highlights from storage for URL
   */
  loadFromStorage(url: string): Promise<HighlightData[]>;
}

/**
 * Collaborative features - Pro and Pro-XAI modes
 *
 * Features:
 * - Cross-device synchronization
 * - Conflict resolution (vector clocks)
 * - Event sourcing integration
 */
export interface ICollaborativeMode {
  /**
   * Sync local changes to cloud
   * Batched every 30s or on-demand
   */
  syncToCloud(): Promise<void>;

  /**
   * Resolve sync conflicts
   * Uses event sourcing + vector clocks
   */
  resolveConflicts(): Promise<ConflictResolution>;

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus;
}

/**
 * AI-powered features - Non-product / leftover interface
 *
 * Note: Retained for type compatibility with background AIMode. In-app Ask/Chat
 * and mindmap synthesis are retired from shipping UI (external agent access
 * is provided via Integrations / MCP).
 */
export interface IAIMode {
  /**
   * Generate interactive mindmap from highlights
   * @param highlights - Highlights to analyze
   * @param options - Mindmap options (layout, theme, etc.)
   */
  generateMindmap(
    highlights: HighlightData[],
    options?: MindmapOptions
  ): Promise<MindmapData>;

  /**
   * Generate summary from highlights
   * @param highlights - Highlights to summarize
   * @param length - Summary length (short/medium/long)
   */
  generateSummary(
    highlights: HighlightData[],
    length: 'short' | 'medium' | 'long'
  ): Promise<string>;

  /**
   * Generate test questions from highlights
   * @param highlights - Highlights to analyze
   */
  generateQuestions(highlights: HighlightData[]): Promise<string[]>;

  /**
   * Detect contradictions across highlights
   */
  detectContradictions(highlights: HighlightData[]): Promise<Contradiction[]>;

  /**
   * Extract entities (people, concepts, dates)
   */
  extractEntities(highlights: HighlightData[]): Promise<EntityExtraction>;
}

// Supporting types

export interface ConflictResolution {
  conflictsFound: number;
  conflictsResolved: number;
  strategy: 'last-write-wins' | 'vector-clock' | 'manual';
}

export interface SyncStatus {
  syncing: boolean;
  lastSync: Date | null;
  pendingEvents: number;
  error: string | null;
}

export interface MindmapOptions {
  layout: 'tree' | 'network' | 'timeline';
  theme: 'light' | 'dark' | 'colorful';
  depth: number;
}

export interface MindmapData {
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  metadata: {
    generatedAt: Date;
    highlightCount: number;
    confidence: number;
  };
}

export interface MindmapNode {
  id: string;
  label: string;
  type: 'concept' | 'highlight' | 'connection';
  highlightIds: string[];
  position?: { x: number; y: number };
}

export interface MindmapEdge {
  from: string;
  to: string;
  type: 'relates-to' | 'supports' | 'contradicts';
  weight: number;
}

export interface Contradiction {
  highlight1: string;
  highlight2: string;
  reason: string;
  confidence: number;
}

export interface EntityExtraction {
  people: string[];
  concepts: string[];
  dates: string[];
  places: string[];
}
