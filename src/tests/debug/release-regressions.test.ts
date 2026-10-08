// @vitest-environment happy-dom

import { afterEach, expect, it, vi } from 'vitest';
import { trackScrollProgress } from '../../lib/track-scroll-progress';
import { debugScrollProgress } from '../../lib/debug/debug-scroll-progress';
import {
    getScrollProgressDebugRegistryState,
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry,
    subscribeScrollProgressDebugRegistry
} from '../../lib/debug/registry';
import {
    createElementWithRect,
    resetScrollProgressTestMocks,
    setupScrollProgressTestMocks
} from '../helpers/scroll-progress-test-utils';

afterEach(() => {
    resetScrollProgressDebugRegistry();
    resetScrollProgressTestMocks();
});

it('can attach and tear down debug on a tracker already destroyed', () => {
    setupScrollProgressTestMocks();
    const tracker = trackScrollProgress(createElementWithRect());
    tracker.destroy();
    const debug = debugScrollProgress(tracker);
    expect(getScrollProgressDebugRegistryState().items).toEqual([]);
    expect(() => debug.destroy()).not.toThrow();
});

it('does not retain a registry subscriber whose immediate notification fails', () => {
    const error = new Error('subscriber failed');
    const subscriber = vi.fn(() => {
        throw error;
    });
    expect(() => subscribeScrollProgressDebugRegistry(subscriber)).toThrow(error);
    expect(() =>
        registerScrollProgressDebugItem({ element: createElementWithRect() })
    ).not.toThrow();
    expect(subscriber).toHaveBeenCalledOnce();
});
