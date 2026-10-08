import { describe, expect, it, vi } from 'vitest';

import { createScrollProgressTrackerLifecycle } from '../../lib/utils/tracker-lifecycle-utils';

import type { ScrollProgressState } from '../../lib/types';

function createState(overrides: Partial<ScrollProgressState> = {}): ScrollProgressState {
    return {
        progress: 0.5,
        progressDirection: 'forward',
        scrollDirection: 'forward',
        isInObservationArea: true,
        intersectionRatio: 1,
        isRootVisible: true,
        isTracking: true,
        ...overrides
    };
}

describe('tracker lifecycle utils', () => {
    it('notifies state subscribers with one shared defensive state copy', () => {
        const isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const firstSubscriber = vi.fn();
        const secondSubscriber = vi.fn();
        const state = createState();

        lifecycle.subscribe(firstSubscriber, null);
        lifecycle.subscribe(secondSubscriber, null);
        lifecycle.notifyStateSubscribers(state);

        expect(firstSubscriber).toHaveBeenCalledTimes(1);
        expect(secondSubscriber).toHaveBeenCalledTimes(1);

        const firstStateSnapshot = firstSubscriber.mock.calls[0][0];
        const secondStateSnapshot = secondSubscriber.mock.calls[0][0];

        expect(firstStateSnapshot).toEqual(state);
        expect(firstStateSnapshot).not.toBe(state);
        expect(secondStateSnapshot).toBe(firstStateSnapshot);
    });

    it('immediately calls a subscriber with previous state when available', () => {
        const isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const subscriber = vi.fn();
        const previousState = createState({ progress: 0.25 });

        lifecycle.subscribe(subscriber, previousState);

        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(subscriber).toHaveBeenCalledWith(previousState);
        expect(subscriber.mock.calls[0][0]).not.toBe(previousState);
    });

    it('removes a subscriber when its immediate notification throws', () => {
        const isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const error = new Error('subscriber failed');
        const subscriber = vi.fn(() => {
            throw error;
        });

        expect(() => lifecycle.subscribe(subscriber, createState())).toThrow(error);

        expect(() => lifecycle.notifyStateSubscribers(createState())).not.toThrow();
        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('does not retain a subscriber that destroys the lifecycle during immediate notification', () => {
        let isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const subscriber = vi.fn(() => {
            isDestroyed = true;
            lifecycle.destroy();
        });

        lifecycle.subscribe(subscriber, createState());
        lifecycle.notifyStateSubscribers(createState());

        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('removes a subscriber when the unsubscribe function is called', () => {
        const isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const subscriber = vi.fn();
        const unsubscribe = lifecycle.subscribe(subscriber, null);

        unsubscribe();

        lifecycle.notifyStateSubscribers(createState());

        expect(subscriber).not.toHaveBeenCalled();
    });

    it('does not register subscribers after the tracker is destroyed', () => {
        const isDestroyed = true;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const subscriber = vi.fn();

        const unsubscribe = lifecycle.subscribe(subscriber, createState());

        lifecycle.notifyStateSubscribers(createState());

        expect(subscriber).not.toHaveBeenCalled();

        expect(() => {
            unsubscribe();
        }).not.toThrow();
    });

    it('runs destroy callbacks when destroyed', () => {
        const isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const firstCallback = vi.fn();
        const secondCallback = vi.fn();

        lifecycle.onDestroy(firstCallback);
        lifecycle.onDestroy(secondCallback);

        lifecycle.destroy();

        expect(firstCallback).toHaveBeenCalledTimes(1);
        expect(secondCallback).toHaveBeenCalledTimes(1);
    });

    it('runs every destroy callback, clears lifecycle callbacks, and rethrows the first error', () => {
        const isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const firstError = new Error('first destroy callback failed');
        const secondError = new Error('second destroy callback failed');
        const firstCallback = vi.fn(() => {
            throw firstError;
        });
        const secondCallback = vi.fn(() => {
            throw secondError;
        });
        const finalCallback = vi.fn();
        const subscriber = vi.fn();

        lifecycle.onDestroy(firstCallback);
        lifecycle.onDestroy(secondCallback);
        lifecycle.onDestroy(finalCallback);
        lifecycle.subscribe(subscriber, null);

        expect(() => lifecycle.destroy()).toThrow(firstError);

        expect(firstCallback).toHaveBeenCalledTimes(1);
        expect(secondCallback).toHaveBeenCalledTimes(1);
        expect(finalCallback).toHaveBeenCalledTimes(1);

        expect(() => lifecycle.destroy()).not.toThrow();
        lifecycle.notifyStateSubscribers(createState());

        expect(firstCallback).toHaveBeenCalledTimes(1);
        expect(secondCallback).toHaveBeenCalledTimes(1);
        expect(finalCallback).toHaveBeenCalledTimes(1);
        expect(subscriber).not.toHaveBeenCalled();
    });

    it('rethrows undefined when the first destroy callback throws undefined', () => {
        const isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const secondCallback = vi.fn();
        let didThrow = false;
        let thrownValue: unknown = null;

        lifecycle.onDestroy(() => {
            throw undefined;
        });
        lifecycle.onDestroy(secondCallback);

        try {
            lifecycle.destroy();
        } catch (error) {
            didThrow = true;
            thrownValue = error;
        }

        expect(didThrow).toBe(true);
        expect(thrownValue).toBeUndefined();
        expect(secondCallback).toHaveBeenCalledTimes(1);
    });

    it('removes destroy callbacks when the cleanup function is called', () => {
        const isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const callback = vi.fn();
        const cleanup = lifecycle.onDestroy(callback);

        cleanup();

        lifecycle.destroy();

        expect(callback).not.toHaveBeenCalled();
    });

    it('calls onDestroy callbacks immediately after the tracker is destroyed', () => {
        const isDestroyed = true;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const callback = vi.fn();

        const cleanup = lifecycle.onDestroy(callback);

        expect(callback).toHaveBeenCalledTimes(1);

        expect(() => {
            cleanup();
        }).not.toThrow();
    });

    it('clears subscribers when destroyed', () => {
        const isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const subscriber = vi.fn();

        lifecycle.subscribe(subscriber, null);

        lifecycle.destroy();
        lifecycle.notifyStateSubscribers(createState());

        expect(subscriber).not.toHaveBeenCalled();
    });

    it('reads the destroyed state from the getter at call time', () => {
        let isDestroyed = false;
        const lifecycle = createScrollProgressTrackerLifecycle(() => isDestroyed);
        const subscriber = vi.fn();

        lifecycle.subscribe(subscriber, null);

        isDestroyed = true;

        lifecycle.subscribe(subscriber, createState());

        expect(subscriber).not.toHaveBeenCalled();
    });
});
