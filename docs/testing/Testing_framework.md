# Comprehensive Domain Testing Strategy

**Version**: 2.0  
**Date**: 2025-12-30  
**Based On**: Layer 2.2 Architectural Audit Findings  
**Applicable To**: All Domain Migrations & Integration Testing

---

## Executive Summary

### The Problem We Solved

**Before (Layer 2.2)**:
- ❌ Tests validated "does it work?" (functional)
- ❌ Tests didn't validate "does it follow architecture?" (structural)
- ❌ 85% test coverage, 50% architecture compliance
- ❌ False confidence from passing tests

**After (This Framework)**:
- ✅ Tests validate BOTH function AND architecture
- ✅ Tests enforce patterns, not just outcomes
- ✅ Architectural compliance is measurable
- ✅ True confidence from comprehensive validation

---

## Testing Pyramid (4 Layers)

```
              ┌─────────────────┐
              │   E2E Tests     │ (5% - Full System)
              └─────────────────┘
           ┌────────────────────────┐
           │  Integration Tests     │ (15% - Cross-Layer)
           └────────────────────────┘
        ┌───────────────────────────────┐
        │    Architectural Tests        │ (30% - Pattern Compliance)
        └───────────────────────────────┘
    ┌────────────────────────────────────────┐
    │       Behavioral Unit Tests            │ (50% - Functionality)
    └────────────────────────────────────────┘
```

---

## Layer 1: Behavioral Unit Tests (50% of Test Suite)

### Purpose
Verify **functionality** - "Does the code work as expected?"

### Scope
- Individual functions/methods
- Domain entity validation
- Business logic correctness
- Edge cases and error conditions

### Example Template

**File**: `tests/unit/{domain}/test_{domain}_service.py`

```python
"""
Behavioral unit tests for {Domain}Service.

Tests follow AAA (Arrange, Act, Assert) pattern.
Focus: Functionality, not architecture.
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from uuid import uuid4
from datetime import datetime, timezone

from src.application.{domain}.services import {Domain}Service
from src.application.{domain}.dto import Create{Domain}DTO
from src.domain.{domain}.exceptions import {Domain}Error


class Test{Domain}Service:
    """Behavioral tests for {Domain}Service."""
    
    @pytest.fixture
    def service(self, mock_repository, mock_event_publisher):
        """Create service with mocked dependencies."""
        return {Domain}Service(
            repository=mock_repository,
            event_publisher=mock_event_publisher
        )
    
    @pytest.fixture
    def valid_dto(self):
        """Valid DTO for testing."""
        return Create{Domain}DTO(
            user_id=str(uuid4()),
            # ... domain-specific fields
        )
    
    # ========================================================================
    # HAPPY PATH TESTS
    # ========================================================================
    
    async def test_create_with_valid_data_persists_and_publishes_event(
        self,
        service,
        mock_repository,
        mock_event_publisher,
        valid_dto
    ):
        """Creating with valid data should persist and publish event."""
        # Arrange
        expected_entity = Mock(id=uuid4())
        mock_repository.add.return_value = expected_entity
        
        # Act
        result = await service.create(valid_dto)
        
        # Assert: Persistence called
        mock_repository.add.assert_called_once()
        
        # Assert: Event published
        mock_event_publisher.publish.assert_called_once()
        
        # Assert: Returns correct DTO
        assert result is not None
        assert result.id == expected_entity.id
    
    # ========================================================================
    # ERROR PATH TESTS
    # ========================================================================
    
    async def test_create_with_invalid_data_raises_validation_error(
        self,
        service
    ):
        """Invalid data should raise domain-specific validation error."""
        # Arrange
        invalid_dto = Create{Domain}DTO(
            user_id="invalid-uuid",  # Invalid format
        )
        
        # Act & Assert
        with pytest.raises({Domain}ValidationError):  # ✅ Domain exception
            await service.create(invalid_dto)
    
    # ========================================================================
    # EDGE CASE TESTS
    # ========================================================================
    
    async def test_create_with_duplicate_raises_conflict_error(
        self,
        service,
        mock_repository,
        valid_dto
    ):
        """Duplicate creation should raise conflict error."""
        # Arrange
        mock_repository.add.side_effect = DatabaseError("Duplicate key")
        
        # Act & Assert
        with pytest.raises({Domain}ConflictError):
            await service.create(valid_dto)
```

