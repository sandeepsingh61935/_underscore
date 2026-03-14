---
description: >
  MANDATORY specification contract for all UI work on _underscore.
  Read this BEFORE writing any component, view, or page.
  This document defines hard rules extracted from the actual codebase.
  Violating any contract here = code review rejection.
---

# UI Code Contracts

> **WHEN TO READ THIS**: Before touching ANY `.tsx` file in:
> `src/ui-system/`, `src/features/*/components/`, `src/features/*/views/`,
> `src/entrypoints/popup/views/`, `src/pages/`
>
> This is NOT optional. These are contracts, not suggestions.

---

## 1. Physical Constraints (Non-Negotiable)

### Extension Popup
- **Width**: always `400px` fixed — never wider
- **Height**: `400–600px` typical, content scrolls inside — never fixed full-height without overflow
- **No routing**: popup navigates via callback props (`onSignInClick`, `onBack`, `onModeSelect`), never `useNavigate()`
- **Entry point**: `src/entrypoints/popup/views/` — views here accept only callback props
- **Chrome APIs**: only inside hooks (`src/features/*/hooks/`, `src/ui-system/hooks/`) — never directly in a view or component

### Web App (SPA)
- **Full viewport**: `min-h-screen` layout, max-width content container (`max-w-[640px]` typical)
- **Routing**: uses React Router `useNavigate()` / `<Link>` — only in web app pages (`src/pages/`, `src/web/`)
- **Entry point**: views in `src/features/*/views/` accept both callback props AND fallback to `useNavigate()` for web context

### Both Contexts
- **Dark mode**: automatic via CSS custom properties — NEVER use `dark:` Tailwind prefix
- **Font**: Inter loaded globally — never import or declare another font in components
- **Scrollbar**: styled globally — never override in components
- **Focus ring**: styled globally via `#app` scope — never override `outline` directly

---

## 2. Banned Patterns — Style C Hybrid Aliases

The following CSS variables are **BANNED** in all `.tsx` files. They exist in `global.css` as a temporary alias layer but must not appear in component code. ESLint will error on them.

### Complete Alias → MD3 Replacement Table

| BANNED (var) | CORRECT (Tailwind class) | Notes |
|---|---|---|
| `var(--bg)` | `bg-surface` | Page/view root background |
| `var(--bg-card)` | `bg-surface-container-lowest` | Card background |
| `var(--bg-elevated)` | `bg-surface-container-low` | Slightly elevated surface |
| `var(--bg-glass, ...)` | See glass pattern below | Sticky headers only |
| `var(--text-primary)` | `text-on-surface` | Primary text color |
| `var(--text-secondary)` | `text-on-surface-variant` | Secondary/supporting text |
| `var(--text-tertiary)` | `text-outline` | Muted/tertiary text |
| `var(--accent)` as bg | `bg-primary` | CTA/active backgrounds |
| `var(--accent)` as text | `text-primary` | Accent-colored text |
| `var(--accent)` as border | `border-primary` | Accent borders |
| `var(--accent-soft)` | `bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]` | Soft accent bg |
| `var(--accent-text)` | `text-primary` | Text in accent regions |
| `var(--border)` | `border-outline-variant` | Default border color |
| `var(--border-hover)` | `border-outline` (on hover) | Border on hover |
| `var(--radius)` / `rounded-[var(--radius)]` | `rounded-md` | 12px |
| `var(--radius-sm)` / `rounded-[var(--radius-sm)]` | `rounded-sm` | 8px |
| `var(--radius-lg)` | `rounded-lg` | 16px |
| `var(--radius-full)` | `rounded-full` | 9999px |
| `var(--shadow-rest)` / `var(--elevation-1)` | `shadow-elevation-1` | Card at rest |
| `var(--shadow-hover)` / `var(--elevation-3)` | `shadow-elevation-3` | Card on hover |

### Also Banned

