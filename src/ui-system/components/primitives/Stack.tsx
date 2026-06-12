/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L444-491
 * V2 contract:
 *   - Stack slides between sibling levels in 220ms with translateX(±30%) + opacity.
 *   - Reduced motion mode swaps levels instantly.
 */
import React, { type ReactElement, type ReactNode } from 'react';

import { prefersReducedMotion } from '@/shared/utils/prefersReducedMotion';

export interface StackProps {
  direction: 'forward' | 'back';
  children: ReactNode;
}

export function Stack({ direction, children }: StackProps): ReactElement {
  const reduced = prefersReducedMotion();
  const className = reduced
    ? 'stack stack--reduced'
    : `stack stack--${direction}`;
  return <div className={className}>{children}</div>;
}
