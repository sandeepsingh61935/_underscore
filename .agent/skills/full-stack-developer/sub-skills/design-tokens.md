---
name: Design Tokens Reference
description: Complete lookup table for all styling decisions in the _underscore project. Before choosing any class, check this table first.
---

# Design Tokens Reference

This file is the single source of truth for atomic styling decisions. Every class listed here is wired through `tailwind.config.ts` → `global.css` → CSS variables. Never guess; look it up here.

---

## 1. The Decision Lookup Table

This is the most important section. For common UI situations, use exactly these classes.

### Typography Decisions

| Situation | Tailwind Class | Notes |
|---|---|---|
| Page/section title | `text-title-large` | 22px / 400 |
| Card title | `text-title-medium` | 16px / 500 |
| Card sub-title | `text-title-small` | 14px / 500 |
| Default body text | `text-body-medium` | 14px / 400 |
| Secondary / supporting body | `text-body-small` | 12px / 400 |
| Button label | `text-label-large` | 14px / 500 — set by Button component automatically |
| Chip / caption | `text-label-medium` | 12px / 500 |
| Tiny annotation | `text-label-small` | 11px / 500 |
| Domain name / prominent label | `text-title-medium` | — |
| Error message text | `text-body-small text-error` | — |
| Section header (e.g., "MODE") | `text-label-medium uppercase tracking-widest` | — |

**Font**: Inter (NOT Roboto — MD3 docs are wrong for this project).

### Color Decisions

| Situation | Background | Text |
|---|---|---|
| Default view background | `bg-surface` | `text-on-surface` |
| Card / contained element | `bg-surface-container` | `text-on-surface` |
| Elevated card | `bg-surface-container-high` | `text-on-surface` |
| Floating / bottommost element | `bg-surface-container-lowest` | `text-on-surface` |
| Primary action button | `bg-primary` | `text-on-primary` |
| Secondary / supporting metadata | — | `text-on-surface-variant` |
| Destructive action | — | `text-error` |
| Disabled element | — | `opacity-disabled` |
| Border / divider | `border-outline-variant` | — |
| Active/hover border | `border-outline` | — |
| Accent / brand highlight | `bg-primary-container` | `text-on-primary-container` |
| Inline code snippet | `bg-surface-container-highest` | `font-mono text-on-surface` |

### Spacing Decisions

| Situation | Class |
|---|---|
| Inner padding of a card | `p-4` |
| Inner padding of a compact card | `p-3` |
| Inner padding of a dialog | `p-6` |
| Gap between list items | `gap-2` |
| Gap between card rows | `gap-3` |
| Gap between sections | `gap-6` |
| Horizontal padding on a view | `px-4` |
| Padding between header and content | `pt-4` |
| Icon button touch target | `h-12 w-12` (48px) |
| Standard button height | `min-h-[48px]` — enforced in `Button.tsx` |
| Dense icon size | `h-5 w-5` (20px) |
| Standard icon size | `h-6 w-6` (24px) |

### Shape Decisions

| Shape | Class | Raw Value |
|---|---|---|
| Button | `rounded-full` | 9999px |
| Card | `rounded-md` | 12px |
| Dialog | `rounded-xl` | 28px |
| Input field | `rounded-sm` | 8px |
| Chip | `rounded-full` | 9999px |
| Small badge | `rounded-xs` | 4px |

### Elevation Decisions

| Situation | Class |
|---|---|
| Default card | `shadow-elevation-1` |
| Elevated card | `shadow-elevation-2` |
| Card on hover | `shadow-elevation-3` |
| Dialog / floating panel | `shadow-elevation-3` |
| Bottom sheet | `shadow-elevation-4` |
| Navigation drawer | `shadow-elevation-5` |

**Note**: For elevation hierarchy within a view, prefer using `bg-surface-container-*` levels instead of shadows where possible.

### Motion Decisions

| Situation | Classes |
|---|---|
| Default state transition | `transition-all duration-short ease-standard` |
| Enter animation (element appearing) | `transition-all duration-medium ease-decelerate` |
| Exit animation (element disappearing) | `transition-all duration-medium ease-accelerate` |
| Hero / dialog open | `transition-all duration-long ease-emphasized` |

---

## 2. Style C Hybrid Aliases

The project uses short-form "Style C" aliases in `global.css` (lines 172–192) that map to MD3 tokens. Use these in inline styles or CSS only — use Tailwind tokens in TSX.

| Alias | Resolves To | Tailwind Equivalent |
|---|---|---|
| `var(--bg)` | `--md-sys-color-surface` | `bg-surface` |
| `var(--bg-card)` | `--md-sys-color-surface-container-lowest` | `bg-surface-container-lowest` |
| `var(--bg-elevated)` | `--md-sys-color-surface-container-low` | `bg-surface-container-low` |
| `var(--text-primary)` | `--md-sys-color-on-surface` | `text-on-surface` |
| `var(--text-secondary)` | `--md-sys-color-on-surface-variant` | `text-on-surface-variant` |
| `var(--text-tertiary)` | `--md-sys-color-outline` | `text-outline` |
| `var(--accent)` | `--md-sys-color-primary` | `text-primary` / `bg-primary` |
| `var(--accent-soft)` | `color-mix(primary 8%, transparent)` | Use `color-mix()` inline |
| `var(--border)` | `--md-sys-color-outline-variant` | `border-outline-variant` |
| `var(--border-hover)` | `--md-sys-color-outline` | `border-outline` |
| `var(--radius)` | `--md-sys-shape-corner-medium` (12px) | `rounded-md` |
| `var(--radius-sm)` | `--md-sys-shape-corner-small` (8px) | `rounded-sm` |
| `var(--radius-lg)` | `--md-sys-shape-corner-large` (16px) | `rounded-lg` |