| BANNED | CORRECT | Notes |
|---|---|---|
| `style={{ background: '...' }}` for MD3 colors | `bg-*` Tailwind class | Inline style only for glass/special |
| `style={{ color: '...' }}` for MD3 colors | `text-*` Tailwind class | Always |
| `style={{ border: '...' }}` for MD3 borders | `border border-outline-variant` | Always |
| `style={{ boxShadow: '...' }}` on hover | `hover:shadow-elevation-3` | Use Tailwind hover state |
| `onMouseEnter` + `e.currentTarget.style.*` | Tailwind `hover:` utilities | JS DOM mutation for visual state is banned |
| `onMouseLeave` + `e.currentTarget.style.*` | Tailwind `hover:` utilities | Same — always CSS |
| `text-[22px]` | `text-title-large` | |
| `text-[16px]` | `text-body-large` | |
| `text-[14px]` body | `text-body-medium` | |
| `text-[14px]` label/button | `text-label-large` | |
| `text-[13px]` | `text-body-small` | 12px is closest below |
| `text-[12px]` body | `text-body-small` | |
| `text-[12px]` label | `text-label-medium` | |
| `text-[11px]` | `text-label-small` | |
| `transition-all duration-150` | `transition-all duration-short ease-standard` | Always use MD3 motion tokens |
| `rounded-[4px]` | `rounded-xs` | |
| `rgba(0,0,0,0.35)` in overlays | `bg-scrim/40` | Use scrim token |

---

## 3. Approved Patterns (Copy These Exactly)

### 3a. View Root (every view must start with this)

```tsx
// Extension popup view
<div className="w-full h-full flex flex-col bg-surface text-on-surface overflow-hidden">
  ...
</div>

// Web page / full-screen view
<div className="min-h-screen w-full flex flex-col bg-surface text-on-surface">
  ...
</div>
```

### 3b. Sticky Glass Header — use `<AppHeader>`, never inline `<header>`

**Import:** `@/ui-system/components/layout/AppHeader`

NEVER write an inline `<header>` in a view or page. Always use `<AppHeader>`.

#### Three variants

| Variant | When to use | Layout |
|---|---|---|
| `primary` | Top-level screens: Collections, DomainDetails, Dashboard | Logo left · action right |
| `sub` | Secondary screens with explicit back: ModeSelection (with back) | Back · Logo center · spacer |
| `standalone` | Auth, legal, settings — no nav controls in header | Logo centered |

#### Usage

```tsx
import { AppHeader } from '@/ui-system/components/layout/AppHeader';

// primary — top-level screen (logo left, action right)
<AppHeader variant="primary" action={<SettingsButton />} />

// primary compact — popup context (tighter padding, sm logo)
<AppHeader variant="primary" compact action={<UserMenu />} />

// sub — secondary screen with back
<AppHeader variant="sub" onBack={handleBack} backLabel="Collections" />

// sub compact — popup secondary screen
<AppHeader variant="sub" compact onBack={onBack} backLabel="Back" />

// standalone — settings, privacy, auth flows
<AppHeader variant="standalone" />

// standalone compact — popup auth
<AppHeader variant="standalone" compact />
```

#### Rules

- **Logo is NEVER interactive.** Never wrap it in `<Link>` or `<button>`. Logo is a brand mark.
- **Back navigation** belongs to the `sub` variant's back slot, or a breadcrumb `<button>`/`<Link>` in the **content body** — never the logo.
- **Back slot** must always be `<button type="button">` — never `<a href="#">`.
- **Touch targets**: all interactive slots require `min-h-[48px] min-w-[48px]`.
- **Popup views**: pass `compact` prop → `px-4 py-3`, `min-h-[56px]`, logo `size="sm"`.
- **Web views**: default → `px-6 py-4`, `min-h-[64px]`, logo `size="md"`.
- **`max-w-*` never on `<header>`** — `max-w` belongs on the `<main>` content container.

#### Glass background — only one approved pattern

```tsx
// AppHeader handles this internally. When building one-off overrides:
style={{ backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface) 80%, transparent)' }}
className="backdrop-blur-md"
```

**BANNED glass alternatives** — these produce different visual results:
```
bg-surface/80              ← Tailwind opacity modifier, not color-mix
bg-surface-container/80    ← same
bg-surface/95              ← same
```

Note: `backgroundColor` inline style is the ONE allowed exception for glass — `color-mix()` with transparency cannot be expressed as a Tailwind utility directly.

#### Header.tsx (layout component) — DEPRECATED

`src/ui-system/components/layout/Header.tsx` uses banned `bg-card` and `border-border/60` tokens and is not used by any active view. Do not use it. Use `AppHeader` instead.

### 3c. Card with Hover Elevation

