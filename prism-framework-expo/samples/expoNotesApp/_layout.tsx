/**
 * Sample Expo _layout.tsx showing the recommended Prism Framework integration.
 *
 * This demonstrates:
 * - Using usePrismApp() for async initialization
 * - Wiring up setFetchImplementation() once ready
 * - Showing a loading screen during setup
 * - Clean shutdown on unmount
 *
 * NOTE: This is a reference layout — it won't run without a full Expo project.
 * It shows the pattern for how to integrate Prism Framework into an Expo app.
 */

import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { usePrismApp } from '@facetlayer/prism-framework-expo';
// import { setFetchImplementation } from '@facetlayer/prism-framework-ui';
import { createLaunchOptions } from './prismSetup.js';

export default function RootLayout() {
    const { isLoading, result, error } = usePrismApp(createLaunchOptions);

    useEffect(() => {
        if (result) {
            // Wire up the UI fetch layer so apiFetch() works in-process
            // setFetchImplementation(result.fetch);
        }

        return () => {
            // Clean shutdown when the app unmounts
            result?.shutdown();
        };
    }, [result]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Failed to start: {error.message}</Text>
            </View>
        );
    }

    // App is ready — render your routes/screens here
    return (
        <View style={{ flex: 1 }}>
            <Text>Notes App Ready</Text>
            {/* <Stack /> or <Slot /> for Expo Router */}
        </View>
    );
}
