/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L496-508
 * V2 contract:
 *   - Fade-out + lift (opacity: 0, translateY(4px)) when open is false.
 *   - Skips transition when prefers-reduced-motion is on.
 */
import React, { type ReactElement, type ReactNode } from 'react';

import { prefersReducedMotion } from '@/shared/utils/prefersReducedMotion';

export interface PaperUnfurlProps {
  open?: boolean;
  children: ReactNode;
}

export function PaperUnfurl({ open = true, children }: PaperUnfurlProps): ReactElement {
  const reduced = prefersReducedMotion();
  const style: React.CSSProperties = {
    opacity: open ? 1 : 0,
    transform: open ? '' : 'translateY(4px)',
    transition: reduced ? 'none' : 'opacity 200ms ease, transform 200ms ease',
  };
  return <div style={style}>{children}</div>;
}
