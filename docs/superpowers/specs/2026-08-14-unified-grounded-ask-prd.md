# PRD: Unified Grounded Ask (One Turn Pipeline)

**Status:** Draft — local only (not published to GitHub)  
**Date:** 2026-08-14  
**Depends on:** ADR-027 (platform-independent LLM runtime), ADR-028 (grounded chat persistence)  
**Product boundary:** Highlight-grounded Ask only

---

## Problem Statement

Paid users expect Ask to behave like a real, multi-turn chat over their highlights: send a question, get a grounded answer, follow up, and find that conversation again later.

Today that experience is split:

- On the **web**, Ask already uses durable grounded threads (scope, multi-turn context, begin/stream/finalize).
- In the **extension**, Ask still behaves like a disposable one-shot: answers stream, but history is local UI state only, follow-ups are not sent as multi-turn context to the model, and closing the popup loses the thread.

Streaming providers work across clients, but the product still feels like boilerplate or “broken AI chat” because users get two different Ask products depending on surface. Grounding quality can also diverge: the extension may enrich with page context, while the web path always uses quote-only fallback, without a single prep policy.

Users do not care about dual pipelines. They care that Ask is trustworthy, resumable, and the same product everywhere they open it.

---

## Solution

Unify Ask on **one grounded turn pipeline** and **one history model**, already defined by ADR-027 and ADR-028:

1. Every Ask turn (web and extension) goes through the same orchestrator: prepare excerpts → begin turn → assemble multi-turn request → stream via the platform LLM runtime → finalize message status.
2. Threads and messages use the same chat domain model (scoped threads, user/assistant messages, statuses) with cloud source of truth and local cache where available.
3. The **extension is a thin client**: scope selection, active thread, model chip, send/abort, and a path to continue longer history on the web. The **web** remains the full Ask shell (thread list, grounding tree, dense transcript).
4. Excerpt preparation always enters through one prepare path (page-context adapter on extension; no-op/miss → quote-only on web v1). Document that web v1 is library-quote grounded.
5. Optionally, after unification, collapse the one-shot request builder into empty-history assembly for hygiene (MCP keeps a named one-shot entry that delegates).

No assistant-ui, no AI SDK rewrite, no coding-agent feature set. Product remains highlight-grounded Ask.

---

## User Stories

