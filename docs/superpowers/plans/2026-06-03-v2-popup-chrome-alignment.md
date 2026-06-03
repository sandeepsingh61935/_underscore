# V2 Popup Chrome Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix header/footer alignment in the V2 popup by making `PopupShell` the sole owner of the chrome (title strip + `ModeHeader` + `TabBar`) and reducing views to body-only content. The change matches the wireframe contract in `ui_kits/extension/v2/` and makes the 400×600 box invariant structurally true.

**Architecture:** One `AnimatePresence` lives inside `PopupShell`; the chrome above and below it is rendered by the shell itself and does not re-mount on view transitions. A `buildChrome(handlers)` factory returns a `Record<View, PopupChrome>` keyed by the `View` enum — the chrome config is the single source of truth for what chrome is visible on each screen. Views are body-only and never import chrome primitives.

**Tech Stack:** React 19, TypeScript strict, framer-motion (`AnimatePresence`, `motion.div`), Vitest + @testing-library/react, Vitest config with `globals: true`, jsdom environment.

**Working Directory:** `/home/sandy/projects/_underscore/.worktrees/v2-popup-redesign`
**Branch:** `feature/v2-popup-redesign`
**Spec:** `docs/superpowers/specs/2026-06-03-v2-popup-chrome-alignment-design.md`

---

## File Map

| File | Role |
|------|------|
| `src/entrypoints/popup/chrome.ts` (new) | `buildChrome(handlers)` factory + `PopupChrome` type + `ChromeHandlers` type. Single source of truth for chrome per view. |
| `src/entrypoints/popup/chrome.test.ts` (new) | Vitest unit tests for `buildChrome`. No DOM. |
| `src/ui-system/components/layout/PopupShell.tsx` (modify) | Accept `chrome: PopupChrome` prop. Render `PopupChrome` strip + `.popup` flex column with `ModeHeader` + AnimatePresence-wrapped body slot + `TabBar`. Remove the old `chromeStyle` prop. |
| `src/ui-system/components/layout/PopupShell.test.tsx` (new) | Render tests: chrome slots appear/disappear based on `chrome` prop, body slot renders children, motion div has `position: absolute, inset: 0`. |
| `src/ui-system/components/layout/TabBar.tsx` (modify) | Replace inline styles with className `tabbar`. Match wireframe: grid layout, mono 10px, 0.14em letter-spacing, uppercase, accent top rule on active. |
| `src/ui-system/components/layout/TabBar.test.tsx` (new) | Render tests: four tabs render, active tab gets accent rule, click invokes `onChange`. |
| `src/entrypoints/popup/index.tsx` (modify) | Remove the outer `<PopupShell>` wrapper around `AnimatePresence`. Wrap the active view in a single `PopupShell` with chrome derived from `buildChrome(handlers)`. One `AnimatePresence` total, inside the shell's body slot. |
| `src/entrypoints/popup/views/DashboardView.tsx` (modify) | Remove inline `ModeHeader` and `TabBar`. Return body only. |
| `src/features/collections/views/CollectionsView.tsx` (modify) | Remove inner `<PopupShell>`, inline `ModeHeader`, inline `TabBar`. Return body only. |
| `src/features/collections/views/DomainDetailsView.tsx` (modify) | Same. |
| `src/features/collections/views/SubDomainView.tsx` (modify) | Same. |
| `src/pages/SettingsPage.tsx` (modify) | Same. |
| `src/ui-system/theme/global.css` (modify) | Verify and add `.tabbar` and `.tabbar button.active::before` rules. |
| `src/entrypoints/popup/base.css` (modify) | Replace `--md-sys-color-surface, #f9f9ff` fallback with `var(--paper)`; `--md-sys-color-on-surface` with `var(--ink)`. |

---

## Task 1: Define `PopupChrome` and `ChromeHandlers` types

**Files:**
- Create: `src/entrypoints/popup/chrome.ts`

- [ ] **Step 1: Create `chrome.ts` with type definitions only**

```ts
// src/entrypoints/popup/chrome.ts
import type { ReactNode } from 'react';

export type ActiveTab = 'home' | 'collections' | 'capture' | 'settings';
export type ViewKey =
  | 'LOADING'
  | 'WELCOME'
  | 'MODE_SELECTION'
  | 'COLLECTIONS'
  | 'DOMAIN_DETAILS'
  | 'SUB_DOMAIN'
  | 'AUTH'
  | 'SETTINGS'
  | 'DASHBOARD';

export interface PopupChrome {
  title: string;
  showTitleStrip: boolean;
  showModeHeader: boolean;
  showTabBar: boolean;
  modeId?: string;
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onBack?: () => void;
  backLabel?: string;
  onSwitch?: () => void;
}

export interface ChromeHandlers {
  onTabChange: (tab: ActiveTab) => void;
  onSwitch: () => void;
  onBackToCollections: () => void;
  onBackToDomain: () => void;
  onBackFromSettings: () => void;
  subDomainBackLabel: () => string;
  getModeId: () => string;
}

export type ChromeMap = Record<ViewKey, PopupChrome>;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check`
Expected: zero errors. The file is referenced by later tasks; not yet imported.

- [ ] **Step 3: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/entrypoints/popup/chrome.ts
git commit -m "feat(popup): add PopupChrome type definitions"
```

---

## Task 2: Test `buildChrome` factory — initial

**Files:**
- Create: `src/entrypoints/popup/chrome.test.ts`
- Modify: `src/entrypoints/popup/chrome.ts`

- [ ] **Step 1: Write the first failing test for `buildChrome` returning a chrome for `LOADING`**

```ts
// src/entrypoints/popup/chrome.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildChrome, type ChromeHandlers } from './chrome';

