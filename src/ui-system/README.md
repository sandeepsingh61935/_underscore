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
├── tokens/
│   └── design-tokens.css  # Design token definitions
└── utils/
    ├── animations.ts      # Animation utilities
    └── cn.ts              # Class name utility
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

Design tokens are defined in `src/ui-system/theme/global.css` and `src/ui-system/tokens/design-tokens.css`.

### Color System

```css
--color-primary       /* Primary brand color */
--color-on-primary    /* Text on primary */
--color-secondary     /* Secondary color */
--color-surface       /* Surface backgrounds */
--color-background    /* App background */
--color-destructive   /* Error/delete actions */
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

## Storybook

Run Storybook to view all components:

```bash
npm run storybook
```

Build static Storybook:

```bash
npm run build-storybook
```

## Accessibility

All components follow accessibility best practices:

- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Focus states visible
- ✅ Screen reader friendly
- ✅ `prefers-reduced-motion` respected

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
