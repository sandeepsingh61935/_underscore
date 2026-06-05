# Typography System Requirements
Based on [Material Design 3 Typography](https://m3.material.io/styles/typography/overview)

## 1. Core Philosophy
**"Readable, Systematic, and Hierarchy-Driven."**
Typography in MD3 uses a set of 15 styles ("Tokens") to ensure clear hierarchy. We do not use arbitrary font sizes; we stick to the Scale.

## 2. Typeface
**Primary:** [Roboto](https://fonts.google.com/specimen/Roboto)
-   **Weights:**
    -   Regular (400) - For Body, Label Large, Headline.
    -   Medium (500) - For Label Medium/Small, Title.
    -   Bold (700) - *Rarely used in MD3*, mostly for Emphasis within body text.

## 3. The Type Scale (15 Tokens)

### 3.1 Display (Hero / Jumbo)
*Used for: Splash screens, Very large numbers.*
-   **Display Large:** 57sp / 64dp Line Height
-   **Display Medium:** 45sp / 52dp
-   **Display Small:** 36sp / 44dp

### 3.2 Headline (Page Titles)
*Used for: Screen titles, Section headers.*
-   **Headline Large:** 32sp / 40dp
-   **Headline Medium:** 28sp / 36dp
-   **Headline Small:** 24sp / 32dp

### 3.3 Title (Section / Card Titles)
*Used for: Card headers, Dialog titles, Sub-sections.*
-   **Title Large:** 22sp / 28dp (Regular 400)
-   **Title Medium:** 16sp / 24dp (Medium 500)
-   **Title Small:** 14sp / 20dp (Medium 500)

### 3.4 Label (UI Elements)
*Used for: Buttons, Chips, Captions.*
-   **Label Large:** 14sp / 20dp (Medium 500) - *Standard Buttons*
-   **Label Medium:** 12sp / 16dp (Medium 500)
-   **Label Small:** 11sp / 16dp (Medium 500)

### 3.5 Body (Long-form)
*Used for: Paragraphs, Descriptions.*
-   **Body Large:** 16sp / 24dp (Regular 400)
-   **Body Medium:** 14sp / 20dp (Regular 400) - *Default Text*
-   **Body Small:** 12sp / 16dp (Regular 400)

## 4. Implementation Roadmap

### 4.1 Tailwind Config
Map these exact size/weight/line-height combinations to a `typography` plugin or utility classes.
-   `.text-display-large`
-   `.text-headline-small`
-   `.text-body-medium` (Default)

### 4.2 Audit
-   [ ] **Font Import:** Ensure Roboto 400 and 500 are loaded.
-   [ ] **Buttons:** Force `text-label-large`.
-   [ ] **Cards:** Title = `text-title-medium`, Body = `text-body-medium`.
-   [ ] **Headings:** Replace random `text-2xl font-bold` with proper `text-headline-*` classes.

## 5. Verification
-   **Visual Hierarchy:** Can I distinguish the Title from the Body without bold text? (Size/Line Height should do the work).
-   **Button Text:** Is it purely 14sp Medium? (Not Bold, Not 16sp).
