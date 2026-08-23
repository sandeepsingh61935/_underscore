# Mode in Settings — Minimal-Click Design (code-grounded)

**Date:** 2026-07-21 (rev 2 — production-sourced)  
**Status:** Proposed  
**Wireframes:** `ui_kits/extension/v2/` section ① *Mode in Settings (from production code)*  
**Do not trust:** archived 4-mode kits (`ephemeral/local/cloud/ai`) or stale `ui-system` ModeSelector Tailwind variants for IA decisions.

---

## 1. What the codebase actually does

### Mode identity

| Internal id | UI (`MODE_BRANDING`) | Session rule (`usePersistedMode`) |
|-------------|----------------------|-----------------------------------|
| `basic` | Guest · Local only | **Only** when logged out. Authed → refused / promoted to `pro`. |
| `pro` | Account (Free) · Synced | Requires auth |
| `pro_xai` | Account (Paid) · Synced + AI | Requires auth |

There is **no legal 3-way picker** in either session:

```ts
// usePersistedMode.applyAndPersistMode
if (!authRef.current && AUTH_REQUIRED_MODES.includes(mode)) return;
if (authRef.current && mode === 'basic') return;
```

### Settings today (`SettingsPage.tsx`)

```tsx
<Row
  title="Mode"
  sub={isAuthenticated ? `${modeBranding.displayName} · ${modeBranding.tagline…}` : 'Guest'}
  right={monoTrailing(isAuthenticated ? 'Change' : 'Local')}
  onClick={isAuthenticated ? onChangeMode : undefined}  // guest: dead row
/>
```

- **Guest:** Mode is display-only (`Local`). Cloud path is Account → Sign in.
- **Authed:** `onChangeMode` → popup `handleSettingsChangeMode` → `View.MODE_SELECTION`.

### Mode page today (`ModeSelectionView` + popup chrome)

- Full view, **no** ModeHeader, **no** TabBar (`chrome.ts` `MODE_SELECTION`).
- Two-step: row select + **Continue** (and **Later**).
- Authed: Guest section empty copy; only Free/Paid rows (`localModes = []`).
- Unauthed Continue on Free/Paid → `onSignInClick` → AUTH + `pendingAuthMode`.

### Other entry points to the same page

| Trigger | Handler |
|---------|---------|
| ModeHeader **Switch ›** | `buildChrome` → `onSwitch: handleSettingsChangeMode` on every tabbed view |
| Welcome **Get started** | `handleStartWelcome` → always `MODE_SELECTION` |
| First route | `resolvePopupInitialRoute`: `!hasSeenModeSelection` → `MODE_SELECTION` |
| Logout | `handleLogout` → `persistPopupView('MODE_SELECTION')` |

### Transitions (`mode-transition-rules.ts`)

- `pro` ↔ `pro_xai`: allowed, **no** confirmation.
- Anything involving `basic`: confirmation + auth guards; effectively **sign-out / sign-in**, not an in-session toggle.
- `useModeTransition` also hard-returns if authed user requests `basic`, and inserts an **1800ms** delay (settings path should not use this delay).

### Empty library today

`LibraryEmptyGuest`: value copy + **Sign in** — already the right guest education pattern. Not a mode picker.

### graphify notes (src graph)

- `ModeType` is a high-betweenness bridge (popup bootstrap, capabilities, selection UI).
- `SettingsPage` has **no** `setMode` edge — mode mutation is outside Settings today.
- Duplicate UI surfaces: `features/modes/*`, `ui-system/pages/ModeSelectionView`, `ui-system/components/composed/ModeSelector` (legacy classes). Consolidation target: one Settings-owned control.

---

## 2. Problem (reframed)

Users do not need a “mode room.”

| Session | Real choice | Today’s cost |
|---------|-------------|--------------|
| Guest | Stay local **or** sign in | Forced MODE_SELECTION on first run; Switch › still opens full page |
| Authed | **Free ↔ Paid** | Settings Change / Switch › → full page → Continue (4–5 clicks) |

The shipping ModeSelection copy still talks about “two families / three modes” while runtime only ever offers a **binary plan** when signed in.

---

## 3. Principles

1. **UI offers only legal transitions** (`usePersistedMode` is law).
2. **Settings owns plan changes** for signed-in users.
3. **Immediate apply** for `pro` ↔ `pro_xai` (matrix already says no confirm).
4. **Guest mode is not switched** — it is the logged-out state. Account row is the upgrade path.
5. **ModeHeader is status**, never navigation.
6. **Onboarding defaults to Guest value**, not configuration.

---

## 4. Recommended UI

