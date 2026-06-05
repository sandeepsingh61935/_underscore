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
- **Chrome ownership**: `PopupShell` owns chrome (ModeHeader + TabBar + AnimatePresence). Views return body content only.
- **Chrome APIs**: only inside hooks (`src/features/*/hooks/`, `src/ui-system/hooks/`) — never directly in a view or component

### Web App (SPA)
- **Full viewport**: `min-h-screen` layout, max-width content container (`max-w-[640px]` typical)
- **Routing**: uses React Router `useNavigate()` / `<Link>` — only in web app pages (`src/pages/`, `src/web/`)
- **Entry point**: views in `src/features/*/views/` accept both callback props AND fallback to `useNavigate()` for web context

### Both Contexts
- **Font**: `var(--serif)` for display/headings, `var(--sans)` for body, `var(--mono)` for code
- **Scrollbar**: styled globally — never override in components
- **Focus ring**: styled globally via `#app` scope — never override `outline` directly

---

## 2. Banned Patterns

The following are **BANNED** in all `.tsx` files. ESLint will error on them.

### Banned CSS Variables (Legacy Systems — Do Not Use)

| BANNED | CORRECT V2 | Notes |
|--------|-----------|-------|
| `var(--md-sys-color-*)` | `var(--paper)`, `var(--ink)`, `var(--accent)` | MD3 tokens removed |
| `var(--ink-1)` .. `var(--ink-4)` | `var(--paper-2)` (surface), `var(--ink)` (text) | Ink & Glass vars removed |
| `var(--ink-focus)`, `var(--ink-capture)`, `var(--ink-memory)`, `var(--ink-neural)` | `var(--accent)` | All modes share one accent |
| `var(--ink-mode)` | `var(--accent)` | Per-mode color removed from V2 |
| `var(--bg)`, `var(--bg-card)`, `var(--bg-elevated)` | `var(--paper)`, `var(--paper-2)` | Style C aliases removed |
| `var(--text-primary)`, `var(--text-secondary)`, `var(--text-tertiary)` | `var(--ink)`, `var(--ink-2)`, `var(--ink-3)` | Style C aliases removed |
| `var(--border)`, `var(--border-hover)` | `var(--rule)`, `var(--rule-soft)` | V2 border tokens |
| `var(--shadow-rest)`, `var(--shadow-hover)`, `var(--elevation-*)` | `border: 1px solid var(--rule-soft)` | V2 uses borders, not shadows |
| `var(--logo-bg)`, `var(--logo-text)`, `var(--logo-ambient-reflection)` | `var(--paper)`, `var(--ink)`, `var(--paper-overlay-08)` | Logo vars removed |
| `var(--radius-sm)`, `var(--radius-lg)`, `var(--radius-full)` | `var(--radius)` | V2 has single 2px radius |

### Banned Inline Style Patterns

| BANNED | CORRECT |
|--------|---------|
| `style={{ background: 'var(--bg)' }}` | `style={{ background: 'var(--paper)' }}` |
| `style={{ color: 'var(--text-primary)' }}` | `style={{ color: 'var(--ink)' }}` |
| `style={{ border: '1px solid var(--border)' }}` | `style={{ border: '1px solid var(--rule)' }}` |
| `style={{ boxShadow: 'var(--shadow-hover)' }}` | remove; use `border: 1px solid var(--rule-soft)` |
| `onMouseEnter` + `e.currentTarget.style.*` | CSS `hover:` pseudo-class |
| `onMouseLeave` + `e.currentTarget.style.*` | remove entirely |
| Any `#hex` color in TSX | `var(--paper)`, `var(--ink)`, `var(--accent)` |

### Banned Typography Patterns

