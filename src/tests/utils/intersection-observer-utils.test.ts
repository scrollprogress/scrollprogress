// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createIntersectionObserverOptions,
    createRootVisibilityObserver,
    createScrollProgressIntersectionObserver,
    resolveInitialRootVisibility
} from '../../lib/utils/intersection-observer-utils';

class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null;
    readonly rootMargin: string;
    readonly scrollMargin: string;
    readonly thresholds: ReadonlyArray<number>;
    readonly callback: IntersectionObserverCallback;
    readonly options: IntersectionObserverInit;

    readonly observe = vi.fn();
    readonly unobserve = vi.fn();
    readonly disconnect = vi.fn();
    readonly takeRecords = vi.fn((): IntersectionObserverEntry[] => []);

    constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
        this.callback = callback;
        this.options = options;

        this.root = options.root ?? null;
        this.rootMargin = options.rootMargin ?? '0px';
        this.scrollMargin = '0px';

        this.thresholds = Array.isArray(options.threshold)
            ? options.threshold
            : [options.threshold ?? 0];
    }
}

const originalIntersectionObserver = window.IntersectionObserver;

beforeEach(() => {
    window.IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
    window.IntersectionObserver = originalIntersectionObserver;
    vi.restoreAllMocks();
});

describe('intersection observer utils', () => {
    it('creates native IntersectionObserver options from scroll progress config', () => {
        const root = document.createElement('div');

        expect(
            createIntersectionObserverOptions({
                root,
                rootMargin: '10px 20px',
                observerThreshold: [0, 0.5, 1]
            })
        ).toEqual({
            root,
            rootMargin: '10px 20px',
            threshold: [0, 0.5, 1]
        });
    });

    it('creates a scroll progress intersection observer and observes the target', () => {
        const element = document.createElement('div');
        const root = document.createElement('section');
        const callback = vi.fn();

        const observer = createScrollProgressIntersectionObserver(
            element,
            {
                root,
                rootMargin: '12px',
                observerThreshold: 0.25
            },
            callback
        );

        expect(observer).toBeInstanceOf(MockIntersectionObserver);
        expect(observer.observe).toHaveBeenCalledWith(element);

        expect(observer.root).toBe(root);
        expect(observer.rootMargin).toBe('12px');
        expect(observer.thresholds).toEqual([0.25]);
    });

    it('creates a root visibility observer and observes the root element', () => {
        const root = document.createElement('section');
        const callback = vi.fn();

        const observer = createRootVisibilityObserver(root, callback);

        expect(observer).toBeInstanceOf(MockIntersectionObserver);
        expect(observer.observe).toHaveBeenCalledWith(root);

        expect(observer.root).toBeNull();
        expect(observer.rootMargin).toBe('0px');
        expect(observer.thresholds).toEqual([0]);
    });

    it('returns true when the root is not an element', () => {
        expect(resolveInitialRootVisibility(null)).toBe(true);
    });

    it('returns true when an element has a visible rect inside the viewport', () => {
        const root = document.createElement('section');

        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
            width: 100,
            height: 100,
            top: 10,
            right: 110,
            bottom: 110,
            left: 10,
            x: 10,
            y: 10,
            toJSON: () => ({})
        });

        expect(resolveInitialRootVisibility(root)).toBe(true);
    });

    it('returns false when an element has no size', () => {
        const root = document.createElement('section');

        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
            width: 0,
            height: 100,
            top: 10,
            right: 110,
            bottom: 110,
            left: 10,
            x: 10,
            y: 10,
            toJSON: () => ({})
        });

        expect(resolveInitialRootVisibility(root)).toBe(false);
    });

    it('returns false when an element is outside the viewport', () => {
        const root = document.createElement('section');

        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
            width: 100,
            height: 100,
            top: 900,
            right: 110,
            bottom: 1000,
            left: 10,
            x: 10,
            y: 900,
            toJSON: () => ({})
        });

        expect(resolveInitialRootVisibility(root)).toBe(false);
    });
});
