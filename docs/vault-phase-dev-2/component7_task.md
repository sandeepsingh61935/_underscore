# Component 7: Migration Service

**Goal**: Implement robust migration from local IndexedDB (Phase 1) to Cloud (Phase 2), with validation and rollback capabilities.
**Context**: `docs/03-implementation/vault_phase2_component_breakdown.md` (Lines 1348-1509)

## 📂 Files to Create
- [ ] `src/background/migration/interfaces/i-migrator.ts`
- [ ] `src/background/migration/local-to-cloud-migrator.ts`
- [ ] `src/background/migration/migration-validator.ts`
- [ ] `src/background/migration/rollback-service.ts`
- [ ] `tests/integration/migration/local-to-cloud-migrator.test.ts`
- [ ] `tests/unit/migration/migration-validator.test.ts`
- [ ] `tests/unit/migration/rollback-service.test.ts`

## 📋 Implementation Tasks

### 7.1 Implement LocalToCloudMigrator (High Complexity)
**Tests**: 18 Integration Tests
- [ ] Implement `LocalToCloudMigrator` class implementing `IMigrator` interface
- [ ] Inject dependencies: `IEventStore` (local), `IApiClient` (remote), `ILogger`
- [ ] Implement `migrate()` method:
    - [ ] Fetch all local highlights from `IEventStore`/Repository
    - [ ] Handle empty local storage case (early return)
    - [ ] Batched processing (batch size: 10)
    - [ ] Convert local entity to remote payload
    - [ ] Validate highlight structure before upload
    - [ ] Upload to Supabase via `IApiClient`
    - [ ] Track success/failure counts
    - [ ] Emit progress events via `EventBus`
    - [ ] Mark migration as complete in `chrome.storage` upon success
- [ ] Error Handling:
    - [ ] Log individual failures but continue migration (for non-critical errors)
    - [ ] Abort on critical network failures after retries

### 7.2 Implement MigrationValidator (Medium Complexity)
**Tests**: 10 Unit Tests
- [ ] Implement `MigrationValidator` class
- [ ] Implement `validate(result: MigrationResult): Promise<boolean>`
- [ ] Compare total counts (Local vs Remote)
- [ ] Implement Spot Check mechanism:
    - [ ] Select 10 random highlights from local
    - [ ] Fetch corresponding highlights from remote
    - [ ] Deep compare content (checksum or field-by-field)
- [ ] Log detailed mismatch info if validation fails

### 7.3 Implement RollbackService (Low Complexity)
**Tests**: 5 Unit Tests
- [ ] Implement `RollbackService` class
- [ ] Implement `rollback(): Promise<void>`
- [ ] Execute remote cleanup: `apiClient.deleteAll()` (Caution: User context specific)
- [ ] Reset migration status flag in `chrome.storage`
- [ ] Log rollback action strictly

## 🧪 Testing Tasks

### Integration Tests (LocalToCloudMigrator)
- [ ] `Empty local DB migrates successfully`
- [ ] `Single highlight migrated`
- [ ] `Multiple highlights (100) migrated in batches`
- [ ] `Partial failure doesn't block others (resilience)`
- [ ] `Validation error skips specific highlight`
- [ ] `Network error retries (via API Client resilience)`
- [ ] `Duplicate detection works (idempotency)`
- [ ] `Progress events emitted correctly`
- [ ] `Migration complete flag set in storage`
- [ ] `Large highlights (>1MB) handled`
- [ ] `Concurrent migrations prevented`
- [ ] `Migration resumable after crash` (Advanced)
- [ ] `Rollback triggered on critical error`
- [ ] `Memory usage checks (streaming/batching)`
- [ ] `Invalid highlights skipped`
- [ ] `Collections migrated`
- [ ] `Tags migrated`
- [ ] `Migration metrics accurate`

### Unit Tests (MigrationValidator)
- [ ] `Matching counts returns true`
- [ ] `Count mismatch returns false`
- [ ] `Spot checks validate content correctly`
- [ ] `Invalid remote highlight detected`
- [ ] `Checksum mismatch detected`
- [ ] `Empty migration validates (0=0)`
- [ ] `Large migration sampled efficiently`
- [ ] `Duplicate detection works`
- [ ] `Partial validation supported`
- [ ] `Validation metrics accurate`

### Unit Tests (RollbackService)
- [ ] `Rollback deletes remote data`
- [ ] `Rollback resets migration flag`
- [ ] `Rollback emits 'rolled_back' event`
- [ ] `Rollback is idempotent`
- [ ] `Rollback error handled gracefully`

## 📊 Quality Limits
- [ ] **Strict Typing**: No `any` types.
- [ ] **Linter**: 0 ESLint errors.
- [ ] **Formatting**: Prettier applied.
- [ ] **Coverage**: 100% test coverage for new files.
