# PRD: Free-window Integrations-only (remove Chat + Models/Providers)

**Status:** `ready-for-agent`  
**Date:** 2026-08-14  
**Source:** Product brainstorm (free-window + Guest+Cloud + surgical cut)  
**Amends product surface of:** [AI Integrations IA standard](./2026-08-12-ai-integrations-ia-standard.md) (Models tab retired), [ADR-029](../../04-adrs/029-cloud-first-library-and-integrations.md) § Models module (no longer a product module), place-based Ask / unified grounded Ask PRDs (product retired)  
**Does not reopen:** Guest/Basic local path, Cloud SoT for signed-in Pro, Cloud MCP + OAuth spine (ADR-023/024/029 Integrations), final paid SKU  
**Related keep:** [Integrations host handoff PRD](./2026-08-14-integrations-host-handoff-prd.md)

---

## MUST: Implementation environment (git worktree)

**Hard gate — do not start implementation until this is true.**

1. All implementation work for this PRD **MUST** run in a **git worktree**, not in the primary checkout working tree.
2. Create the worktree **from the `dev` branch** using the git worktree command (or project-equivalent that still creates a real linked worktree), for example:

   ```bash
   git fetch origin dev
   git worktree add ../_underscore-free-window-integrations-only -b feature/free-window-integrations-only origin/dev
   ```

   Adjust the path and branch name if needed; the invariants below are what matter.

3. **Before the first code edit**, the implementing agent **MUST** verify and record:

   - `git rev-parse --git-dir` (or `git rev-parse --is-inside-work-tree`) shows a worktree-linked git dir (typically `.../.git/worktrees/<name>`), **not** only the main repo `.git` as the sole worktree.
   - `git worktree list` includes the implementation path.
   - The worktree branch is based on **`dev`** (merge-base with `dev` / `origin/dev` is current enough to start).
   - Working directory for all edits, installs, builds, and commits is that worktree path.

4. If the agent is already in the main checkout (e.g. `/home/.../_underscore` without a worktrees path), it **MUST** create/switch to the worktree first and continue there. **No implementation commits on the main working tree for this PRD.**

5. Commits for this work land on the feature branch in the worktree; merge/PR back to `dev` is the integration path (not force-push rewrite of `dev` from ad-hoc main-tree edits).

**Failure mode:** Starting implementation without a verified worktree off `dev` is out of process and must be stopped and fixed before continuing.

---

## Problem Statement

I am building a highlight library for people who use external AI agents. The product currently also ships **in-app Chat/Ask** and **Models & providers (BYOK)**. That surface is large, unfinished-feeling, and distracts from the real AI path: **Integrations (MCP)** so Claude, Cursor, and similar hosts can read my synced cloud library.

I also do not want to charge users yet. I want a **free window of several months** (including Integrations) for early and current users, then decide paid packaging later. I do **not** want to kill local/guest usage: **Guest (local) + Cloud (signed-in)** both stay.

As a user today I still see Chat, model setup, and “AI & agents” upgrade language that no longer match the product I want.

## Solution

**Surgical product cut + free-window commercial policy.**

1. **Remove Chat/Ask** from web and extension (nav, routes, views, CTAs, place/projects chat UX).
2. **Remove Models & providers** from Settings and all BYOK / in-app inference product UI.
3. **Keep Integrations (MCP)** as the only AI product surface (catalog, host handoff, Cloud MCP).
4. **Keep Guest + Cloud:** guest continues local-only capture; signed-in continues cloud library SoT + sync + export.
5. **Free window:** signed-in users can use Integrations **without** paid entitlement while a single free-window flag/config is on. Paid SKU is **explicitly deferred**.
6. **Do not** drop chat database tables in this effort; stop writing to them. Do not kill Basic/guest. Do not hard-delete MCP bridge code beyond existing soft-deprecate posture.

**One-line product after ship:**  
Highlight library (guest local or signed-in cloud) → connect agents via Integrations. No in-app chat. No provider keys.

---

## User Stories

### Guest (local)

1. As a guest, I want to highlight pages without creating an account, so that I can try the product with zero friction.
2. As a guest, I want my highlights stored only on this device, so that I am not forced into cloud until I choose.
3. As a guest, I do not want to see a working Chat/Ask product, so that the app does not promise in-app AI I cannot use.
4. As a guest, I do not want Models/providers setup, so that I am not asked for API keys.
5. As a guest, I want Integrations to require sign-in (and explain why), so that I understand agents need a cloud library.
6. As a guest, I want a clear path to sign in for multi-device sync, so that I can graduate to Cloud when ready.

