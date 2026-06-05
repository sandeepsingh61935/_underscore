# Motion System Requirements
Based on [Material Design 3 Motion](https://m3.material.io/styles/motion/overview/how-it-works)

## 1. Core Philosophy
**"Expressive, Natural, and Informative."**
Motion isn't decoration; it communicates spatial relationships. We use **M3 Expressive** physics (springs) for a modern, fluid feel, replacing stiff linear animations.

## 2. Transition Patterns

### 2.1 Container Transform
**Usage:** Transitioning from a List Item (card) to a Details View.
-   **Behavior:** The card morphs into the full page background.
-   **Easing:** Standard Easing (300ms).
-   **Why:** Reinforces that the detail view *is* the expanded item.

### 2.2 Shared Axis (Z-Axis)
**Usage:** Moving forward/backward in a flow (e.g., Settings Breadcrumbs).
-   **Behavior:** Current screen scales down/fades out; New screen scales up/fades in atop it.
-   **Why:** Creates a sense of depth and hierarchy.

### 2.3 Shared Axis (X-Axis)
**Usage:** Switching between peer tabs (e.g., Collections <-> Archive).
-   **Behavior:** Slide left/right combined with fade.

### 2.4 Fade Through
**Usage:** Global navigation switching (e.g., changing Modes).
-   **Behavior:** Outgoing content fades out; Incoming content fades in (sequentially, not overlapping).
-   **Why:** Indicates no strong spatial relationship; completely new context.

## 3. Duration & Easing

### 3.1 Durations
-   **Short (Icons/Checkboxes):** 100ms - 200ms
-   **Medium (Dialogs/Menus):** 250ms - 300ms
-   **Long (Page Transitions):** 400ms - 500ms

### 3.2 Easing Curves (CSS)
Since we can't easily implement full spring physics in standard CSS/Tailwind transitions, we use MD3's recommended cubic-bezier approximations.

-   **Standard (General):** `cubic-bezier(0.2, 0.0, 0, 1.0)`
    -   *Use for:* Color changes, simple fades.
-   **Emphasized (Hero):** `cubic-bezier(0.2, 0.0, 0, 1.0)`
    -   *Use for:* Fab launch, Dialog enter.
-   **Decelerate (Enter):** `cubic-bezier(0, 0, 0.2, 1)`
    -   *Use for:* Elements entering the screen.
-   **Accelerate (Exit):** `cubic-bezier(0.4, 0, 1, 1)`
    -   *Use for:* Elements leaving the screen.

## 4. Implementation Roadmap

### 4.1 Infrastructure
-   [ ] **Tailwind Config:** Add `transition-standard`, `transition-emphasized` utilities with the standard durations and easing curves.
-   [ ] **Animate.css / Framer Motion:** Evaluate if we need a heavier library for Container Transforms (Framer Motion is standard for React MD3).
    -   *Decision:* Start with CSS Transitions. Use Framer Motion only for the `LayoutGroup` (Container Transform) capability if CSS proves too jerky.

### 4.2 Application
-   [ ] **Dialogs:** Ensure all modals scale in (90% -> 100%) + Fade In using `Emphasized Decelerate`.
-   [ ] **Collections View:** Add a subtle "staggered fade-in" for the grid list items on load.

## 5. Verification
-   **Reduced Motion:** **CRITICAL.** If user has `prefers-reduced-motion`, all spatial transitions must be disabled (fade only).
-   **The "Jank" Test:** Do animations drop frames on low-end devices? (Keep CSS simple).
