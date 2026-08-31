/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L548-625 (V2_Skeleton)
 * V2 contract:
 *   - Surface: --paper-2, 2px radius, prefers-reduced-motion renders at 0.5 opacity.
 *   - 5 variants: base | text | avatar | collectionCard | highlightCard.
 *   - Wireframe collectionCard: 320x64, 40px avatar + 32px action circles.
 *   - Wireframe highlightCard: 320x80, 4px left rule, 3 text lines + meta.
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
 * V2 Skeleton — surface uses --paper-2; shimmer animation uses
 * --utility-overlay-08 for the highlight pass.
 */
export function Skeleton({ className, animation = 'pulse', style }: SkeletonProps) {
  return (
    <div
      className={cn(
        animation === 'pulse' && 'animate-pulse',
        animation === 'shimmer' && 'animate-shimmer',
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
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          animation={animation}
          className={cn(
            'h-4',
            // Last line is shorter for visual variety
            i === lines - 1 && lines > 1 && 'w-3/4'
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
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <Skeleton
      animation={animation}
      className={cn('rounded-full', sizes[size], className)}
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
    <div
      className={cn('flex items-center gap-4 p-4 rounded', className)}
      style={{ backgroundColor: 'var(--paper-2)', border: '1px solid var(--rule-soft)' }}
    >
      {/* Favicon placeholder */}
      <Skeleton animation={animation} className="shrink-0 w-10 h-10 rounded-lg" />

      {/* Content */}
      <div className="flex-1 space-y-2">
        <Skeleton animation={animation} className="h-4 w-3/4" />
        <Skeleton animation={animation} className="h-3 w-1/2" />
      </div>

      {/* Arrow placeholder */}
      <Skeleton animation={animation} className="shrink-0 w-8 h-8 rounded-full" />
    </div>
  );
}

/**
 * Skeleton matching HighlightCard layout
 */
export function SkeletonHighlightCard({ className, animation = 'pulse' }: SkeletonProps) {
  return (
    <div
      className={cn('p-4 rounded', className)}
      style={{
        backgroundColor: 'var(--paper-2)',
        border: '1px solid var(--rule-soft)',
        borderLeft: '4px solid var(--rule-soft)',
      }}
    >
      {/* Text lines */}
      <div className="space-y-2 mb-3">
        <Skeleton animation={animation} className="h-4 w-full" />
        <Skeleton animation={animation} className="h-4 w-11/12" />
        <Skeleton animation={animation} className="h-4 w-3/4" />
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-2">
        <Skeleton animation={animation} className="h-3 w-16" />
        <Skeleton animation={animation} className="h-3 w-24" />
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
    <div className={cn('flex flex-col gap-2', className)}>
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
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonHighlightCard key={i} animation={animation} />
      ))}
    </div>
  );
}
