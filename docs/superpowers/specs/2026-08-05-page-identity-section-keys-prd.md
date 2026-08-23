# PRD: Canonical Page Identity for Highlight Section Keys

**Date:** 2026-08-05  
**Status:** Ready for implementation  
**Triage:** `ready-for-agent`  
**Scope:** Shared page-URL normalization; section key derivation; highlight capture URL/path writers; Library section grouping, filter, delete, export, restore matching, and section-scoped AI  
**Related:** Section label rename (display aliases only); `getSectionKey`; `normalizePageUrl`; Library domain → section drill-down  

---

## Problem Statement

When a user highlights content on pages that distinguish resources via query parameters (for example transcript sites like `…/transcript?v=VIDEO_ID`, CMS pages like `…/view?id=…`, or search result URLs), the Library groups those highlights under a single section named only by the path (e.g. `/transcript`).

Different videos, posts, or result pages on the same host collapse into one section. Section open, section delete, section export, section summary, and “open original” / rehydrate-on-page behavior can then mix or wipe unrelated work.

Root causes:

1. Some capture paths store a URL without the query string.
2. Section keys and derived `path` values use **pathname only**, discarding search even when the stored URL still has it.
3. There is no single, shared rule for “same page vs tracking noise,” so behavior drifts across modes, export, delete, and restore.

---

## Solution

Introduce one **canonical page identity** used everywhere highlights are written, matched, and grouped into Library sections:

**identity = origin + pathname + cleaned search (no hash)**

- **Keep** query parameters that identify or materially change page content.
- **Drop** known tracking / attribution noise (`utm_*`, major click ids, common cache busters) and sort remaining keys so order does not create duplicate sections.
- **Drop** the URL hash for identity and section keys (in-page anchors and hash routers are out of scope for v1; see Out of Scope).
- At capture time, always persist the **normalized full page URL** and a **section path** derived from the same normalizer (pathname + cleaned search), never `origin + pathname` alone.
- `getSectionKey` continues to optionally prefix non-`www` subdomains; its path component must come from the canonical section path, not raw pathname-only.

Users then see distinct sections for distinct resources on the same path shell (e.g. `/transcript?v=AAA` vs `/transcript?v=BBB`), while the same article with only UTM params still lands in one section.

**Legacy highlights** already stored without query remain under bare paths (e.g. `/transcript`). No automatic migration in v1.

---

## User Stories

1. As a reader, I want highlights on two different transcript URLs (`?v=AAA` vs `?v=BBB`) to appear under two Library sections, so I can browse one video’s notes without the other’s.
2. As a reader, I want the same article shared with different `utm_*` params to stay one section, so campaign links do not fragment my Library.
3. As a reader, I want section delete for one resource not to delete highlights from other resources that share only the same path shell, so cleanup is safe.
4. As a reader, I want opening a section’s highlights to match only that resource’s page identity, so drill-down is trustworthy.
5. As a reader, I want returning to a page with extra tracking params still to restore the correct highlights, so rehydrate works after shared links.
6. As a reader, I want “open original” / stored URL to include the resource id query when I highlighted with it, so I land on the right content.
7. As a reader, I want search-result pages with different `q=` values to be different sections, so research threads stay separated.
8. As a reader, I want classic CMS pages (`?id=1` vs `?id=2`) to be different sections, so forums and legacy sites work.
9. As a reader, I want path-only sites (e.g. `/wiki/Topic`) to keep behaving as today, so existing libraries do not break.
10. As a reader, I want subdomain section prefixes (`blog · /docs`) to keep working with query-aware paths, so multi-subdomain sites stay clear.
11. As a Basic-mode user, I want capture to use the same page identity rules as Pro, so mode switch does not change grouping semantics.
12. As a Pro-mode user, I want persisted highlights to store normalized URL/path consistently, so cloud and local views agree on sections.
13. As a user who undoes and redoes a highlight, I want redo not to strip the query from the URL, so command history does not regress identity.
14. As a user exporting a section, I want export scope to use the same section key as the Library UI, so export matches what I see.
15. As a user running section summary / synthesize, I want digests bucketed by the same section keys, so AI scope matches Library sections.
16. As a user with section labels, I want labels to key off the new section keys for new highlights, so rename still attaches to the right bucket (legacy bare keys keep their own labels).
17. As a user with old highlights under bare `/transcript`, I want them to remain visible and deletable under that legacy key, so nothing disappears after upgrade.
18. As a user, I want param order (`?v=1&lang=en` vs `?lang=en&v=1`) not to create two sections, so accidental reordering is harmless.
19. As a user, I want `gclid` / `fbclid` / similar click ids not to split sections, so ads traffic does not pollute the Library.
20. As a user, I want common cache-buster params not to create a new section every visit, so the Library stays stable.
21. As a user on a page with only an in-page hash (`#section-2`), I want one section for the path, so anchors do not explode sections.
22. As a user highlighting after client-side navigation that changes `?v=`, I want the highlight to use the **current** location at highlight time, so soft navigation does not attach the wrong identity.
23. As a developer, I want a single normalizer and section-path helper as the only identity seam, so new call sites cannot reintroduce pathname-only bugs.
24. As a developer, I want a table-driven unit suite for merge/split cases, so regressions are caught without browser e2e for every site.
25. As a developer, I want invalid URLs to fail soft (fallback without throw), so bad data does not crash Library views.
26. As a signed-in user, I want domain-level Library grouping unchanged (still by domain), so only section level becomes query-aware.
27. As a user deleting a whole domain, I want all sections under that domain removed regardless of query shape, so domain delete remains complete.
28. As a user of export markdown/xlsx, I want section column/labels to show the canonical section path (including meaningful query), so exports are disambiguated.
29. As a user, I want empty search after cleaning to yield a path of `/` or the bare pathname (not a trailing `?`), so home and clean paths stay tidy.
30. As a QA engineer, I want explicit expected outcomes for ambiguous cases (pagination, lang, tab), so product intent is testable.
31. As a product owner, I want no schema migration and no rewrite of historical rows in v1, so rollout risk stays low.
32. As a user on `www` vs apex, I want identity host handling to follow existing domain utilities (no silent domain merge unless already defined), so section work does not invent new host policy.
33. As a reader on signed CDN URLs with signature query params, I want those params stripped when listed, so each open does not create a new section and privacy surface shrinks.
34. As a user, I want multi-value query keys handled deterministically (stable sort), so repeated tags do not flake.
35. As an agent implementing this, I want capture outliers that still build `origin + pathname` fixed to the normalizer, so Basic redo and any similar paths stop stripping search.

