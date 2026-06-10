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