```tsx
// APPROVED: card hover using Tailwind only, no JS event handlers
<div
  className={cn(
    'bg-surface-container-lowest rounded-md border border-outline-variant',
    'shadow-elevation-1 transition-all duration-short ease-standard',
    'hover:shadow-elevation-3 hover:-translate-y-0.5',
  )}
>
  ...
</div>
```

### 3d. Interactive Card / List Item (clickable)

```tsx
// APPROVED: interactive card — button element, Tailwind hover, no inline style
<button
  type="button"
  onClick={onClick}
  className={cn(
    'w-full text-left',
    'bg-surface-container-lowest rounded-md border border-outline-variant',
    'shadow-elevation-1 transition-all duration-short ease-standard',
    'hover:shadow-elevation-3 hover:border-outline hover:-translate-y-0.5',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'disabled:opacity-disabled disabled:pointer-events-none',
  )}
>
  ...
</button>
```

### 3e. Tonal Segmented Control / Filter Pills

```tsx
// APPROVED: dark-safe segmented shell + tonal active pill
<div className="inline-flex w-fit flex-wrap gap-1 rounded-full border border-[color-mix(in_srgb,var(--md-sys-color-outline-variant)_72%,transparent)] bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-low)_92%,var(--md-sys-color-surface))] p-1 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--md-sys-color-inverse-on-surface)_4%,transparent)]">
  <button
    type="button"
    className={cn(
      'appearance-none rounded-full border border-transparent bg-transparent px-3 py-1.5 text-label-medium transition-all duration-short ease-standard',
      active
        ? 'border-[color-mix(in_srgb,var(--md-sys-color-primary)_22%,transparent)] bg-primary-container text-on-primary-container shadow-elevation-1'
        : 'text-on-surface-variant hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_6%,var(--md-sys-color-surface-container-high))] hover:text-on-surface',
      disabled && 'pointer-events-none cursor-not-allowed border-[color-mix(in_srgb,var(--md-sys-color-outline-variant)_40%,transparent)] bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-highest)_55%,transparent)] text-outline opacity-disabled',
    )}
  >
    System
  </button>
</div>

// Standalone pill / export format / filter chip
<button className="appearance-none rounded-full border border-[color-mix(in_srgb,var(--md-sys-color-outline-variant)_72%,transparent)] bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-low)_92%,var(--md-sys-color-surface))] px-3 py-1.5 text-label-medium text-on-surface-variant transition-all duration-short ease-standard hover:border-outline hover:text-on-surface">
  JSON
</button>

// Selected standalone pill
<div className="rounded-full border border-[color-mix(in_srgb,var(--md-sys-color-primary)_22%,transparent)] bg-primary-container px-3 py-1.5 text-label-medium text-on-primary-container shadow-elevation-1">
  Active
</div>
```

### 3f. Text Hierarchy

```tsx
// Page/section title
<h1 className="text-headline-small text-on-surface">Settings</h1>

// Card title / dialog header
<h2 className="text-title-large text-on-surface">Switch mode?</h2>

// Card subtitle / section label
<h3 className="text-title-medium text-on-surface">Account</h3>

// Body text
<p className="text-body-medium text-on-surface-variant">Supporting description text</p>

// Caption / metadata
<p className="text-body-small text-outline">2 hours ago</p>

// Overline / section label (uppercase tracking)
<p className="text-label-small text-outline uppercase tracking-[0.15em]">Collections</p>

// Button / CTA label
<span className="text-label-large text-primary">Create account</span>
```

### 3g. Divider / Separator

```tsx
// Horizontal rule
<div className="h-px bg-outline-variant" />

// Or use the Separator primitive
import { Separator } from '@/ui-system/components/primitives/Separator';
<Separator />
```

### 3h. Modal / Confirmation Overlay

```tsx
// APPROVED: use Dialog primitive — never roll a custom modal
import { Dialog, DialogContent } from '@/ui-system/components/primitives/Dialog';

// If you must build inline (transition states, etc.):
<div
  className="fixed inset-0 z-[300] flex items-center justify-center bg-scrim/40 backdrop-blur-sm"
  onClick={onDismiss}
>
  <div
    className={cn(
      'w-[90%] max-w-[360px]',
      'bg-surface-container-highest rounded-xl p-6',
      'shadow-elevation-3',
      'animate-scaleIn',
    )}
    onClick={e => e.stopPropagation()}
  >
    ...
  </div>
</div>
```

### 3i. State Layers (hover/press)

