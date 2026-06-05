---
name: Full-Stack Developer
description: Complete guidelines for building UI, backend services, data layer, and IPC in the _underscore project. Covers file placement, component authoring, state management, repository pattern, event sourcing, Chrome messaging, and the web app.
---

# Full-Stack Developer Skill — _underscore

**Before any work, read this file. Then read the relevant sub-skills.**

- [design-tokens.md](./sub-skills/design-tokens.md) — Token lookup for every styling decision
- [component-patterns.md](./sub-skills/component-patterns.md) — UI code patterns and templates
- [backend-patterns.md](./sub-skills/backend-patterns.md) — Repository, service, event sourcing, IPC patterns
- [web-app-patterns.md](./sub-skills/web-app-patterns.md) — Web app pages, routing, auth, data fetching

---

## 1. Golden Rules (Never Violate)

**Frontend**
1. Never hardcode a color. Use V2 CSS custom properties: `var(--paper)`, `var(--ink)`, `var(--accent)`, `var(--rule)`.
2. Never use bare Tailwind colors (`bg-blue-500`, `text-gray-700`) — Tailwind utilities are removed.
3. Never use arbitrary font sizes. Use V2 step scale: `var(--step-0)` through `var(--step-6)`.
4. Never use `box-shadow`. V2 uses borders: `border: 1px solid var(--rule-soft)`.
5. Never use `opacity-*` for hover states. Use CSS `:hover` pseudo-class only.
6. Never use explicit font-weight declarations. V2 type scale handles weight via `var(--serif)` / `var(--sans)` / `var(--mono)`.
7. Never create a new CSS variable. Use existing V2 vars from `ui_kits/extension/v2/tokens.css`.
8. Never bypass the barrel export. Import primitives from `@/ui-system/components/primitives`.

**Backend**
9. Never call Supabase directly from UI components — always go through a repository or hook.
10. Never mutate events in event sourcing — append only.
11. Never call `chrome.runtime.sendMessage` directly in views — wrap in a hook.
12. Never trust client-provided data — validate at every service boundary.

---

## 2. Technology Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Build (extension) | WXT + Vite | Extension-first, MV3 |
| Build (web) | Vite | `vite.config.web.ts` |
| Framework | React 19 | Strict mode |
| Styling | Tailwind CSS v4 + CSS Variables | `tailwind.config.ts` → `global.css` |
| Routing (popup) | `View` enum + `useState` | No React Router in popup |
| Routing (web) | React Router v7 | Protected routes, lazy loading |
| Primitives | Radix UI + custom wrappers | Never use Radix directly in views |
| Variants | `class-variance-authority` (CVA) | For multi-variant components |
| Class merge | `cn()` via `clsx` + `tailwind-merge` | Always for dynamic classnames |
| Icons | `lucide-react` | Do not add other icon libraries |
| State (global) | React Context (`useApp()`) | Auth, mode, theme |
| State (feature) | Zustand stores | New feature state |
| State (async/IPC) | Custom hooks | Chrome messaging to background |
| Backend (extension) | Supabase via `SupabaseClient` | Repository pattern wrapper |
| Auth | Supabase GoTrue | Google OAuth + email/password |
| Encryption | AES-256-GCM | `src/shared/utils/crypto-utils.ts` |
| Event sourcing | Custom store/publisher/replayer | `src/background/sync/` |
| DI | Custom container | `src/shared/di/container.ts` |

---

## 3. File Placement Rules

### Views (full-screen panels)
| Category | Location |
|----------|----------|
| Popup entry views (coupled to nav enum) | `src/entrypoints/popup/views/` |
| Feature views (vault, collections, modes) | `src/features/<feature>/views/` |
| Page-level views (settings, welcome) | `src/pages/` |
| Web app public pages | `src/web/pages/` |
| Web app authenticated app pages | `src/web/app/` |

### Components
| Category | Location |
|----------|----------|
| Primitive UI atoms | `src/ui-system/components/primitives/` |
| Composed feature components | `src/features/<feature>/components/` |
| Layout wrappers | `src/ui-system/layout/` |
| Web app specific components | `src/web/components/` |

### Hooks
| Category | Location |
|----------|----------|
| App-wide shared hooks | `src/ui-system/hooks/` |
| Feature-specific hooks | `src/features/<feature>/hooks/` |
| Auth hooks | `src/features/auth/hooks/` |
| Web app hooks | `src/web/hooks/` |

