---
description: Step-by-step workflow for generating high-fidelity mockup images for each page of the app
---

# Mockup Generation Workflow

> Follow this workflow when creating visual mockups for any page. Do NOT skip steps.

---

## Pre-Requisites
1. Read `/design-system` workflow first — it defines the visual DNA
2. Know which page you're designing (check the sitemap)
3. Have the page specification from the design system

---

## Step 1: Define the Layout

Before generating anything, write out the layout structure:

```
Page: [Name]
Layout: [centered | sidebar | full-width]
Sections (top to bottom):
  1. Header (logo, nav, avatar)
  2. Main content (what's the focal point?)
  3. Footer (if any)
```

## Step 2: Generate Light Mode Mockup

Generate one high-fidelity mockup image with these constraints:
- **Dimensions**: 400px wide for popup, 1440px wide for full-page views
- **Font**: Inter only
- **Colors**: From approved palette
- **Style**: Clean, minimal, generous whitespace
- **Content**: Use realistic dummy data (real names, real URLs, real text)
- **No device frames** unless specifically requested

## Step 3: Present to User for Review

Show the mockup image to the user using `notify_user` with `PathsToReview`.
Wait for feedback:
- "Approved" → proceed to dark mode
- "Change X" → regenerate with changes
- "Start over" → go back to Step 1

## Step 4: Generate Dark Mode Variant

Same layout, dark mode palette. Same review process.

## Step 5: Save to Project

After approval:
1. Save images to `docs/07-design/v2/[page-name]/`
2. Name format: `[page-name]-light.png`, `[page-name]-dark.png`

## Step 6: Create HTML Prototype (Optional)

If requested, build a working HTML/CSS prototype matching the approved mockup.
Save to `docs/07-design/v2/[page-name]/[page-name]-code.html`

---

## Quality Checklist

Before presenting any mockup:
- [ ] Text is readable (contrast ≥ 4.5:1)
- [ ] Spacing follows 8px grid
- [ ] Interactive elements are visibly interactive
- [ ] Consistent with previously approved pages
- [ ] No placeholder text like "Lorem ipsum"
- [ ] Realistic data that tells a story
