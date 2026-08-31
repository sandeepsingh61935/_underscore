/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L1131-1141 (V2_Separator)
 * V2 contract: hairline 1px tall (horizontal) or 1px wide (vertical) with
 *   var(--rule-soft) background. No inset or label variants in wireframe.
 */
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as React from 'react';

import { cn } from '@/ui-system/utils/cn';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className
    )}
    style={{ backgroundColor: 'var(--rule-soft)' }}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
