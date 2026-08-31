/**
 * V2 tonalPill helpers — replace MD3 class strings with V2 tokens.
 * The pill is a "soft chip" container; the V2 version uses --rule-soft
 * for the border and --paper-2 for the surface, with --accent for the
 * active selected state.
 *
 * Used by Chip and any other primitive that renders a row of selectable
 * pills (e.g. TweaksPanel). The classes are still Tailwind-flavored
 * because Chip.tsx uses the cn() helper, but the underlying CSS
 * variables are V2.
 */

export const tonalPillShellClass =
  'inline-flex w-fit flex-wrap gap-1 rounded-full border border-[var(--rule-soft)] bg-[var(--paper-2)] p-1';

export const tonalPillBaseClass =
  'inline-flex min-h-[44px] items-center justify-center appearance-none rounded-full border border-transparent bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2';

export const tonalPillStandaloneClass = 'border-[var(--rule-soft)] bg-[var(--paper-2)]';

export const tonalPillActiveClass =
  'border-[var(--accent)] bg-[var(--paper-2)] text-[var(--accent)]';

export const tonalPillInactiveClass =
  'text-[var(--ink-2)] hover:bg-[color-mix(in_oklch,var(--ink)_6%,var(--paper-2))] hover:text-[var(--ink)]';

export const tonalPillDisabledClass =
  'pointer-events-none cursor-not-allowed border-[color-mix(in_oklch,var(--rule-soft)_60%,transparent)] bg-[color-mix(in_oklch,var(--paper-2)_60%,transparent)] text-[var(--ink-3)] opacity-50';