const makeHandlers = (): ChromeHandlers => ({
  onTabChange: vi.fn(),
  onSwitch: vi.fn(),
  onBackToCollections: vi.fn(),
  onBackToDomain: vi.fn(),
  onBackFromSettings: vi.fn(),
  subDomainBackLabel: vi.fn(() => 'anthropic.com'),
  getModeId: vi.fn(() => 'local'),
});

describe('buildChrome', () => {
  it('returns chrome-less config for LOADING', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.LOADING.title).toBe('_underscore');
    expect(map.LOADING.showTitleStrip).toBe(true);
    expect(map.LOADING.showModeHeader).toBe(false);
    expect(map.LOADING.showTabBar).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: FAIL with "buildChrome is not a function" or "Cannot find module './chrome'"

- [ ] **Step 3: Implement `buildChrome` with the LOADING entry**

Edit `src/entrypoints/popup/chrome.ts` and append the factory:

```ts
export function buildChrome(handlers: ChromeHandlers): ChromeMap {
  return {
    LOADING: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    WELCOME: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    MODE_SELECTION: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    COLLECTIONS: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    DOMAIN_DETAILS: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    SUB_DOMAIN: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    AUTH: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    SETTINGS: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
    DASHBOARD: { title: '', showTitleStrip: false, showModeHeader: false, showTabBar: false },
  };
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/entrypoints/popup/chrome.ts src/entrypoints/popup/chrome.test.ts
git commit -m "feat(popup): add buildChrome factory with LOADING entry"
```

---

## Task 3: Test and implement WELCOME / MODE_SELECTION / AUTH chrome

**Files:**
- Modify: `src/entrypoints/popup/chrome.test.ts`
- Modify: `src/entrypoints/popup/chrome.ts`

- [ ] **Step 1: Append failing tests for WELCOME, MODE_SELECTION, AUTH**

```ts
// Append to src/entrypoints/popup/chrome.test.ts
describe('chrome-having screens', () => {
  it('WELCOME has title strip but no ModeHeader or TabBar', () => {
    const map = buildChrome(makeHandlers());
    expect(map.WELCOME.title).toBe('_underscore');
    expect(map.WELCOME.showTitleStrip).toBe(true);
    expect(map.WELCOME.showModeHeader).toBe(false);
    expect(map.WELCOME.showTabBar).toBe(false);
  });

  it('MODE_SELECTION has title strip but no ModeHeader or TabBar', () => {
    const map = buildChrome(makeHandlers());
    expect(map.MODE_SELECTION.title).toBe('_underscore');
    expect(map.MODE_SELECTION.showModeHeader).toBe(false);
    expect(map.MODE_SELECTION.showTabBar).toBe(false);
  });

  it('AUTH has "_underscore · sign in" title and no chrome', () => {
    const map = buildChrome(makeHandlers());
    expect(map.AUTH.title).toBe('_underscore · sign in');
    expect(map.AUTH.showTitleStrip).toBe(true);
    expect(map.AUTH.showModeHeader).toBe(false);
    expect(map.AUTH.showTabBar).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: FAIL — WELCOME / MODE_SELECTION / AUTH have empty titles and `showTitleStrip: false` in the current stub.

- [ ] **Step 3: Update the factory entries**

Edit `src/entrypoints/popup/chrome.ts` and replace the WELCOME / MODE_SELECTION / AUTH entries:

```ts
    WELCOME: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    MODE_SELECTION: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
    AUTH: {
      title: '_underscore · sign in',
      showTitleStrip: true,
      showModeHeader: false,
      showTabBar: false,
    },
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: PASS for all chrome.test.ts tests

- [ ] **Step 5: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/entrypoints/popup/chrome.ts src/entrypoints/popup/chrome.test.ts
git commit -m "feat(popup): chrome for WELCOME / MODE_SELECTION / AUTH"
```

---

## Task 4: Test and implement DASHBOARD chrome

**Files:**
- Modify: `src/entrypoints/popup/chrome.test.ts`
- Modify: `src/entrypoints/popup/chrome.ts`

- [ ] **Step 1: Append failing tests for DASHBOARD**

```ts
// Append to src/entrypoints/popup/chrome.test.ts
describe('chrome-having screens with tab bar', () => {
  it('DASHBOARD has title, ModeHeader, TabBar; activeTab is home', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.DASHBOARD.title).toBe('_underscore');
    expect(map.DASHBOARD.showTitleStrip).toBe(true);
    expect(map.DASHBOARD.showModeHeader).toBe(true);
    expect(map.DASHBOARD.showTabBar).toBe(true);
    expect(map.DASHBOARD.activeTab).toBe('home');
    expect(map.DASHBOARD.onTabChange).toBe(handlers.onTabChange);
    expect(map.DASHBOARD.onSwitch).toBe(handlers.onSwitch);
  });

  it('DASHBOARD forwards getModeId() into modeId', () => {
    const handlers = makeHandlers();
    handlers.getModeId = vi.fn(() => 'cloud');
    const map = buildChrome(handlers);
    expect(map.DASHBOARD.modeId).toBe('cloud');
  });
});
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: FAIL — DASHBOARD has `showModeHeader: false`, no `activeTab`, no `modeId`.

- [ ] **Step 3: Implement DASHBOARD entry**

```ts
    DASHBOARD: {
      title: '_underscore',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'home',
      onTabChange: handlers.onTabChange,
      onSwitch: handlers.onSwitch,
    },
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/entrypoints/popup/chrome.ts src/entrypoints/popup/chrome.test.ts
git commit -m "feat(popup): chrome for DASHBOARD with modeId forwarding"
```

---

## Task 5: Test and implement COLLECTIONS / DOMAIN_DETAILS chrome

**Files:**
- Modify: `src/entrypoints/popup/chrome.test.ts`
- Modify: `src/entrypoints/popup/chrome.ts`

