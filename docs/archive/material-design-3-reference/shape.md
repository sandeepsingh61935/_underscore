# Shape System Requirements
Based on [Material Design 3 Shape](https://m3.material.io/styles/shape/overview-principles)

## 1. Core Philosophy
**"Expressive, not semantic."**
Shapes direct attention, identify components, and communicate state while expressing brand personality. In MD3, we move away from "rounding everything slightly" to a structured **Shape Scale**.

## 2. The Shape Scale (Corner Radius)
MD3 defines 7 standard radius values (plus "None" and "Full").

| Token | Radius (dp) | Usage |
| :--- | :--- | :--- |
| **None** | 0dp | Full-screen views, Rectangular tiles. |
| **Extra Small** | 4dp | Text Fields, Snackbars (low emphasis). |
| **Small** | 8dp | Chips, Tooltips, Menus. |
| **Medium** | 12dp | **Standard Cards**, Small FABs. |
| **Large** | 16dp | Navigation Drawers, Large Cards, FABs. |
| **Extra Large** | 28dp | Large FABs, Modal Bottom Sheets (Top corners). |
| **Full** | 9999px | Pills, Buttons, Switches, Badges. |

## 3. Component Mapping
We will standardize `_underscore` components to this scale.

### 3.1 Small Components (Radius: Full / 8dp)
-   **Buttons:** `rounded-full` (Full Shape) - *Distinct from Cards.*
-   **Badges:** `rounded-full`.
-   **Chips:** `rounded-lg` (8dp) or `rounded-full` depending on style (MD3 prefers 8dp for Filter chips, Full for Input chips). *Decision: Stick to 8dp for all chips to differentiate from Buttons.*

### 3.2 Medium Components (Radius: 12dp)
-   **Cards (Collections/Underscores):** `rounded-xl` (12dp).
    -   *Why:* 12dp is the MD3 standard for cards. It feels modern but not playful.
-   **Menus / Popovers:** `rounded-[4px]` -> Change to `rounded-xl` (12dp).

### 3.3 Large Components (Radius: 16dp / 28dp)
-   **Dialogs:** `rounded-2xl` (16dp).
-   **Side Panels (Drawers):** `rounded-r-2xl` (16dp) or `rounded-r-[28dp]` (Extra Large).
-   **FAB (Floating Action Button):** `rounded-2xl` (16dp).

## 4. Implementation Roadmap

### 4.1 Tailwind Config
We need to redefine `rounded-*` or add semantic shape utilities to ensure we don't accidentally use `rounded-md` (6dp) which is not in the MD3 scale.

-   `rounded-xs` -> 4dp
-   `rounded-sm` -> 8dp
-   `rounded-md` -> 12dp (**Shift**: Tailwind default is 6dp, we need 12dp).
-   `rounded-lg` -> 16dp
-   `rounded-xl` -> 28dp

### 4.2 Audit
-   [ ] **Buttons:** Ensure all are `rounded-full` (most important brand signifier).
-   [ ] **Cards:** Ensure all are `rounded-md` (12dp).

## 5. Verification
-   **Visual Consistency:** Do buttons look distinct from cards? (Full round vs 12dp).
-   **Nested Shapes:** Ensure inner content radius < outer container radius (Radius - Padding = Inner Radius).
