// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import { readScrollProgress } from '../../lib/read-scroll-progress';
import {
    createElementWithRect,
    getLatestIntersectionObserver,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setWindowSize,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';
import type { ScrollProgressTracker } from '../../lib/types';
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
it.each([false, true])(
    'preserves progress, CSS and once through hidden and detached updates (inverted=%s)',
    (inverted) => {
        const element = createElementWithRect({ top: 450, height: 300 });
        const leave = vi.fn();
        tracker = trackScrollProgress(element, {
            inverted,
            once: true,
            cssVar: '--p',
            onLeave: leave
        });
        const observer = getLatestIntersectionObserver();
        observer.trigger(true);
        runAnimationFrame();
        const initial = tracker.getState()!.progress;
        element.getClientRects = () => [] as unknown as DOMRectList;
        element.getBoundingClientRect = () => new DOMRect();
        observer.trigger(false);
        runAnimationFrame();
        expect(tracker.getState()).toMatchObject({
            progress: initial,
            progressDirection: 'none',
            isTracking: false
        });
        expect(element.style.getPropertyValue('--p')).toBe(String(initial));
        expect(leave).toHaveBeenCalledTimes(1);
        expect(observer.disconnect).not.toHaveBeenCalled();
        expect(readScrollProgress(element, tracker.getConfig())).toBeNull();
        element.remove();
        expect(readScrollProgress(element, tracker.getConfig())).toBeNull();
        document.body.append(element);
        element.getBoundingClientRect = () => new DOMRect(0, 400, 300, 300);
        element.getClientRects = () => [element.getBoundingClientRect()] as unknown as DOMRectList;
        observer.trigger(true);
        runAnimationFrame();
        expect(tracker.getState()!.progressDirection).toBe(inverted ? 'backward' : 'forward');
    }
);
it.each([false, true])('starts without a box at raw zero (inverted=%s)', (inverted) => {
    const element = document.createElement('div');
    tracker = trackScrollProgress(element, { inverted, once: true });
    expect(tracker.getState()).toMatchObject({
        progress: inverted ? 1 : 0,
        progressDirection: 'none'
    });
    getLatestIntersectionObserver().trigger(true);
    runAnimationFrame();
    expect(getLatestIntersectionObserver().disconnect).not.toHaveBeenCalled();
});
it('measures visibility:hidden and zero-height targets that have boxes', () => {
    const element = createElementWithRect({ height: 0 });
    element.style.visibility = 'hidden';
    expect(readScrollProgress(element, { start: 0.8, end: 0.4 })).toBeTypeOf('number');
    element.remove();
    expect(readScrollProgress(element, { start: 0.8, end: 0.4 })).toBeNull();
});
