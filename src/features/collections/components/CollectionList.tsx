import React from 'react';
import { CollectionCard, CollectionCardProps } from './CollectionCard';
import { Text } from '../../../ui-system/components/primitives/Text';
import { Spinner } from '../../../ui-system/components/primitives/Spinner';

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
    selectedId
}: CollectionListProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Spinner size={24} />
                <Text variant="small" muted>Loading collections...</Text>
            </div>
        );
    }

    if (collections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-outline rounded-md">
                <Text variant="h3" muted>No collections details</Text>
                <Text variant="small" muted className="mt-1">
                    Highlights will appear here grouped by domain.
                </Text>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3">
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
