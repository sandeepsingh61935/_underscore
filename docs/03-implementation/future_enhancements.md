# Future Tasks

## Box Mode Rendering Improvements
**Priority**: Medium  
**Effort**: 2-3 hours  
**Status**: Current implementation too aggressive

### Problem
Box mode (Ctrl+B) creates borders that are too aggressive:
- Pushes neighboring text boundaries
- Creates visual disruption
- Margin/padding issues on multi-line

### Proposed Solutions
1. Use `outline` instead of `border` (doesn't affect layout)
2. Adjust `box-decoration-break` spacing
3. Fine-tune padding/margin values
4. Consider inset box-shadow alternative

---

## Multi-Fragment Cross-Block Highlighting
**Priority**: High (Vault Mode)  
**Effort**: 7-10 hours  
**Status**: Deferred from Sprint Mode

### Problem
Cross-paragraph/block selections currently blocked to prevent DOM breakage.

### Proposed Solution (User Request)
Intelligently split selections across blocks into **linked fragments**:

```
Selection: "text in <p>para 1</p><p>para 2</p><dd>definition</dd>"
Result: 3 separate highlights, grouped by shared ID
```

### Implementation Plan

**1. Range Splitting Algorithm** (~3-4h)
```typescript
function splitRangeByBlocks(range: Range): Range[] {
    // Walk DOM tree
    // Find all block boundaries within range
    // Create sub-ranges for each block
    // Handle text node splitting
    // Filter empty ranges
}
```

**2. Group Management** (~2-3h)
- Shared `groupId` for all fragments
- `HighlightGroup` interface
- Atomic undo/redo for entire group
- Storage format for groups

**3. Edge Cases** (~2-3h)
- Nested blocks (`<div><p>...</p></div>`)
- Tables (`<td>`, `<th>`)
- Lists (`<ul><li>`)
- Empty blocks in range
- Partially selected text nodes

**4. Visual Continuity** (~1h)
- Gap handling (margin/padding between blocks)
- Mode-specific rendering:
  - Underscore: separate per block (acceptable)
  - Highlight: separate backgrounds (acceptable)
  - Box: separate boxes (might look broken)

### Technical Challenges
- ✅ DOM traversal complexity
- ⚠️ Partial failure on undo (1 fragment fails)
- ⚠️ Storage: multiple `SerializedRange` objects
- ❌ Visual gaps between blocks

### Why Deferred
Sprint Mode = 4h TTL (ephemeral)  
Full solution not justified for temporary highlights  
**Better for**: Vault Mode (permanent storage)

### References
- Medium's text highlighter (uses similar approach)
- Hypothesis annotation tool  
- Web Annotation Data Model (W3C)
