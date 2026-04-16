# Design System Remediation Plan

**Goal**: Fix 125+ design system inconsistencies found in audit  
**Date**: 2026-04-07  
**Base branch**: dev (clean, 9 commits ahead of origin)  
**Scope**: 40+ files across 5 phases

---

## Phase 1: Critical Token Replacement (P0)

**Problem**: shadcn/ui tokens (`bg-card`, `border-border`, `text-muted-foreground`, etc.) are not defined in tailwind.config.ts, causing components to silently break.

**Files affected**: 15 files

### Phase 1 Tasks

- [ ] **P1.1**: Fix CSS typo in global.css
  - File: `src/ui-system/theme/global.css`
  - Lines: 79, 255
  - Change: `#debe0` → `#debef0`
  - Verify: Browser renders yellow color correctly

- [ ] **P1.2**: Replace shadcn tokens in AlertDialog
  - File: `src/ui-system/components/primitives/AlertDialog.tsx`
  - Changes:
    - `bg-black/80` → `bg-scrim/70`
    - `bg-background` → `bg-surface`
    - `text-muted-foreground` → `text-on-surface-variant`
    - `text-primary-foreground` → `text-on-primary`
    - `bg-ring` → `ring-primary`
    - `bg-input` → `border-outline`
    - `hover:bg-accent` → `hover:bg-secondary-container`
    - `text-accent-foreground` → `text-on-secondary-container`
    - `border-input` → `border-outline`

- [ ] **P1.3**: Replace shadcn tokens in DropdownMenu
  - File: `src/ui-system/components/primitives/DropdownMenu.tsx`
  - Changes:
    - `bg-accent` → `bg-secondary-container`
    - `text-accent-foreground` → `text-on-secondary-container`
    - `bg-popover` → `bg-surface-container`
    - `text-popover-foreground` → `text-on-surface`
    - `shadow-lg` → `shadow-elevation-3`
    - `shadow-md` → `shadow-elevation-2`
    - `bg-muted` → `bg-outline-variant`

- [ ] **P1.4**: Replace shadcn tokens in CollectionCard (ui-system)
  - File: `src/ui-system/components/composed/CollectionCard.tsx`
  - Changes:
    - `bg-card` → `bg-surface-container`
    - `border-border` → `border-outline-variant`
    - `text-muted-foreground` → `text-on-surface-variant`
    - `text-foreground` → `text-on-surface`
    - `bg-secondary` → `bg-secondary-container`
    - `hover:shadow-md` → `hover:shadow-elevation-2`
    - `border-border/50` → `border-outline-variant/50`

- [ ] **P1.5**: Replace shadcn tokens in HighlightCard
  - File: `src/ui-system/components/composed/HighlightCard.tsx`
  - Same changes as P1.4

- [ ] **P1.6**: Replace shadcn tokens in EmptyState
  - File: `src/ui-system/components/composed/EmptyState.tsx`
  - Changes:
    - `text-muted-foreground` → `text-on-surface-variant`
    - `text-foreground` → `text-on-surface`
    - `bg-secondary` → `bg-secondary-container`
    - `text-primary-foreground` → `text-on-primary`

- [ ] **P1.7**: Replace shadcn tokens in UserMenu
  - File: `src/ui-system/components/composed/UserMenu.tsx`
  - Same changes as P1.6

- [ ] **P1.8**: Replace shadcn tokens in Skeleton
  - File: `src/ui-system/components/primitives/Skeleton.tsx`
  - Changes:
    - `bg-card` → `bg-surface-container`
    - `border-border` → `border-outline-variant`

- [ ] **P1.9**: Replace shadcn tokens in CollectionsView page
  - File: `src/ui-system/pages/CollectionsView.tsx`
  - Changes:
    - `text-muted-foreground` → (6 instances) `text-on-surface-variant`
    - `border-border` → `border-outline-variant`
    - `bg-secondary/50` → `bg-secondary-container/50`
    - `text-primary-foreground` → `text-on-primary`

- [ ] **P1.10**: Replace shadcn tokens in ModeSelectionView page
  - File: `src/ui-system/pages/ModeSelectionView.tsx`
  - Changes:
    - `text-muted-foreground` → `text-on-surface-variant`

- [ ] **P1.11**: Replace shadcn tokens in DomainDetailsView page
  - File: `src/ui-system/pages/DomainDetailsView.tsx`
  - Changes:
    - `border-border` → `border-outline-variant`
    - `text-muted-foreground` → `text-on-surface-variant`
    - `bg-secondary` → `bg-secondary-container`
    - `text-foreground` → `text-on-surface`

- [ ] **P1.12**: Fix Header component tokens (deprecated but still used)
  - File: `src/ui-system/components/layout/Header.tsx`
  - Changes:
    - `border-border/60` → `border-outline-variant/60`
    - `bg-card` → `bg-surface-container`
    - `text-foreground` → `text-on-surface`
    - `text-muted-foreground` → `text-on-surface-variant`
    - `bg-border` → `border-outline-variant`
    - `border-border` → `border-outline-variant`
    - `text-primary-foreground` → `text-on-primary`