- [ ] **Step 1: Append failing tests**

```ts
// Append to src/entrypoints/popup/chrome.test.ts
  it('COLLECTIONS has "_underscore · library" title, activeTab collections', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.COLLECTIONS.title).toBe('_underscore · library');
    expect(map.COLLECTIONS.showModeHeader).toBe(true);
    expect(map.COLLECTIONS.showTabBar).toBe(true);
    expect(map.COLLECTIONS.activeTab).toBe('collections');
  });

  it('COLLECTIONS has no back button (root of library stack)', () => {
    const map = buildChrome(makeHandlers());
    expect(map.COLLECTIONS.onBack).toBeUndefined();
    expect(map.COLLECTIONS.backLabel).toBeUndefined();
  });

  it('DOMAIN_DETAILS has back button with label "Library"', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.DOMAIN_DETAILS.onBack).toBe(handlers.onBackToCollections);
    expect(map.DOMAIN_DETAILS.backLabel).toBe('Library');
    expect(map.DOMAIN_DETAILS.activeTab).toBe('collections');
  });
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement COLLECTIONS and DOMAIN_DETAILS entries**

```ts
    COLLECTIONS: {
      title: '_underscore · library',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onSwitch: handlers.onSwitch,
    },
    DOMAIN_DETAILS: {
      title: '_underscore · library',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackToCollections,
      backLabel: 'Library',
      onSwitch: handlers.onSwitch,
    },
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/entrypoints/popup/chrome.ts src/entrypoints/popup/chrome.test.ts
git commit -m "feat(popup): chrome for COLLECTIONS and DOMAIN_DETAILS"
```

---

## Task 6: Test and implement SUB_DOMAIN chrome (dynamic backLabel)

**Files:**
- Modify: `src/entrypoints/popup/chrome.test.ts`
- Modify: `src/entrypoints/popup/chrome.ts`

- [ ] **Step 1: Append failing test for SUB_DOMAIN dynamic backLabel**

```ts
// Append to src/entrypoints/popup/chrome.test.ts
  it('SUB_DOMAIN backLabel is resolved from handlers.subDomainBackLabel()', () => {
    const handlers = makeHandlers();
    handlers.subDomainBackLabel = vi.fn(() => 'nytimes.com');
    const map = buildChrome(handlers);
    expect(map.SUB_DOMAIN.onBack).toBe(handlers.onBackToDomain);
    expect(map.SUB_DOMAIN.backLabel).toBe('nytimes.com');
    expect(handlers.subDomainBackLabel).toHaveBeenCalled();
  });

  it('SUB_DOMAIN re-evaluates backLabel on each buildChrome call', () => {
    const handlers = makeHandlers();
    handlers.subDomainBackLabel = vi.fn(() => 'anthropic.com');
    buildChrome(handlers);
    handlers.subDomainBackLabel = vi.fn(() => 'theguardian.com');
    const map = buildChrome(handlers);
    expect(map.SUB_DOMAIN.backLabel).toBe('theguardian.com');
  });
```

- [ ] **Step 2: Run the tests, confirm they fail**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: FAIL — SUB_DOMAIN has `backLabel: undefined`.

- [ ] **Step 3: Implement SUB_DOMAIN entry**

```ts
    SUB_DOMAIN: {
      title: '_underscore · library',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'collections',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackToDomain,
      backLabel: handlers.subDomainBackLabel(),
      onSwitch: handlers.onSwitch,
    },
```

- [ ] **Step 4: Run the tests, confirm they pass**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/entrypoints/popup/chrome.ts src/entrypoints/popup/chrome.test.ts
git commit -m "feat(popup): chrome for SUB_DOMAIN with dynamic backLabel"
```

---

## Task 7: Test and implement SETTINGS chrome

**Files:**
- Modify: `src/entrypoints/popup/chrome.test.ts`
- Modify: `src/entrypoints/popup/chrome.ts`

- [ ] **Step 1: Append failing test for SETTINGS**

```ts
// Append to src/entrypoints/popup/chrome.test.ts
  it('SETTINGS has "_underscore · settings" title, activeTab settings', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.SETTINGS.title).toBe('_underscore · settings');
    expect(map.SETTINGS.showModeHeader).toBe(true);
    expect(map.SETTINGS.showTabBar).toBe(true);
    expect(map.SETTINGS.activeTab).toBe('settings');
    expect(map.SETTINGS.onBack).toBe(handlers.onBackFromSettings);
    expect(map.SETTINGS.backLabel).toBe('Library');
  });
```

- [ ] **Step 2: Run the test, confirm it fails**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement SETTINGS entry**

```ts
    SETTINGS: {
      title: '_underscore · settings',
      showTitleStrip: true,
      showModeHeader: true,
      showTabBar: true,
      modeId: handlers.getModeId(),
      activeTab: 'settings',
      onTabChange: handlers.onTabChange,
      onBack: handlers.onBackFromSettings,
      backLabel: 'Library',
      onSwitch: handlers.onSwitch,
    },
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/entrypoints/popup/chrome.ts src/entrypoints/popup/chrome.test.ts
git commit -m "feat(popup): chrome for SETTINGS"
```

---

## Task 8: Verify chrome factory is complete

**Files:**
- Read-only verification of `src/entrypoints/popup/chrome.ts`

- [ ] **Step 1: Run all chrome tests, confirm 100% pass**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/chrome.test.ts --reporter=verbose`
Expected: all tests pass, all 9 view keys (LOADING, WELCOME, MODE_SELECTION, COLLECTIONS, DOMAIN_DETAILS, SUB_DOMAIN, AUTH, SETTINGS, DASHBOARD) are covered.

- [ ] **Step 2: Type-check**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check`
Expected: zero errors

