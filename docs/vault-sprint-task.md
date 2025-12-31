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
- [ ] Create `src/shared/interfaces/i-repository.ts`
  - [ ] Define `IRepository<T>` generic interface
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
  - [ ] Define [IHighlightRepository](file:///home/sandy/projects/_underscore/src/shared/repositories/i-highlight-repository.ts#17-98) extending `IRepository<HighlightData>`
    - [ ] Add `findByUrl(url: string): HighlightData[]`
    - [ ] Add `findByColor(color: string): HighlightData[]`
  - [ ] Add JSDoc for all methods
  - [ ] Export interfaces
- [ ] **Tests**: Write 8 tests for interface compliance
  - [ ] Test: InMemoryRepository implements IRepository
  - [ ] Test: RepositoryFacade implements IHighlightRepository
  - [ ] Test: All methods defined
  - [ ] Test: Return types correct
  - [ ] Test: Can swap implementations
  - [ ] Test: Mock implementation works
  - [ ] Test: Interface segregation (no unused methods)
  - [ ] Test: Liskov substitution (implementations interchangeable)
- [ ] **Acceptance Criteria**:
  - [x] All existing repositories implement interfaces
  - [x] All tests pass
  - [x] JSDoc on all public methods
  - [x] Zero TypeScript errors

#### Task 0.1.2: Create Mode Manager Interface
- [ ] Create `src/shared/interfaces/i-mode-manager.ts`
  - [ ] Define `IModeManager` interface
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
  - [ ] Add JSDoc
- [ ] Update [ModeManager](file:///home/sandy/projects/_underscore/src/content/modes/mode-manager.ts#12-83) class to implement `IModeManager`
- [ ] **Tests**: Write 6 tests
  - [ ] Test: ModeManager implements IModeManager
  - [ ] Test: Can register modes
  - [ ] Test: Can activate modes
  - [ ] Test: getCurrentMode returns active mode
  - [ ] Test: Can create highlights via current mode
  - [ ] Test: Mock implementation works
- [ ] **Acceptance Criteria**:
  - [x] ModeManager implements interface
  - [x] Can inject mock for testing
  - [x] All tests pass

#### Task 0.1.3: Create Storage Interface
- [ ] Create `src/shared/interfaces/i-storage.ts`
  - [ ] Define `IStorage` interface
    ```typescript
    interface IStorage {
      saveEvent(event: HighlightEvent): Promise<void>;
      loadEvents(): Promise<HighlightEvent[]>;
      clear(): Promise<void>;
    }
    ```
  - [ ] Define `IPersistentStorage` interface
    ```typescript
    interface IPersistentStorage {
      save<T>(key: string, value: T): Promise<void>;
      load<T>(key: string): Promise<T | null>;
      delete(key: string): Promise<void>;
    }
    ```
- [ ] Update `StorageService` to implement interfaces
- [ ] **Tests**: Write 6 tests
  - [ ] Test: StorageService implements IStorage
  - [ ] Test: Save/load events
  - [ ] Test: Clear storage
  - [ ] Test: Mock storage works
  - [ ] Test: IndexedDB storage implements IPersistentStorage
  - [ ] Test: Can swap storage backends
- [ ] **Acceptance Criteria**:
  - [x] Interfaces defined
  - [x] Implementations comply
  - [x] Tests pass

#### Task 0.1.4: Create Messaging Interface (Chrome API Abstraction)
- [ ] Create `src/shared/interfaces/i-messaging.ts`
  - [ ] Define `IMessaging` interface
    ```typescript
    interface IMessaging {
      sendToTab<T>(tabId: number, message: Message): Promise<T>;
      sendToRuntime<T>(message: Message): Promise<T>;
      onMessage(handler: (msg: Message) => void): void;
      removeListener(handler: (msg: Message) => void): void;
    }
    ```
  - [ ] Define `ITabQuery` interface
    ```typescript
    interface ITabQuery {
      getActiveTab(): Promise<chrome.tabs.Tab | null>;
      queryTabs(query: object): Promise<chrome.tabs.Tab[]>;
    }
    ```
- [ ] Create `src/shared/services/chrome-messaging.ts` implementation
- [ ] Create `src/shared/services/mock-messaging.ts` for testing
- [ ] **Tests**: Write 8 tests
  - [ ] Test: ChromeMessaging implements IMessaging
  - [ ] Test: Can send to tab
  - [ ] Test: Can send to runtime
  - [ ] Test: Can add/remove listeners
  - [ ] Test: MockMessaging for unit tests
  - [ ] Test: Error handling on send failure
  - [ ] Test: Timeout handling
  - [ ] Test: Message validation
- [ ] **Acceptance Criteria**:
  - [x] Chrome API fully abstracted
  - [x] Can test without chrome globals
  - [x] All tests pass

---

### 0.2: Dependency Injection Setup (Day 2-3, 10 hours)

#### Task 0.2.1: Implement IoC Container
- [ ] Create `src/shared/di/container.ts`
  - [ ] Implement service registration
    - [ ] `registerSingleton<T>(key: string, factory: () => T)`
    - [ ] `registerTransient<T>(key: string, factory: () => T)`
    - [ ] `registerInstance<T>(key: string, instance: T)`
  - [ ] Implement service resolution
    - [ ] `resolve<T>(key: string): T`
    - [ ] Throw if service not registered
    - [ ] Circular dependency detection
  - [ ] Add lifecycle management
    - [ ] Singleton instances cached
    - [ ] Transient created on each resolve
  - [ ] Add JSDoc
- [ ] **Tests**: Write 12 tests
  - [ ] Test: Can register singleton
  - [ ] Test: Can register transient
  - [ ] Test: Can register instance
  - [ ] Test: Singleton returns same instance
  - [ ] Test: Transient returns new instance
  - [ ] Test: Throws on unregistered service
  - [ ] Test: Circular dependency detected
  - [ ] Test: Can resolve nested dependencies
  - [ ] Test: Can override registration
  - [ ] Test: Can clear container
  - [ ] Test: Thread safety (async)
  - [ ] Test: Memory leak prevention
- [ ] **Acceptance Criteria**:
  - [x] Container fully functional
  - [x] 100% test coverage on container
  - [x] No memory leaks
  - [x] Documented

#### Task 0.2.2: Register All Services
- [ ] Create `src/shared/di/service-registration.ts`
  - [ ] Register logger
    ```typescript
    container.registerSingleton<ILogger>('logger', () =>
      LoggerFactory.getLogger('App')
    );
    ```
  - [ ] Register event bus
  - [ ] Register repository
  - [ ] Register storage
  - [ ] Register messaging
  - [ ] Register mode manager
  - [ ] Register all modes (Walk, Sprint, Vault)
- [ ] Update [content.ts](file:///home/sandy/projects/_underscore/src/entrypoints/content.ts) to use container
  ```typescript
  const container = new Container();
  registerServices(container);
  
  const modeManager = container.resolve<IModeManager>('modeManager');
  const repository = container.resolve<IRepository>('repository');
  ```
- [ ] **Tests**: Write 8 tests
  - [ ] Test: All services registered
  - [ ] Test: Can resolve all services
  - [ ] Test: Dependency graph correct
  - [ ] Test: No circular dependencies
  - [ ] Test: Singletons shared correctly
  - [ ] Test: Can swap implementations
  - [ ] Test: Integration test with real services
  - [ ] Test: Memory usage acceptable
- [ ] **Acceptance Criteria**:
  - [x] Zero hardcoded dependencies in commands
  - [x] All services injectable
  - [x] Tests pass

#### Task 0.2.3: Create Mock Implementations
- [ ] Create `tests/helpers/mocks/mock-repository.ts`
  - [ ] Implement `IRepository` with in-memory map
  - [ ] Add helper methods for test assertions
  - [ ] Track all method calls for verification
- [ ] Create `tests/helpers/mocks/mock-mode-manager.ts`
- [ ] Create `tests/helpers/mocks/mock-storage.ts`
- [ ] Create `tests/helpers/mocks/mock-messaging.ts`
- [ ] Create `tests/helpers/mocks/mock-logger.ts`
- [ ] Create `tests/helpers/mock-container.ts` for easy mock wiring
- [ ] **Tests**: Write 10 tests
  - [ ] Test: MockRepository behaves like real
  - [ ] Test: MockModeManager behaves like real
  - [ ] Test: Can track method calls
  - [ ] Test: Can verify interactions
  - [ ] Test: Mock container wires correctly
  - [ ] Test: Mocks are resettable
  - [ ] Test: Mocks throw on unexpected calls (strict mode)
  - [ ] Test: Mocks can return canned responses
  - [ ] Test: Integration with Vitest
  - [ ] Test: Type safety preserved
- [ ] **Acceptance Criteria**:
  - [x] All mocks implement real interfaces
  - [x] Mocks are easy to use in tests
  - [x] 100% mock coverage

---

### 0.3: Error Handling Infrastructure (Day 3-4, 8 hours)

#### Task 0.3.1: Create Error Hierarchy
- [ ] Create `src/shared/errors/base-error.ts`
  - [ ] Define `AppError` base class extending `Error`
    - [ ] Add `readonly code: string`
    - [ ] Add `readonly isOperational: boolean`
    - [ ] Add `readonly context?: Record<string, unknown>`
    - [ ] Override `toString()` for structured output
- [ ] Create `src/shared/errors/mode-error.ts`
  - [ ] `ModeError` extends `AppError`
  - [ ] `code = 'MODE_ERROR'`
- [ ] Create `src/shared/errors/validation-error.ts`
  - [ ] `ValidationError` extends `AppError`
  - [ ] `code = 'VALIDATION_ERROR'`
  - [ ] Add `field: string` property
- [ ] Create `src/shared/errors/persistence-error.ts`
  - [ ] `PersistenceError` extends `AppError`
  - [ ] `code = 'PERSISTENCE_ERROR'`
  - [ ] Add `operation: string` property
- [ ] Create `src/shared/errors/messaging-error.ts`
  - [ ] `MessagingError` extends `AppError`
  - [ ] `code = 'MESSAGING_ERROR'`
  - [ ] Add `messageType: string` property
- [ ] **Tests**: Write 8 tests
  - [ ] Test: All errors extend AppError
  - [ ] Test: Error codes unique
  - [ ] Test: Can serialize/deserialize
  - [ ] Test: Stack traces preserved
  - [ ] Test: Context included in output
  - [ ] Test: isOperational flag works
  - [ ] Test: Can catch by type
  - [ ] Test: Error messages descriptive
- [ ] **Acceptance Criteria**:
  - [x] 5 error types defined
  - [x] All extend AppError
  - [x] JSDoc on all errors
  - [x] Tests pass

#### Task 0.3.2: Implement Error Boundary
- [ ] Create `src/shared/utils/error-boundary.ts`
  - [ ] Define `Result<T, E>` type
    ```typescript
    type Result<T, E extends Error> =
      | { ok: true; value: T }
      | { ok: false; error: E };
    ```
  - [ ] Implement `ErrorBoundary` class
    ```typescript
    class ErrorBoundary {
      async execute<T>(
        operation: string,
        fn: () => Promise<T>
      ): Promise<Result<T, Error>>
    }
    ```
  - [ ] Add logging on error
  - [ ] Add telemetry tracking
  - [ ] Add context preservation
- [ ] **Tests**: Write 6 tests
  - [ ] Test: Returns success result
  - [ ] Test: Returns error result
  - [ ] Test: Logs errors
  - [ ] Test: Preserves stack trace
  - [ ] Test: Adds context
  - [ ] Test: Handles nested errors
- [ ] **Acceptance Criteria**:
  - [x] Error boundary implemented
  - [x] Type-safe Result type
  - [x] Tests pass

#### Task 0.3.3: Create Notification Service
- [ ] Create `src/shared/services/notification-service.ts`
  - [ ] Define `INotificationService` interface
    ```typescript
    interface INotificationService {
      showError(message: string, duration?: number): void;
      showSuccess(message: string, duration?: number): void;
      showWarning(message: string, duration?: number): void;
      showInfo(message: string, duration?: number): void;
    }
    ```
  - [ ] Implement using browser notifications or toast UI
  - [ ] Add queue for multiple notifications
  - [ ] Add auto-dismiss with configurable duration
- [ ] **Tests**: Write 6 tests
  - [ ] Test: Shows error notification
  - [ ] Test: Auto-dismisses
  - [ ] Test: Queues multiple notifications
  - [ ] Test: Can clear notifications
  - [ ] Test: Max notifications enforced
  - [ ] Test: Accessibility (aria-live)
- [ ] **Acceptance Criteria**:
  - [x] Notification service works
  - [x] Accessible
  - [x] Tests pass

---

### 0.4: Validation Layer (Day 4, 6 hours)

#### Task 0.4.1: Create Validation Schemas
- [ ] Create `src/shared/validation/mode-schemas.ts`
  - [ ] Define ModeType schema
    ```typescript
    const ModeTypeSchema = z.enum(['walk', 'sprint', 'vault']);
    ```
  - [ ] Define ModeCapabilities schema
  - [ ] Export schemas and infer types
- [ ] Create `src/shared/validation/highlight-schemas.ts`
  - [ ] Define HighlightData schema
    - [ ] Validate ID (UUID format)
    - [ ] Validate text (1-5000 chars)
    - [ ] Validate color (hex format)
    - [ ] Validate timestamps
  - [ ] Define HighlightDataV2 schema
- [ ] Create `src/shared/validation/message-schemas.ts`
  - [ ] Define Message discriminated union schema
  - [ ] Validate all message types
- [ ] **Tests**: Write 12 tests
  - [ ] Test: ModeType validates correct values
  - [ ] Test: ModeType rejects invalid values
  - [ ] Test: HighlightData validates
  - [ ] Test: HighlightData rejects bad ID
  - [ ] Test: HighlightData rejects empty text
  - [ ] Test: HighlightData rejects long text
  - [ ] Test: HighlightData rejects bad color
  - [ ] Test: Message schemas validate
  - [ ] Test: Invalid messages rejected
  - [ ] Test: Can parse and validate
  - [ ] Test: Error messages descriptive
  - [ ] Test: Type inference works
- [ ] **Acceptance Criteria**:
  - [x] All schemas defined
  - [x] Type-safe validation
  - [x] Tests pass

#### Task 0.4.2: Integrate Validation
- [ ] Add validation to `ModeStateManager.setMode()`
  ```typescript
  async setMode(mode: unknown): Promise<void> {
    const validMode = ModeTypeSchema.parse(mode); // Throws if invalid
    // ...
  }
  ```
- [ ] Add validation to [createHighlight](file:///home/sandy/projects/_underscore/src/content/modes/base-highlight-mode.ts#114-116) commands
- [ ] Add validation to message handlers
- [ ] Add validation to storage operations
- [ ] **Tests**: Write 8 tests
  - [ ] Test: Invalid mode rejected
  - [ ] Test: Invalid highlight rejected
  - [ ] Test: Invalid message rejected
  - [ ] Test: Validation errors descriptive
  - [ ] Test: Valid data passes through
  - [ ] Test: Sanitization applied
  - [ ] Test: Edge cases handled
  - [ ] Test: Performance acceptable
- [ ] **Acceptance Criteria**:
  - [x] Validation on all public APIs
  - [x] No invalid data reaches business logic
  - [x] Tests pass

---

### 0.5: Testing Infrastructure (Day 4-6, 12 hours)

#### Task 0.5.1: Create Test Utilities
- [ ] Create `tests/helpers/mock-chrome.ts`
  - [ ] Mock `chrome.tabs`
  - [ ] Mock `chrome.runtime`
  - [ ] Mock `chrome.storage`
  - [ ] Add helper to setup/teardown
- [ ] Create `tests/helpers/mock-dom.ts`
  - [ ] Mock [Selection](file:///home/sandy/projects/_underscore/src/content/commands/highlight-commands.ts#230-269) API
  - [ ] Mock [Range](file:///home/sandy/projects/_underscore/src/shared/schemas/highlight-schema.ts#62-63) API
  - [ ] Mock `CSS.highlights`
  - [ ] Add helpers for DOM manipulation
- [ ] Create `tests/helpers/test-fixtures.ts`
  - [ ] Fixture: Sample HighlightData
  - [ ] Fixture: Sample Selection
  - [ ] Fixture: Sample Mode configurations
  - [ ] Factory functions for test data
- [ ] Create `tests/helpers/test-container.ts`
  - [ ] Pre-wired container with mocks
  - [ ] Easy service resolution for tests
  - [ ] Auto-reset between tests
- [ ] **Tests**: Write 10 tests
  - [ ] Test: Mock chrome works
  - [ ] Test: Mock DOM works
  - [ ] Test: Fixtures generate valid data
  - [ ] Test: Test container wires correctly
  - [ ] Test: Can override services
  - [ ] Test: Auto-reset works
  - [ ] Test: No state leakage between tests
  - [ ] Test: Performance acceptable
  - [ ] Test: TypeScript types preserved
  - [ ] Test: Integration with Vitest
- [ ] **Acceptance Criteria**:
  - [x] All test helpers work
  - [x] Easy to use in tests
  - [x] Documented with examples

#### Task 0.5.2: Configure Test Coverage
- [ ] Update [vitest.config.ts](file:///home/sandy/projects/_underscore/vitest.config.ts)
  - [ ] Set coverage thresholds
    ```typescript
    coverage: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    }
    ```
  - [ ] Exclude test files from coverage
  - [ ] Configure reporters (text, html, lcov)
- [ ] Add coverage scripts to [package.json](file:///home/sandy/projects/_underscore/package.json)
- [ ] Configure CI to fail on coverage drop
- [ ] **Tests**: N/A (configuration)
- [ ] **Acceptance Criteria**:
  - [x] Coverage enforced
  - [x] Reports generated
  - [x] CI configured

#### Task 0.5.3: Setup Integration Test Framework
- [ ] Create `tests/integration/setup.ts`
  - [ ] Global setup for integration tests
  - [ ] Initialize fake IndexedDB
  - [ ] Setup JSDOM environment
- [ ] Create `tests/integration/helpers.ts`
  - [ ] Helper to create full extension context
  - [ ] Helper to simulate user interactions
  - [ ] Helper to wait for async operations
- [ ] **Tests**: Write 5 infrastructure tests
  - [ ] Test: Integration setup works
  - [ ] Test: Fake IndexedDB works
  - [ ] Test: Can simulate user actions
  - [ ] Test: Async helpers work
  - [ ] Test: Cleanup between tests
- [ ] **Acceptance Criteria**:
  - [x] Integration tests can run
  - [x] Full context available
  - [x] Tests isolated

#### Task 0.5.4: Setup E2E Test Framework
- [ ] Configure Playwright for extension testing
- [ ] Create `tests/e2e/fixtures.ts`
  - [ ] Extension loading fixture
  - [ ] Test page fixture
  - [ ] Screenshot helpers
- [ ] Create `tests/e2e/helpers.ts`
  - [ ] Helper to install extension
  - [ ] Helper to open popup
  - [ ] Helper to inject content script
- [ ] **Tests**: Write 3 E2E smoke tests
  - [ ] Test: Extension loads
  - [ ] Test: Can open popup
  - [ ] Test: Content script injected
- [ ] **Acceptance Criteria**:
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
- [ ] **Code Coverage**: ≥80% on foundation code
- [ ] **Tests Written**: 62 tests minimum
- [ ] **TypeScript Errors**: 0
- [ ] **ESLint Errors**: 0
- [ ] **Linter Warnings**: 0
- [ ] **Documentation**: All interfaces documented
- [ ] **Review**: Code reviewed by peer
- [ ] **Integration**: All components integrated
- [ ] **Performance**: No regressions
- [ ] **Memory**: No leaks detected

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

- [ ] Phase 0: Foundation (0/62 tasks)
- [ ] Phase 1: Commands (0/58 tasks)
- [ ] Phase 2: State (0/50 tasks)
- [ ] Phase 3: IPC (0/32 tasks)
- [ ] Phase 4: Popup (0/25 tasks)
- [ ] Phase 5: Modes (0/75 tasks)
- [ ] Phase 6: Integration (0/65 tasks)
- [ ] Phase 7: Performance (0/8 tasks)
- [ ] Phase 8: Documentation (0/0 tasks)

**Total: 0/375 tasks** (0%)
