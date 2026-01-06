# ADR 004: Separate Event Sourcing from Vault Mode

## Status
Accepted

## Context
The codebase currently mixes two persistence strategies:
1. **Event Sourcing** (Append-only log of actions like `highlight.created`) - Used by Sprint Mode
2. **Repository Pattern** (CRUD operations on entities) - Used by Vault Mode

This mixing occurred because Vault Mode was initially built on top of the existing Sprint Mode infrastructure. Now that Vault Mode has full cloud sync via `DualWriteRepository`, maintaining event sourcing for it is:
- **Redundant**: We write to both repository and event log
- **Conflicting**: Reloading the page replays events which wipes repository state
- **Complex**: Debugging requires checking two different storage locations

## Decision
We will enforce a strict separation of concerns:

### 1. Sprint Mode = Event Sourcing ONLY
- Uses `StorageService` to log events (`saveEvent`)
- Restores state by replaying events (`loadEvents`)
- Ideal for session-based, ephemeral workflows

### 2. Vault Mode = Repository Pattern ONLY
- Uses `IHighlightRepository` for persistence
- **NO** event logging (`saveEvent` removed)
- **NO** event replay (`loadEvents` skipped)
- Uses `DualWriteRepository` to sync local cache and cloud
- Ideal for long-term, cross-device persistence

## Consequences
- `VaultModeService` will no longer depend on `IndexedDBStorage` for event logging.
- `content.ts` must explicitly skip `restoreHighlights()` (event replay) when in Vault Mode.
- `StorageService` can be optimized purely for ephemeral sprint data.
- Debugging Vault Mode becomes simpler: "What is in the repository?" is the only question.

## Implementation Strategy
1. Remove `saveEvent()` calls from `VaultModeService`
2. Remove `IndexedDBStorage` dependency from `VaultModeService`
3. Ensure `content.ts` skips restoration for Vault Mode
4. Clean up unused Vault-related event types
