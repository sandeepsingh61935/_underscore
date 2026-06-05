---
description: How to write effective prompts for AI to generate high-quality V2 Editorial UI without "slop"
---

# UI Prompting Anti-Slop Guide

## The Slop Problem

"Slop" happens when AI:
1. Uses generic/arbitrary colors instead of V2 tokens
2. Reintroduces MD3/Tailwind/Ink & Glass patterns that have been purged
3. Ignores interactive states (hover, focus, pressed)
4. Skips accessibility (44px targets, focus rings)
5. Generates "looks okay" rather than "matches the wireframe"

---

## Prompt Template for New Components

```
Create a V2 Editorial [ComponentName] component.

## Constraints
- MUST match the wireframe JSX in `ui_kits/extension/v2/` exactly
- MUST use V2 CSS custom properties: var(--paper), var(--ink), var(--accent), var(--rule), var(--step-*), var(--radius)
- MUST NOT use: MD3 tokens (--md-sys-*), Ink & Glass vars (--ink-1..4), Style C aliases (--bg, --text-primary), Tailwind utilities, hardcoded hex colors
- MUST meet 44px minimum touch targets (V2 spec rule 7)
- Popup views MUST be body-only — never import PopupShell, ModeHeader, or TabBar

## Reference First
Read the wireframe in `ui_kits/extension/v2/` for this component:
- Visual structure and layout
- Token usage (look at style={{ }} attributes in the JSX)
- Semantic typography classes used (u-serif, u-kicker, u-mono)

## Deliverables
1. Component implementation (no Storybook — removed from project)
2. Build verification: npm run build
3. Type check: npm run type-check

## Verification
After implementation, run:
grep -rn "var(--md-sys-\|var(--ink-[0-9]\|var(--bg\|var(--text-primary\|var(--border\b\|var(--shadow-" src/ --include="*.tsx"
# Must return zero results for the new file
```

---

## Prompt Template for Fixing "Sloppy" UI

```
The current [ComponentName] has legacy tokens. Migrate it to V2 Editorial.

## Audit Checklist
1. **Token Audit**: Flag any var(--md-sys-*), var(--ink-*), var(--bg), var(--text-primary), var(--border), var(--shadow-*)
2. **Hex Audit**: Flag any hardcoded #hex colors
3. **Duration Audit**: Flag any duration-[XXXms] Tailwind classes
4. **Touch Target Audit**: Flag any h-7/h-8/h-9/h-10 on interactive elements
5. **Typography Audit**: Flag any text-[Npx] arbitrary font sizes

## Fix Priority
1. Replace legacy vars with V2 equivalents (see v2-tokens-reference.md)
2. Replace hardcoded hex with var(--accent), var(--ink), var(--paper)
3. Remove arbitrary duration classes — use CSS transition
4. Ensure all interactive elements have minHeight: '44px'
5. Replace box-shadow with border: 1px solid var(--rule-soft)

## Output
- List all legacy patterns found
- Fix each with specific V2 token references
- Run build to confirm no type errors
```

---

## Key Phrases to Include in Any UI Prompt

**Force Wireframe Reference:**
> "Before implementing, read the wireframe JSX in `ui_kits/extension/v2/` for this component"

**Force V2 Token Usage:**
> "All colors MUST come from V2 tokens: var(--paper), var(--ink), var(--accent), var(--rule). No MD3 tokens. No Tailwind utilities. No hardcoded hex."

**Force Touch Targets:**
> "All interactive elements MUST have minHeight: '44px' per V2 spec rule 7"

**Force No Storybook:**
> "Do NOT create a .stories.tsx file — Storybook has been removed from this project"

**Force Verification:**
> "After implementation, run: grep -rn 'var(--md-sys-\|var(--ink-[0-9]' src/ --include='*.tsx' — must return zero results for this file"

**Force Closure:**
> "The task is NOT complete until npm run build passes"

---

## Example: Good vs Bad Prompt

### Bad (Slop-Inducing)
> "Create a button component that looks nice"

### Bad (Reintroduces Legacy Patterns)
> "Create an MD3 FilledButton using bg-primary and shadow-elevation-1"

### Good (V2 Editorial)
> "Create a V2 Editorial Button component.
>
> First, read `ui_kits/extension/v2/primitives.jsx` for the Button wireframe.
>
> Use these V2 tokens exactly:
> - background: var(--accent)
> - color: var(--accent-ink)
> - border-radius: var(--radius)
> - min-height: 44px
> - font-size: var(--step-0), font-family: var(--sans)
>
> No Tailwind utilities. No MD3 tokens. No hardcoded colors.
> After implementation, confirm with: npm run build"

---

## The Verification Loop (Critical!)

Never let AI "finish" without closing the loop:

1. **Implementation** → Component code
2. **Token Check** → Zero legacy vars in the new file
3. **Build** → `npm run build` passes
4. **Type Check** → `npm run type-check` passes
5. **Commit** → `refactor(ui-system): migrate {Component} to V2 tokens`

If the AI stops at step 1, it's incomplete. Always push for steps 2–5.