### Signed-in free window (unpaid)

7. As a signed-in early user, I want full cloud library browse/edit/sync, so that the core product remains useful without payment.
8. As a signed-in early user, I want export of my library, so that I am never locked into the product.
9. As a signed-in early user, I want Integrations available without upgrading, so that I can connect agents during the free window.
10. As a signed-in early user, I want Settings to show Integrations (not Models), so that setup matches the only AI path.
11. As a signed-in early user, I want early-access copy (not a permanent “always free forever” legal promise unless product later chooses that), so that future paid packaging is still honest.
12. As a signed-in early user, I do not want aggressive “Upgrade for AI chat” CTAs, so that the free window does not feel paywalled.
13. As a signed-in early user who already has a Polar subscription, I still want Manage billing when relevant, so that existing billing customers are not stranded.

### Chat / Ask removal

14. As any user, I do not want a Chat or Ask item in web navigation, so that I am not led into a removed product.
15. As any user, I do not want `/ask` as a product page, so that old links fail closed or redirect to library/settings without a broken chat shell.
16. As an extension user, I do not want an Ask tab/view as a primary surface, so that popup chrome matches the cut.
17. As a signed-in user on Home or Library, I do not want “Chat this page” or chat stats as product CTAs, so that library actions stay on library/export/integrations.
18. As a user with existing chat threads from prior builds, I accept that threads are not shown in UI, so that the product can move on without a chat history product.
19. As a power user, I accept chat tables may remain in the database unused for now, so that this effort stays surgical.

### Models / Providers removal

20. As a signed-in user, I do not want a Models & providers settings tab, so that I never configure BYOK for a removed Ask product.
21. As a signed-in user, I do not want to enter OpenAI/Anthropic/Ollama keys for Underscore, so that inference stays in my agent host.
22. As a signed-in user, I do not want a model picker chip that only existed for Ask, so that UI chrome is simpler.
23. As a developer, I want dead in-app LLM runtime/provider code unreferenced by product entry points, so that maintenance cost drops.

### Integrations (keep and center)

24. As a signed-in free-window user, I want Integrations hub status (Ready / Connected) with honest copy, so that I know whether an agent has reached Cloud MCP.
25. As a signed-in free-window user, I want host handoff (deep link / install command / copy URL per host), so that connecting agents matches industry MCP setup.
26. As a signed-in free-window user, I want the Cloud MCP URL and advanced notes under server details, so that power setup remains available without fake Connect.
27. As a signed-in free-window user, I want OAuth/grants behavior unchanged in intent from Integrations host handoff work, so that Connected remains grant- or session-backed.
28. As a guest, I want Integrations locked with sign-in CTA (not paid CTA during free window), so that the next step is account, not checkout.

### Commercial / free window

29. As the product owner, I want a single free-window flag or config, so that turning paid checks back on later is one policy change.
30. As a signed-in free-window user, I want `PAID_REQUIRED` not to block Integrations while the flag is on, so that free months include MCP.
31. As a guest, I still get `AUTH_REQUIRED` for Integrations, so that free window does not mean anonymous MCP on empty cloud library.
32. As the product owner, I want paid SKU decisions deferred, so that usage during the free window can inform whether paid unlocks Integrations only or something else.
33. As a future paid user (after window), I expect library capture/sync/export to remain the fairness baseline unless a later PRD explicitly changes that, so that “forever paid for the whole highlighter” is not the silent default.

### Mode / account model

34. As a guest, I remain on Basic/local storage scope, so that dual storage policy is unchanged.
35. As a signed-in user, I remain on Pro cloud SoT with per-device cache, so that ADR-029 library rules stay intact.
36. As a signed-in free-window user, I should not need a separate “AI mode” ritual to use Integrations, so that mode complexity does not block the free window.

### Copy, billing, trust

37. As any user, I want Settings/billing language that does not promise in-app Chat after it is removed, so that marketing matches product.
38. As a free-window user, I want language like early access / free for early users for Integrations, so that expectations are set.
39. As a past-due subscriber (if any), I want library to keep working per existing past-due policy, so that billing edge cases do not delete my highlights.
40. As a privacy-conscious user, I want guest local path preserved, so that “cloud only forever” is not forced by this PRD.