- [ ] **P1.13**: Replace shadcn tokens in AccountMenu
  - File: `src/ui-system/components/AccountMenu.tsx`
  - Changes:
    - `bg-black/10` → `bg-scrim/10`
    - `dark:bg-black/30` → `dark:bg-scrim/30`
    - `text-foreground` → `text-on-surface`
    - `border-border` → `border-outline-variant`
    - `text-muted-foreground` → `text-on-surface-variant`
    - `text-primary-foreground` → `text-on-primary`
    - Remove `-light` and `-dark` suffixed references

- **P1.14**: Replace shadcn tokens in Toast
  - File: `src/ui-system/components/composed/Toast.tsx`
  - Changes:
    - `text-foreground` → `text-on-surface`
    - `border-input` → `border-outline`
    - Hardcoded variant colors → MD3 semantic tokens (see Phase 2)

**Phase 1 verification**:
```bash
npx eslint src/ --no-eslintrc --parser @typescript-eslint/parser --rule '{"no-restricted-syntax": ["error", { "selector": "Literal[value=/^(bg|text|border)-(card|background|foreground|muted-foreground|primary-foreground|accent|ring|input|popover|secondary)$/]"}]}'
grep -r "text-muted-foreground\|bg-card\|border-border\|bg-background\|text-foreground" src/ --include="*.tsx" | wc -l
# Should output 0
```

---

## Phase 2: Hardcoded Colors (P0)

**Problem**: Components use hardcoded hex colors and Tailwind color names instead of semantic tokens, breaking light/dark mode.

### Phase 2 Tasks

- [ ] **P2.1**: Fix Toast variant colors
  - File: `src/ui-system/components/composed/Toast.tsx`
  - Lines: 128-146
  - Replace:
    - Success: `border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950` → `border-success-container bg-success-container`
    - Error: `border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950` → `border-error-container bg-error-container`
    - Warning: `border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950` → `border-tertiary-container bg-tertiary-container`
    - Info: `border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950` → `border-primary-container bg-primary-container`

- [ ] **P2.2**: Fix AccountMenu delete action color
  - File: `src/ui-system/components/AccountMenu.tsx`
  - Line: 135
  - Replace: `text-red-500 hover:bg-red-500/8` → `text-error hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-error)_8%,transparent)]`

- [ ] **P2.3**: Fix ProviderButton hover colors
  - File: `src/ui-system/components/composed/ProviderButton.tsx`
  - Lines: 18, 23, 28, 33, 38
  - Replace hardcoded provider colors with semantic tokens

- [ ] **P2.4**: Fix HighlightCard colorMap
  - File: `src/ui-system/components/composed/HighlightCard.tsx`
  - Lines: 26-33
  - Replace Tailwind border colors with MD3 color roles

- [ ] **P2.5**: Fix Logo inline shadow styles
  - File: `src/ui-system/components/primitives/Logo.tsx`
  - Lines: 47-48
  - Replace hardcoded `rgba()` shadows with CSS variables

- [ ] **P2.6**: Fix SocialButton border-radius
  - File: `src/ui-system/components/primitives/SocialButton.tsx`
  - Line: 39
  - Replace: `rounded-md` → `rounded-full`

- [ ] **P2.7**: Fix AuthView hardcoded hover shadow
  - File: `src/entrypoints/popup/views/AuthView.tsx`
  - Lines: 165-166
  - Replace hardcoded shadow with semantic token

- [ ] **P2.8**: Fix ModeSelectionView hardcoded text color
  - File: `src/features/modes/ModeSelectionView.tsx`
  - Line: 192
  - Replace: `text-white` → `text-on-primary`

**Phase 2 verification**:
```bash
grep -rE "(text|bg|border)-(red|green|blue|yellow|orange)-(50|200|500|800|950)" src/ --include="*.tsx" | wc -l
# Should output 0 (or only legitimate brand usage)
```

---

## Phase 3: Motion Standardization (P1)

**Problem**: Components use arbitrary duration values that conflict with MD3 motion tokens.

### Phase 3 Tasks

- [ ] **P3.1**: Fix Button motion duration
  - File: `src/ui-system/components/primitives/Button.tsx`
  - Line: 43
  - Replace: `duration-[220ms]` → `duration-short`

- [ ] **P3.2**: Fix Card motion duration
  - File: `src/ui-system/components/primitives/Card.tsx`
  - Line: 23
  - Replace: `duration-[280ms]` → `duration-medium`

- [ ] **P3.3**: Fix SocialAuthButton motion duration
  - File: `src/ui-system/components/composed/SocialAuthButton.tsx`
  - Line: 66
  - Replace: `duration-[220ms]` → `duration-short`

- [ ] **P3.4**: Fix ModeCard motion duration
  - File: `src/features/modes/ModeCard.tsx`
  - Line: 50
  - Replace: `duration-[280ms]` → `duration-medium`

- [ ] **P3.5**: Fix SettingsPage motion durations
  - File: `src/pages/SettingsPage.tsx`
  - Lines: 55, 63, 78, 84, 90, 239, 241
  - Replace: `duration-[180ms]` → `duration-short`

