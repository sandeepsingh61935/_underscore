# PRD: Web Install Extension Onboarding

**Status:** Ready for agent  
**Date:** 2026-08-23  
**Triage:** `ready-for-agent`  
**Source of truth (product decisions):** Product brainstorm + grilling 2026-08-23 — dedicated `/install` page (not overlay); soft gate after Welcome; manual sideload while store listings are unavailable. Phase-2 intent (detection / E2E / store status) locked same day — see **Phase 2 (approved intent)**; not in Phase 1 build.  
**Test seams (Phase 1):** Confirmed with product owner (routing/Welcome, `/install` page, distribution mode config, empty Home/Library CTAs, download artifact contract, Help install section).

---

## Problem Statement

As a new visitor to the _underscore **web app**, I land on Welcome, click Get started, and enter an empty Home/Library with almost no explanation that **capture only happens in the browser extension**. Store install is not available to me right now (Firefox Add-ons listing is awaiting review; Chrome Web Store is not published). Without a clear path to obtain and load the extension, the web app looks broken: no highlights, no obvious next step, and no professional account of the current distribution situation.

## Solution

Add a dedicated public **`/install`** onboarding page in the Welcome funnel that:

1. Explains the product model: **extension captures → web library reads/syncs**.
2. States calmly that **browser store listings are in progress** and **manual install is available now** (no developer-fee disclosure, no fake ETAs, no Firefox-only blame for Chrome).
3. Offers **first-class manual install** for **Chrome and Firefox** (browser detect highlights one; both always visible) with **versioned zip downloads** hosted on the web app and **short** load steps; long-form steps live on Help.
4. Lets me **continue without installing** into the product (soft gate).
5. Links back from **empty Home/Library** with role-aware copy so the story is not only on first run.

When stores later go public, the same `/install` URL switches content mode (`manual` → `stores` or `hybrid`) instead of being removed.

---

## User Stories

