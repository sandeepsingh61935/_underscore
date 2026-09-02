# PRD: Library Related Pages (Web Page Listing)

**Status:** `ready-for-agent`  
**Date:** 2026-09-02  
**Triage:** `ready-for-agent`  
**Source:** Product brainstorm + grilling lock-in (shared understanding confirmed)  
**Surfaces:** Web library page/section listing only  
**Does not reopen:** Library relatedness ranking for tags/highlights (2026-08-19); popup chrome ownership; library SoT per mode (ADR-029); tag entity/junction model; on-page capture sidebar wireframe  
**Related:** Library relatedness PRD (2026-08-19); popup-web parity PRD (2026-08-21) — popup related pages explicitly deferred  
**Test seams:** Pure `relatedPages` scorer (preferred); `RelatednessQueryService.relatedPages`; web library page listing visibility + navigation + analytics (see Testing Decisions)

---

## Problem Statement

I open a **page** in my web library — the list of underscores on this URL — to continue a thread. I see this page’s marks and the domain tree of sibling paths. I do **not** see anywhere else in *my* library that sits nearby.

Relatedness already exists, but only after I open **one highlight** (or filter to **one tag**). On the screen I actually browse, it is invisible. I do not want a second quote list, a PKM graph, or “the rest of this page” (the main list already is that). I want a short, honest jump to **other sites** I have already marked.

---

## Solution

When a **page/section** is selected in the web library, show a **Related pages** block in the **main column above** that page’s underscore list:

1. Up to **3** other library pages on **other domains**.
2. Seed = **all underscores on this page** (page-as-seed), not a hero quote.
3. Score a candidate page as the **max** highlight-to-highlight match (tags + text only). Hide the block if none score above zero.
4. Click opens that page’s listing (same as the library tree).
5. Reason pills: **Shared tags** / **Similar text** / both.

Existing related **tags** (single-tag filter) and related **highlights** (highlight detail) stay as they are.

**One-line product after ship:**  
From this page’s underscore list, I can jump to up to three other sites in my library that share labels or wording — or see nothing extra if there is no honest neighbor.

---

## User Stories

