import { Header } from '../components/layout/Header';
import { cn } from '../utils/cn';

interface AppShellProps {
    children: React.ReactNode;
    className?: string;
    /** Whether to show the header (default: true) */
    showHeader?: boolean;
    /** Whether to remove padding from content area (default: false) */
    noPadding?: boolean;
}

export function AppShell({
    children,
    className,
    showHeader = true,
    noPadding = false
}: AppShellProps) {
    return (
        <div className="w-[400px] h-[600px] flex flex-col bg-background text-foreground overflow-hidden font-sans antialiased text-body relative">
            {showHeader && <Header />}

            <main className={cn(
                "flex-1 overflow-y-auto scrollbar-hide relative w-full",
                !noPadding && "p-4",
                className
            )}>
                {children}
            </main>
        </div>
    );
}
