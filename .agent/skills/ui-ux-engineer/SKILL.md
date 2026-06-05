---
name: UI/UX Engineer
description: Complete guidelines for building and modifying UI in the _underscore browser extension. Covers file placement, state management, styling with V2 Editorial CSS custom properties, component authoring, and the popup's navigation model.
---

# UI/UX Engineer Skill — _underscore

**Before doing any UI work, read this entire file. Then read both sub-skills.**

- [design-tokens.md](./sub-skills/design-tokens.md) — Token lookup table for every atomic styling decision
- [component-patterns.md](./sub-skills/component-patterns.md) — Code patterns for authoring components and views

---

## 1. The Golden Rules (Never Violate)

1. **Never hardcode a color.** Use V2 CSS custom properties: `var(--paper)`, `var(--ink)`, `var(--accent)`, `var(--rule)`. See v2-tokens-reference.md.
2. **Never use Tailwind utility classes.** Tailwind has been removed from this project.
3. **Never use arbitrary font sizes.** Use V2 step scale: `var(--step-0)` through `var(--step-6)`.
4. **Never use `box-shadow`.** V2 uses borders: `border: 1px solid var(--rule-soft)`.
5. **Never use `opacity-*` for hover states.** Use CSS `:hover` pseudo-class.
6. **Never use explicit `font-weight` declarations.** V2 type vars handle weight.
7. **Never create a new CSS variable.** Use existing V2 vars from `ui_kits/extension/v2/tokens.css`.
8. **Never bypass the barrel export.** Import primitives from `@/ui-system/components/primitives`, never the direct file.

---

## 2. Technology Stack

| Layer | Tool | Notes |
|---|---|---|
| Build | WXT + Vite | Extension-first build system |
| Framework | React 19 | Strict mode enabled |
| Styling | CSS Custom Properties (V2 Editorial) | No Tailwind — use `var(--paper)`, `var(--ink)`, `var(--accent)`, `var(--rule)` |
| Routing | `MemoryRouter` (imported but not used for view switching) | View switching is manual `View` enum |
| Primitives | Radix UI + custom wrappers | See component-patterns.md |
| Variants | `class-variance-authority` (CVA) | For multi-variant components |
| Class merge | `cn()` helper via `clsx` + `tailwind-merge` | Always use for dynamic classnames |
| Icons | `lucide-react` | Used throughout; do not add other icon libs |
| State (global) | React Context (`useApp()`) | Auth, mode, theme |
| State (feature) | Zustand stores | New feature state; see §6 |
| State (async/IPC) | Custom hooks (`useCurrentUser`, `useCollections`) | Chrome messaging to background |

---

## 3. File Placement Rules

This is the most common source of inconsistency. Follow these rules exactly.

### Views (full-screen UI panels)
| Category | Location | Example |
|---|---|---|
| Popup entry views (tightly coupled to navigation enum) | `src/entrypoints/popup/views/` | `AuthView.tsx`, `DashboardView.tsx` |
| Feature views (vault mode, collections) | `src/features/<feature>/views/` | `CollectionsView.tsx`, `DomainDetailsView.tsx` |
| Page-level views (settings, privacy, welcome) | `src/pages/` | `SettingsPage.tsx`, `WelcomePage.tsx` |

### Components
| Category | Location | Example |
|---|---|---|
| Primitive UI atoms (always reusable, zero business logic) | `src/ui-system/components/primitives/` | `Button.tsx`, `Card.tsx` |
| Composite feature components | `src/features/<feature>/components/` | `CollectionCard.tsx`, `ModeCard.tsx` |
| Layout wrappers | `src/ui-system/layout/` | `AppShell.tsx` |

### Hooks
| Category | Location |
|---|---|
| App-wide shared hooks | `src/ui-system/hooks/` |
| Feature-specific hooks | `src/features/<feature>/hooks/` |
| Auth-specific | `src/features/auth/hooks/` |

### Stores (Zustand)
All Zustand stores live at: `src/features/<feature>/stores/<feature>.store.ts`
Global UI store: `src/core/stores/ui.store.ts`

### Style
- Global CSS variables and base styles: `src/ui-system/theme/global.css` (do NOT edit unless adding a new theme variable)
- Popup-specific dimensions: `src/entrypoints/popup/base.css` (do NOT edit)

---

## 4. Popup Constraints

The popup is hard-coded to **400×600px** in `base.css`. This applies to every view.