### Engineering / quality

41. As a developer agent, I want build and type-check green after removal, so that dead imports do not ship.
42. As a developer agent, I want unit tests for commercial free-window + nav absence + settings Integrations-only, so that regressions are caught.
43. As a developer agent, I want optional E2E of Cloud MCP handshake when environment allows, so that Integrations still works end to end after the cut.
44. As a developer agent, I want docs/ADR supersede notes for retired Chat/Models product claims, so that future agents do not re-implement Ask as if required.
45. As a developer agent, I want implementation confined to a git worktree off `dev`, so that main-checkout WIP and this cut stay isolated.

### Explicit non-goals as user-visible stories

46. As a user, I do not expect this release to delete my guest mode, so that local trial remains.
47. As a user, I do not expect this release to start charging me, so that free window holds.
48. As a user, I do not expect a migration wizard for old chat transcripts, so that scope stays surgical.
49. As a user, I do not expect cloud MCP bridge hard-removal beyond existing soft-deprecate, so that residual bridge code does not block this PRD.

---

## Implementation Decisions

### Process (blocking)

- Implementation **MUST** use `git worktree` from **`dev`** before any product code change. See **MUST: Implementation environment** above.
- Verify worktree with `git worktree list` and `git rev-parse --git-dir` before the first edit.
- All commits for this PRD are made inside that worktree on a feature branch based on `dev`.

### Product locks

- **P1 Guest + Cloud:** Keep Basic/guest local-only and signed-in Pro cloud SoT. Do not remove local account.
- **P2 Remove Chat + Models/Providers** as product surfaces now.
- **P3 Integrations only** as AI surface.
- **P4 Free window:** authenticated Integrations without paid; paid SKU later.
- **P5 Surgical cut:** remove entry points and dead product trees; leave unused chat SQL tables; no guest rewrite; no final pricing schema.

### Commercial gate

- Extend commercial MCP gate so free-window policy can allow: authenticated + (paid active OR free-window enabled).
- Guest remains `AUTH_REQUIRED` for MCP.
- During free window, web caps that drive Integrations must not require paid for `mcp`.
- `canConfigureAiProviders` / product Models path is removed or always denied; do not leave a half-dead Models UI.
- Prefer one named free-window switch (config/env/feature flag) documented for ops to flip when paid starts.
- Billing checkout upgrade CTAs that pitch Chat or “AI & agents” for Ask must be rewritten or softened for early access; keep Manage for existing subscribers.

### Chat removal

- Remove web Ask route and nav entries; extension Ask view/chrome entry; Home/Library chat CTAs and chat-oriented stats.
- Stop creating threads/messages/projects from product UI.
- Shared chat domain and grounded-turn pipeline become unreferenced by product; delete or quarantine once no imports remain.
- Supabase chat tables: no drop in this PRD; optional later migration PRD.

### Models / Providers removal

- Settings AI chrome becomes Integrations-only (no Models | Integrations dual tab for product).
- Remove or stop shipping provider key setup, model list hub, Ask model chip, web LLM key store UX, AI prefs sync UX as product features.
- Background in-app LLM IPC/orchestrator/key store: remove from product bootstrap when nothing product-facing calls them.
- Capability flag `ai` as Ask unlock is retired from user-facing product; do not use it to mean Integrations.

### Integrations keep

- Preserve Integrations panels, host catalog, host handoff, Cloud MCP URL, OAuth grant display, session-based Connected semantics from existing Integrations work.
- Free window changes **who may open** Integrations (auth, not paid), not the meaning of Connected.

### Modes

- Do not collapse `basic` | `pro` | paid overlay in this PRD beyond what free-window MCP unlock requires.
- During free window, signed-in users must be able to use Integrations without being stuck behind a paid-only mode ritual.

### Docs

- Supersede IA standard Models section and ADR-029 Models module as product.
- Demote grounded chat / place-based Ask PRDs to historical product (not active scope).
- Keep ADR-023/024/029 Integrations path authoritative.

### Ship order (recommended)

0. **Create and verify git worktree off `dev`** (blocking).
1. Free-window commercial unlock for MCP (auth only).
2. Strip Chat/Ask entry points (web + extension + CTAs).
3. Collapse Settings to Integrations-only AI surface.
4. Remove dead chat/LLM product imports; quarantine unused trees.
5. Billing/copy early-access pass.
6. Docs/ADR supersede notes.
7. Verify build, type-check, unit tests; E2E MCP handshake if environment allows.

