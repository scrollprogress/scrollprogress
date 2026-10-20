// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import {
    createElementWithRect,
    createRootElementWithRect,
    getIntersectionObserverInstances,
    getLatestIntersectionObserver,
    getResizeObserverInstances,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';
import type { ScrollProgressTracker } from '../../lib/types';
let tracker: ScrollProgressTracker | undefined;
beforeEach(() => setupScrollProgressTestMocks({ resizeObserver: true }));
afterEach(() => {
    tracker?.destroy();
    tracker = undefined;
    resetScrollProgressTestMocks();
});
it.each([false, true])(
    'balances effective root changes even with early observer delivery (%s)',
    (earlyDelivery) => {
        const events: string[] = [];
        tracker = trackScrollProgress(createElementWithRect(), {
            onEnter: () => events.push('enter'),
            onLeave: () => events.push('leave')
        });
        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();
        tracker.update({ root: createRootElementWithRect() });
        expect(tracker.getState()).toBeNull();
        if (earlyDelivery) getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();
        if (!earlyDelivery) {
            getLatestIntersectionObserver().trigger(true);
            runAnimationFrame();
        }
        expect(events).toEqual(['enter', 'leave', 'enter']);
        tracker.destroy();
        expect(events).toHaveLength(3);
    }
);
it('does not emit leave when reconfiguring an inactive root', () => {
    const leave = vi.fn();
    tracker = trackScrollProgress(createElementWithRect(), { onLeave: leave });
    tracker.update({ root: createRootElementWithRect() });
    runAnimationFrame();
    expect(leave).not.toHaveBeenCalled();
});
it.each([false, true])(
    'only emits requireRootVisible transitions that change tracking (visible=%s)',
    (visible) => {
        const events: string[] = [];
        const root = createRootElementWithRect({ top: visible ? 0 : 3000 });
        tracker = trackScrollProgress(createElementWithRect(), {
            root,
            onEnter: () => events.push('enter'),
            onLeave: () => events.push('leave')
        });
        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();
        tracker.update({ requireRootVisible: true });
        expect(tracker.getState()).toBeNull();
        runAnimationFrame();
        expect(events).toEqual(visible ? ['enter'] : ['enter', 'leave']);
        tracker.update({ requireRootVisible: false });
        expect(tracker.getState()).toBeNull();
        runAnimationFrame();
        expect(events).toEqual(visible ? ['enter'] : ['enter', 'leave', 'enter']);
    }
);
it.each(['enter', 'leave'] as const)('does not repeat a throwing %s callback', (which) => {
    const enter = vi.fn(() => {
        if (which === 'enter') throw new Error('enter');
    });
    const leave = vi.fn(() => {
        if (which === 'leave') throw new Error('leave');
    });
    tracker = trackScrollProgress(createElementWithRect(), { onEnter: enter, onLeave: leave });
    getLatestIntersectionObserver().trigger(true);
    if (which === 'enter') expect(runAnimationFrame).toThrow('enter');
    else runAnimationFrame();
    tracker.update({ root: createRootElementWithRect() });
    if (which === 'leave') expect(runAnimationFrame).toThrow('leave');
    else runAnimationFrame();
    tracker.update({});
    runAnimationFrame();
    expect(enter).toHaveBeenCalledTimes(1);
    expect(leave).toHaveBeenCalledTimes(1);
});
it('getState() may temporarily return null after a change of effective root or requireRootVisible; it does not return null after a change between equivalent viewport aliases', () => {
    tracker = trackScrollProgress(createElementWithRect());
    tracker.update({ root: document.documentElement });
    expect(tracker.getState()).not.toBeNull();
    runAnimationFrame();
    expect(getIntersectionObserverInstances()).toHaveLength(1);
    tracker.update({ root: createRootElementWithRect() });
    expect(tracker.getState()).toBeNull();
    runAnimationFrame();
    tracker.update({ requireRootVisible: true });
    expect(tracker.getState()).toBeNull();
    runAnimationFrame();
});

