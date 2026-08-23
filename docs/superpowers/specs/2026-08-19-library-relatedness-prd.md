# PRD: Library Relatedness (Related Tags + Related Highlights)

**Status:** `ready-for-agent`  
**Date:** 2026-08-19  
**Source:** Product brainstorm + offline POC (`scripts/poc-relatedness.mjs`) + design grill (shared understanding confirmed)  
**Surfaces:** Web library first  
**Does not reopen:** Tag entity / junction model, library SoT per mode (ADR-029 and related), V2 Editorial popup chrome ownership  
**POC evidence:** Hybrid scorer validated on fixture + real exports; related-tags Jaccard validated with `--synth-tags` on real library shapes. Real user tag density today is ~0–2% (feature must degrade honestly).

---

## Problem Statement

I open my underscore library to continue a thread of thought. I land on a tag or a highlight and hit a **dead end**: no obvious next mark, no sense of what else in *my* library sits nearby.

I do not want a second PKM graph editor, embeddings infra, or an AI chat detour. I want **navigation**: from this tag, which tags co-travel with it; from this highlight, which other highlights are the same page, shared labels, or similar wording — with a short reason I can trust.

---

## Solution

Ship **computed relatedness** over the library the user can already read (current mode SoT):

1. **Related tags** — when exactly one tag filter is active on the web library, show a **Related** section above results (top 5 chips). Click = normal tag navigation (replace filter with that tag). Soft-gated: only if the active tag has **df ≥ 2** and at least one eligible co-occurring tag after stoplist / ultra-common filters.
2. **Related highlights** — on **web highlight detail**, show a compact list (top 5) with reason pills. Signals: tag Jaccard + BM25(text/notes) + same URL + same domain; adaptive when the seed has no tags; **max 2 results per URL** so one long page cannot fill the list.
3. **One** `RelatednessQueryService` + thin hooks; **in-memory index** built when library data loads (no materialized co-occurrence tables in v1).
4. Empty/junk-tag reality: no fake tags in product UI; empty/CTA copy when gated; algorithm already proven offline.

**One-line product after ship:**  
From a tag or a highlight, I can jump to nearby library items with an explainable reason — without leaving web library browse.

---

## User Stories

### Related tags (web library)

1. As a library user with a **single tag filter** active, I want a **Related** section above results, so that I can see tags that co-occur with the active tag.
2. As a library user, I want at most **5** related tags, so that the section stays scannable.
3. As a library user, I want each related tag to show a short reason when useful (e.g. co-occurrence is implied by presence; optional light count later), so that the list does not feel random — **minimum bar:** list is trustworthy via ranking; reason pills required on highlights (story 14); tags may use simpler chrome if reasons are redundant.
4. As a library user, I want clicking a related tag to **navigate like any tag** (set filter to that tag), so that I am not learning a special interaction.
5. As a library user, I do not want the active tag returned in related tags, so that the list is not trivial.
6. As a library user, I do not want junk/noise tags (`todo`, `misc`, `untagged`, `test`, and similar stoplist entries) in related tags, so that soup does not dominate.
7. As a library user, I do not want ultra-common tags (**df / N > 0.5**) suggested, so that labels applied to half the library do not pollute relatedness.
8. As a library user, when the active tag has **df < 2** or no eligible co-tags, I want the Related tags section **hidden** (not a broken empty box), so that the UI does not promise a graph I cannot show.
9. As a library user with **almost no tags** in the library, I want an honest path to value (e.g. empty library tagging CTA elsewhere remains product baseline; related-tags simply does not appear until gate passes), so that we never inject demo/synth tags into the product UI.
10. As a library user with **multi-tag** filters active, I do not want a Related tags section in v1, so that ranking semantics stay obvious.
11. As a library user, I want related tags computed over the **full library visible to my current mode**, so that results match browse SoT (Basic local vs signed-in cloud as today — no special merge).

### Related highlights (web highlight detail)

