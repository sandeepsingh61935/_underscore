# PRD: Extension Popup ← Web App Product Parity

**Status:** Ready for agent  
**Date:** 2026-08-21  
**Triage:** `ready-for-agent`  
**Direction:** Replicate **web app** product checklist **into the extension popup** (not the reverse)  
**Surfaces:** Extension popup primary; shared presentation modules as needed  
**Does not reopen:** V2 Editorial popup chrome ownership (`PopupShell` sole owner of chrome); event-sourcing sync SoT; ADR mode feature boundaries; retired in-app Ask/Chat product  
**Related:** Web OD parity PRD (2026-08-05); Library relatedness PRD (2026-08-19); free-window integrations-only; cloud-first library ADR-029  
**Test seams:** User-approved (caps/plan pure helpers, library presentation adapters, relatedness service, shared highlight card contract, home view-model, settings section gates, guest/empty copy matrix, PopupShell chrome contract, shared confirm-dialog copy)

---

## Problem Statement

I use _underscore in the browser popup every day to capture and skim highlights, and I use the web app when I want the fuller product: richer Home, master–detail Library, related tags/highlights, clearer guest vs account language, and settings organized by Account / Plan / Appearance / Integrations / Data.

Those two surfaces share a brand (V2 Editorial tokens) and much of the backend vocabulary, but they do **not** feel like the same product UI. On the popup I get a lean Home, stacked library drill-ins, a different highlight card, extension-only empty states, and a single scrolling Settings page centered on **modes**. On the web I get greeting + stats + active pages, URL-synced library selection, relatedness, tabbed settings, and plan/caps language.

When I bounce between popup and web—or when I evaluate the extension for Firefox/Mozilla listing next to the web product—I should not have to relearn IA, cards, guest rules, or settings topics. Today I do.

## Solution

Bring the **web app product checklist** into the extension popup within the fixed popup chrome (title strip, optional mode header, tab bar, body-only views):

1. **Home** gains web-equivalent structure adapted to 400×600: status/greeting, current-page pack (still tab-aware on popup), active pages from library, richer recent stream, honest first-run/guest empties—without resurrecting Chat/Ask.
2. **Library** keeps popup stack navigation where it fits, but adopts web-grade list behaviors: shared search/filter bar (already shared), explicit sort, clearer empty/no-match states, shared highlight card behaviors (notes/tags/delete/read-only), and **relatedness** hosted on popup detail/expand paths using the existing relatedness service over current-mode library SoT.
3. **Settings** exposes the same **topics** as web tabs (Account, Plan, Appearance, Integrations, Data) inside popup scroll or segmented sections—while **retaining extension mode** controls as a first-class extension concern (not deleted in favor of plan-only).
4. **Guest and empty copy** is one matrix across surfaces: no retired Chat mentions; guest-with-local-highlights remains valid on popup; guest empty is calm and consistent with web tone.
5. **One shared highlight card contract** (or a single implementation with density variants) replaces dual web/popup cards for quote/meta/notes/tags/delete.
6. **PopupShell chrome ownership stays locked**—parity is body content and shared modules, not a web sidebar shoved into the popup.

**One-line product after ship:**  
Opening the extension popup feels like the same _underscore product as the web app—compressed for the popup—not a second, older UI.

---

## User Stories

### Product identity and chrome

1. As a **reader**, I want Home, Library, and Settings to mean the same things in the popup as on the web, so that I do not relearn navigation.
2. As a **reader**, I want V2 Editorial tokens (paper/ink/accent, serif/sans/mono, step scale) on every popup body surface, so that brand matches the web app.
3. As a **reader**, I want popup chrome (title strip, mode header when shown, tab bar) unchanged in ownership, so that motion and layout stay stable.
4. As a **reader with reduced motion**, I want calm view transitions in the popup, so that parity work does not add noisy motion.
5. As a **Firefox user**, I want parity work not to depend on Chrome-only UI APIs, so that Mozilla distribution stays viable.
6. As a **reader**, I never want in-app Chat/Ask resurrected in popup copy or CTAs, so that retired product is not advertised.

### Guest, account, and capabilities