1. As a paid signed-in user, I want to ask a question over my current page highlights in the extension, so that I get an answer without leaving the page.
2. As a paid signed-in user, I want to ask over a whole domain’s highlights, so that I can synthesize reading across many pages on that site.
3. As a paid signed-in user, I want to ask over my full library scope, so that I can query everything I have marked.
4. As a paid signed-in user on the web, I want the same grounded Ask product as the extension’s model of truth, so that I am not learning two systems.
5. As a paid user, I want multi-turn follow-ups in a thread, so that I can refine questions without repeating context.
6. As a paid user, I want prior completed turns to be included in the model context (within a safe window), so that follow-ups are coherent.
7. As a paid user, I want live grounding rebuilt from current highlights each send, so that answers reflect my library as it is now—not a stale snapshot.
8. As a paid user, I want each thread bound to a grounding scope, so that conversations stay about a clear slice of my marks.
9. As a paid user, I want to create a new thread for a new topic under the same scope, so that I am not forced into one transcript per domain.
10. As a paid user, I want my threads to persist after refresh and across devices (when signed in), so that Ask feels like real chat history.
11. As a paid user on the web, I want a thread list ordered by recent activity, so that I can resume work quickly.
12. As a paid user on the web, I want to open a thread and see its messages, so that I can reread the dialogue.
13. As a paid user on the web, I want to delete a thread, so that I can remove unwanted history.
14. As a paid user, I want threads auto-titled from the first user message, so that the list is scannable without manual naming.
15. As a paid user in the extension, I want to keep chatting in an active thread without a full sidebar, so that the popup stays usable.
16. As a paid user in the extension, I want a clear way to continue the conversation on the web, so that I can browse full history and grounding UI when needed.
17. As a paid user, I want answers restricted to my highlights (product policy), so that I can trust Ask not to invent from the open web.
18. As a paid user, I want to see that an answer is grounded (scope and/or excerpt signal), so that I know what the model was given.
19. As a paid user with page context available, I want richer excerpts when the page cache can supply them, so that answers use surrounding text when possible.
20. As a paid user on web v1, I accept quote-only grounding when page context is unavailable, so that Ask still works from stored highlights.
21. As a paid user, I want empty-scope states to be explicit, so that I am not confused when there is nothing to ask over.
22. As a guest user, I want a clear sign-in lock on Ask, so that I know why chat is unavailable.
23. As a free-tier user, I want a clear upgrade path for Ask, so that commercial gating is understandable.
24. As a past-due user, I want a clear payment update path, so that I can restore Ask.
25. As a paid user without a configured model, I want a clear “connect model / providers” path, so that I can finish setup.
26. As a paid user, I want to pick provider and model for Ask, so that I control cost, quality, and vendor.
27. As a paid user, I want BYOK keys to stay device-local, so that secrets are not uploaded to our database.
28. As a paid user, I want streaming answers with a stop/abort control, so that I can cancel a bad or long run.
29. As a paid user, I want failed turns to surface an error and leave a recoverable transcript state, so that I know what failed.
30. As a paid user, I want cancelled mid-stream assistants to not poison future multi-turn context, so that the next question still works.
31. As a paid user who crashed mid-stream, I want stuck streaming rows recovered on reload, so that history does not stay stuck forever.
32. As a paid user, I want send disabled while a turn is in flight (single in-flight), so that overlapping streams do not corrupt state.
33. As a paid user, I want send disabled when there are no usable highlights in scope, so that empty asks do not waste a model call.
34. As a paid user, I want send disabled when no provider/model is ready, so that failures are prevented up front.
35. As a paid user changing scope in the extension, I want scope mapped into the canonical chat scope model (page → section), so that threads round-trip cleanly to the web.
36. As a paid user opening a thread on the web, I want scope locked to the thread’s grounding, so that mid-thread scope drift does not confuse answers.
37. As a paid user, I want composer suggestions (e.g. summarize / themes) where product already offers them, so that first success is faster.
38. As a power user, I want MCP one-shot scope ask to keep working for external agents, so that “export context to other AI apps” is not broken by the unification.
39. As a developer agent implementing this, I want one turn orchestrator for both surfaces, so that bugs are fixed once.
40. As a developer agent, I want a shared chat service factory, so that web and extension do not each invent repository wiring.
41. As a developer agent, I want extension Ask to stop maintaining a parallel ephemeral transcript type, so that history models cannot diverge again.
42. As a developer agent, I want tests at the turn and chat-service seams, so that multi-client behavior is proven without real providers.
43. As a product owner, I want explicit non-goals (no coding agent, no assistant-ui foundation), so that scope does not balloon into IDE chat parity.
44. As a privacy-conscious user, I want clarity that prompts and keys on web cloud providers hop through our pass-through only in memory, so that trust matches ADR-027 policy.
45. As a paid user hitting quotas, I want clear errors when thread or message limits are reached, so that I understand why create/send failed.
46. As a paid user, I want only completed pairs in model history, so that failed or empty assistants do not waste context.
47. As a paid user, I want stored user messages to keep plain questions (not full excerpt dumps) in history, so that multi-turn context stays compact while the latest turn is re-grounded.
48. As a paid user on extension, I want the same entitlement gate as web Ask, so that free/guest paths cannot silently open a second ephemeral product.
49. As a paid user, I want model/provider used on a turn recorded where the product already surfaces that metadata, so that I can see how an answer was produced.
50. As a paid user returning next day, I want to resume a thread and ask again with fresh excerpts, so that long-running research stays useful as my library grows.

---

## Implementation Decisions

### Architecture (locked)

