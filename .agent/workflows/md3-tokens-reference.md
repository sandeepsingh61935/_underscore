---
description: Material Design 3 design tokens reference for consistent UI implementation
---

# Material Design 3 Design Tokens Reference

> **Single source of truth** for all UI development. Every utility maps to a CSS variable defined in `global.css` via `tailwind.config.ts`.

## Quick Checklist
Before writing **any** component:
- [ ] Identify which MD3 color roles apply (primary, surface, error, etc.)
- [ ] Pick the correct typography scale (display → label)
- [ ] Choose the right corner shape (xs → full)
- [ ] Use state layers for hover/focus/press — NOT hardcoded opacities
- [ ] Apply elevation shadows — NOT custom box-shadow

---

## Color System

| Role | CSS Variable | Tailwind Utility | Typical Use |
|------|-------------|------------------|-------------|
| Primary | `--md-sys-color-primary` | `bg-primary` / `text-primary` | CTA buttons, active states |
| On Primary | `--md-sys-color-on-primary` | `text-on-primary` | Text on primary bg |
| Primary Container | `--md-sys-color-primary-container` | `bg-primary-container` | Soft highlight bg |
| On Primary Container | `--md-sys-color-on-primary-container` | `text-on-primary-container` | Text on container bg |
| Secondary | `--md-sys-color-secondary` | `bg-secondary` / `text-secondary` | Supporting actions |
| On Secondary | `--md-sys-color-on-secondary` | `text-on-secondary` | Text on secondary bg |
| Secondary Container | `--md-sys-color-secondary-container` | `bg-secondary-container` | Chips, toggles |
| On Sec Container | `--md-sys-color-on-secondary-container` | `text-on-secondary-container` | Text on sec container |
| Tertiary | `--md-sys-color-tertiary` | `bg-tertiary` / `text-tertiary` | Accent, decorative |
| Error | `--md-sys-color-error` | `bg-error` / `text-error` | Error states |
| On Error | `--md-sys-color-on-error` | `text-on-error` | Text on error bg |
| Surface | `--md-sys-color-surface` | `bg-surface` | Page background |
| On Surface | `--md-sys-color-on-surface` | `text-on-surface` | Primary text |
| On Surface Variant | `--md-sys-color-on-surface-variant` | `text-on-surface-variant` | Secondary text |
| Surface Container | `--md-sys-color-surface-container` | `bg-surface-container` | Card default bg |
| Surface Container High | `--md-sys-color-surface-container-high` | `bg-surface-container-high` | Input bg, elevated cards |
| Surface Container Highest | `--md-sys-color-surface-container-highest` | `bg-surface-container-highest` | Dialog bg, text field bg |
| Outline | `--md-sys-color-outline` | `border-outline` / `text-outline` | Borders, dividers |
| Outline Variant | `--md-sys-color-outline-variant` | `border-outline-variant` | Subtle borders |
| Scrim | `--md-sys-color-scrim` | `bg-scrim` | Modal overlay |

---

## Typography Scale

| Token | Tailwind Utility | Size | Weight | Line Height | Typical Use |
|-------|-----------------|------|--------|-------------|-------------|
| Display Large | `text-display-large` | 57px | 400 | 64px | Hero text |
| Display Medium | `text-display-medium` | 45px | 400 | 52px | Feature titles |
| Display Small | `text-display-small` | 36px | 400 | 44px | Section intros |
| Headline Large | `text-headline-large` | 32px | 400 | 40px | Page titles |
| Headline Medium | `text-headline-medium` | 28px | 400 | 36px | Section titles |
| Headline Small | `text-headline-small` | 24px | 400 | 32px | Card titles |
| Title Large | `text-title-large` | 22px | 400 | 28px | Dialog headers |
| Title Medium | `text-title-medium` | 16px | 500 | 24px | Card subtitles |
| Title Small | `text-title-small` | 14px | 500 | 20px | Tags |
| Body Large | `text-body-large` | 16px | 400 | 24px | Paragraphs |
| Body Medium | `text-body-medium` | 14px | 400 | 20px | Descriptions |
| Body Small | `text-body-small` | 12px | 400 | 16px | Captions |
| Label Large | `text-label-large` | 14px | 500 | 20px | Buttons, CTA |
| Label Medium | `text-label-medium` | 12px | 500 | 16px | Small labels |
| Label Small | `text-label-small` | 11px | 500 | 16px | Metadata |