- Root container: always `w-[400px] h-[600px]` or `w-full h-full` inside `AppShell`
- `AppShell` wraps all views: `<AppShell> ... </AppShell>`
- Never use `vh`, `vw`, or `100%` heights on inner containers — use `flex-1` or explicit heights
- Overflow: `overflow-y-auto` with `scrollbar-hide` utility for scrollable lists
- Never assume a full browser viewport

---

## 5. Navigation Model

The popup does **NOT** use React Router's `<Route>` for navigation. Instead:

```typescript
// src/entrypoints/popup/index.tsx
enum View {
  LOADING, WELCOME, MODE_SELECTION, COLLECTIONS, DOMAIN_DETAILS, AUTH, SETTINGS
}
const [currentView, setCurrentView] = useState<View>(View.LOADING);
```

**Rules:**
- All view switching happens in `popup/index.tsx` only — never inside a view component
- Views receive callback props: `onBack`, `onSignInClick`, `onCollectionClick`, etc.
- Never call `setCurrentView` from inside a view — emit via callback instead
- To add a new view: (1) add to `View` enum, (2) add handler functions, (3) add JSX branch in `PopupApp`

---

## 6. State Management

### Ownership Map

| What | Where | Hook/API |
|---|---|---|
| Auth state (user, isAuthenticated) | `PopupAppProvider` → `AppContext` | `useApp().user`, `useApp().isAuthenticated` |
| Current mode | `PopupAppProvider` → `AppContext` | `useApp().currentMode`, `useApp().setMode()` |
| Theme | `PopupAppProvider` → `AppContext` | `useApp().theme`, `useApp().setTheme()` |
| Available modes | Derived in `PopupAppProvider` | `useApp().availableModes` |
| Auth actions (login, logout, register) | `useCurrentUser` hook | Used only in `PopupAppWithProviders` wrapper |
| Collections data | Custom hook | `src/features/collections/hooks/useCollections.ts` |
| Transient view state (selected domain, previous view) | `popup/index.tsx` local state | `useState` — do NOT lift to context |
| New feature UI state | **Zustand store** | `src/features/<feature>/stores/<feature>.store.ts` |

### Two Providers — When to Use Which

```
PopupAppWithProviders (root)
  └─ calls useCurrentUser()           ← Chrome IPC auth
  └─ feeds props to PopupAppProvider
      └─ provides AppContext
          └─ all views call useApp()  ← single API for auth/mode/theme
```

- **In the popup**: Always use `useApp()` for auth/mode/theme. NEVER call `useCurrentUser()` inside a view.
- **`AppProvider`** (localStorage-based) is for the web build only (`src/main-web.tsx`). Never use it in popup code.

### Zustand Pattern (for new state)

Use Zustand for any state that:
- Does not belong to auth/mode/theme (those stay in Context)
- Needs to be read by multiple sibling components without prop drilling
- Is feature-specific and shouldn't pollute global context

```typescript
// src/features/collections/stores/collections.store.ts
import { create } from 'zustand';

interface CollectionsStore {
  selectedDomain: string | null;
  sortBy: 'alphabetical' | 'usage' | 'recent';
  viewMode: 'list' | 'grid';
  setSelectedDomain: (domain: string | null) => void;
  setSortBy: (sort: CollectionsStore['sortBy']) => void;
  setViewMode: (mode: CollectionsStore['viewMode']) => void;
}

export const useCollectionsStore = create<CollectionsStore>((set) => ({
  selectedDomain: null,
  sortBy: 'alphabetical',
  viewMode: 'list',
  setSelectedDomain: (domain) => set({ selectedDomain: domain }),
  setSortBy: (sortBy) => set({ sortBy }),
  setViewMode: (viewMode) => set({ viewMode }),
}));
```

**State Hierarchy (Priority Order):**
1. `useApp()` — Auth, mode, theme (always check here first)
2. Zustand store — Feature-level persistent UI state
3. `useState` inside component — Transient, component-only state (e.g., input focus, dropdown open)

---

## 7. Component Authoring Rules

### The Standard Pattern

Every primitive component must:
1. Use `forwardRef`
2. Extend native HTML element props
3. Use `cn()` for all className merging
4. Accept a `className` prop as the last merge in `cn()`
5. Export a `displayName`

