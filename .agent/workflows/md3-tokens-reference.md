---
description: Material Design 3 design tokens reference for consistent UI implementation
---

# Material Design 3 Design Tokens Reference

## Color System (5 Key Roles)

### Primary Colors
```
--md-sys-color-primary          # Main brand color
--md-sys-color-on-primary       # Text/icons on primary
--md-sys-color-primary-container    # Lighter primary for containers
--md-sys-color-on-primary-container # Text on primary container
```

### Secondary Colors
```
--md-sys-color-secondary
--md-sys-color-on-secondary
--md-sys-color-secondary-container
--md-sys-color-on-secondary-container
```

### Tertiary Colors
```
--md-sys-color-tertiary
--md-sys-color-on-tertiary
--md-sys-color-tertiary-container
--md-sys-color-on-tertiary-container
```

### Error Colors
```
--md-sys-color-error
--md-sys-color-on-error
--md-sys-color-error-container
--md-sys-color-on-error-container
```

### Surface & Background
```
--md-sys-color-surface         # Main background
--md-sys-color-on-surface      # Primary text
--md-sys-color-surface-variant # Secondary surfaces
--md-sys-color-on-surface-variant # Secondary text
--md-sys-color-outline         # Borders, dividers
--md-sys-color-outline-variant # Subtle borders
```

---

## Typography Scale (15 Tokens)

| Token | Typical Size | Weight | Line Height |
|-------|-------------|--------|-------------|
| Display Large | 57sp | 400 | 64sp |
| Display Medium | 45sp | 400 | 52sp |
| Display Small | 36sp | 400 | 44sp |
| Headline Large | 32sp | 400 | 40sp |
| Headline Medium | 28sp | 400 | 36sp |
| Headline Small | 24sp | 400 | 32sp |
| Title Large | 22sp | 400 | 28sp |
| Title Medium | 16sp | 500 | 24sp |
| Title Small | 14sp | 500 | 20sp |
| Body Large | 16sp | 400 | 24sp |
| Body Medium | 14sp | 400 | 20sp |
| Body Small | 12sp | 400 | 16sp |
| Label Large | 14sp | 500 | 20sp |
| Label Medium | 12sp | 500 | 16sp |
| Label Small | 11sp | 500 | 16sp |

---

## Shape Tokens (Corner Radius)

| Token | Value | Use Case |
|-------|-------|----------|
| Extra Small | 4dp | Small components |
| Small | 8dp | Buttons, chips |
| Medium | 12dp | Cards, dialogs |
| Large | 16dp | FAB, large cards |
| Extra Large | 28dp | Extended FAB |
| Full | 50% | Circular buttons |

---

## Elevation Levels

| Level | Shadow | Use Case |
|-------|--------|----------|
| Level 0 | None | Flat surfaces |
| Level 1 | 1dp | Cards at rest |
| Level 2 | 3dp | Raised buttons |
| Level 3 | 6dp | Modals, menus |
| Level 4 | 8dp | Drawers |
| Level 5 | 12dp | FAB pressed |

> ⚠️ MD3 uses **tonal elevation** (surface tint) rather than just shadows

---

## State Layer Opacities

| State | Opacity | When Applied |
|-------|---------|--------------|
| Hover | 8% | Mouse over |
| Focus | 12% | Keyboard focus |
| Pressed | 12% | Active/click |
| Dragged | 16% | During drag |

**Implementation Pattern:**
```css
.component::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--md-sys-color-primary);
  opacity: 0;
  pointer-events: none;
}
.component:hover::before { opacity: 0.08; }
.component:focus-visible::before { opacity: 0.12; }
.component:active::before { opacity: 0.12; }
```

---

## Motion Tokens

| Duration | Use Case |
|----------|----------|
| 50ms | Micro-interactions (ripple start) |
| 100ms | Selection, toggles |
| 200ms | Small component transitions |
| 300ms | Standard transitions |
| 400ms | Emphasized transitions |
| 500ms+ | Complex page transitions |

**Easing Curves:**
```
Standard: cubic-bezier(0.2, 0.0, 0, 1.0)
Emphasized: cubic-bezier(0.2, 0.0, 0, 1.0)
EmphasizedDecelerate: cubic-bezier(0.05, 0.7, 0.1, 1.0)
EmphasizedAccelerate: cubic-bezier(0.3, 0.0, 0.8, 0.15)
```

---

## Minimum Touch Targets

- **Minimum:** 48 × 48 dp
- **Recommended:** 56 × 56 dp for primary actions
- Inner padding counts toward touch target

---

## Quick Checklist for Token Compliance

- [ ] All colors use `--md-sys-color-*` tokens
- [ ] Typography uses scale tokens (body-medium, label-large, etc.)
- [ ] Border radius uses shape tokens (small, medium, large)
- [ ] Shadows use elevation levels
- [ ] Hover/focus/pressed use state layer opacities
- [ ] Animations use motion duration + easing tokens
- [ ] Touch targets ≥ 48dp