7. As a **guest on the popup**, I want a clear “local only” status, so that I understand sync/export/integrations need sign-in.
8. As a **guest with local highlights**, I want those highlights still visible in popup Home/Library, so that capture on this device is not gaslit as empty.
9. As a **guest with zero highlights**, I want a calm first-run empty aligned with web tone, so that I know how to start (highlight on a page).
10. As a **guest**, I want Sign in CTAs in the same situations as web (banner/empty/settings), so that upgrade path is obvious.
11. As a **signed-in Free user**, I want plan/capability language consistent with web (sync/export vs integrations gates), so that entitlements do not contradict the web app.
12. As a **signed-in Paid or early-access user**, I want Integrations availability to match product rules (including free-window policy), so that popup and web do not disagree.
13. As a **past-due user**, I want honest lock copy and a path to fix billing, so that status matches web.
14. As a **user**, I want capability checks expressed through shared pure helpers where possible, so that popup and web cannot drift on flags.

### Home (popup)

15. As a **signed-in user on Home**, I want a greeting or identity line comparable to web, so that Home feels personal—not only a raw count string.
16. As a **guest on Home**, I want title/kicker language consistent with “local library,” so that guest mode is explicit.
17. As a **user on Home**, I want highlight and page (or domain) pulse stats, so that I get a web-like library pulse without opening Settings.
18. As a **user on Home**, I want a **current page** pack driven by the **active browser tab** when available, so that popup keeps its capture-context superpower.
19. As a **user on Home** when the tab has no domain, I want an honest empty current-page state, so that I am not shown a fake page.
20. As a **user on Home**, I want highlights on the current page listed or summarized with a path into Library section scope, so that I can resume work on this tab.
21. As a **user on Home**, I want an **active pages** list derived from library activity (web-like), so that I can jump to other sites I have been marking.
22. As a **user on Home**, I want a **recent highlights** stream with a clear cap and show-more behavior, so that skimming matches web density expectations inside the popup.
23. As a **user on Home**, I want recent items to support open-in-library and copy at minimum, so that quick actions remain useful.
24. As a **signed-in user on Home**, I want notes/tags affordances on recent items consistent with the shared card contract when space allows, so that Home is not a dead read-only strip.
25. As a **user with an empty library on Home**, I want `first-run` empty content that does not mention Chat, so that onboarding matches current product.
26. As a **user on Home**, I want primary next actions (e.g. open Library, sign in) rather than dead ends, so that Home always leads somewhere.
27. As a **user**, I do not want full LibraryPulse duplication to be required on Home if stats already cover the pulse, so that Home stays lean in 400×600.

### Library (popup)

28. As a **user on Library**, I want domain browsing and section drill-in, so that site structure remains navigable in the popup stack.
29. As a **user on Library**, I want the shared search bar (query, fields, refine, tags) to behave like web, so that finding marks is one skill.
30. As a **user on Library**, I want **explicit sort** (newest, oldest, domain, quote) comparable to web, so that order is under my control.
31. As a **user on Library**, I want no-match and no-highlight empty states with clear reset actions, so that failed search is recoverable.
32. As a **user on Library**, I want domain and section delete with the same confirm copy family as web, so that destructive actions feel identical.
33. As a **user on Library**, I want export at entitled scopes with the same capability gates as web, so that export availability matches account state.
34. As a **user viewing a highlight**, I want one **shared card** experience (quote, meta, notes, tags, delete, read-only), so that popup and web do not teach two editors.
35. As a **user editing notes/tags in the popup**, I want persistence through existing extension data paths, so that edits survive and sync per mode rules.
36. As a **user with a single tag filter active**, I want **related tags** (service-gated, top results) in the popup library UI when space allows, so that discovery matches web.
37. As a **user on highlight detail/expand in the popup**, I want **related highlights** with reason pills when the service returns results, so that I can continue a thread without opening the web app.
38. As a **user when relatedness gates fail**, I want the related section hidden (not a broken empty box), so that sparse libraries stay calm.
39. As a **guest on Library with local data**, I want local domains/highlights listed plus a sync/sign-in banner, so that guest local SoT remains honest.
40. As a **guest on Library with zero data**, I want empty copy aligned with web tone (plus popup capture hint such as keyboard shortcut if still accurate), so that I know how to start.
41. As a **user deep in domain/section**, I want back navigation labels consistent with chrome back affordances, so that stack nav stays understandable.
42. As a **user**, I want library body views to remain body-only (no second shell), so that chrome ownership stays valid.

