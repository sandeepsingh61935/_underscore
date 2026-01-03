# Hover Delete Icon - Architecture Flow

## System Overview

```mermaid
graph TB
    subgraph "Highlight Creation Flow"
        A[User Double-Clicks Text] --> B[SelectionDetector]
        B --> C[EventBus: SELECTION_DETECTED]
        C --> D[Content.ts Handler]
        D --> E[Mode.createHighlight]
        E --> F1[CSS.highlights.set underscore-id]
        E --> F2[mode.highlights.set id]
        E --> F3[mode.data.set id]
        E --> F4[repository.add data]

        F4 --> G[RepositoryFacade.add]
        G --> H[cache.set id, data]
        G --> I[repository.add async]

        style F4 fill:#f99
        style H fill:#f99
    end

    subgraph "Hover Detection Flow - CURRENT ISSUE"
        J[Mouse Moves] --> K[HighlightHoverDetector throttle 50ms]
        K --> L[repositoryFacade.getAll]
        L --> M{cache.size?}
        M -->|0 - EMPTY| N[No highlights found]
        M -->|> 0| O[For each highlight]

        O --> P[CSS.highlights.get underscore-id]
        P --> Q{Found?}
        Q -->|No| N
        Q -->|Yes| R[range.getClientRects]
        R --> S{Point inside rect?}
        S -->|No| N
        S -->|Yes| T[emit highlight:hover:start]

        style L fill:#f99
        style M fill:#f99
        style N fill:#f99
    end

    subgraph "Delete Icon Display Flow - NOT REACHED"
        T --> U[DeleteIconOverlay.showIcon]
        U --> V[Create button element]
        V --> W[Position at rect.top-right]
        W --> X[Append to document.body]
        X --> Y[Icon Visible]

        style U fill:#ccc
        style Y fill:#ccc
    end
```

## The Critical Bug

```mermaid
flowchart LR
    subgraph "What SHOULD Happen"
        A1[Mode.createHighlight] --> B1[repository.add]
        B1 --> C1[cache.set id, data]
        C1 --> D1[cache.size = 1+]
        D1 --> E1[getAll returns data]
    end

    subgraph "What ACTUALLY Happens"
        A2[Mode.createHighlight] --> B2[repository.add called]
        B2 --> C2[cache.set ???]
        C2 --> D2[cache.size = 0]
        D2 --> E2[getAll returns EMPTY]
    end

    style D2 fill:#f99
    style E2 fill:#f99
```

## Data Flow - 3 Storage Layers

```mermaid
graph TD
    subgraph "Layer 1: Browser DOM"
        CSS[CSS.highlights Map]
        CSS --> |underscore-id| HL[Highlight with Range objects]
    end

    subgraph "Layer 2: Mode State - In Memory"
        MODE1[mode.highlights Map]
        MODE2[mode.data Map]
        MODE1 --> |id| NATIVE[Native Highlight]
        MODE2 --> |id| DATA[HighlightDataV2]
    end

    subgraph "Layer 3: Repository Cache - BROKEN"
        CACHE[repositoryFacade.cache Map]
        CACHE --> |id| CACHED[HighlightDataV2]
        COUNT[cache.size = 0]
    end

    subgraph "Layer 4: Persistent Storage"
        STORE[chrome.storage.local]
        STORE --> STORED[Serialized Data]
    end

    CSS -.->|Should match| MODE1
    MODE2 -.->|Should populate| CACHE

    style COUNT fill:#f99
    style CACHE fill:#f99
```

## Current System State

| Component                  | Status         | Count                                          |
| -------------------------- | -------------- | ---------------------------------------------- |
| **CSS.highlights**         | ✅ Working     | 7 entries (both `hl-*` and `underscore-*`)     |
| **Mode.data**              | ✅ Working     | Same count as CSS                              |
| **RepositoryFacade.cache** | ❌ **BROKEN**  | **0 entries**                                  |
| **chrome.storage.local**   | ✅ Working     | Restored on reload                             |
| **Hover Detector**         | ❌ Blocked     | Can't find highlights (reads from empty cache) |
| **Delete Icon**            | ❌ Never shown | Hover detector never fires events              |

## Root Cause Hypothesis

**Problem**: `repository.add()` is called but `cache` remains empty

**Possible Causes**:

1. **Different instance**: Hover detector uses different `repositoryFacade`
   instance?
2. **Cache cleared**: Something clears cache after initialization?
3. **Restore bug**: Highlights restored to CSS/Mode but NOT to repository cache?
4. **Async race**: Cache.set() happens but then gets wiped?

## Next Debugging Steps

```mermaid
flowchart LR
    A[Add console.log to repository.add] --> B[Create new highlight]
    B --> C{See REPO-DEBUG logs?}
    C -->|No| D[repository.add NOT called]
    C -->|Yes| E{Cache size increases?}
    E -->|No| F[cache.set failing OR different instance]
    E -->|Yes| G{getAll returns highlights?}
    G -->|No| H[Different repositoryFacade instance!]
    G -->|Yes| I[Bug fixed!]
```

## Expected Flow After Fix

```mermaid
sequenceDiagram
    participant User
    participant Mouse
    participant HoverDetector
    participant Repository
    participant CSS
    participant DeleteIcon

    User->>Mouse: Move over highlight
    Mouse->>HoverDetector: mousemove event
    HoverDetector->>Repository: getAll()
    Repository-->>HoverDetector: [highlight1, highlight2, ...]
    HoverDetector->>CSS: highlights.get("underscore-id")
    CSS-->>HoverDetector: Highlight with Ranges
    HoverDetector->>HoverDetector: Check point in rects
    HoverDetector->>DeleteIcon: emit("highlight:hover:start", {id, rect})
    DeleteIcon->>DeleteIcon: showIcon(id, rect)
    DeleteIcon->>User: 🗑️ Icon appears!
```
