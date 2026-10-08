// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    addScrollEventListeners,
    areScrollEventTargetsEqual,
    readScrollPosition,
    removeScrollEventListeners,
    resolveScrollEventTargets
} from '../../lib/utils/scroll-source-utils';

function setWindowScrollPosition(name: 'scrollX' | 'scrollY', value: number): void {
    Object.defineProperty(window, name, {
        value,
        configurable: true
    });
}

function setElementScrollPosition(
    element: Element,
    name: 'scrollLeft' | 'scrollTop',
    value: number
): void {
    Object.defineProperty(element, name, {
        value,
        configurable: true
    });
}

afterEach(() => {
    vi.restoreAllMocks();

    setWindowScrollPosition('scrollX', 0);
    setWindowScrollPosition('scrollY', 0);
    setElementScrollPosition(document.documentElement, 'scrollLeft', 0);
    setElementScrollPosition(document.documentElement, 'scrollTop', 0);

    if (document.body) {
        setElementScrollPosition(document.body, 'scrollLeft', 0);
        setElementScrollPosition(document.body, 'scrollTop', 0);
    }
});

describe('scroll source utils', () => {
    it('returns only the custom root when root is an element', () => {
        const root = document.createElement('div');

        expect(resolveScrollEventTargets(root)).toEqual([root]);
    });

    it('returns document scroll targets without duplicates when root is null', () => {
        const targets = resolveScrollEventTargets(null);

        expect(targets).toContain(window);
        expect(targets).toContain(document);
        expect(targets).toContain(document.documentElement);

        if (document.body) {
            expect(targets).toContain(document.body);
        }

        expect(new Set(targets).size).toBe(targets.length);
    });

    it('compares scroll event target lists by order and identity', () => {
        const first = [window, document];
        const second = [window, document];
        const differentOrder = [document, window];

        expect(areScrollEventTargetsEqual(first, second)).toBe(true);
        expect(areScrollEventTargetsEqual(first, differentOrder)).toBe(false);
        expect(areScrollEventTargetsEqual(first, [window])).toBe(false);
    });

    it('adds and removes scroll listeners from every target', () => {
        const firstTarget = document.createElement('div');
        const secondTarget = document.createElement('div');
        const listener = vi.fn();

        const firstAddListener = vi.spyOn(firstTarget, 'addEventListener');
        const secondAddListener = vi.spyOn(secondTarget, 'addEventListener');
        const firstRemoveListener = vi.spyOn(firstTarget, 'removeEventListener');
        const secondRemoveListener = vi.spyOn(secondTarget, 'removeEventListener');

        addScrollEventListeners([firstTarget, secondTarget], listener);

        expect(firstAddListener).toHaveBeenCalledWith('scroll', listener);
        expect(secondAddListener).toHaveBeenCalledWith('scroll', listener);

        removeScrollEventListeners([firstTarget, secondTarget], listener);

        expect(firstRemoveListener).toHaveBeenCalledWith('scroll', listener);
        expect(secondRemoveListener).toHaveBeenCalledWith('scroll', listener);
    });

    it('reads horizontal scroll position from a custom root', () => {
        const root = document.createElement('div');

        setElementScrollPosition(root, 'scrollLeft', 42);

        expect(readScrollPosition(root, 'x')).toBe(42);
    });

    it('reads vertical scroll position from a custom root', () => {
        const root = document.createElement('div');

        setElementScrollPosition(root, 'scrollTop', 24);

        expect(readScrollPosition(root, 'y')).toBe(24);
    });

    it('reads horizontal document scroll from body when window scrollX is zero', () => {
        setWindowScrollPosition('scrollX', 0);
        setElementScrollPosition(document.documentElement, 'scrollLeft', 0);
        setElementScrollPosition(document.body, 'scrollLeft', 2787);

        expect(readScrollPosition(null, 'x')).toBe(2787);
    });

    it('reads vertical document scroll from body when window scrollY is zero', () => {
        setWindowScrollPosition('scrollY', 0);
        setElementScrollPosition(document.documentElement, 'scrollTop', 0);
        setElementScrollPosition(document.body, 'scrollTop', 512);

        expect(readScrollPosition(null, 'y')).toBe(512);
    });

    it('prefers window scroll position when it is available', () => {
        setWindowScrollPosition('scrollX', 120);
        setElementScrollPosition(document.documentElement, 'scrollLeft', 240);
        setElementScrollPosition(document.body, 'scrollLeft', 360);

        expect(readScrollPosition(null, 'x')).toBe(120);
    });
});