1. As a **cold web visitor**, I want Welcome to remain a calm brand moment, so that install detail does not clutter the first screen.
2. As a **cold web visitor**, I want **Get started** to take me to `/install`, so that I learn the extension dependency before the empty library.
3. As a **returning visitor who already set up**, I want an **Already set up? Open library** path from Welcome to `/home`, so that I am not forced through install copy every time.
4. As a **signed-in user opening `/`**, I want to go straight to `/home`, so that account holders are not re-funnelled through install onboarding.
5. As a **user of the extension popup Welcome**, I want popup behavior unchanged, so that web install downloads do not appear inside the 400×600 popup.
6. As a **visitor on `/install`**, I want a clear **why** section first, so that I understand capture vs library before downloading anything.
7. As a **visitor on `/install`**, I want a single calm **status** line that store listings are in progress and manual install works today, so that I trust the product without oversharing internal blockers.
8. As a **visitor on `/install`**, I do not want to see developer cost, internal review tickets, or promised ship dates, so that the page stays professional.
9. As a **Chrome user on `/install`**, I want Chrome called out as the suggested browser when detected, so that the primary download matches my browser.
10. As a **Firefox user on `/install`**, I want Firefox called out when detected, so that I am not pushed to the wrong package.
11. As a **user whose browser is neither/unknown**, I want both Chrome and Firefox options equally clear, so that I can still choose.
12. As a **visitor on `/install`**, I want **both** browser downloads always visible, so that detection never hides the other browser.
13. As a **visitor**, I want each download labeled with **extension version** (and clear browser name), so that I know what I am installing.
14. As a **visitor**, I want zip files served from the **web app downloads path**, so that install does not depend on leaving to GitHub unless we choose that later.
15. As a **Chrome user**, I want short on-page steps for loading an unpacked/extension zip in Chrome, so that I can complete install without a novel.
16. As a **Firefox user**, I want short on-page steps for temporary/manual load appropriate to our signed-or-zip reality, so that Firefox is not a second-class path.
17. As a **visitor who needs detail**, I want a link to **Help** long-form install instructions, so that about:debugging / developer-mode edge cases live off the main page.
18. As a **visitor not ready to install**, I want **Continue without installing** to `/home`, so that the page never traps me.
19. As a **visitor who deep-linked to `/home` or `/library`**, I want those routes to still work without a hard gate, so that bookmarks and auth redirects do not break.
20. As a **guest on empty Home**, I want empty copy that explains highlights come from the extension plus a primary CTA to `/install`, so that emptiness is actionable.
21. As a **guest on empty Library**, I want the same install-oriented empty treatment (not only Sign in), so that I am not told to sign in as the only fix for no captures.
22. As a **signed-in user with zero highlights**, I want empty copy focused on **install/capture**, not Sign in again, so that the account does not look broken.
23. As a **signed-in user who already has highlights**, I do not want a forced install interstitial, so that working users stay in the product.
24. As a **user reading Help**, I want an install section that matches the short `/install` steps and expands them, so that support and onboarding stay consistent.
25. As a **product operator**, I want a **distribution mode** (`manual` | `stores` | `hybrid`) controlling `/install` CTAs, so that store badges can replace or sit beside manual download without a new URL.
26. As a **product operator in `manual` mode**, I want no fake Chrome/Firefox store buttons, so that we do not link to listings that do not exist.
27. As a **product operator in `stores` mode**, I want store badges/links as primary and manual as secondary or hidden per config, so that post-approval UX is clean.
28. As a **product operator in `hybrid` mode**, I want store primary where live and manual fallback where not, so that staggered browser approvals work.
29. As a **release engineer**, I want versioned zip artifact names and a documented publish path into the web downloads location, so that `/install` does not point at stale or missing files.
30. As a **release engineer**, I want Chrome and Firefox packages produced from existing zip/build scripts, so that we do not invent a parallel packaging system.
31. As a **visitor on mobile**, I want `/install` to remain readable with stacked browser cards and reachable CTAs, so that I understand the desktop-extension requirement even if I cannot sideload on the phone.
32. As a **mobile visitor**, I want honest copy that the extension runs in desktop Chrome/Firefox, so that I am not promised a mobile extension.
33. As a **keyboard user**, I want full keyboard access to downloads, continue, and help links, so that the page meets baseline a11y.
34. As a **screen-reader user**, I want headings that mirror the why → status → install → continue structure, so that the page is navigable by outline.
35. As a **user with reduced motion**, I want no required motion to complete the page, so that install onboarding stays usable.
36. As a **user in light or dark theme**, I want `/install` to use the V2 editorial public-page system (paper/ink/accent, serif/sans/mono), so that it matches Welcome and legal pages.
37. As a **visitor**, I want professional, plain language (sentence case, no hype), so that sideload instructions feel legitimate.
38. As a **visitor**, I want verbs that match outcomes (“Download for Chrome”, “Continue without installing”), so that actions are predictable.
39. As a **user who opens `/install` from an empty state later**, I want the same page content as first run, so that one canonical install hub exists.
40. As a **user after stores launch**, I want old links to `/install` to still resolve, so that shared URLs and empty-state CTAs do not 404.
41. As a **developer/agent**, I want Welcome web-only branching for CTAs, so that popup Welcome tests and behavior do not regress.
42. As a **developer/agent**, I want Vitest coverage on routing targets and empty-state CTAs, so that Get started cannot silently return to `/home` only.
43. As a **developer/agent**, I want distribution mode tested at the page/config seam, so that manual mode cannot show dead store buttons.
44. As a **support responder**, I want Help and `/install` to use the same browser names and step order, so that answers stay consistent.
45. As a **security-conscious user**, I want downloads only over the same HTTPS web origin we already trust for the app, so that the binary source is obvious.
46. As a **Firefox user during AMO review**, I want a real manual path documented, so that review lag does not equal total lockout for motivated users.
47. As a **Chrome user before CWS publish**, I want the same class of manual path, so that Chrome is not blocked solely because the store fee/listing is pending.
48. As a **visitor who continues without installing**, I want subsequent empty states to still offer `/install`, so that soft skip is not a dead end.
49. As a **product owner**, I want extension presence detection deferred to Phase 2 (soft ping UX only), so that Phase 1 stays shippable without flaky gates.
50. As a **product owner**, I want “notify me when listed” out of this track, so that we do not build email capture for store status.
50a. As a **product owner**, I want runtime AMO/CWS listing APIs out of Phase 1 and rejected as the default long-term approach, so that `/install` status is flipped via config when listings go live.
50b. As a **QA owner**, I want Phase 1 sideload verification to be a manual checklist (not full browser-UI E2E), so that CI stays stable until Phase 2 extension-loaded Playwright.
51. As a **legal/compliance reader**, I want install copy consistent with privacy/help tone (no dark patterns, no forced install), so that the soft gate remains consensual.
52. As a **user comparing Welcome trust line and install page**, I want consistent brand voice (editorial, quiet), so that the funnel feels one product.
53. As a **user on `/install`**, I want a way back to Welcome or Home that is visible, so that navigation is not a browser-back only trap.
54. As a **builder of future store links**, I want store URLs supplied via config/env, so that listing IDs are not hardcoded in components.
55. As a **QA engineer**, I want deterministic browser-detect override in tests, so that Chrome vs Firefox primary highlight can be asserted without flaky UA dependence.

