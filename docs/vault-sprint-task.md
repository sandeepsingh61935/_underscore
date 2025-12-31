# Vault Mode Sprint - Complete Task Breakdown

> **Mission**: Build production-ready Vault Mode with 85%+ test coverage, SOLID compliance, and zero technical debt
> 
> **Timeline**: 34 days (7 weeks)
> 
> **Quality Standards**: Strict adherence to project quality framework

---

## Critical Learnings from Previous Attempts

### ❌ What NOT to Do
- [ ] ~~Skip dependency injection "to save time"~~ → Leads to untestable code
- [ ] ~~Implement features before foundation~~ → Technical debt compounds
- [ ] ~~"We'll add tests later"~~ → Never happens, bugs multiply
- [ ] ~~Cut corners on error handling~~ → Silent failures in production
- [ ] ~~Hardcode dependencies~~ → Violates DIP, can't mock for tests
- [ ] ~~Skip validation~~ → Runtime crashes on invalid input
- [ ] ~~Inline code in HTML~~ → No TypeScript checking, hard to maintain

### ✅ What TO Do
- [x] **Foundation first**: Interfaces, DI, error handling BEFORE features
- [x] **Test-driven**: Write tests WITH implementation, not after
- [x] **Quality gates**: Hard requirements, no exceptions
- [x] **Dependency inversion**: Depend on interfaces, not concrete classes
- [x] **Validation layer**: Zod schemas for all inputs
- [x] **Error infrastructure**: Custom errors, boundaries, user feedback
- [x] **Proper TypeScript**: No inline scripts, full compilation

---

## Phase 0: Foundation Refactoring (5-6 days, 40-48 hours)

### 0.1: Interface Extraction (Day 1-2, 12 hours)

