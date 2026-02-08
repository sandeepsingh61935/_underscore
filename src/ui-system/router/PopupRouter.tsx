import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * Simple hash-based router for popup
 * Uses state-based routing without URL manipulation
 */

export type PopupRoute =
    | 'welcome'
    | 'sign-in'
    | 'mode-selection'
    | 'collections'
    | 'domain-details'
    | 'settings';

interface RouteParams {
    domain?: string;
    [key: string]: string | undefined;
}

interface RouterContextValue {
    /** Current route */
    currentRoute: PopupRoute;
    /** Route parameters */
    params: RouteParams;
    /** Navigation history for back navigation */
    canGoBack: boolean;
    /** Navigate to a route */
    navigate: (route: PopupRoute, params?: RouteParams) => void;
    /** Go back to previous route */
    goBack: () => void;
    /** Replace current route without history */
    replace: (route: PopupRoute, params?: RouteParams) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouter() {
    const context = useContext(RouterContext);
    if (!context) {
        throw new Error('useRouter must be used within a PopupRouter');
    }
    return context;
}

/**
 * Convenience hook for navigation
 */
export function useNavigate() {
    const { navigate, goBack, replace } = useRouter();
    return { navigate, goBack, replace };
}

/**
 * Convenience hook for route params
 */
export function useParams<T extends RouteParams = RouteParams>(): T {
    const { params } = useRouter();
    return params as T;
}

interface HistoryEntry {
    route: PopupRoute;
    params: RouteParams;
}

interface PopupRouterProps {
    children: React.ReactNode;
    /** Initial route */
    initialRoute?: PopupRoute;
    /** Called when route changes */
    onRouteChange?: (route: PopupRoute, params: RouteParams) => void;
}

export function PopupRouter({
    children,
    initialRoute = 'welcome',
    onRouteChange,
}: PopupRouterProps) {
    const [history, setHistory] = useState<HistoryEntry[]>([
        { route: initialRoute, params: {} }
    ]);

    const current = history[history.length - 1];
    const canGoBack = history.length > 1;

    const navigate = useCallback((route: PopupRoute, params: RouteParams = {}) => {
        setHistory(prev => [...prev, { route, params }]);
        onRouteChange?.(route, params);
    }, [onRouteChange]);

    const goBack = useCallback(() => {
        setHistory(prev => {
            if (prev.length <= 1) return prev;
            const newHistory = prev.slice(0, -1);
            const lastEntry = newHistory[newHistory.length - 1];
            onRouteChange?.(lastEntry.route, lastEntry.params);
            return newHistory;
        });
    }, [onRouteChange]);

    const replace = useCallback((route: PopupRoute, params: RouteParams = {}) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, -1);
            newHistory.push({ route, params });
            onRouteChange?.(route, params);
            return newHistory;
        });
    }, [onRouteChange]);

    const value = useMemo(() => ({
        currentRoute: current.route,
        params: current.params,
        canGoBack,
        navigate,
        goBack,
        replace,
    }), [current, canGoBack, navigate, goBack, replace]);

    return (
        <RouterContext.Provider value={value}>
            {children}
        </RouterContext.Provider>
    );
}

/**
 * Route component - renders children only when route matches
 */
interface RouteProps {
    path: PopupRoute;
    children: React.ReactNode;
}

export function Route({ path, children }: RouteProps) {
    const { currentRoute } = useRouter();

    if (currentRoute !== path) {
        return null;
    }

    return <>{children}</>;
}

/**
 * Redirect component - navigates when rendered
 */
interface RedirectProps {
    to: PopupRoute;
    params?: RouteParams;
    when?: boolean;
}

export function Redirect({ to, params, when = true }: RedirectProps) {
    const { replace } = useRouter();

    React.useEffect(() => {
        if (when) {
            replace(to, params);
        }
    }, [to, params, when, replace]);

    return null;
}

/**
 * Switch component - renders only the first matching route
 */
interface SwitchProps {
    children: React.ReactNode;
}

export function Switch({ children }: SwitchProps) {
    const { currentRoute } = useRouter();

    let matchedChild: React.ReactNode = null;

    React.Children.forEach(children, (child) => {
        if (matchedChild) return;

        if (React.isValidElement(child) && child.type === Route) {
            const routeProps = child.props as RouteProps;
            if (routeProps.path === currentRoute) {
                matchedChild = child;
            }
        }
    });

    return <>{matchedChild}</>;
}