---

## Implementation Decisions

1. **Surface:** New public web route **`/install`** (not a modal/overlay, not inside `WebAppShell` product chrome). Same public-page family as Welcome / legal / help.
2. **Funnel:** Web Welcome primary CTA **Get started →** navigates to `/install`. Secondary text control **Already set up? Open library** → `/home`. Popup Welcome keeps `onStartClick` / existing compact path; no web download UI in popup.
3. **Auth skip:** Authenticated users hitting `/` continue to redirect to `/home` (existing behavior). They reach `/install` only via explicit link (empty states, help, direct URL).
4. **Soft gate:** No blocking of `/home`, `/library`, or settings. No “I installed it” checkbox gate. Primary escape: **Continue without installing** → `/home`.
5. **Page information architecture (fixed order):**
   1. Why (extension captures; web is library)
   2. Status (one calm listings-in-progress + manual-now sentence)
   3. Install (detect + both browsers + versioned downloads + short steps)
   4. Continue / secondary navigation
6. **Status copy policy:** Browser-neutral. Do not mention developer registration cost. Do not promise dates. Optional future specificity must not break Chrome users.
7. **Manual install is first-class** while mode is `manual` (default until stores live).
8. **Browser presentation:** Detect likely browser for **primary** card styling/order; always show Chrome and Firefox. Unknown → neutral dual cards. Provide test seam to inject detected browser.
9. **Artifacts:** Publish **Chrome zip** and **Firefox zip** to web-origin downloads (version in filename and UI). Produce via existing zip/build tooling; document release copy step into static downloads. Page reads version from a small config/manifest module (not scraped from DOM hacks).
10. **Instruction depth:** Three to five short steps per browser on `/install`. Link to Help anchor for full sideload detail (Chrome developer mode / load unpacked; Firefox temporary add-on or current supported manual path). Keep Help and `/install` step order aligned.
11. **Mobile:** Responsive layout; honest desktop-extension note; downloads still listed.
12. **Distribution mode config** (prototype shape — decision, not final file layout):

```ts
type InstallDistributionMode = 'manual' | 'stores' | 'hybrid';

type InstallBrowserAvailability = {
  chrome: 'manual' | 'store' | 'both' | 'unavailable';
  firefox: 'manual' | 'store' | 'both' | 'unavailable';
};

// Mode + per-browser availability drive CTAs.
// store URLs from env/config when present; never render store CTA without URL.
```

13. **Empty states:** Home and Library empty (no highlights) use role-aware copy:
    - Guest: extension required to capture; CTA Install → `/install`; Sign in remains available where existing patterns require it but must not be the only fix for emptiness.
    - Signed-in empty: capture/install focused CTA → `/install`.
    Prefer shared copy helpers over one-off strings in each page.
14. **Design system:** V2 Editorial tokens only (`paper` / `ink` / `accent` / `rule` / serif-sans-mono / step scale). Extend public-pages styles; no Tailwind; no new parallel brand. Distinctive layout allowed within that system (frontend-design pass before/during UI build).
15. **Persistence:** No `install_seen` localStorage requirement. Return users use Welcome secondary link; empty states remain the safety net.
16. **Analytics:** Optional later; not required to ship.
17. **Security/trust:** Same-origin HTTPS downloads; no instruction to disable security features beyond the minimum browser developer-extension flow already required for sideload.
18. **Scope control:** No extension presence probe, no externally_connectable handshake for this PRD, no email waitlist.

---

## Testing Decisions

**Good tests:** Assert user-visible behavior and navigation outcomes. Do not lock to internal CSS class names or pixel layout except where role/label is the public contract. Prefer injected browser-detect over real user-agent.

**Modules / seams to test:**