1. As a web library user with a **page/section** selected, I want a **Related pages** block above this page’s underscore list, so that I can continue a thread without opening a single highlight first.
2. As a web library user on **All**, I do not want Related pages, so that the block is not a global feed.
3. As a web library user on a **domain root** (no section), I do not want Related pages, so that place browsing stays the tree’s job.
4. As a web library user with **highlight detail** open, I do not want Related pages on that screen, so that quote-level related highlights remain the only relatedness there.
5. As a web library user, I want Related pages to list **pages** (domain + path + count), not quotes, so that this surface matches how I browse.
6. As a web library user, I want at most **3** related pages, so that the block stays smaller than a feed.
7. As a web library user, I want the block to appear when **at least one** related page qualifies, so that a single real neighbor is enough.
8. As a web library user, when **zero** pages qualify, I want the Related pages region **hidden** (no heading, no empty box), so that the UI does not promise a graph it cannot show.
9. As a web library user, I do not want the **current page** in Related pages, so that the main list remains the only list of this page’s marks.
10. As a web library user, I do not want **same-domain** sibling paths in Related pages, so that the left rail is not duplicated.
11. As a web library user, I want related pages to come from **other domains** only, so that a jump is actually somewhere else.
12. As a web library user, I want ranking to use **this page’s underscores as a bag** (all marks on the selected section), so that no single quote is an arbitrary hero.
13. As a web library user, I want a busy page not to outrank a better match just because it has more highlights, so that **max** pair score represents the page (not a sum).
14. As a web library user, I want score **≤ 0** candidates dropped, so that leftover URL/domain boosts cannot invent neighbors (those boosts do not apply across domains anyway).
15. As a web library user whose page has **no tags**, I still want related pages from **similar text** when they exist, so that untagged libraries are not a dead feature.
16. As a web library user whose page has tags, I want **shared tags** to count in ranking and in reason pills, so that labels I already applied do work.
17. As a web library user, I want a **reason pill** on every related page row (`Shared tags`, `Similar text`, or both), so that a cross-domain jump is explainable.
18. As a web library user, I do not want pills that say **Same page** or **Same domain**, so that reasons match the cross-domain rule.
19. As a web library user, I want each row to show **domain**, **section path**, and **highlight count** on that page, so that I know where I am going.
20. As a web library user, I want clicking a related page to open that **page listing** (domain + section in the library URL, no highlight id), so that I land on the same kind of screen I left.
21. As a web library user, I do not want click to open highlight detail or the domain root, so that grain stays pages.
22. As a guest on web library, I want Related pages computed only over highlights I can already list, so that relatedness cannot widen access.
23. As a signed-in user, I want Related pages to use the **same library SoT** as the rest of web browse (ADR-029), so that results match what I see in the tree.
24. As a user with **encrypted** or unreadable highlight text, I want text similarity to skip those docs, so that ciphertext is never treated as English.
25. As a user whose seed page text is unreadable, I still want related pages from **tags** when tags exist, so that the block can still help.
26. As a web library user who **searches or tag-filters** the current page list, I want Related pages to stay seeded from **all marks on this page** in SoT (not the filtered subset), so that the block does not flicker with local refine.
27. As a web library user, I want the relatedness **index rebuilt** when library data loads or refreshes, so that new captures can appear as neighbors without a special API.
28. As a web library user, I do not want Related pages to require a new backend, embeddings, or extra network beyond the library I already loaded, so that v1 stays a client-side query.
29. As a keyboard user, I want each related page row to be a focusable control that activates like other library navigation, so that I am not mouse-only.
30. As a screen-reader user, I want the block labeled **Related pages**, so that it is a named region, not anonymous links.
31. As a product owner, I want analytics **`related_page_clicked`** with non-PII props (rank, reason category), so that we can see whether page jumps are used.
32. As a product owner, I do not want this treated as a growth/retention bet in copy or scope, so that we do not inflate the scorer to “save” a habit loop.
33. As an implementer, I want **one** `relatedPages` query on the existing relatedness service, so that UI does not own ranking.
34. As an implementer, I want highlight-detail related highlights and tag-filter related tags **unchanged**, so that this PRD does not reopen 2026-08-19.
35. As an implementer, I do not want popup, third-column chrome, or on-page capture sidebar in this ship, so that scope stays the web page listing.
36. As a user with a **single-domain** library, I accept that Related pages will often be hidden, so that we do not fake neighbors from the same host’s tree.
37. As a user, I want a related page’s identity to be the same **domain + section path** the library already uses, so that navigation and counts match the tree.
38. As a user, when two highlights on a candidate host live on different paths, I want them to compete as **separate pages**, so that I land on the matching path, not a merged host.
39. As a user, when several highlights on one candidate page match, I want **one row** for that page (count ≥ 1), so that the list is pages not quotes.
40. As a user, I want stable ordering when scores tie (deterministic secondary keys), so that the block does not shuffle on refresh.
41. As a user, I do not want demo/synth tags or placeholder related pages, so that empty stays empty.
42. As a user who opens Related pages and hits the browser back button, I want to return to the previous page listing, so that jump-through is normal library navigation.

---

## Implementation Decisions

- **Add** a pure `relatedPages` query over the existing in-memory relatedness index. UI must not rank.
- **Extend** the relatedness query service with `relatedPages(seedDomain, seedSection, limit?)` default **limit 3**. Rebuild behavior unchanged (library load/refresh).
- **Do not** change `relatedHighlights` / `relatedTags` ranking, caps, or pills.
- **Page identity:** library **domain + section path** (same as web library URL `domain` + `section`). Derive from existing index docs using the same section-key rules the library already uses for grouping. Do not invent a parallel URL key.
- **Seed:** every index doc whose domain + section equals the selected page. If the seed set is empty, return `[]`.
- **Candidates:** group remaining docs by domain + section. Drop groups whose **domain equals the seed domain**. Drop the seed page (already excluded by domain rule plus explicit current-page exclusion).
- **Pair score:** reuse the highlight relatedness **tag** and **text (BM25)** terms and the same “similar text” floor for pills. **Do not** add same-URL or same-domain boosts on this path (they are structurally zero under the cross-domain rule; do not use them as reasons).
- **Page score:** **max** pair score between any seed doc and any doc in the candidate page. Not sum. Not max + log(count).
- **Drop** candidate pages with page score ≤ 0.
- **Sort** by page score desc, then a deterministic tie-break (e.g. tag signal, then text signal, then domain, then section).
- **Take 3.**
- **Reason:** from the **winning pair** (the max): `Shared tags` if tag overlap > 0; `Similar text` if BM25 above the existing text-reason floor; combine with the same separator style as highlight reasons. If a page scores but neither pill would fire, still drop or treat as non-qualifying — do not invent “Same domain.”
- **Row payload** (shape of the decision):

