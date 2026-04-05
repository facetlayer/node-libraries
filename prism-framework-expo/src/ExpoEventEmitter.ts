/**
 * ExpoEventEmitter
 *
 * Mobile equivalent of the web-side ConnectionManager (SSE).
 * Uses in-process callbacks instead of HTTP SSE connections.
 *
 * Services can post events using the same key-based pattern. On web, events
 * go over SSE; on mobile, they invoke registered callbacks directly.
 *
 * Usage:
 *   const events = new ExpoEventEmitter<{ type: string; data: any }>();
 *
 *   // Subscribe (in React component or wherever)
 *   const unsubscribe = events.subscribe('user-123', (event) => {
 *     console.log('Got event:', event);
 *   });
 *
 *   // Post from service code (same API shape as ConnectionManager.postEvent)
 *   events.postEvent('user-123', { type: 'update', data: { ... } });
 *
 *   // Clean up
 *   unsubscribe();
 */
export class ExpoEventEmitter<EventType extends object> {
    private listeners: Map<string, Set<(event: EventType) => void>> = new Map();

    /**
     * Subscribe to events for a given key.
     * Returns an unsubscribe function — call it to remove the listener.
     */
    subscribe(key: string, callback: (event: EventType) => void): () => void {
        let listenerSet = this.listeners.get(key);
        if (!listenerSet) {
            listenerSet = new Set();
            this.listeners.set(key, listenerSet);
        }
        listenerSet.add(callback);

        return () => {
            listenerSet!.delete(callback);
            if (listenerSet!.size === 0) {
                this.listeners.delete(key);
            }
        };
    }

    /**
     * Post an event to all subscribers for a given key.
     * Mirrors ConnectionManager.postEvent() from the web SSE system.
     */
    postEvent(key: string, event: EventType): void {
        const listenerSet = this.listeners.get(key);
        if (!listenerSet) return;

        for (const callback of listenerSet) {
            try {
                callback(event);
            } catch (error) {
                console.error('[prism-framework-expo] Error in event listener:', error);
            }
        }
    }

    /**
     * Get the number of active subscribers for a key.
     */
    getSubscriberCount(key: string): number {
        return this.listeners.get(key)?.size ?? 0;
    }

    /**
     * Remove all subscribers (useful for cleanup on app shutdown).
     */
    clear(): void {
        this.listeners.clear();
    }
}