### Settings (popup)

43. As a **user on Settings**, I want the same **topics** as web—Account, Plan, Appearance, Integrations, Data—so that I can find things by the same names.
44. As a **user on Settings**, I want those topics reachable via clear section headers or a compact segmented control suitable for popup width, so that I am not lost in an unstructured scroll.
45. As a **extension user**, I still want **mode** controls (basic/pro/paid packaging as product defines), so that extension-native mode is not removed by web plan IA.
46. As a **guest in Account**, I want local-card / sign-in messaging consistent with web guest account state, so that account status is honest.
47. As a **signed-in user in Account**, I want identity, plan pill, and capability summary consistent with web, so that account glance matches.
48. As a **user in Plan**, I want Free vs Paid explanation and Polar checkout/portal CTAs consistent with web, so that billing never collects cards in-extension.
49. As a **user returning from Polar**, I want success/cancel/pending banners and sync affordance consistent with web, so that webhook lag is survivable.
50. As a **user in Appearance**, I want Light / Dark / System theme parity with web, so that theme preference matches.
51. As a **user in Appearance**, I want typography controls that honestly match what the extension can apply (presets / specimen / highlight type as product already supports), so that we do not claim “same system” without delivering.
52. As a **user in Appearance**, I want density control **only if** popup layout meaningfully honors it; otherwise density stays web-only, so that fake controls are not shipped.
53. As a **user in Integrations**, I want MCP/connect flows consistent with current integrations-only policy (no API-key Ask setup), so that popup matches web Integrations.
54. As a **user in Data**, I want sync now, export, and last-synced presentation consistent with web Data tab language, so that data tools are familiar.
55. As a **user in Data**, I want delete-library (or clear local) to remain available where extension SoT allows, with shared confirm copy, so that destructive data actions stay extension-capable even if web defers bulk delete.
56. As a **user**, I want Sign out with confirm, so that account exit is deliberate.
57. As a **user**, I want feature gates (export/sync/integrations/tags) to disable or lock with the same subtitle patterns as web, so that locks feel productized—not broken buttons.

### Auth (alignment, not full redesign)

58. As a **user signing in from the popup**, I want email + Google flows to remain available, so that auth does not regress.
59. As a **user on popup auth**, I want copy hierarchy and legal links tone-aligned with web sign-in, so that auth feels like one product.
60. As a **user on forgot/reset/verify**, I want step flows to remain complete in popup, so that recovery does not force a confusing web-only detour without links.
61. As a **user**, I want Terms and Privacy reachable from popup auth via the same canonical docs, so that legal is consistent.

### Empty, error, and edge states

62. As a **user**, I want a single guest/empty **copy matrix** applied on Home and Library, so that strings do not fork by surface without reason.
63. As a **user hitting load failure**, I want an explicit retry/error state comparable to web “couldn’t load” tone, so that spinner-forever is not the only failure mode.
64. As a **user with no search matches**, I want “No matches” + clear filters, so that search failure matches web.
65. As a **user on an empty section**, I want section-empty copy with back to domain, so that drill-in dead ends are guided.
66. As a **user**, I never want demo/fake library data injected to simulate web, so that trust stays intact.

### Quality, a11y, and agent safety

67. As a **keyboard user**, I want focusable controls and visible focus using design tokens, so that popup parity is accessible.
68. As a **screen reader user**, I want section headings and button names that match visible purpose, so that IA parity includes semantics.
69. As a **developer/agent**, I want shared modules preferred over copy-paste from web pages, so that the next drift is harder.
70. As a **developer/agent**, I want extension build, type-check, and existing popup chrome tests green, so that parity does not destabilize capture.
71. As a **developer/agent**, I want web app behavior not regressed except where intentionally sharing modules, so that web remains the reference implementation.
72. As a **reader on a narrow popup**, I want layouts that stack and clip gracefully at 400×600, so that web desktop patterns are adapted—not pasted.

---

## Implementation Decisions

### Product direction