---

## Testing Decisions

### What good tests look like

- Assert **external behavior** (nav presence, route outcome, gate allow/deny, settings chrome, guest vs signed-in), not private file structure.
- Prefer pure commercial gate tests and existing web settings / shell tests as highest seams.
- Do not require production Polar checkout in unit tests; free-window flag is the seam.

### Primary seams (required)

1. **Guest capture path still exists** — guest is not forced to sign in for basic highlight use.
2. **No Chat/Ask product entry** — web shell has no Chat/Ask nav; Ask route is gone or non-product (redirect); extension has no Ask primary view.
3. **Settings AI = Integrations only** — no Models tab/copy requiring API keys; Integrations catalog/setup still renders for signed-in free-window users.
4. **Free-window MCP gate** — guest → `AUTH_REQUIRED`; signed-in + free-window on + unpaid → allowed; free-window off + unpaid → `PAID_REQUIRED` (future flip).
5. **Web caps** — signed-in free-window exposes Integrations unlock without requiring paid for `mcp`.
6. **Worktree process** — implementation evidence that work was done in a worktree off `dev` (agent notes / PR description), not only code assertions.

### Secondary seams (if possible)

7. **E2E Cloud MCP handshake** — when test env has worker + auth, signed-in free-window user can complete host handoff far enough for Ready and (if fixtures allow) Connected. If env cannot support OAuth, document skip; do not block the cut on live OAuth alone.
8. **Build / type-check** — product entrypoints compile with chat/provider UI removed.
9. **Regression** — library, export (signed-in), billing manage path for existing subscriber shapes still covered where present.

### Prior art

- `resolveWebCaps` / `resolveWebPaidActive` unit tests
- `AiPanel` / `WebSettingsPage` tests (Models vs Integrations copy boundaries)
- `WebAppShell` nav tests
- commercial / MCP bridge entitlement tests
- Integrations host handoff PRD acceptance patterns
- Project git worktree skill / `git worktree` CLI

### Out of testing scope for this PRD

- Proving long-term paid conversion metrics
- Full deletion audit of every unused file on day one (quarantine acceptable if entrypoints are dead)
- Chat transcript migration correctness

---

## Out of Scope

- Removing Guest/Basic local account or forcing cloud-only install
- Final paid SKU (Integrations-only vs broader gating), grandfather pricing, founding coupons
- Dropping `chat_*` Supabase tables / chat data export wizard
- Rebuilding Chat later under a flag as the end state of this PRD
- Cloud key vault, in-app streaming, place-based projects as products
- Hard-delete of MCP bridge adapter code (soft-deprecate remains)
- Changing Cloud MCP OAuth resource-server architecture (ADR-024)
- New agent hosts beyond existing catalog patterns
- Marketing site redesign beyond in-app copy needed for honesty
- Mobile/native clients
- Implementing this PRD in the main working tree without a git worktree off `dev`

---

## Further Notes

### Monetization honesty (for later PRD)

- Free months including MCP is intentional learning time.
- Default fairness baseline when paid returns: **library free for signed-in users; paid unlocks Integrations** — not locked in this PRD, but strongly preferred over “pay for the whole highlighter.”
- Do not market “always free forever” unless product explicitly decides that.

### Relationship to prior AI work

- Place-based Ask, grounded turns, chat projects, BYOK models polish are **retired product** for this direction.
- Integrations host handoff remains the active AI UX track.

### Issue tracker

- GitHub CLI may not be authenticated in the authoring environment; this file under `docs/superpowers/specs/` is the source of truth with status `ready-for-agent`. Publish a tracker issue when `gh` auth is available and apply the same triage label.

### Success criteria (acceptance)

1. Implementation ran in a **git worktree** branched from **`dev`** (verified before first edit).
2. No Chat/Ask nav or primary Ask UI (web + extension).
3. No Models/Providers product setup in Settings.
4. Signed-in user can use Integrations without paid entitlement while free window is on.
5. Guest can still highlight locally.
6. Signed-in cloud library behavior unchanged in intent.
7. Build + type-check + required unit seams green.
8. E2E MCP handshake verified if environment allows; otherwise documented skip.
