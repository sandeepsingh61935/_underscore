# Component 7: Migration Service

**Goal**: Implement robust migration from local IndexedDB (Phase 1) to Cloud (Phase 2), with validation and rollback capabilities.
**Context**: `docs/03-implementation/vault_phase2_component_breakdown.md` (Lines 1348-1509)

## 📂 Files to Create
- [x] `src/background/migration/interfaces/i-migrator.ts`
- [x] `src/background/migration/local-to-cloud-migrator.ts`
- [x] `src/background/migration/migration-validator.ts`
- [x] `src/background/migration/rollback-service.ts`
- [x] `tests/integration/migration/local-to-cloud-migrator.test.ts`
- [x] `tests/unit/migration/migration-validator.test.ts`
- [x] `tests/unit/migration/rollback-service.test.ts`

## 📋 Implementation Tasks

### 7.1 Implement LocalToCloudMigrator (High Complexity)
**Tests**: 18 Integration Tests
- [x] Implement `LocalToCloudMigrator` class implementing `IMigrator` interface
- [x] Inject dependencies: `IEventStore` (local), `IApiClient` (remote), `ILogger`
- [x] Implement `migrate()` method:
    - [x] Fetch all local highlights from `IEventStore`/Repository
    - [x] Handle empty local storage case (early return)
    - [x] Batched processing (batch size: 10)
    - [x] Convert local entity to remote payload
    - [x] Validate highlight structure before upload
    - [x] Upload to Supabase via `IApiClient`
    - [x] Track success/failure counts
    - [x] Emit progress events via `EventBus`
    - [x] Mark migration as complete in `chrome.storage` upon success
- [x] Error Handling:
    - [x] Log individual failures but continue migration (for non-critical errors)
    - [x] Abort on critical network failures after retries

### 7.2 Implement MigrationValidator (Medium Complexity)
**Tests**: 10 Unit Tests
- [x] Implement `MigrationValidator` class
- [x] Implement `validate(result: MigrationResult): Promise<boolean>`
- [x] Compare total counts (Local vs Remote)
- [x] Implement Spot Check mechanism:
    - [x] Select 10 random highlights from local
    - [x] Fetch corresponding highlights from remote
    - [x] Deep compare content (checksum or field-by-field)
- [x] Log detailed mismatch info if validation fails

### 7.3 Implement RollbackService (Low Complexity)
**Tests**: 5 Unit Tests
- [x] Implement `RollbackService` class
- [x] Implement `rollback(): Promise<void>`
- [x] Execute remote cleanup: `apiClient.deleteAll()` (Caution: User context specific)
- [x] Reset migration status flag in `chrome.storage`
- [x] Log rollback action strictly

## 🧪 Testing Tasks

### Integration Tests (LocalToCloudMigrator)
- [x] `Empty local DB migrates successfully`
- [x] `Single highlight migrated`
- [x] `Multiple highlights (100) migrated in batches`
- [x] `Partial failure doesn't block others (resilience)`
- [x] `Validation error skips specific highlight`
- [x] `Network error retries (via API Client resilience)`
- [x] `Duplicate detection works (idempotency)`
- [x] `Progress events emitted correctly`
- [x] `Migration complete flag set in storage`
- [x] `Large highlights (>1MB) handled`
- [x] `Concurrent migrations prevented`
- [x] `Migration resumable after crash` (Advanced)
- [x] `Rollback triggered on critical error`
- [x] `Memory usage checks (streaming/batching)`
- [x] `Invalid highlights skipped`
- [x] `Collections migrated`
- [x] `Tags migrated`
- [x] `Migration metrics accurate`

### Unit Tests (MigrationValidator)
- [x] `Matching counts returns true`
- [x] `Count mismatch returns false`
- [x] `Spot checks validate content correctly`
- [x] `Invalid remote highlight detected`
- [x] `Checksum mismatch detected`
- [x] `Empty migration validates (0=0)`
- [x] `Large migration sampled efficiently`
- [x] `Duplicate detection works`
- [x] `Partial validation supported`
- [x] `Validation metrics accurate`

### Unit Tests (RollbackService)
- [x] `Rollback deletes remote data`
- [x] `Rollback resets migration flag`
- [x] `Rollback emits 'rolled_back' event`
- [x] `Rollback is idempotent`
- [x] `Rollback error handled gracefully`

## 📊 Quality Limits
- [x] **Strict Typing**: No `any` types.
- [x] **Linter**: 0 ESLint errors.
- [x] **Formatting**: Prettier applied.
- [x] **Coverage**: 100% test coverage for new files.
