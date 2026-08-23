# PRD: Web App Settings, Data & Type Polish (Pass 2)

**Status:** Ready for agent  
**Date:** 2026-08-07  
**Triage:** `ready-for-agent`  
**Builds on:** `2026-08-07-web-app-local-account-polish-prd.md` (Pass 1) and shipped Hybrid-C shell  
**Supersedes (Pass 1 where conflicting):**  
- Plan status “dot only on narrow” → **label only, no status dots**  
- Guest `export: false` / no local delete → **Guest MD·XLSX export + local delete**  
- Typography chip click applies immediately → **draft + Apply / Reset**  
- Settings panel H2 + lead on every tab → **none**  
- Plan featured black border + “Cancel anytime…” → **soft equal cards; cancel line removed**  
**Source of truth:** Grilling session 2026-08-07 (second pass) — decision log in Further Notes.  
**Test seams:** Proposed below — confirm before implementation if they diverge from agent preference.

---

## Problem Statement

After Local Account Pass 1, Settings and data tools still feel unfinished:

1. **Local (Guest) users cannot export or delete** their library on web the way they can think of “my data,” and web export is a single **JSON** dump instead of the extension’s **MD · XLSX** formats and scopes.  
2. **Plan compare** looks amateur: Paid card uses a heavy **black/ink border**, and a **“Cancel anytime in the billing portal”** footnote adds noise.  
3. **Typography** still applies the whole app when a preset is clicked; users want to **preview in the specimen**, then **Apply** (and Reset to last applied). Specimen quality lags the extension.  
4. **Settings chrome is redundant**: each tab repeats the nav label as an H2 plus a marketing lead (“Account / Identity and session.”).  
5. **Guest Account** still shows a Billing education block and double conversion messaging next to topbar Sign in.  
6. **Plan status on small screens** collapsed to a **mystery colored dot** with no word — status must stay **readable** at all sizes; user now prefers **label only (no dots)**.

## Solution

Ship a focused Pass 2 on **data rights, Settings quiet chrome, plan card polish, status label, and type apply flow**:

1. **Export parity with extension:** **MD** and **XLSX** via shared highlight-export; **Library** exports current scope (library / domain / section); **Settings → Data** exports whole library; available to **Guest, Free, and Paid** for data they can see (Guest = local).  
2. **Guest delete library** with confirm (clear local web library). Signed-in cloud wipe stays deferred/honest.  
3. **Guest Data tab:** Export + Delete only (no Sync section). Free/Paid keep Sync + Export + Danger.  
4. **Settings panels:** no per-tab H2 or lead.  
5. **Guest Account:** single identity row only (no Billing education block).  
6. **Plan cards:** equal soft borders; light Paid emphasis without ink outline; remove cancel footnote.  
7. **Plan status chrome:** **text label only** (Guest / Free / Paid / Past due), **no plan dots**, always visible at every breakpoint.  
8. **Appearance typography:** curated chips + improved specimen; chip and base-size changes are **draft**; **Apply** commits app-wide; **Reset** restores last applied. No full type lab.

---

## User Stories

