# Material Design 3 (Material You) Guidelines

**Web Highlighter Extension - Dynamic Design System**

> **Purpose**: Establish guidelines for using Google's Material Design 3
> (Material You) to create a dynamic, accessible, and theme-aware user
> experience.

---

## 1. Core Principles

### 1.1 Dynamic Color

Colors are not static (e.g., `#FFC107`). Instead, they are generated dynamically
from a **Source Color** (seed) extracted from the user's context (the webpage).
This ensures the extension feels "native" to any website.

### 1.2 HCT Color Space

We use the **HCT (Hue, Chroma, Tone)** color space, which is perceptually
accurate, unlike HSL or RGB.

- **Hue**: The color pigment (0-360).
- **Chroma**: The colorfulness (0-120).
- **Tone**: The lightness (0-100).

**Key Benefit**: changing Hue or Chroma does _not_ affect Tone (contrast). This
guarantees accessibility.

---

## 2. Color System Architecture

### 2.1 The Tonal Palette

From a single source color, we generate 5 key tonal palettes:

| Palette       | Description         | Usage                                  |
| :------------ | :------------------ | :------------------------------------- |
| **Primary**   | The source color    | Main UI actions, active states         |
| **Secondary** | Less prominent      | Accents, less critical highlights      |
| **Tertiary**  | Contrasting accents | "Laser" mode, distinct markers         |
| **Neutral**   | Grayscale           | Backgrounds, surfaces, text            |
| **Error**     | Red-based           | Errors, deletions, destructive actions |

### 2.2 Semantic Roles (The "Token" Layer)

We map tonal palettes to semantic roles. **Do not use raw hex codes in code.**
Use these tokens (CSS Variables).

| Role Token                            | Tone (Light/Dark) | Description                                       |
| :------------------------------------ | :---------------- | :------------------------------------------------ |
| `--md-sys-color-primary`              | 40 / 80           | High-emphasis fills, active buttons               |
| `--md-sys-color-on-primary`           | 100 / 20          | Text drawn ON TOP of primary color                |
| `--md-sys-color-primary-container`    | 90 / 30           | Lower-emphasis fills (e.g., highlight background) |
| `--md-sys-color-on-primary-container` | 10 / 90           | Text inside the primary container                 |
| `--md-sys-color-surface`              | 99 / 10           | Background of the popup/cards                     |
| `--md-sys-color-on-surface`           | 10 / 90           | Primary text on surface                           |

> **Rule**: Always pair a color with its "On" variant (e.g.,
> `background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary);`).

---

## 3. Dynamic Theme Extraction

### 3.1 Algorithm

1.  **Extract**: Analyze `document.body` or main content area to find the
    **Dominant Color**.
2.  **Validate**: Reject colors with low Chroma (grays) or extreme lightness
    (white/black) unless they are strictly background.
3.  **Generate**: Use `@material/material-color-utilities` to create a `Scheme`
    from the source.
4.  **Apply**: specific CSS variables (`:root`) are updated.

### 3.2 Accessibility (WCAG Compliance)

The Material 3 system is "accessible by design".

- **Primary Text** on **Primary Container** always meets **4.5:1** (AA) or
  **7:1** (AAA) depending on the tone pairing.
- **Tone Delta**: A difference of 60 in Tone guarantees 4.5:1 contrast. (e.g.,
  Tone 90 background vs Tone 30 text).

---

## 4. Usage in Components

### 4.1 Highlighting (The "Underscore" visual)

Instead of static yellow:

```css
.highlight--underscore {
  /* Dynamic color derived from page theme */
  text-decoration-color: var(--md-sys-color-primary);
  text-underline-offset: 3px;
}
```

### 4.2 Popup UI

The popup UI adapts to the browser theme (Light/Dark) AND the page context.

```css
.popup-container {
  background-color: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
}
```

---

## 5. Development Workflow

### 5.1 Tools

- **Material Theme Builder**: Use the Figma plugin to visualize palettes.
- **Validator**: Use the `ColorManager.validateContrast()` runtime check during
  development.

### 5.2 Naming Convention

Follow the strictly defined token names: `md.sys.color.[role]`.
