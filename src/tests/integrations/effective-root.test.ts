// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import { readScrollProgress } from '../../lib/read-scroll-progress';
import { resolveEffectiveRoot } from '../../lib/utils/effective-root-utils';
import { getItemRootRect } from '../../lib/debug/overlay/utils/geometry-utils';
import {
    createElementWithRect,
    getIntersectionObserverInstances,
    getResizeObserverInstances,
    getLatestIntersectionObserver,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setWindowSize,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';
import type { ScrollProgressTracker } from '../../lib/types';
let tracker: ScrollProgressTracker | undefined;
beforeEach(() => {
    setupScrollProgressTestMocks({ resizeObserver: true });
    setWindowSize({ width: 1000, height: 1000 });
});
afterEach(() => {
    tracker?.destroy();
    tracker = undefined;
    resetScrollProgressTestMocks();
});
it.each(['x', 'y'] as const)(
    'normalizes viewport aliases for %s geometry, observers and resource identity',
    (axis) => {
        const target = createElementWithRect({ top: 450, left: 450, width: 300, height: 300 });
        const enter = vi.fn(),
            leave = vi.fn();
        tracker = trackScrollProgress(target, {
            axis,
            requireRootVisible: true,
            onEnter: enter,
            onLeave: leave
        });
        const observer = getLatestIntersectionObserver();
        observer.trigger(true);
        runAnimationFrame();
        const state = tracker.getState();
        for (const root of [document, document.documentElement, null]) {
            expect(readScrollProgress(target, { start: 0.8, end: 0.4, root, axis })).toBe(0.5);
            tracker.update({ root });
            expect(tracker.getState()).toEqual(state);
            runAnimationFrame();
            expect(tracker.getConfig().root).toBe(root);
            expect(tracker.getState()).toEqual(state);
            expect(getItemRootRect({ root })).toMatchObject({
                top: 0,
                left: 0,
                width: 1000,
                height: 1000
            });
        }
        expect(observer.options?.root).toBeNull();
        expect(getIntersectionObserverInstances()).toHaveLength(1);
        expect(getResizeObserverInstances()).toHaveLength(1);
        expect(getResizeObserverInstances()[0].observedElements).toEqual([target]);
        expect(enter).toHaveBeenCalledTimes(1);
        expect(leave).not.toHaveBeenCalled();
    }
);
it('keeps body as an element unless it is the document scrolling element', () => {
    vi.spyOn(document, 'scrollingElement', 'get').mockReturnValue(document.documentElement);
    expect(resolveEffectiveRoot(document.body)).toBe(document.body);
    vi.spyOn(document, 'scrollingElement', 'get').mockReturnValue(document.body);
    expect(resolveEffectiveRoot(document.body)).toBeNull();
    const target = createElementWithRect();
    tracker = trackScrollProgress(target, { root: document.body, requireRootVisible: true });
    expect(tracker.getConfig().root).toBe(document.body);
    expect(getLatestIntersectionObserver().options?.root).toBeNull();
    expect(tracker.getState()!.isRootVisible).toBe(true);
});
