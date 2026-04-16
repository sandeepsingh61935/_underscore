---
description: Pre-flight checklist that MUST be followed before any UI work - enforces workflow compliance
---

# UI Pre-Flight Checklist

> **MANDATORY**: This checklist MUST be completed before writing any UI code. Skip = rejection.
>
> **ALSO READ**: `.agent/workflows/ui-code-contracts.md` — the authoritative contract for patterns, token mapping, and approved code recipes.

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

### Project-Specific Banned Patterns (this codebase)

These are the ACTUAL patterns found in existing code that MUST NOT be copied:

```
BANNED — Style C Hybrid Aliases (var(--*) in .tsx files):
- style={{ background: 'var(--bg)' }}          → className="bg-surface"
- style={{ background: 'var(--bg-card)' }}     → className="bg-surface-container-lowest"
- style={{ color: 'var(--text-primary)' }}     → className="text-on-surface"
- style={{ color: 'var(--text-secondary)' }}   → className="text-on-surface-variant"
- style={{ color: 'var(--text-tertiary)' }}    → className="text-outline"
- style={{ color: 'var(--accent)' }}           → className="text-primary"
- style={{ background: 'var(--accent)' }}      → className="bg-primary"
- style={{ background: 'var(--accent-soft)' }} → className="bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]"
- style={{ color: 'var(--accent-text)' }}      → className="text-primary"
- style={{ border: '1px solid var(--border)' }}→ className="border border-outline-variant"
- rounded-[var(--radius)]                      → rounded-md
- rounded-[var(--radius-sm)]                   → rounded-sm
- style={{ boxShadow: 'var(--shadow-hover)' }} → className="hover:shadow-elevation-3"
- style={{ boxShadow: 'var(--shadow-rest)' }}  → className="shadow-elevation-1"

BANNED — JS event handlers for visual state:
- onMouseEnter={e => { e.currentTarget.style.* }}   → hover: Tailwind utility
- onMouseLeave={e => { e.currentTarget.style.* }}   → remove entirely

BANNED — Hardcoded font sizes in components:
- text-[22px]   → text-title-large
- text-[16px]   → text-body-large
- text-[14px]   → text-body-medium (body) OR text-label-large (buttons)
- text-[13px]   → text-body-small
- text-[12px]   → text-body-small (body) OR text-label-medium (labels)
- text-[11px]   → text-label-small

BANNED — Missing motion spec:
- transition-all duration-150  → transition-all duration-short ease-standard
- transition                   → transition-all duration-short ease-standard
```

## Phase 3: Verification

- [ ] Component renders correctly in light mode
- [ ] Component renders correctly in dark mode (CSS vars auto-switch)
- [ ] Focus ring is visible (keyboard navigation)
- [ ] Storybook story created with all variants
- [ ] No `sys-*`, `hsl(var(--`, or `bg-badge` tokens in code

## Phase 4: Self-Verification (Run These Commands)

Before submitting any UI code, run ALL of the following. The first three MUST return zero matches:

```bash
# 1. No Style C Hybrid vars (MUST BE ZERO)
grep -rn "var(--bg\|var(--text-\|var(--accent\|var(--border\|var(--radius\|var(--shadow-rest\|var(--shadow-hover" src/ --include="*.tsx"

# 2. No hardcoded pixel font sizes (MUST BE ZERO)
grep -rn 'text-\[[0-9]\+px\]' src/ --include="*.tsx"

# 3. No JS DOM mutation for visual state (MUST BE ZERO)
grep -rn "onMouseEnter\|onMouseLeave" src/ --include="*.tsx"

# 4. Flag inline styles with color/background for review
grep -rn 'style=.*background\|style=.*color:' src/ --include="*.tsx" | grep -v "color-mix"

# 5. Check motion tokens are used correctly (no bare transition)
grep -rn '"transition-all"' src/ --include="*.tsx" | grep -v "duration-short\|duration-medium\|duration-long"
```

If any of commands 1–3 return results, fix them before proceeding.

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