---

## Implementation Decisions

### 1. Single seam: page identity normalization

Add or extend a shared pure module responsible for:

| Operation | Responsibility |
|-----------|----------------|
| `normalizePageUrl(url)` | Canonical absolute URL for storage and equality: origin + pathname + cleaned search; no hash; stable host casing via URL parser; no throw on invalid input (return input or safe fallback consistent with current helper). |
| `getSectionPath(url)` (or equivalent pure helper) | Pathname + cleaned search string for section grouping (e.g. `/transcript?v=AAA`, or `/docs` when no search remains). |
| `getSectionKey({ url, path? })` | Existing subdomain prefix rules; path component must be section path (from `path` if already canonical, else derived via `getSectionPath(url)`). |

**Ideal number of seams: one.** All writers and readers of page identity call this module. Do not re-implement pathname-only extraction at call sites for section purposes.

### 2. Cleaning rules (v1 denylist, not allowlist)

When cleaning search:

- Drop parameters whose names:
  - match prefix `utm_`
  - are in a fixed set of known trackers / click ids, at minimum: `gclid`, `fbclid`, `msclkid`, `dclid`, `twclid`, `ttclid`, `mc_eid`, `mc_cid`, `igshid`, `_ga`, `_gl`
  - are common cache busters: `_`, `cache`, `cachebuster`, `cb`, `t` **only when the value looks like a pure timestamp/random token** — if that heuristic is too risky, start with exact names `_`, `cachebuster` and document `t` as follow-up
  - are common signed-URL / ephemeral auth noise when clearly named: `X-Amz-Signature`, `X-Amz-Credential`, `X-Amz-Date`, `X-Amz-Expires`, `X-Amz-Security-Token`, `Signature`, `Expires` (AWS-style) — strip these so CDN links do not fragment sections
- **Do not** strip generic names like bare `ref`, `src`, `from` in v1 (too easy to destroy real content ids).
- Sort remaining parameter names lexicographically; preserve multi-value order per key after name sort (define deterministic multi-value: sort values for the same key).
- Encode with standard `URLSearchParams` / `URL` behavior so `+` vs `%20` does not create duplicates.
- If no params remain, section path is pathname only (no trailing `?`).
- Hash is always cleared for identity.

**Ambiguous params kept intentionally (content may differ):** `page`, `lang`, `hl`, `tab`, `sort`, `view`, resource ids (`v`, `id`, `q`, etc.).

### 3. Capture and persistence

- Every highlight create/update path that sets `url` must set `url = normalizePageUrl(current page href at highlight time)`.
- Fix any path that still uses `origin + pathname` (notably command redo / simple highlight commands) so it cannot strip search.
- Prefer storing section path on the highlight when a `path` field is written by any adapter; if `path` is derived only at read time, derivation must use `getSectionPath(url)`, never pathname-only.
- Modes that already call `normalizePageUrl` must pick up tracking strip + sort automatically via the shared helper (no per-mode forks).

