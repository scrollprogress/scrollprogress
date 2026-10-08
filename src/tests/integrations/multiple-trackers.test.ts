// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';

import {
    createElementWithRect,
    getIntersectionObserverForObservedElement,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    runNextAnimationFrame,
    setWindowValue,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

afterEach(() => {
    resetScrollProgressTestMocks();
});

describe('multiple trackScrollProgress instances', () => {
    it('keeps another tracker frame scheduled after a tracker callback throws', () => {
        setupScrollProgressTestMocks();

        const firstElement = createElementWithRect({});
        const secondElement = createElementWithRect({});
        const error = new Error('first tracker failed');
        let shouldThrow = false;
        const firstOnUpdate = vi.fn(() => {
            if (shouldThrow) {
                throw error;
            }
        });
        const secondOnUpdate = vi.fn();
        const firstTracker = trackScrollProgress(firstElement, {
            onUpdate: firstOnUpdate
        });
        const secondTracker = trackScrollProgress(secondElement, {
            onUpdate: secondOnUpdate
        });

        firstOnUpdate.mockClear();
        secondOnUpdate.mockClear();
        shouldThrow = true;

        getIntersectionObserverForObservedElement(firstElement).trigger(true, 0.5);
        getIntersectionObserverForObservedElement(secondElement).trigger(true, 0.5);

        expect(() => runNextAnimationFrame()).toThrow(error);
        expect(hasScheduledAnimationFrame()).toBe(true);
        expect(() => runNextAnimationFrame()).not.toThrow();

        expect(firstOnUpdate).toHaveBeenCalledTimes(1);
        expect(secondOnUpdate).toHaveBeenCalledTimes(1);
        expect(hasScheduledAnimationFrame()).toBe(false);

        firstTracker.destroy();
        secondTracker.destroy();
    });

    it('updates concurrent trackers independently in the same animation frame', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const firstElement = createElementWithRect({
            top: 625,
            height: 300
        });

        const secondElement = createElementWithRect({
            top: 450,
            height: 300
        });

        const firstOnUpdate = vi.fn();
        const secondOnUpdate = vi.fn();

        const firstTracker = trackScrollProgress(firstElement, {
            start: 0.8,
            end: 0.4,
            onUpdate: firstOnUpdate
        });

        const secondTracker = trackScrollProgress(secondElement, {
            start: 0.8,
            end: 0.4,
            onUpdate: secondOnUpdate
        });

        getIntersectionObserverForObservedElement(firstElement).trigger(true);
        getIntersectionObserverForObservedElement(secondElement).trigger(true);

        runAnimationFrame();

        firstOnUpdate.mockClear();
        secondOnUpdate.mockClear();

        firstElement.getBoundingClientRect = () =>
            ({
                top: 450,
                left: 450,
                width: 300,
                height: 300,
                right: 750,
                bottom: 750,
                x: 450,
                y: 450,
                toJSON: () => ({})
            }) as DOMRect;

        secondElement.getBoundingClientRect = () =>
            ({
                top: 275,
                left: 450,
                width: 300,
                height: 300,
                right: 750,
                bottom: 575,
                x: 450,
                y: 275,
                toJSON: () => ({})
            }) as DOMRect;

        window.dispatchEvent(new Event('scroll'));

        runAnimationFrame();

        expect(firstOnUpdate).toHaveBeenCalledTimes(1);
        expect(secondOnUpdate).toHaveBeenCalledTimes(1);

        expect(firstOnUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                progress: 0.5,
                isTracking: true
            })
        );

        expect(secondOnUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                progress: 0.75,
                isTracking: true
            })
        );

        firstTracker.destroy();
        secondTracker.destroy();
    });
});
