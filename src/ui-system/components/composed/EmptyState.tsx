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

// V2 step scale: --step--1=11, --step-0=13, --step-1=15, --step-2=18, --step-3=22
const sizeStyles = {
  sm: {
    container: { padding: '24px 16px' },
    iconWrapper: { width: '48px', height: '48px' },
    icon: { width: '24px', height: '24px' },
    title: { fontSize: 'var(--step-0)' },
    description: { fontSize: 'var(--step--1)' },
  },
  md: {
    container: { padding: '32px 24px' },
    iconWrapper: { width: '64px', height: '64px' },
    icon: { width: '32px', height: '32px' },
    title: { fontSize: 'var(--step-1)' },
    description: { fontSize: 'var(--step--1)' },
  },
  lg: {
    container: { padding: '48px 32px' },
    iconWrapper: { width: '80px', height: '80px' },
    icon: { width: '40px', height: '40px' },
    title: { fontSize: 'var(--step-3)' },
    description: { fontSize: 'var(--step-0)' },
  },
} as const;

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
  const config = variant !== 'custom' ? variantConfigs[variant] : null;
  const Icon = CustomIcon || config?.icon || FileText;
  const title = customTitle || config?.title || 'No content';
  const description = customDescription || config?.description || '';

  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        className
      )}
      style={styles.container}
    >
      <div
        className="rounded-full flex items-center justify-center mb-4"
        style={{
          ...styles.iconWrapper,
          backgroundColor: 'var(--paper-2)',
        }}
      >
        <Icon
          className={cn('shrink-0')}
          style={{ ...styles.icon, color: 'var(--ink-3)' }}
        />
      </div>

      <h3 className="mb-1" style={{ color: 'var(--ink)', ...styles.title }}>
        {title}
      </h3>

      {description && (
        <p
          className="max-w-xs"
          style={{ color: 'var(--ink-3)', ...styles.description }}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex min-h-[44px] items-center justify-center rounded px-4 py-2 transition-colors duration-step-0 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-ink)',
                fontSize: 'var(--step-0)',
              }}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex min-h-[44px] items-center justify-center rounded px-4 py-2 transition-colors duration-step-0 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
              style={{
                backgroundColor: 'var(--paper-2)',
                color: 'var(--ink)',
                fontSize: 'var(--step-0)',
              }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
