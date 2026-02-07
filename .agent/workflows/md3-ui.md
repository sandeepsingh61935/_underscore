---
description: How to create Material Design 3 compliant UI components with proper design tokens, accessibility, and visual consistency
---

# Material Design 3 UI Development Workflow

## Pre-Requisites
Before creating any UI, the AI must verify:
1. The existing design token system in `tailwind.config.ts` or CSS variables
2. Existing component patterns in the codebase for consistency
3. The specific MD3 component specification from [m3.material.io](https://m3.material.io)

## Step 1: Research the MD3 Specification
// turbo
When creating a new component, FIRST search the web for:
```
"Material Design 3 [component name] specification"
```

Then extract:
- **States**: enabled, disabled, hovered, focused, pressed, selected
- **Anatomy**: container, label, icon slots, supporting text
- **Dimensions**: minimum touch target (48dp), padding, spacing
- **Color tokens**: primary, on-primary, surface-variant, outline, etc.

## Step 2: Define the Design Token Mapping
BEFORE writing any CSS/styles, document the token mapping:

```
Container:
  - background: surface OR surface-variant OR primary-container
  - shape: small (4dp) OR medium (12dp) OR large (16dp)
  - elevation: level0-level5

Content:
  - text: on-surface OR on-primary-container
  - icon: on-surface-variant OR primary

States:
  - hover: state-layer at 8% opacity
  - focus: state-layer at 12% opacity + focus ring
  - pressed: state-layer at 12% opacity
```

## Step 3: Verify Against Existing Design System
Check the project's existing tokens:
- Does `--md-sys-color-primary` exist?
- Is the typography scale defined (display, headline, title, body, label)?
- Are shape tokens (corner radius) defined?

If not, document what needs to be added to the design system first.

## Step 4: Implement with State Layer Pattern
MD3 uses a **state layer overlay pattern** for interactive states:

```css
.md3-interactive {
  position: relative;
  overflow: hidden;
}

.md3-interactive::before {
  content: '';
  position: absolute;
  inset: 0;
  background: currentColor;
  opacity: 0;
  transition: opacity 200ms;
}

.md3-interactive:hover::before { opacity: 0.08; }
.md3-interactive:focus-visible::before { opacity: 0.12; }
.md3-interactive:active::before { opacity: 0.12; }
```

## Step 5: Accessibility Checklist
BEFORE considering the component complete:
- [ ] Color contrast ratio ≥ 4.5:1 for normal text
- [ ] Touch targets ≥ 48x48dp
- [ ] Focus indicator visible (2dp outline-offset)
- [ ] ARIA roles and labels as needed
- [ ] Keyboard navigation works (Tab, Enter, Space, Escape)

## Step 6: Visual Verification Loop
1. Render the component in Storybook or isolation
2. Compare against the MD3 reference image/spec
3. Check all states: default, hover, focus, pressed, disabled
4. Verify dark mode compatibility

## Anti-Patterns to Avoid
❌ Using arbitrary colors like `#3B82F6` without mapping to tokens
❌ Hardcoding pixel values instead of using spacing scale
❌ Ignoring the state layer pattern for hover/focus
❌ Missing focus-visible styling
❌ Not testing in both light and dark themes
❌ Skipping the research step and "winging it"

## Reference Links
- [M3 Components](https://m3.material.io/components)
- [M3 Color System](https://m3.material.io/styles/color)
- [M3 Typography](https://m3.material.io/styles/typography)
- [M3 Motion](https://m3.material.io/styles/motion)