### Stores (Zustand)
- Feature stores: `src/features/<feature>/stores/<feature>.store.ts`
- Global UI store: `src/core/stores/ui.store.ts`

### Services / Repositories
| Category | Location |
|----------|----------|
| Platform-agnostic services | `src/shared/services/` |
| Background-only services | `src/background/services/` |
| Shared interfaces | `src/shared/interfaces/`, `src/shared/repositories/` |
| API clients | `src/background/api/` |
| DI registrations | `src/shared/di/` |

---

## 4. Frontend Patterns

### Component Authoring (Primitive Template)

Every primitive must:
1. Use `forwardRef`
2. Extend native HTML element props
3. Use `cn()` for all className merging (className always last)
4. Export a `displayName`

```typescript
import React, { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/ui-system/utils/cn';

export interface MyComponentProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'emphasized';
}

const MyComponent = forwardRef<HTMLDivElement, MyComponentProps>(
  ({ className, variant = 'default', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'base-classes here',
        variant === 'emphasized' && 'emphasized-classes',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

MyComponent.displayName = 'MyComponent';
export { MyComponent };
```

### View Component Pattern

```typescript
interface MyViewProps {
  onBack?: () => void;
  onActionComplete: (result: string) => void;
}

export function MyView({ onBack, onActionComplete }: MyViewProps) {
  const { isAuthenticated, user, currentMode } = useApp();
  const [localState, setLocalState] = useState(false);

  return (
    <div className="w-full h-full flex flex-col bg-surface text-on-surface overflow-hidden">
      {/* Header */}
      {/* Content — flex-1 + overflow-y-auto if scrollable */}
      {/* Footer — if needed */}
    </div>
  );
}
```

### State Management Decision Tree

```
Need state? →
  Is it auth/mode/theme? → useApp() from Context
  Is it feature-level, shared by siblings? → Zustand store
  Is it async data from Chrome IPC? → Custom hook with useState
  Is it component-local (open/closed, focus)? → useState
```

### Navigation Model (Popup)

The popup does NOT use React Router `<Route>`. Instead:

```typescript
enum View {
  LOADING, WELCOME, MODE_SELECTION, COLLECTIONS, DOMAIN_DETAILS, AUTH, SETTINGS
}
const [currentView, setCurrentView] = useState<View>(View.LOADING);
```

Rules:
- All view switching in `popup/index.tsx` only
- Views receive callback props: `onBack`, `onSignInClick`, `onCollectionClick`
- Never call `setCurrentView` from inside a view — emit via callback
- To add a view: add to enum, add handler, add JSX branch

### Popup Constraints

- Hard-coded 400×600px in `base.css`
- Root: always `w-[400px] h-[600px]` or `w-full h-full` inside `AppShell`
- Never use `vh`, `vw`, `100%` heights on inner containers — use `flex-1`
- Overflow: `overflow-y-auto scrollbar-hide` for scrollable lists

### V2 Compliance Checklist

Before completing any UI work:
- [ ] No hardcoded colors (run: `grep -rn '#[0-9a-fA-F]\{3,8\}' src/ --include='*.tsx'`)
- [ ] No legacy MD3/Ink/Style C vars (run: `grep -rn 'var(--md-sys-\|var(--ink-[0-9]\|var(--bg\|var(--text-primary\|var(--border\b\|var(--shadow-' src/ --include='*.tsx'`)
- [ ] All interactive elements ≥ 44px touch target
- [ ] Borders use `var(--rule)` or `var(--rule-soft)` — not `shadow-elevation-*`
- [ ] Typography uses `var(--step-*)` scale and `var(--serif)`/`var(--sans)`/`var(--mono)`
- [ ] Build passes: `npm run build && npm run type-check`

---

## 5. Backend Patterns

### Data Flow (Extension)

```
UI component
  → hook (useCollections, useCurrentUser)
    → chrome.runtime.sendMessage
      → background message handler
        → service (injected via DI)
          → repository (IHighlightRepository)
            → storage adapter (IndexedDB / Supabase)
```

### Data Flow (Web App)

```
UI component
  → hook (useSWR / TanStack Query)
    → API client function
      → Cloudflare Worker (HTTP)
        → Hono route handler
          → auth validation (JWT)
            → service
              → Supabase
```

