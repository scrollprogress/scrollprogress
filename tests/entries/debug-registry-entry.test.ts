// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    getScrollProgressDebugRegistryState,
    registerScrollProgressDebugItem,
    subscribeScrollProgressDebugRegistry
} from '@scrollprogress/scrollprogress/debug/registry';

import {
    createDebugConsoleLogger,
    type ScrollProgressDebugConsoleLoggerOptions
} from '@scrollprogress/scrollprogress/debug/console';
import { createDebugPalette } from '@scrollprogress/scrollprogress/debug/palette';

import {
    resetScrollProgressTestMocks,
    runAnimationFrame,
    setupScrollProgressTestMocks
} from '../../src/tests/helpers/scroll-progress-test-utils';

function getPaletteContentText(): string {
    return (
        document.querySelector('[data-scroll-progress-debug-palette-content="true"]')
            ?.textContent ?? ''
    );
}

function getPaletteDetailsRowValue(label: string): string | null {
    const rows = Array.from(document.querySelectorAll('.spdp-details-row'));

    const row = rows.find((row) => {
        const rowLabel = row
            .querySelector('.spdp-details-row-label')
            ?.textContent?.trim()
            .replace(/:$/, '');

        return rowLabel === label;
    });

    return row?.querySelector('.spdp-details-row-value')?.textContent?.trim() ?? null;
}

const entryCleanupCallbacks: Array<() => void> = [];

describe('built debug package entries', () => {
    beforeEach(() => {
        setupScrollProgressTestMocks();
    });

    afterEach(() => {
        for (const cleanup of entryCleanupCallbacks.splice(0).reverse()) {
            cleanup();
        }

        resetScrollProgressTestMocks();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('exposes a subscribable registry', () => {
        const subscriber = vi.fn();

        const unsubscribe = subscribeScrollProgressDebugRegistry(subscriber);

        entryCleanupCallbacks.push(unsubscribe);

        expect(subscriber).toHaveBeenLastCalledWith({
            selectedId: null,
            items: []
        });

        const firstItem = registerScrollProgressDebugItem({
            debugId: 'first-headless-entry-item',
            element: document.createElement('div')
        });

        const secondItem = registerScrollProgressDebugItem({
            debugId: 'second-headless-entry-item',
            element: document.createElement('div')
        });

        expect(getScrollProgressDebugRegistryState().items.map((item) => item.id)).toEqual([
            firstItem.id,
            secondItem.id
        ]);

        expect(subscriber).toHaveBeenLastCalledWith(
            expect.objectContaining({
                items: [
                    expect.objectContaining({
                        id: firstItem.id
                    }),
                    expect.objectContaining({
                        id: secondItem.id
                    })
                ]
            })
        );

        const callCountBeforeUnsubscribe = subscriber.mock.calls.length;

        unsubscribe();

        firstItem.update({ label: 'After unsubscribe' });

        expect(subscriber).toHaveBeenCalledTimes(callCountBeforeUnsubscribe);

        firstItem.destroy();
        secondItem.destroy();
    });

    it('shares the debug registry between the headless debug entry and the palette entry', () => {
        const palette = createDebugPalette();

        entryCleanupCallbacks.push(() => {
            palette.destroy();
        });

        const item = registerScrollProgressDebugItem({
            debugId: 'package-entry-demo',
            label: 'Package entry demo',
            element: document.createElement('div'),
            state: {
                progress: 0.25,
                progressDirection: 'forward',
                scrollDirection: 'forward',
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true,
                intersectionRatio: 1
            },
            start: 0.8,
            end: 0.4,
            axis: 'y',
            root: null,
            rootMargin: '0px',
            observerThreshold: 0,
            inverted: false,
            once: false,
            cssVar: null,
            requireRootVisible: false
        });

        runAnimationFrame();

        expect(getPaletteContentText()).toContain('Package entry demo');
        expect(getPaletteContentText()).toContain('25.0%');
        expect(getPaletteDetailsRowValue('axis')).toBeNull();

        const selectedButton = document.querySelector<HTMLButtonElement>(
            `[data-scroll-progress-debug-action="select"]` +
                `[data-scroll-progress-debug-id="${item.id}"]`
        );

        selectedButton?.click();

        runAnimationFrame();

        expect(getPaletteDetailsRowValue('axis')).toBe('y');

        item.update({
            state: {
                progress: 0.75,
                progressDirection: 'forward',
                scrollDirection: 'forward',
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true,
                intersectionRatio: 1
            },
            axis: 'x'
        });

        runAnimationFrame();

        expect(getPaletteContentText()).toContain('75.0%');
        expect(getPaletteDetailsRowValue('axis')).toBe('x');

        item.destroy();
    });

    it('shares the debug registry between the headless debug entry and the console logger entry', () => {
        const table = vi.spyOn(console, 'table').mockImplementation(() => undefined);
        const options: ScrollProgressDebugConsoleLoggerOptions = { throttleMs: 0 };

        const logger = createDebugConsoleLogger(options);

        entryCleanupCallbacks.push(() => {
            logger.destroy();
        });

        const item = registerScrollProgressDebugItem({
            debugId: 'console-entry-demo',
            label: 'Console entry demo',
            element: document.createElement('div'),
            state: {
                progress: 0.25,
                progressDirection: 'forward',
                scrollDirection: 'forward',
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true,
                intersectionRatio: 1
            },
            start: 0.8,
            end: 0.4,
            axis: 'y',
            root: null,
            rootMargin: '0px',
            observerThreshold: 0,
            inverted: false,
            once: false,
            cssVar: null,
            requireRootVisible: false
        });

        expect(table).toHaveBeenCalled();

        expect(table.mock.calls.at(-1)?.[0]).toEqual([
            expect.objectContaining({
                id: 'console-entry-demo',
                label: 'Console entry demo',
                progress: '0.250',
                axis: 'y',
                selected: true
            })
        ]);

        item.update({
            state: {
                progress: 0.75,
                progressDirection: 'forward',
                scrollDirection: 'forward',
                isInObservationArea: true,
                isRootVisible: true,
                isTracking: true,
                intersectionRatio: 1
            },
            axis: 'x'
        });

        expect(table.mock.calls.at(-1)?.[0]).toEqual([
            expect.objectContaining({
                id: 'console-entry-demo',
                label: 'Console entry demo',
                progress: '0.750',
                axis: 'x',
                selected: true
            })
        ]);

        item.destroy();
    });
});
