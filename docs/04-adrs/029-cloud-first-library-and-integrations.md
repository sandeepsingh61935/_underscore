# ADR-029: Cloud-First Library SoT and Integrations (MCP)

**Status**: Accepted  
**Date**: 2026-08-12  
**Decision-makers**: Product + engineering (grilled session + architecture review)  
**Amends**: [ADR-023](./023-mcp-server-architecture.md) (product primacy: cloud over bridge)  
**Builds on**: [ADR-024](./024-mcp-cloud-oauth.md), [ADR-025](./025-mode-feature-boundaries.md), [ADR-027](./027-platform-independent-llm-runtime.md), [ADR-028](./028-grounded-chat-persistence.md)  
**Related**: [AI Integrations IA standard](../superpowers/specs/2026-08-12-ai-integrations-ia-standard.md)

---

## Context

### Product locks (grilling)

| Topic | Decision |
|-------|----------|
| Signed-in Pro / Paid library | **Cloud is multi-device Source of Truth**; each client keeps a **per-device cache** |
| Basic / guest | **Never cloud** — device-local only |
| Pro free vs Paid library | **Same storage and sync**; Paid only unlocks **AI + Integrations (MCP)** |
| Integrations transport | **Cloud MCP only** for the product path |
| Extension required for Integrations? | **No** |
| What agents see | **Synced cloud library only** (not offline / not-yet-synced rows) |
| MCP auth | **OAuth 2.1** for public hosts (e.g. ChatGPT); **Bearer JWT** for power users |
| Bridge | **Soft-deprecate**: hide from Integrations UI, migrate notice; code may linger |
| Models (Ask) | **BYOK + Ollama only**; keys **device-local**; prefs sync without secrets; **full provider catalog** |
| Free Pro UI | Models & Integrations **visible but locked** + upgrade CTA |
| Guest / Basic AI | **No setup** — sign-in / upgrade only |
| Past due | **AI + MCP off immediately**; library stays Pro cloud |
| Vault + Cloud MCP | Return what RLS allows; encrypted fields unusable without unlock — **no agent unlock** in this ADR |
| Capture | Extension (+ future native) → sync → cloud; web mostly read/edit; web library **online-first** for now |
| Ship order | 1) Cloud MCP + OAuth  2) Integrations UI  3) Bridge soft-hide + notice  4) Models polish |

### Codebase friction (architecture review)

1. **Two operational truths for Pro library** — extension IDB (`underscore_pro`) acts as live SoT for popup/bridge; web and Cloud MCP read Supabase. No shared Library access seam.
2. **MCP default and depth favor bridge** — `packages/mcp-server` defaults `--adapter=bridge`; Integrations UI, snippets, and “Connected” state are bridge/token-centric.
3. **Web Integrations cannot complete setup** — control locality is `chrome.storage` + extension WS client; contradicts “extension never required.”
4. **Paid entitlement is split** — web `resolveWebCaps` / billing vs extension `canUseMcp` / `mode === 'pro_xai'`.

ADR-023 codified **dual equal adapters** with bridge owning full library access. That no longer matches product intent. ADR-024 (OAuth + cloud Worker) is the correct Integrations spine but is not yet the **only** product path.

Architecture review artifact (session): `architecture-review-20260812-220116.html` under the OS temp directory.

---

## Decision

### 1. Module map (target)

Three product modules stay separate:

| Module | Job | Inference / agent payer |
|--------|-----|-------------------------|
| **Library access** | Read/write highlight library with explicit SoT rules | N/A |
| **Integrations** | External agents access **synced** library via Cloud MCP | Agent host |
| **Models** | In-app Ask / summarize (BYOK + Ollama) | User keys / local runtime |

```
                    ┌─────────────────────────┐
                    │  Supabase (Pro SoT)     │
                    └───────────┬─────────────┘
           ┌────────────────────┼────────────────────┐
           ▼                    ▼                    ▼
    Library access        Cloud MCP Worker     (sync / hydrate)
    (web, ext cache)      (Integrations)
           │
    per-device cache adapters (IDB / future SQL)
           │
    Basic: local-only adapter — never joins this diagram
```

