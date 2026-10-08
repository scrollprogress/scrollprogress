// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';

import {
    createElementWithRect,
    getLatestIntersectionObserver,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setWindowValue,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

afterEach(() => {
    resetScrollProgressTestMocks();
});

describe('trackScrollProgress once integration', () => {
    it('does not complete once tracking before tracking becomes active', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 100,
            height: 300
        });

        const tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            once: true
        });

        expect(getLatestIntersectionObserver().disconnect).not.toHaveBeenCalled();

        tracker.destroy();
    });

    it('destroys the tracker after once progress reaches the terminal value', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 100,
            height: 300
        });

        const onEnter = vi.fn();
        const onUpdate = vi.fn();

        const tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            once: true,
            onEnter,
            onUpdate
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(onEnter).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                progress: 1,
                isTracking: true
            })
        );

        expect(getLatestIntersectionObserver().disconnect).toHaveBeenCalledTimes(1);

        expect(hasScheduledAnimationFrame()).toBe(false);

        window.dispatchEvent(new Event('scroll'));

        expect(hasScheduledAnimationFrame()).toBe(false);

        tracker.destroy();
    });

    it('completes once after an ordinary callback throws and preserves fail-fast order', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 100,
            height: 300
        });
        const error = new Error('onEnter failed');
        const onEnter = vi.fn(() => {
            throw error;
        });
        const onUpdate = vi.fn();
        const subscriber = vi.fn();
        const onDestroy = vi.fn(() => {
            throw new Error('onDestroy failed');
        });
        const finalOnDestroy = vi.fn();
        const tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            once: true,
            onEnter,
            onUpdate
        });
        const observer = getLatestIntersectionObserver();

        onUpdate.mockClear();
        tracker.subscribe(subscriber);
        subscriber.mockClear();
        tracker.onDestroy(onDestroy);
        tracker.onDestroy(finalOnDestroy);

        observer.trigger(true);

        expect(() => runAnimationFrame()).toThrow(error);
        expect(onEnter).toHaveBeenCalledTimes(1);
        expect(onUpdate).not.toHaveBeenCalled();
        expect(subscriber).not.toHaveBeenCalled();
        expect(onDestroy).toHaveBeenCalledTimes(1);
        expect(finalOnDestroy).toHaveBeenCalledTimes(1);
        expect(observer.disconnect).toHaveBeenCalledTimes(1);
        expect(hasScheduledAnimationFrame()).toBe(false);
        expect(() => tracker.destroy()).not.toThrow();
    });

    it('completes once after an explicit subscriber notification throws', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 100,
            height: 300
        });
        const tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });
        const observer = getLatestIntersectionObserver();
        const error = new Error('subscriber failed');
        let shouldThrow = false;
        const subscriber = vi.fn(() => {
            if (shouldThrow) {
                throw error;
            }
        });
        const onDestroy = vi.fn();

        observer.trigger(true);
        runAnimationFrame();

        tracker.subscribe(subscriber);
        tracker.onDestroy(onDestroy);
        shouldThrow = true;
        tracker.update({ once: true });

        expect(() => runAnimationFrame()).toThrow(error);
        expect(onDestroy).toHaveBeenCalledTimes(1);
        expect(observer.disconnect).toHaveBeenCalledTimes(1);
        expect(hasScheduledAnimationFrame()).toBe(false);
    });

    it('uses zero as the once terminal value when inverted is true', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 800,
            height: 300
        });

        const onUpdate = vi.fn();

        const tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            inverted: true,
            once: true,
            onUpdate
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                progress: 1,
                isTracking: true
            })
        );

        expect(getLatestIntersectionObserver().disconnect).not.toHaveBeenCalled();

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

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                progress: 0,
                isTracking: true
            })
        );

        expect(getLatestIntersectionObserver().disconnect).toHaveBeenCalledTimes(1);

        tracker.destroy();
    });

    it('completes tracking when once is enabled at the terminal value', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 100,
            height: 300
        });

        const tracker = trackScrollProgress(element);
        const observer = getLatestIntersectionObserver();

        observer.trigger(true);
        runAnimationFrame();

        expect(tracker.getState()).toMatchObject({
            progress: 1,
            isTracking: true
        });
        expect(observer.disconnect).not.toHaveBeenCalled();

        tracker.update({
            once: true
        });

        runAnimationFrame();

        expect(observer.disconnect).toHaveBeenCalledTimes(1);

        tracker.destroy();
    });
});
