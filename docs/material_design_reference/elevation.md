# Elevation Requirements
Based on [Material Design 3 Elevation](https://m3.material.io/styles/elevation/overview)

## 1. Core Philosophy
**"Depth through Color, not just Shadow."**
In MD3, elevation is primarily depicted by **Surface Tones** (lighter = higher), with shadows playing a secondary, supporting role. This ensures depth is visible even in low-contrast environments (like Dark Mode) where shadows fail.

## 2. Elevation Levels (0-5)

### Level 0: The Baseline
-   **Height:** 0dp
-   **Color Role:** `Surface` / `Surface Dim`
-   **Usage:** Application background, scrollable content underneath cards.

### Level 1: Low Emphasis
-   **Height:** 1dp
-   **Color Role:** `Surface Container Low`
-   **Usage:** Cards in a grid, List items.

### Level 2: Default Emphasis
-   **Height:** 3dp
-   **Color Role:** `Surface Container`
-   **Usage:** Default Cards, Small FABs.

### Level 3: High Emphasis
-   **Height:** 6dp
-   **Color Role:** `Surface Container High`
-   **Usage:** Navigation Bar, Large FAB, Sticky Headers.

### Level 4: Super High
-   **Height:** 8dp
-   **Color Role:** `Surface Container Highest`
-   **Usage:** Dialogs, Menus.

### Level 5: Peak
-   **Height:** 12dp+
-   **Color Role:** `Surface Container Highest` + Prominent Shadow
-   **Usage:** Modal Sheets, Tooltips.

## 3. Implementation Strategy

### 3.1 Tonal Elevation (The New Way)
We stop using `bg-white` + `shadow-lg`. We switch to:
-   **Card:** `bg-surface-container` (No shadow by default, or very subtle `shadow-sm`).
-   **Hover:** `bg-surface-container-high` (Lift effect via color).

### 3.2 Shadow Support
Shadows are refined to be softer and colored (blue-tinted in light mode if possible).
-   **Classes:**
    -   `elevation-1`: `shadow-sm`
    -   `elevation-2`: `shadow-md`
    -   `elevation-3`: `shadow-lg`
    -   `elevation-4`: `shadow-xl`
    -   `elevation-5`: `shadow-2xl`

## 4. Dark Mode Handling
Shadows are invisible in Dark Mode. **Elevation via Tone is mandatory.**
-   **Light Mode:** `Surface Container` is slightly darker (grey) than `Surface` (white).
-   **Dark Mode:** `Surface Container` is significantly lighter (grey) than `Surface` (black).

## 5. Verification
-   **The "Squint Test":** Can I tell the Card is "above" the background without looking at the shadow? (If yes, color role is correct).
-   **Hover Test:** Does hovering a card slightly lighten its background (lift)?
