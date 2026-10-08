// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    createElementWithRect,
    createRootElementWithRect,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks,
    setWindowValue
} from './scroll-progress-test-utils';

afterEach(() => {
    resetScrollProgressTestMocks();
});

describe('scroll progress test utils', () => {
    it.each(['innerWidth', 'innerHeight', 'scrollX', 'scrollY'] as const)(
        'restores the original window.%s value',
        (name) => {
            const originalValue = window[name];

            setWindowValue(name, originalValue + 1);

            expect(window[name]).toBe(originalValue + 1);

            resetScrollProgressTestMocks();

            expect(window[name]).toBe(originalValue);
        }
    );

    it('derives element bounds from position and size', () => {
        const element = createElementWithRect({
            top: 625,
            left: 100,
            width: 200,
            height: 300
        });

        expect(element.getBoundingClientRect()).toMatchObject({
            top: 625,
            left: 100,
            width: 200,
            height: 300,
            right: 300,
            bottom: 925,
            x: 100,
            y: 625
        });
    });

    it('keeps custom root bounds and element size aligned', () => {
        const root = createRootElementWithRect({
            top: 2000,
            left: 100,
            width: 800,
            height: 1000
        });

        expect(root.getBoundingClientRect()).toMatchObject({
            top: 2000,
            left: 100,
            width: 800,
            height: 1000,
            right: 900,
            bottom: 3000,
            x: 100,
            y: 2000
        });

        expect(root.clientWidth).toBe(800);
        expect(root.clientHeight).toBe(1000);
    });

    it('runs all animation frame callbacks scheduled for the same frame', () => {
        setupScrollProgressTestMocks();

        const firstCallback = vi.fn();
        const secondCallback = vi.fn();

        window.requestAnimationFrame(firstCallback);
        window.requestAnimationFrame(secondCallback);

        expect(hasScheduledAnimationFrame()).toBe(true);

        runAnimationFrame();

        expect(firstCallback).toHaveBeenCalledTimes(1);
        expect(secondCallback).toHaveBeenCalledTimes(1);
        expect(hasScheduledAnimationFrame()).toBe(false);
    });

    it('cancels only the matching animation frame callback', () => {
        setupScrollProgressTestMocks();

        const firstCallback = vi.fn();
        const secondCallback = vi.fn();

        const firstFrameId = window.requestAnimationFrame(firstCallback);

        window.requestAnimationFrame(secondCallback);
        window.cancelAnimationFrame(firstFrameId);

        runAnimationFrame();

        expect(firstCallback).not.toHaveBeenCalled();
        expect(secondCallback).toHaveBeenCalledTimes(1);
    });
});
