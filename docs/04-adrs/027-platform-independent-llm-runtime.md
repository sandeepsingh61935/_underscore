# ADR-027: Platform-Independent LLM Runtime and Web Pass-Through

**Status**: Accepted  
**Date**: 2026-08-12  
**Decision-makers**: Product + engineering (grilled session)  
**Related**: [ADR-028](./028-grounded-chat-persistence.md), [AI Integrations IA standard](../superpowers/specs/2026-08-12-ai-integrations-ia-standard.md)

---

## Context

In-app Ask (BYOK + Ollama) works in the **Chrome extension** via:

```
UI → useLLMStream → chrome.runtime.connect('llm-stream')
  → AiOrchestrator → ILLMService.streamChat → CHUNK/DONE/ERROR
```

Providers live under `src/background/services/llm/`. Feature hooks and
`sendLlmChat` assume `chrome.runtime`. Extension SW uses `host_permissions`
so provider HTTP is not subject to page CORS.

The **web app** already has:

- Paid/`ai` gate, Ask UI shell, model chip, device keys (`webLlmKeys`)
- Account-synced prefs (`ai_preferences` LWW; secrets never sync)
- Browser health checks for providers

But Ask submit is a **hard stub**: *"Chat streaming is not available in the
web app yet…"* (IA standard Phase 1–4 deferred web stream to extension IPC only).

Product requirement: selected providers must work on **any client** (web,
extension, future Android/Apple) with the same domain model—not a Chrome-only
Chat product. Secrets stay device-local (no vault in this ADR).

---

## Decision

### 1. Runtime port (`ILlmRuntime`)

Introduce a platform-agnostic stream contract in shared code. Feature hooks
(`useLLMStream`, scope ask, etc.) **must not** import `chrome` directly.

