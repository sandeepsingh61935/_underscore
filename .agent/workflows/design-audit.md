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

## Project-Specific Audit: Style C Hybrid Violations

Run this full health check for _underscore's known violation patterns:

```bash
echo "=== Style C Hybrid vars (MUST BE ZERO after migration) ===" && \
grep -rn "var(--bg\|var(--text-\|var(--accent\|var(--border\|var(--radius\|var(--shadow-rest\|var(--shadow-hover" \
  src/ --include="*.tsx" | grep -v "node_modules" | grep -v "global.css"

echo "=== Hardcoded pixel font sizes ===" && \
grep -rn 'text-\[[0-9]\+px\]' src/ --include="*.tsx"

echo "=== JS DOM mutation for visual state ===" && \
grep -rn "onMouseEnter\|onMouseLeave" src/ --include="*.tsx"

echo "=== Raw rounded-[var(--radius)] ===" && \
grep -rn "rounded-\[var(--" src/ --include="*.tsx"

echo "=== ESLint design system violations ===" && \
npx eslint src/ --rule '{}' 2>&1 | grep "no-restricted-syntax" | wc -l
```

## Files with Known Violations (as of audit 2026-03-08)

| File | Occurrences | Priority |
|---|---|---|
| `src/pages/SettingsPage.tsx` | 48 | High |
| `src/features/collections/views/DomainDetailsView.tsx` | 31 | High |
| `src/features/auth/SignInView.tsx` | 27 | High |
| `src/features/collections/views/CollectionsView.tsx` | 25 | High |
| `src/features/modes/ModeSelectionView.tsx` | 20 | High |
| `src/features/modes/ModeCard.tsx` | 11 | Medium |
| `src/entrypoints/popup/views/AuthView.tsx` | 16 | Medium |
| `src/pages/WelcomePage.tsx` | 13 | Medium |
| `src/pages/PrivacyPage.tsx` | 12 | Medium |
| `src/pages/NotFoundPage.tsx` | 4 | Low |
| `src/ui-system/components/primitives/SocialButton.tsx` | 4 | Low |
| `src/ui-system/components/primitives/Spinner.tsx` | 2 | Low |
| `src/ui-system/components/primitives/TrustSignal.tsx` | 1 | Low |
| `src/ui-system/components/primitives/Logo.tsx` | 1 | Low |

After fixing each file, re-run the audit commands above. Target: zero matches.
