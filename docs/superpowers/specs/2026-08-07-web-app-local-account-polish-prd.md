# PRD: Web App Local Account Polish

**Status:** Ready for agent  
**Date:** 2026-08-07  
**Triage:** `ready-for-agent`  
**Supersedes / refines (copy & chrome only):** parts of `2026-08-05-web-app-od-parity-prd.md` for Guest Home, shell hints, Sign-in surfaces, Settings Account/Plan/Appearance, and dark/type prefs — not the full OD parity build.  
**Source of truth (product decisions):** Grilling session 2026-08-07 — Hybrid conversion model C; full decision log in Further Notes.  
**Test seams:** Proposed below — confirm before implementation if they diverge from agent preference.

---

## Problem Statement

As a **Guest** (local account) on the _underscore web app, the product feels noisy and unprofessional: the topbar restates page structure as marketing crumbs, Guest banners and empty states push **Sign in** from many places at once, Home uses awkward copy (“Your local library”, “Local only”, extension-captures ledes), and Settings looks amateur (random Capabilities chips, three Sign in buttons, Paid plan with no price). Appearance is half-built (density nobody needs, typography is a flat chip dump without specimen or normal size control), and dark mode is too black with harsh contrast. The user wants a quiet, standard SaaS shell where conversion is clear once, local library reads as product—not ads—and plan/features/pricing live in one professional place.

## Solution

Polish the **already-shipped** web product shell for Local Account and Settings/Appearance:

1. **Hybrid conversion:** one primary guest **Sign in** in chrome (topbar); no in-page Sign in on Home/Library banners; Settings keeps a single Sign in on Account profile only.
2. **Quiet chrome:** topbar shows route title only (no hints); plan status collapses to a **status dot** on narrow widths.
3. **Guest Home:** title **Local Library**, passive one-line education (no button), keep Current / Active / Recent with quiet empties; drop redundant kickers and sales ledes.
4. **Copy discipline:** keep decision-useful counts; drop decorative totals and repeated marketing on Library/Ask; guest Ask lock has no second Sign in (link to Plan only).
5. **Settings IA:** Account = identity; Plan = Free vs Account (Paid) with **$2.99/month** and **$19.99/year**; remove Capabilities chip strip; short professional leads; guest Plan is education-only.
6. **Appearance:** remove Density; typography = curated presets + live specimen + Default/Large base size; **shared elevated dark** tokens with retuned borders/accent contrast.

---

## User Stories

