# PRD: Web App Open Design Parity

**Status:** Ready for agent  
**Date:** 2026-08-05  
**Triage:** `ready-for-agent`  
**Source of truth (design):** Open Design *Web Prototype* → `underscore-web-app-prototype.html`  
**Related:** OD `billing-ui-plan.md`; brainstorming design 2026-08-05  
**Test seams:** User-approved (caps, billing pure fns, useWebLibrary mock, routes/query, shell, Ask lock, no chrome on web)

---

## Problem Statement

As a reader using the _underscore web app, I open the site expecting a full product experience—sidebar navigation, a home dashboard of my library, a real library browser, Ask, and account/billing settings—matching the polished Open Design web prototype running locally. Instead I get a thin Welcome/auth shell that reuses extension-oriented collections views without product chrome, without the designed IA, and without a coherent path for Guest → Free → Paid. The designed web app exists in OD; the codebase has not shipped it.

## Solution

Port the Open Design web app prototype into the Vite web SPA with full visual and interaction parity: a collapsible sidebar shell, product routes Home / Library / Ask / Settings, Polar billing UX, guest-accessible shell with capability gates, and a Supabase-backed web library data layer. Public Welcome and auth pages stay outside the shell. Legacy URLs redirect into the new IA. Implementation proceeds shell-first in vertical slices so chrome and navigation ship early.

---

## User Stories

1. As a **guest visitor**, I want to enter the product shell without signing in, so that I can understand the product and browse an empty local library experience.
2. As a **guest**, I want a clear guest banner and Sign in CTAs, so that I know sync, export, and Ask require an account.
3. As a **signed-in Free user**, I want to see my cloud library on Home and Library, so that highlights saved via the extension appear on the web.
4. As a **signed-in Paid user**, I want Ask unlocked, so that I can question my library from the web app.
5. As a **user**, I want a sticky sidebar with Home, Library (with highlight count), Ask, and Settings, so that I can navigate the product like the OD prototype.
6. As a **user**, I want to collapse the sidebar to a narrow rail, so that I get more workspace on desktop.
7. As a **user on a phone**, I want a bottom tab bar and a drawer menu, so that primary navigation works on small screens.
8. As a **user**, I want the top bar to show the current route, a short hint, my plan pill, and a primary CTA, so that context and next actions are always visible.
9. As a **guest**, I want the plan pill and user foot to say Guest, so that my status is honest.
10. As a **Free user**, I want the plan pill to say Free, so that I understand my tier.
11. As a **Paid user**, I want the plan pill to say Paid, so that I see AI is entitled.
12. As a **user**, I want Home to greet me by time of day (and name when signed in), so that the app feels personal.
13. As a **guest on Home**, I want the title “Your local library” and “Local only” kicker, so that guest mode is explicit.
14. As a **user on Home**, I want stats for Highlights, Pages, This week, and Plan, so that I get a pulse of my library.
15. As a **user on Home**, I want a current-page pack (most recently active page), so that I can resume where I left off even without a live browser tab.
16. As a **Paid user on Home**, I want “Ask this page” when that page has highlights, so that I can ground Ask quickly.
17. As a **user on Home**, I want a list of other active pages, so that I can jump into Library filtered to a site.
18. As a **user on Home**, I want up to six recent highlights with a path to view all, so that I can skim latest saves.
19. As a **Paid user with data on Home**, I want an “Ask library” primary action, so that I can start Ask from Home.
20. As a **user on Library**, I want a domain/section tree rail, so that I can browse by site structure.
21. As a **user on Library**, I want selecting All / domain / section to filter the list and update the URL, so that I can refresh and share deep links.
22. As a **user on Library**, I want search plus filters and tags, so that I can find highlights without scrolling everything.
23. As a **Free or Paid user on Library**, I want Export when entitled, so that I can take my library out.
24. As a **Paid user with a domain selected**, I want Ask from Library, so that I can ground on that domain.
25. As a **guest on Library**, I want a true empty state (no fake demo data), so that I am not misled.
26. As a **guest or Free user on Ask**, I want a lock panel explaining Account (Paid), so that I know why Ask is blocked.
27. As a **guest on Ask**, I want Sign in and See plan actions, so that I can proceed toward Paid.
28. As a **Free user on Ask**, I want Upgrade (Polar checkout) and Plan details, so that I can purchase without leaving product language.
29. As a **Paid user on Ask**, I want a grounding tree (library / domain / section) and a chat composer, so that answers use a clear scope.
30. As a **Paid user on Ask**, I want streaming answers when a web-safe AI path exists, so that Ask feels live.
31. As a **Paid user on Ask**, I want an honest error (not fake text) when streaming is unavailable, so that I trust the product.
32. As a **user on Settings**, I want tabs Account, Plan, Appearance, AI & MCP, and Data, so that settings match the OD IA.
33. As a **user**, I want deep links like Settings → Plan, so that billing CTAs land on the right tab.
34. As a **guest in Account**, I want Sign in and “Sign in to upgrade”, so that billing is not fake-enabled.
35. As a **Free user**, I want Upgrade to Account (Paid) via Polar checkout, so that I never enter a card form in-app.
36. As a **Paid user**, I want Manage billing via Polar portal, so that invoices, payment method, and cancel live in Polar.
37. As a **user after checkout**, I want a return banner and Sync, so that lagging webhooks do not leave me stuck on Free.
38. As a **user with cancel scheduled**, I want a banner showing access until period end, so that I understand I still have Paid until then.
39. As a **user past due**, I want AI locked and a path to fix billing in Polar, so that status is honest.
40. As a **user**, I want billing never demoted on load or error, so that a flaky network does not strip Paid.
41. As a **user in Appearance**, I want Light / Dark / System theme, so that the shell matches my preference.
42. As a **user in Appearance**, I want density compact / comfortable / roomy, so that spacing fits how I read.
43. As a **user in Appearance**, I want typography controls (presets/specimen/apply/reset), so that type matches the extension system.
44. As a **Paid user in AI & MCP**, I want provider status and models configuration entry points, so that Ask can be configured.
45. As a **Free user in AI & MCP**, I want a lock banner and Upgrade, so that AI settings are not half-enabled.
46. As a **user in Data**, I want sync controls when entitled, so that multi-device library stays current.
47. As a **user in Data**, I want export library when entitled, so that I can backup/share highlights.
48. As a **user in Data**, I want delete library with a confirm modal, so that destructive action is deliberate.
49. As a **user**, I want legacy `/collections` to open Library, so that old bookmarks still work.
50. As a **user**, I want legacy `/mode` to open Home, so that mode-selection bookmarks do not 404.
51. As a **user**, I want legacy domain detail URLs to open Library with domain (and section) query params, so that deep links survive the IA change.
52. As a **signed-in user landing on Welcome**, I want to be sent to Home, so that I skip marketing once authenticated.
53. As a **user who signs in**, I want to return to my intended product page or Home, so that auth does not strand me.
54. As a **user who signs out**, I want to remain in the shell as Guest, so that I can keep browsing empty states.
55. As a **user with reduced motion**, I want quieter transitions, so that the shell stays comfortable.
56. As a **developer/agent**, I want Editorial tokens only (no Tailwind, no hex in TSX), so that web stays on V2 brand.
57. As a **developer/agent**, I want extension popup build and behavior not broken by this work, so that daily capture remains stable.
58. As a **developer/agent**, I want design-inspection and force-billing controls omitted from production, so that real auth and Polar drive state.

