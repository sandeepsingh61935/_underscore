# ADR-030: Live Mode and Product Capability Matrix

**Status**: Accepted  
**Date**: 2026-09-12  
**Decision-makers**: Product + Engineering  
**Supersedes**: [ADR-025: Mode Feature Boundaries and Prerequisites](./025-mode-feature-boundaries.md)  
**Related**: [ADR-029: Cloud-First Library SoT and Integrations (MCP)](./029-cloud-first-library-and-integrations.md), [ADR-003: Interface Segregation for Multi-Mode Architecture](./003-interface-segregation-multi-mode.md)

---

## Context

ADR-025 captured an intermediate proposed state (July 2026) that retained legacy assumptions: configurable TTL for guest storage, tags/search withheld from basic mode, passphrase-unlocked client vault, and in-app Ask/Chat Q&A interfaces.

As the codebase evolved through v3 consolidation and Integrations alignment (ADR-029):
1. **Guest mode (`basic`)** became permanent device-local storage with no TTL and full support for collections, tags, and local search.
2. **In-app AI (Ask/Chat/Models)** was retired in favor of external agent access via **Integrations (MCP)**.
3. An operational **early-access free window** was introduced in `commercial.ts` allowing signed-in free accounts to connect MCP without a paid subscription.
4. The **Web Vault** was re-architected as a local directory mirror (Obsidian/Logseq markdown export via File System Access API), rather than a passphrase-locked encrypted partition.

This ADR supersedes ADR-025 and codifies the running contracts in `src/` as the official architecture decision.

---

## Decision

### 1. Canonical Mode Vocabulary

The internal mode identifiers are a fixed, stable schema contract defined in `src/shared/schemas/mode-state-schemas.ts`:

```typescript
export const ModeTypeSchema = z.enum(['basic', 'pro', 'pro_xai']);
export type ModeType = z.infer<typeof ModeTypeSchema>;
```

- **Default Mode**: `basic`
- **Branding / Display Layer** (`src/shared/constants/mode-branding.ts`):
  - `basic` → **Guest** (Family: device, Tagline: "Local only")
  - `pro` → **Account (Free)** (Family: cloud, Tagline: "Synced")
  - `pro_xai` → **Account (Paid)** (Family: cloud, Tagline: "Synced + AI")
- **Legacy String Translation**:
  Pre-v3 identifiers (`ephemeral`, `local`, `cloud`, `ai`) and v1 motif names (`walk`, `sprint`, `vault`, `neural`) are translated forward exclusively at storage and IPC read boundaries via `normalizeMode()` in `src/shared/utils/normalize-mode.ts`. Internal runtime logic operates solely on `'basic' | 'pro' | 'pro_xai'`.

### 2. Live Capability Matrix

The static capability matrix declared in `src/shared/utils/mode-capabilities.ts` and mode classes (`src/content/modes/*`):

| Capability | Basic (`basic`) | Pro (`pro`) | 10x-Pro (`pro_xai`) | Description |
|---|:---:|:---:|:---:|---|
| `persistence` | `local` | `indexeddb` | `indexeddb` | Storage tier: local IndexedDB (`underscore_basic`) vs cloud-synced IndexedDB (`underscore_pro`) |
| `undo` | yes | yes | yes | Undo/redo capture actions |
| `sync` | no | yes | yes | Cloud synchronization via Supabase |
| `collections` | yes | yes | yes | Folder and domain organization |
| `tags` | yes | yes | yes | Tagging and highlight categorization |
| `export` | no | yes | yes | Exporting highlights to external formats |
| `search` | yes | yes | yes | Full-text query and filtering |
| `multiSelector` | no | yes | yes | 3-tier robust re-anchoring (XPath → Position → Fuzzy) |
| `ai` (in-app) | no | no | no | **Retired**: in-app Ask/Chat/Models resolves to `false` across all modes |
| `mcp` (integrations) | no | conditional | yes | MCP external agent access (requires cloud library) |

### 3. Product Entitlement & Commercial Surface

Product capability resolution is unified across web and extension via `resolveProductCaps.ts` and `commercial.ts`:

- **In-App AI Retired**:
  - `ai` flag is always `false`.
  - In-app routes `/ask` and `/insights` redirect to `/home` (`src/core/routing/AppRoutes.tsx`).
  - Provider key setup is disabled (`canConfigureAiProviders()` always denies with `PAID_REQUIRED`).
- **Integrations (MCP)**:
  - MCP is the sole commercial/AI surface.
  - **Free Window**: Controlled by the operational flag `COMMERCIAL_FREE_WINDOW_ENABLED` in `src/shared/entitlement/commercial.ts`. While `true`, signed-in users on Free accounts (`pro`) have MCP access unlocked without billing.
  - **Guest Exclusion**: Guests (`basic`) never have MCP access because external agents require a synced cloud library.
  - **Billing Past Due**: Users with `past_due` billing status are immediately denied MCP access even during the free window.

### 4. Storage & Vault Semantics

- **Guest (`basic`)**:
  - Highlights are saved permanently on-device in `underscore_basic`.
  - There is **no TTL, no expiry timer, and no expiry UI**.
- **Account (`pro` & `pro_xai`)**:
  - Cloud is the multi-device Source of Truth; each client maintains a local IndexedDB cache in `underscore_pro`.
- **Vault in Web**:
  - "Vault" refers to local directory synchronization (Obsidian / Logseq markdown format) using the browser's File System Access API.
  - There is no passphrase-locking or client-side encryption barrier.

### 5. UI & Navigation Contracts

- **Popup Chrome**:
  - Tabs: `Home` (`home`), `Library` (`collections`), `Settings` (`settings`).
  - `ModeHeader` is nested back-only navigation chrome (for sub-levels like domain details), **not** a mode switcher.
  - Mode switching is handled via authentication (signing in transitions to `pro`) or settings/billing flows.

---

## Consequences

### Positive
- Live documentation matches running code in `src/` without contradictions.
- Future agent and human developers do not resurrect retired concepts (24h TTL, in-app Ask, passphrase vault unlock).
- Clear audit trail preserving historical context (ADR-025 marked Superseded, not deleted).

### Neutral
- Legacy string normalization remains intact in `normalize-mode.ts` and migration files to maintain backward compatibility with old client databases.

---

## References

- `src/shared/schemas/mode-state-schemas.ts` — Canonical ModeType schema
- `src/shared/constants/mode-branding.ts` — User-facing display names and taglines
- `src/shared/constants/mode-storage.ts` — Storage keys and default mode
- `src/shared/utils/mode-capabilities.ts` — Feature gate and capability matrix
- `src/shared/entitlement/resolveProductCaps.ts` — Shared product capability resolution
- `src/shared/entitlement/commercial.ts` — Commercial entitlement and free window logic
- `src/core/routing/AppRoutes.tsx` — Product shell routing and redirects
- `src/entrypoints/popup/chrome.ts` — Popup chrome and navigation tabs
- `docs/04-adrs/025-mode-feature-boundaries.md` — Superseded decision