### 4. Section key consumers (behavior, not new APIs)

All of the following must group/filter with the updated `getSectionKey` / section path:

- Library domain details section list and counts  
- Section drill-down filter  
- Section-scoped delete  
- Highlight search section grouping  
- Export normalize/filter by section scope  
- Section summary cache keys and synthesize-by-section buckets  
- Dashboard / Ask current-section helpers that call `getSectionKey`  

No new IPC message types. No schema version bump required if `url` string simply becomes richer and `path` (when present) becomes pathname+search.

### 5. Matching for restore / library sync

Page match for “highlights on this tab” must compare **normalized** URLs on both sides (already the intent of `normalizePageUrl`). After cleaning, a live page with UTMs matches a stored highlight without UTMs for the same resource.

### 6. Host / domain policy unchanged

Domain extraction and Collections domain keys stay as today. This PRD does not merge `www` and apex, or http and https, unless existing utilities already do. Section work must not invent host rewrites.

### 7. Trailing slash

v1: **no** forced trailing-slash normalization. `/transcript` and `/transcript/` remain distinct if the site uses both. Document as known minor split risk.

### 8. Legacy data

- No backfill job.
- Bare-path section keys remain valid for historical rows.
- New captures use query-aware keys.
- Optional later: “split legacy section by stored url search if recoverable” — out of scope.

### 9. Display

- Default section title remains the section key string (or `Home` for `/`), consistent with existing Library/export.
- Custom section labels continue to be display-only aliases keyed by section key; no change to label store shape.
- Pretty titles from `document.title` are out of scope.

### 10. Privacy

- Prefer not logging full raw query strings with tokens in production logs.
- Stripping signature params reduces accidental persistence of short-lived secrets in Library URLs.

### 11. Prototype decision shape (from design discussion)

```
normalizePageUrl(href) ->
  parse URL
  hash = ""
  search = cleanAndSort(searchParams)  // denylist + sort
  return origin + pathname + search

getSectionPath(url) ->
  pathname + cleanedSearch   // e.g. "/transcript?v=AAA"

getSectionKey({ url, path? }) ->
  sectionPath = path ?? getSectionPath(url)
  if non-www subdomain: return `${subdomain} · ${sectionPath}`
  return sectionPath
```

---

## Testing Decisions

### What makes a good test here

- Assert **external equality**: same/different section keys and normalized URLs for concrete input strings.
- Do **not** assert internal denylist array structure or private helpers’ names.
- Prefer pure unit tests on the identity seam; avoid full extension e2e for each website pattern.
- One small integration-style unit test can wire: given a highlight-like object with a full URL, export/filter or delete-scope predicate treats two resources as different sections.

### Primary modules under test

1. **Page URL normalizer** (highest value seam)  
2. **Section path + `getSectionKey`**  
3. **Regression:** any capture helper or pure function that builds stored `url` from a location-like input (if extractable); otherwise a focused unit/integration test that the redo/create payload builder uses normalize (mock location).  
4. **Consumers that re-derived pathname only** — update tests if they hard-code pathname-only expectations; add one test each for delete-scope and export section filter if pure functions exist.

### Prior art in repo

- `tests/unit/shared/utils/section-key.test.ts` — extend heavily.  
- `tests/unit/shared/utils/domain-from-url.test.ts` — table-style pure URL tests.  
- Highlight export tests that assert `sectionKey` values.  
- Vitest unit suite conventions under `tests/unit/`.

### Required test suite (table-driven)

#### Suite N — `normalizePageUrl` / clean search

| ID | Input A | Input B / notes | Expect |
|----|---------|-----------------|--------|
| N1 | `https://ex.com/a?v=1` | — | keeps `v=1`, no hash |
| N2 | `https://ex.com/a?v=1#x` | — | hash stripped |
| N3 | `…?v=1&utm_source=tw` | `…?v=1` | equal after normalize |
| N4 | `…?v=1&utm_campaign=x&utm_medium=y` | `…?v=1` | equal |
| N5 | `…?v=1&gclid=…` | `…?v=1` | equal |
| N6 | `…?v=1&fbclid=…` | `…?v=1` | equal |
| N7 | `…?b=2&a=1` | `…?a=1&b=2` | equal (sorted) |
| N8 | `…/a` | `…/a?` | equal tidy path (no empty search) |
| N9 | invalid string | — | no throw; stable fallback |
| N10 | `http://Ex.COM/Path` | host lowercased per URL rules | stable host |
| N11 | signed URL with `X-Amz-Signature` | same path without signature params | equal after strip |
| N12 | only `utm_*` params | path-only URL | equal (landing page merge) |

#### Suite S — section path / `getSectionKey` **split**