---

## Implementation Decisions

### Approach

- Shell-first vertical slices: Foundation → Home → Library → Settings/Billing → Ask → Polish.
- Source of truth is the OD web HTML prototype; not the extension popup mock; not Flutter.

### Product vs public

- Public: Welcome, auth flows, privacy/terms, OAuth consent — no sidebar.
- Product shell: Home, Library, Ask, Settings — guest and signed-in both allowed; capabilities gated by auth + billing entitlement.

### Routing / IA

- Product routes: `/home`, `/library`, `/ask`, `/settings`.
- Settings tabs via query: `account | plan | appearance | ai | data`.
- Library selection via query: `domain`, `section` (not separate domain pages).
- Redirects: collections → library; mode → home; domain/section paths → library queries.
- Signed-in Welcome → home.

### Shell

- Grid layout with collapsible sidebar (wide → rail), topbar, mobile tabbar, toast and modal hosts.
- Plan pill is read-only (no prototype cycle-mode control).
- Primary CTA: Sign in when guest; Upgrade or contextual action when authenticated, matching production chrome rules from OD (without design-inspection).

### Tokens and UI system

- Extend Editorial CSS custom properties for shell layout, motion, overlays, radii, shadows, type roles.
- Port OD page/shell CSS into a web-app stylesheet; reuse global Editorial primitives (buttons, segmented control, dialogs, logo).
- No Tailwind utility classes; no hardcoded hex in component TSX; no Material 3 / legacy ink tokens.

### Module boundaries

- New web layout, pages, and components under a dedicated web product area.
- Reuse existing web auth provider, app provider, and billing provider (web Supabase port already supported).
- Do not import popup-only chrome into web product pages.
- Web Settings is a new tabbed OD surface; extension settings path remains for the popup.
- Library UI is rail + main matching OD, not a drop-in of popup collections views.

### Caps / entitlement

- Single caps mapping derived from authentication and paid-active entitlement:
  - Guest: browse only (empty library).
  - Free (signed-in, not paid-active): sync + export; Ask/AI/MCP locked.
  - Paid active: Ask/AI/MCP open.
  - Past due: AI locked; billing fix via Polar; never invent a third commercial tier.
- Never demote paid on billing load failure or error (existing billing rules).

### Data