Logical stream events (same semantics as today's Port protocol):

| Event | Meaning |
|-------|---------|
| `CHUNK` | Incremental `delta` text |
| `DONE` | Final `LLMResult` |
| `ERROR` | `{ message }` |

Adapters:

| Platform | Adapter |
|----------|---------|
| Extension | Existing Port → SW (`AiOrchestrator` + `handleStreamChat`) |
| Web | Policy matrix below (direct Ollama / cloud proxy) |
| Native (later) | New adapter only; no second orchestrator fork |

### 2. Shared providers

Move pure HTTP/SSE provider implementations (`OpenAI`, `Anthropic`, `Gemini`,
`Ollama`, `OpenRouter`, `xAI`) to **`src/shared/llm/providers/`** (or equivalent).

- Background SW and web/edge construct `ILLMService` from shared modules.
- Key resolution stays platform-specific (`LLMKeyStore` vs `webLlmKeys`).
- Extension keeps Port/SW for stream lifetime, host permissions, and abort.

### 3. Secrets and prefs (unchanged product policy)

| Data | Sync |
|------|------|
| API keys, Ollama base | **Device-local only** |
| Default provider, model ids, enablement | **Account LWW** (`ai_preferences`) |

Missing key on this device while prefs name a provider: chip shows **needs
key**; **Send disabled** (no silent fallback provider; no "open extension"
as primary CTA).

### 4. Web network policy matrix

| Provider class | Path |
|----------------|------|
| **Ollama** | Browser **direct** to configured base (typically localhost) |
| **Cloud** (OpenAI, Anthropic, Gemini, xAI, OpenRouter) | **Cloudflare Pages Function** pass-through on `underscore-web` |

No runtime "try direct then proxy" fallback (ambiguous failures). Static
policy only.

### 5. Pass-through edge (dumb BYOK gateway)

- **Host**: Cloudflare Pages Functions (same origin as the web SPA).
- **Client** builds full `LLMRequest` (prompts, grounding, excerpts) using
  existing shared builders—edge does **not** load highlights or own Ask product
  semantics.
- **Edge** selects allowlisted provider, uses shared `ILLMService`, streams
  normalized events to the browser.
- **Keys**: sent only for the hop (e.g. client → Function → provider); **never**
  written to DB/KV/logs.
- **Cloud health checks** on web use the **same proxy** so "Save & check"
  implies stream path readiness. Ollama health stays direct.

#### Wire format

HTTP **SSE** (`text/event-stream`), event names aligned with app protocol:

- `chunk` — JSON payload with delta  
- `done` — JSON `LLMResult`  
- `error` — JSON `{ message }`  

Short health checks may use plain JSON POST responses.

#### Security floor (required at ship)

- Valid Supabase JWT  
- Paid / `ai` entitlement enforced **server-side**  
- Never log `Authorization`, API keys, or full prompts  
- Allowlist provider base URLs only (**no open SSRF**; no arbitrary user
  `apiBase` for cloud on the proxy)  
- Rate limit: **30 stream starts / user / hour** (soft burst e.g. 5/min)  
- Max request body: **512 KB**  
- Max stream duration: **120 s** (align `LLM_CHAT_TIMEOUT_MS`), then abort  
- Max concurrent streams / user: **1**

### 6. Web Ask UX for this ADR (Epic 1 only)

- Single in-flight answer, abort/stop, error display  
- **No** multi-turn history and **no** cloud thread persistence here—see
  [ADR-028](./028-grounded-chat-persistence.md)

### 7. Day-1 provider bar

All in-app providers that work in the extension must work on web under the
matrix above (cloud via proxy when needed).

---

## Consequences

### Positive

- Chat is a **product** capability, not an extension accident.
- One provider implementation; mobile is "new adapter + key store."
- BYOK preserved; no durable cloud key vault.
- Web CORS and Anthropic-style browser blocks solved without storing secrets.
- Security controls concentrated on one edge for cloud calls.

### Negative

- Pass-through sees keys and prompts **in memory** for cloud web Chat
  (acceptable trade per product grill; document in privacy copy).
- Pages Function streaming + limits need operational care (timeouts, cold starts).
- Extension and web still have **separate key stores** (re-enter keys per device).
- Temporary dual paths until all feature hooks use `ILlmRuntime`.

### Neutral

- Extension Chat does **not** move onto the proxy (SW stays direct).
- Summarize / synthesize rewiring is out of this ADR; they should adopt
  `ILlmRuntime` later without new product decisions.

---

## Alternatives Considered

### Extension-only forever

**Rejected.** Blocks web/mobile; contradicts multi-client Models IA.

### Always client-direct on web (no proxy)

**Rejected** as sole path. CORS/vendor policy will leave some providers
extension-only; fails full provider bar.

### Always proxy for extension + web

**Rejected** for now. Extra latency/trust surface for extension SW, which
already has host permissions.

### Server-held keys / inference billed by us

**Rejected.** Fights shipped BYOK and device-secret policy.

### Raw provider SSE passthrough to the SPA

**Rejected.** Re-forks provider parsing in the browser; fights shared
`ILLMService`.

---

## Implementation notes

Suggested PR sequence:

1. Extract providers to shared; introduce `ILlmRuntime`; extension adapter =
   current Port path (green, behavior-preserving).
2. Pages Function + security floor + shared stream session helper.
3. Web runtime adapter + AskPage stream wire-up + chip "needs key" gating.
4. Point cloud web health checks at proxy; keep Ollama direct.

Docs: update IA standard—web stream is **in scope** under this ADR; remove
"extension IPC only" out-of-scope line.

---

## Explicit non-goals

- Account key vault / key sync  
- Multi-turn or persisted chat (ADR-028)  
- Custom cloud `apiBase` on proxy  
- Routing extension Chat through the edge  
- Android / Apple app implementation (adapters only in design)

---

## References

- `src/features/ai/hooks/useLLMStream.ts`  
- `src/background/services/llm/ai-orchestrator.ts`  
- `src/background/services/llm/stream-relay.ts`  
- `src/shared/interfaces/i-llm-service.ts`  
- `src/web/pages/AskPage.tsx`  
- `src/web/lib/webLlmKeys.ts`  
- `wrangler.web.toml` (`underscore-web`)  
- [ADR-028 Grounded Chat Persistence](./028-grounded-chat-persistence.md)

---

## Revision History

| Date | Author | Changes |
| ---- | ------ | ------- |
| 2026-08-12 | Engineering | Accepted from grilled architecture session |