#### Task 0.1.1: Create Repository Interfaces
- [x] Create `src/shared/interfaces/i-repository.ts`
  - [x] Define `IRepository<T>` generic interface
    ```typescript
    interface IRepository<T> {
      add(item: T): Promise<void>;
      get(id: string): T | null;
      remove(id: string): Promise<void>;
      getAll(): T[];
      count(): number;
      clear(): Promise<void>;
    }
    ```
  - [x] Define [IHighlightRepository](file:///home/sandy/projects/_underscore/src/shared/repositories/i-highlight-repository.ts#17-98) extending `IRepository<HighlightData>`
    - [x] Add `findByUrl(url: string): HighlightData[]`
    - [x] Add `findByColor(color: string): HighlightData[]`
  - [x] Add JSDoc for all methods
  - [x] Export interfaces
- [x] **Tests**: Write 8 tests for interface compliance
  - [x] Test: InMemoryRepository implements IRepository
  - [x] Test: RepositoryFacade implements IHighlightRepository
  - [x] Test: All methods defined
  - [x] Test: Return types correct
  - [x] Test: Can swap implementations
  - [x] Test: Mock implementation works
  - [x] Test: Interface segregation (no unused methods)
  - [x] Test: Liskov substitution (implementations interchangeable)
- [x] **Acceptance Criteria**:
  - [x] All existing repositories implement interfaces
  - [x] All tests pass
  - [x] JSDoc on all public methods
  - [x] Zero TypeScript errors

#### Task 0.1.2: Create Mode Manager Interface
- [x] Create `src/shared/interfaces/i-mode-manager.ts`
  - [x] Define `IModeManager` interface
    ```typescript
    interface IModeManager {
      registerMode(mode: IHighlightMode): void;
      activateMode(name: string): Promise<void>;
      getCurrentMode(): IHighlightMode;
      createHighlight(selection: Selection, color: string): Promise<string>;
      removeHighlight(id: string): Promise<void>;
      getHighlight(id: string): HighlightData | null;
    }
    ```
  - [x] Add JSDoc
- [x] Update [ModeManager](file:///home/sandy/projects/_underscore/src/content/modes/mode-manager.ts#12-83) class to implement `IModeManager`
- [x] **Tests**: Write 6 tests
  - [x] Test: ModeManager implements IModeManager
  - [x] Test: Can register modes
  - [x] Test: Can activate modes
  - [x] Test: getCurrentMode returns active mode
  - [x] Test: Can create highlights via current mode
  - [x] Test: Mock implementation works
- [x] **Acceptance Criteria**:
  - [x] ModeManager implements interface
  - [x] Can inject mock for testing
  - [x] All tests pass

#### Task 0.1.3: Create Storage Interface
- [x] Create `src/shared/interfaces/i-storage.ts`
  - [x] Define `IStorage` interface
    ```typescript
    interface IStorage {
      saveEvent(event: HighlightEvent): Promise<void>;
      loadEvents(): Promise<HighlightEvent[]>;
      clear(): Promise<void>;
    }
    ```
  - [x] Define `IPersistentStorage` interface
    ```typescript
    interface IPersistentStorage {
      save<T>(key: string, value: T): Promise<void>;
      load<T>(key: string): Promise<T | null>;
      delete(key: string): Promise<void>;
    }
    ```
- [x] Update `StorageService` to implement interfaces
- [x] **Tests**: Write 6 tests
  - [x] Test: StorageService implements IStorage
  - [x] Test: Save/load events
  - [x] Test: Clear storage
  - [x] Test: Mock storage works
  - [x] Test: IndexedDB storage implements IPersistentStorage
  - [x] Test: Can swap storage backends
- [x] **Acceptance Criteria**:
  - [x] Interfaces defined
  - [x] Implementations comply
  - [x] Tests pass

#### Task 0.1.4: Create Messaging Interface (Chrome API Abstraction)
- [x] Create `src/shared/interfaces/i-messaging.ts`
  - [x] Define `IMessaging` interface
    ```typescript
    interface IMessaging {
      sendToTab<T>(tabId: number, message: Message): Promise<T>;
      sendToRuntime<T>(message: Message): Promise<T>;
      onMessage(handler: (msg: Message) => void): void;
      removeListener(handler: (msg: Message) => void): void;
    }
    ```
  - [x] Define `ITabQuery` interface
    ```typescript
    interface ITabQuery {
      getActiveTab(): Promise<chrome.tabs.Tab | null>;
      queryTabs(query: object): Promise<chrome.tabs.Tab[]>;
    }
    ```
- [x] Create `src/shared/services/chrome-messaging.ts` implementation
- [x] Create `src/shared/services/mock-messaging.ts` for testing
- [x] **Tests**: Write 8 tests
  - [x] Test: ChromeMessaging implements IMessaging
  - [x] Test: Can send to tab
  - [x] Test: Can send to runtime
  - [x] Test: Can add/remove listeners
  - [x] Test: MockMessaging for unit tests
  - [x] Test: Error handling on send failure
  - [x] Test: Timeout handling
  - [x] Test: Message validation
- [x] **Acceptance Criteria**:
  - [x] Chrome API fully abstracted
  - [x] Can test without chrome globals
  - [x] All tests pass

---

### 0.2: Dependency Injection Setup (Day 2-3, 10 hours)

#### Task 0.2.1: Implement IoC Container
- [x] Create `src/shared/di/container.ts`
  - [x] Implement service registration
    - [x] `registerSingleton<T>(key: string, factory: () => T)`
    - [x] `registerTransient<T>(key: string, factory: () => T)`
    - [x] `registerInstance<T>(key: string, instance: T)`
  - [x] Implement service resolution
    - [x] `resolve<T>(key: string): T`
    - [x] Throw if service not registered
    - [x] Circular dependency detection
  - [x] Add lifecycle management
    - [x] Singleton instances cached
    - [x] Transient created on each resolve
  - [x] Add JSDoc
- [x] **Tests**: Write 12 tests
  - [x] Test: Can register singleton
  - [x] Test: Can register transient
  - [x] Test: Can register instance
  - [x] Test: Singleton returns same instance
  - [x] Test: Transient returns new instance
  - [x] Test: Throws on unregistered service
  - [x] Test: Circular dependency detected
  - [x] Test: Can resolve nested dependencies
  - [x] Test: Can override registration
  - [x] Test: Can clear container
  - [x] Test: Thread safety (async)
  - [x] Test: Memory leak prevention
- [x] **Acceptance Criteria**:
  - [x] Container fully functional
  - [x] 100% test coverage on container
  - [x] No memory leaks
  - [x] Documented

#### Task 0.2.2: Register All Services
- [x] Create `src/shared/di/service-registration.ts`
  - [x] Register logger
    ```typescript
    container.registerSingleton<ILogger>('logger', () =>
      LoggerFactory.getLogger('App')
    );
    ```
  - [x] Register event bus
  - [x] Register repository
  - [x] Register storage
  - [x] Register messaging
  - [x] Register mode manager
  - [x] Register all modes (Walk, Sprint, Vault)
- [x] Update [content.ts](file:///home/sandy/projects/_underscore/src/entrypoints/content.ts) to use container
  ```typescript
  const container = new Container();
  registerServices(container);
  
  const modeManager = container.resolve<IModeManager>('modeManager');
  const repository = container.resolve<IRepository>('repository');
  ```
- [x] **Tests**: Write 8 tests
  - [x] Test: All services registered
  - [x] Test: Can resolve all services
  - [x] Test: Dependency graph correct
  - [x] Test: No circular dependencies
  - [x] Test: Singletons shared correctly
  - [x] Test: Can swap implementations
  - [x] Test: Integration test with real services
  - [x] Test: Memory usage acceptable
- [x] **Acceptance Criteria**:
  - [x] Zero hardcoded dependencies in commands
  - [x] All services injectable
  - [x] Tests pass

#### Task 0.2.3: Create Mock Implementations
- [x] Create `tests/helpers/mocks/mock-repository.ts`
  - [x] Implement `IRepository` with in-memory map
  - [x] Add helper methods for test assertions
  - [x] Track all method calls for verification
- [x] Create `tests/helpers/mocks/mock-mode-manager.ts`
- [x] Create `tests/helpers/mocks/mock-storage.ts`
- [x] Create `tests/helpers/mocks/mock-messaging.ts`
- [x] Create `tests/helpers/mocks/mock-logger.ts`
- [x] Create `tests/helpers/mock-container.ts` for easy mock wiring
- [x] **Tests**: Write 10 tests
  - [x] Test: MockRepository behaves like real
  - [x] Test: MockModeManager behaves like real
  - [x] Test: Can track method calls
  - [x] Test: Can verify interactions
  - [x] Test: Mock container wires correctly
  - [x] Test: Mocks are resettable
  - [x] Test: Mocks throw on unexpected calls (strict mode)
  - [x] Test: Mocks can return canned responses
  - [x] Test: Integration with Vitest
  - [x] Test: Type safety preserved
- [x] **Acceptance Criteria**:
  - [x] All mocks implement real interfaces
  - [x] Mocks are easy to use in tests
  - [x] 100% mock coverage

---

### 0.3: Error Handling Infrastructure (Day 3-4, 8 hours)

#### Task 0.3.1: Create Error Hierarchy
- [x] Create `src/shared/errors/base-error.ts`
  - [x] Define `AppError` base class extending `Error`
    - [x] Add `readonly code: string`
    - [x] Add `readonly isOperational: boolean`
    - [x] Add `readonly context?: Record<string, unknown>`
    - [x] Override `toString()` for structured output
- [x] Create `src/shared/errors/mode-error.ts`
  - [x] `ModeError` extends `AppError`
  - [x] `code = 'MODE_ERROR'`
- [x] Create `src/shared/errors/validation-error.ts`
  - [x] `ValidationError` extends `AppError`
  - [x] `code = 'VALIDATION_ERROR'`
  - [x] Add `field: string` property
- [x] Create `src/shared/errors/persistence-error.ts`
  - [x] `PersistenceError` extends `AppError`
  - [x] `code = 'PERSISTENCE_ERROR'`
  - [x] Add `operation: string` property
- [x] Create `src/shared/errors/messaging-error.ts`
  - [x] `MessagingError` extends `AppError`
  - [x] `code = 'MESSAGING_ERROR'`
  - [x] Add `messageType: string` property
- [x] **Tests**: Write 8 tests
  - [x] Test: All errors extend AppError
  - [x] Test: Error codes unique
  - [x] Test: Can serialize/deserialize
  - [x] Test: Stack traces preserved
  - [x] Test: Context included in output
  - [x] Test: isOperational flag works
  - [x] Test: Can catch by type
  - [x] Test: Error messages descriptive
- [x] **Acceptance Criteria**:
  - [x] 5 error types defined
  - [x] All extend AppError
  - [x] JSDoc on all errors
  - [x] Tests pass

#### Task 0.3.2: Implement Error Boundary
- [x] Create `src/shared/utils/error-boundary.ts`
  - [x] Define `Result<T, E>` type
    ```typescript
    type Result<T, E extends Error> =
      | { ok: true; value: T }
      | { ok: false; error: E };
    ```
  - [x] Implement `ErrorBoundary` class
    ```typescript
    class ErrorBoundary {
      async execute<T>(
        operation: string,
        fn: () => Promise<T>
      ): Promise<Result<T, Error>>
    }
    ```
  - [x] Add logging on error
  - [x] Add telemetry tracking
  - [x] Add context preservation
- [x] **Tests**: Write 6 tests
  - [x] Test: Returns success result
  - [x] Test: Returns error result
  - [x] Test: Logs errors
  - [x] Test: Preserves stack trace
  - [x] Test: Adds context
  - [x] Test: Handles nested errors
- [x] **Acceptance Criteria**:
  - [x] Error boundary implemented
  - [x] Type-safe Result type
  - [x] Tests pass

#### Task 0.3.3: Create Notification Service
- [x] Create `src/shared/services/notification-service.ts`
  - [x] Define `INotificationService` interface
    ```typescript
    interface INotificationService {
      showError(message: string, duration?: number): void;
      showSuccess(message: string, duration?: number): void;
      showWarning(message: string, duration?: number): void;
      showInfo(message: string, duration?: number): void;
    }
    ```
  - [x] Implement using browser notifications or toast UI
  - [x] Add queue for multiple notifications
  - [x] Add auto-dismiss with configurable duration
- [x] **Tests**: Write 6 tests
  - [x] Test: Shows error notification
  - [x] Test: Auto-dismisses
  - [x] Test: Queues multiple notifications
  - [x] Test: Can clear notifications
  - [x] Test: Max notifications enforced
  - [x] Test: Accessibility (aria-live)
- [x] **Acceptance Criteria**:
  - [x] Notification service works
  - [x] Accessible
  - [x] Tests pass

---

### 0.4: Validation Layer (Day 4, 6 hours)

#### Task 0.4.1: Create Validation Schemas
- [x] Create `src/shared/validation/mode-schemas.ts`
  - [x] Define ModeType schema
    ```typescript
    const ModeTypeSchema = z.enum(['walk', 'sprint', 'vault']);
    ```
  - [x] Define ModeCapabilities schema
  - [x] Export schemas and infer types
- [x] Create `src/shared/validation/highlight-schemas.ts`
  - [x] Define HighlightData schema
    - [x] Validate ID (UUID format)
    - [x] Validate text (1-5000 chars)
    - [x] Validate color (hex format)
    - [x] Validate timestamps
  - [x] Define HighlightDataV2 schema
- [x] Create `src/shared/validation/message-schemas.ts`
  - [x] Define Message discriminated union schema
  - [x] Validate all message types
- [x] **Tests**: Write 12 tests
  - [x] Test: ModeType validates correct values
  - [x] Test: ModeType rejects invalid values
  - [x] Test: HighlightData validates
  - [x] Test: HighlightData rejects bad ID
  - [x] Test: HighlightData rejects empty text
  - [x] Test: HighlightData rejects long text
  - [x] Test: HighlightData rejects bad color
  - [x] Test: Message schemas validate
  - [x] Test: Invalid messages rejected
  - [x] Test: Can parse and validate
  - [x] Test: Error messages descriptive
  - [x] Test: Type inference works
- [x] **Acceptance Criteria**:
  - [x] All schemas defined
  - [x] Type-safe validation
  - [x] Tests pass

#### Task 0.4.2: Integrate Validation
- [x] Add validation to `ModeStateManager.setMode()`
  ```typescript
  async setMode(mode: unknown): Promise<void> {
    const validMode = ModeTypeSchema.parse(mode); // Throws if invalid
    // ...
  }
  ```
- [x] Add validation to [createHighlight](file:///home/sandy/projects/_underscore/src/content/modes/base-highlight-mode.ts#114-116) commands
- [x] Add validation to message handlers
- [x] Add validation to storage operations
- [x] **Tests**: Write 8 tests
  - [x] Test: Invalid mode rejected
  - [x] Test: Invalid highlight rejected
  - [x] Test: Invalid message rejected
  - [x] Test: Validation errors descriptive
  - [x] Test: Valid data passes through
  - [x] Test: Sanitization applied
  - [x] Test: Edge cases handled
  - [x] Test: Performance acceptable
- [x] **Acceptance Criteria**:
  - [x] Validation on all public APIs
  - [x] No invalid data reaches business logic
  - [x] Tests pass

---

### 0.5: Testing Infrastructure (Day 4-6, 12 hours)

#### Task 0.5.1: Create Test Utilities
- [x] Create `tests/helpers/mock-chrome.ts`
  - [x] Mock `chrome.tabs`
  - [x] Mock `chrome.runtime`
  - [x] Mock `chrome.storage`
  - [x] Add helper to setup/teardown
- [x] Create `tests/helpers/mock-dom.ts`
  - [x] Mock [Selection](file:///home/sandy/projects/_underscore/src/content/commands/highlight-commands.ts#230-269) API
  - [x] Mock [Range](file:///home/sandy/projects/_underscore/src/shared/schemas/highlight-schema.ts#62-63) API
  - [x] Mock `CSS.highlights`
  - [x] Add helpers for DOM manipulation
- [x] Create `tests/helpers/test-fixtures.ts`
  - [x] Fixture: Sample HighlightData
  - [x] Fixture: Sample Selection
  - [x] Fixture: Sample Mode configurations
  - [x] Factory functions for test data
- [x] Create `tests/helpers/test-container.ts`
  - [x] Pre-wired container with mocks
  - [x] Easy service resolution for tests
  - [x] Auto-reset between tests
- [x] **Tests**: Write 10 tests
  - [x] Test: Mock chrome works
  - [x] Test: Mock DOM works
  - [x] Test: Fixtures generate valid data
  - [x] Test: Test container wires correctly
  - [x] Test: Can override services
  - [x] Test: Auto-reset works
  - [x] Test: No state leakage between tests
  - [x] Test: Performance acceptable
  - [x] Test: TypeScript types preserved
  - [x] Test: Integration with Vitest
- [x] **Acceptance Criteria**:
  - [x] All test helpers work
  - [x] Easy to use in tests
  - [x] Documented with examples

#### Task 0.5.2: Configure Test Coverage
- [x] Update [vitest.config.ts](file:///home/sandy/projects/_underscore/vitest.config.ts)
  - [x] Set coverage thresholds
    ```typescript
    coverage: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    }
    ```
  - [x] Exclude test files from coverage
  - [x] Configure reporters (text, html, lcov)
- [x] Add coverage scripts to [package.json](file:///home/sandy/projects/_underscore/package.json)
- [x] Configure CI to fail on coverage drop
- [x] **Tests**: N/A (configuration)
- [x] **Acceptance Criteria**:
  - [x] Coverage enforced
  - [x] Reports generated
  - [x] CI configured

#### Task 0.5.3: Setup Integration Test Framework
- [x] Create `tests/integration/setup.ts`
  - [x] Global setup for integration tests
  - [x] Initialize fake IndexedDB
  - [x] Setup JSDOM environment
- [x] Create `tests/integration/helpers.ts`
  - [x] Helper to create full extension context
  - [x] Helper to simulate user interactions
  - [x] Helper to wait for async operations
- [x] **Tests**: Write 5 infrastructure tests
  - [x] Test: Integration setup works
  - [x] Test: Fake IndexedDB works
  - [x] Test: Can simulate user actions
  - [x] Test: Async helpers work
  - [x] Test: Cleanup between tests
- [x] **Acceptance Criteria**:
  - [x] Integration tests can run
  - [x] Full context available
  - [x] Tests isolated

#### Task 0.5.4: Setup E2E Test Framework
- [x] Configure Playwright for extension testing
- [x] Create `tests/e2e/fixtures.ts`
  - [x] Extension loading fixture
  - [x] Test page fixture
  - [x] Screenshot helpers
- [x] Create `tests/e2e/helpers.ts`
  - [x] Helper to install extension
  - [x] Helper to open popup
  - [x] Helper to inject content script
- [x] **Tests**: Write 3 E2E smoke tests
  - [x] Test: Extension loads
  - [x] Test: Can open popup
  - [x] Test: Content script injected
- [x] **Acceptance Criteria**:
  - [x] E2E framework ready
  - [x] Smoke tests pass
  - [x] Can capture screenshots

---

## Phase 1: Command Layer Refactoring (Day 7-10, 24-32 hours)

### 1.1: Fix Command Pattern (Day 7-8, 12 hours)

#### Task 1.1.1: Refactor CreateHighlightCommand
- [ ] Remove duplicate [addFromData](file:///home/sandy/projects/_underscore/src/shared/repositories/repository-facade.ts#259-281) call
  - [ ] Audit current implementation
  - [ ] Identify all repository calls
  - [ ] Remove redundant calls
  - [ ] Ensure mode handles ALL persistence
- [ ] Inject dependencies via interfaces
  ```typescript
  constructor(
    private readonly modeManager: IM继 续odeManager,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}
  ```
- [ ] Update execute() logic
  - [ ] Delegate to mode ONLY
  - [ ] Store data for undo/redo
  - [ ] NO direct repository access
- [ ] **Tests**: Write 15 tests
  - [ ] Test: Creates highlight via mode
  - [ ] Test: No duplicate repository calls
  - [ ] Test: Undo works
  - [ ] Test: Redo works
  - [ ] Test: Works with Walk mode
  - [ ] Test: Works with Sprint mode
  - [ ] Test: Works with Vault mode
  - [ ] Test: Error handling
  - [ ] Test: Event emitted
  - [ ] Test: State managed correctly
  - [ ] Test: Can mock dependencies
  - [ ] Test: Performance acceptable
  - [ ] Test: Memory doesn't leak
  - [ ] Test: Concurrent creates
  - [ ] Test: Edge cases
- [ ] **Acceptance Criteria**:
  - [x] "Highlight already exists" warning GONE
  - [x] All tests pass
  - [x] Zero repository duplication

#### Task 1.1.2: Refactor RemoveHighlightCommand
- [ ] Apply same pattern as CreateHighlightCommand
- [ ] Remove repository duplication
- [ ] Add proper error handling
- [ ] **Tests**: Write 12 tests
  - [ ] Test: Removes via mode
  - [ ] Test: Undo/redo works
  - [ ] Test: Works with all modes
  - [ ] Test: Error handling
  - [ ] Test: Event emitted
  - [ ] Test: State correct
  - [ ] Test: Can mock
  - [ ] Test: Performance
  - [ ] Test: Memory
  - [ ] Test: Concurrent removes
  - [ ] Test: Edge cases
  - [ ] Test: Removing non-existent highlight
- [ ] **Acceptance Criteria**:
  - [x] No duplication
  - [x] Tests pass

#### Task 1.1.3: Integration Testing
- [ ] Test commands with real modes (not mocks)
- [ ] Test command stack (undo/redo chains)
- [ ] Test error scenarios
- [ ] **Tests**: Write 10 integration tests
  - [ ] Test: Create → Undo → Redo chain
  - [ ] Test: Multiple commands in stack
  - [ ] Test: Stack limit enforced
  - [ ] Test: Commands with Walk mode
  - [ ] Test: Commands with Sprint mode
  - [ ] Test: Commands with Vault mode
  - [ ] Test: Error recovery
  - [ ] Test: Concurrent operations
  - [ ] Test: Memory usage
  - [ ] Test: Performance under load
- [ ] **Acceptance Criteria**:
  - [x] Integration tests pass
  - [x] No bugs found

---

### 1.2: Command Factory (Day 9, 8 hours)

#### Task 1.2.1: Implement Command Factory
- [ ] Create `src/content/commands/command-factory.ts`
  - [ ] Inject container
  - [ ] Factory methods for each command
  - [ ] Proper DI wiring
- [ ] Update content.ts to use factory
- [ ] **Tests**: Write 8 tests
  - [ ] Test: Factory creates commands
  - [ ] Test: Dependencies injected correctly
  - [ ] Test: Can create all command types
  - [ ] Test: Commands functional
  - [ ] Test: Can override dependencies
  - [ ] Test: Factory is singleton
  - [ ] Test: Memory management
  - [ ] Test: Type safety
- [ ] **Acceptance Criteria**:
  - [x] All commands created via factory
  - [x] Zero hardcoded instantiation
  - [x] Tests pass

---

## Quality Gates

### End of Phase 0 Gate
- [x] **Code Coverage**: ≥80% on foundation code
- [x] **Tests Written**: 62 tests minimum
- [x] **TypeScript Errors**: 0
- [x] **ESLint Errors**: 0
- [x] **Linter Warnings**: 0
- [x] **Documentation**: All interfaces documented
- [x] **Review**: Code reviewed by peer
- [x] **Integration**: All components integrated
- [x] **Performance**: No regressions
- [x] **Memory**: No leaks detected

### End of Phase 1 Gate
- [ ] **Code Coverage**: ≥85% on commands
- [ ] **Tests Written**: 58 tests minimum
- [ ] **"Already exists" warning**: GONE
- [ ] **Command duplication**: ELIMINATED
- [ ] **Dependency Injection**: 100% compliant
- [ ] **Integration tests**: All passing
- [ ] **Documentation**: Commands documented
- [ ] **Review**: Approved

---

## Remaining Phases Summary

### Phase 2: State Management (Day 11-14)
- Implement production ModeStateManager
- Add validation, transition guards, migration
- 50 tests minimum

### Phase 3: IPC Layer (Day 15-17)
- Implement robust MessageBus
- Add retry, queue, timeout, circuit breaker
- 32 tests minimum

### Phase 4: Popup UI (Day 18-20)
- Proper TypeScript controller
- Loading/error states, optimistic updates
- 25 tests minimum

### Phase 5: Mode Implementations (Day 21-25)
- Walk Mode (ephemeral)
- Sprint Mode (session)
- Vault Mode (IndexedDB + 3-tier anchoring)
- 75 tests minimum

### Phase 6: Integration (Day 26-29)
- 50 integration tests
- 15 E2E tests
- Full scenario coverage

### Phase 7: Performance (Day 30-32)
- Benchmarking
- Optimization
- Memory leak testing
- 8 performance tests

### Phase 8: Documentation (Day 33-34)
- JSDoc on all public APIs
- User documentation
- Troubleshooting guide
- Migration guide

---

## Definition of DONE (Global)

A task is DONE when ALL of the following are met:

1. [ ] **Implementation Complete**: Code written and working
2. [ ] **Tests Written**: Unit + integration tests (coverage target met)
3. [ ] **Tests Passing**: All tests green, no skipped tests
4. [ ] **Code Quality**: Zero lint/TS errors, complexity < 10
5. [ ] **Documentation**: JSDoc on public APIs, README updated
6. [ ] **Review**: Code reviewed and approved
7. [ ] **Integration**: Works with existing system
8. [ ] **Performance**: No regressions, benchmarks met
9. [ ] **Accessibility**: ARIA labels where needed, keyboard nav works
10. [ ] **Security**: No vulnerabilities, input validated

**NOT done if ANY are missing. No exceptions.**

---

## Progress Tracking

- [x] Phase 0: Foundation (62/62 tasks)
- [ ] Phase 1: Commands (0/58 tasks)
- [ ] Phase 2: State (0/50 tasks)
- [ ] Phase 3: IPC (0/32 tasks)
- [ ] Phase 4: Popup (0/25 tasks)
- [ ] Phase 5: Modes (0/75 tasks)
- [ ] Phase 6: Integration (0/65 tasks)
- [ ] Phase 7: Performance (0/8 tasks)
- [ ] Phase 8: Documentation (0/0 tasks)

**Total: 62/375 tasks** (16%)
