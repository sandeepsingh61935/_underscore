# Custom Highlight API Migration Plan

## Executive Summary

**Goal**: Replace Shadow DOM-based highlighting with the native Custom Highlight API to solve critical cross-block selection issues.

**Impact**: Eliminates all DOM-breaking bugs while maintaining full undo/redo and storage functionality.

**Effort**: 6-8 hours | **Risk**: Low | **Browser Support**: 99%+ modern browsers

---

## Problems This Solves

### ❌ Current Issues (Shadow DOM Approach)

| Issue | Severity | Description |
|-------|----------|-------------|
| **Cross-paragraph breaks DOM** | CRITICAL | Selections spanning `<p>`, `<div>` destroy page layout |
| **Box mode aggressive borders** | HIGH | `border` property pushes neighboring content |
| **Text displacement** | MEDIUM | Padding in highlight mode shifts text |
| **Complex DOM manipulation** | MEDIUM | Shadow DOM creation/removal is error-prone |
| **Nested highlights conflict** | MEDIUM | Overlapping highlights leave fragments |

### ✅ How Custom Highlight API Solves Them

| Issue | Solution |
|-------|----------|
| Cross-paragraph | Range objects natively span any elements - NO DOM modification |
| Box mode borders | Use `outline` instead of `border` - zero layout impact |
| Text displacement | No wrapper elements = no padding = no displacement |
| DOM complexity | Browser handles all rendering internally |
| Nested conflicts | CSS.highlights registry manages overlaps automatically |

---

## Technical Architecture

### Current vs New Approach

```
CURRENT (Shadow DOM):
┌─────────────┐     ┌──────────────────────────────────────┐
│  Selection  │────▶│ Create <span> + Shadow DOM + Styles │
└─────────────┘     └──────────────────────────────────────┘
                                    │
                                    ▼ MODIFIES DOM
                    ┌──────────────────────────────────────┐
                    │  Page structure altered → BREAKS!    │
                    └──────────────────────────────────────┘

NEW (Custom Highlight API):
┌─────────────┐     ┌──────────────────────────────────────┐
│  Selection  │────▶│ Create Range + CSS.highlights.set() │
└─────────────┘     └──────────────────────────────────────┘
                                    │
                                    ▼ NO DOM CHANGES
                    ┌──────────────────────────────────────┐
                    │  Browser renders via ::highlight()   │
                    └──────────────────────────────────────┘
```

### Data Flow

```
User Selection
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                    HighlightRenderer                        │
│  1. range = selection.getRangeAt(0)                         │
│  2. serialized = serializeRange(range)  // XPath-based     │
│  3. id = generateId()                                       │
│  4. CSS.highlights.set(`${mode}-${id}`, new Highlight(range))│
│  5. return { id, range: serialized, mode, color }          │
└─────────────────────────────────────────────────────────────┘
      │
      ├──────────────────┬──────────────────┐
      ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ HighlightStore│  │CommandStack │  │StorageService│
│ (in-memory)  │  │(undo/redo)  │  │(persistence) │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Implementation Plan

### Phase 1: Core Renderer (2-3 hours)

#### 1.1 Create New Highlight Manager
**File**: `src/content/highlight-manager.ts` (NEW)

```typescript
/**
 * Manages CSS Custom Highlights
 * Replaces Shadow DOM-based HighlightRenderer
 */
export class HighlightManager {
    private highlights: Map<string, Range> = new Map();
    
    createHighlight(
        selection: Selection,
        mode: AnnotationType,
        color: string
    ): HighlightData | null {
        const range = selection.getRangeAt(0).cloneContents();
        // ... implementation
    }
    
