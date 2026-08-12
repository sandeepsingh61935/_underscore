# ADR-028: Grounded Chat Persistence (ChatGPT-like Threads)

**Status**: Accepted  
**Date**: 2026-08-12  
**Decision-makers**: Product + engineering (grilled session)  
**Depends on**: [ADR-027](./027-platform-independent-llm-runtime.md) (stream runtime ships first)  
**Related**: [AI Integrations IA standard](../superpowers/specs/2026-08-12-ai-integrations-ia-standard.md)

---

## Context

Users expect Chat history **like ChatGPT**: named/ongoing threads, multi-turn
dialogue, available after refresh and across devices.

What exists today is **not** that model:

| Mechanism | Behavior |
|-----------|----------|
| React stream state (`chunks`) | Ephemeral; lost on navigation |
| `llm.artifacts` (`scope_query`) | Device-local (`chrome.storage.local` / `localStorage`); Q&A **pairs** capped at 10 per scope; not a thread list |
| `ai_preferences` | Models/default/enablement only—**no messages** |
| Web Ask | No message persistence (stream stub until ADR-027) |

`LlmArtifact` is a **document** model (summary / synthesis / one-shot Q&A), not
a conversation graph. Each Ask is effectively a fresh grounded completion;
history is not first-class multi-turn context to the model.

ADR-027 makes streaming platform-independent but intentionally ships **single
in-flight** answers only. This ADR defines durable, grounded chat after that
runtime is green.

---

## Decision

### 1. Sequencing

- **Implement ADR-027 first** (runtime + web stream).  
- Then implement this persistence epic.  
- Two ADRs (not one mega-doc); cross-linked.

### 2. Product model: grounded threads

- Many **threads** per user.  
- Every thread **must** have a grounding scope:

  | Scope | Meaning |
  |-------|---------|
  | `library` | Whole library (excerpt budget via existing prep pipelines) |
  | `domain` | One domain |
  | `section` | One domain + section path/key |

- Free-form ungrounded ChatGPT blank chat is **out of scope** (product is
  highlight-grounded Ask).  
- Unlimited threads per scope (not a singleton transcript per domain).

### 3. Source of truth and cache

| Layer | Role |
|-------|------|
| **Supabase** | Source of truth for signed-in users with Chat unlocked |
| **IndexedDB** | Local cache for snappy list/open (web + extension where available) |

No durable guest cloud history. Local-only free teaser storage is out of v1.

### 4. Domain types (logical)

**Thread**

- `id` (server UUID)  
- `user_id`  
- `title` (auto: first user message truncated)  
- `scope` (discriminated: library | domain | section)  
- `created_at` / `updated_at`  
- optional: last model/provider hint for UI  

**Message**

- `id` (server UUID)  
- `thread_id`  
- `role`: `user` | `assistant` (system prompts are **not** stored as user-visible
  rows; they are assembled at request time)  
- `content`  
- `status`: e.g. `completed` | `streaming` | `failed` | `cancelled`  
- `provider` / model metadata optional on assistant  
- `created_at` / `updated_at`  

### 5. Sync identity

- **Messages**: append-only with server UUIDs; clients do not replace whole
  transcripts as a single LWW blob.  
- **Thread metadata**: update in place (title, `updated_at`); hard **delete**
  thread removes messages (cascade).  
- Conflict model: last write for metadata; messages are immutable after
  finalize except status/content finalize of the in-flight assistant row.

### 6. Write path (aligned with streaming)

1. User sends → persist **user** message.  
2. Create **assistant stub** (`streaming`) when stream starts.  
3. On `DONE` → set content + `completed`.  
4. On error/abort → `failed` / `cancelled` (policy: keep partial text if any).  

No token-throttle cloud upserts in v1 (mid-stream refresh recovery later).

### 7. Context assembly (multi-turn)

Each send builds `LLMRequest` as:

- **System / grounding**: rebuilt from **live** highlights/excerpts for the
  thread scope (not a frozen snapshot from thread create).  
- **Messages**: last **K = 10** user/assistant **pairs** (20 messages), plus
  the new user turn.  

Follow-up (not v1): if library signature/count changed, inject a short
"library changed" note and force excerpt rebuild awareness.

### 8. Relationship to `llm.artifacts`

| Kind | Fate |
|------|------|
| `section_summary` / `domain_synthesis` | Remain artifacts (exportable documents) |
| `scope_query` | **Deprecated for new Ask**; new Q&A → chat messages |

**No automatic import** of old `scope_query` rows in v1. Optional user-driven
import may come later. Do not delete existing local artifacts on ship.

### 9. UX minimum (v1)

