# Underscore Web Highlighter

**Status**: 🚧 Sprint 0 - Infrastructure Setup  
**Version**: 0.1.0  
**License**: ISC

---

## Overview

A browser extension for intelligent web highlighting with three modes:

- **🏃 Sprint Mode** (Current Focus): Ephemeral highlighting for focused reading
- **🔐 Vault Mode** (Future): Persistent storage with cross-device sync
- **🧠 Gen Mode** (Future): AI-powered insights and knowledge synthesis

---

## Project Structure

```
_underscore/
├── src/
│   ├── content/           # Content scripts
│   ├── background/        # Background service worker
│   ├── popup/             # Popup UI
│   ├── shared/            # Shared code
│   │   ├── interfaces/    # TypeScript interfaces
│   │   ├── entities/      # Domain entities
│   │   ├── utils/         # Utilities (logger, errors)
│   │   └── constants/     # Constants
│   ├── components/        # UI components
│   └── types/             # TypeScript type definitions
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── e2e/               # End-to-end tests (Playwright)
│   ├── fixtures/          # Test fixtures
│   └── helpers/           # Test helpers
├── docs/
│   ├── 05-quality-framework/  # Quality standards
│   ├── 02-architecture/       # Architecture docs
│   └── 03-implementation/     # Implementation plans
└── public/                # Static assets
```

---

## Development Setup

### Prerequisites

- Node.js ≥ 20.0.0
- npm ≥ 10.0.0

### Installation

```bash
# Clone repository
git clone <repository-url>
cd _underscore

# Install dependencies
npm install
```

### Available Scripts

```bash
# Development
npm run dev               # Start development server

# Build
npm run build            # Build for production
npm run clean            # Clean build artifacts

# Quality Checks
npm run type-check       # TypeScript type checking
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier
npm run format:check     # Check formatting
npm run quality          # Run all quality checks

# Testing
npm test                 # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:ui          # Open Vitest UI
npm run test:e2e         # Run E2E tests (Playwright)
npm run test:e2e:ui      # Open Playwright UI
```

---

## Quality Framework

This project follows a comprehensive quality framework:

- **Design Patterns**: Plugin architecture, Dependency Injection, Event Bus
- **Type Safety**: TypeScript strict mode, 100% type coverage
- **Error Handling**: Custom error hierarchy with operational/programmer
  distinction
- **Logging**: Structured logging with multiple levels
- **Testing**: 80% coverage requirement (unit, integration, E2E)
- **Code Quality**: ESLint + Prettier, complexity limits

📚 **Documentation**: See
[`docs/05-quality-framework/`](./docs/05-quality-framework/README.md)

---

## Current Progress

### Sprint 0: Infrastructure & Foundation ✅

- [x] Project initialization
- [x] TypeScript strict configuration
- [x] ESLint & Prettier setup
- [x] Vitest configuration
- [x] Playwright configuration
- [x] Project structure
- [x] Logger implementation
- [x] Error handling framework
- [x] Initial unit tests
- [ ] Build tool setup (WXT or Vite)
- [ ] Manifest.json (v3)

---

## Technology Stack

### Core

- **TypeScript 5.9+** (strict mode)
- **Manifest V3** (Chrome Extension API)

### Development Tools

- **Vite/WXT** - Build tool
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing
- **Playwright** - E2E testing

### Quality Standards

- ✅ 80%+ test coverage
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ Strict type checking
- ✅ Complexity limits enforced

---

## Coding Standards

### Naming Conventions

- **Files**: `kebab-case` (`highlight-service.ts`)
- **Classes**: `PascalCase` (`HighlightService`)
- **Interfaces**: `IPascalCase` (`ILogger`)
- **Variables**: `camelCase` (`highlightCount`)
- **Constants**: `UPPER_SNAKE_CASE` (`MAX_HIGHLIGHTS`)

### Import Organization

```typescript
// 1. External imports
import { v4 as uuidv4 } from 'uuid';

// 2. Internal types
import type { ILogger } from '@/shared/interfaces';

// 3. Internal implementations
import { ConsoleLogger } from '@/shared/utils/logger';

// 4. Constants
import { DEFAULT_COLOR } from '@/shared/constants';
```

---

## Testing

### Unit Tests

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

### E2E Tests

```bash
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Interactive mode
```

### Coverage Requirements

- Overall: ≥80%
- Branches: ≥75%
- Critical paths: 100%

---

## Contributing

1. Read [Quality Framework](./docs/05-quality-framework/README.md)
2. Follow [Coding Standards](./docs/05-quality-framework/02-coding-standards.md)
3. Write tests for new code
4. Run quality checks: `npm run quality`
5. Ensure all checks pass

---

## Architecture Principles

### SOLID

- ✅ Single Responsibility
- ✅ Open/Closed
- ✅ Liskov Substitution
- ✅ Interface Segregation
- ✅ Dependency Inversion

### Core Principles

- ✅ KISS (Keep It Simple)
- ✅ YAGNI (You Aren't Gonna Need It)
- ✅ DRY (Don't Repeat Yourself)

See
[Architecture Principles](./docs/05-quality-framework/03-architecture-principles.md)

---

## License

ISC

---

## Author

Sandeep Singh

---

## Status

**Current**: Sprint 0 - Infrastructure Setup  
**Next**: Sprint 1 - Core Highlighting Implementation

See
[Sprint Mode Implementation Plan](./docs/03-implementation/sprint_mode_implementation_plan.md)
for details.