1. As a **guest**, I want a single obvious **Sign in** in the topbar, so that I am not hunted by repeated buttons on every page.
2. As a **guest on Home**, I want no Sign in button on the guest status line, so that the page feels like a library not a paywall.
3. As a **guest on Library**, I want no Guest banner with Sign in, so that empty library chrome stays calm.
4. As a **guest on Ask**, I want a clear lock reason and a link to Plan, so that I understand Paid without a second Sign in competing with the topbar.
5. As a **guest**, I want feature differences (sync, export, Ask / Paid) explained mainly on Settings → Plan, so that education is centralized.
6. As a **guest on Home**, I want a passive one-liner such as “Local only — sync, export, and Ask after sign-in,” so that I still understand limits without a CTA block.
7. As a **user on any product route**, I want the topbar to show only the route title (Home / Library / Ask / Settings), so that redundant hints disappear.
8. As a **user on a wide viewport**, I want the plan control to show a colored status plus label (Guest / Free / Paid / Past due), so that plan is readable at a glance.
9. As a **user on a narrow viewport**, I want the plan control to collapse to a **status dot** with accessible name/tooltip, so that chrome stays compact next to Sign in / Upgrade.
10. As a **user with the sidebar expanded**, I want the foot to keep a short plan label with a plan dot, so that account status remains visible in the rail.
11. As a **guest on Home**, I want the title **Local Library** (not “Your local library”), so that naming is tighter and product-like.
12. As a **guest on Home**, I do not want a “Local only” kicker above the title, so that the header is not double-labeled.
13. As a **guest on Home**, I do not want marketing ledes about extension captures or “sign in to sync,” so that the page is not sales copy.
14. As a **guest on Home**, I want Current page, Active pages, and Recent sections to remain (even when empty), so that layout matches signed-in Home and does not jump later.
15. As a **guest on Home**, I want empty section states that are short and non-coercive (no “sign in to unlock” in every well), so that empty UI stays quiet.
16. As a **signed-in user on Home**, I want existing greeting and dashboard behavior preserved except where global chrome/copy rules apply, so that polish does not regress paid/free home.
17. As a **user on Library**, I want domain/section tree counts that help navigation, so that I can scan large libraries.
18. As a **user on Library or Ask**, I do not want decorative totals that merely restate the list, so that UI noise drops.
19. As a **user on Ask with a scope**, I want operational scope summary when it affects grounding, so that I know what the model will use.
20. As a **Free user**, I want the topbar primary action to remain **Upgrade** (to Settings → Plan), so that monetization stays visible without guest-style spam.
21. As a **past-due user**, I want the topbar primary action labeled **Manage billing** (portal when applicable), so that I am not told to “Upgrade” when payment failed.
22. As a **Paid user**, I want no primary topbar CTA, so that chrome stays calm when entitled.
23. As a **guest in Settings → Account**, I want exactly one **Sign in** control on the profile row, so that identity conversion is unambiguous.
24. As a **guest in Settings → Account**, I do not want a second Sign in under Billing, so that duplicate CTAs disappear.
25. As a **guest in Settings → Account**, I do not want a Capabilities chip strip (Sync / Export / AI / MCP), so that amateur status pills go away.
26. As a **signed-in user in Account**, I want email, short plan status subtext, plan pill when relevant, and Sign out, so that identity is standard SaaS.
27. As a **guest in Settings → Plan**, I want Free vs Account (Paid) comparison without a Sign in button, so that Plan stays educational and topbar/Account own conversion.
28. As a **user on Plan**, I want Free shown as **Free** and Paid shown with **$2.99/month** and **$19.99/year**, so that cost is visible before Polar.
29. As a **user on Plan**, I want prices sourced from app catalog constants (not invented per-string), so that marketing and checkout messaging can stay aligned later.
30. As a **Free signed-in user on Plan**, I want Upgrade / Continue to Polar as the primary paid action, so that checkout remains the monetization path.
31. As a **Paid user on Plan**, I want Manage (portal) and renew/cancel messaging, so that billing management stays in Polar.
32. As a **guest on AI & MCP or Data**, I want a short lock with a link toward Plan (not another Sign in button), so that gates stay consistent with Hybrid C.
33. As a **user on any Settings tab**, I want at most one short professional lead under the H2, so that settings read as product not prototype notes.
34. As a **user in Appearance**, I want theme Light / Dark / System only for color mode, so that theme choice stays standard.
35. As a **user in Appearance**, I do not want a Density control, so that unused spacing modes do not clutter settings.
36. As a **user in Appearance**, I want a live typography specimen (heading, body, meta), so that presets are chosen visually.
37. As a **user in Appearance**, I want a curated set of about 6–8 type presets (not the full dump), so that choice is manageable.
38. As a **user in Appearance**, I want a simple base size control (Default / Large), so that readability has a normal UX lever without a type foundry.
39. As a **user in dark mode**, I want elevated (not pure black) surfaces, so that the app matches industry dark UI.
40. As a **user in dark mode**, I want softer hairline borders and retuned warm ink/accent contrast, so that white/cream accents remain legible without harsh rules.
41. As a **user of the extension and web**, I want shared dark tokens, so that brand night mode does not fork.
42. As a **developer/agent**, I want existing capability resolution (Guest / Free / Paid / Past due) unchanged in meaning, so that this pass is UI/copy/prefs only unless catalog constants are added.
43. As a **developer/agent**, I want guest library emptiness rules preserved, so that local account data policy does not silently change.
44. As a **developer/agent**, I want Vitest coverage on chrome CTA matrix and guest copy, so that Sign in spam cannot regress.
45. As a **user with reduced motion**, I want no new motion requirements from this polish, so that a11y posture stays stable.
46. As a **screen-reader user**, I want the plan status dot to expose the full plan name, so that collapsed chrome remains accessible.
47. As a **guest who opens Settings from the sidebar user foot**, I want to land in Account where Sign in lives, so that the secondary path still works without extra CTAs.
48. As a **user comparing Free and Paid**, I want Paid still named **Account (Paid)** in this pass, so that naming stays consistent with current product language.
49. As a **user**, I want Polar to remain the only place cards are entered, so that in-app never becomes a card form.
50. As a **user after this polish**, I want Library/Ask/Settings to feel quieter without losing navigation counts that help me work, so that cleanup is disciplined not barren.

---

## Implementation Decisions

### Conversion model (Hybrid C)

