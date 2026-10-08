// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAnimationFrameScheduler } from '../../lib/utils/animation-frame-utils';

describe('animation frame utils', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('schedules the callback on the next animation frame', () => {
        const callback = vi.fn();

        const scheduler = createAnimationFrameScheduler(callback);

        scheduler.request();

        expect(callback).not.toHaveBeenCalled();

        vi.advanceTimersToNextFrame();

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('deduplicates multiple requests before the frame runs', () => {
        const callback = vi.fn();

        const scheduler = createAnimationFrameScheduler(callback);

        scheduler.request();
        scheduler.request();
        scheduler.request();

        vi.advanceTimersToNextFrame();

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('can schedule again after the previous frame has run', () => {
        const callback = vi.fn();

        const scheduler = createAnimationFrameScheduler(callback);

        scheduler.request();

        vi.advanceTimersToNextFrame();

        scheduler.request();

        vi.advanceTimersToNextFrame();

        expect(callback).toHaveBeenCalledTimes(2);
    });

    it('cancels a pending animation frame', () => {
        const callback = vi.fn();

        const scheduler = createAnimationFrameScheduler(callback);

        scheduler.request();
        scheduler.cancel();

        vi.advanceTimersToNextFrame();

        expect(callback).not.toHaveBeenCalled();
    });

    it('does nothing when cancel is called without a pending frame', () => {
        const callback = vi.fn();

        const scheduler = createAnimationFrameScheduler(callback);

        expect(() => {
            scheduler.cancel();
        }).not.toThrow();
    });

    it('does not schedule when shouldSkip returns true', () => {
        const callback = vi.fn();

        const scheduler = createAnimationFrameScheduler(callback, () => true);

        scheduler.request();

        vi.advanceTimersToNextFrame();

        expect(callback).not.toHaveBeenCalled();
    });

    it('reads shouldSkip on every request', () => {
        const callback = vi.fn();
        let shouldSkip = true;

        const scheduler = createAnimationFrameScheduler(callback, () => shouldSkip);

        scheduler.request();

        vi.advanceTimersToNextFrame();

        expect(callback).not.toHaveBeenCalled();

        shouldSkip = false;

        scheduler.request();

        vi.advanceTimersToNextFrame();

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