1. **Welcome (web):** Get started → `/install`; Already set up → `/home`; popup path unchanged; authenticated `/` → `/home`.
2. **`/install` page:** Renders why → status → install → continue; both browser downloads when mode includes manual; Continue → `/home`; Help link present; detected-browser primary highlight with injected detect.
3. **Distribution config:** `manual` hides store CTAs; `stores`/`hybrid` show store CTAs only when URLs configured.
4. **Empty Home / Library:** Guest and signed-in empty show install CTA targeting `/install` with appropriate copy.
5. **Download contract:** Config exposes chrome/firefox versioned paths; UI shows version labels (unit-level; full static file hosting may be release/checklist).
6. **Help:** Install section/anchor exists and is linked from `/install`.

**Prior art:** WelcomePage tests; HomePage and LibraryPage empty-state tests; public route coverage in AppRoutes; web public responsive patterns.

**Not required Phase 1:** Extension presence ping; Playwright through chrome://extensions or about:debugging; runtime AMO/CWS listing APIs; visual regression mandatory (optional after UI polish). Phase 1 QA = Vitest at confirmed seams + **manual** sideload checklist.

---

## Out of Scope (Phase 1)

- Chrome Web Store paid registration / listing submission process itself (ops), except leaving config hooks for store URLs.
- Changing AMO review status or reviewer communication.
- Hosting **unsigned** packages presented as “official store” equivalents in a deceptive way.
- **Extension presence detection** and any auto-skip/auto-advance of the funnel (see Phase 2).
- **Automated full-browser sideload E2E** (chrome://extensions / about:debugging wizards) (see Phase 2).
- **Runtime store listing APIs** (SPA or Worker calling AMO/CWS for live status) (see Phase 2 — rejected as product default).
- Email or push “notify me when available.”
- Hard gate preventing access to library routes.
- Popup/extension in-app download or sideload wizard.
- Mobile native apps or mobile browser extension.
- Redesign of full marketing site beyond Welcome CTA + `/install` + empty-state/help links.
- New backend APIs, auth changes, or sync protocol changes.
- Billing, AI, MCP, or plan-matrix changes.

---

## Phase 2 (approved intent — not Phase 1 build)

Locked in follow-up grilling after PRD #47. **Do not implement in the Phase 1 agent pass** unless product explicitly amends scope. When scheduled, follow this shape so decisions are not re-opened from zero.

### 1. Extension presence detection

| | |
|--|--|
| **In Phase 1?** | No |
| **Product job** | **Soft UX only.** When a real ping succeeds, `/install` and empty Home/Library **change copy** and **de-emphasize download** (e.g. “Extension detected — highlight any page, then open your library”). |
| **Not allowed** | Hard gate on Continue; blocking library until ping; treating ping failure as hard error; funnel skip as the *first* detection milestone (optional later only after soft UX is reliable). |
| **Technical bar** | Best-effort **web → extension ping** using the existing bridge direction (`externally_connectable` + configured extension id). Success = installed (optionally return extension version). Failure / timeout / no id = **unknown / not installed** (show manual install path). |
| **Reject as signal** | Today’s weak `isExtensionInstalled()`-style heuristic (runtime/id present without ping) — it lies for product UI. |
| **Optional harden** | Dedicated `PING` / `HANDSHAKE` message with version payload if background messaging is already being touched. |
| **Firefox** | Degrade gracefully if external ping is weaker than Chrome; never block Firefox users on a Chrome-only success path. |
| **Test seam (Phase 2)** | Inject ping result (`installed` / `unknown` / `not_installed`); assert copy/CTA matrix on `/install` + empty states. |

### 2. Real browser sideload E2E

| | |
|--|--|
| **In Phase 1?** | No — manual QA checklist only |
| **When invested** | Playwright **with extension already loaded** (existing e2e extension fixture pattern): assert web install/empty behavior and post-capture library paths as applicable. |
| **Explicitly not** | Automating chrome://extensions “Load unpacked”, about:debugging temporary add-on, or full consumer sideload wizards in CI (brittle / often impossible headless). |
| **Release** | Optional one-off engineer script is fine; not a substitute for the fixture-based suite above. |

### 3. Store listing status / APIs

| | |
|--|--|
| **In Phase 1?** | Config hooks only (`manual` \| `stores` \| `hybrid` + optional store URLs). Human or release process flips mode when listings go live. |
| **Approved long-term** | Ops/build-time update of config/env (manual or scripted check outside the SPA). |
| **Rejected as default** | Runtime SPA (or user-facing Worker) calls to AMO/CWS to show live “in review / available” — poor APIs, cache/CORS/auth noise, status lies hurt trust. |
| **Out of this track** | “Notify me when listed” waitlist (separate product if ever). |

### Phase 2 user stories (backlog — not Phase 1 acceptance)

1. As a **visitor with the extension already installed**, I want `/install` to acknowledge detection and de-emphasize download, so that I am not told to reinstall.
2. As a **visitor without the extension**, I want the same manual/store CTAs as today, so that a failed ping never hides install.
3. As a **user on empty Home/Library with extension detected**, I want capture-oriented copy (not “download the zip”), so that the next step is highlight a page.
4. As a **QA engineer**, I want Playwright tests that load the extension and hit web install/empty routes, so that regressions are caught without UI sideload automation.
5. As a **product operator**, I want store mode flips via config when a listing goes public, so that `/install` updates without a runtime store API.

### Phase 2 suggested order (when pulled in)

1. Real ping helper + test inject seam (replace heuristic for UI).  
2. `/install` + empty-state copy/CTA matrix on ping result.  
3. Extension-loaded Playwright coverage for web install hub.  
4. Ops doc for flipping distribution mode + store URLs (no runtime listing API).

---

## Further Notes

### Locked decision log — Phase 1 (grilling)

| ID | Decision |
|----|----------|
| Q1 | Page job = model + status + install onboarding |
| Q2 | Welcome → `/install` → continue to home |
| Q3 | Soft step; deep links work |
| Q4 | Main path = cold Welcome Get started; empty library links back |
| Q5 | Manual install first-class while stores unavailable |
| Q6 | Neutral public status (not $5, not Firefox-only) |
| Q7 | Route `/install` |
| Q8 | Get started → `/install` + Already set up secondary |
| Q9 | Download + Continue without installing |
| Q10 | Authed `/` → `/home` |
| Q11 | Detect primary; both browsers visible; versioned zips |
| Q12 | Short steps on page; long form on Help |
| Q13 | Keep URL; mode `manual \| stores \| hybrid` |
| Q14 | Section order why → status → install → continue |
| Q15 | Host zips on web origin downloads |
| Q16 | Role-aware empty CTAs → `/install` |
| Q17 | No install_seen persistence maze |
| Q18 | Status line: listings in progress; manual today |
| Q19 | No detection / notify-me in Phase 1 |
| Q20 | Web-only Welcome branch; popup unchanged |

### Locked decision log — Phase 2 add-ons (grilling)

| ID | Decision |
|----|----------|
| P2-Q1 | Detection job = soft UX copy/CTA only (not hard gate) |
| P2-Q2 | Technical bar = real web→extension ping; reject heuristic-as-truth |
| P2-Q3 | E2E = extension-loaded Playwright when invested; not full sideload UI automation; Phase 1 = manual checklist |
| P2-Q4 | Store status = human/config flip; no runtime AMO/CWS SPA APIs; no waitlist in this track |
| P2-Q5 | Phase 1 PRD scope unchanged; these three stay out of the first build |

### Test seams (Phase 1 — confirmed)

1. Web routing / Welcome CTA  
2. `/install` page render + actions  
3. Install distribution mode config  
4. Empty Home / Library CTAs  
5. Download artifact contract (versioned URLs + labels)  
6. Help install section alignment  

### Suggested implementation order (Phase 1)

1. Config module (mode, versions, download paths, optional store URLs)  
2. `/install` page + public styles + route registration  
3. Welcome web CTA/secondary link  
4. Empty Home/Library copy + CTAs  
5. Help long-form install section + anchor  
6. Release notes for publishing zips into downloads  
7. Tests at confirmed seams + manual sideload QA checklist  

### Copy starter (non-final; design may tighten)

- Why title: **Capture lives in the extension**  
- Why body: **underscore saves highlights from pages you browse. This web app is your library — it shows what the extension captures.**  
- Status: **Browser store listings are in progress. You can install manually today.**  
- Continue: **Continue without installing**  
- Secondary Welcome: **Already set up? Open library**  
- Phase 2 (detected): **Extension detected — highlight any page, then refresh your library.**  

### Issue tracker

GitHub: https://github.com/sandeepsingh61935/_underscore/issues/47 (`ready-for-agent`). Local path under `docs/superpowers/specs/` is source of truth; re-sync issue body when this file changes.