1. **Keep ADR-027 and ADR-028.** Do not reopen free-form ungrounded chat, LWW whole-thread blobs, or extension-only forever streaming.
2. **One turn pipeline.** All product Ask sends (web + extension) use the grounded turn orchestrator (begin → assemble → stream via LLM runtime → finalize). UI must not re-implement finalize state machines in view effects.
3. **One history model.** Domain types remain: scoped `ChatThread`, `ChatMessage` with roles and statuses (`completed` | `streaming` | `failed` | `cancelled`). No long-term parallel ephemeral turn type in the extension.
4. **LLM runtime stays the stream port.** Extension uses Port/service worker adapter; web uses browser runtime (Ollama direct / cloud proxy per ADR-027). Feature code depends on the runtime interface, not chrome APIs.
5. **Chat service + repository stack** remains the write path: create thread if needed, append user message, append assistant stub streaming, finalize on done/error/abort. Supabase source of truth; IndexedDB (or memory fallback) cache.
6. **Shared chat service factory.** Construction of repository + cache + chat service moves out of web-only session glue so extension can inject the same stack with its auth client.
7. **Session UI may differ by surface; data model may not.** Web: full thread list + grounding tree + transcript + composer. Extension: thin client — scope chips, active thread, model chip, transcript, composer, deep-link/CTA to web for full history browsing.
8. **Scope vocabulary.** Canonical scopes remain `library | domain | section`. Extension “page” chip maps to `section` (domain + section key from tab). Library/domain chips map accordingly.
9. **Excerpt prep discipline (C3).** Every Ask turn obtains excerpts through the shared prepare path. Extension supplies a page-context fetch adapter; web v1 supplies a no-op/miss adapter that yields quote-only fallback. Do not call fallback builders directly from page glue.
10. **Web v1 grounding bar.** Quote-only on web is acceptable and should be documentable in UI or help copy if needed; matching extension page-cache richness is not a v1 blocker.
11. **Request assembly.** Multi-turn assembly remains the single grounded chat request builder. Empty history is the one-shot shape. Folding the legacy one-shot builder (C4) is hygiene after unification: prefer a named thin wrapper for MCP that delegates to empty-history assembly—do not block the epic on C4.
12. **MCP.** External MCP scope-ask continues to work; it is not required to use React session hooks. Optional follow-up: named one-shot wrapper only.
13. **Entitlements.** Same commercial gate as today for write path: signed-in + paid/ai capability; guest/free/past_due/no_model locks retained with clear CTAs.
14. **Quotas.** Existing ADR-028 v1 quotas (threads/user, messages/thread, content length, pair window K=10) remain enforced in the chat service path.
15. **Artifacts.** `scope_query` artifacts remain deprecated for new Ask; no automatic import of old artifact rows in this epic.
16. **Non-adoption.** Do not introduce assistant-ui as foundation; do not rewrite providers onto AI SDK; do not build Zed-like coding agent, worktrees, parallel agents, edit prediction, or terminal threads.
17. **Zed inspiration (product only, not this epic’s implementation core).** Provider hub clarity, context/thread hygiene patterns may inform later UX; this PRD’s ship bar is unified grounded turn + thin extension client + prepare discipline.
18. **Phased delivery inside the epic:**
    - Phase A: shared chat service factory + session wiring usable by both clients.
    - Phase B: extension Ask on grounded turn orchestrator + chat service; remove ephemeral turn finalize machine; thin-client UX + continue-on-web.
    - Phase C: enforce prepare path on web and extension for all Ask sends.
    - Phase D (optional): one-shot builder thin-wrapper / delete dead Ask one-shot path; scope mapping polish; dead code removal.
19. **Schema.** No new chat schema required if ADR-028 tables already exist; use existing thread/message model and RLS. If migrations are incomplete in an environment, complete them as prerequisite—not a redesign.
20. **Single in-flight stream per user/session policy** remains aligned with ADR-027/028 (no concurrent multi-stream product behavior in v1).

### Module responsibilities (logical)

| Module | Owns |
|--------|------|
| Chat domain / service / repositories | Threads, messages, begin/finalize, quotas, recovery |
| Context assembly | Multi-turn window + live excerpts on latest user turn |
| Grounded turn orchestrator | One-turn lifecycle wiring service + runtime |
| LLM runtime adapters | Platform stream transport only |
| Excerpt prepare | Excerpts + notes; platform fetch adapters |
| Web Ask shell | Full session UI + library scope selection |
| Extension Ask shell | Thin session UI + tab/library scope chips |
| Model selection / keys | Existing BYOK + prefs (device keys, account prefs LWW) |

---

## Testing Decisions

### What makes a good test

- Assert **external behavior** at the highest stable seam: outcomes, statuses, message shapes, and user-visible gates—not private React state wiring or provider HTTP details.
- Prefer pure/domain and orchestrator tests with **fake repository + mock LLM runtime** over E2E provider calls.
- UI tests: locks, disabled send conditions, abort affordance, thin-client CTA—**mock** session/turn hooks rather than re-testing stream protocol.

### Primary seams (confirmed)

1. **Grounded turn orchestrator** — begin → stream events → finalize; abort/fail/cancel; multi-turn history passed into assembly.
2. **Chat service + chat repository port** — create/list/delete threads; begin/finalize; stuck streaming recovery; quota errors (in-memory/fake repo).
3. **Context assembly** — empty history one-shot shape; K-pair window; excerpts only on latest user; skip incomplete pairs/empty assistants; reject empty question.
4. **Excerpt prepare** — fetch success with excerpts; fetch fail/miss → fallback quotes; notes populated appropriately.
5. **LLM runtime mock** — emit CHUNK/DONE/ERROR to drive orchestrator outcomes (no real network).
6. **Ask UI (web + extension)** — entitlement locks; empty scope; no model; busy/abort; extension continue-on-web affordance.