### A. Settings · authenticated (primary)

Replace Mode `Change ›` row with a **Typography-style** control:

**Collapsed summary (default when browsing Settings):**

```
Mode
Account (Free) · synced                         ▸
```

**Expanded (or always-open variant):**

```
MODE
Applies immediately · signed-in plans only

Account (Free)  [Free]                     ● active
  Signed in. Synced across every device…

Account (Paid)  [Paid]                     ○
  Cloud sync plus Connect to AI…

Guest is only available when signed out · use Sign out below
```

Visual tokens: same as production Settings — `Row` rhythm, `var(--paper-2)` active, mono `● active`, existing **Free/Paid** plan pills from Account row, italic blurb from `MODE_BRANDING.description`.

**Prefer always-open** if we want absolute minimum clicks (1 tap from Settings). Prefer expand if AI/Library sections make scroll painful — both mocked.

Tap → `setMode('pro' | 'pro_xai')` via existing app context / `usePersistedMode`. Stay on Settings. Update ModeHeader label through `currentMode`.

Paid entitlement gate (if billing not wired): keep selection optimistic or open upgrade URL — product decision; do not reopen MODE_SELECTION.

### B. Settings · guest

Keep Mode **non-interactive** (matches today’s `onClick={undefined}`), improve subtitle:

```
Mode
Guest · local only · this device                Local
```

One italic helper line (not a second page):

> Sync, export, and AI unlock when you sign in. Use Account below.

Account row already has accent **Sign in** — that remains the only guest→cloud path.

### C. ModeHeader

Stop passing `onSwitch` from `buildChrome` for COLLECTIONS / SETTINGS / DASHBOARD / etc.

Before: `ACCOUNT (FREE) · CLOUD …… Switch ›`  
After:  `ACCOUNT (FREE) · CLOUD`

### D. Onboarding

```
!hasSeenWelcome
  └─ WELCOME
        ├─ Start highlighting →  set welcome+mode_selection seen, mode=basic, COLLECTIONS
        └─ I have an account  →  AUTH (optional secondary; WelcomePage today only has Get started)

hasSeenWelcome && session
  └─ restore last view / COLLECTIONS   (never MODE_SELECTION)
```

Delete or no-op the `!hasSeenModeSelection → MODE_SELECTION` branch in `resolvePopupInitialRoute`.

Logout: `setMode('basic')` (already via auth effect) + stay on Settings or Library — **remove** `persistPopupView('MODE_SELECTION')`.

Library empty: keep `LibraryEmptyGuest` as-is (already correct).

### E. Web

`/mode` (`ModeSelectionRoute`) → redirect to settings mode section. Do not maintain a second picker IA.

---

## 5. Click budget (acceptance)

| Task | Max |
|------|-----|
| Authed, already in Settings, Free→Paid | **1** |
| Authed, from Library | **2** (Settings tab → plan) |
| First-run to highlight-ready Guest | **1** (Start highlighting) |
| Guest → cloud capabilities | Account **Sign in** (auth flow; unavoidable) |
| Any path opens full-screen mode chooser solely to change plan | **0 (fail)** |

---

## 6. Implementation map (when building)

| Area | Change |
|------|--------|
| `SettingsPage.tsx` | Inline Free/Paid control; drop `onChangeMode` navigation |
| `usePersistedMode` / `useApp().setMode` | Call directly from Settings |
| `ModeHeader` + `chrome.ts` | Remove `onSwitch` wiring |
| `resolve-popup-initial-route.ts` | Never return `MODE_SELECTION` |
| `popup/index.tsx` | Welcome→Collections; logout stays; retire mode view handlers |
| `ModeSelectionView` | Delete or reduce to shared list used only inside Settings |
| `useModeTransition` | Do not use 1800ms path from Settings; web navigateAfter → settings |
| Tests | Settings apply Free/Paid; guest row inert; initial route; logout; chrome no Switch |

---

## 7. Open product questions

1. **Paid without entitlement:** block tap, toast, or open billing tab?
2. **Expand vs always-open** for the Free/Paid list?
3. **Welcome secondary CTA** (“I have an account”) — add, or rely on Library empty / Account Sign in only?

Defaults: (1) billing tab if unpaid, (2) always-open, (3) add secondary CTA on Welcome for parity with Library empty.

---

## 8. Explicitly out of scope / rejected

- Reintroducing ephemeral/local/cloud/ai four-mode marketing IA in Settings.
- Keeping Switch › “for power users.”
- Offering Guest as a selectable row while signed in (runtime refuses it).
- Confirm + Continue for Free↔Paid.