```tsx
// On a surface-colored element:
'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,var(--md-sys-color-surface-container))]'
'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_12%,var(--md-sys-color-surface-container))]'

// On a primary-colored element:
'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_8%,var(--md-sys-color-primary))]'
'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_12%,var(--md-sys-color-primary))]'

// For text-only hover (links, nav items):
'hover:text-on-surface'           // tertiary → primary on hover
'hover:text-primary'              // surface-variant → primary on hover
```

### 3j. Disabled State

```tsx
// APPROVED: always use MD3 disabled
'disabled:opacity-disabled disabled:pointer-events-none'
// opacity-disabled = 38% (from tailwind.config.ts)

// Locked state (non-button element):
<div className={cn('transition-all duration-short', locked && 'opacity-disabled pointer-events-none')}>
```

### 3k. Back Navigation Link

```tsx
// APPROVED: back navigation pattern
<button
  onClick={onBack}
  className="inline-flex items-center gap-1.5 text-body-small text-outline hover:text-on-surface transition-colors duration-short ease-standard bg-transparent border-0 p-0 cursor-pointer"
  aria-label="Go back"
>
  <ArrowLeft className="w-4 h-4" />
  Back
</button>
```

---

## 4. Primitive Component Contracts

### When to use each primitive vs. custom element:

| Need | Use This | Never Do This |
|---|---|---|
| CTA / action button | `<Button>` primitive | Raw `<button>` with custom bg/color styles |
| Text input | `<Input>` primitive | Raw `<input>` with inline styles |
| Collection / item card | `<Card interactive>` primitive | Custom `<div>` with onMouseEnter |
| Static info card | `<Card>` primitive | Custom `<div>` with inline bg/border |
| Confirmation dialog | `<Dialog>` primitive | Custom overlay with raw backdrop styles |
| Loading spinner | `<Spinner>` primitive | Custom CSS spinner |
| Text rendering | `<Text>` primitive (or semantic HTML + type class) | `<p style={{ color: '...' }}>` |
| Section chip/tag | `<Chip>` primitive | Custom span with accent-soft bg |
| Social auth button | `<SocialButton>` primitive | Custom button with inline border styles |
| Trust/privacy message | `<TrustSignal>` primitive | Inline p with text-tertiary style |
| Visual separator | `<Separator>` primitive | `<hr>` or `<div className="h-px bg-...">` |

### Button Variant Rules

```tsx
// Primary action (submit, confirm, CTA)
<Button variant="filled">Create account</Button>

// Secondary/cancel action
<Button variant="outlined">Cancel</Button>

// Inline text action (no background needed)
<Button variant="text">Learn more</Button>

// NEVER: raw button with inline styles for primary actions
// ❌ <button style={{ background: 'var(--accent)' }}>Submit</button>
// ❌ <button className="bg-blue-500">Submit</button>
```

---

## 5. View Structure Contract

Every view must follow this structure:

```tsx
export function MyView({ onAction }: MyViewProps) {
  return (
    // 1. Root: full dimensions, bg-surface, text-on-surface
    <div className="w-full h-full flex flex-col bg-surface text-on-surface overflow-hidden">

      {/* 2. Optional sticky header — always use AppHeader, never inline <header> */}
      <AppHeader variant="primary" action={<SettingsButton />} />
      {/* For secondary screens: <AppHeader variant="sub" onBack={onBack} backLabel="Collections" /> */}
      {/* For auth/legal/settings: <AppHeader variant="standalone" /> */}

      {/* 3. Scrollable content area */}
      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* content */}
      </main>

      {/* 4. Optional fixed footer */}
      <footer className="px-4 py-3 border-t border-outline-variant shrink-0">
        <Button variant="filled" className="w-full">Primary Action</Button>
      </footer>

    </div>
  );
}
```

### View Props Contract

Views that work in BOTH popup and web must use the callback-or-navigate pattern:

```tsx
interface MyViewProps {
  onBack?: () => void;           // popup: provided; web: falls back to navigate()
  onItemClick?: (id: string) => void;  // popup: provided; web: falls back to navigate()
}

// Inside handler:
const handleBack = () => {
  if (onBack) { onBack(); } else { navigate('/collections'); }
};
```

---

## 6. Interaction / Motion Contract

### Rule: All visual hover state via CSS, never via JS event handlers