**Models** attach only to `ILlmRuntime` + device key stores ([ADR-027](./027-platform-independent-llm-runtime.md)). They do **not** require MCP.  
**Integrations** do **not** require API keys or the extension.

---

### 2. Library access — Cloud SoT + cache adapters

**Policy**

| Account / mode | Source of truth | Per-device store | Sync |
|----------------|-----------------|------------------|------|
| Basic / guest | Device only (`underscore_basic` or platform equivalent) | Same | Never |
| Pro / Pro-xAI (signed-in) | **Cloud (Supabase + RLS)** | Cache (`underscore_pro`, future web/native cache) | Yes |
| Offline Pro | Unreachable cloud; **cache + offline queue** are operational | Cache | Flush when online |

**Rules**

1. Name **cloud as authoritative** for signed-in Pro in docs, sync, and MCP `dataCoverage: pro_cloud`.
2. Treat extension IndexedDB as a **cache adapter**, not a second product SoT. Hydration and event sync exist to keep cache coherent with cloud.
3. Do **not** share IndexedDB across web origin and extension origin (browser isolation). Multi-client share is **cloud**, not one IDB file.
4. Basic remains **local-only forever** (no Basic on Cloud MCP — unchanged from ADR-023 non-goal).
5. **Capture** remains platform-specific (extension DOM, later native); writes eventually land in cloud for signed-in Pro via existing sync paths.
6. Web library stays **online-first** in this ADR; a web cache adapter is a later deepening, not a blocker for Integrations.

**Deepening direction (implementation)**

- Prefer one **Library read/write seam** (domain operations: list by domain/section, get highlight, mutate metadata) with:
  - **Cloud adapter** (SoT for Pro),
  - **IDB cache adapter** (extension offline / popup),
  - **In-memory adapter** (tests).
- Today’s `useWebLibrary` and `SupabaseMcpAdapter` are early consumers of the **cloud** side; bridge library tools that only hit IDB are **cache views**, not the Integrations product path.

**Out of scope here:** full rewrite of event-sourcing sync; only the **named SoT policy** and pressure to route new Integrations/web reads through cloud-shaped mappers.

---

### 3. Integrations — Cloud MCP primary; bridge compat only

**Product path (only path in UI)**

```
Agent host  ── MCP (Streamable HTTP) ──►  CF Worker (underscore-mcp)
                                              │
                         OAuth 2.1 or Bearer JWT (Supabase)
                                              │
                                              ▼
                                         Supabase RLS
                                         dataCoverage: pro_cloud
```

**Amends ADR-023**

| ADR-023 (was) | This ADR |
|---------------|----------|
| Dual adapters equally first-class | **Cloud is product-primary**; bridge is **compat** |
| Extension must run for bridge Integrations | Extension **not** required for Integrations |
| Default mental model: stdio + token | Default: **Worker URL + OAuth / JWT** |
| Bridge owns “full library” for agents | Agents get **synced cloud** only |

**Bridge (compat)**

- Soft-deprecate: remove from Integrations hub as primary setup; optional “legacy local bridge” only if needed during migration, then gone from UI.
- In-app notice for existing stdio/token users: move to Cloud MCP; bridge unsupported in UI; may work until hard removal.
- **No new bridge tools or features.**
- Default in docs and snippets: cloud Worker, not `--adapter=bridge`.
- Hard deletion of bridge modules is a **later** epic (not required to accept this ADR).

**Tool surface on Cloud MCP (product)**

- Keep library read + export oriented tools aligned with ADR-024 cloud scope.
- **Do not** add in-app AI / BYOK tools to Cloud MCP in this ADR (Models stay device-local).
- Bridge-only AI/sync/mode tools remain bridge-compat debt; they are not the Integrations roadmap.

**Auth**