- **Source of truth for product checklist:** current web app IA and behaviors (Home, Library, Settings topics, relatedness, guest tone), adapted to popup constraints.
- **Source of truth for popup chrome:** existing PopupShell contract; views stay body-only.
- **Source of truth for library data in popup:** existing extension mode SoT and IPC/repositories—not web `useWebLibrary` hooks.
- **Do not port** web sidebar, web routing URLs, or web-only bulk constraints that contradict extension capabilities (e.g. extension may keep delete-library even if web still defers it).
- **Do not resurrect** Ask/Chat UI or copy.

### Shared capability model

- Introduce or extend **pure capability/plan helpers** consumed by popup settings/home/library gates, aligned with web caps semantics (guest/free/paid/past-due/export/sync/tags/integrations/free-window).
- Extension **mode** remains an additional axis (mode header + settings mode controls). Plan/caps language should compose with mode, not replace it silently.
- Billing CTAs continue to use Polar checkout/portal patterns already present; no in-extension card forms.

### Home

- Build a **home view-model** seam: inputs include auth, mode, dashboard/library aggregates, and **current tab context**; outputs drive status/greeting, stats, current-page pack, active pages, recent stream, empty kind.
- Keep **tab-aware current page** as popup differentiator; derive **active pages** from library activity like web (exclude or include current per product choice documented in implementation notes).
- Recent stream: raise information density toward web card actions via shared card contract; keep collapse/show-more to fit popup.
- Replace Chat-mentioning guest strings everywhere touched.

### Library

- Keep domain → section stack navigation in popup unless a thin master–detail fits without breaking chrome; do not require web URL query selection inside the popup.
- Add **explicit sort** control to library list scopes (all / domain / section / search results as applicable).
- Host **related tags** when a single tag filter is active and service gates pass; host **related highlights** on expand/detail.
- Reuse existing **RelatednessQueryService** (or shared package entry) over highlights already loaded for the current mode; build index in memory; no new persistence tables in v1.
- Prefer shared search/filter utilities and HighlightSearchBar already used on both surfaces.

### Shared highlight card

- Define a **single card contract** covering: quote/body, domain/path/time meta, match badge, notes edit, tags edit, tag chip → filter, delete confirm, copy, read-only mode, optional compact/dense variant for Home.
- Migrate popup tiles and web card usages toward that contract (popup migration is in scope; web switch to the shared contract is in scope **when required** to avoid three implementations—prefer two→one, not two→three).
- Persistence callbacks stay injected by host (extension hooks vs web hooks).

### Settings

- Reorganize popup Settings into named sections matching web topics: Account, Plan, Appearance, Integrations, Data.
- Presentation: sticky section nav or segmented control + scroll-to-section is acceptable; full web tab routes are not required inside popup.
- **Mode** block remains visible for extension (placement: Account or a dedicated Mode subsection under Account/Plan—choose one and keep consistent).
- Appearance: theme parity required; typography parity to the extent extension already applies type presets to UI/highlights; density only if popup layout CSS honors it.
- Data: sync, export, last synced, delete library (extension-enabled) with shared confirm copy.
- Integrations: MCP/connect only per integrations-only standard; align lock banners with web.

### Auth and legal

- No full rewrite of popup auth required for v1 parity; align hierarchy, primary CTA labels, and legal footer behavior with web sign-in tone.
- Keep recovery steps working in popup.

### Empty/error matrix

- Centralize guest/empty/error **copy keys** (pure module) for: home first-run guest/signed-in, library guest zero, library guest with local, no matches, empty section, load failure.
- Remove or rewrite any “Chat” strings on surfaces touched.
- Prefer explicit error + retry over infinite loading where data hooks allow.

### Architecture constraints

- ISP/DI and repository patterns remain; UI does not call repositories directly.
- No raw `chrome.runtime.sendMessage` from views—hooks only.
- No hardcoded hex in TSX; no Tailwind; V2 tokens only.
- New cross-surface patterns that change architecture require an ADR; pure presentation extraction does not.

### Phasing (recommended for agents)