it.each([false, true])(
    'commits state before a throwing pending leave and recovers the next enter (early=%s)',
    (earlyDelivery) => {
        const element = createElementWithRect();
        const events: string[] = [];
        const expected = new Error('pending leave failed');
        tracker = trackScrollProgress(element, {
            cssVar: '--progress',
            onEnter: () => events.push('enter'),
            onLeave: () => {
                events.push('leave');
                const committed = tracker!.getState();
                expect(committed).not.toBeNull();
                expect(committed!.isTracking).toBe(earlyDelivery);
                expect(Number(element.style.getPropertyValue('--progress'))).toBe(
                    committed!.progress
                );
                throw expected;
            },
            onUpdate: () => events.push('update')
        });
        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();
        tracker.subscribe(() => events.push('subscriber'));
        events.length = 0;

        tracker.update({ root: createRootElementWithRect() });
        expect(tracker.getState()).toBeNull();
        if (earlyDelivery) getLatestIntersectionObserver().trigger(true);
        expect(runAnimationFrame).toThrow(expected);
        const committed = tracker.getState();
        expect(committed).not.toBeNull();
        expect(committed!.isTracking).toBe(earlyDelivery);
        expect(events).toEqual(['leave']);
        expect(hasScheduledAnimationFrame()).toBe(false);

        if (earlyDelivery) tracker.update({});
        else getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();
        if (earlyDelivery) expect(tracker.getState()).toEqual(committed);
        expect(events).toEqual(['leave', 'enter', 'update', 'subscriber']);
        tracker.update({});
        runAnimationFrame();
        expect(events).toEqual(['leave', 'enter', 'update', 'subscriber', 'subscriber']);
    }
);

it('commits state and releases resources when pending leave destroys the tracker', () => {
    const onUpdate = vi.fn();
    const subscriber = vi.fn();
    const destroyed = vi.fn();
    tracker = trackScrollProgress(createElementWithRect(), {
        onUpdate,
        onLeave: () => {
            expect(tracker!.getState()).not.toBeNull();
            tracker!.destroy();
        }
    });
    getLatestIntersectionObserver().trigger(true);
    runAnimationFrame();
    tracker.subscribe(subscriber);
    tracker.onDestroy(destroyed);
    onUpdate.mockClear();
    subscriber.mockClear();
    tracker.update({ root: createRootElementWithRect() });
    getLatestIntersectionObserver().trigger(true);
    runAnimationFrame();
    expect(destroyed).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(subscriber).not.toHaveBeenCalled();
    expect(tracker.getState()!.isTracking).toBe(true);
    for (const observer of [
        ...getIntersectionObserverInstances(),
        ...getResizeObserverInstances()
    ]) {
        expect(observer.disconnect).toHaveBeenCalledTimes(1);
    }
    window.dispatchEvent(new Event('scroll'));
    tracker.update({});
    expect(hasScheduledAnimationFrame()).toBe(false);
});

it.each([false, true])(
    'preserves terminal once state and the first error after pending leave (inverted=%s)',
    (inverted) => {
        const element = createElementWithRect();
        const expected = new Error('pending leave failed');
        const destroyed = vi.fn();
        const onUpdate = vi.fn();
        tracker = trackScrollProgress(element, {
            once: true,
            inverted,
            onUpdate,
            onLeave: () => {
                throw expected;
            }
        });
        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();
        tracker.onDestroy(() => {
            throw new Error('destroy failed');
        });
        tracker.onDestroy(destroyed);
        onUpdate.mockClear();
        tracker.update({ root: createRootElementWithRect() });
        element.getBoundingClientRect = () => new DOMRect(0, -1000, 300, 300);
        getLatestIntersectionObserver().trigger(true);
        expect(runAnimationFrame).toThrow(expected);
        expect(tracker.getState()).toMatchObject({ progress: inverted ? 0 : 1, isTracking: true });
        expect(destroyed).toHaveBeenCalledTimes(1);
        expect(onUpdate).not.toHaveBeenCalled();
        for (const observer of [
            ...getIntersectionObserverInstances(),
            ...getResizeObserverInstances()
        ]) {
            expect(observer.disconnect).toHaveBeenCalledTimes(1);
        }
        tracker.update({});
        expect(hasScheduledAnimationFrame()).toBe(false);
    }
);
