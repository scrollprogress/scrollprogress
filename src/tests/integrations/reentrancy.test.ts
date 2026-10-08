// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import type { ScrollProgressTracker } from '../../lib/types';
import {
    createElementWithRect,
    getLatestIntersectionObserver,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setWindowSize,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

let tracker: ScrollProgressTracker | undefined;
beforeEach(() => {
    setupScrollProgressTestMocks();
    setWindowSize({ height: 1000 });
});
afterEach(() => {
    tracker?.destroy();
    tracker = undefined;
    resetScrollProgressTestMocks();
});

it('does not send onUpdate after onEnter destroys the tracker', () => {
    const onUpdate = vi.fn();
    tracker = trackScrollProgress(createElementWithRect(), {
        onEnter: () => tracker!.destroy(),
        onUpdate
    });
    onUpdate.mockClear();
    getLatestIntersectionObserver().trigger(true);
    runAnimationFrame();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(hasScheduledAnimationFrame()).toBe(false);
});

it('finishes the current callback sequence before using callbacks replaced reentrantly', () => {
    const original = vi.fn();
    const replacement = vi.fn();
    tracker = trackScrollProgress(createElementWithRect(), {
        onEnter: () => tracker!.update({ onUpdate: replacement }),
        onUpdate: original
    });
    original.mockClear();
    getLatestIntersectionObserver().trigger(true);
    runAnimationFrame();
    expect(original).toHaveBeenCalledOnce();
    expect(replacement).not.toHaveBeenCalled();
    expect(hasScheduledAnimationFrame()).toBe(true);
    runAnimationFrame();
    // Explicit unchanged updates notify subscribers, not onUpdate.
    expect(replacement).not.toHaveBeenCalled();
});

it('guarantees a reached once completion even when onEnter updates config and throws', () => {
    const error = { reason: 'application failure' };
    const destroyed = vi.fn();
    tracker = trackScrollProgress(createElementWithRect({ top: 0 }), {
        once: true,
        onEnter: () => {
            tracker!.update({ once: false, inverted: true });
            throw error;
        }
    });
    tracker.onDestroy(destroyed);
    getLatestIntersectionObserver().trigger(true);
    let thrown: unknown;
    try {
        runAnimationFrame();
    } catch (value) {
        thrown = value;
    }
    expect(thrown).toBe(error);
    expect(destroyed).toHaveBeenCalledOnce();
    expect(hasScheduledAnimationFrame()).toBe(false);
});

it('deduplicates functions but immediately notifies on each subscribe; either handle removes the registration', () => {
    tracker = trackScrollProgress(createElementWithRect());
    const subscriber = vi.fn();
    const first = tracker.subscribe(subscriber);
    const second = tracker.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledTimes(2);
    getLatestIntersectionObserver().trigger(true);
    runAnimationFrame();
    expect(subscriber).toHaveBeenCalledTimes(3);
    first();
    second();
    tracker.update({});
    runAnimationFrame();
    expect(subscriber).toHaveBeenCalledTimes(3);
});

it('removes an existing duplicate too when a later immediate subscription notification fails', () => {
    tracker = trackScrollProgress(createElementWithRect());
    const subscriber = vi.fn();
    tracker.subscribe(subscriber);
    subscriber.mockImplementationOnce(() => {
        throw undefined;
    });
    let caught = false;
    try {
        tracker.subscribe(subscriber);
    } catch (error) {
        caught = true;
        expect(error).toBeUndefined();
    }
    expect(caught).toBe(true);
    tracker.update({});
    runAnimationFrame();
    expect(subscriber).toHaveBeenCalledTimes(2);
});

it('uses live Set order for subscribe and unsubscribe during ordinary notification', () => {
    tracker = trackScrollProgress(createElementWithRect());
    const calls: string[] = [];
    const added = () => calls.push('added');
    let stopSecond = () => {};
    tracker.subscribe(() => {
        if (!tracker!.getState()?.isTracking) return;
        calls.push('first');
        stopSecond();
        tracker!.subscribe(added);
    });
    stopSecond = tracker.subscribe(() => calls.push('second'));
    calls.length = 0;
    getLatestIntersectionObserver().trigger(true);
    runAnimationFrame();
    expect(calls).toEqual(['first', 'added', 'added']);
});

it('shares one subscriber snapshot without exposing internal state to subscribers', () => {
    tracker = trackScrollProgress(createElementWithRect());
    let observed = 0;
    tracker.subscribe((state) => {
        (state as { progress: number }).progress = 99;
    });
    tracker.subscribe((state) => {
        observed = state.progress;
    });
    tracker.update({});
    runAnimationFrame();
    expect(observed).toBe(99);
    expect(tracker.getState()?.progress).toBe(0.5);
});

it('does not await promises or intercept their rejection', async () => {
    const error = new Error('async application failure');
    const rejected = Promise.reject(error);
    // The application owns rejection handling; attach it before notification.
    const handled = rejected.catch((value) => value);
    const subscriber = vi.fn();
    tracker = trackScrollProgress(createElementWithRect(), { onUpdate: () => rejected });
    tracker.subscribe(subscriber);
    expect(subscriber).toHaveBeenCalledOnce();
    expect(await handled).toBe(error);
});

it('deduplicates destroy callbacks and calls nested onDestroy immediately', () => {
    tracker = trackScrollProgress(createElementWithRect());
    const order: string[] = [];
    const callback = () => {
        order.push('outer');
        tracker!.onDestroy(() => order.push('nested'));
        tracker!.destroy();
    };
    tracker.onDestroy(callback);
    tracker.onDestroy(callback);
    tracker.destroy();
    tracker.destroy();
    expect(order).toEqual(['outer', 'nested']);
    tracker.update({ axis: 'x' });
    tracker.subscribe(() => {
        throw new Error('must not be called');
    });
    getLatestIntersectionObserver().trigger(true);
    expect(hasScheduledAnimationFrame()).toBe(false);
});

it('attempts all callbacks registered when destruction starts even if one unsubscribes another', () => {
    tracker = trackScrollProgress(createElementWithRect());
    let stopSecond = () => {};
    const second = vi.fn();
    tracker.onDestroy(() => stopSecond());
    stopSecond = tracker.onDestroy(second);
    tracker.destroy();
    expect(second).toHaveBeenCalledOnce();
});
