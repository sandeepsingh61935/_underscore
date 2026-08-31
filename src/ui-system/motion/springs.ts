/**
 * Framer Motion spring presets for _underscore Ink & Glass motion system.
 * Import and use these instead of arbitrary stiffness/damping values.
 */
export const springs = {
  /** Page transitions, modals entering — feels natural, slight overshoot */
  gentle: { type: 'spring', stiffness: 120, damping: 20, mass: 1.0 } as const,

  /** Segmented controls, card hover — quick, snappy, confident */
  snappy: { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 } as const,

  /** CTA buttons, mode selection — energetic with visible bounce */
  bounce: { type: 'spring', stiffness: 400, damping: 22, mass: 0.7 } as const,

  /** Background/ambient effects — slow, gentle drift */
  slow: { type: 'spring', stiffness: 80, damping: 20, mass: 1.2 } as const,
} as const;

export type SpringPreset = keyof typeof springs;
