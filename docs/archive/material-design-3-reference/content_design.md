# Content Design & UX Writing Requirements
Based on [Material Design 3 Content Design](https://m3.material.io/foundations/content-design/overview)

## 1. Core Philosophy
**"Clear, concise, and useful."**
Content is not just filler; it's a core part of the design. Every word should serve a purpose, guiding the user to achieve their goals with minimal friction.

## 2. Global Writing Standards

### 2.1 Tone & Voice
-   **Direct & Neutral:** Focus on the action and result. Avoid forced personality or robot-speak.
    -   *Bad:* "Oops! We faced a boo-boo saving your underscore."
    -   *Good:* "Could not save underscore. Please try again."
-   **Concise:** Use the fewest words possible without losing meaning.
-   **Present Tense:** Describe product behavior in the now.
    -   *Bad:* "The underscore will be saved to your collection."
    -   *Good:* "Saves underscore to collection."

### 2.2 Formatting
-   **Sentence Case:** Capitalize only the first letter of the first word for **Headings, Buttons, Menu Items, and Labels**.
    -   *Correct:* "Create new collection"
    -   *Incorrect:* "Create New Collection"
-   **No Periods in Fragments:** Don't use punctuation for labels, buttons, or bullet points that aren't full sentences.

## 3. Accessibility & Inclusivity

### 3.1 Alt Text
**Requirement:** All informative images needing `alt` text must follow MD3 guidelines.
-   **Concise:** < 125 characters.
-   **No Redundancy:** Don't start with "Image of..." or "Picture of...".
-   **Contextual:** Describe the *function* or *meaning*, not just the visual pixels.
    -   *Bad:* "Magnifying glass icon"
    -   *Good:* "Search collections"

### 3.2 Global Writing
-   **Avoid Idioms:** Use plain English that is easy to translate (e.g., avoid "under the hood" or "ballpark figure").
-   **Limit Abbreviations:** Spell out "for example" instead of "e.g.".

## 4. Component Specifics

### 4.1 Notifications
-   **Headline:** Brief summary (< 40 chars).
-   **Content:** Supporting info.
-   **Actions:** Clear verbs (e.g., "Reply", "Archive").
-   **Timing:** Only notify for actionable or time-sensitive events.

### 4.2 Empty States
-   **Structure:**
    1.  **Image:** Neutral, non-distracting illustration.
    2.  **Headline:** "No collections yet" (State the fact).
    3.  **Body:** "Create a collection to organize your underscores" (Explain the benefit/action).
    4.  **Action:** "Create collection" button.

### 4.3 Error Messages
-   **Format:** [What happened] + [Why (if helpful)] + [How to fix].
    -   *Example:* "No internet connection. Check your network and try again."

## 5. Implementation Roadmap for `_underscore`

### 5.1 Content Audit
-   [ ] **Review all buttons/labels:** Convert to Sentence Case.
-   [ ] **Review Empty States:** Ensure they follow the [Image + Headline + Body + Action] structure.
-   [ ] **Alt Text Audit:** Check all icons/images for meaningful `aria-label` or `alt` text.

### 5.2 Standardization
-   [ ] Create a `constants/strings.ts` file to centralize UI text and ensure consistency (and prepare for i18n).
-   [ ] Update "Sign In" / "Sign Out" usage (vs Login/Logout) for consistency.

## 6. Verification Checklist
-   [ ] Is all UI text in Sentence Case?
-   [ ] Are error messages helpful and actionable?
-   [ ] Do all icons have proper descriptions (or `aria-hidden` if decorative)?
-   [ ] Is the tone consistent across all views?
