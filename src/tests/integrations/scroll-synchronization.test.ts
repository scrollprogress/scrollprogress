// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import type { ScrollProgressTracker } from '../../lib/types';
import {
    createElementWithRect,
    createRootElementWithRect,
    getLatestIntersectionObserver,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setWindowSize,
    setWindowValue,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';
let tracker: ScrollProgressTracker | undefined;
beforeEach(() => {
    setupScrollProgressTestMocks();
    setWindowSize({ height: 1000, width: 1000 });
});
afterEach(() => {
    tracker?.destroy();
    tracker = undefined;
    resetScrollProgressTestMocks();
});
it.each(['x', 'y'] as const)(
    'synchronizes jumps past targets without synthesizing lifecycle (%s)',
    (axis) => {
        const element = createElementWithRect({ top: 1200, left: 1200 });
        const enter = vi.fn();
        tracker = trackScrollProgress(element, { axis, once: true, onEnter: enter });
        expect(tracker.getState()!.progress).toBe(0);
        element.getBoundingClientRect = () => new DOMRect(-400, -400, 300, 300);
        window.dispatchEvent(new Event('scroll'));
        runAnimationFrame();
        expect(tracker.getState()).toMatchObject({ progress: 1, isTracking: false });
        expect(enter).not.toHaveBeenCalled();
        expect(getLatestIntersectionObserver().disconnect).not.toHaveBeenCalled();
    }
);
it('only completes once outside observation after entering tracking', () => {
    const element = createElementWithRect({ top: 1200 });
    tracker = trackScrollProgress(element, { once: true, start: 1.5, end: -0.3 });
    getLatestIntersectionObserver().trigger(true);
    runAnimationFrame();
    getLatestIntersectionObserver().trigger(false);
    runAnimationFrame();
    element.getBoundingClientRect = () => new DOMRect(0, -1000, 300, 300);
    window.dispatchEvent(new Event('scroll'));
    runAnimationFrame();
    expect(tracker.getState()).toMatchObject({ progress: 1, isTracking: false });
    expect(getLatestIntersectionObserver().disconnect).toHaveBeenCalledTimes(1);
});
it.each([false, true])(
    'captures intermediate ancestors for viewport and custom roots (%s)',
    (custom) => {
        const root = createRootElementWithRect();
        const intermediate = document.createElement('main');
        const element = createElementWithRect({ top: 1200 });
        intermediate.append(element);
        root.append(intermediate);
        const reads = vi.spyOn(element, 'getBoundingClientRect');
        tracker = trackScrollProgress(element, { root: custom ? root : null });
        reads.mockClear();
        const unrelated = document.createElement('div');
        document.body.append(unrelated);
        unrelated.dispatchEvent(new Event('scroll'));
        expect(hasScheduledAnimationFrame()).toBe(false);
        intermediate.dispatchEvent(new Event('scroll'));
        intermediate.dispatchEvent(new Event('scroll'));
        expect(reads).not.toHaveBeenCalled();
        runAnimationFrame();
        expect(reads).toHaveBeenCalledTimes(1);
        reads.mockClear();
        tracker.destroy();
        intermediate.dispatchEvent(new Event('scroll'));
        expect(hasScheduledAnimationFrame()).toBe(false);
        expect(reads).not.toHaveBeenCalled();
        root.remove();
        unrelated.remove();
    }
);
it('notifies at the first clamped movement and reversals without notifying every scroll', () => {
    const onUpdate = vi.fn();
    tracker = trackScrollProgress(createElementWithRect({ top: 2000 }), { onUpdate });
    onUpdate.mockClear();
    for (const position of [10, 20, 30, 20, 10, 20, 30]) {
        setWindowValue('scrollY', position);
        window.dispatchEvent(new Event('scroll'));
        runAnimationFrame();
    }
    expect(onUpdate.mock.calls.map(([state]) => state.scrollDirection)).toEqual([
        'forward',
        'backward',
        'forward'
    ]);
});
it('owns passive direct and capture listeners through alias changes and teardown', () => {
    const add = vi.spyOn(document, 'addEventListener'),
        remove = vi.spyOn(document, 'removeEventListener');
    const winAdd = vi.spyOn(window, 'addEventListener');
    tracker = trackScrollProgress(createElementWithRect());
    const capture = add.mock.calls.find(([name]) => name === 'scroll')!;
    expect(capture[2]).toEqual({ capture: true, passive: true });
    expect(winAdd).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    tracker.update({ root: document.documentElement });
    runAnimationFrame();
    expect(add.mock.calls.filter(([name]) => name === 'scroll')).toHaveLength(1);
    tracker.destroy();
    expect(remove).toHaveBeenCalledWith('scroll', capture[1], true);
});
