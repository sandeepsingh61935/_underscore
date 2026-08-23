# PRD: Place-Based Ask — Domains, Sections, and Projects

**Status:** Draft — local only (not published to GitHub)  
**Date:** 2026-08-14  
**Depends on:** ADR-027 (LLM runtime), ADR-028 (grounded chat persistence — **amended by this PRD**), Unified Grounded Ask turn pipeline (shipped)  
**Product boundary:** Highlight-grounded Ask only

---

## Problem Statement

Users need durable Ask conversations that stay attached to **where their reading lives** — a domain, a section of a domain, or a cross-cutting research bag spanning several domains/sections.

Today the product still feels like a **parallel ChatGPT**: a global list of free-form threads, each tagged with a scope, plus a separate grounding tree. That splits the mental model (“where am I reading?” vs “which chat is this?”), invites **thread sprawl**, and makes multi-domain work awkward (whole-library or single domain, not a clear multi-place bag).

Users do **not** want Ask powered by third-party chat kits (assistant-ui) or IDE-agent patterns (Zed-style multi-thread agent panels). They want **persistent, place-based, grounded** chat on underscore’s own stack.

---

## Solution

Make the **library hierarchy the chat navigator**:

1. **One durable chat per place** (singleton):
   - **Domain** → one conversation  
   - **Section** (domain + path/key) → one conversation under that domain  
   - **Project** → one conversation whose grounding is an editable set of **domain and/or section members**

2. **Remove the global “Chats / history” product** as primary navigation. Recency orders **places** (domains, sections, projects) by last chat activity — not a free-named thread list.

3. **Projects** replace bare multi-domain sets and “all library as multi-select”:
   - Named container (identity = project id)  
   - Members = domains and sections only  
   - Membership can change; **next send** rebuilds live excerpts from current members  
   - Multi-select without a project → **auto create Untitled project** (always a place)

4. **Keep** the existing grounded turn pipeline (prepare excerpts → begin → assemble multi-turn → stream → finalize). No assistant-ui; no Zed agent thread model.

5. **Extension** stays a thin client into the same places (open domain / section / project chat), not a second history system.

---

## User Stories