1. As a **guest with local highlights**, I want to export my library as **Markdown**, so that I can use my notes outside the app without signing in.  
2. As a **guest with local highlights**, I want to export as **XLSX**, so that I can open highlights in a spreadsheet like the extension.  
3. As a **guest on Library**, I want MD · XLSX for the **current scope** (all, domain, or section), so that granular export matches the extension.  
4. As a **guest on Settings → Data**, I want whole-library MD · XLSX, so that I can dump everything without browsing Library.  
5. As a **Free or Paid user**, I want the same MD · XLSX export surfaces, so that format UX does not change by plan.  
6. As a **user with an empty library**, I want export controls disabled or hidden without a “sign in” nag, so that empty state stays honest.  
7. As a **guest**, I want **Delete library** with a confirmation, so that I can wipe local web data deliberately.  
8. As a **guest on Data**, I do not want a Cloud sync section, so that local mode is not cluttered with disabled sync.  
9. As a **signed-in Free/Paid user on Data**, I want Sync, Export (MD · XLSX), and Danger zone, so that cloud tools remain available.  
10. As a **signed-in user**, I accept that **cloud bulk delete** may still say use the extension until web wipe exists, so that we do not fake a destructive API.  
11. As a **user on Settings**, I want no repeated tab title and no lead sentence under each panel, so that the UI is not stating the obvious.  
12. As a **guest on Account**, I want only **Not signed in** + short local sub + **Sign in**, so that Account is identity only.  
13. As a **guest on Account**, I do not want a Billing education block, so that Free vs Paid lives on Plan.  
14. As a **user on Plan**, I want Free and Paid cards with **matching soft borders**, so that Paid does not look like a black box.  
15. As a **user on Plan**, I want a light Paid emphasis (subtle accent or chip), so that upgrade is clear without harsh ink outline.  
16. As a **user on Plan**, I do not want “Cancel anytime in the billing portal” under the Paid card, so that the compare block stays clean.  
17. As a **user on any viewport**, I want plan status shown as a **readable label** (Guest / Free / Paid / Past due), so that I always know my tier.  
18. As a **user on a narrow phone**, I still want the **word** Guest (or Free/Paid), not a lone colored dot, so that status is not cryptic.  
19. As a **user**, I do not want plan status **dots** in the topbar or sidebar foot, so that chrome is label-first and calm.  
20. As a **user in Appearance**, I want choosing a type preset to update only the **preview/specimen**, so that the app does not jump fonts until I commit.  
21. As a **user in Appearance**, I want **Apply** to set the preset (and draft base size) app-wide, so that commitment is explicit.  
22. As a **user in Appearance**, I want **Reset** to restore the **last applied** type state, so that I can discard a draft.  
23. As a **user in Appearance**, I want a specimen closer to the extension (display, body, meta with draft tokens), so that preview is trustworthy.  
24. As a **user in Appearance**, I want curated presets only (no wheel, import, or full scale matrix this pass), so that type stays product-simple.  
25. As a **user changing Default/Large base size**, I want that change to stay **draft until Apply** (same model as presets), so that size and typeface commit together.  
26. As a **developer/agent**, I want web export to reuse shared highlight-export MD/XLSX builders, so that formats stay one system with the extension.  
27. As a **developer/agent**, I want Guest caps to allow local export (and local delete path) without granting Sync/AI, so that local rights ≠ Paid features.  
28. As a **developer/agent**, I want Hybrid C Sign in rules preserved (topbar + single Account Sign in), so that Pass 2 does not reintroduce CTA spam.  
29. As a **screen-reader user**, I want the plan label to be a clear accessible name without relying on color alone, so that status is not dot-or-color only.  
30. As a **user after Pass 2**, I want Settings to feel quieter and more standard SaaS, so that Account / Plan / Appearance / Data feel intentional.

---

## Implementation Decisions

### Caps / local data rights

- Guest gains ability to **export** local library data (MD/XLSX) when there is data.  
- Guest gains **delete local library** (confirm) for web local store used by `useWebLibrary` / guest path.  
- Guest still has **sync: false**, **ai: false**, **mcp: false**.  
- Free/Paid keep existing sync/export flags; export UI upgrades to MD/XLSX.  
- Update pure caps projection and any call sites that assumed Guest never exports.

### Export

- Formats: **`md`** and **`xlsx`** only (extension `ExportFormat`); do not ship web-only JSON as primary.  
- Reuse shared highlight-export pipeline and web-safe fetch/map where possible (`useHighlightExport` / `buildScopedExport` patterns).  
- **Library:** export actions for current selection scope — library | domain | section — labels/aria like extension ExportActions.  
- **Settings → Data:** whole-library export only (two actions or segmented MD · XLSX).  
- Empty: hide or disable without Sign in copy.  
- Replace “JSON bundle” subcopy with Markdown/spreadsheet language.

### Delete

- Guest: enabled Delete with confirm modal; clears local web library data for that guest session/storage.  
- Signed-in: leave disabled with honest extension/cloud messaging unless a real web cloud-delete API already exists (do not invent).  

### Settings chrome

- Remove panel-level **h2** and **lead** from Account, Plan, Appearance, AI, Data.  
- Page title “Settings” + tab nav remain.  
- Block labels (PROFILE, etc.) may stay if they structure content; do not reintroduce tab-name H2s.

### Guest Account

- Profile row only: Not signed in / email, short local sub, one Sign in (or Sign out when authed).  
- Remove guest Billing education block entirely.

### Plan compare UI

- Remove `.featured` ink border treatment (or redefine featured without `border-color: var(--ink)`).  
- Both cards use soft rule/border tokens.  
- Optional light Paid cue: accent edge, subtle chip, or paper-2 fill — not black outline.  
- Delete plan-card-note “Cancel anytime in the billing portal.”

### Plan status chrome

