# Dashboard Current Page Section Redesign

## Purpose
Improve the UX of the Dashboard view by cleaning up the "Jump to this page" section. It currently shows confusing data (like "extensions / Home") when the user opens the extension on an un-highlightable page, and the phrasing is misleading.

## Architecture & Components

**UI Component: `DashboardView.tsx`**
- **Conditional Rendering:** Wrap the "Current Page" section header and the corresponding `<Row />` component in a conditional check: `currentPageHighlightsCount > 0`. If 0, the section is not rendered.
- **Label Update:** Change the `.u-caps` section header text from "Jump to this page" to "Current Page" to match the Ephemeral mode's terminology.
- **Click Behavior:** Update the `<Row />`'s `onClick` handler. It should trigger navigation to the details view for the current domain.
  - Since `DashboardView` uses `react-router-dom` in the parent, we can use the `useNavigate` hook from `react-router-dom` inside `DashboardView` to navigate to `/domain/${tabContext.domain}`.

## Data Flow
No backend changes required. The `currentPageHighlightsCount` and `tabContext.domain` are already calculated and available in the component context.

## Edge Cases
- **0 Highlights on Page:** The section is completely hidden.
- **Invalid Domain/Path:** If the domain is invalid but somehow has highlights (unlikely due to backend validation), it will still render using the fallback labels.
