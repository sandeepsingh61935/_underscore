---
description: Audit existing components for Material Design 3 compliance and fix inconsistencies
---

# Design System Audit Workflow

Use this workflow to audit existing UI components for MD3 compliance and fix issues.

## Step 1: Identify Audit Targets
// turbo
Run a grep to find potential issues:

```bash
# Find hardcoded colors (hex codes not in tokens)
grep -rn "#[0-9a-fA-F]\{3,6\}" --include="*.tsx" --include="*.css" src/

# Find arbitrary Tailwind colors
grep -rn "bg-\(blue\|red\|green\|gray\)-" --include="*.tsx" src/

# Find missing hover states
grep -rL "hover:" --include="*.tsx" src/components/
```

## Step 2: Component-by-Component Audit

For each component, check:

### 2.1 Color Compliance
| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| All colors from design tokens? | | |
| No hardcoded hex values? | | |
| Dark mode variants exist? | | |

### 2.2 Interactive States
| State | Implemented? | Fix |
|-------|--------------|-----|
| Hover (8% state layer) | | |
| Focus-visible (12% + outline) | | |
| Pressed (12% state layer) | | |
| Disabled (38% opacity) | | |

### 2.3 Typography
| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| Using type scale tokens? | | |
| Line height correct? | | |
| Font weight correct? | | |

### 2.4 Spacing & Layout
| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| Padding from spacing scale? | | |
| Margins from spacing scale? | | |
| Touch targets ≥ 48dp? | | |

### 2.5 Motion
| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| Transitions use duration tokens? | | |
| Easing curves correct? | | |
| No jarring animations? | | |

### 2.6 Accessibility
| Check | Pass/Fail | Fix |
|-------|-----------|-----|
| Contrast ratio ≥ 4.5:1? | | |
| ARIA labels present? | | |
| Keyboard navigable? | | |
| Focus order logical? | | |

## Step 3: Prioritize Fixes

1. **Critical** (fix immediately):
   - Accessibility failures
   - Missing focus states
   - Hardcoded colors breaking dark mode

2. **High** (fix soon):
   - Missing hover/pressed states
   - Inconsistent spacing
   - Non-token typography

3. **Medium** (fix when touching file):
   - Motion improvements
   - Minor spacing adjustments

## Step 4: Apply Fixes
// turbo
For each fix:
1. Update the component
2. Update/add Storybook story (visual tests screenshot these)
3. Run visual tests: `npm run test:visual`
4. Run unit tests: `npm run test`
5. Commit with descriptive message

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

## Quick Audit Command
// turbo
Run this to get a quick health check:

```bash
# Count potential issues
echo "=== Hardcoded colors ===" && grep -rc "#[0-9a-fA-F]\{6\}" --include="*.tsx" src/components/ | grep -v ":0$"
echo "=== Missing hover ===" && grep -rL "hover:" --include="*.tsx" src/components/
echo "=== Arbitrary spacing ===" && grep -rn "p-\[" --include="*.tsx" src/components/ | head -20
```