1. **P0 — Truth & copy:** guest/empty/error matrix; remove Chat; capability helper alignment.  
2. **P1 — Shared card contract** + popup Home/Library adoption.  
3. **P2 — Home view-model** (stats, active pages, richer recent).  
4. **P3 — Library sort + relatedness host** in popup.  
5. **P4 — Settings topic IA** + billing/integrations/data parity.  
6. **P5 — Auth tone pass** and residual empty-state component consolidation.

Agents may collapse phases if tests stay green, but should not ship Settings chrome rewrites before P0 copy/capability truth.

---

## Testing Decisions

### What good tests look like

- Test **external behavior**: given auth/mode/caps/library fixtures, user-visible sections, gates, labels, and callbacks fire correctly.
- Prefer **pure functions** and view-model tests over brittle full-popup pixel tests.
- Do not assert implementation details (internal React state shape, exact CSS class strings from web OD) unless those classes are the public contract.
- Use existing Vitest + Testing Library patterns; mock IPC/data hooks at boundaries already used by popup tests.

### Seams to test (approved)

1. **Capability/plan pure helpers** — flag matrix for guest/free/paid/past-due/free-window.  
2. **Library presentation adapters** — sort, filter pipeline integration with shared search utils.  
3. **Relatedness service** — existing service tests remain authoritative; popup hosts only integration/smoke.  
4. **Shared highlight card contract** — notes/tags/delete/read-only/copy behaviors via RTL.  
5. **Home view-model** — tab context + aggregates → section visibility and empty kind.  
6. **Settings section gates** — which actions enabled + lock reasons.  
7. **Guest/empty copy matrix** — pure string/module tests.  
8. **PopupShell / buildChrome** — existing tests must remain green (no chrome regressions).  
9. **Confirm-dialog copy** — existing shared tests remain authoritative.

### Prior art

- Popup chrome tests and PopupShell tests.  
- Web Home/Library/Settings page tests (behavior + caps).  
- Relatedness unit tests and web library integration.  
- Settings billing CTA pure helper tests.  
- Highlight card / delete confirm tests on both surfaces.  
- Confirm-dialog copy unit tests.

### Regression bar

- `type-check` and unit tests for touched modules pass.  
- Extension popup build succeeds.  
- Web build/tests pass if shared modules change.  
- Manual smoke: guest local capture → appears on popup Home/Library; signed-in library search/sort; settings plan CTA visibility; relatedness appears only when gated.

---

## Out of Scope

- Pixel-perfect clone of web sidebar, top bar, or desktop breakpoints inside the popup.  
- Replacing popup data layer with web Supabase hooks or running the web router inside the popup.  
- Reintroducing Ask/Chat product UI, models provider setup for chat, or grounded ask projects.  
- Changing sync protocol, event sourcing, or cloud-first SoT rules (ADR-029) except where UI must display them.  
- Mozilla/AMO listing assets, store screenshots, or reviewer Q&A (can follow separately).  
- Content-script highlight painting redesign (except if shared type presets already affect it—no broad CSS rewrite required).  
- Forcing web to drop features to match old popup (direction is web → popup).  
- New mobile native apps.  
- Bulk import tools, PKM graph editors, or embeddings infra beyond existing relatedness.  
- Making density a no-op control on popup (either implement or omit—do not fake).

---

## Further Notes

- **Form factor honesty:** Web remains the large-canvas reference; popup is a deliberate compression. Parity means shared IA names, behaviors, cards, and copy—not identical layout trees.
- **Guest asymmetry is real:** Popup can show device-local highlights while web guest library is empty by architecture. Copy must explain that; do not empty the popup guest library to “match” web.
- **Mode vs plan:** Web speaks Free/Paid; extension also speaks modes. Settings should show both without contradicting entitlements.
- **Relatedness** was specified web-first; popup is a new host, not a fork of the algorithm.
- **Mozilla:** UI parity is product quality for listing screenshots and user trust; it is not an AMO automated requirement. Still valuable before marketing extension + web as one product.
- **Wireframes:** Prefer existing extension v2/v3 home/library/settings kits where they already moved toward this IA; when conflict, **web product behavior wins** for checklist items in this PRD, popup chrome constraints win for shell.
- **Success metric:** A user who knows the web app can open the popup and find Home/Library/Settings concepts, guest truth, highlight editing, and account/plan/data tools without surprise—while capture remains tab-aware and fast.