- Public hosts: complete [ADR-024](./024-mcp-cloud-oauth.md) OAuth 2.1 path (protected resource metadata, consent on web, DCR as available).
- Power users / scripts: Bearer Supabase access token (existing worker validation).
- Worker enforces Paid + auth for Integrations-capable sessions (see §5 Entitlement).

---

### 4. Integrations Connect module — no extension toggle/token

**Replace** bridge-centric flow (`ConnectToAiFlow` enable + security code + host-specific `--adapter=bridge` snippets + connection state on WS).

**Target UX**

```
Integrations
  Status: Off | Ready | Connected

  [ Connect ]     → OAuth for supported hosts, or copy:
                    • Remote MCP URL
                    • Auth method (OAuth vs paste JWT for power users)

  Host tips       → secondary (Cursor, Claude, Grok, ChatGPT…) cloud config only

  Connected when  → ≥1 OAuth client for user OR recent successful MCP session
                    (never “I copied the snippet”)
```

**Rules**

1. **Web and extension** both complete Connect **without** the other.
2. Web is a first-class Integrations surface (consent, URL, connected apps list already partial under ADR-024).
3. Host catalog (`mcp-ai-apps`) becomes **cloud templates + restart hints**, not bridge token templates.
4. Remove product dependency on `mcp-bridge-ui-state`, bridge enable toggle, and “check connection from extension” for the happy path.
5. Free Pro / guest: **visible locked** / no setup (grilling); Paid only.

---

### 5. Entitlement seam for AI + MCP

**Problem:** Extension gates MCP/AI largely via `mode === 'pro_xai'`; web via billing `isPaidActive`. Past-due and upgrade paths risk diverging.

**Decision**

1. Introduce a single **entitlement view** used by UI, IPC, and Cloud MCP gates:

   | Field | Meaning |
   |-------|---------|
   | `isAuthenticated` | Signed in |
   | `isPaidActive` | Account (Paid) entitlement currently active |
   | `flags.ai` | In-app Models / Ask |
   | `flags.mcp` | Integrations / Cloud MCP |

2. **Mapping (product)**
   - Guest / Basic: not paid; `ai`/`mcp` false.
   - Signed-in free Pro: not paid; `ai`/`mcp` false (UI may show locked).
   - Paid: `ai`/`mcp` true.
   - Past due / lapsed: `ai`/`mcp` false **immediately**; library access remains Pro cloud (signed-in).

3. Extension may still **project** paid → `pro_xai` mode for highlight-mode UX, but **Integrations and Models gates must not invent a second commercial meaning** of mode strings. Prefer reading entitlement flags.

4. Cloud MCP Worker rejects non-paid (or unauthenticated) sessions for Integrations tools.

5. Mode capability matrix ([ADR-025](./025-mode-feature-boundaries.md)) remains for non-billing features (sync, export, collections); this ADR **sharpens** AI/MCP commercial gating onto entitlement.

---

### 6. Models vs Integrations — hard seam (architecture #6)

**Non-negotiable product split** (IA standard + grilling). Different payer, auth, and failure modes. This is not a temporary UX preference.

| | **Models** | **Integrations** |
|--|------------|------------------|
| Job | In-app Ask / summarize | External agents read **synced** library |
| Payer | User BYOK / local Ollama | Agent host’s compute |
| Auth | Device API keys / Ollama base | OAuth 2.1 or Bearer JWT to Cloud MCP |
| Gate | `flags.ai` + Paid | `flags.mcp` + Paid |
| Runtime | [ADR-027](./027-platform-independent-llm-runtime.md) `ILlmRuntime` | Cloud MCP Worker + Supabase |
| Extension required? | No (web stream + local keys) | **No** |
| Data | Prompt context assembled in-app from library/scope | MCP tools over `pro_cloud` |

**Invariants**

