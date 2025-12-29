# Future Enhancements

## 1. Sprint Mode Persistence (Whitelist)
**Status**: Planned / Deferral from Walk Mode Analysis
**Description**: Allow users to opt-in to persistence ("Sprint Mode") for specific websites while keeping "Walk Mode" as the global default.
**Mechanism**:
- User Settings: `persistenceWhitelist: string[]`
- Logic:
  ```typescript
  if (whitelist.includes(location.hostname)) {
      enablePersistence();
  }
  ```

## 2. Vault Mode (Long Term)
**Status**: Planned
**Description**: Full historical archive of all highlights, sync across devices, semantic search.
**Tech Stack**: Event Sourcing, Remote Database.

## 3. Gen Mode (Concept)
**Status**: Conceptual
**Description**: Generative AI integration for analyzing highlighted content.
