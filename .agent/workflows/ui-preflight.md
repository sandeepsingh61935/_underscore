---
description: Pre-flight checklist that MUST be followed before any UI work - enforces workflow compliance
---

# UI Pre-Flight Checklist

> **MANDATORY**: This checklist MUST be completed before writing any UI code. Skip = rejection.

---

## Phase 1: Context Gathering

- [ ] Read the design mockup or specification for this component
- [ ] Identify which MD3 component spec applies (search m3.material.io)
- [ ] Check existing primitives in `src/ui-system/components/primitives/`
- [ ] Document which MD3 color roles to use (primary? surface? error?)

## Phase 2: Token Constraints

- [ ] All colors USE ONLY tokens from `tailwind.config.ts` MD3 mappings
- [ ] No hardcoded hex values (e.g. `#FF0000`)
- [ ] No Tailwind default colors (e.g. `bg-blue-500`, `text-gray-600`)
- [ ] No raw CSS variables in `style={{}}` — use Tailwind utilities only
- [ ] Typography uses MD3 scale (`text-body-large`, NOT `text-base`)
- [ ] Shapes use MD3 corners (`rounded-md`, NOT `rounded-[12px]`)
- [ ] Shadows use MD3 elevation (`shadow-elevation-2`, NOT `shadow-lg`)
- [ ] Motion uses MD3 easing (`ease-standard duration-short`, NOT `transition`)
- [ ] State layers use `color-mix()` pattern for hover/focus/press
- [ ] Disabled state uses `opacity-disabled` (38%)
- [ ] Touch targets are minimum 48px (`min-h-[48px]`)

## Phase 3: Verification

- [ ] Component renders correctly in light mode
- [ ] Component renders correctly in dark mode (CSS vars auto-switch)
- [ ] Focus ring is visible (keyboard navigation)
- [ ] Storybook story created with all variants
- [ ] No `sys-*`, `hsl(var(--`, or `bg-badge` tokens in code

---

## Enforcement

If an agent produces code with ANY of the following, the code must be rejected:

```
REJECTED PATTERNS:
- bg-blue-500, bg-red-400, bg-gray-*  → Use bg-primary, bg-error, bg-surface-*
- text-gray-500                        → Use text-on-surface-variant
- border-gray-200                      → Use border-outline-variant
- shadow-sm, shadow-md, shadow-lg      → Use shadow-elevation-1 thru 5
- #ffffff, #000000 in TSX files        → Use bg-surface, text-on-surface
- dark:bg-*, dark:text-*               → CSS variables handle dark mode
- sys-*, apple-*, --background         → These systems have been removed
```
