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

describe('trackScrollProgress cssVar', () => {
    it('writes progress to the configured CSS variable', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        const tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            cssVar: '--scroll-progress'
        });

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('0.25');

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

        window.dispatchEvent(new Event('scroll'));

        runAnimationFrame();

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('0.5');

        tracker.destroy();
    });

    it('keeps CSS variable progress scoped to each tracked element', () => {
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

        const firstTracker = trackScrollProgress(firstElement, {
            start: 0.8,
            end: 0.4,
            cssVar: '--scroll-progress'
        });

        const secondTracker = trackScrollProgress(secondElement, {
            start: 0.8,
            end: 0.4,
            cssVar: '--scroll-progress'
        });

        expect(firstElement.style.getPropertyValue('--scroll-progress')).toBe('0.25');
        expect(secondElement.style.getPropertyValue('--scroll-progress')).toBe('0.5');
        expect(document.documentElement.style.getPropertyValue('--scroll-progress')).toBe('');

        firstTracker.destroy();
        secondTracker.destroy();
    });

    it('removes the previous CSS variable when the binding name changes', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        const onUpdate = vi.fn();

        const tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            cssVar: '--scroll-progress',
            onUpdate
        });

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('0.25');
        expect(onUpdate).toHaveBeenCalledTimes(1);

        tracker.update({
            cssVar: '--new-scroll-progress'
        });

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('');
        expect(hasScheduledAnimationFrame()).toBe(true);

        runAnimationFrame();

        expect(element.style.getPropertyValue('--new-scroll-progress')).toBe('0.25');

        /**
         * Changing only the CSS variable should not emit a duplicate update
         * when the scroll state itself did not change.
         */
        expect(onUpdate).toHaveBeenCalledTimes(1);

        tracker.destroy();
    });

    it('removes the CSS variable binding when updated to null', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        const tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            cssVar: '--scroll-progress'
        });

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('0.25');

        tracker.update({
            cssVar: null
        });

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('');

        runAnimationFrame();

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('');

        tracker.destroy();
    });

    it('writes the final CSS variable value before once cleanup', () => {
        setupScrollProgressTestMocks();

        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        const tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4,
            once: true,
            cssVar: '--scroll-progress'
        });

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('0.25');

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

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

        expect(element.style.getPropertyValue('--scroll-progress')).toBe('1');
        expect(getLatestIntersectionObserver().disconnect).toHaveBeenCalledTimes(1);

        tracker.destroy();
    });
});
