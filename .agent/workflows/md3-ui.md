---
description: How to create Material Design 3 compliant UI components with proper design tokens, accessibility, and visual consistency
---

# Material Design 3 UI Development Workflow

## Pre-Requisites
// turbo-all
Before creating any UI, the AI must verify:
1. Read `/md3-tokens-reference` workflow for the complete token → Tailwind mapping
2. Check existing component patterns in `src/ui-system/components/primitives/`
3. Run `/ui-preflight` checklist before writing code

---

## Step 1: Research the MD3 Specification
When creating or modifying a component, FIRST search the web for:
```
"Material Design 3 [component name] specification site:m3.material.io"
```

Extract:
- **States**: enabled, disabled, hovered, focused, pressed, selected
- **Anatomy**: container, label, icon slots, supporting text
- **Dimensions**: minimum touch target (48dp), padding, spacing
- **Color roles**: which MD3 color tokens apply (primary? surface? error?)

## Step 2: Document the Token Mapping
BEFORE writing styles, create a comment block:

```tsx
/**
 * MD3 Token Mapping:
 *
 * Container:
 *   bg:       bg-surface-container         → surface-container
 *   shape:    rounded-md                   → 12px medium corner
 *   shadow:   shadow-elevation-1           → level 1
 *
 * Content:
 *   text:     text-on-surface              → primary text
 *   subtext:  text-on-surface-variant      → secondary text
 *
 * States:
 *   hover:    8% on-surface state layer    → color-mix
 *   focus:    12% + focus ring             → ring-2 ring-primary
 *   press:    12% state layer              → color-mix
 *   disabled: opacity-disabled             → 38%
 */
```

## Step 3: Implement Using Tailwind Utilities

### Pattern: Base Component Structure
```tsx
className={cn(
    // Base layout
    'inline-flex items-center justify-center gap-2',

    // MD3 Shape
    'rounded-md',                        // 12px medium corner

    // MD3 Color roles
    'bg-surface-container',
    'text-on-surface',

    // MD3 Typography
    'text-label-large',

    // MD3 Touch target
    'min-h-[48px]',

    // MD3 Motion
    'transition-all duration-short ease-standard',

    // MD3 State layers
    'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,var(--md-sys-color-surface-container))]',
    'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_12%,var(--md-sys-color-surface-container))]',

    // MD3 Focus ring
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',

    // MD3 Disabled
    'disabled:opacity-disabled disabled:pointer-events-none',

    className
)}
```

### Key Rules
1. **Always use semantic tokens** — never hardcode colors like `bg-blue-500`
2. **State layers use `color-mix()`** — NOT custom opacity or bg-opacity
3. **Touch targets are 48px minimum** — `min-h-[48px]` on all interactive elements
4. **Focus ring uses primary** — `ring-primary` with `ring-2`
5. **Disabled is 38% opacity** — `opacity-disabled` from MD3 spec
6. **Motion is always specified** — `duration-short ease-standard` minimum

## Step 4: Write Storybook Stories
Every component MUST have a `.stories.tsx` file with:
- Default state story
- All variant stories
- Disabled state story
- Combined showcase story

## Step 5: Accessibility
- All buttons: `aria-label` when icon-only
- Dialogs: `role="dialog"`, `aria-modal="true"`, focus trap
- Inputs: connected labels, error announcements
- Color contrast: minimum 4.5:1 for text (WCAG AA)

## Step 6: Visual Verification
After implementation:
1. Check light mode appearance
2. Check dark mode (toggle `.dark` class)
3. Verify focus ring visibility
4. Test disabled state opacity
5. Confirm hover/press state layers

---

## Anti-Patterns Table

| ❌ NEVER | ✅ ALWAYS | Why |
|----------|----------|-----|
| `bg-blue-500` | `bg-primary` | Semantic tokens = auto dark mode |
| `text-gray-600` | `text-on-surface-variant` | Semantic color roles |
| `border-gray-200` | `border-outline-variant` | MD3 outline token |
| `shadow-lg` | `shadow-elevation-3` | MD3 5-level system |
| `hover:opacity-80` | `hover:bg-[color-mix(...)]` | MD3 state layers |
| `h-10` for button | `min-h-[48px]` | MD3 48px minimum |
| `transition` (no easing) | `duration-short ease-standard` | Always specify MD3 motion |
| `dark:bg-gray-900` | _(CSS variables auto-switch)_ | Theme via CSS vars only |
| `style={{ color: '#hex' }}` | Tailwind utility | No inline styles |
| `opacity-40` for disabled | `opacity-disabled` | MD3 spec = 38% |
