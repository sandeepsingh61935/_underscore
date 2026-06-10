/**
 * @file prefersReducedMotion.ts
 * @description Reads the user's prefers-reduced-motion OS preference. SSR-safe.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
