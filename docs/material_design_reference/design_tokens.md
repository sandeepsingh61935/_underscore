# Design Tokens Strategy
Based on [Material Design 3 Design Tokens](https://m3.material.io/foundations/design-tokens/overview)

## 1. Core Philosophy
**"A single source of truth."**
Design tokens are the atoms of our design system. We use a 3-tier architecture to ensure flexibility, themability, and consistency.

## 2. Token Architecture

### 2.1 Level 1: Reference Tokens (Global)
**Definition:** Context-agnostic, raw values.
-   **Role:** The available "inventory" of styles.
-   **Naming:** `ref.palette.color.tone`
-   **Examples:**
    -   `ref.palette.blue.40` = `#5b8db9`
    -   `ref.typeface.roboto` = `'Roboto'`
    -   `ref.spacing.4` = `4px`

### 2.2 Level 2: System Tokens (Semantic)
**Definition:** Context-aware roles.
-   **Role:** Defines *intent* and *function*. This is where theming happens (Light vs. Dark).
-   **Naming:** `sys.type.role`
-   **Examples:**
    -   `sys.color.primary` = `ref.palette.blue.40` (Light) / `ref.palette.blue.80` (Dark)
    -   `sys.color.surface` = `ref.palette.neutral.98`
    -   `sys.shape.corner.medium` = `12px`

### 2.3 Level 3: Component Tokens (Specific)
**Definition:** Component-specific mappings.
-   **Role:** Maps system tokens to specific component parts. allows independent component updates.
-   **Naming:** `comp.component.part.attribute`
-   **Examples:**
    -   `comp.card.container.color` -> `sys.color.surface-container-highest`
    -   `comp.button.label.text-style` -> `sys.typescale.label-large`

## 3. Implementation Strategy (Tailwind + CSS Vars)

Since we reuse Tailwind, we map tokens to CSS Variables and then to Tailwind utilities.

### 3.1 CSS Variables (`global.css`)
```css
:root {
  /* Reference */
  --ref-blue-40: #5b8db9;

  /* System */
  --sys-color-primary: var(--ref-blue-40);
  --sys-radius-medium: 12px;
}

.dark {
  /* System override */
  --sys-color-primary: var(--ref-blue-80);
}
```

### 3.2 Tailwind Config (`tailwind.config.ts`)
```ts
theme: {
  extend: {
    colors: {
      primary: 'var(--sys-color-primary)', // utility: bg-primary
    },
    borderRadius: {
      md: 'var(--sys-radius-medium)', // utility: rounded-md
    }
  }
}
```

## 4. Requirement Checklist for `_underscore`

### 4.1 Token Audit
-   [ ] **Identify all hardcoded values:** Any hex code or pixel string in a `.tsx` file is a tech debt.
-   [ ] **Map to System Tokens:** Replace hardcoded values with semantic Tailwind classes.
    -   *Bad:* `bg-[#f0f0f0]`
    -   *Good:* `bg-surface-container`

### 4.2 Naming Convention
-   Strictly follow MD3 naming: `primary`, `on-primary`, `primary-container`, `on-primary-container`, etc.
-   Do not invent new semantic roles (e.g., "sidebar-bg") unless absolutely necessary. Use `surface-container` variants instead.

## 5. Roadmap
1.  **Define Reference Palette:** Extract all colors currently in use into a `design-tokens.ts` (or just comments in css).
2.  **Define System Mapping:** Complete the `global.css` variable definitions for all MD3 color roles.
3.  **Component Audit:** Update `CollectionsView`, `AccountMenu`, etc., to use *only* these tokens.
