# PRD: Install Hard Gate (Guest) + Single-Browser Download

**Status:** Ready for agent  
**Date:** 2026-08-23  
**Triage:** `ready-for-agent` (local only — do not publish GitHub issue)  
**Supersedes / amends:** `2026-08-23-web-install-extension-onboarding-prd.md` on soft gate, dual-browser always-on UI, and “Continue without installing” for guests. Phase-2 detection intent is pulled forward as a **guest route gate** (still not API attestation).  
**Source:** Grilling 2026-08-23 (Q1–Q12 locked).

---

## Problem Statement

Guests can open the web product shell with no extension, which is empty and confusing. The install page shows both Chrome and Firefox even when the browser is known, plus noisy “Detected” chrome. Soft “continue without installing” undermines the fact that capture requires the extension.

## Solution

1. **Install UI:** Professional editorial folio. If UA is Chrome or Firefox, show **only that** download; unknown → both. No “Detected” chip, no name underline. Optional “Wrong browser?” reveals the other. Meta one line; primary Download; Help for load steps. **Remove** Continue without installing for the guest hard path.
2. **Guest hard gate (SPA):** Guests cannot open `/home`, `/library`, `/settings` without a successful **extension ping**. Redirect to `/install`. Fail closed.
3. **Signed-in:** May use product routes without extension (cloud library viewer).
4. **Public ungated:** `/`, `/install`, `/help`, `/privacy`, `/terms`, auth routes.
5. **This slice is not API/backend extension auth** — JWT/session unchanged. Document that clearly.

---

## User Stories

1. As a **guest on Chrome**, I want only a Chrome download, so that I am not offered Firefox.
2. As a **guest on Firefox**, I want only a Firefox download, so that the page matches my browser.
3. As a **guest on an unknown browser**, I want both downloads and a desktop note, so that I can still proceed on a computer.
4. As a **guest who misfires UA**, I want “Wrong browser?”, so that I can get the other package without clutter by default.
5. As a **guest**, I do not want a “Detected” label or decorative underline on the browser name, so that the page feels calm and professional.
6. As a **guest**, I want a short title and one clear lede, so that hierarchy is obvious.
7. As a **guest**, I want one mono meta line (desktop · not in stores · version), so that status is not three grey paragraphs.
8. As a **guest**, I want a primary Download control, so that the next action is obvious.
9. As a **guest**, I want “How to load it” to Help, so that steps stay off the download page.
10. As a **guest**, I do not want “Continue without installing”, so that I cannot skip into an empty product.
11. As a **guest without the extension**, I want `/home` to send me to `/install`, so that I cannot use the shell empty-handed.
12. As a **guest without the extension**, I want `/library` and `/settings` blocked the same way, so that the gate is consistent.
13. As a **guest with a successful extension ping**, I want product routes to work, so that install unlocks the app.
14. As a **guest when ping fails or times out**, I want to stay treated as not installed, so that the gate fails closed.
15. As a **signed-in user without the extension**, I want `/home` and library to work, so that I can still browse synced highlights.
16. As a **signed-in user**, I want optional install CTAs only when useful (e.g. empty), so that I am not hard-blocked.
17. As a **visitor to Privacy/Help/Terms/Welcome/Install/Sign-in**, I want no extension gate, so that legal and auth stay reachable.
18. As a **developer**, I want a test inject for ping result, so that gate tests do not depend on a real extension.
19. As a **developer**, I want APIs to keep JWT/session auth only this slice, so that scope stays shippable.
20. As a **product owner**, I want the PRD to state that “backend knows extension” is **out of scope**, so that expectations match SPA reality.

---

## Implementation Decisions

1. **Amend install page:** single primary download when `detectInstallBrowser()` is chrome|firefox; both when unknown; “Wrong browser?” toggle for the other package.
2. **Strip UI chrome:** no Detected hint; no accent underline on browser name; no guest Continue button.
3. **Guest route guard:** product shell routes check auth + extension presence. Guest && !pingSuccess → navigate `/install` (replace).
4. **Ping:** best-effort web→extension message via existing externally_connectable / extension id direction; timeout = failure. Optional version in response if cheap; inject seam required.
5. **Do not use** weak `isExtensionInstalled()` heuristic alone as truth for the gate.
6. **Signed-in bypass** of the extension gate (viewer mode).
7. **Public route allowlist** as listed in Solution.
8. **No Supabase/Workers change** requiring extension proof headers this slice.
9. **Copy:** title “Install the extension”; lede one sentence capture→library; meta compact.

Prototype shape (decision-rich):

```ts
type ExtensionPresence = 'installed' | 'missing' | 'unknown';
// Gate: if !isAuthenticated && presence !== 'installed' → /install
// Tests inject presence; production uses ping with timeout → missing on fail
```

---

## Testing Decisions

**Good tests:** navigation outcomes and visible download set; inject presence; do not assert CSS classes as product behavior.

**Seams (confirmed via grilling):**
1. Install page: single vs dual download by detected browser; Wrong browser toggle; no Continue for guest path.
2. Guest + missing extension → `/home`|`/library`|`/settings` redirect `/install`.
3. Guest + injected installed → product routes render.
4. Signed-in + missing extension → product routes still render.
5. Public routes never redirect to install for extension reasons.
6. Ping helper unit: success / timeout / error → presence enum.

**Prior art:** InstallPage tests, Welcome routing tests, ProtectedRoute patterns, session-bridge messaging.

---

## Out of Scope

- Server/API rejection based on extension proof  
- Cryptographic device attestation  
- Hard-blocking signed-in users without extension  
- Full Firefox/Chrome sideload E2E in CI  
- Runtime AMO/CWS listing APIs  
- Popup install UX changes  

---

## Further Notes

### Locked grill log

| ID | Decision |
|----|----------|
| Q1 | Client route hard gate (not API) |
| Q2 | Real ping; handshake if cheap |
| Q3 | Guests gated; signed-in viewer OK |
| Q4 | Remove Continue without installing |
| Q5 | Single browser when known |
| Q6 | Editorial folio, professional |
| Q7 | Authed always may skip install redirect |
| Q8 | Any product shell visit; fail closed |
| Q9 | Best-effort ping + inject; full handshake optional |
| Q10 | Public allowlist A |
| Q11 | Single download + Wrong browser? |
| Q12 | SPA guard only; document non-API |

### Relation to prior PRD

Phase 1 soft gate and dual always-visible browsers are **replaced** for guests. Distribution mode config and hosted zips remain. Help long-form steps remain.

### Publish

**Local spec only.** Do not open a GitHub issue unless product asks later.
