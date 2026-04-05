import { describe, it, expect, vi } from 'vitest';
import { ExpoEventEmitter } from '../ExpoEventEmitter.js';

interface TestEvent {
    type: string;
    data: any;
}

describe('ExpoEventEmitter', () => {
    it('delivers events to subscribers', () => {
        const emitter = new ExpoEventEmitter<TestEvent>();
        const received: TestEvent[] = [];

        emitter.subscribe('key1', (event) => received.push(event));
        emitter.postEvent('key1', { type: 'update', data: { id: 1 } });

        expect(received).toEqual([{ type: 'update', data: { id: 1 } }]);
    });

    it('delivers to multiple subscribers for the same key', () => {
        const emitter = new ExpoEventEmitter<TestEvent>();
        const received1: TestEvent[] = [];
        const received2: TestEvent[] = [];

        emitter.subscribe('key1', (event) => received1.push(event));
        emitter.subscribe('key1', (event) => received2.push(event));
        emitter.postEvent('key1', { type: 'update', data: {} });

        expect(received1).toHaveLength(1);
        expect(received2).toHaveLength(1);
    });

    it('isolates events by key', () => {
        const emitter = new ExpoEventEmitter<TestEvent>();
        const received: TestEvent[] = [];

        emitter.subscribe('key1', (event) => received.push(event));
        emitter.postEvent('key2', { type: 'update', data: {} });

        expect(received).toHaveLength(0);
    });

    it('unsubscribe removes the listener', () => {
        const emitter = new ExpoEventEmitter<TestEvent>();
        const received: TestEvent[] = [];

        const unsub = emitter.subscribe('key1', (event) => received.push(event));
        emitter.postEvent('key1', { type: 'first', data: {} });

        unsub();
        emitter.postEvent('key1', { type: 'second', data: {} });

        expect(received).toHaveLength(1);
        expect(received[0].type).toBe('first');
    });

    it('cleans up key entry when last subscriber unsubscribes', () => {
        const emitter = new ExpoEventEmitter<TestEvent>();

        const unsub = emitter.subscribe('key1', () => {});
        expect(emitter.getSubscriberCount('key1')).toBe(1);

        unsub();
        expect(emitter.getSubscriberCount('key1')).toBe(0);
    });

    it('does nothing when posting to a key with no subscribers', () => {
        const emitter = new ExpoEventEmitter<TestEvent>();
        // Should not throw
        emitter.postEvent('nobody-here', { type: 'test', data: {} });
    });

    it('catches errors in listener callbacks', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const emitter = new ExpoEventEmitter<TestEvent>();
        const received: TestEvent[] = [];

        emitter.subscribe('key1', () => { throw new Error('listener crashed'); });
        emitter.subscribe('key1', (event) => received.push(event));
        emitter.postEvent('key1', { type: 'test', data: {} });

        // Second listener should still receive the event
        expect(received).toHaveLength(1);
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('getSubscriberCount returns correct counts', () => {
        const emitter = new ExpoEventEmitter<TestEvent>();

        expect(emitter.getSubscriberCount('key1')).toBe(0);

        const unsub1 = emitter.subscribe('key1', () => {});
        const unsub2 = emitter.subscribe('key1', () => {});
        expect(emitter.getSubscriberCount('key1')).toBe(2);

        unsub1();
        expect(emitter.getSubscriberCount('key1')).toBe(1);
    });

    it('clear() removes all subscribers', () => {
        const emitter = new ExpoEventEmitter<TestEvent>();

        emitter.subscribe('key1', () => {});
        emitter.subscribe('key2', () => {});
        emitter.clear();

        expect(emitter.getSubscriberCount('key1')).toBe(0);
        expect(emitter.getSubscriberCount('key2')).toBe(0);
    });
});
