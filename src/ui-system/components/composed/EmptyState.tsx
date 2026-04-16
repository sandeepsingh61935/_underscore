import {
  Search,
  FileText,
  Sparkles,
  Globe,
  FolderOpen,
  Highlighter,
  type LucideIcon,
} from 'lucide-react';
import React from 'react';

import { cn } from '../../utils/cn';

export type EmptyStateVariant =
  | 'no-highlights'
  | 'no-collections'
  | 'no-results'
  | 'welcome'
  | 'error'
  | 'custom';

export interface EmptyStateProps {
  /** Pre-defined variant for common use cases */
  variant?: EmptyStateVariant;
  /** Custom icon (overrides variant icon) */
  icon?: LucideIcon;
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantConfigs: Record<
  Exclude<EmptyStateVariant, 'custom'>,
  {
    icon: LucideIcon;
    title: string;
    description: string;
  }
> = {
  'no-highlights': {
    icon: Highlighter,
    title: 'No highlights yet',
    description: 'Start highlighting content on web pages to save them here.',
  },
  'no-collections': {
    icon: FolderOpen,
    title: 'No collections yet',
    description: 'Your highlighted websites will appear here organized by domain.',
  },
  'no-results': {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters.',
  },
  welcome: {
    icon: Sparkles,
    title: 'Welcome to _underscore',
    description:
      'Start highlighting content across the web and build your personal knowledge base.',
  },
  error: {
    icon: Globe,
    title: 'Something went wrong',
    description: 'We encountered an error. Please try again.',
  },
};

const sizeStyles = {
  sm: {
    container: 'py-6 px-4',
    iconWrapper: 'w-12 h-12',
    icon: 'w-6 h-6',
    title: 'text-title-small',
    description: 'text-body-small',
  },
  md: {
    container: 'py-8 px-6',
    iconWrapper: 'w-16 h-16',
    icon: 'w-8 h-8',
    title: 'text-title-medium',
    description: 'text-body-small',
  },
  lg: {
    container: 'py-12 px-8',
    iconWrapper: 'w-20 h-20',
    icon: 'w-10 h-10',
    title: 'text-title-large',
    description: 'text-body-medium',
  },
};

export function EmptyState({
  variant = 'custom',
  icon: CustomIcon,
  title: customTitle,
  description: customDescription,
  action,
  secondaryAction,
  size = 'md',
  className,
}: EmptyStateProps): React.ReactElement {
  // Get config from variant or use custom values
  const config = variant !== 'custom' ? variantConfigs[variant] : null;
  const Icon = CustomIcon || config?.icon || FileText;
  const title = customTitle || config?.title || 'No content';
  const description = customDescription || config?.description || '';

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        styles.container,
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'rounded-full bg-secondary flex items-center justify-center mb-4',
          styles.iconWrapper
        )}
      >
        <Icon className={cn('text-muted-foreground', styles.icon)} />
      </div>

      {/* Title */}
      <h3 className={cn('text-foreground mb-1', styles.title)}>{title}</h3>

      {/* Description */}
      {description && (
        <p className={cn('text-muted-foreground max-w-xs', styles.description)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-primary px-4 py-2 text-label-large text-primary-foreground transition-colors duration-short ease-standard hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-secondary px-4 py-2 text-label-large text-secondary-foreground transition-colors duration-short ease-standard hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
