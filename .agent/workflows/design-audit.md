---
description: Audit existing components for V2 Editorial design system compliance and fix inconsistencies
---

# Design System Audit Workflow

Use this workflow to audit existing UI components for V2 Editorial compliance and fix issues.

## Step 1: Identify Audit Targets
// turbo
Run the legacy-DS harness first:

```bash
# Full harness — reports violations by category
bash scripts/check-legacy-ds.sh

# Quick targeted sweeps:

# V2 violation 1 — legacy MD3/Ink/Style C vars
grep -rn "var(--md-sys-\|var(--ink-[0-9]\|var(--bg\|var(--text-primary\|var(--text-secondary\|var(--border\b\|var(--shadow-\|var(--elevation\|var(--logo-" \
  src/ --include="*.tsx"

# V2 violation 2 — hardcoded hex colors
grep -rn '#[0-9a-fA-F]\{3,8\}\b' src/ --include="*.tsx"

# V2 violation 3 — arbitrary Tailwind duration classes
grep -rn 'duration-\[[0-9]*ms\]' src/ --include="*.tsx"

# V2 violation 4 — arbitrary rounded classes
grep -rn 'rounded-\[[0-9]*px\]' src/ --include="*.tsx"

# V2 violation 5 — undersized touch targets on interactive elements
grep -rn '\bh-7\b\|\bh-8\b\|\bh-9\b\|\bh-10\b' src/ --include="*.tsx"

# V2 violation 6 — emoji in source
grep -rPn '[\x{1F300}-\x{1F9FF}\x{1F600}-\x{1F64F}\x{1F680}-\x{1F6FF}\x{2600}-\x{26FF}]' src/ --include="*.tsx" --include="*.ts"
```

## Step 2: Component-by-Component Audit

For each component, check:

### 2.1 Color Compliance (V2 Editorial)
| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| All colors from V2 tokens (`--paper`, `--ink`, `--accent`, `--rule`)? | | |
| No hardcoded hex values? | | |
| No MD3 tokens (`--md-sys-color-*`)? | | |
| No Ink & Glass tokens (`--ink-1..4`, `--ink-focus`, `--ink-neural`)? | | |
| No Style C aliases (`--bg`, `--text-primary`, `--border`, `--shadow-hover`)? | | |

### 2.2 Interactive States
| State | Implemented? | Fix |
|-------|--------------|-----|
| Hover — CSS only (no onMouseEnter) | | |
| Focus-visible ring | | |
| Disabled (opacity: 0.4, pointer-events: none) | | |
| Touch target ≥ 44px | | |

### 2.3 Typography (V2 scale)
| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| Using `var(--step-*)` scale? | | |
| Display headings use `u-serif` class + `var(--serif)`? | | |
| Section labels use `u-kicker` class? | | |
| No arbitrary `text-[Npx]` classes? | | |

### 2.4 Spacing & Layout
| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| Borders use `var(--rule)` or `var(--rule-soft)`? | | |
| No `shadow-elevation-*` classes? | | |
| No `boxShadow` inline styles? | | |
| `var(--radius)` for border-radius (2px)? | | |

### 2.5 Motion
| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| No `duration-[XXXms]` Tailwind classes? | | |
| No `var(--ink-ease-spring)`? | | |
| Animations defined in `global.css` keyframes? | | |

### 2.6 Accessibility
| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| All interactive elements ≥ 44px touch target? | | |
| ARIA labels on icon-only buttons? | | |
| Keyboard navigable? | | |
| Focus order logical? | | |

## Step 3: Prioritize Fixes

1. **Critical** (fix immediately):
   - Accessibility failures (missing focus states, undersized targets)
   - Hardcoded hex colors breaking theme

2. **High** (fix in current layer):
   - Legacy MD3/Ink/Style C CSS variables
   - Arbitrary font sizes and durations

3. **Medium** (fix when touching file):
   - Motion improvements
   - Minor spacing adjustments

## Step 4: Apply Fixes
// turbo
For each fix:
1. Update the component to use V2 tokens
2. Run build: `npm run build`
3. Run type check: `npm run type-check`
4. Commit with descriptive message: `refactor(ui-system): migrate {Component} to V2 tokens`

## Step 5: Document Findings

Create audit report in `docs/ui-audit-[date].md`:

```markdown
# UI Audit Report - [Date]

## Summary
- Components audited: X
- Issues found: Y
- Issues fixed: Z

## By Component
### [ComponentName]
- Issues: ...
- Fixes applied: ...
- Remaining: ...
```

## Quick Audit Command (V2)
// turbo
Run this to get a quick V2 health check:

```bash
# Full harness — all 11 categories
bash scripts/check-legacy-ds.sh

# Targeted: legacy vars remaining
grep -rn "var(--md-sys-\|var(--ink-[0-9]\|var(--bg\b\|var(--text-primary\|var(--border\b\|var(--shadow-rest\|var(--shadow-hover" \
  src/ --include="*.tsx" | wc -l

# Targeted: hex colors remaining
grep -rn '#[0-9a-fA-F]\{3,8\}\b' src/ --include="*.tsx" | wc -l
```

## V2 Source of Truth

- Token definitions: `ui_kits/extension/v2/tokens.css`
- Wireframes: `ui_kits/extension/v2/*.jsx`
- Global CSS: `src/ui-system/theme/global.css`
