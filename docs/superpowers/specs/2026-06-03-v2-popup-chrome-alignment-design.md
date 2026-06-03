# V2 Popup Chrome Alignment — Design

**Date**: 2026-06-03
**Branch**: `feature/v2-popup-redesign`
**Worktree**: `/home/sandy/projects/_underscore/.worktrees/v2-popup-redesign`
**Status**: Approved (grilled through 5 architectural questions)
**Out of scope**: re-designing the visual system; this doc only resolves the chrome-ownership and layout-shell contract.

## 1. Problem

The V2 popup implementation has header/footer alignment issues that diverge from the wireframe contract (`ui_kits/extension/v2/`). The build passes, but the popup shows:

- A `PopupChrome` title strip (rendered by `PopupShell`) and a view-local `ModeHeader` stacked at the top of every screen, sometimes with a third nested `PopupShell` adding another title strip.
- A `TabBar` rendered inside views, sized against a flex column whose height math does not match the wireframe's 400×600 box, so the tab bar clips or sits outside the visible area.
- A `position: absolute, inset: 0` motion wrapper per view in `AnimatePresence` (already using `mode="wait"`) — fine in isolation, but combined with views rendering their own chrome it produces double-painting during transitions.
- `Welcome`, `Auth`, `Privacy`, `NotFound` screens that have no chrome at all (no `ModeHeader`, no `TabBar`), so the popup is bare on those screens.

Root cause: chrome ownership is split between the router (`PopupShell` in `index.tsx`), the shell itself (`PopupChrome` inside `PopupShell`), and each view (per-view `ModeHeader` + `TabBar`). Nothing enforces "exactly one header, exactly one footer, in fixed positions."

## 2. Goals

1. Every popup screen shows exactly one title strip, one mode status row (when applicable), one body, and one tab bar (when applicable) — in fixed positions matching the wireframe.
2. The 400×600 box (set in `src/entrypoints/popup/base.css` on `body`) is divided exactly once into [header / body / footer] by the shell; views cannot accidentally subdivide it further.
3. Chrome does not re-mount on view transitions, so the mode dot, back button, and active tab do not blink between screens.
4. Spec Hard Rule 5 ("Never set `width: 400px` or `height: 600px` inside a view component — PopupShell's job") becomes structurally true, not just convention.

## 3. Non-Goals

- No changes to the visual design system (`tokens.css`, `global.css`, `type-presets.js`).
- No changes to the wireframes in `ui_kits/extension/v2/`.
- No changes to motion presets (`src/ui-system/motion/springs.ts`).
- No changes to the view enum (`View` in `index.tsx`) or to view-level data fetching.

## 4. Architecture

### 4.1 Chrome owner

`PopupShell` owns the chrome. The shell renders:

- The title strip (`PopupChrome`) — outside the 400×600 box, on top of the popup.
- The 400×600 body box (`.popup`) as a flex column with three slots: `ModeHeader` (top, optional), `AnimatePresence`-wrapped body (middle, always), `TabBar` (bottom, optional).

Views are body-only. They do not render `ModeHeader`, `TabBar`, or any inner `PopupShell`. They return content that fills the body slot.

### 4.2 Layout tree

```
PopupShell (the popup)
├── PopupChrome (title strip, optional)                  ← outside 400×600
└── .popup (400×600, flex column)
    ├── ModeHeader (optional, fixed at top of body)     ← inside 400×600
    ├── AnimatePresence mode="wait"                      ← single instance
    │   └── motion.div (position: absolute, inset: 0)   ← fills body slot
    │       └── {renderView(currentView)}               ← body content only
    └── TabBar (optional, fixed at bottom of body)      ← inside 400×600
```

The 400×600 box height is established by `body` in `base.css` (line 8–10). `#app` is `100%` of that. `PopupShell` is a 100%×100% flex column inside `#app`. The title strip eats a fixed ~28px at the top; the remaining height is `.popup`.

`.popup` is `flex: 1` of the popup column, with `display: flex, flex-direction: column, min-height: 0`. `ModeHeader` and `TabBar` are flex children with fixed height (~44px each). The body slot is `flex: 1` of `.popup`, which gets the leftover height.

The motion div is `position: absolute, inset: 0` inside the body slot. Because `AnimatePresence` is `mode="wait"`, at most one view is mounted at a time, so the absolute positioning does not produce double-paint. The view's content uses `height: 100%` to fill the motion div.

