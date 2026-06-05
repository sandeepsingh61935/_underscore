# Customization & Branding Strategy
Based on [Material Design 3 Customization](https://m3.material.io/foundations/customization)

## 1. Core Philosophy
**"Expressive, Personal, and Adaptive."**
Material Design 3 (Material You) isn't just about Google's brand; it's a framework for expressing *your* brand while allowing users to feel at home via personalization. The system rests on three pillars: **Color**, **Typography**, and **Shape**.

## 2. Theming Subsystems

### 2.1 Color (Dynamic & Brand)
-   **Dynamic Color:** Uses the user's wallpaper/system preferences to generate a cohesive 65-color tonal palette.
    -   *Strategy for `_underscore`:* Since this is a web extension, fully dynamic wallpaper extraction isn't feasible efficiently. Instead, we support **User-Selected Seed Colors** (Blue, Green, Purple, etc.) that regenerate the entire theme at runtime.
-   **Brand Integration:**
    -   **Primary Brand Color:** `#5b8db9` (Underscore Blue).
    -   *Implementation:* This serves as the default "seed" color. Users can override this, but the brand identity remains in the logo and specific semantic colors.

### 2.2 Shape Scale
**Requirement:** Consistent corner rounding to define the "feel."
-   **Current Strategy:**
    -   **Cards:** `rounded-md` (12dp) -> Friendly but structured.
    -   **Buttons:** `rounded-full` (Pill) -> High interactive affordance.
    -   **Inputs:** `rounded-md` (4dp-12dp) -> Aligned with cards.
-   **Customization:** We stick to the **Rounded** family relative to size (larger element = larger radius).

### 2.3 Typography
-   **Font:** **Roboto** (Standard MD3).
-   **Scale:** Standard MD3 Typescale (15 tokens).
-   **Customization:**
    -   *Headings:* Light weight (300/400) for a modern, airy feel.
    -   *Labels:* Medium weight (500) for legibility.

## 3. Implementation Features

### 3.1 Theme Builder
**Goal:** Empower users to make the app "theirs."
-   **Feature:** **Seed Color Picker** in settings.
    -   Options: *Brand Blue* (Default), *Emerald*, *Violet*, *Orange*, *Neutral*.
    -   Action: Selecting a color regenerates the logic for `primary`, `secondary`, `tertiary`, and `surface-container` variables.
-   **Feature:** **Density Toggle** (from Inclusive Design) acts as a layout customizer.

### 3.2 Component Overrides
**Principle:** Components should adapt to the theme, not fight it.
-   **Buttons:** Always inherit `bg-primary`, `text-on-primary`.
-   **Cards:** Always `bg-surface-container-highest` (or equivalent token).
-   *Avoid:* Hardcoding hex values like `bg-[#5b8db9]`. Always use `bg-primary`.

## 4. Verification Compliance
To ensure true customizability:
-   [ ] **Hardcoded Value Audit:** `grep` codebase for hex codes. Replace with Tailwind utility classes mapping to CSS variables.
-   [ ] **Theme Token Audit:** Ensure all semantic tokens (`primary`, `on-primary`, `surface-variant`) are defined in `tailwind.config.ts`.
-   [ ] **Contrast Check:** When changing seed colors, does the algorithm ensure WCAG AA contrast for generated palettes?

## 5. Roadmap
1.  **Refactor Colors:** Remove specific hex codes from components; use semantic variable names.
2.  **Theme Engine:** Create a `ThemeContext` that accepts a "Seed Color" and calculates the palette (using `@material/material-color-utilities`).
3.  **Settings UI:** Add the "Appearance" section to Account Menu with Color and Density pickers.