- [ ] **P3.6**: Fix ModeSelectionView motion duration
  - File: `src/features/modes/ModeSelectionView.tsx`
  - Line: 148
  - Replace: `duration-[200ms]` → `duration-short`

- [ ] **P3.7**: Fix Header/AppHeader motion durations
  - File: `src/ui-system/components/layout/Header.tsx`
  - Line: 173
  - Replace: `duration-[180ms]` → `duration-short`

  - File: `src/ui-system/components/layout/AppHeader.tsx`
  - Line: 173
  - Replace: `duration-[180ms]` → `duration-short`

**Phase 3 verification**:
```bash
grep -rE "duration-\[([0-9]+)ms\]" src/ --include="*.tsx" | wc -l
# Should output 0
```

---

## Phase 4: Accessibility Fixes (P1)

**Problem**: Missing ARIA attributes, keyboard accessibility, emoji usage, touch target sizes.

### Phase 4 Tasks

- [ ] **P4.1**: Remove emoji usage
  - Files: `src/ui-system/components/layout/Header.tsx`, `src/ui-system/components/composed/UserMenu.tsx`
  - Replace: `✓` → `<Check size={16}>`, `🔒` → `<Lock size={16}>`
  - Import: `import { Check, Lock } from 'lucide-react';`

- [ ] **P4.2**: Fix CollectionCard keyboard accessibility
  - File: `src/features/collections/components/CollectionCard.tsx`
  - Line: 25
  - Replace: `<div onClick>` → `<button>`
  - Add: proper role, tabIndex, keyboard handler

- [ ] **P4.3**: Add Input ARIA attributes
  - File: `src/ui-system/components/primitives/Input.tsx`
  - Add: `aria-describedby` linking to helper text
  - Add: `aria-invalid` on error state

- [ ] **P4.4**: Fix Dialog unique ID issue
  - File: `src/ui-system/components/primitives/Dialog.tsx`
  - Line: 80
  - Fix: Generate unique IDs per dialog instance instead of hardcoded `dialog-title`

- [ ] **P4.5**: Add SegmentedControl ARIA roles
  - File: `src/ui-system/components/primitives/SegmentedControl.tsx`
  - Add: `role="tablist"` on container
  - Add: `role="tab"` on buttons
  - Add: `aria-selected` on active tab

- [ ] **P4.6**: Fix SettingsPage touch targets
  - File: `src/pages/SettingsPage.tsx`
  - Lines: 55, 63
  - Replace: `min-h-[44px]` → `min-h-[48px]`

**Phase 4 verification**:
```bash
grep -rE "(✓|🔒|🎨|✨)" src/ --include="*.tsx" | wc -l
# Should output 0
grep -rE "<div onClick" src/ --include="*.tsx" | wc -l
# Should output 0 (or legitimate non-interactive cases)
grep -rE "min-h-\[4[0-7]px\]" src/ --include="*.tsx" | wc -l
# Should output 0
```

---

## Phase 5: Architectural Cleanup (P2)

**Problem**: Duplicate component files across ui-system/ and features/ folders with diverged implementations.

### Phase 5 Tasks

- [ ] **P5.1**: Audit ModeCard duplicates
  - Files: `src/ui-system/components/composed/ModeCard.tsx` vs `src/features/modes/ModeCard.tsx`
  - Decision: Keep ui-system version (has newer MD3 alignment)
  - Action: Update features version to import from ui-system

- [ ] **P5.2**: Audit ModeSelector duplicates
  - Same as P5.1

- [ ] **P5.3**: Audit ModeSelectionView duplicates
  - Same as P5.1

- [ ] **P5.4**: Audit CollectionCard duplicates
  - Same as P5.1

- [ ] **P5.5**: Audit CollectionsView duplicates
  - Same as P5.1

- [ ] **P5.6**: Audit DomainDetailsView duplicates
  - Same as P5.1

- [ ] **P5.7**: Audit SignInView duplicates
  - Same as P5.1

- [ ] **P5.8**: Audit UserMenu duplicates
  - Same as P5.1

- [ ] **P5.9**: Delete deprecated Header component
  - File: `src/ui-system/components/layout/Header.tsx`
  - Already marked `@deprecated`, safe to remove after all imports updated to use AppHeader

**Phase 5 verification**:
```bash
ls -la src/ui-system/components/composed/ src/features/modes/ src/features/collections/ src/features/auth/
# Verify single source of truth for each component
```

---

## Execution Strategy

1. **Create worktree**: `scripts/issue-start.sh 20` (design-system-remediation)
2. **Execute phases in order**: P1 → P2 → P3 → P4 → P5
3. **Commit per task**: Atomic commits following conventional format
4. **Verify per phase**: Run verification commands after each phase
5. **Final smoke test**: Browser test on `/settings`, `/mode`, `/collections`

## Expected Outcome

- 0 shadcn tokens remaining
- 0 hardcoded colors (except brand-specific cases)
- 0 non-MD3 motion durations
- Full keyboard accessibility
- Single source of truth for all components
- Clean ESLint output (0 warnings)
