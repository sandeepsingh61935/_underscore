# ADR-020: `IDataProvider` Is a Live Seam — Keep

**Status**: Accepted
**Date**: 2026-06-18
**Deciders**: Development Team

---

## Context

The original architecture review (plan file line 154) flagged `src/shared/interfaces/i-data-provider.ts` (171 bytes, single-method interface) as a "hypothetical seam with no payoff" and listed it for deletion under investigation item 13.

`IDataProvider` is a one-method contract:

```ts
export interface IDataProvider {
  getCollections(mode: string): Promise<DomainCollection[]>;
}
```

## Investigation (2026-06-18)

`IDataProvider` has four live consumers:

- `src/core/context/AppProvider.tsx` — consumes via context.
- `src/core/context/PopupAppProvider.tsx` — consumes via context.
- `src/core/data/ExtensionDataProviderAdapter.ts` — production implementation (chrome.runtime IPC).
- `src/core/data/WebDataProviderAdapter.ts` — web app implementation (REST API).

The interface enables the popup and web app to share a single component tree (`CollectionsView`) while binding to different data sources. This is the **same pattern** previously applied to highlight repositories (`IHighlightRepository` split into `IWritable` and `IReadable`): narrow interface, two adapters (extension + web), shared UI.

## Decision

**Keep `IDataProvider`.** It is not a hypothetical seam — it is the boundary that lets the same React components render against either the extension or the web app data layer. Deletion would force the popup to import the chrome-specific adapter directly, breaking the web app shell.

### Alternatives considered

- **Delete `IDataProvider` and inline `ExtensionDataProviderAdapter` into `AppProvider`**: rejected because the web app shell (`PopupAppProvider` already imports `IDataProvider` from the same seam) would need its own copy of the adapter, doubling the code.
- **Replace with a higher-level interface that includes auth state, mode, and other context concerns**: rejected as YAGNI. The current single-method contract is enough; adding more would re-introduce the same "hypothetical seam" critique.

## Consequences

### Positive

- One source of truth for the popup/web component tree's data dependency.
- New data sources (e.g. a desktop CLI client) can implement `IDataProvider` without changing components.

### Negative

- The interface is genuinely narrow. A reviewer who reads only the interface file may misjudge it as a placeholder.

### Neutral

- Future ADRs may extend `IDataProvider` if new shared methods emerge. Until then, the narrow shape is intentional.

---

## References

- Original plan: `/home/sandy/.claude/plans/explore-the-codebase-deeply-velvety-sundae.md` (line 154)
- Sister decision (predates ADR record-keeping): `IHighlightRepository` split into `IWritable` and `IReadable`
- `src/shared/interfaces/i-data-provider.ts`
- `src/core/data/ExtensionDataProviderAdapter.ts`
- `src/core/data/WebDataProviderAdapter.ts`

---

## Revision History

| Date       | Author | Changes      |
| ---------- | ------ | ------------ |
| 2026-06-18 | Claude | Accepted. Keep decision recorded with four live consumers and an Adapter pattern parallel to the `IHighlightRepository` writable/readable split. |