1. As a paid user, I want to open a domain and continue the same chat I used last time on that domain, so that history matches my reading places.
2. As a paid user, I want to open a section (page path under a domain) and have its own durable chat, so that page-level research does not mix with whole-domain chat.
3. As a paid user, I want domain and section chats to appear under the library tree, so that I do not hunt a separate chat history app.
4. As a paid user, I want places ordered by recent chat activity, so that what I used last is easy to resume.
5. As a paid user, I want to create a Project with a name, so that multi-site research has a stable identity.
6. As a paid user, I want to add domains as Project members, so that answers ground across those sites.
7. As a paid user, I want to add sections as Project members, so that only chosen paths contribute context.
8. As a paid user, I want exactly one chat per Project, so that I do not accumulate parallel threads inside a project.
9. As a paid user, I want to rename a Project, so that Untitled bags become meaningful.
10. As a paid user, I want to remove a member from a Project without losing the conversation, so that I can refine grounding over time.
11. As a paid user, I want the next message after membership change to use the new member set, so that grounding stays honest.
12. As a paid user, I want past messages to remain readable after membership change, so that history is not rewritten.
13. As a paid user, I want multi-selecting domains/sections without saving to still land in a chat place (Untitled project), so that I never chat in a placeless void.
14. As a paid user, I want to delete a Project, so that I can drop a research bag and its singleton chat.
15. As a paid user, I want to clear a place’s conversation, so that I can start over without creating a second parallel chat.
16. As a paid user, I do not want a global “New chat” that spawns free-form threads, so that ChatGPT-style sprawl cannot return.
17. As a paid user, I want Ask answers grounded only in highlights for the active place’s members/scope, so that trust stays highlight-based.
18. As a paid user, I want multi-turn follow-ups within a place, so that refinement works without re-stating context.
19. As a paid user, I want live excerpts rebuilt each send for the place, so that new marks are included.
20. As a paid user on web, I want the left rail to show Projects and domains/sections as peers by recency, so that navigation matches usage.
21. As a paid user on web, I want selecting a place to show its transcript and composer, so that one click resumes work.
22. As a paid user, I want empty places (no highlights in scope) to be explicit, so that I know why Ask cannot send.
23. As a paid user in the extension, I want page/domain/library-style entry to map into section/domain/project places, so that popup and web share one model.
24. As a paid user in the extension, I want a way to continue a place on the web, so that dense project editing fits the larger surface.
25. As a paid user, I want Project membership UI to list domains and sections clearly, so that I know what grounds the chat.
26. As a paid user, I want filters later (e.g. name search) without changing place identity, so that large libraries stay usable.
27. As a guest/free/past_due user, I want the same commercial locks as today, so that paid Ask remains gated.
28. As a paid user without a model key, I want clear setup CTAs, so that provider setup is not confused with history design.
29. As a paid user, I want abort/stop on a streaming turn in a place chat, so that bad runs can be cancelled.
30. As a paid user, I want failed turns not to poison multi-turn context, so that the next question still works.
31. As a developer, I want singleton resolution “get or create chat for place key”, so that UI never invents free-form thread ids.
32. As a developer, I want Projects as first-class domain objects, so that membership is not smuggled into thread title hacks.
33. As a developer, I want old free-form threads hidden from primary UI, so that place-based nav is the only story.
34. As a product owner, I want no assistant-ui dependency for this model, so that place identity stays owned by us.
35. As a product owner, I want no Zed-style multi-thread agent panel, so that sprawl does not return under another name.
36. As a paid user, I want section chats nested under their domain in the tree, so that hierarchy stays clear.
37. As a paid user, I want Project chats not nested as “fake domains”, so that Projects read as research bags.
38. As a paid user, I want grounding footer/summary (e.g. “3 domains · 2 sections”) on Project chats, so that scope is visible.
39. As a paid user, I want domain-only chat to ignore Project membership, so that single-site ask stays simple.
40. As a paid user, I want opening the same domain from library and from Ask to hit the same singleton, so that surfaces do not fork history.
41. As a paid user, I want quotas and entitlements unchanged in spirit (paid + limits), so that abuse controls remain.
42. As a paid user, I want delete domain chat to mean clear or delete that singleton only, so that other places are untouched.
43. As a paid user, I want project member section keys stable (domain + section key), so that renames of display labels do not fork chats.
44. As a paid user, I do not need an “all library” chat identity, so that multi-scope always goes through Projects.
45. As a paid user, I want Untitled projects renameable on first send or via UI, so that auto-created bags become real.
46. As a support engineer, I want clear mapping place key → thread id, so that debugging history is tractable.
47. As a paid user, I want BYOK and providers unchanged, so that place redesign does not regress model access.
48. As a paid user, I want streaming and persistence status model unchanged (streaming/completed/failed/cancelled), so that turn reliability stays.
49. As a designer, I want one navigator (places), so that we do not design a second history IA.
50. As a future agent implementer, I want this PRD and ADR amendments as the source of truth, so that assistant-ui/Zed are not re-proposed as the default.

---

## Implementation Decisions

### Product locks (non-negotiable)

