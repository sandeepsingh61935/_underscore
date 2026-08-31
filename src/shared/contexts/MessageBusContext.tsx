/**
 * @file MessageBusContext.tsx
 * @description React Context for the IMessageBus instance.
 *
 * The MessageBus is instantiated per execution context (background, popup,
 * content). The popup is the only context that doesn't use the DI container;
 * it constructs its MessageBus at entry and exposes it via this context so
 * React hooks (useIpcAction) can call messageBus.send() without taking it as
 * a prop.
 *
 * The background and content script contexts resolve the bus via their DI
 * containers and don't need this provider.
 */

import React, { createContext, useContext, type ReactNode } from 'react';

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

const MessageBusContext = createContext<IMessageBus | null>(null);

interface MessageBusProviderProps {
  messageBus: IMessageBus;
  children: ReactNode;
}

export function MessageBusProvider({
  messageBus,
  children,
}: MessageBusProviderProps): React.ReactElement {
  return (
    <MessageBusContext.Provider value={messageBus}>{children}</MessageBusContext.Provider>
  );
}

/**
 * Hook: read the IMessageBus instance from context.
 * Returns null if used outside a MessageBusProvider (e.g. in tests).
 */
export function useMessageBus(): IMessageBus | null {
  return useContext(MessageBusContext);
}
