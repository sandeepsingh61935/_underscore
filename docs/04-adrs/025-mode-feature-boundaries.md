# ADR-025: Mode Feature Boundaries and Prerequisites

**Status**: Proposed  
**Date**: 2026-07-11  
**Context**: v3 mode consolidation (`basic` | `pro` | `pro_xai`) is complete at the schema/DI layer, but feature gating is inconsistent. UI and IPC often check auth or hardcoded mode strings instead of `ModeCapabilities`. This ADR defines the canonical feature matrix, prerequisites, and worktree isolation strategy for parallel enforcement.

---

## Decision

1. **Single source of truth**: `ModeCapabilities` on each highlight mode class (`BasicMode`, `ProMode`, `ProXaiMode`) plus a shared `canUseFeature(mode, capability)` helper.
2. **Prerequisite chain**: Features require both **capability** and **runtime prerequisites** (auth, vault unlock, storage scope).
3. **Three enforcement layers**: UI (hide/disable), IPC/background (reject), MCP bridge (already partially done).
4. **Parallel worktrees**: One worktree per boundary track under `.worktrees/`, merged foundation-first.

---

## Mode Model (v3)

| Mode ID | Display | Storage scope | Auth required | AI |
|---------|---------|---------------|---------------|-----|
| `basic` | Basic | `basic` (IndexedDB `underscore_basic`) | No | No |
| `pro` | Pro | `pro` (IndexedDB `underscore_pro` + cloud) | Yes | No |
| `pro_xai` | 10x-Pro | Same as `pro` (overlay) | Yes | Yes |

`pro_xai` is a **capability overlay** on `pro` — same persistence, sync, and vault. Only `capabilities.ai` differs.

---

## Canonical Capability Matrix

Declared in mode classes; must drive all gating.

| Capability | Basic | Pro | 10x-Pro (`pro_xai`) |
|------------|:-----:|:---:|:-------------------:|
| `persistence` | `local` | `indexeddb` | `indexeddb` |
| `undo` | yes | yes | yes |
| `sync` | no | yes | yes |
| `collections` | yes | yes | yes |
| `tags` | no | yes | yes |
| `export` | no | yes | yes |
| `search` | no | yes | yes |
| `multiSelector` | no | yes | yes |
| `ai` | no | no | yes |

**Source files**:
- `src/content/modes/basic-mode.ts`
- `src/content/modes/pro-mode.ts`
- `src/content/modes/pro-xai-mode.ts`

---

## Feature Boundary Catalog

Each feature maps to a capability and optional prerequisites.

### Basic-only surface (device-local)

| Feature | Capability | Prerequisites | Current gate | Gap |
|---------|------------|---------------|--------------|-----|
| Configurable TTL | `persistence: local` | `mode === 'basic'` | `SettingsPage`, `basic-ttl` | OK |
| Local-only highlights | storage scope `basic` | not signed in | `auth-storage-lifecycle` | OK |
| Collections (read) | `collections` | none | always on | OK |
| Highlight CRUD | `IBasicMode` | none | mode manager | OK |

### Pro features (synced vault)

| Feature | Capability | Prerequisites | Current gate | Gap |
|---------|------------|---------------|--------------|-----|
| Cloud sync | `sync` | signed in, `pro` scope active | auth lifecycle + sync services | OK at service layer |
| Tags / metadata edit | `tags` | signed in, vault unlocked | **none in UI** | **GAP** |
| Export (library/section) | `export` | signed in | `disabled={!user}` only | **GAP** — should check `export` capability |
| Full-text search | `search` | signed in | not mode-gated in UI | **GAP** |
| Multi-selector restore | `multiSelector` | `pro` mode class | `ProMode.restore()` | OK |
| Vault encryption | storage scope `pro` | signed in | `LLMKeyStore` tier | **GAP** — always `'basic'` in DI |
| MCP sync/export/collections | MCP capabilities | signed in | `mcp-bridge-handler` | Partial — export always `true` |
| Delete library / section | `collections` + scope | vault unlocked | `vaultLocked` | OK |