- [ ] **Step 3: Lint changed files**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx eslint src/entrypoints/popup/chrome.ts src/entrypoints/popup/chrome.test.ts --max-warnings 0`
Expected: zero warnings, zero errors

- [ ] **Step 4: No commit (Tasks 1-7 already committed; this is verification only)**

---

## Task 9: Test and fix TabBar typography + active state

**Files:**
- Modify: `src/ui-system/theme/global.css`
- Modify: `src/ui-system/components/layout/TabBar.tsx`
- Create: `src/ui-system/components/layout/TabBar.test.tsx`

- [ ] **Step 1: Verify `.tabbar` and `.tabbar button.active::before` rules exist in `global.css`**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && grep -n "\.tabbar" src/ui-system/theme/global.css`
Expected: existing rules. If absent, proceed to Step 2. If present, skip to Step 3.

- [ ] **Step 2: Add the wireframe tabbar rules to `global.css` (only if Step 1 found nothing)**

Append to `src/ui-system/theme/global.css`:

```css
.tabbar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--rule);
  background: var(--paper);
}
.tabbar button {
  all: unset;
  padding: 12px 0;
  text-align: center;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tabbar button.active {
  color: var(--ink);
  position: relative;
}
.tabbar button.active::before {
  content: "";
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  border-top: 2px solid var(--accent);
}
```

- [ ] **Step 3: Write failing tests for TabBar**

```tsx
// src/ui-system/components/layout/TabBar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { TabBar } from './TabBar';

describe('TabBar', () => {
  it('renders four tabs in order: Home, Library, Capture, Settings', () => {
    render(<TabBar active="home" onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveTextContent('Home');
    expect(buttons[1]).toHaveTextContent('Library');
    expect(buttons[2]).toHaveTextContent('Capture');
    expect(buttons[3]).toHaveTextContent('Settings');
  });

  it('marks the active tab with the "active" class', () => {
    render(<TabBar active="collections" onChange={vi.fn()} />);
    expect(screen.getByText('Library').className).toContain('active');
    expect(screen.getByText('Home').className).not.toContain('active');
  });

  it('invokes onChange with the tab id when a tab is clicked', () => {
    const onChange = vi.fn();
    render(<TabBar active="home" onChange={onChange} />);
    fireEvent.click(screen.getByText('Settings'));
    expect(onChange).toHaveBeenCalledWith('settings');
  });
});
```

- [ ] **Step 4: Run tests, confirm they fail**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/ui-system/components/layout/TabBar.test.tsx`
Expected: FAIL — current TabBar has wrong typography and may not apply `active` className correctly.

- [ ] **Step 5: Replace TabBar implementation**

Write `src/ui-system/components/layout/TabBar.tsx`:

```tsx
import React from 'react';

import type { ActiveTab } from '../../../entrypoints/popup/chrome';

export interface TabBarProps {
  active?: ActiveTab;
  onChange?: (tab: ActiveTab) => void;
}

const TABS: ReadonlyArray<{ id: ActiveTab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'collections', label: 'Library' },
  { id: 'capture', label: 'Capture' },
  { id: 'settings', label: 'Settings' },
];

