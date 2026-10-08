// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createScrollProgressResizeObserver } from '../../lib/utils/resize-observer-utils';

const resizeObserverInstances: MockResizeObserver[] = [];

class MockResizeObserver {
    readonly callback: ResizeObserverCallback;

    readonly observe = vi.fn();
    readonly unobserve = vi.fn();
    readonly disconnect = vi.fn();

    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        resizeObserverInstances.push(this);
    }
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resizeObserverInstances.length = 0;
});

describe('resize observer utils', () => {
    it('returns null when ResizeObserver is not available', () => {
        const element = document.createElement('div');

        vi.stubGlobal('ResizeObserver', undefined);

        const observer = createScrollProgressResizeObserver(element, null, vi.fn());

        expect(observer).toBeNull();
    });

    it('creates a ResizeObserver and observes the target element', () => {
        const element = document.createElement('div');
        const callback = vi.fn();

        vi.stubGlobal('ResizeObserver', MockResizeObserver);

        const observer = createScrollProgressResizeObserver(element, null, callback);

        expect(observer).toBeInstanceOf(MockResizeObserver);
        expect(resizeObserverInstances).toHaveLength(1);
        expect(resizeObserverInstances[0].callback).toBe(callback);
        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(element);
    });

    it('observes the root when root is an element', () => {
        const element = document.createElement('div');
        const root = document.createElement('section');

        vi.stubGlobal('ResizeObserver', MockResizeObserver);

        createScrollProgressResizeObserver(element, root, vi.fn());

        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(element);
        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(root);
    });

    it('does not observe the root when root is null', () => {
        const element = document.createElement('div');

        vi.stubGlobal('ResizeObserver', MockResizeObserver);

        createScrollProgressResizeObserver(element, null, vi.fn());

        expect(resizeObserverInstances[0].observe).toHaveBeenCalledTimes(1);
        expect(resizeObserverInstances[0].observe).toHaveBeenCalledWith(element);
    });
});
