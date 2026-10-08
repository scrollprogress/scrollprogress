// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
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

const trackers: ScrollProgressTracker[] = [];

afterEach(() => {
    try {
        for (const tracker of trackers) {
            tracker.destroy();
        }
    } finally {
        trackers.length = 0;
        resetScrollProgressTestMocks();
    }
});

describe('trackScrollProgress error propagation', () => {
    it('commits state and skips subscribers after onUpdate throws', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });
        const error = new Error('onUpdate failed');
        const onUpdate = vi.fn(() => {
            throw error;
        });
        const subscriber = vi.fn();
        const tracker = trackScrollProgress(element);
        const observer = getLatestIntersectionObserver();

        trackers.push(tracker);
        tracker.subscribe(subscriber);
        subscriber.mockClear();
        tracker.update({ onUpdate });
        observer.trigger(true);

        expect(() => runAnimationFrame()).toThrow(error);
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(subscriber).not.toHaveBeenCalled();
        expect(tracker.getState()).toMatchObject({
            isInObservationArea: true,
            isTracking: true
        });

        observer.trigger(true);

        expect(() => runAnimationFrame()).not.toThrow();
        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(subscriber).not.toHaveBeenCalled();
    });

    it('commits a leave transition and preserves fail-fast callback order', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });
        const error = new Error('onLeave failed');
        const onLeave = vi.fn(() => {
            throw error;
        });
        const onUpdate = vi.fn();
        const subscriber = vi.fn();
        const tracker = trackScrollProgress(element, {
            onLeave,
            onUpdate
        });
        const observer = getLatestIntersectionObserver();

        trackers.push(tracker);
        observer.trigger(true);
        runAnimationFrame();
        tracker.subscribe(subscriber);
        onUpdate.mockClear();
        subscriber.mockClear();

        observer.trigger(false);

        expect(() => runAnimationFrame()).toThrow(error);
        expect(onLeave).toHaveBeenCalledTimes(1);
        expect(onUpdate).not.toHaveBeenCalled();
        expect(subscriber).not.toHaveBeenCalled();
        expect(tracker.getState()).toMatchObject({
            isInObservationArea: false,
            isTracking: false
        });

        observer.trigger(false);

        expect(() => runAnimationFrame()).not.toThrow();
        expect(onLeave).toHaveBeenCalledTimes(1);
    });
});