export function TabBar({ active = 'home', onChange }: TabBarProps): React.ReactElement {
  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={active === t.id ? 'active' : ''}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => onChange?.(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 6: Run tests, confirm they pass**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/ui-system/components/layout/TabBar.test.tsx`
Expected: PASS

- [ ] **Step 7: Type-check**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check`
Expected: zero errors

- [ ] **Step 8: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/ui-system/components/layout/TabBar.tsx src/ui-system/components/layout/TabBar.test.tsx src/ui-system/theme/global.css
git commit -m "feat(ui): TabBar matches wireframe — grid + mono + accent rule"
```

---

## Task 10: Test PopupShell chrome rendering — showTitleStrip

**Files:**
- Modify: `src/ui-system/components/layout/PopupShell.tsx`
- Create: `src/ui-system/components/layout/PopupShell.test.tsx`

- [ ] **Step 1: Write failing test for `PopupShell` rendering the title strip when `chrome.showTitleStrip` is true**

```tsx
// src/ui-system/components/layout/PopupShell.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { PopupShell } from './PopupShell';
import type { PopupChrome } from '../../../entrypoints/popup/chrome';

const baseChrome: PopupChrome = {
  title: '_underscore',
  showTitleStrip: true,
  showModeHeader: false,
  showTabBar: false,
};

const noopHandlers = {
  onTabChange: vi.fn(),
  onSwitch: vi.fn(),
  onBackToCollections: vi.fn(),
  onBackToDomain: vi.fn(),
  onBackFromSettings: vi.fn(),
  subDomainBackLabel: vi.fn(() => ''),
  getModeId: vi.fn(() => 'local'),
};

describe('PopupShell', () => {
  it('renders the title strip with the chrome title when showTitleStrip is true', () => {
    render(
      <PopupShell chrome={baseChrome}>
        <div>body</div>
      </PopupShell>
    );
    expect(screen.getByText('_underscore')).toBeInTheDocument();
  });

  it('omits the title strip when showTitleStrip is false', () => {
    render(
      <PopupShell chrome={{ ...baseChrome, showTitleStrip: false, title: '' }}>
        <div>body</div>
      </PopupShell>
    );
    expect(screen.queryByText('_underscore')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/ui-system/components/layout/PopupShell.test.tsx`
Expected: FAIL — `PopupShell` does not yet accept a `chrome` prop.

- [ ] **Step 3: Replace `PopupShell.tsx` with the new contract**

```tsx
// src/ui-system/components/layout/PopupShell.tsx
import React, { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import type { PopupChrome } from '../../../entrypoints/popup/chrome';
import { modeRegistry } from '../../../features/modes/registry';

import { ModeHeader } from './ModeHeader';
import { TabBar } from './TabBar';

const screenVariants = {
  initial: { opacity: 0, y: 10, scale: 0.984 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 1.012 },
} as const;

export interface PopupShellProps {
  chrome: PopupChrome;
  /** Current view key, used as the AnimatePresence motion key */
  viewKey: string;
  children: ReactNode;
  dark?: boolean;
}

function PopupTitleStrip({ title, modeId }: { title: string; modeId?: string }): React.ReactElement {
  const m = modeId ? modeRegistry.get(modeId) : null;
  return (
    <div
      style={{
        background: 'var(--paper-2)',
        borderLeft: '1px solid var(--rule)',
        borderRight: '1px solid var(--rule)',
        borderTop: '1px solid var(--rule)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
      }}
    >
      <span>{title}</span>
      {m && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 99,
              background: m.accent,
              display: 'inline-block',
            }}
          />
          {m.name}
        </span>
      )}
    </div>
  );
}

export function PopupShell({ chrome, viewKey, children, dark = false }: PopupShellProps): React.ReactElement {
  return (
    <div
      className={`ue ${dark ? 'dark' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--paper)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {chrome.showTitleStrip && <PopupTitleStrip title={chrome.title} modeId={chrome.modeId} />}
      <div
        className="popup"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          borderTop: chrome.showTitleStrip ? 'none' : '1px solid var(--rule)',
        }}
      >
        {chrome.showModeHeader && (
          <ModeHeader
            modeId={chrome.modeId ?? 'local'}
            onBack={chrome.onBack}
            backLabel={chrome.backLabel}
            onSwitch={chrome.onSwitch}
          />
        )}
        <div
          className="body-slot"
          style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={viewKey}
              variants={screenVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1.0 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        {chrome.showTabBar && chrome.activeTab && chrome.onTabChange && (
          <TabBar active={chrome.activeTab} onChange={chrome.onTabChange} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/ui-system/components/layout/PopupShell.test.tsx`
Expected: PASS

- [ ] **Step 5: Type-check**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check`
Expected: zero errors

- [ ] **Step 6: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/ui-system/components/layout/PopupShell.tsx src/ui-system/components/layout/PopupShell.test.tsx
git commit -m "feat(ui): PopupShell owns chrome via chrome prop, owns AnimatePresence"
```

---

## Task 11: Test PopupShell rendering — ModeHeader and TabBar

**Files:**
- Modify: `src/ui-system/components/layout/PopupShell.test.tsx`

- [ ] **Step 1: Append failing tests for ModeHeader and TabBar visibility**

```tsx
// Append to src/ui-system/components/layout/PopupShell.test.tsx
  it('renders ModeHeader when showModeHeader is true', () => {
    render(
      <PopupShell
        chrome={{
          title: '_underscore',
          showTitleStrip: true,
          showModeHeader: true,
          showTabBar: false,
          modeId: 'local',
          onBack: noopHandlers.onBackToCollections,
          backLabel: 'Library',
          onSwitch: noopHandlers.onSwitch,
        }}
        viewKey="DOMAIN_DETAILS"
      >
        <div>body</div>
      </PopupShell>
    );
    // ModeHeader renders the back label as text content
    expect(screen.getByText('← Library')).toBeInTheDocument();
  });

  it('renders TabBar with active tab when showTabBar is true', () => {
    render(
      <PopupShell
        chrome={{
          title: '_underscore · library',
          showTitleStrip: true,
          showModeHeader: true,
          showTabBar: true,
          modeId: 'local',
          activeTab: 'collections',
          onTabChange: noopHandlers.onTabChange,
        }}
        viewKey="COLLECTIONS"
      >
        <div>body</div>
      </PopupShell>
    );
    const libraryTab = screen.getByText('Library');
    expect(libraryTab.className).toContain('active');
  });
```

- [ ] **Step 2: Run tests, confirm they pass**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/ui-system/components/layout/PopupShell.test.tsx`
Expected: PASS (PopupShell from Task 10 already supports these flags)

- [ ] **Step 3: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/ui-system/components/layout/PopupShell.test.tsx
git commit -m "test(ui): PopupShell renders ModeHeader and TabBar from chrome"
```

---

## Task 12: Refactor DashboardView to body-only

**Files:**
- Modify: `src/entrypoints/popup/views/DashboardView.tsx`

- [ ] **Step 1: Replace DashboardView with body-only implementation**

```tsx
// src/entrypoints/popup/views/DashboardView.tsx
import React from 'react';

import { useApp } from '@/core/context/PopupAppProvider';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';
import { Row } from '@/ui-system/components/primitives/Row';
import { TTLMeter } from '@/ui-system/components/primitives/TTLMeter';

export interface DashboardViewProps {
  onLogout?: () => void;
}

export function DashboardView({ onLogout: _onLogout }: DashboardViewProps): React.ReactElement {
  const { currentMode, user } = useApp();

  if (currentMode === 'ephemeral') {
    const ttlMs = 3.5 * 3600_000 + 22 * 60_000;
    const ttlH = Math.floor(ttlMs / 3600_000);
    const ttlM = Math.floor((ttlMs % 3600_000) / 60_000);
    const ttlLabel = `${ttlH}h ${ttlM}m`;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ padding: '14px 16px 4px' }}>
          <div className="u-kicker">Ephemeral · expires in</div>
          <div
            className="u-mono"
            style={{
              fontSize: 15,
              lineHeight: 1.2,
              color: 'var(--ink-2)',
              fontWeight: 500,
              marginTop: 4,
              letterSpacing: '-0.005em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {ttlLabel}
          </div>
          <div style={{ marginTop: 8 }}>
            <TTLMeter ms={ttlMs} />
          </div>
        </div>
        <div style={{ padding: '10px 16px 6px' }}>
          <div className="u-kicker">Current page</div>
          <div className="u-serif" style={{ fontSize: 19, lineHeight: 1.15, letterSpacing: '-0.01em', marginTop: 4 }}>
            anthropic.com / Academy
          </div>
          <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
            3 highlights on this page
          </div>
        </div>
        <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
          Recent
        </div>
        <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <HighlightCard quote="A good prompt is one you could hand to a thoughtful colleague." domain="anthropic.com" section="Academy" ttlMs={18 * 3600_000} />
          <HighlightCard quote="Evaluation is not a phase. It is the practice." domain="anthropic.com" section="Academy" ttlMs={9 * 3600_000} />
          <HighlightCard quote="Constitutional methods aim for principles, not rules." domain="anthropic.com" section="Academy" ttlMs={3.5 * 3600_000} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '14px 16px 8px' }}>
        <div className="u-kicker">Good morning{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</div>
        <div className="u-serif" style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: '-0.02em', marginTop: 6 }}>
          51 highlights across 4 domains.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--rule)' }}>
        <Stat label="This week" value="12" />
        <Stat label="Synced" value={currentMode === 'local' ? 'This device' : '4 devices'} mono />
      </div>
      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        Jump to this page
      </div>
      <Row title="anthropic.com / Academy" sub="3 highlights on this page" right={<span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>→</span>} onClick={() => {}} />
      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        Recent
      </div>
      <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <HighlightCard quote="A good prompt is one you could hand to a thoughtful colleague." domain="anthropic.com" section="Academy" />
        <HighlightCard quote="Evaluation is not a phase. It is the practice." domain="anthropic.com" section="Academy" />
      </div>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }): React.ReactElement {
  return (
    <div style={{ padding: '12px 16px', borderRight: '1px solid var(--rule-soft)' }}>
      <div className="u-mono" style={{ fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{label}</div>
      <div className={mono ? 'u-mono' : 'u-serif'} style={{ fontSize: mono ? 15 : 22, marginTop: 2, letterSpacing: '-0.01em' }}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check`
Expected: zero errors

- [ ] **Step 3: Lint**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx eslint src/entrypoints/popup/views/DashboardView.tsx --max-warnings 0`
Expected: zero warnings

- [ ] **Step 4: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/entrypoints/popup/views/DashboardView.tsx
git commit -m "refactor(popup): DashboardView is body-only — chrome owned by PopupShell"
```

---

## Task 13: Refactor CollectionsView to body-only

**Files:**
- Modify: `src/features/collections/views/CollectionsView.tsx`

- [ ] **Step 1: Replace CollectionsView with body-only implementation (drop inner PopupShell, ModeHeader, TabBar)**

```tsx
// src/features/collections/views/CollectionsView.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useCollections } from '@/features/collections/hooks/useCollections';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { Row } from '@/ui-system/components/primitives/Row';

const AUTH_REQUIRED_MODES: ModeType[] = ['cloud', 'ai'];

export interface CollectionsViewProps {
  onCollectionClick?: (domain: string) => void;
  isAuthenticated?: boolean;
}

export function CollectionsView({ onCollectionClick, isAuthenticated: propIsAuthenticated }: CollectionsViewProps): React.ReactElement {
  const navigate = useNavigate();
  const appContext = useApp();

  const isAuthenticated = propIsAuthenticated ?? appContext.isAuthenticated;
  const mode = (appContext.currentMode ?? 'ephemeral') as ModeType;

  const { collections, isLoading } = useCollections();

  useEffect(() => {
    if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) {
      navigate('/mode');
    }
  }, [isAuthenticated, mode, navigate]);

  const handleCollectionClick = (domain: string): void => {
    if (onCollectionClick) {
      onCollectionClick(domain);
    } else {
      navigate(`/domain/${domain}`);
    }
  };

  const totalHighlights = collections.reduce((acc, c) => acc + c.highlightCount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '10px 16px 0' }}>
        <div className="u-serif" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.025em' }}>
          Library
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 4 }}>
          {collections.length} domains · {totalHighlights} highlights
        </div>
      </div>

      <div className="list-scroll" style={{ marginTop: 10, flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
        ) : (
          collections.map((c) => (
            <Row
              key={c.id}
              title={c.domain}
              sub={c.lastActive ? new Date(c.lastActive).toLocaleDateString() : ''}
              right={
                <span className="u-serif" style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>
                  {c.highlightCount}
                </span>
              }
              onClick={() => handleCollectionClick(c.domain)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check`
Expected: zero errors

- [ ] **Step 3: Lint**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx eslint src/features/collections/views/CollectionsView.tsx --max-warnings 0`
Expected: zero warnings

- [ ] **Step 4: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/features/collections/views/CollectionsView.tsx
git commit -m "refactor(popup): CollectionsView is body-only"
```

---

## Task 14: Refactor DomainDetailsView to body-only

**Files:**
- Modify: `src/features/collections/views/DomainDetailsView.tsx`

- [ ] **Step 1: Replace DomainDetailsView body to drop inner PopupShell, ModeHeader, TabBar**

Edit `src/features/collections/views/DomainDetailsView.tsx` and replace the imports and the return JSX only (keep the rest of the function logic unchanged).

Replace the imports block:

```ts
import React, { useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { Row } from '@/ui-system/components/primitives/Row';
```

Replace the interface to drop `onTabChange`:

```ts
export interface DomainDetailsViewProps {
  domain?: string;
  onBack?: () => void;
  onSectionClick?: (domain: string, section: string) => void;
}
```

Replace the function signature line:

```ts
export function DomainDetailsView({ domain: propDomain, onBack, onSectionClick }: DomainDetailsViewProps): React.ReactElement {
```

Replace the return JSX:

```tsx
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '10px 16px 0' }}>
        <div className="u-serif" style={{ fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.015em' }}>
          {domain}
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 4 }}>
          Sections
        </div>
      </div>

      <div className="list-scroll" style={{ marginTop: 10, flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
        ) : (
          sections.map((s) => (
            <Row
              key={s.path}
              title={s.path === '/' ? 'Home' : s.path}
              right={
                <span className="u-serif" style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>
                  {s.count}
                </span>
              }
              onClick={() => handleSectionClick(s.path)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check`
Expected: zero errors

- [ ] **Step 3: Lint**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx eslint src/features/collections/views/DomainDetailsView.tsx --max-warnings 0`
Expected: zero warnings

- [ ] **Step 4: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/features/collections/views/DomainDetailsView.tsx
git commit -m "refactor(popup): DomainDetailsView is body-only"
```

---

## Task 15: Refactor SubDomainView to body-only

**Files:**
- Modify: `src/features/collections/views/SubDomainView.tsx`

- [ ] **Step 1: Replace SubDomainView body to drop inner PopupShell, ModeHeader, TabBar**

Edit `src/features/collections/views/SubDomainView.tsx` and replace the imports, interface, and return JSX.

Replace the imports:

```ts
import React, { useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';
```

Replace the interface to drop `onTabChange`:

```ts
export interface SubDomainViewProps {
  domain?: string;
  section?: string;
  onBack?: () => void;
}
```

Replace the function signature line:

```ts
export function SubDomainView({ domain: propDomain, section: propSection, onBack }: SubDomainViewProps): React.ReactElement {
```

Replace the return JSX:

```tsx
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '10px 16px 6px' }}>
        <div className="u-sans" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {section === '/' ? 'HOME' : section}
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          {sectionHighlights.length} highlights · {mode}
        </div>
      </div>

      <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
        ) : (
          sectionHighlights.map((h) => (
            <HighlightCard
              key={h.id}
              quote={h.text}
              domain={domain}
              section={section === '/' ? undefined : section}
              ttlMs={getTtlMs(h.createdAt)}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check`
Expected: zero errors

- [ ] **Step 3: Lint**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx eslint src/features/collections/views/SubDomainView.tsx --max-warnings 0`
Expected: zero warnings

- [ ] **Step 4: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/features/collections/views/SubDomainView.tsx
git commit -m "refactor(popup): SubDomainView is body-only"
```

---

## Task 16: Refactor SettingsPage to body-only

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Read the current SettingsPage.tsx to plan the body-only extraction**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && head -200 src/pages/SettingsPage.tsx`
Read the imports, the outer `PopupShell` + `ModeHeader` + `TabBar` block, and the first body content section.

- [ ] **Step 2: Replace SettingsPage imports to drop chrome primitives**

Edit `src/pages/SettingsPage.tsx` and remove the `PopupShell`, `ModeHeader`, and `TabBar` imports (keep the rest). Also drop `onTabChange` from the props interface.

- [ ] **Step 3: Replace the outer return JSX to be body-only**

The current file wraps the page body in `<PopupShell><ModeHeader/>...<TabBar/></PopupShell>`. Replace the outermost `return` so the function returns a body-only `<div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>` whose children are the existing inner content (everything currently between `<ModeHeader/>` and `<TabBar/>`). If the page uses `displayName`-aware settings blocks, keep them as-is — only the chrome wrapper is being removed.

- [ ] **Step 4: Type-check**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check`
Expected: zero errors

- [ ] **Step 5: Lint**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx eslint src/pages/SettingsPage.tsx --max-warnings 0`
Expected: zero warnings

- [ ] **Step 6: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/pages/SettingsPage.tsx
git commit -m "refactor(popup): SettingsPage is body-only"
```

---

## Task 17: Rewire `index.tsx` to use single `PopupShell`

**Files:**
- Modify: `src/entrypoints/popup/index.tsx`

- [ ] **Step 1: Add the `buildChrome` import and the chrome handlers in `PopupApp`**

Add to the imports at the top of `src/entrypoints/popup/index.tsx`:

```ts
import { buildChrome, type ChromeHandlers } from './chrome';
```

Add the chrome handlers object inside `PopupApp` (after the existing handler functions are defined):

```ts
const chromeHandlers: ChromeHandlers = {
  onTabChange: handleTabChange,
  onSwitch: handleSettingsChangeMode,
  onBackToCollections: handleBackToCollections,
  onBackToDomain: handleBackToDomain,
  onBackFromSettings: handleBackFromSettings,
  subDomainBackLabel: () => selectedDomain,
  getModeId: () => currentMode,
};
const chrome = buildChrome(chromeHandlers);
```

(If `handleBackFromSettings` does not exist yet, add a small helper that calls `handleBackToModeSelection` or, when `previousView` is set, returns to it.)

- [ ] **Step 2: Replace the outer `<PopupShell>` so it uses the chrome config**

In the same file, find the JSX block that begins with `<PopupShell>` and ends with `</PopupShell>` (currently around line 267). Replace the outer `<PopupShell>` opening tag and the `AnimatePresence` opening so that:

- The single `<PopupShell chrome={chrome[currentView]} viewKey={currentView}>` wraps everything.
- `AnimatePresence mode="wait"` is **inside** `PopupShell` (it's already inside the shell, no change needed there).
- The `motion.div` keys and variants are unchanged.
- The outer `<PopupShell>` from the current code is removed; only one `PopupShell` exists.

Concretely, change the line that currently reads:

```tsx
  return (
    <PopupShell>
```

to:

```tsx
  return (
    <PopupShell chrome={chrome[currentView]} viewKey={currentView}>
```

- [ ] **Step 3: Remove the per-view motion wrapper's `position: absolute, inset: 0` style (now provided by `PopupShell`)**

Each `motion.div` inside the `AnimatePresence` currently has `style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}`. Keep the `display: flex, flexDirection: 'column'` part and drop the absolute positioning. The new style is `style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}`. (The motion div now fills the body slot, which is now a regular flex child of the body slot — see Task 10, where the body slot wraps the motion div with `position: relative`.)

Apply this change to **every** motion.div inside the AnimatePresence. There are 8 view keys: WELCOME, MODE_SELECTION, COLLECTIONS, DOMAIN_DETAILS, SUB_DOMAIN, AUTH, SETTINGS, DASHBOARD.

- [ ] **Step 4: Type-check**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check`
Expected: zero errors

- [ ] **Step 5: Lint**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx eslint src/entrypoints/popup/index.tsx --max-warnings 0`
Expected: zero warnings

- [ ] **Step 6: Build**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run build`
Expected: exit code 0, no errors

- [ ] **Step 7: Run all popup tests**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npx vitest run src/entrypoints/popup/ src/ui-system/components/layout/`
Expected: all pass

- [ ] **Step 8: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/entrypoints/popup/index.tsx
git commit -m "refactor(popup): single PopupShell, body-only views, single AnimatePresence"
```

---

## Task 18: Fix base.css to use v2 tokens

**Files:**
- Modify: `src/entrypoints/popup/base.css`

- [ ] **Step 1: Replace MD3 fallbacks in `base.css` with v2 tokens**

Edit `src/entrypoints/popup/base.css`. The `body` block currently reads:

```css
body {
    width: 400px;
    height: 600px;
    margin: 0;
    padding: 0;
    background-color: var(--md-sys-color-surface, #f9f9ff);
    color: var(--md-sys-color-on-surface, #191c20);
    overflow-x: hidden;
}
```

Replace it with:

```css
body {
    width: 400px;
    height: 600px;
    margin: 0;
    padding: 0;
    background-color: var(--paper);
    color: var(--ink);
    overflow-x: hidden;
}
```

- [ ] **Step 2: Type-check and lint**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check && npx eslint src/entrypoints/popup/ --max-warnings 0`
Expected: zero errors, zero warnings

- [ ] **Step 3: Commit**

```bash
cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign
git add src/entrypoints/popup/base.css
git commit -m "fix(popup): base.css uses v2 paper/ink tokens, not MD3 fallbacks"
```

---

## Task 19: Final verification — alignment matches wireframe

**Files:**
- No new file changes; verification only

- [ ] **Step 1: Run the full quality gate**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run type-check && npx eslint . --max-warnings 0 && npx vitest run`
Expected: all pass

- [ ] **Step 2: Run the build**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && npm run build`
Expected: exit code 0, no errors

- [ ] **Step 3: Token discipline grep**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && grep -rn "#[0-9a-fA-F]\{3,6\}" src/entrypoints/popup/ src/ui-system/components/layout/{PopupShell,ModeHeader,TabBar}.tsx src/entrypoints/popup/chrome.ts`
Expected: zero matches (no hardcoded colors in the chrome layer or popup entry)

- [ ] **Step 4: View body-only grep**

Run: `cd /home/sandy/projects/_underscore/.worktrees/v2-popup-redesign && grep -n "PopupShell\|ModeHeader\|TabBar" src/entrypoints/popup/views/DashboardView.tsx src/features/collections/views/{CollectionsView,DomainDetailsView,SubDomainView}.tsx src/pages/SettingsPage.tsx`
Expected: zero matches (views no longer import chrome primitives)

- [ ] **Step 5: Manual visual verification**

Load the extension in Chrome (the worktree's `dist/` from `npm run build`):

- Open the popup. Title strip is visible at the top with the right title per screen.
- `ModeHeader` is visible on Dashboard / Library / Domain / Sub-domain / Settings.
- `TabBar` is visible at the bottom on those screens; the active tab has the 2px accent rule.
- Switch between views. The body animates; the title strip and `ModeHeader` do not blink or re-mount.
- On Welcome / Auth, no `ModeHeader` and no `TabBar`; only the title strip and a body.
- On Sub-domain, the back button label on `ModeHeader` reads the current domain (e.g. "anthropic.com").

- [ ] **Step 6: No commit (verification only)**

---

## Self-Review

**Spec coverage check** — for each spec section, the task that implements it:

| Spec section | Tasks |
|---|---|
| §4.1 Chrome owner | 10, 17 |
| §4.2 Layout tree | 10, 17 |
| §4.3 Chrome config (PopupChrome type) | 1, 10 |
| §4.4 `buildChrome` factory + `Record<View, PopupChrome>` | 2-8 |
| §4.5 `PopupShell` rendering contract | 10, 11 |
| §4.6 View contract (body-only) | 12-16 |
| §4.7 AnimatePresence placement | 10, 17 |
| §4.8 TabBar fix | 9 |
| §5 Files changed | 1-18 (every file covered) |
| §6 Behavior table | 1-8 (each view's chrome) |
| §7 Edge cases | 1 (ErrorBoundary self-contained — design), 17 (rewire), 18 (base.css tokens) |
| §8 Verification | 19 |

**Placeholder scan** — no "TBD", "TODO", "implement later", "add appropriate error handling", or vague filler.

**Type consistency** — `PopupChrome` is defined once in Task 1 and referenced in Tasks 2-11; `ActiveTab` is defined once in Task 1 and used in Task 9; `ChromeHandlers` is defined once and used in Tasks 2-8, 17. No renamed methods between tasks.

**One ambiguity to flag**: Task 16 (SettingsPage) is a "read first, then edit" task because the file is large and the inner layout depends on the page's existing structure. The plan reads the file before editing, so the engineer is not editing blind. The exact JSX replacement follows the same shape as Tasks 12-15 (body-only div wrapper).
