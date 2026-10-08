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

let tracker: ScrollProgressTracker | undefined;

afterEach(() => {
    tracker?.destroy();
    tracker = undefined;

    resetScrollProgressTestMocks();
});

describe('trackScrollProgress subscriptions', () => {
    it('notifies subscribers immediately with the latest state', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        const subscriber = vi.fn();

        tracker.subscribe(subscriber);

        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(subscriber).toHaveBeenLastCalledWith(
            expect.objectContaining({
                progress: 0.25,
                progressDirection: 'none',
                scrollDirection: 'none',
                isInObservationArea: false,
                isRootVisible: true,
                isTracking: false,
                intersectionRatio: 0
            })
        );
    });

    it('removes a subscriber when its immediate notification throws', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});
        const error = new Error('subscriber failed');
        const subscriber = vi.fn(() => {
            throw error;
        });

        tracker = trackScrollProgress(element);

        expect(() => tracker?.subscribe(subscriber)).toThrow(error);

        getLatestIntersectionObserver().trigger(true);
        expect(() => runAnimationFrame()).not.toThrow();
        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('does not register a subscriber that destroys the tracker during immediate notification', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});
        const onDestroy = vi.fn();

        tracker = trackScrollProgress(element);
        tracker.onDestroy(onDestroy);

        const subscriber = vi.fn(() => {
            tracker?.destroy();
        });
        const unsubscribe = tracker.subscribe(subscriber);

        expect(subscriber).toHaveBeenCalledTimes(1);
        expect(onDestroy).toHaveBeenCalledTimes(1);
        expect(() => unsubscribe()).not.toThrow();

        tracker.subscribe(subscriber);

        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('notifies subscribers when the tracker emits a new state', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        const subscriber = vi.fn();

        tracker.subscribe(subscriber);

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(subscriber).toHaveBeenLastCalledWith(
            expect.objectContaining({
                progress: 0.25,
                progressDirection: 'none',
                scrollDirection: 'none',
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true,
                intersectionRatio: 1
            })
        );
    });

    it('stops notifying subscribers after the first subscriber error', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});
        const error = new Error('first subscriber failed');
        let shouldThrow = false;
        const firstSubscriber = vi.fn(() => {
            if (shouldThrow) {
                throw error;
            }
        });
        const secondSubscriber = vi.fn();

        tracker = trackScrollProgress(element);
        tracker.subscribe(firstSubscriber);
        tracker.subscribe(secondSubscriber);
        firstSubscriber.mockClear();
        secondSubscriber.mockClear();
        shouldThrow = true;

        getLatestIntersectionObserver().trigger(true);

        expect(() => runAnimationFrame()).toThrow(error);
        expect(firstSubscriber).toHaveBeenCalledTimes(1);
        expect(secondSubscriber).not.toHaveBeenCalled();
    });

    it('stops notifying unsubscribed subscribers', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        const subscriber = vi.fn();
        const unsubscribe = tracker.subscribe(subscriber);

        expect(subscriber).toHaveBeenCalledTimes(1);

        unsubscribe();

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('does not notify subscribers when the state did not change', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        const subscriber = vi.fn();

        tracker.subscribe(subscriber);

        getLatestIntersectionObserver().trigger(false);
        runAnimationFrame();

        expect(subscriber).toHaveBeenCalledTimes(1);
    });
});
