// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';

import {
    createElementWithRect,
    createRootElementWithRect,
    getIntersectionObserverForObservedElement,
    getIntersectionObserverInstances,
    getLatestIntersectionObserver,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setWindowValue,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

beforeEach(() => {
    setupScrollProgressTestMocks();
});

afterEach(() => {
    resetScrollProgressTestMocks();
});

describe('trackScrollProgress root visibility gate', () => {
    it('does not create a root visibility observer by default', () => {
        const root = createRootElementWithRect();
        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            root
        });

        expect(getIntersectionObserverInstances()).toHaveLength(1);
        expect(getIntersectionObserverInstances()[0]?.observedElements).toContain(element);

        tracker.destroy();
    });

    it('keeps legacy root-based tracking when requireRootVisible is false', () => {
        setWindowValue('innerHeight', 1000);
        setWindowValue('innerWidth', 1000);

        const root = createRootElementWithRect({
            top: 2000,
            height: 1000
        });

        const element = createElementWithRect({});

        const onEnter = vi.fn();
        const onUpdate = vi.fn();

        const tracker = trackScrollProgress(element, {
            root,
            requireRootVisible: false,
            onEnter,
            onUpdate
        });

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(onEnter).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true
            })
        );

        tracker.destroy();
    });

    it('creates a root visibility observer when requireRootVisible is true and root is a custom element', () => {
        const root = createRootElementWithRect();
        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            root,
            requireRootVisible: true
        });

        expect(getIntersectionObserverInstances()).toHaveLength(2);

        const targetObserver = getIntersectionObserverForObservedElement(element);
        const rootVisibilityObserver = getIntersectionObserverForObservedElement(root);

        expect(targetObserver.options?.root).toBe(root);
        expect(rootVisibilityObserver.options?.root).toBeNull();
        expect(rootVisibilityObserver.options?.rootMargin).toBe('0px');
        expect(rootVisibilityObserver.options?.threshold).toBe(0);

        tracker.destroy();
    });

    it('does not create a root visibility observer when root is viewport-based', () => {
        const element = createElementWithRect({});
        const onUpdate = vi.fn();

        const tracker = trackScrollProgress(element, {
            requireRootVisible: true,
            onUpdate
        });

        expect(getIntersectionObserverInstances()).toHaveLength(1);

        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();

        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                isRootVisible: true,
                isTracking: true
            })
        );

        tracker.destroy();
    });

    it('does not enter when requireRootVisible is true and the custom root is outside the viewport', () => {
        setWindowValue('innerHeight', 1000);
        setWindowValue('innerWidth', 1000);

        const root = createRootElementWithRect({
            top: 2000,
            height: 1000
        });

        const element = createElementWithRect({});

        const onEnter = vi.fn();
        const onUpdate = vi.fn();

        const tracker = trackScrollProgress(element, {
            root,
            requireRootVisible: true,
            onEnter,
            onUpdate
        });

        const targetObserver = getIntersectionObserverForObservedElement(element);

        targetObserver.trigger(true);
        runAnimationFrame();

        expect(onEnter).not.toHaveBeenCalled();
        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                isInObservationArea: true,
                isRootVisible: false,
                isTracking: false
            })
        );

        tracker.destroy();
    });

    it('enters when the custom root becomes visible while the target is already in the observation area', () => {
        setWindowValue('innerHeight', 1000);
        setWindowValue('innerWidth', 1000);

        const root = createRootElementWithRect({
            top: 2000,
            height: 1000
        });

        const element = createElementWithRect({});

        const onEnter = vi.fn();
        const onUpdate = vi.fn();

        const tracker = trackScrollProgress(element, {
            root,
            requireRootVisible: true,
            onEnter,
            onUpdate
        });

        const targetObserver = getIntersectionObserverForObservedElement(element);
        const rootVisibilityObserver = getIntersectionObserverForObservedElement(root);

        targetObserver.trigger(true);
        runAnimationFrame();

        expect(onEnter).not.toHaveBeenCalled();

        rootVisibilityObserver.trigger(true);
        runAnimationFrame();

        expect(onEnter).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true
            })
        );

        tracker.destroy();
    });

    it('leaves when the custom root becomes hidden while the target remains in the observation area', () => {
        setWindowValue('innerHeight', 1000);
        setWindowValue('innerWidth', 1000);

        const root = createRootElementWithRect();
        const element = createElementWithRect({});

        const onEnter = vi.fn();
        const onLeave = vi.fn();
        const onUpdate = vi.fn();

        const tracker = trackScrollProgress(element, {
            root,
            requireRootVisible: true,
            onEnter,
            onLeave,
            onUpdate
        });

        const targetObserver = getIntersectionObserverForObservedElement(element);
        const rootVisibilityObserver = getIntersectionObserverForObservedElement(root);

        targetObserver.trigger(true);
        runAnimationFrame();

        expect(onEnter).toHaveBeenCalledTimes(1);
        expect(onLeave).not.toHaveBeenCalled();

        rootVisibilityObserver.trigger(false);
        runAnimationFrame();

        expect(onLeave).toHaveBeenCalledTimes(1);
        expect(onUpdate).toHaveBeenLastCalledWith(
            expect.objectContaining({
                isInObservationArea: true,
                isRootVisible: false,
                isTracking: false
            })
        );

        tracker.destroy();
    });

    it('creates and disconnects the root visibility observer when requireRootVisible changes', () => {
        const root = createRootElementWithRect();
        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            root,
            requireRootVisible: false
        });

        expect(getIntersectionObserverInstances()).toHaveLength(1);

        tracker.update({
            requireRootVisible: true
        });

        expect(getIntersectionObserverInstances()).toHaveLength(2);

        const rootVisibilityObserver = getIntersectionObserverForObservedElement(root);

        tracker.update({
            requireRootVisible: false
        });

        expect(rootVisibilityObserver.disconnect).toHaveBeenCalledTimes(1);

        tracker.destroy();
    });

    it('disconnects both intersection observers on destroy when root visibility is required', () => {
        const root = createRootElementWithRect();
        const element = createElementWithRect({});

        const tracker = trackScrollProgress(element, {
            root,
            requireRootVisible: true
        });

        const targetObserver = getIntersectionObserverForObservedElement(element);
        const rootVisibilityObserver = getIntersectionObserverForObservedElement(root);

        tracker.destroy();

        expect(targetObserver.disconnect).toHaveBeenCalledTimes(1);
        expect(rootVisibilityObserver.disconnect).toHaveBeenCalledTimes(1);
    });
});
