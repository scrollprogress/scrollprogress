// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateScrollProgress } from '../../lib/core';
import { readScrollProgress } from '../../lib/read-scroll-progress';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import { hasScrollProgressTrackerCompletedOnce } from '../../lib/utils/tracker-completion-utils';
import type {
    ScrollProgressTracker,
    TrackScrollProgressConfig,
    TrackScrollProgressOptions
} from '../../lib/types';
import {
    createElementWithRect,
    createRootElementWithRect,
    getIntersectionObserverInstances,
    getLatestIntersectionObserver,
    getLatestResizeObserver,
    getResizeObserverInstances,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setWindowSize,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

const trackers: ScrollProgressTracker[] = [];
function keep(element: HTMLElement, options: TrackScrollProgressOptions = {}) {
    const tracker = trackScrollProgress(element, options);
    trackers.push(tracker);
    return tracker;
}
function setRect(element: HTMLElement, size: number, position = 450) {
    element.getBoundingClientRect = () => new DOMRect(position, position, size, size);
}

beforeEach(() => {
    setupScrollProgressTestMocks({ resizeObserver: true });
    setWindowSize({ width: 1000, height: 1000 });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
    for (const tracker of trackers) tracker.destroy();
    trackers.length = 0;
    resetScrollProgressTestMocks();
});

describe('measured range warnings', () => {
    it.each(['x', 'y'] as const)(
        'accepts positive travel distance regardless of trigger order (%s)',
        (axis) => {
            for (const [start, end, size, position] of [
                [0.8, 0.4, 300, 450],
                [0.5, 0.5, 300, 350],
                [0, 1, 1200, -100]
            ]) {
                const element = createElementWithRect();
                setRect(element, size, position);
                const tracker = keep(element, { start, end, axis });
                expect(tracker.getState()!.progress).toBe(0.5);
            }
            expect(console.warn).not.toHaveBeenCalled();
        }
    );

    it.each(['x', 'y'] as const)(
        'uses measured %s dimensions for viewport aliases and bordered roots',
        (axis) => {
            const custom = createRootElementWithRect({ top: 100, left: 100 });
            Object.defineProperties(custom, {
                clientTop: { value: 10 },
                clientLeft: { value: 10 }
            });
            for (const root of [null, document, document.documentElement, custom]) {
                const element = createElementWithRect();
                setRect(element, 1000, root === custom ? 100 : -10);
                const tracker = keep(element, { axis, root, start: 0, end: 1 });
                expect(tracker.getState()!.progress).toBe(1);
                expect(console.warn).toHaveBeenLastCalledWith(
                    expect.stringContaining('D <= 0'),
                    element,
                    expect.objectContaining({ axis, root }),
                    0
                );
            }
            expect(console.warn).toHaveBeenCalledTimes(4);
        }
    );

    it.each([
        { size: 1000, position: -1, distance: 0, progress: 1 },
        { size: 1000, position: 0, distance: 0, progress: 0 },
        { size: 300, position: -1, distance: -700, progress: 1 },
        { size: 300, position: 1, distance: -700, progress: 0 }
    ])(
        'preserves the calculator fallback for $distance at $position',
        ({ size, position, distance, progress }) => {
            const element = createElementWithRect();
            setRect(element, size, position);
            const tracker = keep(element, { start: 0, end: 1 });
            expect(tracker.getState()!.progress).toBe(progress);
            expect(
                calculateScrollProgress({
                    elementStart: position,
                    elementSize: size,
                    rootSize: 1000,
                    start: 0,
                    end: 1
                })
            ).toBe(progress);
            expect(console.warn).toHaveBeenLastCalledWith(
                expect.any(String),
                element,
                expect.any(Object),
                distance
            );
        }
    );

    it('preserves the floating-point zero boundary with literal expectations', () => {
        setWindowSize({ height: 100 });
        const element = createElementWithRect({ top: 0, height: 2 });
        const options = { start: 0.01, end: 0.03 };
        expect(keep(element, options).getState()!.progress).toBe(1);
        expect(
            calculateScrollProgress({ elementStart: 0, elementSize: 2, rootSize: 100, ...options })
        ).toBe(1);
        expect(console.warn).toHaveBeenCalledExactlyOnceWith(
            expect.stringContaining('D <= 0'),
            element,
            expect.any(Object),
            0
        );
    });

    it('warns at measurement, only once across updates, roots, axes, inversion and resize', () => {
        const element = createElementWithRect();
        const tracker = keep(element);
        tracker.update({ start: 0, end: 1 });
        expect(console.warn).not.toHaveBeenCalled();
        runAnimationFrame();
        expect(console.warn).toHaveBeenCalledTimes(1);
        for (const options of [
            { start: 0.8, end: 0.4 },
            { start: 0, end: 1 },
            { root: createRootElementWithRect() },
            { axis: 'x' as const },
            { inverted: true }
        ]) {
            tracker.update(options);
            runAnimationFrame();
            getLatestResizeObserver().trigger();
            runAnimationFrame();
            const root = tracker.getConfig().root;
            (root instanceof Element ? root : window).dispatchEvent(new Event('scroll'));
            runAnimationFrame();
        }
        expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('warns independently for separate and recreated trackers', () => {
        const element = createElementWithRect();
        const first = keep(element, { start: 0, end: 1 });
        keep(createElementWithRect(), { start: 0, end: 1 });
        first.destroy();
        keep(element, { start: 0, end: 1 });
        expect(console.warn).toHaveBeenCalledTimes(3);
    });

    it.each(['range', 'axis', 'root', 'resize'] as const)(
        'discovers an invalid distance after a %s change',
        (change) => {
            const element = createElementWithRect({ width: 300, height: 1200 });
            const tracker = keep(element, { start: 0, end: 1 });
            expect(console.warn).not.toHaveBeenCalled();
            if (change === 'range') tracker.update({ end: 2 });
            if (change === 'axis') tracker.update({ axis: 'x' });
            if (change === 'root')
                tracker.update({ root: createRootElementWithRect({ height: 1500 }) });
            if (change === 'resize') {
                setRect(element, 300);
                getLatestResizeObserver().trigger();
            }
            runAnimationFrame();
            expect(console.warn).toHaveBeenCalledTimes(1);
        }
    );

    it.each(['hidden', 'detached'] as const)(
        'waits for a measurable box after %s creation',
        (kind) => {
            const element = createElementWithRect();
            const rects = vi.spyOn(element, 'getClientRects');
            if (kind === 'hidden') rects.mockReturnValue([] as unknown as DOMRectList);
            else element.remove();
            const tracker = keep(element, { start: 0, end: 1 });
            expect(console.warn).not.toHaveBeenCalled();
            rects.mockRestore();
            document.body.append(element);
            tracker.update({});
            runAnimationFrame();
            expect(console.warn).toHaveBeenCalledTimes(1);
        }
    );

    it('measures visibility-hidden zero-size boxes and zero-size roots', () => {
        const root = createRootElementWithRect({ width: 0, height: 0 });
        const element = createElementWithRect({ width: 0, height: 0 });
        element.style.visibility = 'hidden';
        keep(element, { root });
        expect(console.warn).toHaveBeenLastCalledWith(
            expect.any(String),
            element,
            expect.any(Object),
            0
        );
    });

    it('logs independent configuration and threshold snapshots', () => {
        const element = createElementWithRect();
        const tracker = keep(element, { start: 0, end: 1, observerThreshold: [0, 0.5, 1] });
        const logged = vi.mocked(console.warn).mock.calls[0][2] as TrackScrollProgressConfig;
        tracker.update({ start: -1, end: 2 });
        runAnimationFrame();
        expect(logged).toMatchObject({ start: 0, end: 1, observerThreshold: [0, 0.5, 1] });
        logged.start = 99;
        if (!Array.isArray(logged.observerThreshold)) throw new Error('Expected threshold array');
        logged.observerThreshold.push(0.75);
        expect(tracker.getConfig()).toMatchObject({
            start: -1,
            end: 2,
            observerThreshold: [0, 0.5, 1]
        });
    });

    it.each(['console', 'warn', 'non-callable'] as const)(
        'operates without a usable %s and consumes the allowance',
        (missing) => {
            const warn = console.warn;
            const original = console;
            if (missing === 'console') vi.stubGlobal('console', undefined);
            else
                vi.stubGlobal('console', {
                    ...original,
                    warn: missing === 'warn' ? undefined : 42
                });
            const tracker = keep(createElementWithRect(), { start: 0, end: 1 });
            vi.unstubAllGlobals();
            setWindowSize({ width: 1000, height: 1000 });
            tracker.update({});
            runAnimationFrame();
            expect(warn).not.toHaveBeenCalled();
        }
    );

    it('does not consume the allowance for rejected updates', () => {
        const tracker = keep(createElementWithRect());
        expect(() => tracker.update({ start: NaN })).toThrow(RangeError);
        const Observer = IntersectionObserver;
        vi.stubGlobal(
            'IntersectionObserver',
            class {
                constructor() {
                    throw new Error('native validation');
                }
            }
        );
        expect(() => tracker.update({ start: 0, end: 1, rootMargin: 'invalid' })).toThrow(
            'native validation'
        );
        vi.stubGlobal('IntersectionObserver', Observer);
        expect(console.warn).not.toHaveBeenCalled();
        tracker.update({ start: 0, end: 1 });
        runAnimationFrame();
        expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('keeps direct reads silent for non-positive distances', () => {
        const element = createElementWithRect({ top: -1 });
        expect(readScrollProgress(element, { start: 0, end: 1 })).toBe(1);
        expect(console.warn).not.toHaveBeenCalled();
    });

    it.each([false, true])(
        'warns without completing once before entry (inverted=%s)',
        (inverted) => {
            const element = createElementWithRect({ top: -1 });
            const tracker = keep(element, { start: 0, end: 1, once: true, inverted });
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(hasScrollProgressTrackerCompletedOnce(tracker)).toBe(false);
            getLatestIntersectionObserver().trigger(true);
            runAnimationFrame();
            expect(tracker.getState()!.progress).toBe(inverted ? 0 : 1);
            expect(hasScrollProgressTrackerCompletedOnce(tracker)).toBe(true);
            expect(hasScheduledAnimationFrame()).toBe(false);
            expect(console.warn).toHaveBeenCalledTimes(1);
        }
    );

    it('warns on resize even when state and notifications are unchanged', () => {
        const element = createElementWithRect();
        setRect(element, 1200, -1000);
        const onUpdate = vi.fn();
        const tracker = keep(element, { start: 0, end: 1, onUpdate });
        const subscriber = vi.fn();
        tracker.subscribe(subscriber);
        tracker.update({});
        runAnimationFrame();
        const before = tracker.getState();
        onUpdate.mockClear();
        subscriber.mockClear();
        setRect(element, 300, -1000);
        getLatestResizeObserver().trigger();
        runAnimationFrame();
        expect(tracker.getState()).toEqual(before);
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(onUpdate).not.toHaveBeenCalled();
        expect(subscriber).not.toHaveBeenCalled();
    });

    it.each([false, true])(
        'discards a pre-log CSS failure and recovers with fresh data (valid=%s)',
        (valid) => {
            const element = createElementWithRect();
            const tracker = keep(element, { cssVar: '--progress' });
            const error = new Error('CSS failure');
            const write = vi.spyOn(element.style, 'setProperty').mockImplementationOnce(() => {
                throw error;
            });
            tracker.update({ start: 0, end: 1 });
            expect(runAnimationFrame).toThrow(error);
            expect(console.warn).not.toHaveBeenCalled();
            expect(hasScheduledAnimationFrame()).toBe(false);
            write.mockRestore();
            setRect(element, valid ? 1200 : 200);
            tracker.update({});
            runAnimationFrame();
            if (valid) expect(console.warn).not.toHaveBeenCalled();
            else
                expect(console.warn).toHaveBeenCalledExactlyOnceWith(
                    expect.any(String),
                    element,
                    expect.objectContaining({ start: 0, end: 1 }),
                    -800
                );
        }
    );

    it.each([false, true])(
        'retains the logger error and completes frame/once (inverted=%s)',
        (inverted) => {
            const element = createElementWithRect();
            const onUpdate = vi.fn();
            const subscriber = vi.fn();
            const destroyed = vi.fn();
            const tracker = keep(element, { inverted, cssVar: '--progress', onUpdate });
            tracker.subscribe(subscriber);
            tracker.onDestroy(destroyed);
            onUpdate.mockClear();
            subscriber.mockClear();
            const error = new Error('logger failure');
            vi.mocked(console.warn).mockImplementationOnce(() => {
                throw error;
            });
            setRect(element, 300, -1);
            tracker.update({ start: 0, end: 1, once: true });
            getLatestIntersectionObserver().trigger(true);
            expect(runAnimationFrame).toThrow(error);
            expect(tracker.getState()!.progress).toBe(inverted ? 0 : 1);
            expect(element.style.getPropertyValue('--progress')).toBe(inverted ? '0' : '1');
            expect(onUpdate).toHaveBeenCalledTimes(1);
            expect(subscriber).toHaveBeenCalledTimes(1);
            expect(destroyed).toHaveBeenCalledTimes(1);
            expect(hasScrollProgressTrackerCompletedOnce(tracker)).toBe(true);
            expect(hasScheduledAnimationFrame()).toBe(false);
        }
    );

    it('preserves the logger as first error while user callbacks remain fail-fast', () => {
        const element = createElementWithRect();
        const onUpdate = vi.fn();
        const tracker = keep(element, { onUpdate });
        const subscriber = vi.fn();
        tracker.subscribe(subscriber);
        const loggerError = new Error('logger');
        vi.mocked(console.warn).mockImplementationOnce(() => {
            throw loggerError;
        });
        tracker.onDestroy(() => {
            throw new Error('cleanup');
        });
        setRect(element, 300, -1);
        tracker.update({
            start: 0,
            end: 1,
            once: true,
            onEnter: () => {
                throw new Error('callback');
            }
        });
        onUpdate.mockClear();
        subscriber.mockClear();
        getLatestIntersectionObserver().trigger(true);
        expect(runAnimationFrame).toThrow(loggerError);
        expect(onUpdate).not.toHaveBeenCalled();
        expect(subscriber).not.toHaveBeenCalled();
        expect(hasScrollProgressTrackerCompletedOnce(tracker)).toBe(true);
    });

    it('releases all creation resources after an initial logger error', () => {
        const error = new Error('initial logger');
        const removeDocument = vi.spyOn(document, 'removeEventListener');
        const removeWindow = vi.spyOn(window, 'removeEventListener');
        vi.mocked(console.warn).mockImplementationOnce(() => {
            throw error;
        });
        expect(() => keep(createElementWithRect(), { start: 0, end: 1 })).toThrow(error);
        for (const observer of [
            ...getIntersectionObserverInstances(),
            ...getResizeObserverInstances()
        ])
            expect(observer.disconnect).toHaveBeenCalledTimes(1);
        expect(removeDocument).toHaveBeenCalledWith('scroll', expect.any(Function), true);
        expect(removeWindow).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(hasScheduledAnimationFrame()).toBe(false);
    });

    it('does not repeat a throwing warning on later measurements', () => {
        const tracker = keep(createElementWithRect());
        vi.mocked(console.warn).mockImplementationOnce(() => {
            throw undefined;
        });
        tracker.update({ start: 0, end: 1 });
        let caught = false;
        try {
            runAnimationFrame();
        } catch (error) {
            caught = true;
            expect(error).toBeUndefined();
        }
        expect(caught).toBe(true);
        tracker.update({});
        runAnimationFrame();
        expect(console.warn).toHaveBeenCalledTimes(1);
    });
});

describe('range diagnostic reentrancy', () => {
    it('logs committed state/CSS and retains the current callbacks across logger updates', () => {
        const element = createElementWithRect();
        const original = vi.fn();
        const replacement = vi.fn();
        const tracker = keep(element, { cssVar: '--progress', onUpdate: original });
        const subscriber = vi.fn();
        tracker.subscribe(subscriber);
        original.mockClear();
        subscriber.mockClear();
        vi.mocked(console.warn).mockImplementationOnce(() => {
            expect(tracker.getState()!.progress).toBe(0);
            expect(element.style.getPropertyValue('--progress')).toBe('0');
            tracker.update({ inverted: true, onUpdate: replacement });
        });
        tracker.update({ start: 0, end: 1 });
        runAnimationFrame();
        expect(original).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ progress: 0 }));
        expect(replacement).not.toHaveBeenCalled();
        expect(subscriber).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ progress: 0 })
        );
        expect(hasScheduledAnimationFrame()).toBe(true);
        runAnimationFrame();
        expect(replacement).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({ progress: 1 })
        );
        expect(subscriber).toHaveBeenCalledTimes(2);
        expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('retains the reached once decision across a logger configuration change', () => {
        const element = createElementWithRect();
        const tracker = keep(element);
        const destroyed = vi.fn();
        tracker.onDestroy(destroyed);
        vi.mocked(console.warn).mockImplementationOnce(() =>
            tracker.update({ once: false, inverted: true })
        );
        setRect(element, 300, -1);
        tracker.update({ start: 0, end: 1, once: true });
        getLatestIntersectionObserver().trigger(true);
        runAnimationFrame();
        expect(tracker.getState()!.progress).toBe(1);
        expect(hasScrollProgressTrackerCompletedOnce(tracker)).toBe(true);
        expect(destroyed).toHaveBeenCalledTimes(1);
        expect(hasScheduledAnimationFrame()).toBe(false);
    });

    it.each([false, true])(
        'stops after logger destruction without once marking (throws=%s)',
        (throws) => {
            const element = createElementWithRect();
            const onUpdate = vi.fn();
            const tracker = keep(element, { onUpdate });
            const subscriber = vi.fn();
            tracker.subscribe(subscriber);
            const error = new Error('destroying logger');
            vi.mocked(console.warn).mockImplementationOnce(() => {
                tracker.destroy();
                if (throws) throw error;
            });
            setRect(element, 300, -1);
            tracker.update({ start: 0, end: 1, once: true });
            getLatestIntersectionObserver().trigger(true);
            onUpdate.mockClear();
            subscriber.mockClear();
            if (throws) expect(runAnimationFrame).toThrow(error);
            else runAnimationFrame();
            expect(onUpdate).not.toHaveBeenCalled();
            expect(subscriber).not.toHaveBeenCalled();
            expect(hasScrollProgressTrackerCompletedOnce(tracker)).toBe(false);
            expect(hasScheduledAnimationFrame()).toBe(false);
        }
    );

    it.each([false, true])(
        'balances pending root leave across logger-driven A-B-C changes (B active=%s)',
        (active) => {
            const events: string[] = [];
            const rootA = createRootElementWithRect();
            const rootB = createRootElementWithRect({ height: 2000 });
            const rootC = createRootElementWithRect();
            const element = createElementWithRect({ height: 1200 });
            const tracker = keep(element, {
                root: rootA,
                start: 0,
                end: 1,
                onEnter: () => events.push('enter'),
                onLeave: () => events.push('leave')
            });
            getLatestIntersectionObserver().trigger(true);
            runAnimationFrame();
            events.length = 0;
            vi.mocked(console.warn).mockImplementationOnce(() => tracker.update({ root: rootC }));
            tracker.update({ root: rootB });
            if (active) getLatestIntersectionObserver().trigger(true);
            runAnimationFrame();
            expect(events).toEqual(active ? ['leave', 'enter'] : ['leave']);
            expect(tracker.getConfig().root).toBe(rootC);
            runAnimationFrame();
            expect(events).toEqual(active ? ['leave', 'enter', 'leave'] : ['leave']);
            getLatestIntersectionObserver().trigger(true);
            runAnimationFrame();
            expect(events.at(-1)).toBe('enter');
            getLatestIntersectionObserver().trigger(false);
            runAnimationFrame();
            expect(events.at(-1)).toBe('leave');
            expect(console.warn).toHaveBeenCalledTimes(1);
        }
    );

    it.each(['logger', 'leave', 'update'] as const)(
        'preserves a logger error when %s destroys during pending leave',
        (destroyAt) => {
            const element = createElementWithRect({ height: 1200 });
            const onUpdate = vi.fn();
            const onLeave = vi.fn();
            const tracker = keep(element, {
                root: createRootElementWithRect(),
                start: 0,
                end: 1,
                onLeave,
                onUpdate
            });
            getLatestIntersectionObserver().trigger(true);
            runAnimationFrame();
            const subscriber = vi.fn();
            tracker.subscribe(subscriber);
            const error = new Error('logger error');
            vi.mocked(console.warn).mockImplementationOnce(() => {
                if (destroyAt === 'logger') tracker.destroy();
                throw error;
            });
            onLeave.mockImplementation(() => {
                if (destroyAt === 'leave') tracker.destroy();
            });
            onUpdate.mockImplementation(() => {
                if (destroyAt === 'update') {
                    tracker.destroy();
                    throw new Error('callback error');
                }
            });
            tracker.update({ root: createRootElementWithRect({ height: 2000 }) });
            getLatestIntersectionObserver().trigger(true);
            onUpdate.mockClear();
            onLeave.mockClear();
            subscriber.mockClear();
            expect(runAnimationFrame).toThrow(error);
            expect(onLeave).toHaveBeenCalledTimes(destroyAt === 'logger' ? 0 : 1);
            expect(onUpdate).toHaveBeenCalledTimes(destroyAt === 'update' ? 1 : 0);
            expect(subscriber).not.toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(hasScheduledAnimationFrame()).toBe(false);
        }
    );
});