### 4.3 Chrome config

`PopupShell` accepts a single `chrome` prop:

```ts
interface PopupChrome {
  title: string;                  // for PopupChrome title strip
  showTitleStrip: boolean;        // false for Welcome, Auth
  showModeHeader: boolean;        // false for Welcome, Auth, ModeSelection
  showTabBar: boolean;            // false for Welcome, Auth, ModeSelection
  modeId: string;                 // active mode, for ModeHeader accent dot
  activeTab?: 'home' | 'collections' | 'capture' | 'settings';
  onTabChange?: (tab: ActiveTab) => void;
  onBack?: () => void;
  backLabel?: string;
  onSwitch?: () => void;          // ModeHeader "Switch ›" → mode selection
}
```

`PopupShell` itself reads `useApp().currentMode` if `modeId` is not supplied (defensive default), and reads `modeRegistry` to look up the mode's accent color and family text for `ModeHeader`.

### 4.4 Chrome map (single source of truth)

Chrome for every view is declared in one factory at module scope. The factory takes a `handlers` object that closes over `index.tsx` local state (e.g. `selectedDomain`, `previousView`) and returns a `Record<View, PopupChrome>` keyed by the `View` enum. Static chrome (titles, tab flags, active tab) lives in the map; dynamic values (`backLabel` that depends on `selectedDomain`) are resolved by the factory at render time.

The reason for a factory instead of a static `const` map: `SUB_DOMAIN`'s `backLabel` must be the currently selected domain, which is local state in `index.tsx`. The factory pattern keeps the chrome shape declarative and audit-able in one file, while letting dynamic values resolve at render time.

```ts
// src/entrypoints/popup/chrome.ts
export interface ChromeHandlers {
  onTabChange: (tab: ActiveTab) => void;
  onSwitch: () => void;
  onBackToCollections: () => void;
  onBackToDomain: () => void;
  onBackFromSettings: () => void;
  subDomainBackLabel: () => string;        // returns selectedDomain
}

export function buildChrome(handlers: ChromeHandlers): Record<View, PopupChrome> {
  return {
    [View.LOADING]: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    [View.WELCOME]: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    [View.MODE_SELECTION]: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    [View.AUTH]: {
      title: '_underscore · sign in',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    [View.DASHBOARD]: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      activeTab: 'home',
      onTabChange: handlers.onTabChange,
      onSwitch: handlers.onSwitch,
    },
    [View.COLLECTIONS]: {
      title: '_underscore · library',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onSwitch: handlers.onSwitch,
    },
    [View.DOMAIN_DETAILS]: {
      title: '_underscore · library',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackToCollections,
      backLabel: 'Library',
      onSwitch: handlers.onSwitch,
    },
    [View.SUB_DOMAIN]: {
      title: '_underscore · library',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackToDomain,
      backLabel: handlers.subDomainBackLabel(),   // resolved at render time
      onSwitch: handlers.onSwitch,
    },
    [View.SETTINGS]: {
      title: '_underscore · settings',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      activeTab: 'settings',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackFromSettings,
      backLabel: 'Library',
      onSwitch: handlers.onSwitch,
    },
  };
}
```

In `index.tsx`, the chrome map is built once per render and passed to `PopupShell`:

```ts
const chrome = useMemo(
  () => buildChrome({
    onTabChange: handleTabChange,
    onSwitch: handleSettingsChangeMode,
    onBackToCollections: handleBackToCollections,
    onBackToDomain: handleBackToDomain,
    onBackFromSettings: handleBackFromSettings,
    subDomainBackLabel: () => selectedDomain,
  }),
  [handleTabChange, handleSettingsChangeMode, handleBackToCollections, handleBackToDomain, handleBackFromSettings, selectedDomain]
);

return (
  <PopupShell chrome={chrome[currentView]}>
    {renderView(currentView)}
  </PopupShell>
);
```

### 4.5 `PopupShell` rendering contract

`PopupShell` renders, in order:

1. If `chrome.showTitleStrip`: `<PopupChrome title={chrome.title} mode={modeId} />`.
2. `.popup` flex column:
   - If `chrome.showModeHeader`: `<ModeHeader modeId={modeId} onBack={chrome.onBack} backLabel={chrome.backLabel} onSwitch={chrome.onSwitch} compact={false} />`.
   - Body slot (always rendered): `<AnimatePresence mode="wait">{motion.div}` with the active view. The motion div is `position: absolute, inset: 0` of the body slot.
   - If `chrome.showTabBar`: `<TabBar active={chrome.activeTab} onChange={chrome.onTabChange} />`.