| BANNED | CORRECT V2 |
|--------|-----------|
| `text-[22px]`, `text-[20px]`, etc. | `var(--step-3)`, `var(--step-4)` or `.u-serif` class |
| `font-display`, `font-serif`, `font-sans` | `var(--serif)`, `var(--sans)`, `var(--mono)` |
| `text-body-medium`, `text-label-large` (MD3) | `font-size: var(--step-0)` or semantic class |
| `duration-[180ms]`, `duration-[280ms]`, `duration-[300ms]` | standard CSS transition |
| `rounded-[Xpx]` | `var(--radius)` (2px, the only V2 radius) |

### Banned Motion Patterns

```
BANNED:
- duration-[XXXms]           → use transition: var(--ease-standard)
- ease-out (bare)            → transition-timing-function: var(--ease-standard)
- var(--ink-ease-spring)     → var(--ease-standard) (V2 has no spring curve)
- style={{ animation: '...' }} → use CSS @keyframes in global.css
```

### Banned Touch Targets

- `h-7`, `h-8`, `h-9`, `h-10` on interactive elements — minimum is **44px** (`min-h-[44px]` or `min-h-11`)
- Per V2 spec rule 7: **44px minimum touch target** (supersedes any legacy 48px rule)

---

## 3. Approved Patterns (Copy These Exactly)

### 3a. V2 Token Reference

```css
/* Surface & Ink */
var(--paper)          /* warm off-white — view background */
var(--paper-2)        /* slightly warmer — card/container background */
var(--ink)            /* near-black — primary text */
var(--ink-2)          /* medium — secondary text */
var(--ink-3)          /* light — tertiary/muted text */
var(--ink-4)          /* very light — placeholder, disabled */

/* Borders */
var(--rule)           /* standard border */
var(--rule-soft)      /* subtle divider */

/* Accent */
var(--accent)         /* terracotta oklch(62% 0.12 45) — all modes */
var(--accent-2)       /* accent hover/surface */
var(--accent-ink)     /* text on accent background */
var(--accent-tint-08) /* 8% accent tint */
var(--accent-tint-18) /* 18% accent tint */
var(--accent-tint-35) /* 35% accent tint */
var(--accent-tint-65) /* 65% accent tint */

/* Utility overlays */
var(--utility-overlay-05)  /* 5% black overlay */
var(--utility-overlay-08)  /* 8% black overlay */
var(--utility-overlay-18)  /* 18% black overlay */
var(--paper-overlay-08)    /* 8% white/paper overlay */
var(--utility-surface-elevated)  /* #fff — truly elevated surface */

/* Typography */
var(--serif)   /* Instrument Serif — display/headings only */
var(--sans)    /* system sans — body text */
var(--mono)    /* monospace — code, tabs, metadata */

/* Type scale (fluid) */
var(--step--2)  /* 10px */
var(--step--1)  /* 11px */
var(--step-0)   /* 13px */
var(--step-1)   /* 15px */
var(--step-2)   /* 18px */
var(--step-3)   /* 22px */
var(--step-4)   /* 28px */
var(--step-5)   /* 36px */
var(--step-6)   /* 48px */

/* Geometry */
var(--radius)   /* 2px — the single editorial radius */
var(--pop-w)    /* 400px — popup width */
var(--pop-h)    /* 600px — popup height */
```

### 3b. Semantic Typography Classes

Use these classes instead of inline font styles:

```tsx
<h1 className="u-serif">Display heading</h1>          /* Instrument Serif italic */
<p className="u-kicker">SECTION LABEL</p>              /* mono caps, letter-spaced */
<span className="u-mono">abc123</span>                 /* monospace data */
<span className="u-caps">UPPERCASE LABEL</span>        /* small caps */
```

### 3c. View Root (every view starts with this)

```tsx
// Extension popup view (body-only — PopupShell owns chrome)
<div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
  ...
</div>

// Web page / full-screen view
<div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)', color: 'var(--ink)' }}>
  ...
</div>
```

### 3d. Card Pattern (V2 — border, not shadow)

