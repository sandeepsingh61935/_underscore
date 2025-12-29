# Walkthrough: Walk Mode Implementation (Updated)

## 1. Core Implementation
- **Walk Mode (Default)**: purely in-memory, no storage logic executed.
- **Sprint Mode (Opt-in)**: Persistent storage enabled.
- **Guard Clauses**: Added explicit `RepositoryFactory.getMode() !== 'walk'` checks to all Command classes (`CreateHighlight`, `RemoveHighlight`) to prevent accidental persistence.

## 2. UI Updates (Popup)
- **Toggle Switch**: Added a "Walk / Sprint" toggle in the popup header.
- **Live Switching**: Toggling modes instantly updates the active tab's behavior.
    - **Walk -> Sprint**: Restores persistent highlights.
    - **Sprint -> Walk**: Clears screen (Incognito feel).

## 3. Verification
- **Build**: Success (1.9s).
- **Leak Fix**: `StorageService` is no longer called during Walk Mode operations.
- **Safety**: `Box` mode logic ensures user data isn't accidentally saved in incognito mode.

## User Instructions
1.  **Reload Extension**: Updates will apply immediately.
2.  **Default State**: You are now in **Walk Mode** (Incognito).
3.  **To Save**: Open popup -> Toggle switch to **Sprint Mode**.