| ID | Case | Expect distinct keys |
|----|------|----------------------|
| S1 | `/transcript?v=AAA` vs `?v=BBB` | yes |
| S2 | `/index.php?id=1` vs `id=2` | yes |
| S3 | `/search?q=cats` vs `q=dogs` | yes |
| S4 | `/wiki/Foo` vs `/wiki/Bar` | yes (path-only control) |
| S5 | `blog.ex.com/docs?id=1` vs apex | subdomain prefix rules preserved |
| S6 | `?page=1` vs `?page=2` | distinct (pagination kept) |
| S7 | `?lang=en` vs `?lang=de` | distinct |
| S8 | `?tab=a` vs `?tab=b` | distinct |

#### Suite M — section path **merge**

| ID | Case | Expect same key |
|----|------|-----------------|
| M1 | resource + utm vs resource | same |
| M2 | resource + gclid vs resource | same |
| M3 | param order swap | same |
| M4 | hash-only difference | same |
| M5 | empty utm value vs absent | same |

#### Suite C — capture / match regressions

| ID | Behavior |
|----|----------|
| C1 | Building stored URL from a location with search must include cleaned search (not origin+pathname only). |
| C2 | `normalizePageUrl(liveWithUtm) === normalizePageUrl(storedWithoutUtm)` for same resource → restore match. |
| C3 | Section filter predicate: highlight A matches section key for A, not for B, when only `v` differs. |
| C4 | Existing section-key tests for www / non-www still pass with query-aware paths. |

#### Suite L — legacy

| ID | Behavior |
|----|----------|
| L1 | Highlight with `url` lacking search and path `/transcript` still keys as `/transcript`. |
| L2 | New highlight with `?v=AAA` does **not** share key with legacy bare `/transcript` (accepted split). |

### Non-goals for automated tests in v1

- Full browser e2e on youtubetotranscript.com  
- Hash-router SPAs  
- Cloud migration of historical rows  
- Exhaustive list of every ad network parameter  

### Definition of done (tests)

- All suites N, S, M, C, L green in unit CI.  
- No remaining production call site that derives section grouping via pathname-only when the URL has a non-empty cleaned search (grep gate optional but recommended in PR checklist).

---

## Out of Scope

- Hash-based SPA routing as page identity (`#/route/id`)  
- Automatic migration / re-key of historical highlights  
- Per-site allowlists of “id parameters”  
- Pretty section titles from page title or oEmbed  
- Trailing-slash unification  
- Merging www/apex or http/https beyond existing domain helpers  
- Changing domain-level Collections grouping  
- Cloud schema changes or new Supabase columns  
- Stripping every possible analytics param in the wild (denylist is best-effort and extensible)  
- Using section identity for billing or auth  
- Web app-only UI redesign for long query section labels  

---

## Further Notes

### Motivation example

`https://youtubetotranscript.com/transcript?v=zDY5vuMW90s` must not share a Library section with another `v=` on the same path. That failure is an instance of a general class: **resource identity in the query string**.

### Risk register (accepted in v1)

| Risk | Mitigation |
|------|------------|
| Unknown trackers still split sections | Extensible denylist; ship common set |
| Session params (`sid`) not fully covered | Add names as discovered; tests for known ones |
| Ugly section labels with long queries | Accept; labels feature can rename |
| Legacy mixed bucket under bare path | Document; no migration |
| Soft nav wrong URL if cached at page load | Capture **at highlight time** only |
| Aggressive strip of `t` or `ref` | Avoid broad strips; prefer narrow denylist |

### Implementation order (suggested)

1. Expand normalizer + section path pure API + full unit tables.  
2. Point `getSectionKey` and all pathname-only section derivations at section path.  
3. Fix capture outliers (`origin + pathname`).  
4. Run type-check / unit suite; grep for pathname-only section derivation.  
5. Manual smoke: two transcript IDs → two sections; same page + utm → one section; restore with extra utm works.

### Glossary (project terms)

- **Domain** — Library top-level group (host-oriented).  
- **Section / section key** — drill-down group within a domain (`getSectionKey`).  
- **Page identity** — canonical URL used to decide “same page” for storage match and section path.  
- **Highlight** — user selection persisted with text, ranges, url, and related metadata.  
- **Normalize** — pure transform of a URL string for comparison and storage consistency.

---

## Proposed testing seams (for implementer confirmation)

| Seam | Level | Role |
|------|-------|------|
| **Page identity module** (`normalizePageUrl` + section path) | Pure shared utils — **primary** | Single source of truth; own the full N/S/M tables |
| **`getSectionKey`** | Pure shared utils | Subdomain + section path composition |
| **Delete / export section predicates** | Pure functions already used by services | One regression each that query-aware keys filter correctly |
| **Capture URL builder** | Content command / mode write path | Ensure no `origin+pathname` regression |

Prefer not adding new architectural layers (no new repository, no IPC, no worker).
