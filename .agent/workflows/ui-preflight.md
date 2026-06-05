---
description: Pre-flight checklist that MUST be followed before any UI work - enforces workflow compliance
---

# UI Pre-Flight Checklist

> **MANDATORY**: This checklist MUST be completed before writing any UI code. Skip = rejection.
>
> **ALSO READ**: `.agent/workflows/ui-code-contracts.md` — the authoritative contract for patterns, token mapping, and approved code recipes.

---

## Phase 1: Context Gathering

- [ ] Read the wireframe JSX in `ui_kits/extension/v2/` for this component
- [ ] Check existing primitives in `src/ui-system/components/primitives/`
- [ ] Identify which V2 tokens apply (surface: `--paper`/`--paper-2`; text: `--ink`/`--ink-2..4`; border: `--rule`/`--rule-soft`; accent: `--accent`)
- [ ] Confirm popup vs. web context (popup = body-only, PopupShell owns chrome)

## Phase 2: Token Constraints

- [ ] All colors use ONLY V2 tokens from `ui_kits/extension/v2/tokens.css`
- [ ] No hardcoded hex values (e.g. `#FF0000`, `#fff`, `rgba(0,0,0,0.5)`)
- [ ] No legacy MD3 tokens (`--md-sys-color-*`, `bg-primary`, `text-on-surface`)
- [ ] No Ink & Glass tokens (`--ink-1..4`, `--ink-focus`, `--ink-neural`, `--ink-mode`, `--ink-ease-*`)
- [ ] No Style C aliases (`var(--bg)`, `var(--text-primary)`, `var(--border)`, `var(--shadow-hover)`)
- [ ] No Tailwind utility classes (Tailwind removed — use inline styles or CSS classes with V2 vars)
- [ ] Typography: use `var(--step-*)` scale and `var(--serif)` / `var(--sans)` / `var(--mono)` families
- [ ] Display headings: use `u-serif` class (Instrument Serif italic)
- [ ] Section labels: use `u-kicker` class (mono caps, letter-spaced)
- [ ] Borders: `var(--rule)` or `var(--rule-soft)` — never `border-outline-variant` or raw rgba
- [ ] Shadows: use `border: 1px solid var(--rule-soft)` — V2 uses borders, not box-shadow
- [ ] Touch targets: minimum **44px** (`minHeight: '44px'`) on all interactive elements

### Project-Specific Banned Patterns (this codebase)

These are the ACTUAL patterns found in existing code that MUST NOT be copied:

```
BANNED — Legacy CSS vars in .tsx files:
- style={{ background: 'var(--bg)' }}           → style={{ background: 'var(--paper)' }}
- style={{ background: 'var(--bg-card)' }}      → style={{ background: 'var(--paper-2)' }}
- style={{ color: 'var(--text-primary)' }}      → style={{ color: 'var(--ink)' }}
- style={{ color: 'var(--text-secondary)' }}    → style={{ color: 'var(--ink-2)' }}
- style={{ color: 'var(--text-tertiary)' }}     → style={{ color: 'var(--ink-3)' }}
- style={{ color: 'var(--accent)' }}            → style={{ color: 'var(--accent)' }}  ✓ (--accent exists in V2)
- style={{ border: '1px solid var(--border)' }} → style={{ border: '1px solid var(--rule)' }}
- style={{ boxShadow: 'var(--shadow-hover)' }}  → remove; use border instead
- style={{ boxShadow: 'var(--shadow-rest)' }}   → remove; use border instead
- var(--md-sys-color-primary)                   → var(--accent)
- var(--md-sys-color-surface)                   → var(--paper)
- var(--md-sys-color-on-surface)                → var(--ink)
- var(--ink-neural), var(--ink-memory)          → var(--accent)
- var(--ink-ease-spring)                        → standard CSS ease

BANNED — JS event handlers for visual state:
- onMouseEnter={e => { e.currentTarget.style.* }}   → CSS :hover pseudo-class
- onMouseLeave={e => { e.currentTarget.style.* }}   → remove entirely

BANNED — Hardcoded font sizes:
- text-[22px], text-[16px], text-[13px], etc.  → var(--step-3), var(--step-1), var(--step-0)

BANNED — Arbitrary Tailwind utilities:
- duration-[180ms], duration-[280ms]            → CSS transition shorthand
- rounded-[8px], rounded-[10px]                 → var(--radius) (2px only)
- h-7, h-8, h-9, h-10 on interactive elements  → minHeight: '44px'

BANNED — Legacy font families:
- font-display, font-serif (Tailwind)           → var(--serif) via u-serif class
- font-mono (Tailwind)                          → var(--mono) via u-mono class

BANNED — Storybook:
- .stories.tsx files                            → Storybook removed in Layer 8
```

## Phase 3: Verification

- [ ] Component renders correctly (light mode is the only required mode for V2)
- [ ] Focus ring is visible (keyboard navigation)
- [ ] No MD3/Ink/Style C vars remain in the file

## Phase 4: Self-Verification (Run These Commands)

Before submitting any UI code, run ALL of the following. Commands 1–4 MUST return zero matches:

```bash
# 1. No legacy MD3/Ink/Style C vars (MUST BE ZERO)
grep -rn "var(--md-sys-\|var(--ink-[0-9]\|var(--bg\|var(--text-\|var(--border\b\|var(--shadow-\|var(--elevation\|var(--logo-\|var(--radius-" src/ --include="*.tsx"

# 2. No hardcoded hex colors (MUST BE ZERO)
grep -rn '#[0-9a-fA-F]\{3,8\}\b' src/ --include="*.tsx"

# 3. No JS DOM mutation for visual state (MUST BE ZERO)
grep -rn "onMouseEnter\|onMouseLeave" src/ --include="*.tsx"

# 4. No arbitrary duration Tailwind classes (MUST BE ZERO)
grep -rn 'duration-\[[0-9]*ms\]' src/ --include="*.tsx"

# 5. Check touch targets on interactive elements (review any <44px hits)
grep -rn '\bh-7\b\|\bh-8\b\|\bh-9\b\|\bh-10\b' src/ --include="*.tsx"
```

If any of commands 1–4 return results, fix them before proceeding.

---

## Enforcement

If an agent produces code with ANY of the following, the code must be rejected:

```
REJECTED PATTERNS:
- var(--md-sys-color-*)                → Use var(--paper), var(--ink), var(--accent)
- var(--ink-1) .. var(--ink-4)         → Use var(--paper-2), var(--ink)
- var(--bg), var(--text-primary)       → V2 aliases only
- bg-primary, text-on-surface          → MD3 Tailwind classes removed
- bg-blue-500, bg-gray-*               → No bare Tailwind colors
- shadow-sm, shadow-md, shadow-lg      → Use border: 1px solid var(--rule-soft)
- shadow-elevation-1..5                → MD3 elevation removed from V2
- #ffffff, #000000 in TSX              → Use var(--paper), var(--ink)
- dark:bg-*, dark:text-*               → V2 is light-only by default
- .stories.tsx                         → Storybook removed
- SocialButton, SocialAuthButton       → Deleted in Layer 3
- Inter, Roboto font declarations      → Use var(--serif), var(--sans)
```
