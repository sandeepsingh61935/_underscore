# Mode Architecture: Interface Segregation Pattern

**Document Type**: Architecture Reference  
**Last Updated**: 2025-12-30  
**Status**: Production  
**Related ADRs**:
[ADR-003: Interface Segregation](../04-adrs/003-interface-segregation-multi-mode.md)

---

## Overview

The Web Highlighter Extension implements a multi-mode architecture supporting
four distinct modes (Walk, Sprint, Vault, Gen), each with different feature sets
and resource requirements. This document describes the interface segregation
pattern used to maintain SOLID principles while scaling from 2 to 4 modes.

---

## Architecture Pattern: Interface Segregation + Strategy

### Core Concept

Instead of a single "fat interface" forcing all modes to implement all methods,
we use **role-based interface segregation** where modes only implement
interfaces matching their capabilities.

```
┌──────────────┐  ┌───────────────┐  ┌──────────────┐  ┌────────────┐
│ IBasicMode   │  │IPersistentMode│  │ICollaborative│  │  IAIMode   │
│              │  │               │  │    Mode      │  │            │
│ ALL modes    │  │ Vault, Gen    │  │ Vault, Gen   │  │  Gen only  │
└──────┬───────┘  └───────┬───────┘  └──────┬───────┘  └─────┬──────┘
       │                  │                  │                 │
       ▼                  ▼                  ▼                 ▼
   ┌────────┐        ┌─────────┐       ┌─────────┐      ┌─────────┐
   │  Walk  │        │  Vault  │       │  Vault  │      │   Gen   │
   │  Mode  │        │  Mode   │       │  Mode   │      │  Mode   │
   └────────┘        └─────────┘       └─────────┘      └─────────┘
   ┌────────┐        ┌─────────┐       ┌─────────┐      ┌─────────┐
   │ Sprint │        │   Gen   │       │   Gen   │      │   Gen   │
   │  Mode  │        │  Mode   │       │  Mode   │      │  Mode   │
   └────────┘        └─────────┘       └─────────┘      └─────────┘
```

---

## Interface Definitions

### 1. IBasicMode (Required for ALL Modes)

**Purpose**: Core highlight operations available in every mode.

**Methods** (10 total):

```typescript
interface IBasicMode {
  // Identification
  readonly name: 'walk' | 'sprint' | 'vault' | 'gen';
  readonly capabilities: ModeCapabilities;

  // Lifecycle
  onActivate(): Promise<void>;
  onDeactivate(): Promise<void>;

  // CRUD
  createHighlight(selection: Selection, colorRole: string): Promise<string>;
  createFromData(data: HighlightData): Promise<void>;
  removeHighlight(id: string): Promise<void>;
  getHighlight(id: string): HighlightData | null;
  getAllHighlights(): HighlightData[];
  clearAll(): Promise<void>;

  // Events (SRP compliance)
  onHighlightCreated(event: HighlightCreatedEvent): Promise<void>;
  onHighlightRemoved(event: HighlightRemovedEvent): Promise<void>;

  // Control
  shouldRestore(): boolean;
}
```

**Implemented By**: Walk, Sprint, Vault, Gen (all modes)

---

### 2. IPersistentMode (Vault, Gen Only)

**Purpose**: Cross-session persistence and restoration.

**Methods** (4 total):

```typescript
interface IPersistentMode {
  restore(url: string): Promise<void>;
  updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void>;
  saveToStorage(highlight: HighlightData): Promise<void>;
  loadFromStorage(url: string): Promise<HighlightData[]>;
}
```

**Implemented By**: Vault, Gen  
**NOT Implemented By**: Walk (ephemeral), Sprint (session-only)

**Why Segregated**: Walk and Sprint modes have no cross-session persistence.
Forcing them to implement `restore()` as a NO-OP violates ISP.

---

### 3. ICollaborativeMode (Vault, Gen Only)

**Purpose**: Cross-device synchronization and conflict resolution.

**Methods** (3 total):

```typescript
interface ICollaborativeMode {
  syncToCloud(): Promise<void>;
  resolveConflicts(): Promise<ConflictResolution>;
  getSyncStatus(): SyncStatus;
}
```

**Implemented By**: Vault, Gen  
**NOT Implemented By**: Walk, Sprint (local-only)

**Why Segregated**: Syncing requires backend infrastructure. Walk/Sprint don't
connect to backend, so shouldn't have sync methods.

---

### 4. IAIMode (Gen Only)

**Purpose**: AI-powered analysis and content generation.

**Methods** (4+ total):

```typescript
interface IAIMode {
  generateMindmap(
    highlights: HighlightData[],
    options?: MindmapOptions
  ): Promise<MindmapData>;
  generateSummary(
    highlights: HighlightData[],
    length: 'short' | 'medium' | 'long'
  ): Promise<string>;
  generateQuestions(highlights: HighlightData[]): Promise<string[]>;
  detectContradictions(highlights: HighlightData[]): Promise<Contradiction[]>;
  extractEntities(highlights: HighlightData[]): Promise<EntityExtraction>;
}
```

