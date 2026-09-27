/**
 * Design contract: src/ui-system/theme/global.css (Skeleton section)
 *   - Surface: --paper-2, --radius, prefers-reduced-motion renders at 0.5 opacity.
 *   - 5 variants: base | text | avatar | collectionCard | highlightCard.
 */
import React from 'react';

import { cn } from '../../utils/cn';

export interface SkeletonProps {
  className?: string;
  /** Animation style */
  animation?: 'pulse' | 'shimmer' | 'none';
  style?: React.CSSProperties;
}

/**
 * Editorial Skeleton — surface uses --paper-2; shimmer animation uses
 * --utility-overlay-08 for the highlight pass.
 */
export function Skeleton({ className, animation = 'pulse', style }: SkeletonProps) {
  return (
    <div
      className={cn(
        animation === 'pulse' && 'anim-pulse',
        animation === 'shimmer' && 'anim-shimmer',
        className
      )}
      style={{
        backgroundColor: 'var(--paper-2)',
        ...(animation === 'shimmer' && {
          backgroundImage: `linear-gradient(90deg, var(--paper-2) 0%, var(--utility-overlay-08) 50%, var(--paper-2) 100%)`,
          backgroundSize: '200% 100%',
        }),
        ...style,
      }}
    />
  );
}

/**
 * Skeleton variant for text lines
 */
export function SkeletonText({
  lines = 1,
  className,
  animation = 'pulse',
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('skeleton-text-stack', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          animation={animation}
          className={cn(
            'skeleton-line',
            // Last line is shorter for visual variety
            i === lines - 1 && lines > 1 && 'skeleton-w-3-4'
          )}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for circular avatars
 */
export function SkeletonAvatar({
  size = 'md',
  className,
  animation = 'pulse',
}: SkeletonProps & { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'skeleton-avatar-sm',
    md: 'skeleton-avatar-md',
    lg: 'skeleton-avatar-lg',
  };

  return (
    <Skeleton
      animation={animation}
      className={cn('skeleton-round', sizes[size], className)}
    />
  );
}

/**
 * Skeleton matching CollectionCard layout
 */
export function SkeletonCollectionCard({
  className,
  animation = 'pulse',
}: SkeletonProps) {
  return (
    <div className={cn('skeleton-card', className)}>
      {/* Favicon placeholder */}
      <Skeleton animation={animation} className="skeleton-fav" />

      {/* Content */}
      <div className="skeleton-body">
        <Skeleton animation={animation} className="skeleton-line skeleton-w-3-4" />
        <Skeleton animation={animation} className="skeleton-line-sm skeleton-w-1-2" />
      </div>

      {/* Arrow placeholder */}
      <Skeleton animation={animation} className="skeleton-action" />
    </div>
  );
}

/**
 * Skeleton matching HighlightCard layout
 */
export function SkeletonHighlightCard({ className, animation = 'pulse' }: SkeletonProps) {
  return (
    <div className={cn('skeleton-hl', className)}>
      {/* Text lines */}
      <div className="skeleton-hl-lines">
        <Skeleton animation={animation} className="skeleton-line skeleton-w-full" />
        <Skeleton animation={animation} className="skeleton-line skeleton-w-11-12" />
        <Skeleton animation={animation} className="skeleton-line skeleton-w-3-4" />
      </div>

      {/* Metadata */}
      <div className="skeleton-hl-meta">
        <Skeleton animation={animation} className="skeleton-line-sm skeleton-w-16" />
        <Skeleton animation={animation} className="skeleton-line-sm skeleton-w-24" />
      </div>
    </div>
  );
}

/**
 * Loading state for CollectionsView
 */
export function SkeletonCollectionsList({
  count = 4,
  className,
  animation = 'pulse',
}: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('skeleton-stack', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCollectionCard key={i} animation={animation} />
      ))}
    </div>
  );
}

/**
 * Loading state for DomainDetailsView
 */
export function SkeletonHighlightsList({
  count = 3,
  className,
  animation = 'pulse',
}: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('skeleton-stack skeleton-stack-gap', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonHighlightCard key={i} animation={animation} />
      ))}
    </div>
  );
}