- **Primary guest CTA:** topbar **Sign in** only.
- **Forbidden for this pass:** Sign in buttons on Home guest banner/card, Library guest banner, Settings Account billing row, Settings Plan guest rows/cards, Settings AI lock as a second primary button.
- **Allowed:** one Sign in on Settings → Account profile; text links to Plan or Account where education needs a path; signed-in Free **Upgrade** and past-due **Manage billing** in topbar.
- Guest Ask lock: reason + **See plan** (or equivalent text link); **no** Sign in button.

### Shell chrome

- Remove all `topbar-hint` route subtitles (Home’s “Current page · Active pages · Recent” and peers).
- Plan pill: full **dot + label** on wide layouts; **dot-only** under a narrow breakpoint (~900px), with `title` / `aria-label` for full plan label.
- Sidebar expanded foot: keep short plan label + plan dot; collapsed rail remains avatar-first (no new account menu).
- Free topbar CTA: **Upgrade** → Settings Plan tab.  
- Past due topbar CTA: **Manage billing** (prefer portal action label when billing CTA matrix says portal).  
- Paid: no primary topbar CTA.

### Guest Home

- H1: **Local Library**.
- Remove “Local only” eyebrow/kicker and marketing ledes (including extension-captures / sign-in-to-sync ledes).
- Passive education line (Home only), default copy: *Local only — sync, export, and Ask after sign-in.* (no button).
- Keep section structure: Current page · Active pages · Recent with quiet empty copy (no per-section Sign in).
- Do not show GuestBanner with Sign in; Library must not mount the guest CTA banner.

### Copy / counts rule

- **Keep:** Library tree domain/section counts; Ask operational scope lines that change grounding.
- **Drop:** decorative “N highlights loaded” style chrome, duplicate page subtitles, marketing leads under every settings block, restated totals that mirror the visible list.
- Empty states: one short line; no second conversion button if chrome already owns Sign in.

### Settings IA

- **Account:** identity row only for guests (Not signed in + one Sign in) or email + Sign out when authed; short status subtext (*This browser · not synced* / plan-aware line). **Remove Capabilities block entirely.**
- **Plan:** Free vs Account (Paid) feature matrix; show catalog prices; guest = education only (no Sign in on Plan). Signed-in Free: upgrade to Polar; Paid: manage portal + renew/cancel messaging already present.
- **AI & MCP / Data:** short lock; point to Plan (or billing action when signed in); no extra Sign in buttons for guests.
- **Leads:** rewrite to short professional one-liners (e.g. identity/session, choose a plan, theme and type). Remove prototype voice (“No prices invented here”, chippy capability labels as a substitute for a matrix).

### Plan catalog (public price)

- Free: display **Free**.
- Account (Paid): **$2.99/month** and **$19.99/year** (USD).
- Source: shared or web **catalog constants** (single module), not hard-coded divergent strings across panels.
- Do not call Polar products API in this pass.
- Keep product name **Account (Paid)** (no rename to Pro).

### Appearance

- **Remove Density** UI and stop applying user-selectable density prefs; single comfortable default layout. Prefer deleting dead prefs surface rather than leaving a hidden API unless migration requires a no-op read.
- **Typography:** curated ~6–8 builtins from the existing preset system; live specimen; **Default / Large** base size; no font upload, no full scale/spacing matrix, no wheel pickers in this pass.
- Theme control remains Light / Dark / System via existing theme pipeline.

### Dark mode (shared tokens)

- Move shared `.dark` surfaces from near-OLED black to **elevated industry** stack (app bg one step up, cards/sidebar elevated, soft white@~8–12% rules).
- Soften warm ink hierarchy; retune accent so interactive accents keep contrast on new paper.
- Apply in shared theme tokens so extension and web stay aligned.
- Recheck plan dots, focus rings, primary buttons, and accent marks on dark.

### Non-goals for architecture

- No change to auth, Polar checkout/portal flows, entitlement computation, or guest empty-library data policy except UI affordances.
- No new avatar/account dropdown menu.
- No live pricing API.

### Modules (conceptual)

- Web app shell (topbar meta, plan pill responsive behavior, primary CTA matrix).
- Guest education component (passive Home line; retire buttoned guest banner usage on product pages in this pass).
- Home / Library / Ask page copy and lock CTAs.
- Settings panels: Account, Plan, Appearance, AI, Data leads and guest CTA reduction.
- Plan price catalog constants.
- Web prefs: density removal.
- Type preset UX on web Appearance (specimen, curated list, base size).
- Shared dark design tokens.

---

## Testing Decisions

### What good tests do

