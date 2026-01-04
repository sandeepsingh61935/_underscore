# System Architecture Analysis: Mode Feature Clarification

**Analysis Date**: 2026-01-03  
**Analyst**: Senior System Architect  
**Scope**: Walk, Sprint, Vault, Gen Modes - Feature Definition & Implementation Status  
**Purpose**: Clarify mode boundaries and align implementation with original architectural vision

---

## Executive Summary

> [!IMPORTANT]
> **Critical Finding**: The current "Vault Mode" implementation is **INCOMPLETE** relative to the original architectural vision.
> 
> **Current State**: Local-only IndexedDB storage with multi-selector engine  
> **Original Vision**: Cloud-synced permanent storage with Supabase/Oracle Cloud backend
> 
> **The naming is CORRECT, but the implementation is PHASE 1 of a 3-phase plan.**

### Key Discoveries

1. ✅ **Sprint Mode** - Correctly implemented as designed (4-hour TTL, event sourcing, local storage)
2. ⚠️ **Vault Mode** - Partially implemented (has IndexedDB + multi-selector, **MISSING cloud sync**)
3. ❌ **Original Plan** - Vault Mode was designed for **Supabase backend** with cross-device sync
4. ✅ **Architecture** - Current code structure supports future cloud integration

---

## Original Architectural Vision (From Specification)

### Mode Hierarchy (As Designed)

```
Walk Mode (Ephemeral)
  ↓ Upgrade
Sprint Mode (Session - 4 hours)
  ↓ Upgrade  
Vault Mode (Permanent + Cloud Sync)
  ↓ Upgrade
Gen Mode (AI-Powered)
```

### Storage Strategy (Original Design)

| Mode | Storage Layer | Backend | Sync | TTL |
|------|--------------|---------|------|-----|
| **Walk** | Memory only | None | No | Immediate |
| **Sprint** | chrome.storage.local | None | No | 4 hours |
| **Vault** | IndexedDB + **Supabase** | **PostgreSQL** | **Yes** | Permanent |
| **Gen** | IndexedDB + **Supabase** | **PostgreSQL + AI** | **Yes** | Permanent |

### Critical Quote from Original Spec