**Implemented By**: Gen only  
**NOT Implemented By**: Walk, Sprint, Vault (no AI)

**Why Segregated**: AI features require Claude API, cost tracking, and heavy
dependencies (~500KB). No other mode should load this code.

---

## Mode Capability Matrix

| Feature                 | Walk | Sprint  | Vault     | Gen       | Interface                       |
| ----------------------- | ---- | ------- | --------- | --------- | ------------------------------- |
| **Core CRUD**           | ✅   | ✅      | ✅        | ✅        | `IBasicMode`                    |
| **Undo/Redo**           | ❌   | ✅      | ✅        | ✅        | `IBasicMode` (via CommandStack) |
| **Event Handlers**      | ✅   | ✅      | ✅        | ✅        | `IBasicMode`                    |
| **Persistence**         | ❌   | Session | IndexedDB | IndexedDB | `IPersistentMode`               |
| **Restoration**         | ❌   | ❌      | ✅        | ✅        | `IPersistentMode`               |
| **Cloud Sync**          | ❌   | ❌      | ✅        | ✅        | `ICollaborativeMode`            |
| **Conflict Resolution** | ❌   | ❌      | ✅        | ✅        | `ICollaborativeMode`            |
| **Collections**         | ❌   | ❌      | ✅        | ✅        | `IPersistentMode`               |
| **Tags**                | ❌   | ❌      | ✅        | ✅        | `IPersistentMode`               |
| **Export**              | ❌   | ❌      | ✅        | ✅        | `IPersistentMode`               |
| **AI Mindmaps**         | ❌   | ❌      | ❌        | ✅        | `IAIMode`                       |
| **AI Summaries**        | ❌   | ❌      | ❌        | ✅        | `IAIMode`                       |
| **Entity Extraction**   | ❌   | ❌      | ❌        | ✅        | `IAIMode`                       |

---

## Implementation Examples

### Walk Mode (Simplest)

```typescript
import type { IBasicMode, ModeCapabilities } from './mode-interfaces';

export class WalkMode extends BaseHighlightMode implements IBasicMode {
  readonly capabilities: ModeCapabilities = {
    persistence: 'none',
    undo: false,
    sync: false,
    collections: false,
    tags: false,
    export: false,
    ai: false,
  };

  // Only implement IBasicMode methods
  // No restore(), no syncToCloud(), no generateMindmap()

  async onHighlightCreated(event: HighlightCreatedEvent): Promise<void> {
    // NO-OP - Walk Mode doesn't persist
  }

  shouldRestore(): boolean {
    return false; // Never restore
  }
}
```

**Methods**: 10 (IBasicMode only)  
**Bundle Impact**: Minimal (~5KB)

---

### Sprint Mode (Local Persistence)

```typescript
export class SprintMode extends BaseHighlightMode implements IBasicMode {
  readonly capabilities: ModeCapabilities = {
    persistence: 'local',
    undo: true,
    sync: false,
    // ...
  };

  async onHighlightCreated(event: HighlightCreatedEvent): Promise<void> {
    // Persist to event sourcing storage with TTL
    const storageData = await toStorageFormat(event.highlight);
    await this.storage.saveEvent({
      type: 'highlight.created',
      data: storageData,
    });
  }

  shouldRestore(): boolean {
    return true; // Restore within session
  }
}
```

**Methods**: 10 (IBasicMode only)  
**Bundle Impact**: +StorageService (~15KB)

---

### Vault Mode (Full Persistence + Sync)

```typescript
export class VaultMode
  extends BaseHighlightMode
  implements IBasicMode, IPersistentMode, ICollaborativeMode
{
  readonly capabilities: ModeCapabilities = {
    persistence: 'remote',
    undo: true,
    sync: true,
    collections: true,
    tags: true,
    export: true,
    ai: false,
  };

  // IBasicMode methods (10)
  // ...

  // IPersistentMode methods (4)
  async restore(url: string): Promise<void> {
    // Multi-selector restoration (XPath → Position → Fuzzy)
    const highlights = await this.loadFromStorage(url);
    for (const data of highlights) {
      await this.multiSelectorEngine.restore(data);
    }
  }

  // ICollaborativeMode methods (3)
  async syncToCloud(): Promise<void> {
    // Sync local events to backend
    await this.syncQueue.flush();
  }
}
```

**Methods**: 17 (IBasicMode + IPersistentMode + ICollaborativeMode)  
**Bundle Impact**: +IndexedDB +APIClient +SyncQueue (~80KB)

---

### Gen Mode (Everything + AI)