    removeHighlight(id: string): void {
        CSS.highlights.delete(`${mode}-${id}`);
        this.highlights.delete(id);
    }
}
```

#### 1.2 Inject Mode-Specific Styles
**File**: `src/content/styles/highlight-styles.ts` (NEW)

```typescript
export function injectHighlightStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
        ::highlight(underscore) {
            text-decoration: underline wavy currentColor;
            text-underline-offset: 3px;
        }
        
        ::highlight(highlight) {
            background-color: var(--hl-color, #FFEB3B);
        }
        
        ::highlight(box) {
            outline: 2px solid var(--hl-color, #2196F3);
            outline-offset: 1px;
        }
    `;
    document.head.appendChild(style);
}
```

---

### Phase 2: Storage Integration (1 hour)

#### 2.1 Update Highlight Data Structure
**File**: `src/content/highlight-store.ts`

```typescript
// CHANGE: Remove 'element' field (no DOM element needed)
export interface Highlight {
    id: string;
    text: string;
    color: string;
    type: AnnotationType;
    range: SerializedRange;  // Store serialized for persistence
    createdAt: Date;
    // REMOVED: element: HTMLElement
}
```

#### 2.2 Update Event Types
**File**: `src/shared/types/storage.ts`

```typescript
// No changes needed - SerializedRange already compatible!
interface HighlightCreatedEvent {
    type: 'highlight.created';
    timestamp: number;
    eventId: string;
    data: {
        id: string;
        text: string;
        color: string;
        type: AnnotationType;  // Already there
        range: SerializedRange; // Already there
    };
}
```

---

### Phase 3: Command Pattern Updates (1.5 hours)

#### 3.1 Update CreateHighlightCommand
**File**: `src/content/commands/highlight-commands.ts`

```typescript
class CreateHighlightCommand implements Command {
    async execute(): Promise<void> {
        // Deserialize and create CSS highlight
        const range = deserializeRange(this.highlight.range);
        if (!range) return;
        
        const cssHighlight = new Highlight(range);
        CSS.highlights.set(
            `${this.highlight.type}-${this.highlight.id}`,
            cssHighlight
        );
        
        this.store.add(this.highlight);
        await this.storage.saveEvent({...});
    }
    
    async undo(): Promise<void> {
        CSS.highlights.delete(
            `${this.highlight.type}-${this.highlight.id}`
        );
        this.store.remove(this.highlight.id);
        await this.storage.saveEvent({type: 'removed', ...});
    }
}
```

#### 3.2 Update RemoveHighlightCommand
```typescript
class RemoveHighlightCommand implements Command {
    async execute(): Promise<void> {
        CSS.highlights.delete(`${this.highlight.type}-${this.highlight.id}`);
        this.store.remove(this.highlight.id);
        await this.storage.saveEvent({type: 'removed', ...});
    }
    
    async undo(): Promise<void> {
        const range = deserializeRange(this.highlight.range);
        if (!range) return;
        
        CSS.highlights.set(
            `${this.highlight.type}-${this.highlight.id}`,
            new Highlight(range)
        );
        this.store.add(this.highlight);
        await this.storage.saveEvent({type: 'created', ...});
    }
}
```

---

### Phase 4: Page Load Restoration (1 hour)

#### 4.1 Update restoreHighlights()
**File**: `src/entrypoints/content.ts`

```typescript
async function restoreHighlights(): Promise<void> {
    const events = await storage.loadEvents();
    const activeHighlights = replayEvents(events);
    
    for (const hl of activeHighlights.values()) {
        const range = deserializeRange(hl.range);
        if (!range) continue;
        
        // Create CSS Highlight (no DOM modification!)
        CSS.highlights.set(
            `${hl.type}-${hl.id}`,
            new Highlight(range)
        );
        
        store.add(hl);
    }
}
```

---

### Phase 5: Remove Shadow DOM Code (0.5 hours)

#### Files to Modify/Delete
- `src/content/highlight-renderer.ts` - Remove Shadow DOM logic
- Remove `createHighlightElement()` method
- Remove `getAnnotationStyles()` method (moved to CSS)
- Keep `serializeRange()` / `deserializeRange()` - still needed

---

### Phase 6: Testing (1 hour)

#### Test Cases
1. **Single block highlight** - All three modes
2. **Cross-paragraph highlight** - The main fix!
3. **Undo/redo** - All modes, single and cross-block
4. **Page reload restoration** - Verify persistence
5. **Deletion persistence** - Create → Delete → Reload
6. **Overlapping highlights** - Ensure no conflicts

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 105+ | ✅ Full |
| Edge | 105+ | ✅ Full |
| Firefox | 137+ | ✅ Full |
| Safari | 17.2+ | ✅ Full |
| Chrome Android | 105+ | ✅ Full |
| Safari iOS | 17.2+ | ✅ Full |

**Coverage**: ~99% of users (as of 2024)

### Fallback Strategy (Optional)
For the 1% on older browsers:
- Detect support: `'highlights' in CSS`
- Fall back to current Shadow DOM approach
- Or display message: "Please update browser"

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API not available | Low (1%) | Medium | Feature detection + fallback |
| Range serialization fails | Low | Low | Already battle-tested |
| Performance issues | Very Low | Low | Browser-native is faster |
| CSS conflicts | Low | Low | Scoped highlight names |

---

## Migration Checklist

### Pre-Implementation
- [ ] Review current test coverage
- [ ] Create feature branch
- [ ] Verify browser support in target environments

### Implementation
- [ ] Phase 1: Create HighlightManager
- [ ] Phase 2: Update storage types
- [ ] Phase 3: Update commands
- [ ] Phase 4: Update restoration
- [ ] Phase 5: Remove legacy code
- [ ] Phase 6: Testing

### Post-Implementation
- [ ] Update documentation
- [ ] Performance comparison
- [ ] User acceptance testing
- [ ] Merge to main

---

## Success Criteria

1. ✅ Cross-paragraph selections work without breaking layout
2. ✅ All three modes (underscore, highlight, box) render correctly
3. ✅ Undo/redo works for all scenarios
4. ✅ Deletions persist across page reloads
5. ✅ All 119 existing tests pass
6. ✅ No visual regressions

---

## Timeline

| Day | Tasks | Hours |
|-----|-------|-------|
| 1 | Phase 1-2 (Core + Storage) | 3-4h |
| 2 | Phase 3-4 (Commands + Restore) | 2.5h |
| 2 | Phase 5-6 (Cleanup + Testing) | 1.5h |
| **Total** | | **7-8h** |
