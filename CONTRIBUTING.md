/\*\*

- @file CONTRIBUTING.md
- @description Contribution guidelines for the project \*/

# Contributing to Underscore Web Highlighter

Thank you for your interest in contributing! This document provides guidelines
for contributing to the project.

---

## Getting Started

### 1. Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd _underscore

# Install dependencies
npm install

# Run WXT in development mode
npm run dev

# Run tests
npm test
```

### 2. Before You Start

- Read the [Quality Framework](./docs/05-quality-framework/README.md)
- Understand
  [Coding Standards](./docs/05-quality-framework/02-coding-standards.md)
- Review
  [Architecture Principles](./docs/05-quality-framework/03-architecture-principles.md)

---

## Development Workflow

### 1. Making Changes

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes following coding standards
3. Write/update tests (maintain 80%+ coverage)
4. Run quality checks: `npm run quality`
5. Commit with descriptive messages

### 2. Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```
feat(content): add highlight selection detection
fix(logger): handle undefined metadata gracefully
docs(readme): update installation instructions
test(errors): add coverage for NotFoundError
```

### 3. Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

**Requirements**:

- All new code must have tests
- Maintain ≥80% coverage
- Follow AAA pattern (Arrange-Act-Assert)

---

## Code Quality Standards

### Pre-Commit Checklist

- [ ] Code follows TypeScript strict mode
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] Tests pass (`npm test`)
- [ ] Coverage maintained (≥80%)
- [ ] Type check passes (`npm run type-check`)

### Run All Quality Checks

```bash
npm run quality
```

This runs:

1. TypeScript type checking
2. ESLint
3. Prettier format check
4. All tests

---

## Pull Request Process

### 1. Before Submitting

- Ensure all quality checks pass
- Update documentation if needed
- Add tests for new features
- Rebase on latest main branch

### 2. PR Description

Include:

- **What**: What changes you made
- **Why**: Why these changes are needed
- **How**: How you implemented them
- **Testing**: How you tested the changes

### 3. Review Process

- Code will be reviewed for quality and design
- Address all feedback
- Maintain a clean commit history

---

## Project Structure

```
src/
├── entrypoints/       # WXT entry points (content, background, popup)
├── content/           # Content script modules
├── background/        # Background worker modules
├── popup/             # Popup UI
├── shared/            # Shared utilities (logger, errors, etc.)
└── types/             # TypeScript types

tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── e2e/               # End-to-end tests
```

---

## Style Guide

### TypeScript

```typescript
// ✅ Good: Explicit types, single responsibility
export class HighlightService implements IHighlightService {
  constructor(
    private readonly repository: IHighlightRepository,
    private readonly logger: ILogger
  ) {}

  async createHighlight(text: string): Promise<Highlight> {
    this.logger.debug('Creating highlight', { text });

    if (!text?.trim()) {
      throw new ValidationError('Text cannot be empty');
    }

    const highlight = HighlightFactory.create(text);
    await this.repository.save(highlight);

    return highlight;
  }
}

// ❌ Bad: Implicit types, multiple responsibilities
class Service {
  constructor(
    private repo: any,
    private log: any
  ) {}

  async create(text) {
    if (!text) throw new Error('bad');
    let h = { id: Math.random(), text };
    await this.repo.save(h);
    console.log('done');
    return h;
  }
}
```

### Naming Conventions

- **Files**: `kebab-case` (`highlight-service.ts`)
- **Classes**: `PascalCase` (`HighlightService`)
- **Interfaces**: `IPascalCase` (`ILogger`)
- **Variables**: `camelCase` (`highlightCount`)
- **Constants**: `UPPER_SNAKE_CASE` (`MAX_HIGHLIGHTS`)

---

## Getting Help

- Check existing [documentation](./docs/)
- Review [quality framework](./docs/05-quality-framework/)
- Ask questions in GitHub issues

---

## License

By contributing, you agree that your contributions will be licensed under the
same license as the project (ISC).
