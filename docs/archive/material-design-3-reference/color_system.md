# Material Design 3 Color System: Complete Requirements & Implementation Guide
Based on [Material Design 3 Color System](https://m3.material.io/styles/color/system/overview)

## 1. Core Philosophy & Innovation

**"Dynamic, Accessible, and Algorithmically-Harmonious Color."**

Material Design 3 represents a paradigm shift in digital color systems:
- **Perceptually Uniform**: Uses **HCT (Hue, Chroma, Tone)** color space instead of HSL/HSV
- **Algorithmic Generation**: Full color scheme generated from 1-5 seed colors
- **Guaranteed Accessibility**: WCAG AAA/AA contrast ratios built into the algorithm
- **True Dark Mode**: Not just inverted colors, but perceptually-balanced tones

### 1.1 Why HCT Over HSL?

| Aspect | HSL/HSV | HCT |
| :--- | :--- | :--- |
| **Visual Uniformity** | Uneven (blue appears darker than yellow at same lightness) | Perceptually uniform across all hues |
| **Chroma Control** | Coupled with lightness | Independent chroma control |
| **Predictability** | Poor (tone 50% ≠ mid-gray visually) | Excellent (tone 50 = true perceptual midpoint) |
| **Accessibility** | Manual calculation required | Contrast guaranteed algorithmically |

**Outcome**: `#0000FF` (pure blue HSL) and `#FFFF00` (yellow) have same HSL lightness but vastly different perceived brightness. HCT corrects this.

---

## 2. The Complete Color Token System

### 2.1 The 5 Key Color Families

Material Design 3 generates color schemes from **5 Key Colors**:

1. **Primary** - Brand identity, high-emphasis actions
   - FAB (Floating Action Button)
   - Active states, selected items
   - Primary CTAs (Call-to-Action buttons)

2. **Secondary** - Supporting actions, less prominent emphasis
   - Filter chips
   - Secondary buttons
   - Toggle states

3. **Tertiary** - Contrasting accents for visual interest
   - Highlights and differentiation
   - Input field focus states
   - Complementary to Primary

4. **Error** - Destructive actions and alerts
   - Form validation errors
   - Destructive confirmations
   - Warning states

5. **Neutral & Neutral Variant** - Surfaces, text, outlines
   - Background surfaces
   - Text colors
   - Borders and dividers

### 2.2 Complete Token Mapping (65+ Tokens)

Each Key Color generates a **13-tone palette** (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100), resulting in **65+ semantic color tokens**:

#### Primary Family
| Token | Light Mode Tone | Dark Mode Tone | Usage |
| :--- | :---: | :---: | :--- |
| `primary` | 40 | 80 | Primary brand color |
| `on-primary` | 100 | 20 | Text/icons on `primary` |
| `primary-container` | 90 | 30 | Tinted backgrounds |
| `on-primary-container` | 10 | 90 | Text/icons on `primary-container` |
| `primary-fixed` | 90 | 90 | Same in light/dark |
| `on-primary-fixed` | 10 | 10 | Text on `primary-fixed` |
| `primary-fixed-dim` | 80 | 80 | Dimmer fixed variant |
| `on-primary-fixed-variant` | 30 | 30 | Medium contrast text |

#### Secondary, Tertiary, Error (Same Structure)
- Each has: `secondary`, `on-secondary`, `secondary-container`, `on-secondary-container`, `secondary-fixed`, etc.

#### Surface & Background System
| Token | Light Tone | Dark Tone | Usage |
| :--- | :---: | :---: | :--- |
| `surface-dim` | 87 | 6 | Dimmest surface |
| `surface` | 98 | 6 | Base canvas |
| `surface-bright` | 98 | 24 | Brightest surface |
| `surface-container-lowest` | 100 | 4 | Lowest elevation (e.g., nav rail) |
| `surface-container-low` | 96 | 10 | Low elevation cards |
| `surface-container` | 94 | 12 | **Default container** |
| `surface-container-high` | 92 | 17 | High elevation (dialogs) |
| `surface-container-highest` | 90 | 22 | Highest elevation (date pickers) |
| `on-surface` | 10 | 90 | Primary text |
| `on-surface-variant` | 30 | 80 | Secondary/hint text |
| `outline` | 50 | 60 | Borders |
| `outline-variant` | 80 | 30 | Subtle dividers |

#### Special Tokens
- `inverse-surface` (10 / 90): High contrast surfaces (e.g., snackbars)
- `inverse-on-surface` (95 / 20): Text on `inverse-surface`
- `inverse-primary` (80 / 40): Primary color on `inverse-surface`
- `scrim` (0 / 0): Modal overlays (with opacity)
- `shadow` (0 / 0): Drop shadows (with opacity)

---

## 3. Contrast & Accessibility Requirements

### 3.1 WCAG Compliance Matrix

Material Design 3's algorithm **guarantees** these minimum contrast ratios:

| Text Type | Min Contrast | MD3 Token Pairing |
| :--- | :---: | :--- |
| **Large Text (18pt+)** | 3:1 (AA) | `primary` / `on-primary` |
| **Body Text** | 4.5:1 (AA) | `surface` / `on-surface` |
| **Critical Text** | 7:1 (AAA) | `error` / `on-error` |

### 3.2 Verification Strategy
```typescript
// Pseudo-code for validation
function verifyContrast(background: string, foreground: string): boolean {
  const ratio = calculateContrastRatio(background, foreground);
  return ratio >= 4.5; // For body text
}

// Example test
verifyContrast(tokens.primary, tokens.onPrimary); // Must return true
```

**For `_underscore`**: Implement a development-mode contrast checker that warns if custom overrides violate WCAG AA.

---

## 4. State Layers & Interactive States

MD3 doesn't use opacity-based overlays arbitrarily. **State layers** are defined tonal overlays:

| State | Opacity | Token Applied |
| :--- | :---: | :--- |
| **Hover** | 8% | `on-surface` or `primary` |
| **Focus** | 12% | `on-surface` or `primary` |
| **Pressed** | 12% | `on-surface` or `primary` |
| **Dragged** | 16% | `on-surface` or `primary` |

### Implementation Pattern
```css
/* Instead of arbitrary opacity */
.button:hover {
  background: color-mix(in srgb, var(--md-sys-color-primary) 92%, var(--md-sys-color-on-primary) 8%);
}
```

For `_underscore`: Create Tailwind utilities like `hover:state-layer-primary-8` that apply these precise overlays.

---

## 5. Dynamic Color & Theme Generation

### 5.1 Source Color Strategy

**Single Source Approach** (Recommended for `_underscore`):
1. User selects **1 seed color** (e.g., their favorite brand color).
2. Algorithm generates **all 5 Key Colors** automatically:
   - **Primary**: The seed color itself
   - **Secondary**: Complementary hue (adjusted for harmony)
   - **Tertiary**: Analogous or split-complementary hue
   - **Neutral**: Desaturated version of seed
   - **Error**: Fixed (typically red-based for universality)

**Multi-Source Approach** (Advanced):
- Designer manually picks all 5 Key Colors
- Used when brand has strict multi-color identity

### 5.2 Implementation with `@material/material-color-utilities`

```typescript
import { argbFromHex, themeFromSourceColor, applyTheme } from '@material/material-color-utilities';

function generateTheme(seedHex: string, isDark: boolean) {
  const theme = themeFromSourceColor(argbFromHex(seedHex));
  const scheme = isDark ? theme.schemes.dark : theme.schemes.light;
  
  // Convert to CSS variables
  return {
    '--md-sys-color-primary': hexFromArgb(scheme.primary),
    '--md-sys-color-on-primary': hexFromArgb(scheme.onPrimary),
    // ... all 65+ tokens
  };
}
```

**For `_underscore`**:
1. Create `ThemeGenerator` utility class
2. Store seed color in `chrome.storage.sync`
3. Regenerate CSS variables on theme switch or seed change
4. Inject into popup/content script via `:root` or scoped container

---

## 6. Surface Elevation System (Critical Update)

MD3 **eliminates** opacity-based shadows for elevation. Instead, use **Surface Container levels**:

### Old Approach (Material 2)
```css
/* DEPRECATED */
.card-low { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.card-high { box-shadow: 0 8px 16px rgba(0,0,0,0.2); }
```

### New Approach (Material 3)
```css
.card-low { background: var(--md-sys-color-surface-container-low); }
.card-high { background: var(--md-sys-color-surface-container-high); }
```

**Rationale**: Different surface tones provide visual hierarchy without shadows, solving dark mode appearance issues.

---

## 7. Implementation Roadmap for `_underscore`

### Phase 1: Infrastructure
- [ ] Install `@material/material-color-utilities` package
- [ ] Create `src/ui-system/theme/ThemeGenerator.ts`
- [ ] Create `src/ui-system/theme/ColorTokens.ts` (TypeScript types for all 65+ tokens)
- [ ] Implement `ThemeProvider` React context

### Phase 2: CSS Variable System
- [ ] Generate CSS custom properties from theme
- [ ] Inject into `:root` via `ThemeProvider`
- [ ] Create Tailwind config to consume CSS variables:
  ```js
  // tailwind.config.ts
  colors: {
    primary: 'var(--md-sys-color-primary)',
    'on-primary': 'var(--md-sys-color-on-primary)',
    'surface-container': 'var(--md-sys-color-surface-container)',
    // ...
  }
  ```

### Phase 3: Component Refactoring
- [ ] **Surface Audit**: Replace all `bg-white`, `bg-gray-50` with `bg-surface-container`
- [ ] **Text Audit**: Replace `text-gray-900`, `text-black` with `text-on-surface`
- [ ] **Border Audit**: Replace `border-gray-300` with `border-outline-variant`
- [ ] **Interactive States**: Implement state layer utilities (`hover:state-layer-8`)

### Phase 4: User Customization
- [ ] Settings UI for seed color picker
- [ ] Live preview of theme changes
- [ ] Preset themes (e.g., "Underscore Blue", "Forest Green", "Sunset Orange")

### Phase 5: Validation
- [ ] Automated contrast ratio tests in CI/CD
- [ ] Visual regression tests for light/dark mode parity
- [ ] Accessibility audit (axe-core integration)

---

## 8. Special Considerations for `_underscore`

### 8.1 Content Script Injection
When injecting highlights into web pages:
- **Avoid polluting page styles**: Wrap highlights in isolated container with scoped CSS variables
- **Respect user's OS theme**: Detect `prefers-color-scheme` and apply matching scheme

### 8.2 Extension Popup
- **Compact color palette**: Popup has limited space, prioritize `surface-container` for backgrounds
- **High contrast for readability**: Use `on-surface` (not `on-surface-variant`) for critical text

### 8.3 Multiple Themes
For different modes (Focus, Capture, Memory):
- **Option A**: Different seed colors per mode (e.g., blue for Focus, green for Capture)
- **Option B**: Same seed color, different tertiary accents

---

## 9. Testing & Verification Checklist

- [ ] **Contrast Compliance**: All text passes WCAG AA (4.5:1 for body, 3:1 for large)
- [ ] **Dark Mode Parity**: Dark mode is not just "inverted" but perceptually balanced
- [ ] **Theme Switching**: Smooth transition between light/dark without flashing
- [ ] **Custom Seeds**: User-selected seed colors generate harmonious, accessible schemes
- [ ] **Cross-Browser**: CSS variables work consistently in Chrome, Edge, Firefox
- [ ] **Performance**: Theme generation completes in <100ms to avoid blocking UI

---

## 10. Anti-Patterns to Avoid

❌ **Manual Tone Selection**: Don't hardcode `primary-40` or `surface-90` in components. Always use semantic tokens.

❌ **Arbitrary Opacity**: Don't use `bg-primary/50` for hover states. Use defined state layers.

❌ **Ignoring "On" Tokens**: Never pair `primary` background with `secondary` text. Always use `on-primary`.

❌ **Shadow-Based Elevation**: Don't add `box-shadow` for depth. Use `surface-container-*` levels.

✅ **Correct Pattern**:
```tsx
<button className="bg-primary text-on-primary hover:state-layer-8">
  Click Me
</button>
```

---

## 11. Resources & References

- [MD3 Color System Overview](https://m3.material.io/styles/color/system/overview)
- [Material Color Utilities (npm)](https://www.npmjs.com/package/@material/material-color-utilities)
- [HCT Color Space Paper](https://material.io/blog/science-of-color-design)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Dynamic Color on Android](https://m3.material.io/styles/color/dynamic-color/overview) (conceptual reference)
