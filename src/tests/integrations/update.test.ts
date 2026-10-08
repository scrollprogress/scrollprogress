// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('trackScrollProgress runtime updates', () => {
    it('recalculates progress with updated start and end values', () => {
        setWindowValue('innerHeight', 1000);

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            start: 0.8,
            end: 0.4
        });

        expect(tracker.getState()?.progress).toBe(0.25);

        tracker.update({
            start: 0.7,
            end: 0.5
        });

        runAnimationFrame();

        expect(tracker.getState()?.progress).toBeCloseTo(0.15);
    });

    it('switches to the updated axis without carrying over directions', () => {
        setWindowValue('innerWidth', 1000);
        setWindowValue('innerHeight', 1000);
        setWindowValue('scrollX', 600);
        setWindowValue('scrollY', 200);

        const element = createElementWithRect({
            top: 625,
            left: 450,
            width: 300,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            axis: 'y',
            start: 0.8,
            end: 0.4
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(tracker.getState()).toMatchObject({
            progress: 0.25,
            progressDirection: 'none',
            scrollDirection: 'none'
        });

        tracker.update({
            axis: 'x'
        });

        runAnimationFrame();

        expect(tracker.getState()).toMatchObject({
            progress: 0.5,
            progressDirection: 'none',
            scrollDirection: 'none'
        });

        element.getBoundingClientRect = () =>
            ({
                top: 625,
                left: 380,
                width: 300,
                height: 300,
                right: 680,
                bottom: 925,
                x: 380,
                y: 625,
                toJSON: () => ({})
            }) as DOMRect;

        setWindowValue('scrollX', 700);
        window.dispatchEvent(new Event('scroll'));

        runAnimationFrame();

        expect(tracker.getState()).toMatchObject({
            progress: 0.6,
            progressDirection: 'forward',
            scrollDirection: 'forward'
        });
    });

    it('applies updated inversion without carrying over progress direction', () => {
        setWindowValue('innerHeight', 1000);
        setWindowValue('scrollY', 0);

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

        expect(tracker.getState()).toMatchObject({
            progress: 0.25,
            progressDirection: 'none',
            scrollDirection: 'none'
        });

        tracker.update({
            inverted: true
        });

        runAnimationFrame();

        expect(tracker.getState()).toMatchObject({
            progress: 0.75,
            progressDirection: 'none',
            scrollDirection: 'none'
        });

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

        expect(tracker.getState()).toMatchObject({
            progress: 0.5,
            progressDirection: 'backward',
            scrollDirection: 'forward'
        });
    });

    it('replaces callbacks at runtime', () => {
        setWindowValue('innerHeight', 1000);

        const previousOnUpdate = vi.fn();
        const previousOnEnter = vi.fn();
        const previousOnLeave = vi.fn();

        const nextOnUpdate = vi.fn();
        const nextOnEnter = vi.fn();
        const nextOnLeave = vi.fn();

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            onUpdate: previousOnUpdate,
            onEnter: previousOnEnter,
            onLeave: previousOnLeave
        });

        const observer = getLatestIntersectionObserver();

        tracker.update({
            onUpdate: nextOnUpdate,
            onEnter: nextOnEnter,
            onLeave: nextOnLeave
        });

        runAnimationFrame();

        expect(nextOnUpdate).not.toHaveBeenCalled();
        expect(nextOnEnter).not.toHaveBeenCalled();
        expect(nextOnLeave).not.toHaveBeenCalled();

        observer.trigger(true);
        runAnimationFrame();

        observer.trigger(false);
        runAnimationFrame();

        expect(previousOnUpdate).toHaveBeenCalledTimes(1);
        expect(previousOnEnter).not.toHaveBeenCalled();
        expect(previousOnLeave).not.toHaveBeenCalled();

        expect(nextOnUpdate).toHaveBeenCalledTimes(2);
        expect(nextOnEnter).toHaveBeenCalledTimes(1);
        expect(nextOnLeave).toHaveBeenCalledTimes(1);
    });

    it('removes callbacks explicitly set to undefined at runtime', () => {
        setWindowValue('innerHeight', 1000);

        const onUpdate = vi.fn();
        const onEnter = vi.fn();
        const onLeave = vi.fn();

        const element = createElementWithRect({
            top: 625,
            height: 300
        });

        tracker = trackScrollProgress(element, {
            onUpdate,
            onEnter,
            onLeave
        });

        const observer = getLatestIntersectionObserver();

        expect(onUpdate).toHaveBeenCalledTimes(1);

        tracker.update({
            onUpdate: undefined,
            onEnter: undefined,
            onLeave: undefined
        });

        runAnimationFrame();

        observer.trigger(true);
        runAnimationFrame();

        observer.trigger(false);
        runAnimationFrame();

        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onEnter).not.toHaveBeenCalled();
        expect(onLeave).not.toHaveBeenCalled();
    });
});