Body slot layout in `.popup`:

```
.popup {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;        /* allow flex children to shrink */
  position: relative;   /* contain the absolute motion div */
}

.body-slot {
  flex: 1;              /* fill leftover height after ModeHeader and TabBar */
  position: relative;   /* contain the absolute motion div */
  min-height: 0;        /* allow child to be height-constrained */
  overflow: hidden;     /* clip exit animation */
}
```

The motion div inside the body slot is `position: absolute, inset: 0`. The view's content uses `display: flex, flex-direction: column, height: 100%, width: 100%` and lays out its scrollable list with `flex: 1, overflow-y: auto` (already the pattern in `DashboardView`).

### 4.6 View contract

After this change, every view returns body-only content. The contract is:

- The view's outermost element fills the body slot: `display: flex, flex-direction: column, height: 100%, width: 100%`.
- The view's content (titles, lists, scrollable regions) lives inside that root.
- The view's outermost element does not render any chrome (no `ModeHeader`, no `TabBar`, no title strip) above or below the body.
- The view's outermost element does not set `width: 400px` or `height: 600px` (Hard Rule 5) — the body slot already provides those via inheritance from `#app` and `.popup`.
- The view's imports do not include `PopupShell`, `ModeHeader`, or `TabBar`.

Shape (not a prescription for specific inline styles — the wireframe is the source of truth for visual treatment):

```tsx
// Body-only view shape
export function ExampleView(props: ExampleViewProps): React.ReactElement {
  // ... data fetching, callbacks ...
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* page-level content: title, meta, scrollable list, etc. */}
      <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* ... */}
      </div>
    </div>
  );
}
```

### 4.7 AnimatePresence placement

There is exactly **one** `AnimatePresence` in the popup, located inside `PopupShell`'s body slot. Its child is a single `motion.div` per view, swapped by the view enum.

`AnimatePresence` is `mode="wait"` (already configured in current code, line 268). The motion variants from `screenVariants` (lines 42-46) are kept:

```ts
const screenVariants = {
  initial: { opacity: 0, y: 10, scale: 0.984 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 1.012 },
};
```

`motion.div` key is the `View` enum value. Transition uses `springs.gentle` (already configured).

### 4.8 TabBar fix

The current `TabBar` (in `src/ui-system/components/layout/TabBar.tsx`) does not match the wireframe. Fixes:

- Layout: `display: grid; grid-template-columns: repeat(4, 1fr)` (was `flex`).
- Typography: `font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase` (was 13px sans).
- Min-height: 44px (already correct via container).
- Active state: needs a 2px `--accent` top rule (`::before` with `left: 20%, right: 20%`).

These styles live in `global.css` under `.tabbar` (already present from the wireframe token import; verify and add if missing).

## 5. Files Changed

| File | Change |
|------|--------|
| `src/ui-system/components/layout/PopupShell.tsx` | Add `chrome: PopupChrome` prop; render title strip + body slot with AnimatePresence + ModeHeader + TabBar; remove the `chromeStyle` prop and the `PopupChrome` "simple" default (replaced by the explicit `chrome.showTitleStrip`). |
| `src/ui-system/components/layout/TabBar.tsx` | Replace inline styles with className `tabbar`; fix typography, layout, and active state to match wireframe. |
| `src/entrypoints/popup/index.tsx` | Remove the outer `<PopupShell>` wrapping `AnimatePresence`; instead render `<PopupShell chrome={chromeFor(currentView)}>{renderView(currentView)}</PopupShell>`. Keep the per-view `motion.div` inside `AnimatePresence` (now one AnimatePresence, inside `PopupShell`). Move the `useState<View>` switch logic to call `buildChrome(handlers)` once. |
| `src/entrypoints/popup/chrome.ts` (new) | The `CHROME` const map and `buildChrome(handlers)` factory. |
| `src/entrypoints/popup/views/DashboardView.tsx` | Remove inline `ModeHeader` and `TabBar`; return body only. |
| `src/features/collections/views/CollectionsView.tsx` | Remove inner `<PopupShell>`, inline `ModeHeader`, inline `TabBar`; return body only. |
| `src/features/collections/views/DomainDetailsView.tsx` | Same: remove inner `<PopupShell>`, inline `ModeHeader`, inline `TabBar`; return body only. |
| `src/features/collections/views/SubDomainView.tsx` | Same. |
| `src/pages/SettingsPage.tsx` | Same. |
| `src/pages/WelcomePage.tsx` | Already chrome-less; no change needed. |
| `src/pages/PrivacyPage.tsx` | Already chrome-less; no change needed. |
| `src/pages/NotFoundPage.tsx` | Already chrome-less; no change needed. |
| `src/entrypoints/popup/views/AuthView.tsx` | Already chrome-less; no change needed. |
| `src/ui-system/theme/global.css` | Verify `.tabbar` and `.tabbar button.active::before` rules are present; add if missing. |

