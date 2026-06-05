# Inclusive Design & Co-Design Requirements
Based on [Material Design 3 Building for All](https://m3.material.io/foundations/building-for-all/overview)

## 1. Core Philosophy
**"Build with, not just for."**
Inclusive design moves beyond compliance ("does it pass WCAG?") to providing a delightful, equitable experience for people with diverse needs, backgrounds, and contexts. It emphasizes **Co-creation** and **Recognizing Exclusion**.

## 2. Key Principles

### 2.1 Honor Individuals
**Requirement:** Don't force a "one size fits all" experience. Empower users to customize the UI to their needs.
-   **Implementation:**
    -   **Density Controls:** Allow users to choose between Compact, Comfortable, and Spacious densities (influencing list heights/spacing).
    -   **Motion preferences:** Respect `prefers-reduced-motion` strictly.
    -   **Theme override:** Allow forcing Light/Dark mode regardless of system setting (Already done ✅).

### 2.2 Learn Before, Not After (Co-Design)
**Requirement:** Engage with diverse perspectives early in the design process.
-   **Strategy:**
    -   Identify "edge case" users (e.g., power keyboard users, high-contrast needs) and treat them as core personas.
    -   **Situational Challenges:** Design for someone holding a baby (one-handed use), in bright sunlight (high contrast), or in a library (silent/captioned interactions).

## 3. User Needs Pillars

### 3.1 Cognitive Load & Focus
-   **Principle:** Minimize distractions to support users with ADHD or cognitive fatigue.
-   **Feature:** **"Focus Mode"** toggle that hides non-essential UI (badges, decorative graphics) and simplifies the layout to just the core task.

### 3.2 Motor & Inputs
-   **Principle:** Support various input methods equally (Touch, Mouse, Keyboard, Voice).
-   **Feature:** **Keyboard-First Design**. Ensure every action (e.g., archiving an underscore) has a memorable hotkey, not just a mouse click.
-   **Feature:** Large, forgiving click areas (48dp+) for those with tremors or using specialized pointing devices.

### 3.3 Visual Variance
-   **Principle:** Support effective use for Low Vision, Color Blindness, and Photosensitivity.
-   **Feature:** **High Contrast Mode** toggle (separate from Dark Mode) that uses pure black/white and thick borders.
-   **Feature:** Color-blind safe palettes for status indicators (don't rely on Red/Green alone; use icons + text).

## 4. Implementation Strategy for `_underscore`

### 4.1 Immediate Actions
-   [ ] **Density Toggle:** Add a "Density" setting in Account Menu to switch between `h-14` (default) and `h-10` (compact) list items.
-   [ ] **Keyboard Shortcuts Panel:** Add a visible "Keyboard Shortcuts" help modal (`?` key).
-   [ ] **Reduced Motion Support:** Wrap animations in a `useReducedMotion` check.

### 4.2 Long-term Roadmap
-   [ ] **User feedback loop:** Create a direct "Feedback" channel in the app specifically asking for accessibility/usability barriers.
-   [ ] **One-handed mobile mode:** Ensure critical navigation is reachable at the bottom of the screen on mobile layouts.

## 5. Verification
-   **The "One Hand" Test:** Can I use the app while holding a coffee?
-   **The "Sunlight" Test:** Is it readable outdoors?
-   **The "No Mouse" Test:** Can I do everything with just a keyboard?