- Introduce a web library data hook/layer over Supabase for signed-in users: highlights, domain/section aggregates, stats, recent, current-page derivation (most recently active page — not a live browser tab).
- Do not use extension IPC dashboard/search hooks on web.
- Guest library is truly empty (no seed demo data; no extension IndexedDB bridge in this PRD).
- Search/filters may be client-side on the fetched set for v1.
- Export / delete / sync: wire only when web-safe APIs exist; otherwise disabled affordances with honest messaging.

### Billing

- Polar checkout and customer portal only; no in-app card forms or fake invoices.
- Return handling for success/cancel query flags; Sync to pull Polar status; banners for pending activation, active after return, cancel, and cancel-scheduled.
- Copy prefers Account (Paid) / Free / Guest product language over legacy “Pro” in new web strings.

### Ask / AI

- Lock UI and full shell layout are required.
- Live streaming is best-effort: extension stream transport is chrome-runtime based and is not the web path.
- If no chrome-free stream path is ready, composer must fail honestly (no fabricated model text).

### Typography / density / theme

- Persist theme, density, and typography preferences for the web app (local persistence acceptable if no shared user settings store yet).
- Density changes spacing only; type scale driven by typography settings.

### Motion

- Prefer View Transitions when available; CSS enter/exit fallback; respect reduced motion; keep enter rise small.

### Prototype-only controls (do not ship)

- Force billing segments, mode design-inspection, prototype data-state toggles, clickable cycle plan badge.

### Caps matrix (product truth)

| Cap | Guest | Free | Paid active | Past due |
|-----|-------|------|-------------|----------|
| Browse library | yes (empty) | yes | yes | yes |
| Sync / Export | no | yes | yes | per existing entitlement helpers |
| Ask / AI / MCP | no | lock → upgrade | yes | lock → portal |

### Slice checklist

1. Foundation  
2. Home  
3. Library  
4. Settings + Billing  
5. Ask  
6. Polish + acceptance  

---

## Testing Decisions

### What makes a good test

- Assert external behavior: rendered states, navigation outcomes, CTA labels/actions, URL sync, entitlement-driven locks.
- Prefer pure functions and high seams with mocked providers over brittle implementation detail tests.
- Do not assert internal CSS class soup unless it is the public contract (e.g. collapsed shell state).
- Web tests must not require a live Chrome extension or MessageBus.

### Approved test seams

1. **Caps helper** — guest / free / paid-active / past-due → ai, export, sync flags.
2. **Billing pure functions** — existing settings billing CTA matrix and return-banner state handling (extend prior art under shared billing tests).
3. **Web library data layer** — mocked Supabase: domain/section aggregation, recent cap, this-week count, empty guest, current-page derivation.
4. **Routing** — legacy redirects; settings `tab` query; library `domain`/`section` query sync with selection.
5. **Shell chrome** — active nav route; sidebar collapsed state; mobile tab presence where testable.
6. **Ask lock** — !paid renders lock panel and correct guest vs free CTAs.
7. **Platform guard** — product web paths do not call unguarded `chrome.runtime` (unit or lint-level guard).

### Modules to test

- Caps / entitlement projection for web shell.
- Web library aggregation hook.
- Route redirect table / library selection URL helpers.
- Billing return banner + CTA resolution (reuse and extend existing billing unit tests).
- Ask lock and Settings tab deep-link behavior at page or pure-helper level.

### Prior art

- Shared billing unit tests (entitlement, polar map/sync, checkout URL, behavior-and-security).
- Settings billing CTA pure helper.
- Auth and collections feature unit tests patterns.
- Resolve-initial-route style pure routing tests.

### Manual acceptance (required for done)

- Side-by-side OD prototype vs web at desktop and mobile widths.
- Full chrome, all four product routes, billing matrix, guest empty library, legacy redirects, extension build non-regression.

---

## Out of Scope

- Extension popup redesign from the extension OD mock.
- Flutter mobile prototype parity.
- Shipping design-inspection / force-billing / prototype data-state UI.
- Guest local IndexedDB or extension-bridge library on web.
- Mandatory live LLM streaming on web in this PRD (UI + lock required; stream best-effort).
- Welcome marketing page visual redesign to match OD (OD has no marketing frame).
- Polar backend contract or entitlement schema changes.
- Inventing a third commercial plan tier or in-app payment forms.
- Rewriting extension Settings for popup in this PRD (except shared pure helpers if needed).

---

## Further Notes

- Implementation order for agents: Foundation (tokens, shell, routes) → Home + web library MVP → Library → Settings/Billing → Ask → Polish.
- OD `data-od-id` attributes should be preserved on key chrome and CTAs where practical for QA.
- Companion design decisions live in the brainstorming session plan; implement shell-first slices per Implementation Decisions.

### Tracking

- Canonical PRD path: `docs/superpowers/specs/2026-08-05-web-app-od-parity-prd.md`
- GitHub issue: open with label `ready-for-agent` when `gh` is available.
