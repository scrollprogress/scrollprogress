// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';

import {
    createElementWithRect,
    getIntersectionObserverInstances,
    getLatestIntersectionObserver,
    getLatestResizeObserver,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    setWindowValue,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

afterEach(() => {
    resetScrollProgressTestMocks();
});

describe('trackScrollProgress lifecycle integration', () => {
    it('cleans up initialized resources when the initial update throws', () => {
        setupScrollProgressTestMocks({ resizeObserver: true });

        const removeWindowEventListener = vi.spyOn(window, 'removeEventListener');
        const element = createElementWithRect({});
        const error = new Error('initial update failed');

        expect(() =>
            trackScrollProgress(element, {
                onUpdate() {
                    throw error;
                }
            })
        ).toThrow(error);

        expect(getLatestIntersectionObserver().disconnect).toHaveBeenCalledTimes(1);
        expect(getLatestResizeObserver().disconnect).toHaveBeenCalledTimes(1);
        expect(removeWindowEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
        expect(removeWindowEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(hasScheduledAnimationFrame()).toBe(false);
    });

    it('disconnects the target IntersectionObserver on destroy', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element);
        const observer = getLatestIntersectionObserver();

        tracker.destroy();

        expect(observer.disconnect).toHaveBeenCalledTimes(1);
    });

    it('disconnects ResizeObserver on destroy when available', () => {
        setupScrollProgressTestMocks({ resizeObserver: true });

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element);
        const resizeObserver = getLatestResizeObserver();

        tracker.destroy();

        expect(resizeObserver.disconnect).toHaveBeenCalledTimes(1);
    });

    it('removes window scroll and resize listeners on destroy', () => {
        setupScrollProgressTestMocks();

        const removeWindowEventListener = vi.spyOn(window, 'removeEventListener');

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element);

        tracker.destroy();

        expect(removeWindowEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));

        expect(removeWindowEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('cancels a pending animation frame on destroy', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element);

        getLatestIntersectionObserver().trigger(true);

        expect(hasScheduledAnimationFrame()).toBe(true);

        tracker.destroy();

        expect(hasScheduledAnimationFrame()).toBe(false);
    });

    it('ignores update calls after destroy', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element);
        const observer = getLatestIntersectionObserver();

        tracker.destroy();

        tracker.update({
            rootMargin: '100px 0px',
            observerThreshold: [0, 0.5, 1]
        });

        expect(getIntersectionObserverInstances()).toHaveLength(1);
        expect(observer.disconnect).toHaveBeenCalledTimes(1);
        expect(hasScheduledAnimationFrame()).toBe(false);
    });

    it('is safe to destroy more than once', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element);
        const observer = getLatestIntersectionObserver();

        tracker.destroy();
        tracker.destroy();

        expect(observer.disconnect).toHaveBeenCalledTimes(1);
    });
});