1. **Never** put BYOK / Ask / summarize tools on Cloud MCP without a **new** ADR (not this one).
2. Integrations setup **never** asks for provider API keys; Models setup **never** requires an MCP URL or OAuth client.
3. **UX copy:** Integrations empty/help states must not mention Models or keys; Models must not mention MCP URL / Connect agent. Soft cross-links are forbidden.
4. **Settings chrome:** keep dual tab shell under AI — **Models | Integrations** — with **zero shared setup state**. Shared elements allowed: parent tab chrome and Paid lock banner only.
5. **Bridge AI tools** (`ask_scope`, etc.): freeze; no new use; remove from product docs with bridge soft-deprecate; code may linger until bridge hard-delete. Not a power-user product path.
6. Full provider catalog from day one for Models; secrets device-local; `ai_preferences` LWW without secrets (ADR-027).
7. Ship Models **polish** after Integrations spine (P3); runtime already ADR-027.

**Why this is architecture, not only IA copy:** Settings already co-locates both under AI; bridge historically mixed agent library tools with orchestrator AI. Without hard invariants, Cloud-first Integrations work will re-absorb Models or leak key setup into Connect.

---

### 7. Shared cloud highlight row mapper (architecture #5)

**Problem:** Under Cloud SoT, the same Supabase `highlights` row is decoded in multiple places (`useWebLibrary`, Cloud MCP `supabase-adapter` / `cloud-highlight-text`, hydration / `supabase-highlight-row`). Tag sources diverge (junction/label tables vs `metadata.tags`). Drift becomes agent-visible and UI-visible inconsistencies.

**Decision**

1. Deepen one **cloud row → domain Highlight** module.
2. **Location:** `src/shared/…` as the home; web and extension hydration import it. Cloud MCP Worker consumes the same module when the monorepo layout allows; if the Worker package cannot import app `src/shared`, extract a tiny shared package or duplicate **only as a last resort** with a contract test against the shared mapper.
3. **Output:** one **domain Highlight** shape; thin view adapters format for web cards, MCP tool payloads, and export. Do not make the MCP summary DTO the canonical model.
4. **Tags / labels:** prefer junction/label tables when present; fall back to `metadata.tags`; document this single rule in the mapper module.
5. **Vault / ciphertext:** map encrypted fields as **opaque**; never invent plaintext in the mapper; consumers treat body as unusable without an unlock path (no agent unlock — §8 non-goals).
6. **Basic / local IDB shapes** are out of scope for this mapper (Basic never cloud).

**Sequencing**

- **Not** a P0 blocker and **not** required to mark this ADR Accepted.
- Ship **Later** — after Connect UI (after P1) — **or earlier only if** web vs MCP drift causes concrete bugs during Cloud MCP productization.
- Trigger to pull forward: tag/export/crypto mismatch between web library and an MCP host.

**Consumers (target)**

```
Supabase row
     │
     ▼
 shared cloud → domain Highlight mapper
     │
     ├── web library
     ├── Cloud MCP tools
     └── hydrate → IDB cache adapter
```

---

### 8. Implementation sequencing

| Phase | Deliverable |
|-------|-------------|
| **P0** | Cloud MCP productized: Worker health, OAuth metadata, paid gate, docs for remote URL + OAuth/JWT |
| **P1** | Integrations Connect UI (web + extension): cloud-only, Connected truth, host tips secondary |
| **P2** | Bridge soft-hide + migrate notice; stop promoting bridge snippets; freeze bridge AI tools in docs |
| **P3** | Models polish (catalog/UX only; runtime already ADR-027); keep hard seam with Integrations |
| **Later** | Shared cloud row mapper (§7) when drift bites or before more cloud tools; web offline cache adapter; bridge hard-delete; native cache adapters |

Optional concurrent: entitlement flag interface wired through `resolveWebCaps` + extension gate helpers so past_due behavior is identical.

---

### 9. Explicit non-goals

- Sharing one IndexedDB between web and extension
- Platform-hosted (non-BYOK) inference
- Cloud key vault
- Web offline library as a blocker for Integrations
- Agent-side vault unlock / decrypt
- Basic highlights on Cloud MCP
- Hard-delete of bridge code in the same epic as P0–P2
- Porting bridge AI tools onto Cloud MCP (requires a future ADR if ever)
- Unifying Basic local row shapes with the cloud mapper
- Shared Models + Integrations setup wizard or cross-linking CTAs

