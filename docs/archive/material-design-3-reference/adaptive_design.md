# Adaptive Design Requirements & Strategy
Based on [Material Design 3 Adaptive Guidelines](https://m3.material.io/foundations/adaptive-design/overview)

## 1. Core Philosophy
**"Design for a continuum/ecosystem, not just screens."**
Material Design 3 moves beyond simple responsive breakpoints to **Adaptive Design**: UIs that change layout, functionality, and navigation patterns based on window size, device posture, and input method.

## 2. Window Size Classes (The Foundation)
We will adopt standard M3 breakpoints to define **Window Size Classes**.

| Class | Width Range | Devices |
| :--- | :--- | :--- |
| **Compact** | < 600dp | Phones (portrait) |
| **Medium** | 600dp - 839dp | Foldables (unfolded), Tablets (portrait) |
| **Expanded** | 840dp - 1199dp | Tablets (landscape), Foldables (landscape) |
| **Large** | 1200dp - 1599dp | Laptops, Desktop windows |
| **Extra-Large** | ≥ 1600dp | Ultra-wide monitors |

### Implementation Goal:
Implement a `useWindowSizeClass()` hook that returns the current class, allowing components to adapt logic (not just CSS media queries).

## 3. Layout Behaviors

### 3.1 Adaptive Layout Grid
-   **Compact:** 4 columns, 16dp margins.
-   **Medium:** 12 columns, 24dp margins.
-   **Expanded+:** 12 columns, 24dp margins, max-width content constraints.

### 3.2 Navigation Patterns
Navigation must adapt structurally, not just visually.
-   **Compact:** **Bottom Navigation Bar** (3-5 destinations).
-   **Medium:** **Navigation Rail** (Vertical side rail).
-   **Expanded/Large:** **Standard Navigation Drawer** (Permanent side menu).

### 3.3 Pane Strategies
The UI is built of "panes" that reflow based on available space.
1.  **List/Detail View (Collections):**
    -   *Compact:* List covers full screen. Tapping item navigates to Detail screen.
    -   *Medium/Expanded:* Split view. List on left (fixed width), Detail on right (flexible).
2.  **Focus/Capture Modes:**
    -   *Compact:* Stacked vertical layout.
    -   *Medium+:* Grid/Masonry layout or side-by-side editing.

## 4. Implementation Strategy for `_underscore`

### 4.1 Global Adjustments
-   [ ] Define `screens` in `tailwind.config.ts` to match M3 breakpoints exactly.
-   [ ] Create `UseWindowSizeClass` hook for React components.

### 4.2 Component Adaptations

#### Collections View
-   **Grid Cards:**
    -   Compact: 1 column
    -   Medium: 2 columns
    -   Expanded: 3 columns
    -   Large: 4 columns
-   **Controls:**
    -   Compact: Bottom sheet for filters/sort.
    -   Expanded+: Toolbar or sidebar filters.

#### Account Menu
-   **Compact:** Full-screen modal or bottom sheet.
-   **Expanded+:** Popover/Dropdown (Current implementation).

#### Mode Switching
-   **Compact:** Bottom tab bar.
-   **Medium+:** Top tabs (Current) or Side Rail.

## 5. Roadmap
1.  **Tailwind Config:** Update breakpoints to M3 standards (600, 840, 1200, 1600).
2.  **Grid System:** Audit all `grid-cols-*` classes to ensure they scale correctly across classes.
3.  **Navigation Audit:** Decide if we need to switch from AccountMenu to a Rail/Drawer on larger screens.
4.  **Collections Reflow:** Implement responsive columns for the card grid.