```tsx
// ❌ BANNED — JS DOM mutation for visual state
onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; }}
onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}

// ✅ APPROVED — Tailwind hover utility
className="hover:shadow-elevation-3 transition-all duration-short ease-standard"
```

### Motion Token Usage

```tsx
// ALWAYS pair transition with duration AND easing:
'transition-all duration-short ease-standard'   // 200ms — most interactions
'transition-all duration-medium ease-standard'  // 300ms — page transitions, modals
'transition-all duration-long ease-emphasized'  // 500ms — dramatic reveals

// NEVER:
'transition'               // no duration or easing specified
'transition-all duration-150'  // hardcoded duration, no MD3 easing
'transition-all'           // missing duration and easing
```

### Allowed Transform Effects

```tsx
// Card lift on hover (approved):
'hover:-translate-y-0.5'   // subtle 2px lift

// Card press:
'active:scale-[0.98]'      // slight press compression

// Expand/slide in (approved for modals/toasts):
'animate-scaleIn'          // defined in global.css
'animate-fadeSlideIn'      // defined in global.css
```

---

## 7. Typography Contract

Use ONLY these tokens. Never hardcode pixel sizes in view/component files.

| When... | Token | Class |
|---|---|---|
| Page / section title | Headline Small | `text-headline-small` (24px) |
| Dialog / modal title | Title Large | `text-title-large` (22px) |
| Card title | Title Medium | `text-title-medium` (16px, 500wt) |
| Tag / small heading | Title Small | `text-title-small` (14px, 500wt) |
| Body paragraph | Body Medium | `text-body-medium` (14px) |
| Secondary description | Body Small | `text-body-small` (12px) |
| Button / CTA | Label Large | `text-label-large` (14px, 500wt) |
| Small chip / badge | Label Medium | `text-label-medium` (12px, 500wt) |
| Metadata / timestamp | Label Small | `text-label-small` (11px, 500wt) |
| Overline / section label | Label Small + uppercase | `text-label-small uppercase tracking-[0.15em]` |

---

## 8. Extension-Specific Rules

These apply ONLY to files in `src/entrypoints/popup/`:

1. **No `useNavigate()`** — views navigate via callback props only
2. **No `<Link>`** — same reason
3. **No `window.location`** — use Chrome extension APIs
4. **No direct `chrome.runtime.sendMessage()`** in views — use hooks
5. **Max one scrollable region** — popup has limited height
6. **Every scroll container**: `overflow-y-auto` with `max-h-*` or `flex-1`
7. **Prefer `min-h-[48px]` for touch targets** — popup users often on laptop trackpads

---

## 9. Self-Verification Commands

Run AFTER writing any UI code, BEFORE submitting:

```bash
# 1. Check for banned Style C vars (MUST return 0 results)
grep -rn "var(--bg\|var(--text-\|var(--accent\|var(--border\|var(--radius\|var(--shadow-rest\|var(--shadow-hover" src/ --include="*.tsx"

# 2. Check for hardcoded pixel font sizes (MUST return 0 results)
grep -rn 'text-\[[0-9]\+px\]' src/ --include="*.tsx"

# 3. Check for onMouseEnter DOM mutation (MUST return 0 results)
grep -rn "onMouseEnter\|onMouseLeave" src/ --include="*.tsx"

# 4. Check for inline style with color/background (flag for review)
grep -rn 'style=.*background\|style=.*color:' src/ --include="*.tsx" | grep -v "color-mix"

# 5. Check for missing touch targets on buttons (spot check)
grep -rn "<button" src/ --include="*.tsx" | grep -v "min-h"
```

Expected results after clean UI work:
- Commands 1, 2, 3: **zero matches**
- Commands 4, 5: review any matches to ensure they are justified exceptions

---

## 10. What Requires Explicit Approval Before Coding

If any of these apply to your task, STOP and define the spec first:

1. **New primitive component** — run `/md3-ui` workflow, create Storybook story alongside
2. **New view** — define: what context (popup/web/both), what props, what callbacks
3. **Custom overlay/modal** — justify why `<Dialog>` primitive cannot be used
4. **Glass effect** — only approved in sticky headers, use exact pattern from §3b
5. **Any inline `style={}`** — must be one of: glass bg, color-mix, or brand-specific (logo)
6. **Any `rgba()` or `#hex`** — must reference an MD3 var, never raw value
7. **Animation beyond `hover:`/`active:`** — must use keyframes defined in `global.css`