- Topbar plan control: **label text only** (planLabel). No status dot in the pill.  
- Sidebar foot: plan name without plan-dot.  
- Always show full readable label at all breakpoints; remove media-query that hides label / sr-only clip for “dot only.”  
- Accessible name remains the plan word.

### Typography (web Appearance)

- Interaction state machine (conceptual):

```
applied: TypePresetSelection + typeScale
draft:   same shape, starts equal to applied
on chip / typeScale click → update draft only; specimen reflects draft
Apply → applied := draft; persist via useTypePreset + webPrefs typeScale
Reset → draft := applied (no Editorial hard jump unless applied was default)
```

- Specimen must render from **draft** tokens (reuse TypeSpecimen or equivalent quality).  
- Curated preset list retained; no WheelPicker, font import, or full spacing matrix this pass.  
- Theme control remains immediate (not part of type draft) unless already coupled — keep theme independent.

### Modules (conceptual)

- Caps resolver (guest export flag).  
- Library page export actions.  
- Settings Data panel (export formats, guest layout, delete confirm).  
- Settings Account / Plan / Appearance / AI panels (chrome strip, guest account, plan cards).  
- PlanPill / shell sidebar plan display (label only).  
- webPrefs + AppearancePanel draft/apply for type.  
- Shared export integration on web (no duplicate format logic).

### Non-goals for architecture

- No Polar/checkout changes.  
- No full extension TypographySettings port.  
- No new cloud bulk-delete backend unless already present.

---

## Testing Decisions

### What good tests do

- Assert **user-visible** behavior: export buttons present/disabled, formats, scopes, delete confirm, absence of H2/leads, guest Account single row, plan card no cancel note, plan status has text and no dot, type chip does not change applied selection until Apply.  
- Prefer **highest existing seams:** RTL on WebAppShell, LibraryPage, WebSettingsPage panels; pure caps unit tests; export pure builders already tested in shared package — prefer calling through web hook/UI rather than retesting builders.  
- Do not assert CSS hex; may assert absence of featured ink class or presence of label text in topbar.

### Proposed test seams (confirm)

| Seam | Covers |
|------|--------|
| **1. resolveWebCaps** | Guest export true (or new localExport flag if split); sync/ai still false |
| **2. LibraryPage (RTL)** | MD · XLSX for scope; guest allowed when data; empty disables |
| **3. WebSettingsPage Data (RTL)** | Guest: no Sync block; MD·XLSX; delete enabled path with confirm; Free: Sync present |
| **4. WebSettingsPage Account/Plan (RTL)** | No H2/lead; guest no billing block; one Sign in; plan prices remain; no cancel note |
| **5. WebAppShell / PlanPill (RTL)** | Label text always; no dot element in plan chrome |
| **6. AppearancePanel (RTL)** | Chip click does not call setSelection until Apply; Reset restores applied; specimen present |

Prior art: Pass 1 WebSettingsPage, WebAppShell, LibraryPage, AskPage tests; shared `highlight-export` unit tests; `ExportActions` extension patterns.

---

## Out of Scope

- Full extension type lab (wheel, import fonts, scale/spacing/margin editors).  
- JSON as a third primary export format.  
- Signed-in cloud library wipe API (unless already shipped).  
- Changing Hybrid C Sign in placement (topbar + Account profile only).  
- Renaming Account (Paid).  
- Live Polar price API.  
- Re-opening density control.

---

## Further Notes

### Decision log (grill pass 2)

1. Export formats = extension **MD · XLSX**.  
2. Who/where = **A**: Guest+Free+Paid; Library scoped; Settings whole-library; no JSON.  
3. Guest delete = yes (confirm); signed-in cloud wipe deferred.  
4. Typography interaction = **A** draft + Apply; Reset = last applied.  
5. Settings chrome = **A** no H2 no lead.  
6. Plan cards = **A** soft equal borders; light Paid cue; cancel line gone.  
7. Plan status = **label only, no dots**, always visible (revises Pass 1 dot-collapse).  
8. Guest Account = **A** identity only.  
9. Typography depth = **A** specimen + curated + Apply model only.  
10. Data layout = **A** guest Export+Delete only; signed-in keeps Sync.

### Relationship to Pass 1 PRD

Implementers should treat **this PRD as governing** for: guest export/delete, plan status chrome, type apply flow, settings panel chrome, plan card border/note. Pass 1 remains source for Hybrid C, Local Library home, elevated dark, plan prices, density removal, topbar title-only, etc., except where this document explicitly supersedes.
