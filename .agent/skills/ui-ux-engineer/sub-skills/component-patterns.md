---
name: Component Patterns
description: Concrete code patterns extracted from existing components. Use these as templates when authoring or modifying UI.
---

# Component Patterns

Concrete patterns from the actual codebase. Do not reinvent these — copy and adapt.

---

## 1. Primitive Component Pattern (Button template)

Reference: [`src/ui-system/components/primitives/Button.tsx`](file:///home/sandy/projects/_underscore/src/ui-system/components/primitives/Button.tsx)

```tsx
import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/ui-system/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'filled', isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        // Base
        'inline-flex items-center justify-center gap-2',
        'rounded-full text-label-large min-h-[48px] px-6',
        'transition-all duration-short ease-standard',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:opacity-disabled disabled:pointer-events-none',
        // Variants
        variant === 'filled' && [
          'bg-primary text-on-primary shadow-elevation-1',
          'hover:shadow-elevation-2',
          'hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_8%,var(--md-sys-color-primary))]',
          'active:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_12%,var(--md-sys-color-primary))]',
        ],
        variant === 'outlined' && [
          'bg-transparent text-primary border border-outline',
          'hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]',
        ],
        variant === 'text' && [
          'bg-transparent text-primary px-3',
          'hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]',
        ],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = 'Button';
export { Button };
```

**Key rules demonstrated:**
- `forwardRef` always
- `cn()` with className last
- State layers use `color-mix()`, not `opacity-*`
- `disabled:opacity-disabled` from tailwind config (38%)

---

## 2. Card Pattern (with sub-components)

Reference: [`src/ui-system/components/primitives/Card.tsx`](file:///home/sandy/projects/_underscore/src/ui-system/components/primitives/Card.tsx)

```tsx
// Interactive card (renders as <button>)
<Card interactive onClick={handleClick}>
  <CardHeader>
    <CardTitle>Domain Name</CardTitle>
    <span className="text-label-medium text-on-surface-variant">12 items</span>
  </CardHeader>
  <CardDescription>Supporting text goes here</CardDescription>
</Card>

// Static card (renders as <div>)
<Card elevated className="my-2">
  <CardContent>Content here</CardContent>
  <CardFooter>
    <Button variant="text">Action</Button>
  </CardFooter>
</Card>
```

Sub-components available: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

---

## 3. View Component Pattern

Reference: [`src/features/modes/ModeSelectionView.tsx`](file:///home/sandy/projects/_underscore/src/features/modes/ModeSelectionView.tsx)

```tsx
import React, { useState } from 'react';
import { useApp } from '@/core/context/AppProvider';
import { Button } from '@/ui-system/components/primitives';
import { cn } from '@/ui-system/utils/cn';

interface MyViewProps {
  onBack?: () => void;
  onSignInClick?: () => void;
  onActionComplete: (result: string) => void;
}

export function MyView({ onBack, onSignInClick, onActionComplete }: MyViewProps) {
  const { isAuthenticated, user, currentMode } = useApp();
  const [localState, setLocalState] = useState(false); // transient UI only

  return (
    <div className="w-full h-full flex flex-col bg-surface text-on-surface overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
        {onBack && (
          <button
            onClick={onBack}
            className="h-12 w-12 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            aria-label="Go back"
          >
            ← {/* Use lucide-react ArrowLeft in practice */}
          </button>
        )}
        <span className="text-title-medium text-on-surface">View Title</span>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* Content here */}
      </main>

      {/* Optional footer */}
      <footer className="px-4 py-3 border-t border-outline-variant">
        <Button variant="filled" className="w-full" onClick={() => onActionComplete('done')}>
          Primary Action
        </Button>
      </footer>
    </div>
  );
}
```

---

## 4. Zustand Store Pattern

For new feature state that needs to be shared across sibling components.

```typescript
// src/features/collections/stores/collections.store.ts
import { create } from 'zustand';

interface CollectionsState {
  // State
  selectedDomain: string | null;
  sortBy: 'alphabetical' | 'usage' | 'recent';
  viewMode: 'list' | 'grid';

  // Actions (always co-located in the store)
  setSelectedDomain: (domain: string | null) => void;
  setSortBy: (sort: CollectionsState['sortBy']) => void;
  setViewMode: (mode: CollectionsState['viewMode']) => void;
  reset: () => void;
}

const initialState = {
  selectedDomain: null,
  sortBy: 'alphabetical' as const,
  viewMode: 'list' as const,
};

export const useCollectionsStore = create<CollectionsState>((set) => ({
  ...initialState,
  setSelectedDomain: (domain) => set({ selectedDomain: domain }),
  setSortBy: (sortBy) => set({ sortBy }),
  setViewMode: (viewMode) => set({ viewMode }),
  reset: () => set(initialState),
}));
```

**Usage in component:**
```tsx
const { sortBy, setSortBy } = useCollectionsStore();
// Read only what you need — Zustand will only re-render on that slice
```

**When NOT to use Zustand:**
- Auth, mode, theme → use `useApp()` 
- Component-local toggle (modal open, tab focus) → use `useState`
- Server data / async state → use a custom hook with `useState` + Chrome messaging

---

## 5. Radix UI Wrapper Pattern

Reference: [`src/ui-system/components/primitives/Dialog.tsx`](file:///home/sandy/projects/_underscore/src/ui-system/components/primitives/Dialog.tsx)

Always wrap Radix with project tokens. Never use Radix components directly in views.

```tsx
// ✅ Correct — use the project wrapper
import { AlertDialog } from '@/ui-system/components/primitives/AlertDialog';

// ❌ Wrong — never import Radix directly in views
import * as RadixAlertDialog from '@radix-ui/react-alert-dialog';
```

Wrapper pattern (how existing wrappers are structured):
```tsx
import * as RadixDialog from '@radix-ui/react-dialog';
import { cn } from '@/ui-system/utils/cn';

// Overlay: uses scrim + backdrop blur
const DialogOverlay = () => (
  <RadixDialog.Overlay className="fixed inset-0 z-50 bg-scrim/60 backdrop-blur-sm" />
);

// Content: uses surface-container-high + xl rounding (28px)
const DialogContent = ({ className, children, ...props }) => (
  <RadixDialog.Portal>
    <DialogOverlay />
    <RadixDialog.Content
      className={cn(
        'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
        'w-[calc(100%-32px)] max-w-sm',
        'bg-surface-container-high text-on-surface rounded-xl shadow-elevation-3',
        'p-6',
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </RadixDialog.Content>
  </RadixDialog.Portal>
);
```

---

## 6. Chrome IPC Pattern

For communicating with the background service worker. Only use inside hooks, never in components directly.

```typescript
// Inside a hook (e.g., src/features/auth/hooks/useCurrentUser.ts)
const response = await chrome.runtime.sendMessage({
  type: 'GET_AUTH_STATE',   // String constant — use shared enum when available
  payload: {},
  timestamp: Date.now()
});

if (response?.success && response.data) {
  // handle success
} else {
  // handle failure: response?.error
}

// Listening for background push messages
const handleMessage = (message: any) => {
  if (message?.type === 'AUTH_STATE_CHANGED') {
    // update local state
  }
};
chrome.runtime.onMessage.addListener(handleMessage);
// Always clean up in useEffect return
return () => chrome.runtime.onMessage.removeListener(handleMessage);
```

---

## 7. Mode-to-UI Mapping

The internal mode names differ from display names. Always use this mapping:

| Internal ID | Display Name | Icon | Requires Auth |
|---|---|---|---|
| `walk` | Focus | 🚶 | No |
| `sprint` | Capture | 🏃 | No |
| `vault` | Memory | 🔐 | **Yes** |
| `neural` | Neural | 🧠 | **Yes** |

Locked mode UI: `opacity-disabled` + 🔒 icon + click triggers `onSignInClick`.
Active mode: accent color (`text-primary`) + checkmark.

---

## 8. Header Variants

| State | Left | Right |
|---|---|---|
| Unauthenticated | Logo | "Sign In" text button |
| Authenticated | Logo | Settings icon + User avatar → `<AccountMenu>` |
| Detail view | Back arrow | Optional action |

---

## 9. Common Composition Anti-Patterns

```tsx
// ❌ Wrong: inline styles with CSS vars
<div style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>

// ✅ Correct: Tailwind semantic classes
<div className="bg-surface text-on-surface">

// ❌ Wrong: arbitrary values for colors
<div className="bg-[#1a1a2e]">

// ✅ Correct: token class
<div className="bg-surface-container-lowest">

// ❌ Wrong: shadow for depth
<div className="shadow-md">

// ✅ Correct: elevation token
<div className="shadow-elevation-2">

// ❌ Wrong: font-bold for emphasis
<span className="font-bold">Important</span>

// ✅ Correct: use larger type scale for hierarchy
<span className="text-title-small text-on-surface">Important</span>

// ❌ Wrong: using router navigate for view changes
const navigate = useNavigate();
navigate('/settings');

// ✅ Correct: callback prop
props.onSettingsClick();
```