- Thread list ordered by `updated_at`  
- Actions: **new thread**, **open**, **delete**  
- Auto-title from first user message  
- Out of v1: rename, pin, search, LLM-generated titles, share links,
  branching, edit-regenerate message tree  

### 10. Entitlement and quotas

**Who may write**

- Same gate as Chat: signed-in + paid / `ai` capability active.  
- Past_due **read-only history** is a polish follow-up, not v1 required.

**Quotas (v1 defaults)**

| Control | Limit |
|---------|-------|
| Threads / user | 200 |
| Messages / thread | 200 |
| Content chars / message | 32_000 |
| Delete | **Hard delete** (no 30-day soft purge in v1) |

### 11. Security

- RLS: `user_id = auth.uid()` on all chat tables; FORCE RLS.  
- Repository pattern only—no raw Supabase client in UI components.  
- Never store API keys on thread/message rows.  
- Chat content is private user data (highlights + model output).

### 12. UI surfaces

- **Web Ask**: thread list + message pane + composer (grounding scope on thread).  
- **Extension**: adopt same repository; layout density constrained by popup—may
  be a simplified thread list in a follow-up PR, but **one data model**.

---

## Consequences

### Positive

- Real multi-device Chat history; product matches user mental model.  
- Multi-turn quality improves without unbounded context (window K).  
- Live grounding keeps answers honest as the library changes.  
- Clear split: artifacts = documents; messages = dialogue.

### Negative

- Storage and RLS surface area; backup/export implications.  
- IndexedDB + cloud dual-write complexity (sync bugs).  
- Rebuilding excerpts every turn costs latency/tokens vs frozen snapshots.  
- Extension popup UX for thread list is cramped.

### Neutral

- Epic 1 web Ask may ship briefly without history, then gain threads.  
- Old `scope_query` artifacts may linger until UI stops reading them.

---

## Alternatives Considered

### UI-only history (no model multi-turn)

**Rejected** as the long-term product. Not ChatGPT-like; closer to today's
artifact log.

### Device-only persistence

**Rejected** as SoT for "like ChatGPT." No cross-device.

### LWW whole-thread JSON blob

**Rejected.** Hostile to concurrent tabs and partial updates.

### Full event-sourced chat log (mirror highlight events)

**Deferred.** Correct but heavy for v1; append-only messages suffice.

### One thread per scope (singleton)

**Rejected.** Blocks "New chat" muscle memory and topic separation.

### Free-form ungrounded threads

**Rejected** for v1 product boundary (highlight-grounded Ask).

### Import all `scope_query` on day one

**Deferred.** Avoid migration risk in first persistence ship.

---

## Implementation notes

Suggested order after ADR-027 is green:

1. Supabase migration: `chat_threads`, `chat_messages` + RLS + indexes
   (`user_id`, `updated_at`, `thread_id`, `created_at`).  
2. Shared types + repository interfaces; Supabase implementation.  
3. IndexedDB cache adapter + hydrate on Ask open.  
4. Context assembler (window K + live excerpts) shared by web/extension.  
5. Wire stream completion to message finalize (ADR-027 events).  
6. Web thread UI; extension UI as capacity allows.  
7. Stop writing new `scope_query` artifacts from Ask paths.

Schema sketch (illustrative, not normative column names):

```sql
-- chat_threads: id, user_id, title, scope_kind, domain, section_key,
--               created_at, updated_at
-- chat_messages: id, thread_id, user_id, role, content, status,
--                provider, model, created_at, updated_at
```

Enforce quotas in repository/edge, not only UI.

---

## Explicit non-goals (v1)

- Key vault  
- Artifact → thread auto-import  
- Soft-delete retention window  
- Realtime collaborative editing  
- Share/public links  
- Message branching / edit-regenerate trees  
- Server-side highlight fetch for prompt build (client still builds
  `LLMRequest` per ADR-027)  
- Free-tier cloud or local teaser history  

---

## References

- [ADR-027 Platform-Independent LLM Runtime](./027-platform-independent-llm-runtime.md)  
- `src/shared/schemas/llm-artifact-schema.ts`  
- `src/shared/llm/llm-artifact-store.ts`  
- `src/features/ai/hooks/usePersistLlmArtifactOnDone.ts`  
- `src/features/ai/components/ScopeAskPanel.tsx`  
- `src/web/pages/AskPage.tsx`  
- `supabase/migrations/20260812120000_ai_preferences.sql`  

---

## Revision History

| Date | Author | Changes |
| ---- | ------ | ------- |
| 2026-08-12 | Engineering | Accepted from grilled architecture session |
