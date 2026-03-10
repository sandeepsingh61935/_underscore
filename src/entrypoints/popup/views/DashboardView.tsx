import React, { useState } from 'react';

import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';
import { UserMenu } from '../../../features/auth/UserMenu';
import { CollectionList } from '../../../features/collections/components/CollectionList';
import { useCollections } from '../../../features/collections/hooks/useCollections';
import { ModeSelector } from '../../../features/modes/ModeSelector';
import { useModes } from '../../../features/modes/useModes';
import { Logo } from '../../../ui-system/components/primitives/Logo';
import { Text } from '../../../ui-system/components/primitives/Text';

interface DashboardViewProps {
  onLogout: () => void;
}

export function DashboardView({
  onLogout,
}: DashboardViewProps): React.ReactElement | null {
  const { user, logout } = useCurrentUser();
  const { modes } = useModes(!!user);
  const { collections, isLoading: isCollectionsLoading } = useCollections();

  const [currentModeId, setCurrentModeId] = useState('focus');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();

  const handleLogout = async (): Promise<void> => {
    await logout();
    onLogout();
  };

  if (!user) return null; // Should be handled by router, but safety check

  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-outline bg-surface-container/80 backdrop-blur-md sticky top-0 z-10">
        <Logo className="scale-75 origin-left" showText={true} />
        <UserMenu user={user} onLogout={handleLogout} />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        {/* Mode Selection Section */}
        <section className="space-y-3">
          <Text variant="tiny" muted className="uppercase tracking-[0.15em] ml-1">
            Active Mode
          </Text>
          <ModeSelector
            modes={modes}
            currentModeId={currentModeId}
            onSelect={setCurrentModeId}
          />
        </section>

        {/* Collections Section */}
        <section className="space-y-3 pb-8">
          <div className="flex items-center justify-between ml-1">
            <Text variant="tiny" muted className="uppercase tracking-[0.15em]">
              Collections
            </Text>
            <button className="text-label-large text-primary hover:underline">
              View All
            </button>
          </div>

          <CollectionList
            collections={collections.map((c) => ({
              id: c.id,
              domain: c.domain,
              count: c.highlightCount,
              lastActive: c.lastActive,
            }))}
            isLoading={isCollectionsLoading}
            selectedId={selectedCollectionId}
            onSelect={setSelectedCollectionId}
          />
        </section>
      </div>
    </div>
  );
}
