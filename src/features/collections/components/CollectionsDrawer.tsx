import React from 'react';
import { Drawer } from 'vaul';

import { cn } from '@/ui-system/utils/cn';

interface CollectionsDrawerProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}

/**
 * Pull-up drawer for quick collection preview in popup context.
 * Web app uses standard navigation — this component is popup-only.
 */
export function CollectionsDrawer({
  trigger,
  children,
  title = 'Collections',
}: CollectionsDrawerProps): React.JSX.Element {
  return (
    <Drawer.Root shouldScaleBackground>
      <Drawer.Trigger asChild>
        {trigger}
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-scrim/40 z-40" />
        <Drawer.Content
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'flex flex-col max-h-[85vh]',
            'bg-surface-container-lowest',
            'rounded-t-[20px]',
            'border border-outline-variant border-b-0',
          )}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-3 mb-1 h-[4px] w-[40px] rounded-full bg-outline-variant shrink-0" />

          {/* Drawer title */}
          <Drawer.Title className="px-4 py-3 text-[13px] font-semibold text-on-surface shrink-0">
            {title}
          </Drawer.Title>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-4 pb-6">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