### 10x-Pro features (AI overlay)

| Feature | Capability | Prerequisites | Current gate | Gap |
|---------|------------|---------------|--------------|-----|
| Summarize section | `ai` | signed in, vault unlocked | `vaultLocked` only | **GAP** — no `pro_xai` check |
| Ask scope / Q&A | `ai` | signed in, `pro_xai` | MCP: `assertProXai` | UI not gated |
| Synthesize domain | `ai` | signed in, `pro_xai` | MCP: `assertProXai` | UI not gated |
| LLM IPC (`IPC_AI_*`) | `ai` | provider configured | **no mode check** | **GAP** |
| Configure AI providers | `ai` | signed in | always visible in Settings | **GAP** |
| MCP AI tools | `ai` | `pro_xai` | `mcp-bridge-handler` | OK |

---

## Prerequisite Model

```typescript
type FeaturePrerequisite =
  | { type: 'capability'; key: keyof ModeCapabilities }
  | { type: 'auth' }
  | { type: 'vault_unlocked' }
  | { type: 'storage_scope'; scope: 'basic' | 'pro' }
  | { type: 'mode'; mode: ModeType }; // only when capability alone is insufficient

interface FeatureGateResult {
  allowed: boolean;
  reason?: 'AUTH_REQUIRED' | 'CAPABILITY_DENIED' | 'VAULT_LOCKED' | 'WRONG_MODE' | 'WRONG_SCOPE';
}
```

### Prerequisite chains by mode

**Basic**
```
highlight CRUD → capability.collections (implicit via IBasicMode)
TTL settings → mode === 'basic'
no sync → !capabilities.sync
no export/tags/search/AI → respective capability === false
```

**Pro**
```
all Pro features → auth + storage_scope:pro
sync → capabilities.sync + auth
export/tags/search → respective capability + auth + vault_unlocked (for encrypted text)
mode selection → AUTH_REQUIRED_MODES includes 'pro'
```

**10x-Pro**
```
inherits all Pro prerequisites
AI features → capabilities.ai + auth + mode === 'pro_xai'
LLM keys → LLMKeyStore tier 'pro' (vault encryption)
```

---

## ISP Interface Boundaries

| Interface | Modes | Implementation status |
|-----------|-------|----------------------|
| `IBasicMode` | all | `BasicMode`, `ProMode`, `ProXaiMode` |
| `IPersistentMode` | pro, pro_xai | `ProMode`, `ProXaiMode` |
| `ICollaborativeMode` | pro, pro_xai | **not implemented on mode class** — sync in background services |
| `IAIMode` | pro_xai only | **`AIMode` in background only** — not wired to `ProXaiMode` |

**Recommendation**: Either wire `IAIMode` to `ProXaiMode` via composition, or document that AI lives exclusively in background `AiOrchestrator` + MCP and delete the unused interface from highlight modes.

---

## Enforcement Gaps (Audit Summary)

### Critical (ship-blockers for boundary work)

1. **No central `canUseFeature()`** — ad-hoc `mode === 'pro'` checks scattered; capabilities declared but unread in UI.
2. **AI UI exposed in Pro mode** — `SubDomainView` summarize/ask visible when `vaultLocked === false`, regardless of `pro_xai`.
3. **LLM IPC ungated** — `registerAiHandlers` accepts requests in any mode.
4. **Export gated on auth only** — `SettingsPage` line 220: `disabled={!user}` ignores `capabilities.export`.
5. **LLMKeyStore stuck on `'basic'`** — DI default never switches on mode change.

### Medium

6. Transition guards in `mode-transition-rules.ts` are stubs (`return true`).
7. MCP `capabilitiesForMode` sets `export: true` for all signed-in modes (should respect basic).
8. `StateMetadata.flags` in schema unused for runtime gating.
9. Mode vs storage-scope invariant undocumented (signed-in user always `pro` scope).

