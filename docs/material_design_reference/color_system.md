# Color System Requirements
Based on [Material Design 3 Color System](https://m3.material.io/styles/color/system/overview)

## 1. Core Philosophy
**"Accessible, Personal, and Systematic."**
Color in MD3 is not just about aesthetics; it's a generated system ensuring contrast and harmony. It relies on the **HCT** (Hue, Chroma, Tone) color space.

## 2. Key Color Roles
The system is generated from **1 Source Color** (or 5 Key Colors).

### 2.1 The 5 Key Colors
1.  **Primary:** High-emphasis, key actions (FAB, Active States).
2.  **Secondary:** Less prominent, varying tonal quality (Filter chips).
3.  **Tertiary:** Contrasting accents, balancing the Primary (Highlights).
4.  **Neutral:** Backgrounds and Surfaces.
5.  **Neutral Variant:** Outlines and Dividers.

### 2.2 Tonal Palettes (0-100)
Each Key Color generates a palette of 13 tones (0, 10, 20... 90, 95, 99, 100).
-   **Tone 0:** Pure Black.
-   **Tone 100:** Pure White.
-   **Role Mapping:**
    -   *Primary Container:* Tone 90 (Light) / Tone 30 (Dark).
    -   *On Primary Container:* Tone 10 (Light) / Tone 90 (Dark).

## 3. Surface Containers (The New Standard)
MD3 replaces opacity-based elevation with dedicated "Surface Container" roles.

| Role | Tone (Light) | Tone (Dark) | Usage |
| :--- | :--- | :--- | :--- |
| **Surface** | 98 | 6 | The canvas/body background. |
| **Surface Dim** | 87 | 6 | Obscured content. |
| **Container Lowest** | 100 | 4 | Sidebar / Navigation Rail. |
| **Container Low** | 96 | 10 | Cards (Low elevation). |
| **Container** | 94 | 12 | **Default Card / Modal.** |
| **Container High** | 92 | 17 | Dialogs / Floating Sheets. |
| **Container Highest** | 90 | 22 | Date Pickers / Input Fields. |

## 4. Dynamic Color Strategy
Since `_underscore` is a web extension, we simulate dynamic color.

### 4.1 Source Color
-   **Default:** Underscore Blue (`#5b8db9`).
-   **User Choice:** Settings allow picking a new "Seed Color".
-   **Algorithm:** We use `@material/material-color-utilities` to generate the full Tonal Palette from the Seed.

### 4.2 Semantic Mapping (Tailwind)
We must map strict semantic names to CSS variables.
-   `bg-surface` -> `var(--md-sys-color-surface)`
-   `bg-surface-container` -> `var(--md-sys-color-surface-container)`
-   `text-on-surface` -> `var(--md-sys-color-on-surface)`

## 5. Implementation Roadmap

### 5.1 Infrastructure
-   [ ] **Theme Generator:** Create a utility `generateTheme(hex)` using Google's library.
-   [ ] **CSS Variable Injection:** A context provider that writes these 65+ variables to the `:root` (or scope).

### 5.2 Refactoring
-   [ ] **Surface Audit:** Replace all `bg-white` or `bg-gray-X` with `bg-surface-container-X`.
-   [ ] **Text Audit:** Replace `text-gray-900` with `text-on-surface`.

## 6. Verification
-   **Contract Ratio Check:** Does `on-primary` meet 4.5:1 against `primary`? (The algorithm guarantees this, but we must verify our mapping).
-   **Dark Mode Test:** Switching to Dark Mode should effectively "invert" the tones (90 -> 30) without changing the hue.