- Assert **user-visible behavior**: copy, presence/absence of Sign in, topbar CTA label by plan, plan prices, missing density control, specimen/base size affordances.
- Prefer **highest existing seams**: page and shell tests with router + mocked auth/billing (same style as current Home, shell, Settings, Ask tests).
- Prefer **pure functions** for plan catalog and any CTA label helpers.
- Do **not** assert CSS hex values or class soup for dark mode beyond “dark theme class still applies” / token contract if one already exists; dark contrast is primarily design QA plus a small token fixture if useful.
- Do **not** test implementation details of React structure beyond stable `data-od-id` / roles already used in the suite.

### Proposed test seams (confirm)

| Seam | Why (highest useful) | Prior art |
|------|----------------------|-----------|
| **1. WebAppShell (RTL)** | Topbar title-only; guest Sign in; Free Upgrade; past-due Manage billing; plan pill/dot behavior if testable via DOM/aria | Existing shell tests for guest Sign in CTA |
| **2. HomePage (RTL)** | Local Library title; no Local only kicker; passive line; no guest Sign in button; quiet empties | Existing guest Home tests (will need expectation updates) |
| **3. LibraryPage / AskPage (RTL)** | No guest banner Sign in; Ask lock without Sign in; Plan link | Existing Ask guest lock tests |
| **4. WebSettingsPage + panels (RTL)** | Single Account Sign in; no Capabilities; Plan prices; guest Plan no Sign in; no Density; type specimen/base size present | Existing guest plan tab tests |
| **5. Plan catalog pure module** | `$2.99/month` / `$19.99/year` / Free labels stable | Billing pure-fn tests pattern |
| **6. resolveWebCaps (unchanged contract)** | Regression: Guest/Free/Paid/Past due flags still correct | Existing caps unit tests |

Ideal: **one primary product surface per flow** (shell + page), not deep unit tests of every CSS rule.

### Modules under test

- Shell chrome and primary CTA matrix  
- Guest Home and education line  
- Ask lock CTA set  
- Settings Account/Plan/Appearance panels  
- Plan catalog constants  
- Caps regression only if touched  

---

## Out of Scope

- Full extension TypographySettings parity (font upload, metric sliders, custom presets lab).
- Live Polar product price API / multi-currency.
- Renaming Account (Paid) → Pro/Plus.
- Avatar account menu / command palette.
- Changing guest data model (still empty web library for guests; no extension IndexedDB bridge invent).
- Marketing/public pricing landing page.
- New billing providers or in-app card collection.
- Redesigning signed-in Home information architecture beyond global chrome/copy rules.
- OLED alternate theme toggle.
- Density as a power-user hidden flag (removed, not buried).

---

## Further Notes

### Locked decision log (grilling)

1. Hybrid **C** conversion model.  
2. Guest education **B**: passive Home one-liner only; Plan holds full matrix.  
3. Topbar hints **A**: route title only.  
4. Plan status **A**: pill on wide → **dot only** on narrow.  
5. Guest Home **A**: Local Library + quiet sections + passive line.  
6. Counts/copy **A**: decision-useful only; guest Ask no Sign in.  
7. Settings **A**: identity vs plan; kill Capabilities; guest Plan education-only.  
8. Prices **A**: catalog constants — Free; Paid **$2.99/mo** · **$19.99/yr** USD; keep Account (Paid) name.  
9. Density **A**: remove.  
10. Typography **A**: specimen + curated presets + Default/Large.  
11. Dark **A**: elevated industry, **shared** tokens.  
12. Non-guest chrome **A**: Upgrade / Manage billing / none.  
13. Pass boundary **A**: IN shell+guest Home+Library/Ask cleanup+Settings+Appearance; OUT type lab, live prices, rename, avatar menu, data-model, marketing site.

### Defaults if unspecified at implement time

- Passive line: *Local only — sync, export, and Ask after sign-in.*  
- Curated preset IDs: product-safe subset chosen at implement time from existing builtins (prefer Editorial default + a few distinct families).  
- Narrow breakpoint for plan dot: align with existing shell collapse (~900px) unless design tokens already define a standard.  
- Dark hex stack: elevated zinc/stone-equivalent warm neutrals consistent with Editorial brand (not cool pure gray unless needed for contrast).

### Relationship to OD parity PRD

The 2026-08-05 OD parity PRD asked for guest banners with Sign in, topbar hints, density, and richer type. **This PRD deliberately revises those UX choices** for Local Account quality. Implementers should follow **this** document for guest chrome, Settings CTA density, density removal, pricing display, and dark elevation when the two conflict.
