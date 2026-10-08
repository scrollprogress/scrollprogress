// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';

import {
    createElementWithRect,
    createRootElementWithRect,
    getLatestIntersectionObserver,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

afterEach(() => {
    resetScrollProgressTestMocks();
});

describe('trackScrollProgress root integration', () => {
    it('listens to scroll events on a custom x-axis root', () => {
        setupScrollProgressTestMocks();

        const root = createRootElementWithRect();
        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            root,
            axis: 'x'
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(hasScheduledAnimationFrame()).toBe(false);

        root.dispatchEvent(new Event('scroll'));

        expect(hasScheduledAnimationFrame()).toBe(true);

        tracker.destroy();
    });

    it('does not listen to window scroll events when using a custom root', () => {
        setupScrollProgressTestMocks();

        const root = createRootElementWithRect();
        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            root,
            axis: 'x'
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(hasScheduledAnimationFrame()).toBe(false);

        window.dispatchEvent(new Event('scroll'));

        expect(hasScheduledAnimationFrame()).toBe(false);

        tracker.destroy();
    });

    it('moves the scroll listener from the old root to the new root when the root changes', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});
        const firstRoot = createRootElementWithRect();
        const secondRoot = createRootElementWithRect();

        const removeFirstRootScrollListener = vi.spyOn(firstRoot, 'removeEventListener');
        const addSecondRootScrollListener = vi.spyOn(secondRoot, 'addEventListener');

        const tracker = trackScrollProgress(element, {
            root: firstRoot
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        tracker.update({
            root: secondRoot
        });

        expect(removeFirstRootScrollListener).toHaveBeenCalledWith('scroll', expect.any(Function));

        expect(addSecondRootScrollListener).toHaveBeenCalledWith('scroll', expect.any(Function));

        runAnimationFrame();

        expect(hasScheduledAnimationFrame()).toBe(false);

        firstRoot.dispatchEvent(new Event('scroll'));

        expect(hasScheduledAnimationFrame()).toBe(false);

        secondRoot.dispatchEvent(new Event('scroll'));

        // A new root must report its own intersection before tracked scroll work.
        expect(hasScheduledAnimationFrame()).toBe(false);
        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();
        secondRoot.dispatchEvent(new Event('scroll'));
        expect(hasScheduledAnimationFrame()).toBe(true);

        tracker.destroy();
    });

    it('removes the active root scroll listener on destroy after the root changes', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});
        const firstRoot = createRootElementWithRect();
        const secondRoot = createRootElementWithRect();

        const removeFirstRootScrollListener = vi.spyOn(firstRoot, 'removeEventListener');
        const removeSecondRootScrollListener = vi.spyOn(secondRoot, 'removeEventListener');

        const tracker = trackScrollProgress(element, {
            root: firstRoot
        });

        tracker.update({
            root: secondRoot
        });

        expect(removeFirstRootScrollListener).toHaveBeenCalledWith('scroll', expect.any(Function));

        expect(removeSecondRootScrollListener).not.toHaveBeenCalled();

        tracker.destroy();

        expect(removeSecondRootScrollListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
});
