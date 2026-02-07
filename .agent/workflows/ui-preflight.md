---
description: Pre-flight checklist that MUST be followed before any UI work - enforces workflow compliance
---

# UI Pre-Flight Checklist (MANDATORY)

> ⚠️ **STOP!** Before making ANY UI changes, complete this checklist.

## Trigger Conditions
This workflow is REQUIRED when:
- Creating a new component
- Modifying component styling
- Changing colors, typography, or spacing
- Adding interactive states
- Touching any file in `src/components/`, `src/views/`, or styles

---

## Phase 1: Context Gathering (BEFORE coding)

### 1.1 Understand the Design System
- [ ] View `tailwind.config.ts` to understand available tokens
- [ ] Check existing similar components for patterns
- [ ] Identify the MD3 component spec (search if needed)

### 1.2 Document Token Mapping
Before writing any code, explicitly list:
```
Colors I will use:
- Background: surface / surface-variant / primary-container
- Text: on-surface / on-primary-container
- Border: outline / outline-variant

Typography:
- Heading: title-medium / headline-small
- Body: body-medium / body-small
- Label: label-large

Spacing:
- Padding: 16dp (p-4) / 24dp (p-6)
- Gap: 8dp (gap-2) / 16dp (gap-4)
```

### 1.3 Confirm All States
List the states this component needs:
- [ ] Default/enabled
- [ ] Hover
- [ ] Focus-visible
- [ ] Pressed/active
- [ ] Disabled
- [ ] Selected (if applicable)
- [ ] Error (if applicable)

---

## Phase 2: Implementation Constraints

### MUST DO
✅ Use design tokens from config (no hardcoded values)
✅ Implement state layer pattern for interactive states
✅ Add focus-visible outline (2dp, outline color)
✅ Ensure 48dp minimum touch targets
✅ Support both light and dark themes
✅ Use semantic HTML elements
✅ Add ARIA attributes where needed

### MUST NOT DO
❌ Use arbitrary hex colors (#3B82F6)
❌ Use arbitrary pixel values (p-[13px])
❌ Skip hover/focus states
❌ Forget disabled state styling
❌ Ignore keyboard navigation
❌ Use !important

---

## Phase 3: Verification (BEFORE completing)

### 3.1 Visual Check
- [ ] Component rendered in Storybook
- [ ] All variants/states visible
- [ ] Matches MD3 spec appearance

### 3.2 Interaction Check
- [ ] Hover state works
- [ ] Focus ring visible on keyboard tab
- [ ] Click/press provides feedback
- [ ] Disabled state prevents interaction

### 3.3 Theme Check
- [ ] Light mode looks correct
- [ ] Dark mode looks correct
- [ ] Colors adapt properly

### 3.4 Accessibility Check
- [ ] Can navigate with keyboard only
- [ ] Focus order is logical
- [ ] Screen reader announces correctly

---

## Enforcement

When I (the AI) am about to work on UI, I will:

1. **Announce**: "Starting UI work on [component]. Running pre-flight checklist."
2. **Gather context**: Review design system and existing patterns
3. **Document**: State the token mapping before coding
4. **Implement**: Follow constraints strictly
5. **Verify**: Complete all verification checks
6. **Report**: Summarize what was done and any issues found

If I skip any of these steps, the USER should call me out on it.

---

## Quick Reference Commands

```bash
# View design tokens
cat tailwind.config.ts | grep -A 50 "colors:"

# Check existing component patterns
ls src/components/

# Run Storybook for verification (port 6006)
npm run storybook

# Run visual regression tests
npm run test:visual

# Update visual snapshots after intentional changes
npm run test:visual:update

# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

---

## Verification Workflow Summary

| Step | Command | Purpose |
|------|---------|---------|
| 1. Develop | `npm run dev:web` | Live development |
| 2. Storybook | `npm run storybook` | Visual component isolation |
| 3. Visual tests | `npm run test:visual` | Catch regressions |
| 4. Unit tests | `npm run test` | Logic verification |
| 5. Full quality | `npm run quality` | Type-check + lint + test |
