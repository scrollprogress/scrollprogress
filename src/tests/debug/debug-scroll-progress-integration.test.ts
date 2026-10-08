// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';

import { debugScrollProgress } from '../../lib/debug/debug-scroll-progress';
import {
    getScrollProgressDebugRegistryState,
    resetScrollProgressDebugRegistry
} from '../../lib/debug/registry';
import { trackScrollProgress } from '../../lib/track-scroll-progress';

import type { ScrollProgressTracker } from '../../lib/types';

import {
    createElementWithRect,
    getLatestIntersectionObserver,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setWindowValue,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

let tracker: ScrollProgressTracker | undefined;

afterEach(() => {
    tracker?.destroy();
    tracker = undefined;

    resetScrollProgressDebugRegistry();
    resetScrollProgressTestMocks();
});

describe('debugScrollProgress integration', () => {
    it('keeps the final snapshot when a once tracker completes', () => {
        setupScrollProgressTestMocks();
        setWindowValue('innerHeight', 1000);

        const tracker = trackScrollProgress(
            createElementWithRect({
                top: 100,
                height: 300
            }),
            {
                once: true
            }
        );
        const debug = debugScrollProgress(tracker, {
            debugId: 'once-demo'
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(getScrollProgressDebugRegistryState().items).toEqual([
            expect.objectContaining({
                debugId: 'once-demo',
                completed: true,
                selected: true,
                state: expect.objectContaining({
                    progress: 1,
                    isTracking: true
                })
            })
        ]);

        debug.destroy();

        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    });

    it('keeps an inverted once tracker when it completes at zero', () => {
        setupScrollProgressTestMocks();
        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 800,
            height: 300
        });
        const tracker = trackScrollProgress(element, {
            inverted: true,
            once: true
        });
        const debug = debugScrollProgress(tracker);

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        element.getBoundingClientRect = () =>
            ({
                top: 100,
                left: 450,
                width: 300,
                height: 300,
                right: 750,
                bottom: 400,
                x: 450,
                y: 100,
                toJSON: () => ({})
            }) as DOMRect;

        window.dispatchEvent(new Event('scroll'));
        runAnimationFrame();

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            completed: true,
            state: {
                progress: 0
            }
        });

        debug.destroy();
    });

    it('registers a tracker that completed before debug was attached', () => {
        setupScrollProgressTestMocks();
        setWindowValue('innerHeight', 1000);

        const tracker = trackScrollProgress(
            createElementWithRect({
                top: 100,
                height: 300
            }),
            {
                once: true
            }
        );

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        const debug = debugScrollProgress(tracker, {
            debugId: 'already-completed'
        });

        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            debugId: 'already-completed',
            completed: true,
            state: {
                progress: 1
            }
        });

        debug.destroy();
    });

    it('retains the final once snapshot when an earlier callback throws', () => {
        setupScrollProgressTestMocks();
        setWindowValue('innerHeight', 1000);

        const error = new Error('onEnter failed');
        const tracker = trackScrollProgress(
            createElementWithRect({
                top: 100,
                height: 300
            }),
            {
                once: true,
                onEnter() {
                    throw error;
                }
            }
        );
        const debug = debugScrollProgress(tracker);

        getLatestIntersectionObserver().trigger(true);

        expect(() => runAnimationFrame()).toThrow(error);
        expect(getScrollProgressDebugRegistryState().items[0]).toMatchObject({
            completed: true,
            state: {
                progress: 1,
                isTracking: true
            }
        });

        debug.destroy();
    });

    it('still unregisters a tracker destroyed explicitly', () => {
        setupScrollProgressTestMocks();

        const tracker = trackScrollProgress(createElementWithRect());

        debugScrollProgress(tracker);
        tracker.destroy();

        expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    });

    it('syncs config updates when the tracker state is unchanged', () => {
        setupScrollProgressTestMocks();
        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element);
        debugScrollProgress(tracker);

        const initialState = tracker.getState();

        expect(getScrollProgressDebugRegistryState().items[0].rootMargin).toBe('0px');

        tracker.update({
            rootMargin: '20px'
        });

        runAnimationFrame();

        expect(tracker.getState()).toEqual(initialState);

        expect(getScrollProgressDebugRegistryState().items[0].rootMargin).toBe('20px');
    });
});