---

## Consequences

### Positive

- One multi-device story: **Cloud SoT + cache** (aligned with chat persistence thinking in ADR-028).
- Integrations works **without Chrome** for agents.
- Clear ship order; Models/Integrations **hard seam** (§6) stops false leverage.
- Entitlement locality for Paid / past_due.
- Path to one cloud row → domain Highlight mapper (§7) when drift matters.

### Negative

- Agents **never** see offline-only or unsynced highlights (accepted product limit).
- Existing bridge/stdio users must migrate; dual code until hard-delete.
- Cloud MCP quality depends on sync completeness and OAuth project setup.

### Neutral

- Extension remains required for **page capture** and strong offline cache — just not for Integrations.
- ADR-023 dual-adapter **code structure** may remain temporarily; **product primacy** changes now.

---

## Alternatives considered

### A. Keep bridge as primary Integrations path

**Pros**: Full local library including unsynced; current Cursor/Grok snippets.  
**Cons**: Extension always required; web Integrations is incomplete; poor multi-platform story.  
**Rejected**: Contradicts grilling.

### B. Hard-kill bridge immediately

**Pros**: Maximum clarity.  
**Cons**: Breaks current users; large delete surface (`mcp-bridge-handler`, WS, stdio default).  
**Rejected**: Soft-deprecate first.

### C. Merge Models and Integrations setup

**Pros**: One “AI” wizard.  
**Cons**: Wrong payer, wrong auth, wrong failure modes.  
**Rejected**: IA standard + grilling.

### D. Shared physical storage across clients

**Pros**: Naïve sync simplicity.  
**Cons**: Impossible across browser origins and OS sandboxes without a host process.  
**Rejected**: Cloud SoT is the share mechanism.

---

## Implementation notes

### ADR-023 when this ADR is Accepted

Update ADR-023 with a short note:

> Amended by ADR-029: Cloud MCP is the product Integrations path; bridge is soft-deprecated compat.

Do **not** rewrite ADR-023 while this ADR remains Proposed.

### Suggested code pressure (not a full design)

| Area | Direction |
|------|-----------|
| `packages/mcp-server` | Document/deploy Worker as primary; remote URL + OAuth/JWT in examples |
| `mcp-ai-apps.ts` / setup steps | Cloud URL + auth; drop `UNDERSCORE_MCP_TOKEN` from product templates |
| `ConnectToAiFlow` / web `AiPanel` | Connect module per §4 |
| `canUseMcp` / `resolveWebCaps` | Entitlement flags per §5 |
| Bridge services | Freeze features; notice only |

### Shared cloud row mapping

Specified in **§7**. Not required to accept this ADR; phase Later unless drift forces earlier.

### Testing

- Cloud MCP: paid gate, OAuth metadata, RLS isolation, Connected semantics (no optimistic Active).
- Entitlement: free / paid / past_due matrices on web + extension.
- Regression: Basic never appears on cloud tools.
- Bridge: optional smoke until hard-delete; not product E2E.

---

## References

- Grilling session: Cloud-first AI surface (2026-08-12)
- Architecture review (session temp): `architecture-review-20260812-220116.html`
- [ADR-023 MCP Server Architecture](./023-mcp-server-architecture.md)
- [ADR-024 MCP Cloud OAuth](./024-mcp-cloud-oauth.md)
- [ADR-025 Mode Feature Boundaries](./025-mode-feature-boundaries.md)
- [ADR-027 Platform-Independent LLM Runtime](./027-platform-independent-llm-runtime.md)
- [ADR-028 Grounded Chat Persistence](./028-grounded-chat-persistence.md)
- `packages/mcp-server/`, `src/features/settings/mcp/`, `src/web/hooks/useWebLibrary.ts`, `src/shared/utils/mode-capabilities.ts`