### Modules under test

- Chat service, context assembly, grounded turn orchestrator (extend existing unit coverage).
- Excerpt prepare (unit with stub fetch).
- Shared chat service factory (construction + smoke with memory cache/repo).
- Web Ask page and extension Ask view (behavior with mocked session/turn).
- Do not prioritize: raw Supabase client, chrome Port framing, Cloudflare proxy internals (covered elsewhere / ADR-027).

### Prior art in this codebase

- Unit tests already exist for chat service, context assembly, grounded turn, cached/supabase repository mappers, stream relay, and LLM stream hook with mock runtime.
- Ask page / Ask view tests already mock hooks and assert locks and shell behavior—extend that style rather than inventing a new test stack.
- Prefer Vitest unit/integration at domain seams; Playwright only if a critical happy path is not coverable at seams (not required for v1 of this epic).

### Acceptance-style checks (implementation-facing)

- Extension send creates/persists the same message statuses as web for a successful turn.
- Second message in a thread includes prior completed pair in the assembled request (assert via mock runtime capturing `LLMRequest`).
- Scope change mapping: page chip produces section-scoped thread readable on web.
- Web Ask does not bypass excerpt prepare.
- Dead ephemeral transcript path removed or unreachable for paid Ask.

---

## Out of Scope

- Free-form ungrounded ChatGPT-style blank chat.
- assistant-ui (or similar) as chat UI foundation.
- Vercel AI SDK / provider stack rewrite.
- Coding agent features: repo tools, worktrees, parallel agents, checkpoints, edit prediction, terminal threads, ACP external agent zoo.
- Full visual parity of web Ask chrome inside the extension popup (thread sidebar + full grounding tree).
- Message edit / regenerate / branching trees (explicitly out of ADR-028 v1 UX minimum).
- Automatic import of legacy `scope_query` artifacts into threads.
- LLM-generated thread titles, pin/search/share links.
- Hosted (first-party billed) models as a new access path (future commercial work).
- Matching web excerpt richness to extension page-cache in v1.
- MCP redesign beyond keeping scope-ask working; full MCP tool-calling agent in Ask.
- Mobile native clients (runtime adapter path remains future; not this epic).
- Changing RLS model or moving API keys into cloud storage.
- Design-system restyle of Ask unrelated to unification.
- Zed settings IA overhaul (favorites cycle, etc.) beyond what already exists—unless trivial while touching model chip.

---

## Further Notes

### Why this epic exists

Product and architecture consultation agreed: ADR-027 already unified **streaming**; the remaining split-brain is **turn orchestration + history + excerpt call-site policy**. Framework shopping (assistant-ui, AI SDK, coding-agent parity) does not fix that.

### Priority inside the epic

| Item | Importance |
|------|------------|
| One turn pipeline + chat service on extension (thin client) | Critical |
| Shared chat service factory | Critical (enables above) |
| Excerpt prepare discipline on both surfaces | High (trust/quality); ship with migrate |
| One-shot builder fold / MCP wrapper | Low (hygiene after) |
| Scope chip → canonical section mapping polish | Medium; needed for clean cross-surface threads |

### Product copy notes

- Prefer language: **Ask**, **grounding**, **scope**, **thread**, **highlights/excerpts**—not “agent,” “tool call,” or “workspace.”
- If web is quote-only, avoid promising “full page context” on web.

### Success metrics (qualitative ship bar)

1. A paid user can multi-turn Ask in the extension and see the same thread on the web after refresh.
2. Follow-up questions use prior completed turns in the model request (within K).
3. No second ephemeral transcript path remains for paid Ask.
4. Empty scope, lock states, and provider-missing states remain clear.
5. MCP one-shot scope ask still functions.

### References

- ADR-027: Platform-independent LLM runtime and web pass-through  
- ADR-028: Grounded chat persistence  
- Architecture review (local): dual-path Ask consultation 2026-08-14  
- Product decisions: grounded Ask only; extension thin-client; no assistant-ui; C3 discipline; C4 optional hygiene  

---

*This PRD was synthesized from product brainstorming, architecture consultation, and locked C3/C4 decisions. Not published to the GitHub issue tracker per author request.*
