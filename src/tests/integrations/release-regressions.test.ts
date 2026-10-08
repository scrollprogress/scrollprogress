// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import type { ScrollProgressTracker } from '../../lib/types';
import {
    createElementWithRect,
    createRootElementWithRect,
    getIntersectionObserverInstances,
    getLatestIntersectionObserver,
    hasScheduledAnimationFrame,
    MockIntersectionObserver,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

let tracker: ScrollProgressTracker | undefined;
beforeEach(() => setupScrollProgressTestMocks({ resizeObserver: true }));
afterEach(() => {
    tracker?.destroy();
    tracker = undefined;
    resetScrollProgressTestMocks();
});

describe('release resource regressions', () => {
    it('preserves configuration, callbacks, CSS and the active observer when native validation rejects an update', () => {
        const element = createElementWithRect();
        const onUpdate = vi.fn();
        tracker = trackScrollProgress(element, { cssVar: '--before', onUpdate });
        const config = tracker.getConfig();
        const css = element.style.getPropertyValue('--before');
        const observer = getLatestIntersectionObserver();
        const failure = new SyntaxError('invalid native rootMargin');
        vi.stubGlobal(
            'IntersectionObserver',
            class extends MockIntersectionObserver {
                constructor(
                    callback: IntersectionObserverCallback,
                    options?: IntersectionObserverInit
                ) {
                    if (options?.rootMargin === 'invalid') throw failure;
                    super(callback, options);
                }
            }
        );
        expect(() =>
            tracker!.update({
                rootMargin: 'invalid',
                root: createRootElementWithRect(),
                requireRootVisible: true,
                cssVar: '--after',
                onUpdate: undefined
            })
        ).toThrow(failure);
        expect(tracker.getConfig()).toEqual(config);
        expect(element.style.getPropertyValue('--before')).toBe(css);
        expect(observer.disconnect).not.toHaveBeenCalled();
        expect(hasScheduledAnimationFrame()).toBe(false);
        observer.trigger(true);
        runAnimationFrame();
        expect(onUpdate).toHaveBeenCalledTimes(2);
    });

    it('releases earlier observers if later setup fails during construction', () => {
        const failure = new Error('resize observer unavailable');
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor() {
                    throw failure;
                }
            }
        );
        expect(() =>
            trackScrollProgress(createElementWithRect(), {
                root: createRootElementWithRect(),
                requireRootVisible: true
            })
        ).toThrow(failure);
        const observers = getIntersectionObserverInstances();
        expect(observers).toHaveLength(2);
        for (const observer of observers) expect(observer.disconnect).toHaveBeenCalledOnce();
        expect(hasScheduledAnimationFrame()).toBe(false);
    });

    it('ignores a queued callback from a replaced target observer', () => {
        tracker = trackScrollProgress(createElementWithRect());
        const obsolete = getLatestIntersectionObserver();
        tracker.update({ rootMargin: '10px' });
        const current = getLatestIntersectionObserver();
        current.trigger(true, 0.5);
        runAnimationFrame();
        obsolete.trigger(false);
        expect(hasScheduledAnimationFrame()).toBe(false);
        expect(tracker.getState()).toMatchObject({ isTracking: true, intersectionRatio: 0.5 });
    });

    it('clears intersection data when changing root until the new observer reports', () => {
        tracker = trackScrollProgress(createElementWithRect());
        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();
        tracker.update({ root: createRootElementWithRect() });
        runAnimationFrame();
        expect(tracker.getState()).toMatchObject({ isTracking: false, intersectionRatio: 0 });
    });

    it('uses the last entry when an observer delivers several transitions together', () => {
        let deliver!: IntersectionObserverCallback;
        vi.stubGlobal(
            'IntersectionObserver',
            class extends MockIntersectionObserver {
                constructor(
                    callback: IntersectionObserverCallback,
                    options?: IntersectionObserverInit
                ) {
                    super(callback, options);
                    deliver = callback;
                }
            }
        );
        tracker = trackScrollProgress(createElementWithRect());
        deliver(
            [
                { isIntersecting: false, intersectionRatio: 0 },
                { isIntersecting: true, intersectionRatio: 1 }
            ] as IntersectionObserverEntry[],
            getLatestIntersectionObserver() as unknown as IntersectionObserver
        );
        runAnimationFrame();
        expect(tracker.getState()?.isTracking).toBe(true);
    });
});
