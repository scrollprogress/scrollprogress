// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
    getScrollProgressDebugControlGroupsState,
    resetScrollProgressDebugControlGroups
} from '../../../lib/debug/controls/registry';

import { createDebugOverlay } from '../../../lib/debug/overlay/overlay';

import {
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry
} from '../../../lib/debug/registry';

import {
    createElementWithRect,
    getLatestResizeObserver,
    hasScheduledAnimationFrame,
    resetScrollProgressTestMocks,
    setupScrollProgressTestMocks
} from '../../helpers/scroll-progress-test-utils';

let overlay: ReturnType<typeof createDebugOverlay> | undefined;

beforeEach(() => {
    setupScrollProgressTestMocks({ resizeObserver: true });
});

afterEach(() => {
    try {
        overlay?.destroy();
    } finally {
        overlay = undefined;
        resetScrollProgressDebugControlGroups();
        resetScrollProgressDebugRegistry();
        resetScrollProgressTestMocks();
        document.body.replaceChildren();
    }
});

it('cleans up a failed construction and allows a new overlay', () => {
    const element = createElementWithRect();
    document.body.append(element);

    registerScrollProgressDebugItem({ element });

    const failure = new Error('Geometry measurement failed');

    const measurement = vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => {
        // Schedule work before the construction fails.
        getLatestResizeObserver().trigger();
        throw failure;
    });

    let receivedError: unknown;

    try {
        overlay = createDebugOverlay();
    } catch (error) {
        receivedError = error;
    }

    expect(receivedError).toBe(failure);

    expect(document.querySelector('.scroll-progress-debug-overlay')).toBeNull();

    expect(getScrollProgressDebugControlGroupsState().groups).toEqual([]);

    expect(getLatestResizeObserver().disconnect).toHaveBeenCalledOnce();

    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(hasScheduledAnimationFrame()).toBe(false);

    // Restore geometry reading and check that construction can succeed.
    measurement.mockRestore();

    overlay = createDebugOverlay();

    expect(document.querySelectorAll('.scroll-progress-debug-overlay')).toHaveLength(1);

    expect(getScrollProgressDebugControlGroupsState().groups).toHaveLength(1);
});

it('preserves the construction error when cleanup also fails', () => {
    const element = createElementWithRect();
    document.body.append(element);

    registerScrollProgressDebugItem({ element });

    const constructionError = new Error('Geometry measurement failed');
    const cleanupError = new Error('Observer cleanup failed');

    vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => {
        getLatestResizeObserver().disconnect.mockImplementationOnce(() => {
            throw cleanupError;
        });

        throw constructionError;
    });

    let receivedError: unknown;

    try {
        overlay = createDebugOverlay();
    } catch (error) {
        receivedError = error;
    }

    expect(receivedError).toBe(constructionError);

    expect(getLatestResizeObserver().disconnect).toHaveBeenCalledOnce();

    expect(getScrollProgressDebugControlGroupsState().groups).toEqual([]);

    expect(document.querySelector('.scroll-progress-debug-overlay')).toBeNull();
});
