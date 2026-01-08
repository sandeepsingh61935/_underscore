# Usability Requirements
Based on [Material Design 3 Usability Principles](https://m3.material.io/foundations/usability/overview)

## 1. Core Philosophy
**"Intuitive, Efficient, and Honest."**
Usability in MD3 isn't just about "ease of use"—it's about reducing cognitive load. The goal is to let the user achieve their intent with the minimum amount of friction.

## 2. Scanability & Visual Hierarchy

### 2.1 The "F-Pattern" Layout
Users scan content in an F-pattern (Top bar -> Left rail -> Content).
-   **Structure:**
    1.  **Primary Action:** Top-left or Bottom-right (FAB).
    2.  **Navigation:** Left rail (Desktop) or Bottom bar (Mobile).
    3.  **Content:** Center stage.

### 2.2 Typography as Hierarchy
Don't use bold text randomly. Use the Type Scale to guide the eye.
-   **Display/Headline:** Start of a new distinct section.
-   **Title:** Context for a group of items.
-   **Label:** Actionable elements.
-   **Body:** Long-form content.

## 3. Efficiency & Speed

### 3.1 One Click Rule
Common actions should never be buried in a menu.
-   *Bad:* Open Card -> Click 3-dot menu -> Click Edit.
-   *Good:* Hover Card -> Click Edit Icon (Visible).

### 3.2 Key Accelerators
-   **Keyboard Shortcuts:** Global shortcuts for power users.
    -   `/` : Search
    -   `Esc`: Close Modal/Selection
    -   `Ctrl+N`: New Collection
-   **Right-Click (ContextMenu):** Web users expect native-like right-click behavior.
    -   *Implementation:* Custom context menu for Collections/Underscores with "Edit", "Delete", "Move".

## 4. Feedback & Trust

### 4.1 System Status
Always tell the user what's happening.
-   **Loading:** Skeletons > Spinners. (Skeletons feel faster).
-   **Success:** Toast notification for 3-5 seconds.
-   **Failure:** Inline warning or persistent banner explaining *why* and *how to fix*.

### 4.2 Error Prevention
-   **Destructive Actions:** require confirmation (Dialog).
-   **Form Validation:** Validate *onBlur* or *onChange* (if simple), not just *onSubmit*.

## 5. Implementation Roadmap

### 5.1 Quick Wins
-   [ ] **Skeleton Screens:** Replace the full-page spinner in `CollectionsView` with a Card Skeleton grid.
-   [ ] **Hotkeys:** Add a global listener for common shortcuts.
-   [ ] **Context Menus:** Implement a right-click menu for Collection Cards.

### 5.2 Long Term
-   [ ] **Search Everywhere:** A global "Command Palette" (Ctrl+K) style search.
-   [ ] **Undo/Redo:** Toast "Undo" action for deletions.

## 6. Verification
-   **The "Grandma Test":** Can a non-technical user find the "Create Collection" button in < 5 seconds?
-   **The "Coffee Shop Test":** If the internet cuts out, does the app explode or just show a "Offline" banner?
