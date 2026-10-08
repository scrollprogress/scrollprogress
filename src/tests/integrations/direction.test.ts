// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import type { ScrollProgressTracker } from '../../lib/types';

import {
    createElementWithRect,
    createRootElementWithRect,
    getLatestIntersectionObserver,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setElementScrollPosition,
    setWindowValue,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

let tracker: ScrollProgressTracker | undefined;

afterEach(() => {
    tracker?.destroy();
    tracker = undefined;

    resetScrollProgressTestMocks();
});

describe('trackScrollProgress direction integration', () => {
    it('reads scrollDirection from scrollY on the y axis', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);
        setWindowValue('scrollY', 0);

        const onUpdate = vi.fn();

        tracker = trackScrollProgress(createElementWithRect({}), {
            onUpdate
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        setWindowValue('scrollY', 100);
        window.dispatchEvent(new Event('scroll'));

        runAnimationFrame();

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                scrollDirection: 'forward'
            })
        );
    });

    it('reads scrollDirection from scrollX on the x axis', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerWidth', 1000);
        setWindowValue('scrollX', 0);

        const onUpdate = vi.fn();

        tracker = trackScrollProgress(createElementWithRect({}), {
            axis: 'x',
            onUpdate
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        setWindowValue('scrollX', 100);
        window.dispatchEvent(new Event('scroll'));

        runAnimationFrame();

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                scrollDirection: 'forward'
            })
        );
    });

    it('inverts the tracked progress when inverted is true', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        const onUpdate = vi.fn();

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            inverted: true,
            onUpdate
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                progress: 0.75
            })
        );
    });

    it('keeps scrollDirection physical while progressDirection follows inverted progress', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);
        setWindowValue('scrollY', 0);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        const onUpdate = vi.fn();

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            inverted: true,
            onUpdate
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        element.getBoundingClientRect = () =>
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

        setWindowValue('scrollY', 100);
        window.dispatchEvent(new Event('scroll'));

        runAnimationFrame();

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                progress: 0.5,
                progressDirection: 'backward',
                scrollDirection: 'forward'
            })
        );
    });

    it('reads scrollDirection from scrollLeft on a custom x-axis root', () => {
        setupScrollProgressTestMocks();

        const root = createRootElementWithRect();
        const element = createElementWithRect({});

        const onUpdate = vi.fn();

        tracker = trackScrollProgress(element, {
            root,
            axis: 'x',
            onUpdate
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        setElementScrollPosition(root, 'scrollLeft', 100);
        root.dispatchEvent(new Event('scroll'));

        runAnimationFrame();

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                scrollDirection: 'forward'
            })
        );

        setElementScrollPosition(root, 'scrollLeft', 50);
        root.dispatchEvent(new Event('scroll'));

        runAnimationFrame();

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                scrollDirection: 'backward'
            })
        );
    });
});
