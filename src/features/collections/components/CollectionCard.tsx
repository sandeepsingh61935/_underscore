import React from 'react';
import { Clock, Hash } from 'lucide-react';
import { cn } from '../../../ui-system/utils/cn';
import { Text } from '../../../ui-system/components/primitives/Text';

export interface CollectionCardProps {
    id: string;
    domain: string;
    count: number;
    lastActive?: Date;
    onClick?: () => void;
    isActive?: boolean;
}

export function CollectionCard({
    domain,
    count,
    lastActive,
    onClick,
    isActive
}: CollectionCardProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "group cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:shadow-card-light dark:hover:shadow-card-dark bg-bg-surface-light dark:bg-bg-surface-dark",
                isActive
                    ? "border-primary ring-1 ring-primary"
                    : "border-border-light dark:border-border-dark hover:border-primary/50"
            )}
        >
            <div className="flex items-start justify-between mb-2">
                <Text variant="h3" className="truncate flex-1 font-medium group-hover:text-primary transition-colors">
                    {domain}
                </Text>
            </div>

            <div className="flex items-center gap-4 text-text-secondary-light dark:text-text-secondary-dark">
                <div className="flex items-center gap-1.5">
                    <Hash size={14} />
                    <Text variant="tiny" className="font-medium">
                        {count}
                    </Text>
                </div>

                {lastActive && (
                    <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        <Text variant="tiny">
                            {lastActive.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Text>
                    </div>
                )}
            </div>
        </div>
    );
}
