import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';

import { createDebugConsoleLogger } from '../../lib/debug/console';

import {
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry,
    updateScrollProgressDebugItem
} from '../../lib/debug/registry';

describe('createDebugConsoleLogger', () => {
    let table: MockInstance<typeof console.table>;

    beforeEach(() => {
        table = vi.spyOn(console, 'table').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        resetScrollProgressDebugRegistry();
    });

    it('logs the selected item', () => {
        const logger = createDebugConsoleLogger();

        registerDebugItem({
            progress: 0.25,
            axis: 'y'
        });

        expectLastTableCallToMatch({
            progress: '0.250',
            axis: 'y',
            completed: false,
            selected: true
        });

        logger.destroy();
    });

    it('logs updates for the selected item', () => {
        const logger = createDebugConsoleLogger();

        const id = registerDebugItem({
            progress: 0.25,
            axis: 'y'
        });

        updateScrollProgressDebugItem(id, {
            state: createDebugState({
                progress: 0.75
            }),
            axis: 'x'
        });

        expectLastTableCallToMatch({
            progress: '0.750',
            axis: 'x',
            selected: true
        });

        logger.destroy();
    });

    it('stops logging after destroy', () => {
        const logger = createDebugConsoleLogger();

        logger.destroy();

        registerDebugItem();

        expect(table).not.toHaveBeenCalled();
    });

    it('logs completed snapshots', () => {
        const logger = createDebugConsoleLogger();

        const id = registerDebugItem();

        updateScrollProgressDebugItem(id, {
            completed: true
        });

        expectLastTableCallToMatch({
            completed: true
        });

        logger.destroy();
    });

    it('can be destroyed multiple times', () => {
        const logger = createDebugConsoleLogger();

        logger.destroy();
        logger.destroy();

        expect(table).not.toHaveBeenCalled();
    });

    it('logs the first item immediately and the latest throttled snapshot at the trailing edge', () => {
        vi.useFakeTimers();
        const logger = createDebugConsoleLogger({ throttleMs: 100 });

        const id = registerDebugItem({ progress: 0.25 });

        expect(table).toHaveBeenCalledTimes(1);

        updateScrollProgressDebugItem(id, {
            state: createDebugState({ progress: 0.5 })
        });
        updateScrollProgressDebugItem(id, {
            state: createDebugState({ progress: 0.75 })
        });

        expect(table).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(99);
        expect(table).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(1);
        expect(table).toHaveBeenCalledTimes(2);
        expectLastTableCallToMatch({ progress: '0.750' });

        logger.destroy();
    });

    it('starts a new throttle window after a trailing log', () => {
        vi.useFakeTimers();
        const logger = createDebugConsoleLogger({ throttleMs: 100 });

        const id = registerDebugItem({ progress: 0.25 });
        updateScrollProgressDebugItem(id, {
            state: createDebugState({ progress: 0.5 })
        });
        vi.advanceTimersByTime(100);

        updateScrollProgressDebugItem(id, {
            state: createDebugState({ progress: 0.75 })
        });
        expect(table).toHaveBeenCalledTimes(2);

        vi.advanceTimersByTime(100);
        expect(table).toHaveBeenCalledTimes(3);
        expectLastTableCallToMatch({ progress: '0.750' });

        logger.destroy();
    });

    it('cancels a pending trailing log when destroyed', () => {
        vi.useFakeTimers();
        const logger = createDebugConsoleLogger({ throttleMs: 100 });

        const id = registerDebugItem();
        updateScrollProgressDebugItem(id, {
            state: createDebugState({ progress: 0.75 })
        });

        logger.destroy();
        vi.advanceTimersByTime(100);

        expect(table).toHaveBeenCalledTimes(1);
    });

    it('keeps unthrottled logging when throttleMs is zero', () => {
        const logger = createDebugConsoleLogger({ throttleMs: 0 });

        const id = registerDebugItem();
        updateScrollProgressDebugItem(id, {
            state: createDebugState({ progress: 0.75 })
        });

        expect(table).toHaveBeenCalledTimes(2);
        expectLastTableCallToMatch({ progress: '0.750' });

        logger.destroy();
    });

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        'rejects invalid throttleMs values: %s',
        (throttleMs) => {
            expect(() => createDebugConsoleLogger({ throttleMs })).toThrow(
                'scrollprogress debug console throttleMs must be finite and non-negative'
            );
        }
    );

    function expectLastTableCallToMatch(expected: Record<string, unknown>): void {
        expect(table.mock.calls.at(-1)?.[0]).toEqual([
            expect.objectContaining({
                id: 'console-demo',
                label: 'Console demo',
                progressDirection: 'forward',
                scrollDirection: 'forward',
                tracking: true,
                isInObservationArea: true,
                rootVisible: true,
                intersectionRatio: '1.000',
                start: 0.8,
                end: 0.4,
                ...expected
            })
        ]);
    }
});

function registerDebugItem(
    options: {
        progress?: number;
        axis?: 'x' | 'y';
    } = {}
): string {
    return registerScrollProgressDebugItem({
        debugId: 'console-demo',
        label: 'Console demo',
        element: createDebugElement(),
        state: createDebugState({
            progress: options.progress ?? 0.25
        }),
        start: 0.8,
        end: 0.4,
        axis: options.axis ?? 'y',
        root: null,
        rootMargin: '0px',
        observerThreshold: 0,
        inverted: false,
        once: false,
        cssVar: null,
        requireRootVisible: false
    });
}

function createDebugState(options: { progress?: number } = {}) {
    return {
        progress: options.progress ?? 0.25,
        progressDirection: 'forward' as const,
        scrollDirection: 'forward' as const,
        isInObservationArea: true,
        isRootVisible: true,
        isTracking: true,
        intersectionRatio: 1
    };
}

function createDebugElement(): HTMLElement {
    return {} as HTMLElement;
}
