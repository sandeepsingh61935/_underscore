# Spec: AI & Integrations IA standard (web-first)

**Date:** 2026-08-12  
**Status:** Locked (grilled)  
**Source plan:** session plan AI & Integrations configuration UX  
**Supersedes naming in:** `2026-07-14-connect-to-ai-settings-simplify-design.md` (product boundary kept; labels updated)

---

## Product boundary (unchanged)

| Surface | Job | Inference payer |
|---------|-----|-----------------|
| **Models & providers** | In-app Ask / summarize (BYOK + Ollama) | User keys |
| **Integrations** | External agents read highlight library (MCP) | User’s agent host |

Do **not** merge into one picker.

---

## Naming

| Old | New | Sub |
|-----|-----|-----|
| Connect to AI | **Integrations** | Let agents use your library |
| Configure AI providers | **Models & providers** | Keys for Ask |
| Providers / MCP (web seg) | **Models** \| **Integrations** | — |

Settings chrome: one **AI** tab, sub-seg **Models | Integrations**.

---

## Industry layers

- **Layer A (Settings):** configure providers, defaults, integrations  
- **Layer B (Ask composer, later):** switch among configured models; Manage → Settings  

---

## Multi-client Models

- Each client (web, extension, Android, Apple) has **its own setup UI**  
- **Preferences** (default model, enablement): account-sync later, last-write-wins  
- **Secrets:** device/local by default (industry); optional vault later  
- Near-term: web local store + control-plane UI; preference sync API follow-up  
- Models require **sign-in**

---

## Web Settings AI (Phase 1)

### Models

- Provider list = `IN_APP_LLM_PROVIDER_ORDER` + `PROVIDER_META`  
- Connect → key (or Ollama base) → Save & check → ready status  
- Keys: web-local store for now; lead copy honest about device storage  
- Paid: visible-but-locked when `!caps.flags.ai`  
- No fake Connect that no-ops  

### Integrations

- Full host catalog from `MCP_AI_APPS`  
- Per-host guided steps + copyable snippet  
- Security code when available; else honest extension reveal  
- No optimistic Active without handshake data  
- Paid / `mcp` gate: visible-but-locked  

---

## Out of scope (post Phase 1–4) — historical

Phase 1–4 shipped settings + prefs + Ask chip **without** web stream. That cut is **superseded** for streaming and chat history:

| Topic | Status |
|-------|--------|
| Web stream / multi-client LLM runtime | **In scope** — [ADR-027](../../04-adrs/027-platform-independent-llm-runtime.md) |
| Grounded chat persistence (threads) | **In scope (after runtime)** — [ADR-028](../../04-adrs/028-grounded-chat-persistence.md) |
| Cloud key vault | Still out (device-local secrets) |
| Cloud MCP Active list | Still out |

### Phase 5 — Platform-independent Ask stream (ADR-027)

- `ILlmRuntime`; providers in shared modules; extension Port adapter preserved  
- Web: Ollama direct; cloud via Pages Function pass-through (JWT + paid + allowlist)  
- Client builds `LLMRequest`; SSE `chunk` / `done` / `error`  
- Chip “needs key” when prefs name a provider without local credentials  
- Epic 1 UX: single in-flight answer (no history yet)

### Phase 6 — Grounded chat persistence (ADR-028)

- Many threads, each with required grounding scope (library | domain | section)  
- Supabase SoT + IndexedDB cache; multi-turn window K=10 + live excerpts  
- New Ask Q&A → messages; artifacts remain for summaries only  
- Implement only after Phase 5 web stream is green  

## Phase 2 — Extension rename (done)

- Settings AI rows: **Models & providers** / **Integrations** (same subs as web)  
- Hub titles, Ask empty CTA, factory error copy  
- Internal `ConnectToAi*` identifiers kept for import stability  

## Phase 3 — Preference sync API (done)

- Table `public.ai_preferences` (RLS own-row CRUD): `default_provider`, `models` jsonb, `enabled_providers` jsonb, `updated_at`  
- Shared LWW: higher `updatedAtMs` wins (`src/shared/llm/ai-preferences.ts` + client)  
- **Secrets never sync** (keys / Ollama base stay device-local)  
- Web: pull on AI Settings open; push after provider save/clear (single local clock from reduce; push does not re-touch)  
- Extension: `IPC_AI_SYNC_PREFS` on Models hub open; ordered push after `IPC_AI_SET_API_KEY` (including clear)  
- Enablement: **empty = all**; never invent allow-list from currently configured providers  
- Remote win: whole-doc replace for models/default/enablement; secrets preserved  
- Structure: `DeviceAiPrefsStore` + `reconcileAiPreferences` (shared); web/extension are thin adapters  

## Phase 4 — Ask model chip (done)

- Layer B on Ask composer (web `AskPage` + extension `AskView`)
- Chip lists **configured** models only (`listAskModelOptions`); empty enablement = all
- Select updates default/active + prefs push (LWW, no secrets)
- Extension: `IPC_AI_SET_ACTIVE_PROVIDER` (rejects unconfigured)
- Manage / Add provider → Settings **Models & providers**
- Shared UI: `AskModelChip`; pure helpers in `src/shared/llm/ask-model-options.ts`

---

## Success criteria

- User can say: Models = Ask keys; Integrations = agents read library  
- Web AI tab is not a stub  
- Tests cover sub-seg labels, lock banner, provider setup path, integrations catalog  
- **Phase 5:** Paid web user with local cloud key can stream Ask without the extension  
- **Phase 6:** Same user sees grounded threads after refresh / on another signed-in client (cache + cloud)  


---

## Code-review remediations (2026-08-12)

- Single `AiView` discriminant for tab + drill-in  
- No fake bridge On/Off on web — status + extension ownership only  
- MCP snippets via shared `CodeSnippetBlock`; steps via `mcpSetupStepLabels`  
- `webLlmKeys`: pure `reduce` + `checkedAt` required for “configured”; Ask reads default label  
- Plaintext localStorage keys = known debt until vault ADR  
