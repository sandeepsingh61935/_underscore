# Component Strategy & Web Implementation
Based on [Material Design 3 Components](https://m3.material.io/components) & [Web Developer Guide](https://m3.material.io/develop/web)

## 1. Core Philosophy
**"Atomic, Adaptive, and Accessible."**
Components are the building blocks that consume all our foundation tokens (Color, Type, Shape, Motion). They must be:
-   **Atomic:** Built using pure CSS variables and tokens, avoiding hardcoded values.
-   **Adaptive:** Responding to window size classes (Compact/Medium/Expanded).
-   **Accessible:** Using semantic HTML and ARIA labels by default.

## 2. Component Inventory & Strategy

### 2.1 Action Components
-   **Common Buttons:**
    -   *Filled:* Primary actions (Save, Create). Rounded-full, high emphasis.
    -   *Outlined:* Secondary actions (Cancel, Back). Rounded-full, low emphasis.
    -   *Text:* Low priority actions.
-   **FAB (Floating Action Button):**
    -   *Extended:* "Compose" (Icon + Label). Bottom-right fixed.
    -   *Standard:* Icon only.
-   **Icon Buttons:**
    -   *Standard:* 48x48dp touch target, 24dp icon. Used in Top App Bar.

### 2.2 Navigation Components
-   **Navigation Rail:**
    -   *Usage:* Tablet/Desktop (> 600dp).
    -   *Behavior:* Vertical column on the left.
-   **Navigation Drawer:**
    -   *Usage:* Mobile (< 600dp) as Modal overlay.
-   **Tabs:**
    -   *Usage:* Switching views within a page (e.g., Collections vs. Archive).
    -   *Style:* Pill-shaped indicator (MD3 standard).

### 2.3 Containment Components
-   **Cards:**
    -   *Style:* `rounded-xl` (12dp), `bg-surface-container`.
    -   *Interaction:* Hover state lifts key color (Level 1 -> Level 2).
-   **Dialogs:**
    -   *Style:* `rounded-2xl` (28dp), Centered, Scrimmed background.

## 3. Web Implementation Guide

### 3.1 Technology Stack
-   **Framework:** React (Pre-existing project constraint).
-   **Styling:** Tailwind CSS (configured with MD3 tokens).
-   **Icons:** Material Symbols Rounded (Variable Font).

### 3.2 The "Atomic" Approach
We will **not** import a heavy UI library like MUI (Material UI) because:
1.  **Bloat:** We are a browser extension; bundle size is critical.
2.  **Control:** We need perfect adherence to *our* specific tokens, not generic defaults.
3.  **Performance:** Tailwind is zero-runtime.

**Instead, we build our own lightweight specific components:**
-   `<MDButton variant="filled|outlined|text" />`
-   `<MDCard />`
-   `<MDScaffold />` (Adaptive Layout)
-   `<MDTextField />` (Outlined input with floating label)

### 3.3 Accessibility First
-   **Focus Rings:** All interactive components get a custom 3px offset focus ring.
-   **Touch Targets:** `min-h-[48px] min-w-[48px]` enforced via CSS.
-   **Screen Reader:** `sr-only` descriptions for icon-only buttons.

## 4. Implementation Roadmap

### 4.1 Foundation Sprint (Week 1)
-   [ ] **Tailwind Config:** Define all tokens (Color, Type, Shape, Motion).
-   [ ] **Base Styles:** Global CSS variables.

### 4.2 Component Sprint (Week 2)
-   [ ] **Atoms:** Button, IconButton, TextField, Switch.
-   [ ] **Molecules:** Card, ListItem, TabGroup.
-   [ ] **Organisms:** NavigationRail, AppBar.

### 4.3 Refactor Sprint (Week 3)
-   [ ] **Migration:** Replace existing UI with new `<MD*>` components page by page.

## 5. Verification
-   **Chrome Inspector:** Verify computed styles match MD3 spec (e.g., Button height 40dp, Padding 24dp).
-   **Lighthouse:** Accessibility score needs to be 100.
