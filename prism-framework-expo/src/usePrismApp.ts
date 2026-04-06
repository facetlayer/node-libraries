import { useState, useEffect, useRef } from 'react';
import type { ExpoLaunchOptions, ExpoLaunchResult } from './expoLaunch.js';
import { expoLaunch } from './expoLaunch.js';

export interface UsePrismAppResult {
    /** Whether expoLaunch is still running */
    isLoading: boolean;
    /** The launch result (null until ready) */
    result: ExpoLaunchResult | null;
    /** Error if launch failed */
    error: Error | null;
}

/**
 * React hook that runs expoLaunch() and manages its async lifecycle.
 *
 * In Expo, the _layout.tsx or App.tsx needs to handle async initialization
 * (database setup, job startup) before the app is ready. This hook wraps
 * that pattern so you can show a loading screen until everything is set up.
 *
 * Usage:
 *   function App() {
 *     const { isLoading, result, error } = usePrismApp(() => ({
 *       app,
 *       databases: { main: db },
 *     }));
 *
 *     if (isLoading) return <LoadingScreen />;
 *     if (error) return <ErrorScreen error={error} />;
 *
 *     // Wire up fetch once ready
 *     setFetchImplementation(result.fetch);
 *     return <MainApp />;
 *   }
 *
 * The launch function is called once on mount and not re-invoked on re-renders.
 */
export function usePrismApp(
    getLaunchOptions: () => ExpoLaunchOptions,
): UsePrismAppResult {
    const [state, setState] = useState<UsePrismAppResult>({
        isLoading: true,
        result: null,
        error: null,
    });
    const launchedRef = useRef(false);

    useEffect(() => {
        if (launchedRef.current) return;
        launchedRef.current = true;

        expoLaunch(getLaunchOptions())
            .then((result) => {
                setState({ isLoading: false, result, error: null });
            })
            .catch((error) => {
                setState({ isLoading: false, result: null, error });
            });
    }, []);

    return state;
}