## 6. Behavior After Change

| Screen | Title strip | ModeHeader | TabBar | Notes |
|--------|-------------|------------|--------|-------|
| Loading | yes | no | no | Spinner centered in body. |
| Welcome | yes | no | no | First-run screen. |
| ModeSelection | yes | no | no | Four mode cards. |
| Auth | yes | no | no | Sign-in form. |
| Dashboard (Home) | yes | yes | yes | Active tab: home. |
| Collections (Library) | yes | yes | yes | Active tab: collections. |
| DomainDetails | yes | yes (back: Library) | yes | Active tab: collections. |
| SubDomain | yes | yes (back: domain) | yes | Active tab: collections. |
| Settings | yes | yes (back: Library) | yes | Active tab: settings. |

All screens render inside the same 400×600 box. The title strip is rendered above the 400×600 boundary. Chrome is owned by the shell; views are body-only.

## 7. Edge Cases

- **State persistence**: `index.tsx`'s `useEffect` that persists `currentView` to `chrome.storage.local` (lines 157-170) is unchanged.
- **Reload-on-error**: `ErrorBoundary`'s fallback (current lines 70-86) renders a self-contained 400×600 div with hardcoded styles. After the change, the error fallback stays self-contained (does not use `PopupShell` and does not read the chrome map). Rationale: the error path is unrecoverable, must work even if the app context is not mounted, and must not depend on the chrome map being importable. The hardcoded `width: 400, height: 600` in the fallback is a permitted exception to Hard Rule 5 because it is inside `ErrorBoundary`, not inside a view component.
- **Hardcoded `md-sys-color-surface` in `base.css`**: lines 14-15 use `--md-sys-color-surface, #f9f9ff` as the body fallback. V2 should use `--paper` instead. Fix as part of this work.
- **Active tab sync between view and chrome**: `activeTab` lives in `index.tsx` (line 100). The chrome map reads it from local state via `handlers`. The shell's `TabBar` highlights the active tab. No change to the `activeTab` state location.
- **`mode="wait"` + `position: absolute`**: confirmed safe. Only one view is mounted at a time. The motion div's `inset: 0` matches the body slot's box.

## 8. Verification

1. `npm run build` in the worktree — must pass with zero errors.
2. `npx tsc --noEmit` in the worktree — must pass.
3. `npx eslint <changed files> --max-warnings 0` — must pass.
4. Load the extension in Chrome, open the popup, and verify each screen:
   - Title strip is visible at the top, showing the correct title.
   - `ModeHeader` is visible below the title strip on Dashboard / Library / Domain / SubDomain / Settings.
   - `ModeHeader` shows the active mode's accent dot and family text.
   - "Switch ›" button is visible on `ModeHeader` for all chrome-having screens.
   - Back button is visible on `ModeHeader` only for Domain / SubDomain / Settings.
   - `TabBar` is visible at the bottom on chrome-having screens, with the active tab marked.
   - Transitions between screens animate the body only; the title strip and `ModeHeader` do not blink or re-mount.
5. Token discipline: `grep -n '#[0-9a-fA-F]' src/entrypoints/popup/{index.tsx,chrome.ts} src/ui-system/components/layout/{PopupShell,ModeHeader,TabBar}.tsx` — should return zero results.

## 9. Out of Scope

- Visual redesign of `TabBar` (typography, accent rule) — covered as a small fix in §4.8 but no new visual treatment.
- Capturing/recording motion presets (kept as-is).
- Web app parallel (`src/web/app/`) — this spec targets the extension popup only.
- Dark mode — V2 is light-only per spec Hard Rule 7.