1. **Not assistant-ui** as foundation; **not** Zed AI agent/thread patterns as product model.  
2. **No global free-form thread list** as primary Ask navigation.  
3. **One chat per place** (domain | section | project).  
4. **Projects** are the only multi-place grounding bag (members: domains and sections).  
5. **No all-library chat identity**; multi-scope = Projects.  
6. **Unsaved multi-select** → auto **Untitled project** (then rename).  
7. **Project identity** = stable project id; membership is metadata.  
8. **Membership change** does not rewrite past messages; next turn uses new members for excerpts.  
9. **Clear conversation** resets a singleton; no infinite “New chat” threads per place.  
10. **Existing free-form threads**: hide from primary UI (do not require merge for v1).  
11. **ADR-028 amendments** (document in ADR or follow-up ADR):  
    - Reject “many threads per scope” as product default.  
    - Reject global ChatGPT-like thread list as primary UX.  
    - Add Project place type; demote bare multi-domain / all-library multi-turn as primary multi-scope.  
    - Keep: grounded only, live excerpts, begin/stream/finalize, Supabase SoT + cache, turn pipeline.

### Place keys (logical)

Decision-rich shapes (not file paths):

```
Place =
  | { type: 'domain'; domain: string }
  | { type: 'section'; domain: string; sectionKey: string }
  | { type: 'project'; projectId: string }

Project = {
  id, userId, title,
  members: Array<
    | { kind: 'domain'; domain: string }
    | { kind: 'section'; domain: string; sectionKey: string }
  >,
  createdAt, updatedAt
}

// Exactly one ChatThread (or equivalent) per Place per user
// resolvePlaceChat(userId, place) -> get-or-create singleton
```

### Schema (direction)

12. **Projects table** (or equivalent): id, user_id, title, timestamps; RLS by user.  
13. **Project members table**: project_id, member_kind, domain, section_key nullable; unique per project+member.  
14. **Threads**: either  
    - (preferred) **unique constraint** so one thread per (user_id + place identity), with place columns / project_id FK, **or**  
    - thread row 1:1 with project_id / domain scope as today but **enforced singleton** in service.  
15. Stop using “many threads + free title list” as the web Ask primary list.  
16. Migration: leave old multi-threads in DB; UI resolves singletons only; optional later merge tool out of scope unless needed.

### Runtime / modules

17. **Keep** grounded turn orchestrator, chat service write path, prepare excerpts, ILlmRuntime.  
18. **Add** Project repository/service: create, rename, delete, set members, list by recency.  
19. **Add** `resolvePlaceChat` / open-place API: get-or-create singleton for place.  
20. **Grounding for a place:**  
    - domain → highlights for domain  
    - section → highlights for domain+sectionKey  
    - project → union of members’ highlights (dedupe by highlight id)  
21. **Recency list:** places sorted by singleton chat `updated_at` (and projects without messages by project `updated_at`).  
22. **Web Ask shell:** left rail = places (projects + domain/section nodes), center = transcript + composer; remove primary global thread sidebar behavior.  
23. **Extension:** map page → section place, domain → domain place; multi-select / multi-domain entry → project; continue-on-web opens that place.  
24. **Composer “New chat”** replaced by **Clear conversation** (and project create/rename/delete).  
25. **Commercial gates / BYOK / providers** unchanged in policy.  
26. **Quotas:** adapt thread quota to place/project counts sensibly (e.g. max projects, max members per project); message caps per singleton remain.

### Interactions (web)

27. Click domain → open domain singleton.  
28. Click section → open section singleton.  
29. Click project → open project singleton; show member summary.  
30. Create project → empty members + empty chat; user adds members.  
31. Multi-select → create Untitled project with those members → open its chat.  
32. Edit members → persist members; transcript unchanged until next send uses new excerpts.  
33. Clear conversation → delete messages or tombstone and empty transcript for that place only.

### Interactions (extension)

34. Scope chips map into places (page→section, domain→domain; library multi → project or prompt to web for project edit).  
35. No global thread list required in popup; show active place label + continue in web.

---

## Testing Decisions

### Good tests

Assert **external behavior** at high seams: place resolution, membership → excerpt set, singleton uniqueness, navigator ordering, clear/delete. Mock LLM runtime; do not assert React internals or provider HTTP.

### Primary seams (preferred existing + few new)

