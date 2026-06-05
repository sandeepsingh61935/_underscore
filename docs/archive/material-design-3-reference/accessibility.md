# Accessibility Requirements & Feature Roadmap
Based on [Material Design 3 Accessibility Guidelines](https://m3.material.io/foundations/accessibility/overview)

## 1. Core Philosophy
**"Accessibility is not a feature, it's a foundation."**
Our goal is to make `_underscore` usable by everyone, regardless of their abilities or the way they interact with the web. We follow the principle of **Universal Design**: creating one experience that works for the widest possible range of users.

## 2. Design Requirements (M3 Foundations)

### 2.1 Touch & Pointer Targets
**Requirement:** All interactive elements must have a touch target size of at least **48x48dp**.
-   **Why:** Assists users with motor impairments and those using touch interfaces.
-   **Implementation:**
    -   Ensure buttons, icon buttons, and list items meet this minimum size (even if the visual icon is smaller).
    -   Use `min-height: 48px` and `min-width: 48px` or adequate padding.

### 2.2 Color & Contrast
**Requirement:** Text and meaningful graphics must exhibit sufficient contrast against their background.
-   **Standard (WCAG AA):**
    -   Normal text: **4.5:1** minimum contrast ratio.
    -   Large text (18pt+ or 14pt bold+): **3:1** minimum.
    -   Graphics/UI components: **3:1** minimum.
-   **Implementation:**
    -   Utilize Material Design 3's **Dynamic Color** roles (e.g., `on-surface`, `on-primary`) which are algorithmically generated to ensure accessible contrast.
    -   Ensure hover/focus states maintain sufficient contrast.

### 2.3 Typography & Readability
**Requirement:** Text must be legible, scalable, and structured.
-   **Font:** Use **Roboto** (or system sans-serif) for maximum legibility.
-   **Scaling:** Support text resizing up to **200%** without functionality loss.
-   **Hierarchy:** Use semantic heading levels (`h1` -> `h2` -> `h3`) strictly for structure, not just visual styling. Do not skip levels.

### 2.4 Focus & Navigation
**Requirement:** The interface must be navigable via keyboard and assistive technologies.
-   **Focus Indicators:** All interactive elements must have a visible, high-contrast focus ring when focused via keyboard.
-   **Tab Order:** Logical tab order matching the visual flow (top-to-bottom, left-to-right).
-   **Skip Links:** Provide a "Skip to main content" link for keyboard users.

## 3. Implementation Features

### 3.1 Semantic HTML & ARIA
-   **Landmarks:** Use `<nav>`, `<main>`, `<header>`, `<footer>` to define page regions.
-   **Buttons vs. Links:** Use `<button>` for actions and `<a>` for navigation.
-   **Labels:** All inputs and buttons (especially icon-only buttons) **MUST** have an accessible label via `aria-label` or visible text.
    -   *Example:* `<button aria-label="Close menu">...</button>`

### 3.2 Component Specifics
-   **Tabs:**
    -   Use `role="tablist"`, `role="tab"`, and `role="tabpanel"`.
    -   Support arrow key navigation between tabs.
-   **Dialogs/Modals:**
    -   Trap focus within the modal when open.
    -   Return focus to the triggering element on close.
    -   Support `Escape` key to close.
-   **Lists:** Use `<ul>`/`<ol>` and `<li>` for proper grouping.

### 3.3 Writing for Accessibility
-   **Plain Language:** Use simple, clear, and concise language. Avoid jargon.
-   **Alt Text:** Provide descriptive `alt` text for all informative images. Decorative images should have `alt=""`.
-   **Error Messages:** Clear, descriptive error messages that identify the error and how to fix it.

## 4. Verification Checklist
-   [ ] **Keyboard Audit:** Can I perform all tasks using only `Tab`, `Enter`, `Space`, and arrow keys?
-   [ ] **Zoom Audit:** Does the UI break at 200% zoom?
-   [ ] **Screen Reader Test:** (e.g., using NVDA or VoiceOver) Are all interactive elements and headings announced correctly?
-   [ ] **Contrast Audit:** Do all text/background pairs pass WCAG AA? (Use a contrast checker tool).
-   [ ] **Touch Target Audit:** Are all tap targets at least 48x48px?

## 5. Roadmap
1.  **Audit Current UI:** Check `CollectionsView`, `AccountMenu`, etc., against these requirements.
2.  **Fix Touch Targets:** Ensure all buttons/inputs meet the 48dp rule.
3.  **Semantic Cleanup:** Add missing `aria-labels` and fix heading hierarchy.
4.  **Keyboard Navigation:** Implement focus trapping in modals and logical tab order.
5.  **Automated Testing:** Integrate accessibility linting (`axe-core`) into the build pipeline.