### Low / cleanup

10. Legacy v2 artifacts: `shared/utils/modes.ts`, `cloud-mode-init.ts`, stale docs (ADR-003, mode-comparison guide).
11. `ICollaborativeMode` interface with no implementor.

---

## Worktree Isolation Strategy

Parallel development via `.worktrees/` (gitignored). Each track owns a branch and a bounded file set.

| Worktree | Branch | Owns |
|----------|--------|------|
| `.worktrees/wt-mode-foundation` | `feature/mode-boundary-foundation` | `canUseFeature()`, `useModeCapabilities` hook, tests, ADR updates |
| `.worktrees/wt-mode-basic` | `feature/mode-boundary-basic` | Basic TTL, local-only guards, deny pro features in basic UI |
| `.worktrees/wt-mode-pro` | `feature/mode-boundary-pro` | Auth/sync/export/tags/search gating, `LLMKeyStore` tier, transition guards |
| `.worktrees/wt-mode-pro-xai` | `feature/mode-boundary-pro-xai` | AI UI, LLM IPC, MCP parity, `IAIMode` wiring decision |

**Merge order**: foundation → basic → pro → pro_xai (each rebases on prior).

**Bootstrap**:
```bash
./scripts/mode-worktree-start.sh --track foundation
./scripts/mode-worktree-start.sh --track basic
./scripts/mode-worktree-start.sh --track pro
./scripts/mode-worktree-start.sh --track pro-xai
```

---

## Files to Touch (by track)

### Foundation
- `src/shared/utils/mode-capabilities.ts` (new)
- `src/shared/hooks/useModeCapabilities.ts` (new)
- `src/content/modes/mode-interfaces.ts` (export `FeatureKey` type)
- Tests: `tests/unit/shared/mode-capabilities.test.ts`

### Basic
- `src/pages/SettingsPage.tsx` — hide export/sync for basic
- `src/features/collections/views/*` — deny pro-only actions
- `src/content/modes/mode-transition-rules.ts` — enforce basic guards

### Pro
- `src/pages/SettingsPage.tsx` — export requires `capabilities.export`
- `src/shared/di/base-service-registration.ts` — `LLMKeyStore` mode injection
- `src/background/services/auth-storage-lifecycle.ts` — document scope invariant
- `src/background/services/mcp-bridge-handler.ts` — fix `export` in capabilities snapshot

### 10x-Pro
- `src/features/collections/views/SubDomainView.tsx` — gate summarize/ask on `capabilities.ai`
- `src/background/services/llm/ipc-handlers.ts` — assert `pro_xai`
- `src/pages/SettingsPage.tsx` — hide "Configure AI providers" unless `ai`
- `src/features/settings/components/McpTierCallout.tsx` — already mode-aware; extend pattern

---

## Verification

Per track, before merge:

```bash
npm run type-check
npm run build
npm test -- --run tests/unit/shared/mode-capabilities.test.ts
npm test -- --run tests/unit/background/services/mcp-bridge-handler.test.ts
```

Manual:
1. Basic (logged out): no export, no sync, no AI, TTL visible.
2. Pro (logged in, `pro` mode): export/sync/tags/search work; no AI buttons.
3. 10x-Pro (`pro_xai`): AI summarize/ask work; LLM IPC rejects in `pro` mode.

---

## References

- `src/shared/schemas/mode-state-schemas.ts` — `ModeType`
- `src/shared/constants/mode-storage.ts` — `AUTH_REQUIRED_MODES`
- `src/content/modes/mode-interfaces.ts` — `ModeCapabilities`
- `src/background/services/mcp-bridge-handler.ts` — reference implementation for AI gating
- `docs/05-quality-framework/04-mode-capability-discovery-pattern.md` — pattern (needs v3 update)
