---
description: How to write effective prompts for AI to generate high-quality Material Design 3 UI without "slop"
---

# UI Prompting Anti-Slop Guide

## The Slop Problem
"Slop" happens when AI:
1. Uses generic/arbitrary colors instead of design tokens
2. Ignores interactive states (hover, focus, pressed)
3. Skips accessibility
4. Doesn't close the loop (no verification, no Storybook, no testing)
5. Generates "looks okay" rather than "matches spec"

---

## Prompt Template for New Components

```
Create an MD3 [ComponentName] component.

## Constraints
- MUST use existing design tokens from tailwind.config.ts
- MUST implement all MD3 states: enabled, hover, focus, pressed, disabled
- MUST use state-layer pattern (::before pseudo-element with opacity)
- MUST meet 4.5:1 contrast ratio and 48dp touch targets
- MUST work in both light and dark themes

## Research First
Search for "Material Design 3 [ComponentName] specification" and extract:
- Anatomy and slots
- Color token mappings
- Dimensions and spacing
- State transitions

## Deliverables
1. Component implementation
2. Storybook story with all variants
3. Visual diff test (if using Playwright)
4. Document any missing tokens that need to be added

## Verification
After implementation, visually compare against the MD3 spec and confirm:
- [ ] All states render correctly
- [ ] Colors match token definitions
- [ ] Typography uses correct scale tokens
- [ ] Animation uses MD3 motion curves (emphasized: 400ms, standard: 300ms)
```

---

## Prompt Template for Fixing "Sloppy" UI

```
The current [ComponentName] looks bland/inconsistent. Audit and fix it.

## Audit Checklist
1. **Color Audit**: Are ALL colors from the design token system? Flag any hex codes.
2. **State Audit**: Does it have hover, focus, pressed, disabled states?
3. **Spacing Audit**: Are margins/padding from the spacing scale?
4. **Typography Audit**: Are font sizes from the type scale?
5. **Elevation Audit**: Is shadow using MD3 elevation tokens?
6. **Motion Audit**: Are transitions using proper easing and duration?

## Fix Priority
1. Fix any hardcoded colors → map to tokens
2. Add missing interactive states
3. Fix inconsistent spacing
4. Add focus-visible outlines
5. Verify dark mode

## Output
- List all issues found
- Fix each issue with specific token references
- Re-render and compare before/after
```

---

## Key Phrases to Include in Any UI Prompt

**Force Research:**
> "Before implementing, search for the MD3 specification for this component"

**Force Token Usage:**
> "All colors MUST come from the existing design token system. No arbitrary hex codes."

**Force States:**
> "Implement all interactive states: hover (8% state layer), focus-visible (12% + outline), pressed (12%)"

**Force Verification:**
> "After implementation, verify by rendering in Storybook and comparing against the MD3 spec"

**Force Accessibility:**
> "Ensure 4.5:1 contrast, 48dp touch targets, visible focus indicators, and keyboard navigation"

**Force Closure:**
> "The task is NOT complete until the component has been visually verified in isolation"

---

## Example: Good vs Bad Prompt

### ❌ Bad (Slop-Inducing)
> "Create a button component that looks nice"

### ✅ Good (Precise)
> "Create an MD3 FilledButton component.
> 
> First, research the MD3 button specification for:
> - Container height (40dp)
> - Horizontal padding (24dp)
> - Corner radius (20dp/full)
> - Color: primary container, text: on-primary
> 
> Use existing tokens from tailwind.config.ts.
> Implement state layer pattern for hover/focus/pressed.
> Add to Storybook with stories for: default, disabled, with-icon.
> Run visual regression test to verify."

---

## The Verification Loop (Critical!)

Never let AI "finish" without closing the loop:

1. **Implementation** → Component code
2. **Isolation** → Storybook story
3. **Visual Check** → Screenshot or Playwright test
4. **Comparison** → Match against MD3 spec image
5. **Iteration** → Fix discrepancies
6. **Documentation** → Update component docs

If the AI stops at step 1, it's incomplete. Always push for steps 2-6.