12. As a library user on **highlight detail**, I want a **Related** block of up to **5** other highlights, so that I can continue reading my own marks.
13. As a library user, I want each row to be **compact** (one-line/snippet + tags if any + reason pill), so that detail stays dense.
14. As a library user, I want a **visible reason pill** on every related highlight (`Same page`, `Shared tags`, `Similar text`, or short combinations), so that I trust the ranking.
15. As a library user, I want ranking to prefer **shared tags**, then **similar text/notes**, with boosts for **same URL** and **same domain**, so that structure and wording both count.
16. As a library user, when the seed highlight has **no tags**, I still want related highlights from **text + URL/domain**, so that untagged libraries are not a dead feature.
17. As a library user, I do not want the current highlight in the list, so that self-matches never appear.
18. As a library user, I want **at most 2** related highlights from the same URL, so that “related” is not only “rest of this page.”
19. As a library user, I want score-0 / empty candidate sets to yield a hidden or honest empty related block (no spinner forever), so that failure modes are calm.
20. As a library user, I want clicking a related highlight to open that highlight’s detail (same navigation pattern as elsewhere in web library), so that jump-through works.
21. As a library user on highlight detail, I do **not** need a Related tags block in v1 (tags live on tag-filter context only), so that surfaces stay single-purpose.

### Trust, privacy, modes

22. As a user with **encrypted** or otherwise unreadable highlight text client-side, I want text similarity to **skip** that plaintext path, so that ciphertext is never treated as English for BM25.
23. As a user whose seed text is unreadable, I still want related highlights from **tags + URL/domain** when those exist, so that the section can still help.
24. As a guest or signed-in user, I want relatedness to use only **highlights my client is already allowed to list** for library browse, so that relatedness cannot widen access.
25. As a user, I do not want relatedness to require network calls beyond loading the library I already use on web, so that v1 stays a client-side index over loaded library data (unless web already loads library via existing API — then reuse that path; no new recommendation backend).

### Analytics & quality

26. As a product owner, I want analytics events **`related_tag_clicked`** and **`related_highlight_clicked`** (with non-PII props: e.g. reason category, index in list), so that we can see whether navigation is used.
27. As a developer, I want unit tests on the pure scorer (Jaccard tags, hybrid highlights, stoplist, df gate, per-URL cap, encrypted skip), so that POC quality does not regress.
28. As a developer, I want the offline POC script retained for manual gates on exports (`--gate`, `--synth-tags`), so that real-library checks stay cheap.

### Non-user (implementer) stories

29. As an implementer, I want a shared **`RelatednessQueryService`** (or equivalent pure module + thin service) with `relatedTags(tagName)` and `relatedHighlights(highlightId)`, so that UI does not own ranking.
30. As an implementer, I want hooks **`useRelatedTags`** / **`useRelatedHighlights`** that read the in-memory index, so that views stay presentational.
31. As an implementer, I want one **session index** built when web library data is available/refreshed, so that repeated opens of detail/filter are cheap.
32. As an implementer, I want V2 Editorial tokens only (no hardcoded hex, no Tailwind), so that UI matches web library.
33. As an implementer, I do not want popup `PopupShell` / extension surfaces in v1, so that scope stays web library.

---

## Implementation Decisions

### Ranking (freeze v1)

**Related tags**

- Build inverted map tag → set of highlight ids (from normalized labels already on library rows / tag junction as library load provides today).
- Score candidate tag B for query tag A: **Jaccard** on highlight-id sets: `|A∩B| / |A∪B|`.
- Exclude: A itself; stoplist; tags with `df/N > 0.5`; candidates with no meaningful co-occurrence (require co-occur ≥ 2 **or** Jaccard ≥ 0.15 — match POC).
- Sort by score desc, co-occur desc; take **5**.
- Gate section: `df(A) ≥ 2` and ≥1 candidate after filters.

**Related highlights**

- Score components (normalize as in POC):  
  - weighted tag Jaccard (IDF-weighted optional; POC weighted Jaccard OK)  
  - BM25 on `text + notes` (skip if text unreadable/encrypted)  
  - same URL boost, same domain boost  
- Adaptive: if seed has zero tags, tag term contributes 0; text/URL carry.
- Exclude self; drop non-positive total score.
- Sort by score; enforce **max 2 per URL** while filling top **5**.
- Reason pills derived from dominant signals (same-url → `Same page`; tag overlap → `Shared tags`; text → `Similar text`).

**Stoplist (initial)**  
`todo`, `misc`, `untagged`, `test`, `asdf`, `something` (extend only with clear junk; keep list in shared util).

### Architecture