```typescript
export class GenMode
  extends VaultMode
  implements IBasicMode, IPersistentMode, ICollaborativeMode, IAIMode
{
  readonly capabilities: ModeCapabilities = {
    persistence: 'remote',
    undo: true,
    sync: true,
    collections: true,
    tags: true,
    export: true,
    ai: true, // ✅ AI enabled
  };

  // Inherits 17 methods from VaultMode

  // IAIMode methods (5+)
  async generateMindmap(
    highlights: HighlightData[],
    options?: MindmapOptions
  ): Promise<MindmapData> {
    const prompt = this.buildMindmapPrompt(highlights);
    const response = await this.aiClient.complete(prompt);
    return this.parseMindmapResponse(response);
  }

  async generateSummary(
    highlights: HighlightData[],
    length: 'short' | 'medium' | 'long'
  ): Promise<string> {
    const prompt = this.buildSummaryPrompt(highlights, length);
    return await this.aiClient.complete(prompt);
  }
}
```

**Methods**: 22+ (All interfaces)  
**Bundle Impact**: +AIClient +D3.js +Markmap (~500KB total)

---

## Design Patterns Used

### 1. Strategy Pattern

**Purpose**: Swap mode implementations at runtime  
**Implementation**: `ModeManager` holds reference to `IBasicMode`, can switch
between Walk/Sprint/Vault/Gen

### 2. Interface Segregation (ISP)

**Purpose**: Clients depend only on methods they use  
**Implementation**: 4 focused interfaces instead of 1 fat interface

### 3. Single Responsibility (SRP)

**Purpose**: Each mode handles its own logic  
**Implementation**: Modes implement `onHighlightCreated()` /
`onHighlightRemoved()`, orchestrator delegates

### 4. Dependency Inversion (DIP)

**Purpose**: Depend on abstractions, not concretions  
**Implementation**: All modes receive `EventBus`, `ILogger`, `RepositoryFacade`
via constructor injection

### 5. Observer Pattern

**Purpose**: Decouple event producers from consumers  
**Implementation**: Event handlers (`onHighlightCreated`) observe highlight
lifecycle events

### 6. Capability-Based Design

**Purpose**: Runtime feature discovery  
**Implementation**: `ModeCapabilities` object declares what each mode supports

---

## Benefits of This Architecture

### 1. Lean Bundle Sizes

- **Walk Mode**: ~5KB (basic operations only)
- **Sprint Mode**: ~20KB (+ event sourcing)
- **Vault Mode**: ~100KB (+ sync + multi-selector)
- **Gen Mode**: ~600KB (+ AI + visualization)

Without interface segregation, ALL modes would load ~600KB (Gen Mode's
dependencies).

### 2. Type Safety

TypeScript enforces correct interface implementation:

```typescript
function requiresPersistence(mode: IBasicMode & IPersistentMode) {
  await mode.restore(url); // ✅ TypeScript knows restore() exists
}

const walkMode: IBasicMode = new WalkMode();
await walkMode.restore(url); // ❌ TypeScript error - restore() doesn't exist
```

###3. Future-Proof Adding Vault/Gen modes requires ZERO refactoring of
Walk/Sprint:

- Walk Mode: No changes needed
- Sprint Mode: No changes needed
- Architecture: Already prepared

### 4. UI Adaptation

UI can query capabilities dynamically:

```typescript
const mode = modeManager.getCurrentMode();

// Show/hide features based on capabilities
if (mode.capabilities.export) showExportButton();
if (mode.capabilities.ai) showAIPanel();
if (mode.capabilities.sync) showSyncStatus();
```

---

## When to Add New Interfaces

**Create a new interface when:**

1. A feature is used by SOME modes but NOT ALL
2. The feature has significant dependencies (>50KB)
3. The feature represents a distinct capability domain

**Example**:

- ✅ `ICollaborativeMode` - Only Vault/Gen need sync
- ✅ `IAIMode` - Only Gen needs AI
- ❌ `IUndoMode` - Undo is part of `IBasicMode` (Sprint, Vault, Gen all support
  it)

---

## Migration Guide

### From Fat Interface to Segregated Interfaces

**Before**:

```typescript
class MyMode implements IHighlightMode {
  async restore(): Promise<void> {
    // ❌ NO-OP - forced to implement
  }
}
```

**After**:

```typescript
class MyMode extends BaseHighlightMode implements IBasicMode {
  readonly capabilities: ModeCapabilities = {
    persistence: 'none',
    // ...
  };

  // ✅ No restore() method - not needed!
}
```

**Steps**:

1. Determine which interfaces mode needs (check capability matrix)
2. Implement only those interfaces
3. Add `capabilities` property
4. Remove NO-OP methods

---

## References

- [ADR-003: Interface Segregation](../04-adrs/003-interface-segregation-multi-mode.md)
- [Quality Framework: ISP](../05-quality-framework/03-architecture-principles.md#interface-segregation-principle)
- [Mode Interfaces Source](file:///home/sandy/projects/_underscore/src/content/modes/mode-interfaces.ts)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)

---

**Last Verified**: 2025-12-30  
**TypeScript Compilation**: ✅ 0 errors  
**Quality Framework Compliance**: ✅ 100%