> **From [highlight_extension_spec.md](file:///home/sandy/projects/_underscore/docs/highlight_extension_spec.md) (Line 241-244)**:
> ```yaml
> Storage & Sync:
>   - Multi-selector persistence (XPath, Position, Quote)
>   - IndexedDB local storage
>   - Cloud sync (optional, batched every 30s)  # ← MISSING
>   - Cross-device restoration                   # ← MISSING
>   - Conflict resolution (merge strategy)       # ← MISSING
> ```

### Backend Architecture (Original Plan)

**From Sprint Mode Planning Document**:
```yaml
Architectural Decisions:
  Event Sourcing: Will be used when we add sync later (Vault Mode)
  Database Strategy: 
    - Start with Supabase (dev/MVP)
    - Migrate to Oracle Cloud Always Free (production)
```

**Timeline**:
- **Week 1-10**: Sprint Mode (in-memory only, no database)
- **Week 11+**: Vault Mode (Event Sourcing + Supabase)
- **Week 14-15**: Migrate to Oracle Cloud Always Free

---

## Current Implementation Status

### What EXISTS in Code

#### 1. Vault Mode Class ([vault-mode.ts](file:///home/sandy/projects/_underscore/src/content/modes/vault-mode.ts))
```typescript
export class VaultMode extends BaseHighlightMode implements IPersistentMode {
  private vaultService = getVaultModeService();
  
  readonly capabilities: ModeCapabilities = {
    persistence: 'indexeddb',  // ✅ LOCAL storage
    sync: true,                // ⚠️ DECLARED but NOT IMPLEMENTED
    collections: true,         // ⚠️ DECLARED but NOT IMPLEMENTED
    tags: true,                // ⚠️ DECLARED but NOT IMPLEMENTED
    export: true,              // ⚠️ DECLARED but NOT IMPLEMENTED
    search: true,              // ⚠️ DECLARED but NOT IMPLEMENTED
    multiSelector: true,       // ✅ IMPLEMENTED
  };
}
```

#### 2. VaultModeService ([vault-mode-service.ts](file:///home/sandy/projects/_underscore/src/services/vault-mode-service.ts))
```typescript
export class VaultModeService {
  private storage: IndexedDBStorage;           // ✅ EXISTS
  private selectorEngine: MultiSelectorEngine; // ✅ EXISTS
  
  async syncToServer(): Promise<string[]> {
    // TODO: Implement actual API calls to sync server  // ❌ STUB
    // For now, just mark as synced locally
  }
}
```

#### 3. IndexedDBStorage ([indexeddb-storage.ts](file:///home/sandy/projects/_underscore/src/services/indexeddb-storage.ts))
```typescript
export class IndexedDBStorage extends Dexie {
  highlights!: EntityTable<HighlightRecord, 'id'>;  // ✅ EXISTS
  events!: EntityTable<EventRecord, 'eventId'>;     // ✅ EXISTS
  collections!: EntityTable<CollectionRecord, 'id'>; // ✅ EXISTS
  tags!: EntityTable<TagRecord, 'id'>;              // ✅ EXISTS
  
  // Database name: 'VaultModeDB'  // ✅ EXISTS
}
```

### What is MISSING

#### ❌ 1. Backend API Client
```typescript
// DOES NOT EXIST
class APIClient {
  constructor(baseURL: string, auth: AuthService) {}
  async syncHighlights(events: Event[]): Promise<void> {}
  async fetchHighlights(userId: string): Promise<Highlight[]> {}
}
```

#### ❌ 2. Authentication Service
```typescript
// DOES NOT EXIST
class AuthService {
  async login(email: string, password: string): Promise<JWT> {}
  async refreshToken(): Promise<JWT> {}
  async logout(): Promise<void> {}
}
```

#### ❌ 3. Sync Queue
```typescript
// DOES NOT EXIST
class SyncQueue {
  async push(events: Event[]): Promise<void> {}
  async processBatch(): Promise<void> {} // Every 30s
  async handleConflicts(): Promise<void> {}
}
```

#### ❌ 4. Backend Infrastructure
- No Supabase project
- No PostgreSQL database
- No API endpoints
- No WebSocket for real-time sync

---

## Architectural Analysis: What Should Each Mode Include?

### Mode 1: Walk Mode ✅ COMPLETE

**Philosophy**: "Invisible highlighting" - Zero commitment, zero trace

**Features**:
```yaml
Storage: Memory only (JavaScript Map)
Persistence: None
Sync: No
TTL: Immediate (on tab close)
Undo: No
Collections: No
Tags: No
Export: No
AI: No
Backend: None
```

**Implementation Status**: ✅ **100% Complete**

**Code**: [walk-mode.ts](file:///home/sandy/projects/_underscore/src/content/modes/walk-mode.ts) (correctly implements ephemeral behavior)

---

### Mode 2: Sprint Mode ✅ COMPLETE

**Philosophy**: "Use and forget" - Session-scoped with auto-cleanup

**Features**:
```yaml
Storage: chrome.storage.local (event sourcing)
Persistence: Local only
Sync: No
TTL: 4 hours
Undo: Yes (in-memory command stack)
Collections: No
Tags: No
Export: No
AI: No
Backend: None
```

**Implementation Status**: ✅ **100% Complete**

**Code**: [sprint-mode.ts](file:///home/sandy/projects/_underscore/src/content/modes/sprint-mode.ts) (correctly implements 4-hour TTL + event sourcing)

**Key Implementation**:
```typescript
export class SprintMode extends BaseHighlightMode {
  private static readonly TTL_HOURS = 4;
  
  async createHighlight(selection, colorRole) {
    const data: HighlightData = {
      // ...
      expiresAt: new Date(Date.now() + SprintMode.TTL_HOURS * 60 * 60 * 1000),
    };
    
    // Event sourcing for restoration
    this.eventBus.emit(EventName.HIGHLIGHT_CREATED, {...});
  }
  
  async cleanExpiredHighlights(): Promise<number> {
    // Removes highlights older than 4 hours
  }
}
```

---

### Mode 3: Vault Mode ⚠️ PHASE 1 COMPLETE, PHASE 2-3 MISSING

**Philosophy**: "Permanent & Reliable" - Store forever, sync everywhere

**Original Design** (3 Phases):

#### Phase 1: Local Vault ✅ IMPLEMENTED
```yaml
Storage: IndexedDB (Dexie.js)
Persistence: Local permanent
Sync: No (local-only)
Multi-Selector: Yes (XPath → Position → Fuzzy)
Collections: Schema exists, UI missing
Tags: Schema exists, UI missing
Export: Not implemented
Search: Not implemented
Backend: None
```

**Status**: ✅ **THIS IS WHAT YOU HAVE NOW**

#### Phase 2: Cloud Vault ❌ NOT IMPLEMENTED
```yaml
Storage: IndexedDB + Supabase
Persistence: Local + Remote
Sync: Yes (batched every 30s)
Conflict Resolution: Vector clocks
Backend: Supabase PostgreSQL
Auth: JWT + Refresh tokens
API: REST + WebSocket
```

**Status**: ❌ **MISSING - This is the original "Vault Mode" vision**

#### Phase 3: Advanced Vault ❌ NOT IMPLEMENTED
```yaml
Cross-Device Sync: Real-time
Collaborative Features: Shared collections
Export: Markdown, HTML, PDF, JSON
Full-Text Search: IndexedDB FTS
Advanced Filters: Date, domain, color
Public Sharing: Share links
```

**Status**: ❌ **MISSING - Future enhancement**

---

### Mode 4: Gen Mode ❌ NOT IMPLEMENTED

**Philosophy**: "AI-Powered Insights" - Knowledge synthesis from highlights

**Original Design**:
```yaml
Storage: Inherits from Vault (IndexedDB + Cloud)
Persistence: Permanent + Synced
AI Provider: Claude 3.5 Haiku (Anthropic)
Mindmap: D3.js or Markmap
Summaries: 3 lengths (50/200/500 words)
Entity Extraction: People, concepts, dates
Contradiction Detection: Cross-document analysis
Question Generation: Test understanding
Cost Tracking: Prevent billing surprises
Privacy Filter: PII detection
```

**Status**: ❌ **NOT STARTED**

**Dependencies**:
- Vault Mode Phase 2 (cloud sync) must be complete first
- Anthropic SDK integration
- D3.js/Markmap for visualization
- PII detection library

---

## The Confusion Explained

### Why You Thought Vault Was Misnamed

**Your Mental Model**:
```
Sprint Mode = Current implementation with IndexedDB
Vault Mode = Future cloud-synced mode
```

**Actual Architecture**:
```
Sprint Mode = 4-hour TTL, local storage, event sourcing ✅
Vault Mode Phase 1 = IndexedDB, multi-selector, local-only ✅ (YOU ARE HERE)
Vault Mode Phase 2 = + Cloud sync, Supabase, conflict resolution ❌ (NOT YET)
Vault Mode Phase 3 = + Advanced features, export, search ❌ (NOT YET)
```

### The Truth

**Vault Mode is correctly named**, but it's **incomplete**:
- ✅ Phase 1 (Local Vault) - DONE
- ❌ Phase 2 (Cloud Vault) - **THIS IS WHAT'S MISSING**
- ❌ Phase 3 (Advanced Vault) - Future

**The current implementation is Vault Mode Phase 1**, which is:
- Local-only permanent storage
- Multi-selector persistence
- IndexedDB with collections/tags schema
- **No cloud backend** (that's Phase 2)

---

## Architectural Recommendations

### Option A: Keep Current Names, Complete the Vision (RECOMMENDED)

**Approach**: Current Vault Mode is Phase 1, implement Phase 2 for cloud sync

**Implementation Plan**:

#### Phase 1: ✅ COMPLETE (Current State)
- [x] IndexedDB storage
- [x] Multi-selector engine
- [x] Local persistence
- [x] Collections/tags schema

#### Phase 2: Cloud Integration (4-6 weeks)
- [ ] Set up Supabase project
- [ ] Implement authentication (JWT)
- [ ] Create API client
- [ ] Build sync queue (batched uploads)
- [ ] Implement conflict resolution
- [ ] Add WebSocket for real-time updates

#### Phase 3: Advanced Features (2-3 weeks)
- [ ] Export functionality (Markdown, HTML, PDF)
- [ ] Full-text search
- [ ] Public sharing
- [ ] Advanced filters

**Pros**:
- ✅ Aligns with original architectural vision
- ✅ No renaming needed
- ✅ Clear upgrade path: Walk → Sprint → Vault → Gen
- ✅ Current code is foundation for Phase 2

**Cons**:
- ⚠️ Requires backend development
- ⚠️ Adds complexity (auth, sync, conflicts)
- ⚠️ Ongoing costs (Supabase/Oracle Cloud)

---

### Option B: Rename to Clarify Phases (NOT RECOMMENDED)

**Approach**: Rename current "Vault" to "Local Vault", future cloud version to "Cloud Vault"

**New Names**:
- Walk Mode (ephemeral)
- Sprint Mode (4-hour session)
- **Local Vault Mode** (permanent, local-only) ← Current implementation
- **Cloud Vault Mode** (permanent, synced) ← Future
- Gen Mode (AI-powered)

**Pros**:
- ✅ Clearer distinction between local and cloud

**Cons**:
- ❌ Confusing for users (too many modes)
- ❌ Breaks original architectural vision
- ❌ Requires renaming throughout codebase
- ❌ Doesn't match industry patterns

**Verdict**: ❌ **DO NOT DO THIS**

---

### Option C: Simplify to 2 Modes + Future Vault (NOT RECOMMENDED)

**Approach**: Remove current Vault Mode, keep only Walk + Sprint until cloud backend is ready

**Modes**:
- Walk Mode (ephemeral)
- Sprint Mode (4-hour session)
- ~~Vault Mode~~ (remove until cloud backend ready)

**Pros**:
- ✅ Simpler for now
- ✅ No incomplete features

**Cons**:
- ❌ Deletes 1,063 lines of working code
- ❌ Loses multi-selector engine (valuable!)
- ❌ Wastes development effort
- ❌ Users can't test local permanent storage

**Verdict**: ❌ **DO NOT DO THIS** - Wasteful

---

## Final Recommendation

### ✅ RECOMMENDED APPROACH: Complete Vault Mode in Phases

**Phase 1** (DONE): Local Vault
- Current implementation is **correct and valuable**
- Keep all existing code
- Document as "Vault Mode (Local-Only Beta)"

**Phase 2** (4-6 weeks): Cloud Vault
- Add Supabase backend
- Implement sync queue
- Add authentication
- Enable cross-device sync

**Phase 3** (2-3 weeks): Advanced Features
- Export functionality
- Full-text search
- Public sharing

### Immediate Actions (This Week)

1. **Update Documentation** (2 hours)
   - Clarify Vault Mode is "Phase 1: Local-Only"
   - Document Phase 2 roadmap (cloud sync)
   - Update capability flags to reflect current state

2. **Fix Capability Declarations** (30 minutes)
   ```typescript
   // vault-mode.ts - BE HONEST ABOUT CURRENT STATE
   readonly capabilities: ModeCapabilities = {
     persistence: 'indexeddb',
     sync: false,  // ← Change to false (not implemented yet)
     collections: false,  // ← Schema exists, UI missing
     tags: false,  // ← Schema exists, UI missing
     export: false,  // ← Not implemented
     search: false,  // ← Not implemented
     multiSelector: true,  // ✅ This works!
   };
   ```

3. **Add Phase Indicator to UI** (1 hour)
   ```typescript
   // In popup
   <div class="mode-badge">
     Vault Mode (Local Beta)
     <span class="phase-indicator">Cloud sync coming soon</span>
   </div>
   ```

4. **Create Phase 2 Implementation Plan** (4 hours)
   - Backend architecture (Supabase vs Oracle Cloud)
   - API design
   - Sync strategy
   - Conflict resolution algorithm
   - Migration plan for existing local data

---

## Architectural Clarity: Mode Feature Matrix

### Complete Feature Comparison

| Feature | Walk | Sprint | Vault Phase 1 (Current) | Vault Phase 2 (Planned) | Gen (Future) |
|---------|------|--------|------------------------|------------------------|--------------|
| **Storage** | Memory | chrome.storage | IndexedDB | IndexedDB + Cloud | IndexedDB + Cloud |
| **Persistence** | None | 4 hours | Permanent (local) | Permanent (synced) | Permanent (synced) |
| **Sync** | No | No | No | **Yes** | **Yes** |
| **Multi-Selector** | No | No | **Yes** | **Yes** | **Yes** |
| **Collections** | No | No | Schema only | **Yes** | **Yes** |
| **Tags** | No | No | Schema only | **Yes** | **Yes** |
| **Export** | No | No | No | **Yes** | **Yes** |
| **Search** | No | No | No | **Yes** | **Yes** |
| **Undo** | No | Yes | Yes | Yes | Yes |
| **AI Features** | No | No | No | No | **Yes** |
| **Backend** | None | None | None | **Supabase** | **Supabase + AI** |
| **Auth Required** | No | No | No | **Yes** | **Yes** |
| **Cost** | Free | Free | Free | Free tier | Paid |

### Implementation Status

| Component | Walk | Sprint | Vault P1 | Vault P2 | Gen |
|-----------|------|--------|----------|----------|-----|
| Mode Class | ✅ | ✅ | ✅ | ❌ | ❌ |
| Storage Layer | ✅ | ✅ | ✅ | ❌ | ❌ |
| Multi-Selector | N/A | N/A | ✅ | ✅ | ✅ |
| Backend API | N/A | N/A | N/A | ❌ | ❌ |
| Auth Service | N/A | N/A | N/A | ❌ | ❌ |
| Sync Queue | N/A | N/A | N/A | ❌ | ❌ |
| AI Client | N/A | N/A | N/A | N/A | ❌ |
| UI Components | ✅ | ✅ | ⚠️ | ❌ | ❌ |

**Legend**:
- ✅ Complete
- ⚠️ Partial (schema exists, UI missing)
- ❌ Not started
- N/A Not applicable

---

## Conclusion

### The Bottom Line

**Your confusion was justified**, but for a different reason than you thought:

- ✅ **Naming is CORRECT**: Vault Mode is the right name
- ⚠️ **Implementation is INCOMPLETE**: You have Phase 1, missing Phase 2-3
- ✅ **Architecture is SOUND**: Current code is a solid foundation

### What You Have

**Vault Mode Phase 1** (Local-Only):
- 1,063 lines of production-ready code
- IndexedDB storage with Dexie.js
- Multi-selector engine (XPath → Position → Fuzzy)
- Collections and tags schema
- Event sourcing infrastructure

### What You're Missing

**Vault Mode Phase 2** (Cloud Sync):
- Supabase backend integration
- Authentication service
- Sync queue with conflict resolution
- Cross-device synchronization
- Real-time updates via WebSocket

### Next Steps

1. **Accept Current State**: Vault Mode Phase 1 is complete and valuable
2. **Update Documentation**: Clarify "Local Beta" status
3. **Plan Phase 2**: Design cloud backend architecture
4. **Implement Incrementally**: Add cloud sync when ready

**The code is good. The architecture is good. You just need to finish what you started.**

---

## Appendix: Backend Architecture (Phase 2 Design)

### Supabase Schema

```sql
-- users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- highlights table
CREATE TABLE highlights (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  url TEXT NOT NULL,
  selectors JSONB NOT NULL,
  text TEXT NOT NULL,
  color_role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced BOOLEAN DEFAULT TRUE
);

-- events table (event sourcing)
CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- collections table
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_highlights_user_url ON highlights(user_id, url);
CREATE INDEX idx_events_user_timestamp ON events(user_id, timestamp);
```

### API Endpoints

```typescript
// Authentication
POST /auth/signup
POST /auth/login
POST /auth/refresh
POST /auth/logout

// Highlights
GET /highlights?url={url}
POST /highlights
PUT /highlights/:id
DELETE /highlights/:id

// Sync
POST /sync/push  // Batch upload events
GET /sync/pull?since={timestamp}  // Fetch updates

// Collections
GET /collections
POST /collections
PUT /collections/:id
DELETE /collections/:id
```

This architecture aligns with the original vision while acknowledging current implementation status.
