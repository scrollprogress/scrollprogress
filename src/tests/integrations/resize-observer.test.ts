// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';

import {
    createElementWithRect,
    createRootElementWithRect,
    expectObservedElements,
    getLatestResizeObserver,
    getResizeObserverInstances,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

afterEach(() => {
    resetScrollProgressTestMocks();
});

describe('trackScrollProgress ResizeObserver integration', () => {
    it('observes the target element with ResizeObserver', () => {
        setupScrollProgressTestMocks({ resizeObserver: true });

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element);

        expectObservedElements(getLatestResizeObserver(), [element]);

        tracker.destroy();
    });

    it('observes both the target element and a custom root element with ResizeObserver', () => {
        setupScrollProgressTestMocks({ resizeObserver: true });

        const element = createElementWithRect({});
        const root = createRootElementWithRect();

        const tracker = trackScrollProgress(element, {
            root
        });

        expectObservedElements(getLatestResizeObserver(), [element, root]);

        tracker.destroy();
    });

    it('does not observe a Document root with ResizeObserver', () => {
        setupScrollProgressTestMocks({ resizeObserver: true });

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            root: document
        });

        expectObservedElements(getLatestResizeObserver(), [element]);

        tracker.destroy();
    });

    it('recreates the ResizeObserver when the root changes', () => {
        setupScrollProgressTestMocks({ resizeObserver: true });

        const element = createElementWithRect({});
        const firstRoot = createRootElementWithRect();
        const secondRoot = createRootElementWithRect();

        const tracker = trackScrollProgress(element, {
            root: firstRoot
        });

        const firstResizeObserver = getLatestResizeObserver();

        expectObservedElements(firstResizeObserver, [element, firstRoot]);

        tracker.update({
            root: secondRoot
        });

        const secondResizeObserver = getLatestResizeObserver();

        expect(getResizeObserverInstances()).toHaveLength(2);
        expect(firstResizeObserver.disconnect).toHaveBeenCalledTimes(1);
        expect(secondResizeObserver).not.toBe(firstResizeObserver);
        expectObservedElements(secondResizeObserver, [element, secondRoot]);

        tracker.destroy();
    });

    it('requests a progress update when ResizeObserver fires', () => {
        setupScrollProgressTestMocks({ resizeObserver: true });

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element);

        expect(hasScheduledAnimationFrame()).toBe(false);

        getLatestResizeObserver().trigger();

        expect(hasScheduledAnimationFrame()).toBe(true);

        tracker.destroy();
    });
});
