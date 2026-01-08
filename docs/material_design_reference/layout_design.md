# Layout Design Requirements
Based on [Material Design 3 Layout Guidelines](https://m3.material.io/foundations/layout/understanding-layout/overview)

## 1. Core Philosophy
**"Adaptive, not just Responsive."**
The layout doesn't just "squish" to fit smaller screens; it fundamentally changes structure based on **Window Size Classes** to optimize for the device's posture.

## 2. Window Size Classes (Refresher)
| Class | Breakpoint | Columns (Grid) | Margins |
| :--- | :--- | :--- | :--- |
| **Compact** | < 600dp | 4 | 16dp |
| **Medium** | 600-839dp | 12 | 24dp |
| **Expanded** | 840-1199dp | 12 | 24dp |
| **Large/XL** | 1200dp+ | 12 | 24dp |

## 3. Canonical Layouts for `_underscore`

### 3.1 Collections View → **List-Detail Layout**
The core experience is browsing a list of items (Collections/Underscores) and viewing their details.
-   **Compact:** Single Pane.
    -   *State A:* List View visible. Tap item -> Navigate to Detail View (replacing List).
-   **Medium/Expanded:** Split Pane.
    -   *Pane 1 (List):* Fixed width (e.g., 360dp) or Flexible (33%).
    -   *Pane 2 (Detail):* Flexible (remaining space).
    -   User taps item in List -> Updates Detail pane immediately without navigation.

### 3.2 Navigation Strategy
-   **Compact:** **Bottom Navigation Bar** or **Navigation Drawer** (Modal) for global nav.
-   **Medium:** **Navigation Rail** (Vertical, icon-only) on the left.
-   **Expanded:** **Standard Navigation Drawer** (Permanent, text labels) on the left.

### 3.3 Account/Settings → **Supporting Pane Layout**
-   **Concept:** Main settings content is the focus; supporting context (help, tips) is secondary.
-   **Implementation:**
    -   *Wide Screens:* Settings form on left (Focus), Help text/Context on right (Supporting Pane).
    -   *Narrow Screens:* Settings form takes 100%. Supporting text moves to bottom or info icons/modals.

## 4. Pane Behaviors
How panes react to changing window sizes:
1.  **Reflow:** Content within a pane (e.g., Grid cards) changes column count (1 -> 2 -> 3 -> 4) as the pane grows.
2.  **Hide:** In Compact mode, the "Detail" pane is hidden until an item is selected.
3.  **Overlay:** On Medium screens, a Navigation Drawer might overlay content instead of pushing it (optional).

## 5. Implementation Roadmap

### 5.1 Infrastructure
-   [ ] **Layout Scaffold Component:** Create a `<AdaptiveScaffold />` that accepts `nav`, `list`, `detail` props and manages the layout logic based on window size.
-   [ ] **Pane Components:** `<PaneContainer>`, `<PaneFixed>`, `<PaneFlexible>` utility components.

### 5.2 View Updates
-   [ ] **CollectionsView Refactor:** migrating from a simple Flex/Grid page to a `ListDetail` architectural pattern.
    -   *Current:* Grid of cards.
    -   *Target:* 
        -   **Compact:** Vertical List/Grid.
        -   **Expanded:** Left sidebar (List/Filters), Right area (Grid of Underscores).

## 6. Verification
-   **The Resizer Test:** Drag the browser window from 1920px down to 375px.
    -   Does the Nav change (Drawer -> Rail -> Bottom)?
    -   Does the List-Detail view merge into a single view at < 600px?
