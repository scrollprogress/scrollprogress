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

describe('trackScrollProgress state integration', () => {
    it('keeps observation state independent from the progress range', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const onUpdate = vi.fn();

        tracker = trackScrollProgress(
            createElementWithRect({
                top: 900,
                height: 300
            }),
            {
                start: 0.8,
                end: 0.4,
                rootMargin: '200px 0px',
                onUpdate
            }
        );

        const observer = getLatestIntersectionObserver();

        expect(observer.options?.rootMargin).toBe('200px 0px');

        observer.trigger(true);
        runAnimationFrame();

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                progress: 0,
                isInObservationArea: true,
                isTracking: true
            })
        );
    });

    it('exposes the target intersection ratio in the scroll progress state', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const onUpdate = vi.fn();

        tracker = trackScrollProgress(createElementWithRect({}), {
            onUpdate
        });

        getLatestIntersectionObserver().trigger(true, 0.42);
        runAnimationFrame();

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                isInObservationArea: true,
                intersectionRatio: 0.42
            })
        );
    });
});
