import React from 'react';

import { Spinner } from '../../../ui-system/components/primitives/Spinner';
import { Text } from '../../../ui-system/components/primitives/Text';

import type { CollectionCardProps } from './CollectionCard';
import { CollectionCard } from './CollectionCard';

interface CollectionListProps {
  collections: CollectionCardProps[];
  isLoading?: boolean;
  onSelect: (id: string) => void;
  selectedId?: string;
}

export function CollectionList({
  collections,
  isLoading,
  onSelect,
  selectedId,
}: CollectionListProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 0',
          gap: 12,
        }}
      >
        <Spinner size="md" />
        <Text variant="small" muted>
          Loading collections...
        </Text>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 0',
          border: '1px dashed var(--rule)',
          borderRadius: 'var(--radius)',
        }}
      >
        <Text variant="h3" muted>
          No collections yet
        </Text>
        <Text variant="small" muted style={{ marginTop: 4 }}>
          Highlights will appear here grouped by domain.
        </Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          {...collection}
          isActive={selectedId === collection.id}
          onClick={() => onSelect(collection.id)}
        />
      ))}
    </div>
  );
}
