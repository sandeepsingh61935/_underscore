# Interaction Design Requirements
Based on [Material Design 3 Interaction Guidelines](https://m3.material.io/foundations/interaction/gestures)

## 1. Core Philosophy
**"Responsive, Intelligent, and Fluid."**
Interactions should feel natural and provide immediate feedback. The interface adapts not just to screen size, but to *how* the user is interacting (Touch vs. Mouse vs. Keyboard).

## 2. Interaction States

### 2.1 State Layer Model
MD3 uses a semi-transparent "State Layer" overlay to indicate states.
-   **Hover:** 8% opacity overlay (on-surface content color).
-   **Focus:** 12% opacity overlay + High-emphasis border/ring.
-   **Pressed:** 12% opacity overlay + Ripple effect.
-   **Dragged:** 16% opacity overlay + Elevation increase (+6dp).

### 2.2 Input Modality Handling
-   **Mouse:** Show Hover states.
-   **Touch:** Skip Hover, show Ripple on Press.
-   **Keyboard:** Show high-contrast Focus rings (2px offset).

## 3. Gestures & Inputs

### 3.1 Gestures
-   **Tap:** Primary action.
-   **Long Press:** Show tooltips (Desktop) or context menus (Touch).
-   **Swipe:** Dismissable items (e.g., Toast notifications).
-   **Drag:** Reordering collections (Kanban style).

### 3.2 Selection Patterns
-   **Cards:** 
    -   *Mouse:* Hover reveals checkbox or "Select" action.
    -   *Touch:* Long-press enters selection mode.
-   **Multi-Select:**
    -   Top App Bar transforms to "Contextual Action Bar" when items are selected.
    -   Count of selected items displayed.
    -   "X" to clear selection.

## 4. Component Requirements

### 4.1 Click Targets
-   **Touch:** Minimum **48x48dp**.
    -   *Icon Buttons:* Visual size 24dp, but padding must extend trigger area to 48dp.
-   **Desktop:** Click targets can be smaller (e.g., 32dp) but must satisfy 48dp spacing rules for hybrid devices.

### 4.2 Feedback
-   **Tooltips:** Required for all icon-only buttons on hover/focus.
-   **Focus Order:** Logical tab index flow (Top->Bottom, Left->Right).
-   **Ripples:** Standard implementation for all clickable surfaces.

## 5. Implementation Roadmap for `_underscore`

### 5.1 Infrastructure
-   [ ] **State Layer Component:** Create a reusable `<StateLayer />` utility or Tailwind classes (`hover:bg-on-surface/8`) to standardize state visuals.
-   [ ] **Ripple Effect:** Standardize the ripple usage (using a library or CSS keyframes).

### 5.2 Component Updates
-   [ ] **Collections View:** Implement "Long press to select" for touch users.
-   [ ] **Card Hover:** Audit hover states for cards (Lift emphasis vs. State layer).
-   [ ] **Focus Rings:** Ensure `focus-visible:` utilities are applied globally in `global.css`.

## 6. Verification
-   **The "Fat Finger" Test:** Can I tap the "More" menu on a card without accidentally opening the details? (48dp check).
-   **The "Tab" Test:** Can I navigate the entire app without a mouse?
