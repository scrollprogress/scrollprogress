// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';

import {
    createElementWithRect,
    resetScrollProgressTestMocks,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

beforeEach(() => {
    setupScrollProgressTestMocks();
});

afterEach(() => {
    resetScrollProgressTestMocks();
});

describe('trackScrollProgress onDestroy', () => {
    it('calls destroy callbacks when the tracker is destroyed', () => {
        const element = createElementWithRect({
            top: 100,
            height: 300
        });

        const tracker = trackScrollProgress(element);
        const callback = vi.fn();

        tracker.onDestroy(callback);

        tracker.destroy();

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('calls every destroy callback and rethrows the first error', () => {
        const element = createElementWithRect({
            top: 100,
            height: 300
        });
        const tracker = trackScrollProgress(element);
        const firstError = new Error('first destroy callback failed');
        const firstCallback = vi.fn(() => {
            throw firstError;
        });
        const secondCallback = vi.fn(() => {
            throw new Error('second destroy callback failed');
        });
        const finalCallback = vi.fn();

        tracker.onDestroy(firstCallback);
        tracker.onDestroy(secondCallback);
        tracker.onDestroy(finalCallback);

        expect(() => tracker.destroy()).toThrow(firstError);

        expect(firstCallback).toHaveBeenCalledTimes(1);
        expect(secondCallback).toHaveBeenCalledTimes(1);
        expect(finalCallback).toHaveBeenCalledTimes(1);
        expect(() => tracker.destroy()).not.toThrow();
    });

    it('does not call unsubscribed destroy callbacks', () => {
        const element = createElementWithRect({
            top: 100,
            height: 300
        });

        const tracker = trackScrollProgress(element);
        const callback = vi.fn();

        const unsubscribe = tracker.onDestroy(callback);

        unsubscribe();
        tracker.destroy();

        expect(callback).not.toHaveBeenCalled();
    });

    it('calls destroy callbacks only once', () => {
        const element = createElementWithRect({
            top: 100,
            height: 300
        });

        const tracker = trackScrollProgress(element);
        const callback = vi.fn();

        tracker.onDestroy(callback);

        tracker.destroy();
        tracker.destroy();

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('calls the callback immediately when the tracker is already destroyed', () => {
        const element = createElementWithRect({
            top: 100,
            height: 300
        });

        const tracker = trackScrollProgress(element);
        const callback = vi.fn();

        tracker.destroy();

        tracker.onDestroy(callback);

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
