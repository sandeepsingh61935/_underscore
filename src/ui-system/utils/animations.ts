/**
 * Micro-animation utilities for consistent motion throughout the UI.
 * 
 * Usage:
 * - Import individual hooks for reactive animations
 * - Use CSS classes from global.css for declarative animations
 * - All animations respect prefers-reduced-motion
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for handling click/tap feedback animation
 */
export function usePressAnimation() {
    const [isPressed, setIsPressed] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handlePress = useCallback(() => {
        setIsPressed(true);

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setIsPressed(false);
        }, 150);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        isPressed,
        pressProps: {
            onMouseDown: handlePress,
            onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    handlePress();
                }
            },
        },
        pressClassName: isPressed ? 'scale-[0.98] transition-transform duration-100' : 'transition-transform duration-100',
    };
}

/**
 * Hook for staggered list item animations
 */
export function useStaggerAnimation(_itemCount: number, baseDelay = 50) {
    const getDelay = useCallback((index: number) => {
        return `${index * baseDelay}ms`;
    }, [baseDelay]);

    const getStyle = useCallback((index: number): React.CSSProperties => ({
        animationDelay: getDelay(index),
        opacity: 0,
        animation: `fadeSlideIn 300ms ease-out forwards`,
    }), [getDelay]);

    return { getDelay, getStyle };
}

/**
 * Hook for entrance animations
 */
export function useEntranceAnimation(delay = 0) {
    const [hasEntered, setHasEntered] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setHasEntered(true);
        }, delay);

        return () => clearTimeout(timeout);
    }, [delay]);

    return {
        hasEntered,
        entranceClassName: hasEntered
            ? 'opacity-100 translate-y-0 transition-all duration-300 ease-out'
            : 'opacity-0 translate-y-2',
    };
}

/**
 * Pre-defined animation class names for common patterns
 */
export const animationClasses = {
    // Fade animations
    fadeIn: 'animate-fadeIn',
    fadeOut: 'animate-fadeOut',

    // Slide animations
    slideInUp: 'animate-slideInUp',
    slideInDown: 'animate-slideInDown',
    slideInLeft: 'animate-slideInLeft',
    slideInRight: 'animate-slideInRight',

    // Scale animations
    scaleIn: 'animate-scaleIn',
    scaleOut: 'animate-scaleOut',

    // Hover effects (use as hover: prefix)
    hoverLift: 'hover:-translate-y-0.5 hover:shadow-md transition-all duration-200',
    hoverGlow: 'hover:shadow-lg hover:shadow-primary/20 transition-shadow duration-200',
    hoverScale: 'hover:scale-[1.02] transition-transform duration-200',

    // Focus effects
    focusRing: 'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',

    // Active/Press effects
    pressScale: 'active:scale-[0.98] transition-transform duration-100',

    // Button press feedback
    buttonPress: 'active:scale-[0.97] hover:scale-[1.01] transition-transform duration-150',
} as const;

/**
 * CSS keyframes to add to global.css for animation classes
 * (Already partially added, this documents what's available)
 */
export const animationKeyframes = `
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes fadeSlideIn {
    from { 
        opacity: 0; 
        transform: translateY(8px); 
    }
    to { 
        opacity: 1; 
        transform: translateY(0); 
    }
}

@keyframes scaleIn {
    from { 
        opacity: 0; 
        transform: scale(0.95); 
    }
    to { 
        opacity: 1; 
        transform: scale(1); 
    }
}

@keyframes slideInUp {
    from { 
        opacity: 0; 
        transform: translateY(16px); 
    }
    to { 
        opacity: 1; 
        transform: translateY(0); 
    }
}
`;