### Checklist for Behavioral Tests

- [ ] **Happy Path**: All success scenarios covered
- [ ] **Error Paths**: All validation failures tested
- [ ] **Edge Cases**: Boundary conditions, nulls, empty lists
- [ ] **AAA Pattern**: Arrange-Act-Assert clearly separated
- [ ] **Fixtures**: Reusable test data in conftest.py
- [ ] **Mocks**: All external dependencies mocked
- [ ] **Assertions**: Verify outcomes, not implementation details

---

## Layer 2: Architectural Tests (30% of Test Suite) ⭐ NEW

### Purpose
Verify **pattern compliance** - "Does the code follow our architecture?"

### Scope
- Exception hierarchy structure
- Decorator usage
- Logging patterns
- Dependency injection
- Interface adherence

### Example Template

**File**: `tests/architecture/test_{domain}_architecture.py`

```python
"""
Architectural compliance tests for {Domain} domain.

These tests verify code follows our architectural standards.
They validate structure, not behavior.
"""
import pytest
import inspect
import ast
import dataclasses
from pathlib import Path

from src.domain.{domain} import exceptions as exc_module
from src.application.{domain}.services import {Domain}Service
from src.api.{domain} import router


class Test{Domain}ExceptionArchitecture:
    """Verify exception hierarchy follows standards."""
    
    def test_all_exceptions_use_dataclass_pattern(self):
        """All domain exceptions MUST use @dataclass(frozen=False)."""
        
        # Get all exception classes
        exception_classes = [
            cls for name, cls in vars(exc_module).items()
            if isinstance(cls, type) and issubclass(cls, Exception)
        ]
        
        for exc_class in exception_classes:
            # Assert: Is a dataclass
            assert dataclasses.is_dataclass(exc_class), (
                f"{exc_class.__name__} must be @dataclass"
            )
            
            # Assert: frozen=False (allows mutation)
            fields = dataclasses.fields(exc_class)
            # Dataclass params are in __dataclass_params__ if available
            # or we check if we can assign to an instance
            try:
                instance = exc_class(message="test")
                instance.user_id = "test_mutation"  # Should not raise
            except dataclasses.FrozenInstanceError:
                pytest.fail(f"{exc_class.__name__} must have frozen=False")
    
    def test_all_exceptions_inherit_from_domain_error(self):
        """All domain exceptions MUST inherit from DomainError."""
        from src.foundation.errors import DomainError
        
        exception_classes = [
            cls for name, cls in vars(exc_module).items()
            if isinstance(cls, type) 
            and issubclass(cls, Exception)
            and cls.__module__ == exc_module.__name__
        ]
        
        for exc_class in exception_classes:
            assert issubclass(exc_class, DomainError), (
                f"{exc_class.__name__} must inherit from DomainError"
            )
    
    def test_exceptions_have_required_context_fields(self):
        """Domain exceptions MUST have context fields (user_id, etc.)."""
        
        # Get base domain exception
        base_exception = getattr(exc_module, f"{Domain}Error")
        fields = {f.name for f in dataclasses.fields(base_exception)}
        
        # Assert: Has required fields
        required_fields = {'message', 'user_id'}  # Customize per domain
        assert required_fields.issubset(fields), (
            f"{base_exception.__name__} must have fields: {required_fields}"
        )


class Test{Domain}ServiceArchitecture:
    """Verify service layer follows standards."""
    
    def test_all_public_methods_accept_correlation_id(self):
        """All public service methods MUST accept correlation_id parameter."""
        
        # Get all public methods (not starting with _)
        public_methods = [
            (name, method) 
            for name, method in inspect.getmembers({Domain}Service)
            if inspect.isfunction(method) 
            and not name.startswith('_')
            and name != '__init__'
        ]
        
        for method_name, method in public_methods:
            sig = inspect.signature(method)
            
            # Assert: Has correlation_id parameter
            assert 'correlation_id' in sig.parameters, (
                f"{Domain}Service.{method_name}() must accept correlation_id"
            )
            
            # Assert: correlation_id is Optional
            param = sig.parameters['correlation_id']
            assert param.default is not inspect.Parameter.empty, (
                f"{Domain}Service.{method_name}() correlation_id must be Optional"
            )
    
    def test_service_uses_logger_factory(self):
        """Service MUST use LoggerFactory, not standard logging."""
        
        # Check source code
        source_file = Path(inspect.getfile({Domain}Service))
        source_code = source_file.read_text()
        
        # Assert: Imports LoggerFactory
        assert 'from ...foundation.logging_utils import LoggerFactory' in source_code, (
            "Service must import LoggerFactory"
        )
        
        # Assert: Does NOT import standard logging
        assert 'import logging' not in source_code, (
            "Service must NOT use standard logging module"
        )
        
        # Assert: Creates logger with LoggerFactory
        assert 'LoggerFactory.getLogger' in source_code, (
            "Service must use LoggerFactory.getLogger()"
        )
    
    def test_service_no_fstrings_in_logging_calls(self):
        """Service logging MUST NOT use f-strings (breaks structured logging)."""
        
        source_file = Path(inspect.getfile({Domain}Service))
        tree = ast.parse(source_file.read_text())
        
        # Find all logger.info/error/warning calls
        logger_calls = []
        
        class LoggerCallVisitor(ast.NodeVisitor):
            def visit_Call(self, node):
                # Check if it's a logger call
                if isinstance(node.func, ast.Attribute):
                    if (node.func.attr in ['info', 'error', 'warning', 'debug']
                        and hasattr(node.func.value, 'id')
                        and 'logger' in node.func.value.id.lower()):
                        
                        # Check if first argument is f-string
                        if node.args and isinstance(node.args[0], ast.JoinedStr):
                            logger_calls.append(node)
                
                self.generic_visit(node)
        
        visitor = LoggerCallVisitor()
        visitor.visit(tree)
        
        assert len(logger_calls) == 0, (
            f"Found {len(logger_calls)} logger calls with f-strings. "
            "Use keyword arguments instead."
        )


class Test{Domain}APIArchitecture:
    """Verify API layer follows standards."""
    
    def test_all_endpoints_use_handle_errors_decorator(self):
        """All API endpoints MUST use @handle_errors() decorator."""
        
        # Get all route handlers
        routes = router.routes
        
        for route in routes:
            endpoint = route.endpoint
            
            # Check if endpoint has @handle_errors decorator
            # This is tricky - decorators modify the function
            # We check if function name contains our decorator wrapper pattern
            # Or we check the source code
            
            source_file = Path(inspect.getfile(endpoint))
            source_lines, start_line = inspect.getsourcelines(endpoint)
            source_code = ''.join(source_lines)
            
            assert '@handle_errors' in source_code, (
                f"Endpoint {endpoint.__name__} must use @handle_errors decorator"
            )
    
    def test_endpoints_extract_correlation_id_from_request(self):
        """Endpoints MUST extract correlation_id from request.state."""
        
        routes = router.routes
        
        for route in routes:
            if route.methods & {'POST', 'PUT', 'PATCH'}:  # Mutating operations
                endpoint = route.endpoint
                source_lines, _ = inspect.getsourcelines(endpoint)
                source_code = ''.join(source_lines)
                
                assert 'correlation_id' in source_code, (
                    f"Endpoint {endpoint.__name__} must extract correlation_id"
                )
                
                assert 'request.state' in source_code or 'getattr(request' in source_code, (
                    f"Endpoint {endpoint.__name__} must get correlation_id from request.state"
                )
```