```tsx
// Static card
<div style={{
  background: 'var(--paper-2)',
  border: '1px solid var(--rule-soft)',
  borderRadius: 'var(--radius)',
  padding: '12px 16px',
}}>
  ...
</div>

// Interactive card
<button
  type="button"
  style={{
    background: 'var(--paper-2)',
    border: '1px solid var(--rule-soft)',
    borderRadius: 'var(--radius)',
    padding: '12px 16px',
    cursor: 'pointer',
    width: '100%',
    minHeight: '44px',
  }}
>
  ...
</button>
```

### 3e. Typography Hierarchy

```tsx
// Display — Instrument Serif italic (headings only)
<h1 className="u-serif" style={{ fontSize: 'var(--step-4)', color: 'var(--ink)' }}>
  Your knowledge
</h1>

// Kicker — mono caps (section labels)
<p className="u-kicker" style={{ color: 'var(--ink-3)' }}>HIGHLIGHTS</p>

// Body text
<p style={{ fontSize: 'var(--step-0)', color: 'var(--ink-2)', lineHeight: 1.5 }}>
  Supporting description
</p>

// Metadata / caption
<span style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}>2 hours ago</span>
```

### 3f. Divider / Separator

```tsx
// Horizontal rule — V2 uses border-top, not height+bg
<div style={{ borderTop: '1px solid var(--rule-soft)', width: '100%' }} />
```

### 3g. Accent CTA Button

```tsx
// Primary action — single terracotta button
<button
  type="submit"
  style={{
    background: 'var(--accent)',
    color: 'var(--accent-ink)',
    border: 'none',
    borderRadius: 'var(--radius)',
    minHeight: '44px',
    padding: '0 24px',
    fontSize: 'var(--step-0)',
    cursor: 'pointer',
  }}
>
  Sign in
</button>
```

### 3h. Disabled State

```tsx
// APPROVED: V2 disabled
<button style={{ opacity: 0.4, pointerEvents: 'none' }} disabled>
  Disabled
</button>
```

---

## 4. Primitive Component Contracts

### When to use each primitive vs. custom element:

| Need | Use This | Never Do This |
|------|----------|---------------|
| CTA / action button | `<Button>` primitive | Raw `<button>` with inline bg/color styles |
| Text input | `<Input>` primitive | Raw `<input>` with inline styles |
| Collection / item card | `<Card interactive>` primitive | Custom `<div>` with onMouseEnter |
| Static info card | `<Card>` primitive | Custom `<div>` with inline bg/border |
| Confirmation dialog | `<Dialog>` primitive | Custom overlay with raw backdrop styles |
| Loading spinner | `<Spinner>` primitive | Custom CSS spinner |
| Text rendering | `<Text>` primitive (or semantic HTML + type class) | `<p style={{ color: '...' }}>` |
| Section chip/tag | `<Chip>` primitive | Custom span with accent-soft bg |
| Trust/privacy message | `<TrustSignal>` primitive | Inline p with text-tertiary style |
| Visual separator | `<Separator>` primitive | `<hr>` or `<div className="h-px bg-...">` |

### Button Variant Rules

```tsx
// Primary action (V2 — single terracotta accent button)
<Button variant="accent">Sign in</Button>

// Ghost / secondary
<Button variant="ghost">Cancel</Button>

// Default
<Button variant="default">Action</Button>

// NEVER: SocialButton (deleted in Layer 3)
// NEVER: raw button with hex colors
// NEVER: Google/Apple brand colors
```

---

## 5. View Structure Contract

Every popup view must follow this structure (PopupShell owns chrome — views are body-only):

```tsx
export function MyView({ onAction }: MyViewProps) {
  return (
    // Body-only — no chrome (no ModeHeader, no TabBar, no PopupShell import)
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>

      {/* Scrollable content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* content */}
      </main>

      {/* Optional fixed footer */}
      <footer style={{ padding: '12px 16px', borderTop: '1px solid var(--rule-soft)', flexShrink: 0 }}>
        <Button variant="accent" style={{ width: '100%' }}>Primary Action</Button>
      </footer>

    </div>
  );
}
```

### View Props Contract