```
RelatedPageReason = 'Shared tags' | 'Similar text' | 'Shared tags · Similar text'

RelatedPageResult = {
  domain: string
  section: string
  score: number
  highlightCount: number
  reason: RelatedPageReason
  signals: { sharedTags: boolean; similarText: boolean }
}
```

- **Web library:** when selection has **domain and section** and **no** open highlight, query related pages and render a main-column block **above** the page’s underscore list (still below related-tags if a single tag filter is also active). Hide the block when the result list is empty.
- **Click:** navigate with the existing library selection search builder: that `domain` + `section`, **no** `highlight`.
- **Filters:** relatedness seed is the page in SoT, not the currently refined/search-filtered list.
- **Chrome:** V2 Editorial tokens only. Named region “Related pages.” No third grid column. Do not inject rows into the domain tree rail.
- **Analytics:** `related_page_clicked` with rank (0-based or 1-based — match existing related-highlight click) and reason category; no quote text or URLs in the payload.
- **No** schema/migration, **no** new Workers/Supabase recommendation API, **no** MCP tool in this PRD.
- **Caps / guest:** no new capability gate. If the user can see the page listing, they can see Related pages over that same list.

---

## Testing Decisions

Good tests assert **external behavior**: given a seed page and a library of docs, which pages appear, in what order, with what reasons, and whether the web listing shows/hides/navigates. Do not assert BM25 internals, React structure, or CSS.

**Preferred seam (highest, existing):** pure relatedness module — same style as current related-highlights / related-tags unit tests (fixture docs → results). Add `relatedPages` cases there first.

**Service seam:** query facade returns the same rows; empty seed → `[]`; limit default 3.

**UI seam (web library page):** when a section is selected, a Related pages region appears iff results exist; hidden on All, domain-only, highlight detail, and empty results; click updates library search to the target domain+section without a highlight id; `related_page_clicked` fires with rank + reason. Follow existing web library page tests for related highlights/tags (`data-od-id` contracts).

**Cases the pure scorer must cover:**
- Current page excluded.
- Same-domain siblings excluded even when text/tags match strongly.
- Cross-domain text match appears.
- Cross-domain shared tags appear.
- Max vs sum: a long candidate page with many weak marks loses to a short page with one strong mark.
- Cap 3.
- Score ≤ 0 hidden.
- Encrypted seed/candidate text does not drive BM25.
- Two paths on the same foreign host are two pages.
- Deterministic order on score ties.

**Out of test scope:** popup, capture sidebar, changing highlight-detail relatedness.

---

## Out of Scope

- Extension popup (including section/subdomain views).
- On-page capture sidebar (“On this page”).
- Third library column or relatedness inside the domain tree rail.
- Related **highlights** or extra quote snippets on the page listing.
- Changing highlight-detail related highlights (including max 2 per URL) or related tags.
- Same-domain related pages.
- Sum / volume ranking, embeddings, AI reasons, or a recommendation backend.
- Treating this as a growth/retention program (copy, metrics north-star, or scope expansion).
- New library identity model (stay on existing domain + section path).

---

## Further Notes

Grill lock-in (Q1–Q15): page listing primary; completeness not growth; capture sidebar out; related pages grain; web only; hide if empty; never current page; page-as-seed; main-column block; cap 3; cross-domain only; show from 1; click → page listing; pills Shared tags / Similar text; page score = max.

Single-domain libraries will often hide the block. That is intended.

Tracker: https://github.com/sandeepsingh61935/_underscore/issues/49 (`ready-for-agent`). Local path under `docs/superpowers/specs/` is source of truth; re-sync the issue body when this file changes.