| Seam | Assert |
|------|--------|
| **resolvePlaceChat / singleton service** | Same place → same thread id; second open does not create duplicate |
| **Project service** | create/rename/delete; add/remove members; uniqueness of members |
| **Grounding for place** | domain/section/project union; dedupe; empty place |
| **runGroundedTurn + ChatService** | unchanged lifecycle; project place still begin/finalize |
| **assembleChatRequest** | multi-turn within singleton; empty history one-shot shape |
| **prepareHighlightExcerpts** | still single prepare entry; member highlights as input |
| **Place list / recency** | ordering by last activity (pure or service-level) |
| **Ask UI** | no primary global thread list; select place opens transcript; clear; locks |

### New seams (highest point)

- **Place identity + get-or-create chat** (domain module) — one interface for web and extension.  
- **Project aggregate** (members + title) — repository port + in-memory fake for tests.

### Prior art

- Chat service, run-grounded-turn, context-assembler, prepare-highlight-excerpts, Ask page/view tests with mocked session/turn.  
- Extend those patterns; prefer unit tests on place/project services over full E2E for v1.

### Acceptance checks

- Two UI opens of the same domain yield one history.  
- Project with two domains grounds on union; removing a domain changes next send only.  
- No UI path creates a second concurrent chat for the same place without clear.  
- Global free-form “New chat” list is gone from primary Ask IA.

---

## Out of Scope

- assistant-ui (or similar) as chat UI/runtime foundation  
- Zed Agent panel, parallel agents, worktrees, checkpoints, edit prediction, terminal threads  
- Many chats / threads **per** project (ChatGPT Projects-as-folder)  
- Free-form ungrounded chat  
- Global ChatGPT-style history as primary nav  
- All-library singleton chat identity  
- Auto-merge of legacy free-form threads (optional later)  
- Project instructions/skills/system prompts beyond normal Ask grounding (later)  
- Project sharing / multi-user  
- Members beyond domain/section (highlight-level pins later)  
- AI-generated project titles (optional later)  
- Full project editor in extension popup (web-first for membership UX)  
- Provider stack rewrite / AI SDK  
- Changing BYOK or cloud key storage policy  

---

## Further Notes

### Relationship to prior work

| Work | Status |
|------|--------|
| Unified turn pipeline (extension + web on runGroundedTurn) | Shipped — **keep** |
| Global thread list + many threads per scope (ADR-028 original UX) | **Supersede** with place-based nav + singleton |
| Bare multi-domain set scope | **Replace** with Projects |
| assistant-ui / Zed as implementation | **Rejected** (reconfirmed) |

### Why Projects (not bare multi-domain sets)

Named **project id** gives stable history when membership changes; set-equality identity forked chats and matched neither library hierarchy nor research bags. Projects are **context bags + one chat**, not agent workspaces.

### Success bar

1. User can resume domain, section, and project chats without a separate history product.  
2. Multi-domain research is a Project with one transcript.  
3. No path encourages free-form thread sprawl.  
4. Grounding always derives from the active place’s definition.  
5. Stack remains home-grown grounded Ask (ADR-027/028 amended).

### Suggested delivery slices

1. Place keys + singleton resolve (domain/section) + hide global thread list for those places  
2. Projects CRUD + members + project singleton chat + grounding union  
3. Recency-ordered place rail; multi-select → Untitled project  
4. Extension mapping + continue-on-web; clear conversation  
5. ADR-028 amendment write-up  

### References

- Locked grilling: Q1 A, Q2 A, Q3→Projects, Q4 B, Q11 A, Q12 A, Q13 A, Q14 C, Q15 B, Q16 C  
- assistant-ui / Zed: **not** the chat architecture  
- Prior PRD: Unified Grounded Ask (turn pipeline) — complementary, not replaced for streaming/persistence mechanics  

---

*Synthesized from product brainstorming, architecture consultation, unified Ask implementation, and place/Projects grilling. Not published to the GitHub issue tracker.*
