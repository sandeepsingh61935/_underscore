# Dashboard Stats Redesign

## Purpose
Replace the hardcoded "Synced 4 devices" metric on the Dashboard with a dynamic "Total Domains" metric to provide accurate, meaningful data to the user while maintaining the existing UI grid balance.

## Architecture & Components

**UI Component: `DashboardView.tsx`**
- Locate the two-column grid at the top of the dashboard containing the `<Stat />` components.
- Keep the first column exactly as is: `<Stat label="This week" ... />`.
- Replace the second column: Remove the hardcoded "Synced" stat and replace it with a new `<Stat />` component that uses the `totalDomains` data.
  - Label: "Domains"
  - Value: `dashboardData.totalDomains`
  - Style: Retain the `mono` prop to match the existing grid aesthetic.

## Data Flow & Integration
No backend or data fetching changes are required. The `useDashboardData` hook already provides `totalDomains` via the `DashboardData` interface. The data is retrieved locally or from the synced cache depending on the active mode, and is already available in the component context.

## Edge Cases
- **Loading State**: If `dashboardData` is null or undefined (still loading), the stat value will display a fallback `'-'` character, consistent with the "This week" stat behavior.
