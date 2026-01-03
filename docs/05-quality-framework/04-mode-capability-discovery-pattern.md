# Design Pattern: Mode Capability Discovery

**Pattern Type**: Structural + Behavioral  
**Category**: Feature Flags + Strategy Pattern Enhancement  
**First Implemented**: 2025-12-30 (Phase 0 Refactoring)  
**Status**: Production

---

## Intent

Provide a **declarative, type-safe mechanism** for modes to advertise their
capabilities, enabling:

1. **Dynamic UI adaptation** (show/hide features based on mode)
2. **Runtime feature detection** (check if mode supports a feature before using
   it)
3. **Self-documenting code** (capabilities declared in one place)

---

## Problem

In a multi-mode system with varying feature sets:

- **UI needs to know**: Should I show the "Export" button? Does this mode
  support AI?
- **Code needs to check**: Can I call `syncToCloud()` on this mode?
- **Developers need clarity**: What features does Vault Mode support?

**Before capabilities**:

```typescript
// ❌ Hardcoded mode checks scattered everywhere
if (mode.name === 'vault' || mode.name === 'gen') {
  showExportButton(); // Brittle - breaks if new mode added
}

if (mode.name === 'gen') {
  showAIPanel(); // Fragile - mode names hardcoded
}
```

---

## Solution

### 1. Define Capability Interface

```typescript
/**
 * Mode capabilities for feature discovery
 */
export interface ModeCapabilities {
  /** Storage type: none (Walk), local (Sprint), remote (Vault/Gen) */
  persistence: 'none' | 'local' | 'remote';

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

  /** Full-text search */
  search: boolean;

  /** Multi-selector restoration (XPath+Position+Fuzzy) */
  multiSelector: boolean;
}
```

### 2. Modes Declare Capabilities

```typescript
export class WalkMode extends BaseHighlightMode implements IBasicMode {
  readonly capabilities: ModeCapabilities = {
    persistence: 'none',
    undo: false,
    sync: false,
    collections: false,
    tags: false,
    export: false,
    ai: false,
    search: false,
    multiSelector: false,
  };
}

export class VaultMode
  extends BaseHighlightMode
  implements IBasicMode, IPersistentMode
{
  readonly capabilities: ModeCapabilities = {
    persistence: 'remote',
    undo: true,
    sync: true,
    collections: true,
    tags: true,
    export: true,
    ai: false, // ✅ Vault doesn't have AI
    search: true,
    multiSelector: true,
  };
}

export class GenMode
  extends VaultMode
  implements IBasicMode, IPersistentMode, IAIMode
{
  readonly capabilities: ModeCapabilities = {
    ...super.capabilities,
    ai: true, // ✅ Gen adds AI on top of Vault
  };
}
```

### 3. UI Uses Capabilities

```typescript
// ✅ Declarative, type-safe, self-documenting
const mode = modeManager.getCurrentMode();

if (mode.capabilities.export) {
  showExportButton(); // Works for any mode that declares export=true
}

if (mode.capabilities.ai) {
  showAIPanel(); // Only Gen Mode
}

if (mode.capabilities.sync) {
  showSyncStatus(); // Vault and Gen
}
```

---

## Structure

```
┌─────────────────────────────────────────┐
│         ModeCapabilities                │
│  (Interface - declares all features)    │
└─────────────────────────────────────────┘
                    ▲
                    │ implements
                    │
┌───────────────────┼───────────────────┐
│                   │                   │
│  WalkMode         │  SprintMode       │  VaultMode        GenMode
│  capabilities {   │  capabilities {   │  capabilities {   capabilities {
│    persistence:   │    persistence:   │    persistence:   │    persistence:
│      'none'       │      'local'      │      'remote'     │      'remote'
│    undo: false    │    undo: true     │    undo: true     │    undo: true
│    sync: false    │    sync: false    │    sync: true     │    sync: true
│    ai: false      │    ai: false      │    ai: false      │    ai: true ✅
│  }                │  }                │  }                │  }
└───────────────────┴───────────────────┴───────────────────┴──────────────┘
```

---

## Participants

1. **ModeCapabilities Interface**: Declares all possible features
2. **Concrete Modes** (Walk, Sprint, Vault, Gen): Implement capabilities
3. **ModeManager**: Provides access to current mode's capabilities
4. **UI Components**: Query capabilities to show/hide features
5. **TypeScript**: Enforces `readonly capabilities` on all modes

---

## Collaborations

### Runtime Feature Detection

```typescript
function exportHighlights(mode: IBasicMode) {
  if (!mode.capabilities.export) {
    throw new Error('Export not supported in this mode');
  }

  // TypeScript doesn't know mode has export() method
  // Need type guard or cast
  if (isPersistentMode(mode)) {
    await mode.exportToMarkdown(); // ✅ Safe
  }
}

// Type guard
function isPersistentMode(
  mode: IBasicMode
): mode is IBasicMode & IPersistentMode {
  return mode.capabilities.persistence !== 'none';
}
```

### UI Conditional Rendering (React Example)