---

## Shape Tokens (Corner Radius)

| Token | Tailwind Utility | Value | Typical Use |
|-------|-----------------|-------|-------------|
| None | `rounded-none` | 0px | Full bleed |
| Extra Small | `rounded-xs` | 4px | Small elements |
| Small | `rounded-sm` | 8px | Buttons, chips |
| Medium | `rounded-md` | 12px | Cards, inputs |
| Large | `rounded-lg` | 16px | Dialogs, sheets |
| Extra Large | `rounded-xl` | 28px | Dialogs |
| Full | `rounded-full` | 9999px | Pill buttons, FABs |

---

## Motion / Easing

| Token | Tailwind Utility | Value | Typical Use |
|-------|-----------------|-------|-------------|
| Standard | `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Most transitions |
| Emphasized | `ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Enter/exit |
| Decelerate | `ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Enter |
| Accelerate | `ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Exit |

| Duration | Tailwind Utility | Value |
|----------|-----------------|-------|
| Short | `duration-short` | 200ms |
| Medium | `duration-medium` | 300ms |
| Long | `duration-long` | 500ms |

---

## Elevation (Shadows)

| Level | Tailwind Utility | Typical Use |
|-------|-----------------|-------------|
| 1 | `shadow-elevation-1` | Cards at rest |
| 2 | `shadow-elevation-2` | Cards on hover |
| 3 | `shadow-elevation-3` | Dialogs, modals |
| 4 | `shadow-elevation-4` | FAB |
| 5 | `shadow-elevation-5` | Navigation drawer |

---

## State Layers (Interactive States)

MD3 uses **semi-transparent color overlays** on interactive elements:

```
hover:   8% opacity of content color on surface  → color-mix(in_srgb, CONTENT_COLOR 8%, SURFACE_COLOR)
focus:   12% opacity of content color on surface
press:   12% opacity of content color on surface
drag:    16% opacity of content color on surface
disabled: 38% overall opacity (opacity-disabled)
```

### Example: Filled Button State Layers

```tsx
// Hover: 8% on-primary over primary background
'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_8%,var(--md-sys-color-primary))]'

// Press: 12% on-primary over primary background
'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_12%,var(--md-sys-color-primary))]'

// Disabled: 38% opacity
'disabled:opacity-disabled disabled:pointer-events-none'
```

---

## Opacity Tokens

| Token | Tailwind Utility | Value | Use |
|-------|-----------------|-------|-----|
| Disabled | `opacity-disabled` | 38% | Disabled elements |
| Hover state layer | `opacity-hover` | 8% | Hover overlay |
| Focus state layer | `opacity-focus` | 12% | Focus/press overlay |
| Drag state layer | `opacity-drag` | 16% | Drag overlay |

---

## Anti-Patterns (NEVER DO)

| ❌ Wrong | ✅ Correct | Why |
|----------|-----------|-----|
| `bg-blue-500` | `bg-primary` | Use semantic MD3 tokens |
| `text-gray-500` | `text-on-surface-variant` | Use semantic MD3 tokens |
| `border-gray-200` | `border-outline-variant` | Use MD3 outline tokens |
| `rounded-lg` (Tailwind default) | `rounded-lg` (MD3 mapped) | Our config maps to MD3 values |
| `shadow-md` (Tailwind default) | `shadow-elevation-2` | Use MD3 elevation levels |
| `opacity-50 hover:opacity-100` | `hover:bg-[color-mix(...)]` | Use MD3 state layers |
| `transition-all` (no easing) | `ease-standard duration-short` | Always use MD3 motion |
| `h-10` for touch target | `min-h-[48px]` | MD3 minimum 48px touch |
| `dark:bg-gray-900` | _(automatic)_ | Theme handled by CSS vars |