### Checklist for Architectural Tests

- [ ] **Exception Structure**: All use `@dataclass(frozen=False)`
- [ ] **Correlation IDs**: All service methods accept correlation_id
- [ ] **Logging**: LoggerFactory used, no f-strings
- [ ] **Decorators**: `@handle_errors()` on all endpoints
- [ ] **No Code Smells**: No `import logging`, no bare [except](file:///home/sandy/projects/healthio/backend/tests/unit/foundation/test_logging.py#64-86)
- [ ] **Interface Adherence**: Services implement repository interfaces
- [ ] **Dependency Injection**: Constructor injection only

---

## Layer 3: Integration Tests (15% of Test Suite)

### Purpose
Verify **cross-layer interaction** - "Do layers work together correctly?"

### Scope
- Service ↔ Repository integration
- API ↔ Service ↔ DB flow
- Event publishing flow
- Correlation ID propagation

### Example Template

**File**: `tests/integration/{domain}/test_{domain}_integration.py`

```python
"""
Integration tests for {Domain} domain.

Tests verify cross-layer interactions and end-to-end flows.
Uses real database (in-memory or Docker container).
"""
import pytest
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from src.domain.{domain}.entities import {Domain}
from src.infrastructure.{domain}.repository import {Domain}Repository
from src.infrastructure.{domain}.models import {Domain}Model


@pytest.mark.integration
class Test{Domain}RepositoryIntegration:
    """Test repository with real database."""
    
    async def test_repository_crud_operations(self, db_session: AsyncSession):
        """Verify CRUD operations persist to database."""
        # Arrange
        repo = {Domain}Repository(db_session)
        entity = {Domain}(
            id=uuid4(),
            user_id=uuid4(),
            # ... domain fields
        )
        
        # Act: Create
        saved = await repo.add(entity)
        await db_session.commit()
        
        # Assert: Read from DB directly
        result = await db_session.execute(
            select({Domain}Model).where({Domain}Model.id == entity.id)
        )
        db_record = result.scalar_one_or_none()
        
        assert db_record is not None
        assert db_record.id == entity.id
        
        # Act: Update
        entity.status = "updated"
        await repo.update(entity)
        await db_session.commit()
        
        # Assert: Verify update
        await db_session.refresh(db_record)
        assert db_record.status == "updated"


@pytest.mark.integration
class Test{Domain}CorrelationIDPropagation:
    """Verify correlation_id flows through all layers."""
    
    async def test_correlation_id_flows_api_to_event(
        self,
        client,
        db_session,
        mock_event_publisher
    ):
        """Correlation ID MUST propagate: API → Service → Event."""
        
        # Arrange
        correlation_id = uuid4()
        
        # Act: Make API call with correlation_id header
        response = await client.post(
            f"/api/{domain}/",
            json={...},
            headers={"X-Correlation-ID": str(correlation_id)}
        )
        
        assert response.status_code == 201
        
        # Assert: Event published with correlation_id
        assert mock_event_publisher.publish.called
        published_event = mock_event_publisher.publish.call_args[0][0]
        
        assert published_event.correlation_id == correlation_id, (
            "Event must preserve correlation_id from API request"
        )
    
    async def test_correlation_id_logged_at_each_layer(
        self,
        client,
        caplog
    ):
        """Correlation ID MUST appear in logs at each layer."""
        
        correlation_id = uuid4()
        
        with caplog.at_level(logging.INFO):
            response = await client.post(
                f"/api/{domain}/",
                json={...},
                headers={"X-Correlation-ID": str(correlation_id)}
            )
        
        # Extract log records
        api_logs = [r for r in caplog.records if 'api' in r.name.lower()]
        service_logs = [r for r in caplog.records if 'service' in r.name.lower()]
        repo_logs = [r for r in caplog.records if 'repository' in r.name.lower()]
        
        # Assert: correlation_id in all layers
        for log_record in api_logs + service_logs + repo_logs:
            assert hasattr(log_record, 'correlation_id'), (
                f"Log {log_record.name} missing correlation_id field"
            )
            assert log_record.correlation_id == str(correlation_id)
```

### Checklist for Integration Tests

- [ ] **Database Persistence**: Real DB creates/reads/updates
- [ ] **Transaction Handling**: Rollback on errors
- [ ] **Correlation ID**: Traced through all layers
- [ ] **Event Publishing**: Events contain correct data + correlation_id
- [ ] **Error Propagation**: Domain errors bubble up correctly
- [ ] **Performance**: Sub-100ms for simple operations

---

## Layer 4: End-to-End Tests (5% of Test Suite)

### Purpose
Verify **full system behavior** - "Does the entire feature work?"

### Scope
- Full user workflows
- Cross-domain interactions
- Saga/event chains
- External API integrations

### Example Template

**File**: `tests/e2e/test_{feature}_workflow.py`

```python
"""
End-to-end tests for {Feature} workflow.

Tests simulate real user interactions across multiple domains.
"""
import pytest


@pytest.mark.e2e
class Test{Feature}Workflow:
    """Test complete user workflow."""
    
    async def test_user_completes_full_workflow(
        self,
        client,
        db_session,
        mock_event_publisher
    ):
        """
        Workflow: User creates {DomainA} → System processes → {DomainB} updated.
        
        Steps:
        1. User creates resource in DomainA
        2. Event published
        3. Saga handler processes event
        4. DomainB automatically updated
        5. User sees updated data
        """
        
        correlation_id = uuid4()
        user_id = uuid4()
        
        # Step 1: Create resource in DomainA
        response = await client.post(
            "/api/domaina/",
            json={...},
            headers={"X-Correlation-ID": str(correlation_id)}
        )
        assert response.status_code == 201
        resource_id = response.json()["id"]
        
        # Step 2: Verify event published
        events = mock_event_publisher.published_events
        assert len(events) >= 1
        create_event = events[0]
        assert create_event.correlation_id == correlation_id
        
        # Step 3: Simulate saga processing
        saga = DomainBSaga()
        await saga.handle_domaina_created(create_event)
        
        # Step 4: Verify DomainB updated
        domainb_response = await client.get(f"/api/domainb/user/{user_id}")
        assert domainb_response.status_code == 200
        domainb_data = domainb_response.json()
        
        # Step 5: Verify correlation_id preserved
        assert domainb_data["last_correlation_id"] == str(correlation_id)
```

### Checklist for E2E Tests

- [ ] **Complete Workflows**: Simulates real user journeys
- [ ] **Cross-Domain**: Tests interactions between domains
- [ ] **Event Chains**: Saga handlers process events correctly
- [ ] **Data Consistency**: Final state matches expectations
- [ ] **Correlation Trace**: Single correlation_id through entire flow

---

## Automation & CI/CD Integration

### Pre-Commit Hooks

**File**: [.pre-commit-config.yaml](file:///home/sandy/projects/healthio/.pre-commit-config.yaml)

```yaml
repos:
  # Architectural Linting
  - repo: local
    hooks:
      - id: check-fstrings-in-logging
        name: No f-strings in logging calls
        entry: python scripts/lint_no_fstring_logging.py
        language: python
        files: \\.py$
        
      - id: check-dataclass-exceptions
        name: All exceptions use @dataclass
        entry: python scripts/lint_dataclass_exceptions.py
        language: python
        files: src/domain/.*/exceptions\\.py$
        
      - id: check-correlation-id-params
        name: Service methods have correlation_id
        entry: python scripts/lint_correlation_id.py
        language: python
        files: src/application/.*/services\\.py$

  # Static Type Checking
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.0
    hooks:
      - id: mypy
        args: [--strict, --ignore-missing-imports]

  # Code Formatting
  - repo: https://github.com/psf/black
    rev: 23.11.0
    hooks:
      - id: black

  # Import Sorting
  - repo: https://github.com/PyCQA/isort
    rev: 5.12.0
    hooks:
      - id: isort
```

### CI/CD Pipeline

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  behavioral-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Unit Tests
        run: pytest tests/unit/ -v --cov=src --cov-report=xml
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  architectural-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Architecture Tests
        run: pytest tests/architecture/ -v
      
      - name: Fail if < 100% architecture compliance
        run: |
          if [ $? -ne 0 ]; then
            echo "❌ Architectural tests failed!"
            echo "All architectural standards must pass before merge."
            exit 1
          fi

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    
    steps:
      - uses: actions/checkout@v3
      - name: Run Integration Tests
        run: pytest tests/integration/ -v
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/test

  quality-gate:
    needs: [behavioral-tests, architectural-tests, integration-tests]
    runs-on: ubuntu-latest
    steps:
      - name: All Tests Passed
        run: echo "✅ All quality gates passed!"
```

### Quality Metrics Dashboard

```bash
# Generate test quality report
pytest tests/ --cov=src --cov-report=html --cov-report=term \
  --html=reports/test-report.html \
  -v --tb=short

# Metrics to track:
# - Behavioral test coverage: ≥80%
# - Architectural test compliance: 100%
# - Integration test count: ≥5 per domain
# - E2E test count: ≥2 per major workflow
```

---

## Domain Migration Testing Checklist

Use this checklist for every domain migration:

### Phase 1: Test Planning
- [ ] Read this testing strategy document
- [ ] Identify domain-specific architectural requirements
- [ ] Create test plan with 4 layers
- [ ] Set coverage targets (50/30/15/5 split)

### Phase 2: Behavioral Tests (Day 1)
- [ ] Create `tests/unit/{domain}/conftest.py` with fixtures
- [ ] Write service layer behavioral tests
- [ ] Write repository behavioral tests
- [ ] Write API behavioral tests
- [ ] Achieve ≥80% code coverage
- [ ] All behavioral tests passing

### Phase 3: Architectural Tests (Day 1-2)
- [ ] Create `tests/architecture/test_{domain}_architecture.py`
- [ ] Test exception `@dataclass` pattern
- [ ] Test correlation_id in service methods
- [ ] Test LoggerFactory usage
- [ ] Test no f-strings in logging
- [ ] Test `@handle_errors` on endpoints
- [ ] Achieve 100% architectural compliance

### Phase 4: Integration Tests (Day 2)
- [ ] Create `tests/integration/{domain}/test_{domain}_integration.py`
- [ ] Test repository ↔ database persistence
- [ ] Test correlation_id propagation
- [ ] Test event publishing flow
- [ ] Test error handling across layers
- [ ] All integration tests passing

### Phase 5: E2E Tests (Optional)
- [ ] Identify critical user workflows
- [ ] Create `tests/e2e/test_{domain}_workflow.py`
- [ ] Test complete user journeys
- [ ] Test cross-domain interactions
- [ ] Test saga event chains

### Phase 6: Automation
- [ ] Add pre-commit hooks
- [ ] Update CI/CD pipeline
- [ ] Generate coverage reports
- [ ] Review quality metrics

### Phase 7: Documentation
- [ ] Update test README
- [ ] Document domain-specific test patterns
- [ ] Create walkthrough of test execution

---

## Success Criteria

A domain migration is **complete** when:

- ✅ **Behavioral**: ≥80% code coverage, all tests green
- ✅ **Architectural**: 100% compliance, zero violations
- ✅ **Integration**: All cross-layer flows verified
- ✅ **E2E**: Critical workflows pass
- ✅ **CI/CD**: All quality gates pass
- ✅ **Documentation**: Test strategy documented

---

## Appendix: Quick Reference

### Test File Structure

```
tests/
├── architecture/          # Layer 2: Pattern compliance
│   └── test_{domain}_architecture.py
├── unit/                  # Layer 1: Behavioral
│   └── {domain}/
│       ├── conftest.py
│       ├── test_{domain}_service.py
│       ├── test_{domain}_repository.py
│       └── test_{domain}_api.py
├── integration/           # Layer 3: Cross-layer
│   └── {domain}/
│       ├── conftest.py
│       └── test_{domain}_integration.py
└── e2e/                   # Layer 4: Full system
    └── test_{feature}_workflow.py
```

### Common Assertions

```python
# ✅ GOOD: Test architecture
with pytest.raises(DomainError) as exc_info:
    await service.method(invalid_data)
assert exc_info.value.user_id == user_id  # Verify context

# ❌ BAD: Test only that error raised
with pytest.raises(Exception):
    await service.method(invalid_data)

# ✅ GOOD: Test correlation_id
assert event.correlation_id == correlation_id

# ❌ BAD: Don't test correlation_id
assert event.aggregate_id == entity_id  # Missing correlation check

# ✅ GOOD: Test logging structure
assert hasattr(log_record, 'user_id')
assert hasattr(log_record, 'correlation_id')

# ❌ BAD: Test log message only
assert "User created" in caplog.text
```

---

## Final Notes

This testing strategy is **mandatory** for all future domain migrations. Any PR that doesn't include all 4 test layers will be rejected in code review.

**Remember**: Tests are not just for catching bugs. Tests are for **enforcing architecture**.
