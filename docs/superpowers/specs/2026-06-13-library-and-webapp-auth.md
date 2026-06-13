# PRD: Library Navigation & Web App Auth

## 1. Overview
This document outlines the architecture and implementation steps for two major workflow resolutions:
1. **Library List Navigation:** Grouping domains by their true base domain (eTLD+1) and allowing users to customize section labels.
2. **Web App Auth & Routing:** Replacing the mock authentication in the Web App with real Supabase Auth flows, and ensuring seamless mode transitions after OAuth redirects.

---

## 2. Feature 1: Library List Navigation (eTLD+1 & Editable Sections)

### 2.1 eTLD+1 Domain Grouping
- **Parsing:** Install and utilize the `tldts` library to accurately extract the eTLD+1 (base domain) from URLs (e.g., `amazon.co.uk`).
- **Aggregation:** Update the `useCollections` hook so that it groups entries by their eTLD+1 instead of their raw hostname. All subdomains (e.g., `store.amazon.in`, `smile.amazon.in`) will merge into the `amazon.in` row in the Library tab.

### 2.2 Section Keys & Subdomain Handling
- **Section Keys:** Inside the Domain Details view, the section keys must include the subdomain (if it exists and is not `www`) to prevent collisions.
  - *Example Format:* `store · /laptops/asus`
- **UI:** The base domain is shown as the primary title in the library list, while the section lists will use the subdomain as a prefix.

### 2.3 Editable Section Labels
- **UX:** Add a subtle "Edit" button (or pencil icon) that appears on hover/focus next to the section row in the `DomainDetailsView`. Clicking it will open an inline input or modal to rename the section.
- **Storage:** Implement a Dual-Storage approach for the custom `section_labels` mapping:
  - **Local:** Save to IndexedDB (for Ephemeral/Local mode).
  - **Cloud:** Add a `section_labels` table to Supabase and sync it (for Cloud/AI mode), matching the highlight sync architecture.

---

## 3. Feature 2: Web App Auth & Routing

### 3.1 Google OAuth Flow (Full Page Redirect)
- **Implementation:** Replace the fake `login()` timeout in `SignInView.tsx` with Supabase's `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })`.
- **Behavior:** This will trigger a full page redirect to Google and back to the web app.

### 3.2 Resuming Intent (State Recovery)
- **Problem:** When `useModeTransition` intercepts a user trying to enter Cloud mode and redirects them to `/sign-in`, a full page OAuth redirect clears the React state.
- **Solution:** Pass the `intendedMode` (e.g., `?intendedMode=cloud`) to the OAuth `redirectTo` URL.
- **Resumption:** When the user lands back on the web app and the Supabase session is established, intercept the URL parameter and automatically execute `setMode('cloud')`, dropping them straight into the Library.

### 3.3 Email & Password Support
- **Implementation:** Wire up the existing Email and Password form in `SignInView.tsx` to use Supabase's `signInWithPassword` and `signUp` methods.
- **Behavior:** This allows users an alternative to Google OAuth without requiring a full page redirect, providing immediate state resumption.

---

## 4. Next Steps
- Review this PRD.
- Once approved, we will transition to the implementation phase, creating the specific implementation tasks to execute via Subagent-Driven Development.
