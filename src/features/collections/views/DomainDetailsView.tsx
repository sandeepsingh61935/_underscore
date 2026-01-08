import React, { useState } from 'react';
import { Logo } from '../../../ui-system/components/primitives/Logo';
import { UnderscoreCard } from '../components/UnderscoreCard';
import { ArrowLeft } from 'lucide-react';

interface DomainDetailsViewProps {
    domain: string;
    onBack: () => void;
}

interface Underscore {
    id: string;
    text: string;
    url: string;
    timestamp: string;
    isCode?: boolean;
}

export function DomainDetailsView({ domain, onBack }: DomainDetailsViewProps) {
    // Mock data - TODO: Replace with actual data from API/storage
    const [underscores] = useState<Underscore[]>([
        {
            id: '1',
            text: 'The minimalist design movement originated in the 20th century as a reaction against the complexity and ornamentation of previous art styles.',
            url: '/search/minimalism',
            timestamp: 'captured 2 hours ago',
        },
        {
            id: '2',
            text: 'Search algorithms prioritize user intent over keyword stuffing. Modern SEO focuses on answering the user\'s question directly.',
            url: '/webmasters/guidelines',
            timestamp: 'captured yesterday',
        },
        {
            id: '3',
            text: 'Core Web Vitals are a set of specific factors that Google considers important in a webpage\'s overall user experience.',
            url: '/developers/vitals',
            timestamp: 'Oct 20, 2023',
        },
        {
            id: '4',
            text: 'Material Design 3',
            url: '/design/spec',
            timestamp: 'Oct 15, 2023',
        },
        {
            id: '5',
            text: 'const observer = new IntersectionObserver(callback, options);',
            url: '/docs/api',
            timestamp: 'Oct 12, 2023',
            isCode: true,
        },
    ]);

    const handleCopy = async (id: string) => {
        const underscore = underscores.find(u => u.id === id);
        if (underscore) {
            await navigator.clipboard.writeText(underscore.text);
            console.log('Copied to clipboard:', id);
        }
    };

    const handleDelete = (id: string) => {
        console.log('Delete underscore:', id);
        // TODO: Implement delete functionality
    };

    const handleExport = () => {
        console.log('Export underscores for domain:', domain);
        // TODO: Implement export functionality
    };

    const handleClearAll = () => {
        if (confirm(`Are you sure you want to clear all ${underscores.length} underscores from ${domain}?`)) {
            console.log('Clear all underscores');
            // TODO: Implement clear all functionality
        }
    };

    return (
        <div className="w-[360px] h-[600px] bg-bg-base-light dark:bg-bg-base-dark font-display flex flex-col">
            {/* Header */}
            <header className="w-full border-b border-border-light dark:border-border-dark bg-bg-surface-light/80 dark:bg-bg-surface-dark/80 backdrop-blur-md sticky top-0 z-50">
                <div className="px-4 h-14 flex items-center justify-between">
                    <Logo showText={true} />
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                {/* Back Button */}
                <nav className="mb-8">
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-primary transition-colors group"
                    >
                        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                        Back to Dashboard
                    </button>
                </nav>

                {/* Domain Header */}
                <div className="mb-10">
                    <div className="flex flex-col gap-4 border-l-4 border-primary pl-4">
                        <div>
                            <h2 className="text-3xl font-black tracking-tight text-text-primary-light dark:text-text-primary-dark mb-2">
                                {domain}
                            </h2>
                            <p className="text-text-secondary-light dark:text-text-secondary-dark text-base">
                                {underscores.length} underscore{underscores.length !== 1 ? 's' : ''} saved
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleExport}
                                className="px-4 py-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark bg-transparent hover:bg-bg-alt-light dark:hover:bg-bg-alt-dark rounded transition-colors"
                            >
                                Export
                            </button>
                            <button
                                onClick={handleClearAll}
                                className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Underscore List */}
                <div className="flex flex-col gap-8">
                    {underscores.map((underscore) => (
                        <UnderscoreCard
                            key={underscore.id}
                            id={underscore.id}
                            text={underscore.text}
                            url={underscore.url}
                            timestamp={underscore.timestamp}
                            isCode={underscore.isCode}
                            onCopy={handleCopy}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>

                {/* End indicator */}
                <div className="mt-16 flex justify-center gap-1">
                    <div className="h-1 w-1 rounded-full bg-border-light dark:bg-border-dark"></div>
                    <div className="h-1 w-1 rounded-full bg-border-light dark:bg-border-dark"></div>
                    <div className="h-1 w-1 rounded-full bg-border-light dark:bg-border-dark"></div>
                </div>
            </div>
        </div>
    );
}
