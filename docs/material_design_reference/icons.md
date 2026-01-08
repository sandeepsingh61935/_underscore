# Icon System Requirements
Based on [Material Design 3 Icons](https://m3.material.io/styles/icons/overview)

## 1. Core Philosophy
**"Clarity at any scale."**
We use **Material Symbols** (Variable Font) to ensure consistent stroke weight and optical sizing across the entire application.

## 2. Icon Set: Material Symbols Rounded
We are standardizing on **Material Symbols Rounded** to match the application's friendly, modern aesthetic (Rounded Cards, Rounded Buttons).

### 2.1 Variable Axes Settings
To ensure harmony with **Roboto** text:
-   **Fill:** `0` (Default), `1` (Active/Selected).
-   **Weight:** `400` (Regular) - Matches Body text.
-   **Grade:** `0` (Standard).
-   **Optical Size:** `24px` (Auto-scaling).

## 3. Usage Strategy

### 3.1 Style Mapping
-   **Default / Passive:** **Outlined** (Fill 0).
    -   *Example:* Nav Item (Inactive), Action Button.
    -   *Reason:* Reduces visual noise in dense UIs.
-   **Active / Focused:** **Filled** (Fill 1).
    -   *Example:* Nav Item (Active), FAB, Toggle Button (On).
    -   *Reason:* High emphasis, faster recognition.

### 3.2 Sizing & Alignment
-   **Visual Size:** `24dp` (Standard).
-   **Touch Target:** **48dp** (Mandatory).
    -   *Implementation:* Icons usually sit inside an `IconButton` component that applies the 12dp padding around the 24dp icon.
-   **Text Alignment:** Shift icon **down 11.5%** relative to text center for perfect optical alignment.

## 4. Optical Corrections
-   **Complex Icons:** In dense toolbars, use `Weight 300` to prevent them from looking "heavy" compared to text.
-   **Dark Mode:** Use `Grade -25` (if supported) or slightly thinner weight to counteract the "irradiation effect" where white text looks thicker on black backgrounds.

## 5. Implementation Roadmap

### 5.1 Infrastructure
-   [ ] **Font Loading:** Ensure `Material Symbols Rounded` is loaded via `next/font` or Google Fonts CSS with `&axes=FILL,GRAD,opsz,wght`.
-   [ ] **Icon Component:** Create a `<MaterialIcon />` wrapper that handles:
    -   `name`: Icon name (e.g., `search`).
    -   `filled`: Boolean (toggles font-variation-settings).
    -   `size`: Default 24.
    -   `aria-label`: Mandatory for interactive icons.

### 5.2 Audit
-   [ ] **Lucide Replacement:** Systematically replace `lucide-react` icons with `Material Symbols` for 100% adherence to MD3. (Or carefully style Lucide to match if replacement is too costly—decision required).
    -   *Recommendation:* **Replace.** Material Symbols offer the "Fill" axis which Lucide lacks, critical for the Active states.

## 6. Verification
-   **The "Squint Test":** Do icons look visually equal in weight to the neighboring text?
-   **The "Fat Finger" Test:** Can I tap the icon without triggering the adjacent one? (48dp check).