```typescript
import React, { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/ui-system/utils/cn';

export interface MyComponentProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'emphasized';
}

const MyComponent = forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, variant = 'default', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'base classes here',
        variant === 'emphasized' && 'emphasized classes here',
        className  // Always last
      )}
      {...props}
    >
      {children}
    </div>
  )
);

MyComponent.displayName = 'MyComponent';
export { MyComponent };
```

### Using CVA for Multi-Variant Components

Use CVA when a component has 2+ independent variant axes (e.g., variant + size):

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  // base classes (always applied)
  'inline-flex items-center justify-center rounded-full text-label-large min-h-[48px] transition-all duration-short ease-standard',
  {
    variants: {
      variant: {
        filled: 'bg-primary text-on-primary shadow-elevation-1',
        outlined: 'bg-transparent text-primary border border-outline',
        text: 'bg-transparent text-primary px-3',
      },
      size: {
        default: 'px-6',
        sm: 'px-4 min-h-[40px]',
      }
    },
    defaultVariants: { variant: 'filled', size: 'default' }
  }
);
```

### Radix UI — Always Wrap, Never Use Raw

Never render Radix primitives directly in a view. Use the project's wrappers:
- `<AlertDialog>` — `src/ui-system/components/primitives/AlertDialog.tsx`
- `<DropdownMenu>` — `src/ui-system/components/primitives/DropdownMenu.tsx`
- `<Dialog>` — `src/ui-system/components/primitives/Dialog.tsx`
- `<Separator>` — `src/ui-system/components/primitives/Separator.tsx`

Import all primitives from the barrel: `import { Button, Card, Dialog } from '@/ui-system/components/primitives';`

### Do NOT Export These from Barrel (They Are Not Yet Exported)

`AlertDialog`, `DropdownMenu`, `Separator`, `SocialButton`, `TrustSignal` — import these directly from their file until the barrel is updated.

---

## 8. View Component Pattern

Every view component follows this structure:

```typescript
// Props always use callback pattern for navigation
interface MyViewProps {
  onBack?: () => void;
  onSignInClick?: () => void;
  // ... other callbacks
}

export function MyView({ onBack, onSignInClick }: MyViewProps) {
  const { isAuthenticated, user, currentMode } = useApp(); // Global state
  const myStore = useMyStore(); // Zustand store (if needed)
  const [localState, setLocalState] = useState(false); // Transient UI only

  return (
    <div className="w-full h-full flex flex-col bg-surface text-on-surface overflow-hidden">
      {/* Header */}
      {/* Content (flex-1 + overflow-y-auto if scrollable) */}
      {/* Footer (if needed) */}
    </div>
  );
}
```

---

## 9. IPC / Chrome Messaging

The popup communicates with the background via Chrome messaging. Key rules:
- **Never call `chrome.runtime.sendMessage` directly in a view** — use the provided hooks
- Auth actions: `useCurrentUser().login()`, `.logout()`, `.loginWithEmail()`, `.registerWithEmail()`
- Mode sync: `useApp().setMode()` — already handles Chrome tab messaging internally
- For new message types, add to `src/shared/messaging/` (not inline string literals)

Message format:
```typescript
{ type: 'MESSAGE_TYPE', payload: {}, timestamp: Date.now() }
```

---

## 10. Accessibility Rules

- All interactive elements: `min-h-[48px] min-w-[48px]`
- Icon-only buttons: add `aria-label` and `title`
- Focus rings: set globally in `global.css` — do NOT override with `focus:outline-none` without replacing with a visible ring
- Reduced motion: handled globally in `global.css` — do NOT add manual `prefers-reduced-motion` checks in components
- Color pairing: always use the `on-*` token with its pair (`bg-primary` → `text-on-primary`)

---

## 11. Removed: Storybook

Storybook has been removed from this project. Do NOT create `.stories.tsx` files.

Instead, verify components with: `npm run build && npm run type-check`

---

## 12. Conflict Resolution Priority

When there is a conflict or specification gap:

1. **`ui_kits/extension/v2/tokens.css`** — Highest authority (V2 token definitions)
2. **`ui_kits/extension/v2/*.jsx`** — Wireframe visual spec
3. **`src/ui-system/theme/global.css`** — Implemented token values
4. **`.agent/workflows/v2-tokens-reference.md`** — Token lookup guide

Do NOT use `docs/material_design_reference/` — archived. Do NOT reference m3.material.io — MD3 has been removed from this project.