### Repository Pattern

```typescript
// 1. Interface in src/shared/repositories/
interface IHighlightRepository {
  save(highlight: HighlightData): Promise<void>;
  findById(id: string): Promise<HighlightData | null>;
  findByUrl(url: string): Promise<HighlightData[]>;
  delete(id: string): Promise<void>;
}

// 2. Implementation in src/background/repositories/ or src/shared/repositories/
class IndexedDBHighlightRepository implements IHighlightRepository {
  constructor(private readonly logger: ILogger) {}
  // ...implementations
}

// 3. Registration in src/shared/di/
container.register<IHighlightRepository>(
  'IHighlightRepository',
  IndexedDBHighlightRepository,
  { lifecycle: 'singleton' }
);
```

### Service Pattern

```typescript
class HighlightService {
  constructor(
    private readonly repository: IHighlightRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
  ) {}

  async createHighlight(data: CreateHighlightInput): Promise<HighlightData> {
    this.logger.debug('Creating highlight', { url: data.url });
    const highlight = { ...data, id: crypto.randomUUID(), createdAt: Date.now() };
    await this.repository.save(highlight);
    this.eventBus.emit('highlight:created', highlight);
    return highlight;
  }
}
```

### Event Sourcing Rules

- Events are append-only — never update or delete
- Every event has: `id`, `type`, `payload`, `timestamp`, `version`, `checksum`
- Use `EventPublisher` to emit events, never write to events table directly
- `EventReplayer` reconstructs current state from event stream
- `EventValidator` validates checksums on replay

### Chrome IPC Pattern

```typescript
// In a hook (NEVER in a view component directly)
const response = await chrome.runtime.sendMessage({
  type: 'GET_AUTH_STATE',  // Use constants from src/shared/messaging/message-types.ts
  payload: {},
  timestamp: Date.now()
});

if (response?.success && response.data) {
  // handle success
} else {
  // handle failure: response?.error
}

// Always clean up listeners in useEffect return
useEffect(() => {
  const handleMessage = (message: any) => {
    if (message?.type === 'AUTH_STATE_CHANGED') { /* update state */ }
  };
  chrome.runtime.onMessage.addListener(handleMessage);
  return () => chrome.runtime.onMessage.removeListener(handleMessage);
}, []);
```

### API Client Usage

Three layers of API client (use outermost appropriate layer):
1. `EncryptedAPIClient` — for sensitive user data (content of highlights)
2. `ResilientAPIClient` — for standard operations (circuit breaker, retry)
3. `SupabaseClient` — base implementation (only used internally by above)

---

## 6. Anti-Patterns

```typescript
// FRONTEND ANTI-PATTERNS
// ❌ Hardcoded color
<div className="bg-[#1a1a2e]">
// ✅ Token class
<div className="bg-surface-container-lowest">

// ❌ Using navigate() for popup views
navigate('/settings');
// ✅ Callback prop
props.onSettingsClick();

// ❌ Calling chrome.runtime.sendMessage in a view
await chrome.runtime.sendMessage({ type: 'LOGIN' });
// ✅ Use the hook
const { login } = useCurrentUser();
await login(credentials);

// ❌ Raw Radix in views
import * as RadixDialog from '@radix-ui/react-dialog';
// ✅ Project wrapper
import { Dialog } from '@/ui-system/components/primitives/Dialog';

// BACKEND ANTI-PATTERNS
// ❌ Direct Supabase query in a component
const { data } = await supabase.from('highlights').select('*');
// ✅ Repository through DI
const highlights = await highlightRepository.findByUrl(url);

// ❌ Mutating an event
await db.update('events', { id }, { payload: newPayload });
// ✅ Append new corrective event
await eventPublisher.publish({ type: 'HIGHLIGHT_CORRECTED', payload: correction });
```

---

## 7. Conflict Resolution Priority

When there is a conflict or specification gap:

1. **`ui_kits/extension/v2/tokens.css`** — Highest authority (V2 token definitions)
2. **`ui_kits/extension/v2/*.jsx`** — Wireframe visual spec
3. **`src/ui-system/theme/global.css`** — Implemented token values
4. **`.agent/workflows/v2-tokens-reference.md`** — Token lookup guide

Do NOT use `docs/material_design_reference/` — archived. Do NOT reference m3.material.io — MD3 has been removed from this project.
