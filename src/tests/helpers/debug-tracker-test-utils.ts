import { vi } from 'vitest';

import type {
    ScrollProgressState,
    ScrollProgressStateSubscriber,
    ScrollProgressTracker,
    TrackScrollProgressConfig
} from '../../lib/types';
import { markScrollProgressTrackerOnceCompleted } from '../../lib/utils/tracker-completion-utils';

export function createDebugTrackerMock() {
    const state: { -readonly [Key in keyof ScrollProgressState]: ScrollProgressState[Key] } = {
        progress: 0.5,
        progressDirection: 'none',
        scrollDirection: 'none',
        isInObservationArea: true,
        isRootVisible: true,
        isTracking: true,
        intersectionRatio: 1
    };
    const config: TrackScrollProgressConfig = {
        start: 0.8,
        end: 0.4,
        axis: 'y',
        root: null,
        rootMargin: '0px',
        observerThreshold: 0,
        inverted: false,
        once: false,
        requireRootVisible: false,
        cssVar: null
    };
    const subscribers = new Set<ScrollProgressStateSubscriber>();
    const destroyCallbacks = new Set<() => void>();
    const stateUnsubscribe = vi.fn(() => subscribers.clear());
    const destroyUnsubscribe = vi.fn(() => destroyCallbacks.clear());
    let destroyed = false;

    const tracker = {
        getElement: vi.fn(() => ({}) as HTMLElement),
        getConfig: vi.fn(() => ({ ...config })),
        getState: vi.fn(() => ({ ...state })),
        subscribe: vi.fn((callback: ScrollProgressStateSubscriber) => {
            if (!destroyed) {
                subscribers.add(callback);
                callback({ ...state });
            }
            return stateUnsubscribe;
        }),
        onDestroy: vi.fn((callback: () => void) => {
            if (destroyed) callback();
            else destroyCallbacks.add(callback);
            return destroyUnsubscribe;
        }),
        update: vi.fn(),
        destroy: vi.fn(() => {
            if (destroyed) return;
            destroyed = true;
            let failed = false;
            let firstError: unknown;
            for (const callback of [...destroyCallbacks]) {
                try {
                    callback();
                } catch (error) {
                    if (!failed) {
                        failed = true;
                        firstError = error;
                    }
                }
            }
            subscribers.clear();
            destroyCallbacks.clear();
            if (failed) throw firstError;
        })
    } satisfies ScrollProgressTracker;

    return {
        tracker,
        state,
        config,
        stateUnsubscribe,
        destroyUnsubscribe,
        subscribers,
        destroyCallbacks,
        completeOnce(inverted = false) {
            config.once = true;
            config.inverted = inverted;
            state.progress = inverted ? 0 : 1;
            markScrollProgressTrackerOnceCompleted(tracker);
            tracker.destroy();
        }
    };
}