```tsx
function HighlightToolbar() {
  const mode = useModeManager();

  return (
    <div>
      {/* Always show basic operations */}
      <Button onClick={handleCreate}>Create</Button>
      <Button onClick={handleDelete}>Delete</Button>

      {/* Conditional features */}
      {mode.capabilities.undo && (
        <>
          <Button onClick={handleUndo}>Undo</Button>
          <Button onClick={handleRedo}>Redo</Button>
        </>
      )}

      {mode.capabilities.export && (
        <Button onClick={handleExport}>Export</Button>
      )}

      {mode.capabilities.ai && (
        <Button onClick={handleGenerateMindmap}>Generate Mindmap</Button>
      )}

      {mode.capabilities.sync && <SyncStatusBadge />}
    </div>
  );
}
```

### Backend Quota Enforcement

```typescript
// Backend can enforce quotas based on capabilities
app.post('/api/highlights/create', async (req, res) => {
  const user = await auth.getUser(req);
  const mode = user.subscription.mode; // 'sprint' | 'vault' | 'gen'

  const capabilities = MODE_CAPABILITIES[mode];

  if (!capabilities.collections && req.body.collectionId) {
    return res.status(403).json({
      error: 'Collections not available in your plan',
    });
  }

  if (!capabilities.ai && req.body.generateMindmap) {
    return res.status(403).json({
      error: 'AI features require Gen Mode subscription',
    });
  }

  // Proceed with creation...
});
```

---

## Consequences

### Positive ✅

1. **Self-Documenting**: Capabilities are declared in code, not scattered in
   docs
2. **Type-Safe**: TypeScript enforces `readonly capabilities`
3. **DRY**: Single source of truth for what each mode supports
4. **Flexible UI**: UI adapts automatically when modes gain/lose features
5. **Testable**: Easy to mock modes with different capabilities

### Negative ⚠️

1. **Duplication**: Capabilities mirror interface implementation
   - **Mitigation**: Consider this documentation, not duplication
2. **Manual Maintenance**: Must update capabilities when adding features
   - **Mitigation**: TypeScript enforces `ModeCapabilities` shape

3. **Runtime Overhead**: Small object allocation
   - **Mitigation**: Negligible (< 1KB per mode)

---

## Implementation

### File Structure

```
src/content/modes/
  ├── mode-interfaces.ts         ← ModeCapabilities interface
  ├── walk-mode.ts               ← capabilities: { persistence: 'none', ... }
  ├── sprint-mode.ts             ← capabilities: { persistence: 'local', ... }
  └── (future)
      ├── vault-mode.ts          ← capabilities: { persistence: 'remote', ... }
      └── gen-mode.ts            ← capabilities: { ...vault, ai: true }
```

### Adding a New Capability

**Step 1**: Add to interface

```typescript
export interface ModeCapabilities {
  // ... existing
  collaboration: boolean; // ← NEW
}
```

**Step 2**: TypeScript will error on all modes without it

```
Error: Property 'collaboration' is missing in type...
```

**Step 3**: Update each mode

```typescript
readonly capabilities: ModeCapabilities = {
  // ... existing
  collaboration: false, // ← Add to all modes
};
```

---

## Known Uses

1. **UI Feature Toggles**: Show/hide buttons based on capabilities
2. **Runtime Validation**: Check if operation is supported before executing
3. **Backend Quota Enforcement**: Restrict API access based on user's mode
4. **Documentation**: Capabilities serve as feature matrix
5. **Testing**: Mock modes with specific capabilities

---

## Related Patterns

1. **Strategy Pattern**: Capabilities enhance strategy by declaring what each
   strategy can do
2. **Feature Flags**: Capabilities are compile-time feature flags
3. **Capability-Based Security**: Similar concept applied to authorization
4. **Adapter Pattern**: Capabilities help determine which adapter to use

---

## Sample Code

### Complete Example

```typescript
// mode-interfaces.ts
export interface ModeCapabilities {
  persistence: 'none' | 'local' | 'remote';
  undo: boolean;
  sync: boolean;
  collections: boolean;
  tags: boolean;
  export: boolean;
  ai: boolean;
}

// walk-mode.ts
export class WalkMode implements IBasicMode {
  readonly capabilities: ModeCapabilities = {
    persistence: 'none',
    undo: false,
    sync: false,
    collections: false,
    tags: false,
    export: false,
    ai: false,
  };
}

// UI usage
function FeaturePanel({ mode }: { mode: IBasicMode }) {
  return (
    <>
      {mode.capabilities.collections && <CollectionList />}
      {mode.capabilities.ai && <AIPanel />}
      {mode.capabilities.export && <ExportButton />}
    </>
  );
}

// Runtime check
function requiresAI(mode: IBasicMode): mode is IBasicMode & IAIMode {
  if (!mode.capabilities.ai) {
    throw new Error('This operation requires AI features (Gen Mode)');
  }
  return true;
}
```

---

## References

- [Mode Architecture](./mode_interface_segregation_pattern.md)
- [ADR-003: Interface Segregation](../04-adrs/003-interface-segregation-multi-mode.md)
- [Feature Flag Pattern](https://martinfowler.com/articles/feature-toggles.html)
- [Capability-Based Security](https://en.wikipedia.org/wiki/Capability-based_security)

---

**Pattern Author**: Development Team  
**Last Updated**: 2025-12-30  
**Status**: ✅ Production-Ready