**Rule**: In TSX files, always use the Tailwind class. Never use `style={{ background: 'var(--bg)' }}` in React components.

---

## 3. MD3 State Layer Implementation

MD3 state layers use `color-mix()` — not opacity modifiers. This is already implemented in `Button.tsx` and `Card.tsx`. Copy that pattern exactly.

```tsx
// Hover on primary background (8% white overlay)
'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_8%,var(--md-sys-color-primary))]'

// Hover on surface background (8% on-surface overlay)
'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,var(--md-sys-color-surface-container))]'

// Press state (12% overlay)
'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_12%,var(--md-sys-color-surface-container))]'
```

**State Layer Opacity Reference:**

| State | Opacity |
|---|---|
| Hover | 8% (`opacity-hover`) |
| Focus / Press | 12% (`opacity-focus`) |
| Drag | 16% (`opacity-drag`) |
| Disabled | 38% (`opacity-disabled`) |

---

## 4. Complete MD3 Token Reference

### Color Tokens (Light / Dark — both handled by `.dark` class on `<html>`)

#### Primary Family
| Token | Tailwind Class |
|---|---|
| Primary | `bg-primary` / `text-primary` |
| On Primary | `bg-on-primary` / `text-on-primary` |
| Primary Container | `bg-primary-container` / `text-primary-container` |
| On Primary Container | `bg-on-primary-container` / `text-on-primary-container` |

#### Secondary Family
| Token | Tailwind Class |
|---|---|
| Secondary | `bg-secondary` / `text-secondary` |
| On Secondary | `text-on-secondary` |
| Secondary Container | `bg-secondary-container` |
| On Secondary Container | `text-on-secondary-container` |

#### Surface Family
| Token | Tailwind Class | Use For |
|---|---|---|
| Surface | `bg-surface` | View backgrounds |
| Surface Dim | `bg-surface-dim` | Slightly dimmed background |
| Surface Bright | `bg-surface-bright` | Bright surface elements |
| Surface Container Lowest | `bg-surface-container-lowest` | Cards on surface |
| Surface Container Low | `bg-surface-container-low` | Slightly elevated |
| Surface Container | `bg-surface-container` | **Default container** |
| Surface Container High | `bg-surface-container-high` | Dialogs, sheets |
| Surface Container Highest | `bg-surface-container-highest` | Code snippets, tooltips |
| On Surface | `text-on-surface` | Primary text |
| On Surface Variant | `text-on-surface-variant` | Secondary text, hints |

#### Error Family
| Token | Tailwind Class |
|---|---|
| Error | `bg-error` / `text-error` |
| On Error | `text-on-error` |
| Error Container | `bg-error-container` |
| On Error Container | `text-on-error-container` |

#### Outline & Special
| Token | Tailwind Class | Use For |
|---|---|---|
| Outline | `border-outline` | Prominent borders |
| Outline Variant | `border-outline-variant` | Subtle dividers |
| Inverse Surface | `bg-inverse-surface` | Snackbars, toasts |
| Scrim | `bg-scrim` | Modal overlays |

### Typography Scale

| Role | Tailwind Class | Size / Weight |
|---|---|---|
| Display Large | `text-display-large` | 57px / 400 |
| Display Medium | `text-display-medium` | 45px / 400 |
| Display Small | `text-display-small` | 36px / 400 |
| Headline Large | `text-headline-large` | 32px / 400 |
| Headline Medium | `text-headline-medium` | 28px / 400 |
| Headline Small | `text-headline-small` | 24px / 400 |
| Title Large | `text-title-large` | 22px / 400 |
| Title Medium | `text-title-medium` | 16px / 500 |
| Title Small | `text-title-small` | 14px / 500 |
| Body Large | `text-body-large` | 16px / 400 |
| Body Medium | `text-body-medium` | 14px / 400 ← default |
| Body Small | `text-body-small` | 12px / 400 |
| Label Large | `text-label-large` | 14px / 500 ← buttons |
| Label Medium | `text-label-medium` | 12px / 500 |
| Label Small | `text-label-small` | 11px / 500 |

### Shape Tokens

| Token | Tailwind | Size |
|---|---|---|
| None | `rounded-none` | 0px |
| Extra Small | `rounded-xs` | 4px |
| Small | `rounded-sm` | 8px |
| Medium | `rounded-md` | 12px |
| Large | `rounded-lg` | 16px |
| Extra Large | `rounded-xl` | 28px |
| Full | `rounded-full` | 9999px |

---

## 5. Anti-Patterns Checklist

Before submitting any UI code, verify none of these are present:

```bash
# Run these grep checks:
rg 'bg-white|bg-gray|bg-blue|bg-red|bg-green|bg-zinc|bg-slate|bg-neutral' src/ --include='*.tsx'
rg 'text-gray|text-white|text-black|text-blue|text-red' src/ --include='*.tsx'
rg 'text-xl|text-2xl|text-3xl|font-bold|font-semibold' src/ --include='*.tsx'
rg '#[0-9a-fA-F]{3,6}' src/ --include='*.tsx'
rg 'box-shadow|shadow-sm|shadow-md|shadow-lg|shadow-xl' src/ --include='*.tsx'
```

All should return zero hits.
