# UI System Component Index

This document provides a comprehensive index of all UI components in the `_underscore` extension.

## Directory Structure

```
src/ui-system/
├── components/
│   ├── composed/          # Higher-level components (business logic)
│   │   ├── CollectionCard.tsx
│   │   ├── EmptyState.tsx
│   │   ├── HighlightCard.tsx
│   │   ├── ModeCard.tsx
│   │   ├── ModeSelector.tsx
│   │   ├── ProviderButton.tsx
│   │   ├── Toast.tsx
│   │   └── UserMenu.tsx
│   ├── layout/            # Layout components
│   │   └── Header.tsx
│   └── primitives/        # Base components
│       ├── DropdownMenu.tsx
│       └── Skeleton.tsx
├── layout/
│   └── AppShell.tsx       # Main layout wrapper
├── pages/                 # Page-level components
│   ├── CollectionsView.tsx
│   ├── DomainDetailsView.tsx
│   ├── ModeSelectionView.tsx
│   └── SignInView.tsx
├── theme/
│   └── global.css         # Global styles and design tokens

└── utils/
    ├── animations.ts      # Animation utilities
    ├── cn.ts              # Class name utility
    └── tonalPill.ts       # Shared tonal pill / segmented control classes
```

## Component Reference

### Composed Components

| Component | Description | Props |
|-----------|-------------|-------|
| `CollectionCard` | Displays a domain collection with favicon, count | `domain`, `category?`, `favicon?`, `count`, `onClick?` |
| `EmptyState` | Configurable empty state with variants | `variant?`, `icon?`, `title?`, `description?`, `action?` |
| `HighlightCard` | Displays a highlight with actions | `highlight`, `onCopy?`, `onDelete?`, `onNavigate?` |
| `ModeCard` | Mode selection card with states | `id`, `label`, `description?`, `icon?`, `isActive?`, `isLocked?` |
| `ModeSelector` | Composed mode selection list | `currentModeId`, `onSelect`, `isAuthenticated?` |
| `ProviderButton` | OAuth provider button | `provider`, `onClick`, `isLoading?`, `disabled?` |
| `Toast` | Notification toast with variants | Use via `ToastProvider` + `useToast()` |
| `UserMenu` | User dropdown menu with settings | `user`, `onLogout`, `onThemeChange?` |

### Page Components

| Component | Description | Usage |
|-----------|-------------|-------|
| `AppShell` | Main layout wrapper (400x600px) | Wrap all popup content |
| `CollectionsView` | Collections list with search/sort | Main collections page |
| `DomainDetailsView` | Domain highlights list | Detail page |
| `ModeSelectionView` | Mode selection screen | Onboarding/settings |
| `SignInView` | Authentication screen | Sign in flow |

### Primitives

| Component | Description |
|-----------|-------------|
| `Skeleton` | Base skeleton loader |
| `SkeletonText` | Multi-line text skeleton |
| `SkeletonAvatar` | Circular avatar skeleton |
| `SkeletonCollectionCard` | Collection card loading state |
| `SkeletonHighlightCard` | Highlight card loading state |

## Design Tokens

Design tokens are defined in `src/ui-system/theme/global.css` and `ui_kits/extension/v2/tokens.css`.

See `.agent/workflows/v2-tokens-reference.md` for the complete V2 token lookup table.

### V2 Color System

```css
/* Surface & Ink */
--paper       /* Warm off-white — view background */
--paper-2     /* Slightly warmer — card/container */
--ink         /* Near-black — primary text */
--ink-2       /* Medium — secondary text */
--ink-3       /* Light — muted/tertiary text */
--ink-4       /* Very light — placeholder, disabled */

/* Accent (terracotta — all modes) */
--accent      /* oklch(62% 0.12 45) — CTAs, mode glyphs */
--accent-ink  /* Text on accent background */

/* Borders */
--rule        /* Standard border */
--rule-soft   /* Subtle border / card edge */
```

### Spacing Scale

```css
--spacing-1  /* 4px */
--spacing-2  /* 8px */
--spacing-3  /* 12px */
--spacing-4  /* 16px */
--spacing-6  /* 24px */
--spacing-8  /* 32px */
```

### Animation Classes

```css
.animate-fadeIn       /* Fade in */
.animate-fadeSlideIn  /* Fade + slide up */
.animate-scaleIn      /* Scale + fade in */
.animate-slideInUp    /* Slide up */
.animate-shimmer      /* Shimmer effect (skeletons) */
```

## Verification

To verify components after editing:

```bash
# Build
npm run build

# Type check
npm run type-check

# Check for legacy token violations
bash scripts/check-legacy-ds.sh
```

> Storybook has been removed from this project (Layer 8). No `.stories.tsx` files required.

## Accessibility

All components follow accessibility best practices:

- [x] ARIA labels on interactive elements
- [x] Keyboard navigation support
- [x] Focus states visible
- [x] Screen reader friendly
- [x] `prefers-reduced-motion` respected

## Usage Example

```tsx
import { AppShell } from '@/ui-system/layout/AppShell';
import { CollectionCard } from '@/ui-system/components/composed/CollectionCard';
import { EmptyState } from '@/ui-system/components/composed/EmptyState';

function MyPage() {
    const collections = [...];
    
    return (
        <AppShell>
            {collections.length > 0 ? (
                collections.map(c => (
                    <CollectionCard
                        key={c.id}
                        domain={c.domain}
                        count={c.count}
                        onClick={() => navigate(`/domain/${c.id}`)}
                    />
                ))
            ) : (
                <EmptyState variant="no-collections" />
            )}
        </AppShell>
    );
}
```