- **New:** pure ranking + index builders under `src/shared/` (e.g. `src/shared/relatedness/` or `src/shared/services/relatedness-query-service.ts` + pure helpers).
- **New:** web hooks under `src/web/hooks/` (or library feature hooks if web library already has a feature folder — follow existing Library page patterns).
- **Do not** fold BM25 into `TagService`.
- **Do not** add Supabase tables, sync events, or Workers recommendation API in v1.
- **Do not** add MCP tools in v1.
- Index input = same highlight DTOs the web library already uses for browse (id, text/quote, url/domain, tags[], notes, encrypted flag if present).
- Rebuild index when library list data changes (load/refresh), not on every keystroke.

### UI

- **Tag filter context:** single active tag → optional **Related** block above results (Editorial kicker/section). Chips use existing tag chip patterns where possible.
- **Highlight detail:** **Related** compact rows + reason pills; click → existing detail navigation.
- Loading: if index not ready, brief skeleton or omit until ready (prefer omit/skeleton over layout jump spam).
- No related-tags on highlight detail in v1.
- No multi-tag-filter related-tags in v1.

### Analytics

- Emit `related_tag_clicked` / `related_highlight_clicked` via existing analytics path if any; otherwise minimal event bus/console-safe stub consistent with web app practice. Props: `{ rank, reason?: string }` — **no** full highlight text in events.

### Rollout

- Web library, all users who can open library browse for their mode.
- No feature flag required for v1.

---

## Out of scope (v1)

- Manual pin/hide related edges; user-authored tag graph  
- Capture-time / edit-time tag suggestions  
- Embeddings, LLM ranking, “AI related”  
- MCP exposure of relatedness  
- Extension popup / content-script surfaces  
- Materialized co-occurrence tables or background batch jobs  
- Cross-user or global tag graphs  
- Related tags on highlight detail  
- Multi-tag filter relatedness  
- Configurable weights UI  
- Storybook  

---

## Testing Decisions

Good tests assert ranking and gates, not CSS file paths.

1. **Unit — related tags:** co-occurrence Jaccard order; self excluded; stoplist excluded; df/N > 0.5 excluded; gate fails when df < 2; top-5 cap.
2. **Unit — related highlights:** self excluded; same-URL boost; per-URL cap of 2; zero-tag seed still returns text/URL neighbors; encrypted/unreadable text does not use BM25 on ciphertext; top-5 cap.
3. **Unit — reasons:** reason category reflects dominant signal.
4. **POC (manual/CI optional):** `node scripts/poc-relatedness.mjs <export> --gate` and `--synth-tags` remain green on checked fixture; not necessarily wired to CI in v1 unless cheap.
5. **UI (light):** if component tests exist for library, assert Related section renders when gate passes and hidden when it fails; prefer testing-library over screenshot.

No requirement for full Playwright in v1 unless library detail already has an e2e path — do not block on new e2e harness.

---

## Acceptance criteria

- [ ] Single tag filter + gate pass → Related tags section with ≤5 chips; click changes tag filter.
- [ ] Gate fail or multi-tag filter → Related tags section not shown.
- [ ] Highlight detail → ≤5 related rows with reason pills; no self; ≤2 per URL.
- [ ] Untagged seed still can show related highlights via text/URL when candidates exist.
- [ ] Encrypted/unreadable text not BM25-scored as plaintext.
- [ ] Stoplist / ultra-common tags not suggested.
- [ ] Unit tests cover scorer gates above.
- [ ] Click analytics events fired on related tag/highlight navigation.
- [ ] No new backend schema; no popup surface; no synth tags in product UI.
- [ ] `npm run type-check` (and project test target for new units) pass.

---

## Open questions (explicitly deferred — not blockers)

- Capture-time tag suggest as density fix (separate PRD).  
- Pin/hide overrides (v2).  
- Extension surfaces after web dogfood.  
- Weight tuning from click analytics.  
- ADR only if relatedness grows into a cross-cutting platform capability beyond this query module.

---

## Reference

- POC: `scripts/poc-relatedness.mjs`  
- Grill decisions: both features; navigate-first; web tag-filter + highlight detail; computed-only; session index; top 5/5; Editorial “Related”; spec-only docs.  
- Existing tags: `TagEntity`, `HighlightTagLink`, `TagService`, web `LibraryPage` / library access DTOs.