```tsx
interface MyViewProps {
  onBack?: () => void;           // popup: provided; web: falls back to navigate()
  onItemClick?: (id: string) => void;
}

const handleBack = () => {
  if (onBack) { onBack(); } else { navigate('/collections'); }
};
```

---

## 6. Interaction / Motion Contract

### Rule: All visual hover state via CSS, never via JS event handlers

```tsx
// BANNED — JS DOM mutation for visual state
onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-hover)'; }}
onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}

// APPROVED — CSS pseudo-class (in a <style> block or CSS module)
// Or use className with a CSS class that has :hover styles
```

### Motion Token Usage

```tsx
// Standard transitions — use CSS custom properties
style={{ transition: 'opacity 0.15s var(--ease-standard), transform 0.15s var(--ease-standard)' }}

// NEVER hardcode durations in Tailwind: duration-[180ms], duration-[280ms]
// NEVER use var(--ink-ease-spring) — removed in V2
```

---

## 7. Typography Contract

Use ONLY these V2 step tokens. Never hardcode pixel sizes.

| When... | Token | Approx px |
|---------|-------|-----------|
| Display / hero heading | `var(--step-4)` to `var(--step-6)` + `u-serif` | 28–48px |
| Section heading | `var(--step-3)` | 22px |
| Card title | `var(--step-2)` | 18px |
| Body paragraph | `var(--step-1)` | 15px |
| Default body / UI | `var(--step-0)` | 13px |
| Secondary / caption | `var(--step--1)` | 11px |
| Tiny annotation | `var(--step--2)` | 10px |
| Kicker / section label | `u-kicker` class + `var(--step--1)` | mono caps |

---

## 8. Extension-Specific Rules

These apply ONLY to files in `src/entrypoints/popup/`:

1. **No `useNavigate()`** — views navigate via callback props only
2. **No `<Link>`** — same reason
3. **No `window.location`** — use Chrome extension APIs
4. **No direct `chrome.runtime.sendMessage()`** in views — use hooks
5. **Max one scrollable region** — popup has limited height
6. **Every scroll container**: `overflowY: 'auto'` with `maxHeight` or `flex: 1`
7. **Minimum 44px touch targets** — per V2 spec rule 7
8. **Views NEVER import PopupShell, ModeHeader, or TabBar** — chrome owned by shell

---

## 9. Self-Verification Commands

Run AFTER writing any UI code, BEFORE submitting:

```bash
# 1. Check for legacy MD3/Ink/StyleC vars (MUST return 0)
grep -rn "var(--md-sys-\|var(--ink-[0-9]\|var(--bg\|var(--text-\|var(--border\|var(--shadow-\|var(--elevation\|var(--logo-" src/ --include="*.tsx"

# 2. Check for hardcoded hex colors (MUST return 0)
grep -rn '#[0-9a-fA-F]\{3,8\}' src/ --include="*.tsx"

# 3. Check for onMouseEnter DOM mutation (MUST return 0)
grep -rn "onMouseEnter\|onMouseLeave" src/ --include="*.tsx"

# 4. Check for arbitrary duration Tailwind classes (MUST return 0)
grep -rn 'duration-\[[0-9]*ms\]' src/ --include="*.tsx"

# 5. Check for undersized touch targets on interactive elements
grep -rn 'h-7\|h-8\|h-9\|h-10\b' src/ --include="*.tsx"
```

---

## 10. What Requires Explicit Approval Before Coding

If any of these apply, STOP and define the spec first:

1. **New primitive component** — run `/ui-preflight` workflow; reference wireframe JSX in `ui_kits/extension/v2/`
2. **New view** — define: what context (popup/web/both), what props, what callbacks
3. **Custom overlay/modal** — justify why `<Dialog>` primitive cannot be used
4. **Any `rgba()` or `#hex`** — must reference a V2 var, never raw value
5. **Animation beyond `:hover`/`:active`** — must use keyframes defined in `global.css`
6. **New font** — must use `var(--serif)`, `var(--sans)`, or `var(--mono)` only
