// @vitest-environment happy-dom

import { beforeEach, afterEach, describe, expect, it } from 'vitest';
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

beforeEach(() => {
    setupScrollProgressTestMocks();
});

afterEach(() => {
    tracker?.destroy();
    tracker = undefined;

    resetScrollProgressTestMocks();
});

describe('trackScrollProgress getState', () => {
    it('returns the latest tracker state', () => {
        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        expect(tracker.getState()).toEqual(
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

    it('returns the updated state after the tracker emits a new state', () => {
        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(tracker.getState()).toEqual(
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

    it('returns a defensive copy of the latest state', () => {
        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        const state = tracker.getState();

        if (state === null) {
            throw new Error('Expected tracker state to be initialized');
        }

        const mutableState = state as { progress: number; isTracking: boolean };
        mutableState.progress = 999;
        mutableState.isTracking = true;

        expect(tracker.getState()).toEqual(
            expect.objectContaining({
                progress: 0.25,
                isTracking: false
            })
        );
    });
});
