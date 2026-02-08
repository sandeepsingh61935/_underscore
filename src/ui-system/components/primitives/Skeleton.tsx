import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps {
    className?: string;
    /** Animation style */
    animation?: 'pulse' | 'shimmer' | 'none';
}

/**
 * Base Skeleton component for creating loading placeholders
 */
export function Skeleton({
    className,
    animation = 'pulse',
}: SkeletonProps) {
    return (
        <div
            className={cn(
                "bg-secondary rounded-md",
                animation === 'pulse' && "animate-pulse",
                animation === 'shimmer' && "animate-shimmer bg-gradient-to-r from-secondary via-secondary/50 to-secondary bg-[length:200%_100%]",
                className
            )}
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
        <div className={cn("space-y-2", className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    animation={animation}
                    className={cn(
                        "h-4",
                        // Last line is shorter for visual variety
                        i === lines - 1 && lines > 1 && "w-3/4"
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
            className={cn("rounded-full", sizes[size], className)}
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
            className={cn(
                "flex items-center gap-4 p-4 bg-card border border-border rounded-xl",
                className
            )}
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
export function SkeletonHighlightCard({
    className,
    animation = 'pulse',
}: SkeletonProps) {
    return (
        <div
            className={cn(
                "p-4 bg-card border border-border border-l-4 border-l-secondary rounded-lg",
                className
            )}
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
        <div className={cn("flex flex-col gap-2", className)}>
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
        <div className={cn("flex flex-col gap-3", className)}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonHighlightCard key={i} animation={animation} />
            ))}
        </div>
    );
}
