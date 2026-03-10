import { Clock, Hash } from 'lucide-react';
import React from 'react';

import { Text } from '../../../ui-system/components/primitives/Text';
import { cn } from '../../../ui-system/utils/cn';

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
}: CollectionCardProps): React.JSX.Element {
    return (
        <div
            onClick={onClick}
            className={cn(
                "group cursor-pointer rounded-md border p-4 transition-all duration-short ease-standard hover:shadow-elevation-2 bg-surface-container",
                isActive
                    ? "border-primary ring-1 ring-primary"
                    : "border-outline hover:border-primary/50"
            )}
        >
            <div className="flex items-start justify-between mb-2">
                <Text variant="h3" className="truncate flex-1 font-medium group-hover:text-primary transition-colors">
                    {domain}
                </Text>
            </div>

            <div className="flex items-center gap-4 text-on-surface-variant">
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
