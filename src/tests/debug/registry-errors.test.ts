// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import { debugScrollProgress } from '../../lib/debug/debug-scroll-progress';
import {
    getScrollProgressDebugRegistryState,
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry,
    selectScrollProgressDebugItem,
    subscribeScrollProgressDebugRegistry,
    unregisterScrollProgressDebugItem,
    updateScrollProgressDebugItem
} from '../../lib/debug/registry';
import {
    createElementWithRect,
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

let pendingReports: VoidFunction[];

beforeEach(() => {
    pendingReports = [];
    // Capture the host error boundary without creating uncaught Vitest errors.
    // The installed-package browser smoke also checks real window error events.
    vi.stubGlobal('queueMicrotask', (callback: VoidFunction) => {
        pendingReports.push(callback);
    });
});

afterEach(() => {
    resetScrollProgressDebugRegistry();
    resetScrollProgressTestMocks();
});

function takeReportedErrors(): unknown[] {
    return pendingReports.splice(0).map((report) => {
        try {
            report();
        } catch (error) {
            return error;
        }
        throw new Error('Expected the browser to receive a thrown value');
    });
}

it('returns the registration id and keeps earlier and later subscribers consistent after an error', () => {
    const error = new Error('view failed');
    const earlier = vi.fn();
    const later = vi.fn();
    subscribeScrollProgressDebugRegistry(earlier);
    subscribeScrollProgressDebugRegistry((state) => {
        if (state.items.length) throw error;
    });
    subscribeScrollProgressDebugRegistry(later);
    earlier.mockClear();
    later.mockClear();

    const id = registerScrollProgressDebugItem({ element: createElementWithRect() });
    const state = getScrollProgressDebugRegistryState();

    expect(state).toMatchObject({ selectedId: id, items: [{ id, selected: true }] });
    expect(earlier).toHaveBeenCalledExactlyOnceWith(state);
    expect(later).toHaveBeenCalledExactlyOnceWith(state);
    expect(takeReportedErrors()).toEqual([error]);

    unregisterScrollProgressDebugItem(id);
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
});

it('keeps a failing subscriber active until explicitly unsubscribed', () => {
    const error = new Error('transient view failure');
    const subscriber = vi.fn((state) => {
        if (state.items.length) throw error;
    });
    const unsubscribe = subscribeScrollProgressDebugRegistry(subscriber);

    const id = registerScrollProgressDebugItem({ element: createElementWithRect() });
    updateScrollProgressDebugItem(id, { label: 'Updated' });
    expect(subscriber).toHaveBeenCalledTimes(3);
    const reported = takeReportedErrors();
    expect(reported).toHaveLength(2);
    expect(reported[0]).toBe(error);
    expect(reported[1]).toBe(error);

    unsubscribe();
    updateScrollProgressDebugItem(id, { label: 'After unsubscribe' });
    expect(subscriber).toHaveBeenCalledTimes(3);
    expect(takeReportedErrors()).toEqual([]);
});

it.each([new Error('error'), { reason: 'object' }, undefined, null, 0, 'string'])(
    'reports thrown value %# unchanged outside the registry call',
    (error) => {
        subscribeScrollProgressDebugRegistry((state) => {
            if (state.items.length > 0) throw error;
        });

        expect(() =>
            registerScrollProgressDebugItem({ element: createElementWithRect() })
        ).not.toThrow();
        const reported = takeReportedErrors();
        expect(reported).toHaveLength(1);
        expect(reported[0]).toBe(error);
    }
);

it('delivers all notifications synchronously and reports every error afterward in encounter order', () => {
    const first = new Error('first');
    const second = new Error('second');
    const order: string[] = [];
    for (const [name, error] of [
        ['first', first],
        ['second', second]
    ] as const) {
        subscribeScrollProgressDebugRegistry((state) => {
            if (state.items.length === 0) return;
            order.push(name);
            throw error;
        });
    }
    subscribeScrollProgressDebugRegistry((state) => {
        if (state.items.length > 0) order.push('healthy');
    });

    registerScrollProgressDebugItem({ element: createElementWithRect() });
    order.push('returned');
    expect(order).toEqual(['first', 'second', 'healthy', 'returned']);
    const reported = takeReportedErrors();
    expect(reported).toHaveLength(2);
    expect(reported[0]).toBe(first);
    expect(reported[1]).toBe(second);
});

const mutations: [string, (id: string) => void][] = [
    ['update', (id) => updateScrollProgressDebugItem(id, { label: 'Updated' })],
    ['unregister', unregisterScrollProgressDebugItem],
    ['select', () => selectScrollProgressDebugItem(null)]
];

it.each(mutations)('isolates subscriber errors during %s', (_name, mutate) => {
    const id = registerScrollProgressDebugItem({ element: createElementWithRect() });
    const error = new Error('view failed');
    let armed = false;
    subscribeScrollProgressDebugRegistry(() => {
        if (armed) throw error;
    });
    const later = vi.fn();
    subscribeScrollProgressDebugRegistry(later);
    later.mockClear();
    armed = true;

    expect(() => mutate(id)).not.toThrow();
    expect(later).toHaveBeenCalledExactlyOnceWith(getScrollProgressDebugRegistryState());
    expect(takeReportedErrors()).toEqual([error]);
});

it('preserves explicit reentrant unsubscribe even when that callback then throws', () => {
    const error = new Error('view failed after unsubscribe');
    let armed = false;
    let unsubscribeLater = () => {};
    subscribeScrollProgressDebugRegistry(() => {
        if (!armed) return;
        unsubscribeLater();
        throw error;
    });
    const skipped = vi.fn();
    unsubscribeLater = subscribeScrollProgressDebugRegistry(skipped);
    skipped.mockClear();
    const remaining = vi.fn();
    subscribeScrollProgressDebugRegistry(remaining);
    remaining.mockClear();

    armed = true;
    registerScrollProgressDebugItem({ element: createElementWithRect() });
    expect(skipped).not.toHaveBeenCalled();
    expect(remaining).toHaveBeenCalledOnce();
    expect(takeReportedErrors()).toEqual([error]);
});

it('still throws and removes a failed immediate subscription without scheduling a second error', () => {
    const error = new Error('initialization failed');
    const subscriber = vi.fn(() => {
        throw error;
    });

    expect(() => subscribeScrollProgressDebugRegistry(subscriber)).toThrow(error);
    registerScrollProgressDebugItem({ element: createElementWithRect() });
    expect(subscriber).toHaveBeenCalledOnce();
    expect(takeReportedErrors()).toEqual([]);
});

it('reports a failed reentrant subscription once and does not retain its callback', () => {
    const error = new Error('nested subscription failed');
    const nested = vi.fn(() => {
        throw error;
    });
    let shouldSubscribe = false;
    subscribeScrollProgressDebugRegistry(() => {
        if (!shouldSubscribe) return;
        shouldSubscribe = false;
        subscribeScrollProgressDebugRegistry(nested);
    });
    const later = vi.fn();
    subscribeScrollProgressDebugRegistry(later);
    later.mockClear();

    shouldSubscribe = true;
    const id = registerScrollProgressDebugItem({ element: createElementWithRect() });
    expect(nested).toHaveBeenCalledOnce();
    expect(later).toHaveBeenCalledOnce();
    expect(takeReportedErrors()).toEqual([error]);
    updateScrollProgressDebugItem(id, { label: 'Updated' });
    expect(nested).toHaveBeenCalledOnce();
    expect(takeReportedErrors()).toEqual([]);
});

it('keeps bridge registration, later core subscribers and tracker cleanup working when debug views throw', () => {
    setupScrollProgressTestMocks();
    const error = new Error('debug view failed');
    let armed = false;
    subscribeScrollProgressDebugRegistry(() => {
        if (armed) throw error;
    });
    armed = true;
    const tracker = trackScrollProgress(createElementWithRect());
    const bridge = debugScrollProgress(tracker);
    expect(getScrollProgressDebugRegistryState().items).toHaveLength(1);
    const coreSubscriber = vi.fn();
    tracker.subscribe(coreSubscriber);
    coreSubscriber.mockClear();

    tracker.update({});
    expect(() => runAnimationFrame()).not.toThrow();
    expect(coreSubscriber).toHaveBeenCalledOnce();
    expect(() => tracker.destroy()).not.toThrow();
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    expect(() => bridge.destroy()).not.toThrow();
    expect(takeReportedErrors()).toEqual([error, error, error]);
});
