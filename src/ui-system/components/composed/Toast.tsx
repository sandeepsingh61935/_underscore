import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    title: string;
    description?: string;
    variant?: ToastVariant;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextValue {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Convenience methods
export function useToastActions() {
    const { addToast } = useToast();

    return {
        success: (title: string, description?: string) =>
            addToast({ title, description, variant: 'success' }),
        error: (title: string, description?: string) =>
            addToast({ title, description, variant: 'error' }),
        warning: (title: string, description?: string) =>
            addToast({ title, description, variant: 'warning' }),
        info: (title: string, description?: string) =>
            addToast({ title, description, variant: 'info' }),
    };
}

interface ToastProviderProps {
    children: React.ReactNode;
    /** Default duration in ms */
    defaultDuration?: number;
    /** Maximum number of toasts to show */
    maxToasts?: number;
}

export function ToastProvider({
    children,
    defaultDuration = 5000,
    maxToasts = 3,
}: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastIdRef = useRef(0);

    const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
        const id = `toast-${++toastIdRef.current}`;
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration ?? defaultDuration,
        };

        setToasts(prev => {
            const updated = [newToast, ...prev];
            // Limit to maxToasts
            return updated.slice(0, maxToasts);
        });

        return id;
    }, [defaultDuration, maxToasts]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setToasts([]);
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    );
}

const variantStyles: Record<ToastVariant, {
    icon: React.ElementType;
    containerClass: string;
    iconClass: string;
}> = {
    success: {
        icon: CheckCircle,
        containerClass: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        iconClass: 'text-green-600 dark:text-green-400',
    },
    error: {
        icon: AlertCircle,
        containerClass: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
        iconClass: 'text-red-600 dark:text-red-400',
    },
    warning: {
        icon: AlertTriangle,
        containerClass: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950',
        iconClass: 'text-yellow-600 dark:text-yellow-400',
    },
    info: {
        icon: Info,
        containerClass: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
        iconClass: 'text-blue-600 dark:text-blue-400',
    },
};

interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

interface ToastItemProps {
    toast: Toast;
    onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
    const variant = toast.variant || 'info';
    const { icon: Icon, containerClass, iconClass } = variantStyles[variant];

    // Auto-dismiss
    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                onDismiss(toast.id);
            }, toast.duration);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [toast.id, toast.duration, onDismiss]);

    return (
        <div
            className={cn(
                "pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg",
                "animate-slideInUp",
                containerClass
            )}
            role="alert"
        >
            <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", iconClass)} />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{toast.title}</p>
                {toast.description && (
                    <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>
                )}
                {toast.action && (
                    <button
                        onClick={toast.action.onClick}
                        className="mt-2 text-sm font-medium text-primary hover:underline"
                    >
                        {toast.action.label}
                    </button>
                )}
            </div>

            <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
            >
                <X className="w-4 h-4 text-muted-foreground" />
            </button>
        </div>
    );
}
