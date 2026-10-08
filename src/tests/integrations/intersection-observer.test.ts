// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';

import {
    createElementWithRect,
    createRootElementWithRect,
    getIntersectionObserverInstances,
    getLatestIntersectionObserver,
    resetScrollProgressTestMocks,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

afterEach(() => {
    resetScrollProgressTestMocks();
});

describe('trackScrollProgress IntersectionObserver integration', () => {
    it('recreates the target IntersectionObserver when the root changes', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});
        const firstRoot = createRootElementWithRect();
        const secondRoot = createRootElementWithRect();

        const tracker = trackScrollProgress(element, {
            root: firstRoot,
            rootMargin: '10px 0px',
            observerThreshold: [0, 0.5, 1]
        });

        const firstObserver = getLatestIntersectionObserver();

        expect(firstObserver.options?.root).toBe(firstRoot);
        expect(firstObserver.options?.rootMargin).toBe('10px 0px');
        expect(firstObserver.options?.threshold).toEqual([0, 0.5, 1]);
        expect(firstObserver.observedElements).toContain(element);

        tracker.update({
            root: secondRoot
        });

        const secondObserver = getLatestIntersectionObserver();

        expect(getIntersectionObserverInstances()).toHaveLength(2);
        expect(firstObserver.disconnect).toHaveBeenCalledTimes(1);
        expect(secondObserver).not.toBe(firstObserver);
        expect(secondObserver.options?.root).toBe(secondRoot);
        expect(secondObserver.options?.rootMargin).toBe('10px 0px');
        expect(secondObserver.options?.threshold).toEqual([0, 0.5, 1]);
        expect(secondObserver.observedElements).toContain(element);

        tracker.destroy();
    });

    it('passes rootMargin and observerThreshold to the target IntersectionObserver', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            rootMargin: '20% 0px -10% 0px',
            observerThreshold: [0, 0.5, 1]
        });

        const observer = getLatestIntersectionObserver();

        expect(observer.options?.root).toBeNull();
        expect(observer.options?.rootMargin).toBe('20% 0px -10% 0px');
        expect(observer.options?.threshold).toEqual([0, 0.5, 1]);
        expect(observer.observedElements).toContain(element);

        tracker.destroy();
    });

    it('recreates the target IntersectionObserver when rootMargin changes', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            rootMargin: '0px',
            observerThreshold: 0.5
        });

        const firstObserver = getLatestIntersectionObserver();

        tracker.update({
            rootMargin: '100px 0px'
        });

        const secondObserver = getLatestIntersectionObserver();

        expect(getIntersectionObserverInstances()).toHaveLength(2);
        expect(firstObserver.disconnect).toHaveBeenCalledTimes(1);
        expect(secondObserver).not.toBe(firstObserver);
        expect(secondObserver.options?.rootMargin).toBe('100px 0px');
        expect(secondObserver.options?.threshold).toBe(0.5);
        expect(secondObserver.observedElements).toContain(element);

        tracker.destroy();
    });

    it('recreates the target IntersectionObserver when observerThreshold changes', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            rootMargin: '10px 0px',
            observerThreshold: 0
        });

        const firstObserver = getLatestIntersectionObserver();

        tracker.update({
            observerThreshold: [0, 0.5, 1]
        });

        const secondObserver = getLatestIntersectionObserver();

        expect(getIntersectionObserverInstances()).toHaveLength(2);
        expect(firstObserver.disconnect).toHaveBeenCalledTimes(1);
        expect(secondObserver).not.toBe(firstObserver);
        expect(secondObserver.options?.rootMargin).toBe('10px 0px');
        expect(secondObserver.options?.threshold).toEqual([0, 0.5, 1]);
        expect(secondObserver.observedElements).toContain(element);

        tracker.destroy();
    });

    it('does not recreate the target IntersectionObserver when observerThreshold values are unchanged', () => {
        setupScrollProgressTestMocks();

        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            observerThreshold: [0, 0.5, 1]
        });

        const firstObserver = getLatestIntersectionObserver();

        tracker.update({
            observerThreshold: [0, 0.5, 1]
        });

        expect(getIntersectionObserverInstances()).toHaveLength(1);
        expect(firstObserver.disconnect).not.toHaveBeenCalled();
        expect(getLatestIntersectionObserver()).toBe(firstObserver);

        tracker.destroy();
    });
});
