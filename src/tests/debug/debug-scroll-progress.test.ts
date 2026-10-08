import { beforeEach, describe, expect, it } from 'vitest';

import { debugScrollProgress } from '../../lib/debug/debug-scroll-progress';

import {
    getScrollProgressDebugRegistryState,
    resetScrollProgressDebugRegistry
} from '../../lib/debug/registry';

import type {
    ScrollProgressState,
    ScrollProgressStateSubscriber,
    ScrollProgressTracker,
    ScrollProgressUnsubscribe,
    TrackScrollProgressConfig
} from '../../lib/types';

beforeEach(() => {
    resetScrollProgressDebugRegistry();
});

function createState(patch: Partial<ScrollProgressState> = {}): ScrollProgressState {
    return {
        progress: 0.25,
        progressDirection: 'none',
        scrollDirection: 'none',
        isInObservationArea: false,
        isRootVisible: true,
        isTracking: false,
        intersectionRatio: 0,
        ...patch
    };
}

function createConfig(patch: Partial<TrackScrollProgressConfig> = {}): TrackScrollProgressConfig {
    return {
        start: 0.8,
        end: 0.4,
        axis: 'y',
        root: null,
        rootMargin: '0px',
        observerThreshold: 0,
        inverted: false,
        once: false,
        requireRootVisible: false,
        cssVar: null,
        ...patch
    };
}

function createTrackerMock(
    options: {
        element?: HTMLElement;
        state?: ScrollProgressState | null;
        config?: TrackScrollProgressConfig;
    } = {}
) {
    const element = options.element ?? ({} as HTMLElement);

    let state = options.state === undefined ? createState() : options.state;
    let config = options.config ?? createConfig();

    const stateSubscribers = new Set<ScrollProgressStateSubscriber>();
    const destroyCallbacks = new Set<() => void>();

    const tracker: ScrollProgressTracker = {
        subscribe(subscriber) {
            stateSubscribers.add(subscriber);

            if (state !== null) {
                subscriber({ ...state });
            }

            return () => {
                stateSubscribers.delete(subscriber);
            };
        },

        onDestroy(callback): ScrollProgressUnsubscribe {
            destroyCallbacks.add(callback);

            return () => {
                destroyCallbacks.delete(callback);
            };
        },

        getState() {
            return state === null ? null : { ...state };
        },

        getElement() {
            return element;
        },

        getConfig() {
            return {
                ...config,
                observerThreshold: Array.isArray(config.observerThreshold)
                    ? [...config.observerThreshold]
                    : config.observerThreshold
            };
        },

        update() {},

        destroy() {
            for (const callback of Array.from(destroyCallbacks)) {
                callback();
            }
        }
    };

    return {
        tracker,

        setConfig(nextConfig: TrackScrollProgressConfig) {
            config = nextConfig;
        },

        emit(nextState: ScrollProgressState) {
            state = nextState;

            for (const subscriber of Array.from(stateSubscribers)) {
                subscriber({ ...nextState });
            }
        }
    };
}

describe('debugScrollProgress', () => {
    it('registers a tracker in the debug registry', () => {
        const element = {} as HTMLElement;

        const { tracker } = createTrackerMock({
            element,
            state: createState({
                progress: 0.5,
                isInObservationArea: true,
                isTracking: true,
                intersectionRatio: 1
            }),
            config: createConfig({
                start: 0.75,
                end: 0.35,
                axis: 'x',
                rootMargin: '20px 0px',
                observerThreshold: [0, 0.5, 1],
                inverted: true,
                once: true,
                requireRootVisible: true,
                cssVar: '--scroll-progress'
            })
        });

        debugScrollProgress(tracker, {
            debugId: 'css-vars-demo',
            label: 'Css vars demo'
        });

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            debugId: 'css-vars-demo',
            label: 'Css vars demo',
            element,
            start: 0.75,
            end: 0.35,
            axis: 'x',
            rootMargin: '20px 0px',
            observerThreshold: [0, 0.5, 1],
            inverted: true,
            once: true,
            requireRootVisible: true,
            cssVar: '--scroll-progress',
            state: expect.objectContaining({
                progress: 0.5,
                isInObservationArea: true,
                isTracking: true,
                intersectionRatio: 1
            })
        });
    });

    it('falls back to debugId as label', () => {
        const { tracker } = createTrackerMock();

        debugScrollProgress(tracker, {
            debugId: 'hero'
        });

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            debugId: 'hero',
            label: 'hero'
        });
    });

    it('allows registering a tracker without debug options', () => {
        const { tracker } = createTrackerMock();

        debugScrollProgress(tracker);

        const item = getScrollProgressDebugRegistryState().items[0];

        expect(item.debugId).toBe(item.id);
        expect(item.label).toBe(item.id);
    });

    it('updates the debug registry when the tracker emits state', () => {
        const trackerMock = createTrackerMock();

        debugScrollProgress(trackerMock.tracker, {
            debugId: 'hero'
        });

        trackerMock.setConfig(
            createConfig({
                start: 0.7,
                end: 0.3,
                cssVar: '--hero-progress'
            })
        );

        trackerMock.emit(
            createState({
                progress: 0.75,
                progressDirection: 'forward',
                scrollDirection: 'forward',
                isInObservationArea: true,
                isTracking: true,
                intersectionRatio: 0.5
            })
        );

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            start: 0.7,
            end: 0.3,
            cssVar: '--hero-progress',
            state: {
                progress: 0.75,
                progressDirection: 'forward',
                scrollDirection: 'forward',
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true,
                intersectionRatio: 0.5
            }
        });
    });

    it('unregisters the debug item when the debug controller is destroyed', () => {
        const { tracker } = createTrackerMock();

        const debug = debugScrollProgress(tracker, {
            debugId: 'hero'
        });

        expect(getScrollProgressDebugRegistryState().items).toHaveLength(1);

        debug.destroy();

        expect(getScrollProgressDebugRegistryState().items).toHaveLength(0);
    });

    it('keeps destroy idempotent', () => {
        const { tracker } = createTrackerMock();

        const debug = debugScrollProgress(tracker, {
            debugId: 'hero'
        });

        debug.destroy();
        debug.destroy();

        expect(getScrollProgressDebugRegistryState().items).toHaveLength(0);
    });

    it('unregisters the debug item when the tracker is destroyed', () => {
        const { tracker } = createTrackerMock();

        debugScrollProgress(tracker, {
            debugId: 'hero'
        });

        expect(getScrollProgressDebugRegistryState().items).toHaveLength(1);

        tracker.destroy();

        expect(getScrollProgressDebugRegistryState().items).toHaveLength(0);
    });
});
