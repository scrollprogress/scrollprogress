// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetScrollProgressDebugControlGroups } from '../../../lib/debug/controls/registry';
import { createDebugOverlay } from '../../../lib/debug/overlay/overlay';
import {
    registerScrollProgressDebugItem,
    resetScrollProgressDebugRegistry,
    unregisterScrollProgressDebugItem,
    updateScrollProgressDebugItem
} from '../../../lib/debug/registry';

import { createTestRect } from './helpers';

let overlay: ReturnType<typeof createDebugOverlay> | undefined;

afterEach(() => {
    overlay?.destroy();
    overlay = undefined;

    vi.useRealTimers();
    vi.restoreAllMocks();
    resetScrollProgressDebugControlGroups();
    resetScrollProgressDebugRegistry();
    document.body.innerHTML = '';
});

describe('scroll progress debug overlay registry synchronization', () => {
    it('coalesces registry-driven layer bounds sync on the next animation frame', () => {
        vi.useFakeTimers();

        overlay = createDebugOverlay();
        const target = document.createElement('div');
        const getBoundingClientRect = vi.fn(() => createTestRect(10, 20, 300, 150));

        target.getBoundingClientRect = getBoundingClientRect;

        const itemId = registerScrollProgressDebugItem({
            element: target
        });

        updateScrollProgressDebugItem(itemId, {
            label: 'Updated once'
        });
        updateScrollProgressDebugItem(itemId, {
            label: 'Updated twice'
        });

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(getBoundingClientRect).not.toHaveBeenCalled();
        expect(targetLayer?.dataset.hasGeometry).toBe('false');

        vi.advanceTimersToNextFrame();

        expect(getBoundingClientRect).toHaveBeenCalledTimes(2);
        expect(targetLayer?.dataset.hasGeometry).toBe('true');
        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');
        expect(targetLayer?.style.width).toBe('300px');
        expect(targetLayer?.style.height).toBe('150px');

        vi.advanceTimersToNextFrame();

        expect(getBoundingClientRect).toHaveBeenCalledTimes(2);
    });

    it('cancels scheduled layer bounds sync on destroy', () => {
        vi.useFakeTimers();

        overlay = createDebugOverlay();
        const target = document.createElement('div');
        const getBoundingClientRect = vi.fn(() => createTestRect(10, 20, 300, 150));

        target.getBoundingClientRect = getBoundingClientRect;

        registerScrollProgressDebugItem({
            element: target
        });

        overlay.destroy();

        vi.advanceTimersToNextFrame();

        expect(getBoundingClientRect).not.toHaveBeenCalled();
        expect(document.querySelector('.scroll-progress-debug-overlay')).toBeNull();
    });

    it('resets all overlay layer geometry when the only selected item is unregistered', () => {
        vi.useFakeTimers();

        const target = document.createElement('div');

        target.getBoundingClientRect = vi.fn(() => createTestRect(10, 20, 300, 150));

        const itemId = registerScrollProgressDebugItem({
            element: target
        });

        overlay = createDebugOverlay();

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.dataset.hasGeometry).toBe('true');
        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');
        expect(targetLayer?.style.width).toBe('300px');
        expect(targetLayer?.style.height).toBe('150px');

        unregisterScrollProgressDebugItem(itemId);

        vi.advanceTimersToNextFrame();

        expectOverlayLayersToBeReset();
    });

    it('syncs overlay geometry to the next selected item when the selected item is unregistered', () => {
        vi.useFakeTimers();

        const firstTarget = document.createElement('div');
        const secondTarget = document.createElement('div');

        firstTarget.getBoundingClientRect = vi.fn(() => createTestRect(10, 20, 300, 150));

        secondTarget.getBoundingClientRect = vi.fn(() => createTestRect(80, 120, 240, 90));

        const firstItemId = registerScrollProgressDebugItem({
            element: firstTarget
        });

        registerScrollProgressDebugItem({
            element: secondTarget
        });

        overlay = createDebugOverlay();

        const targetLayer = document.querySelector<HTMLElement>('[data-layer="target"]');

        expect(targetLayer?.style.transform).toBe('translate3d(10px, 20px, 0)');
        expect(targetLayer?.style.width).toBe('300px');
        expect(targetLayer?.style.height).toBe('150px');

        unregisterScrollProgressDebugItem(firstItemId);

        vi.advanceTimersToNextFrame();

        expect(targetLayer?.dataset.hasGeometry).toBe('true');
        expect(targetLayer?.style.transform).toBe('translate3d(80px, 120px, 0)');
        expect(targetLayer?.style.width).toBe('240px');
        expect(targetLayer?.style.height).toBe('90px');
    });

    it('does not run pending unregister-driven sync after destroy', () => {
        vi.useFakeTimers();

        const target = document.createElement('div');

        target.getBoundingClientRect = vi.fn(() => createTestRect(10, 20, 300, 150));

        const itemId = registerScrollProgressDebugItem({
            element: target
        });

        overlay = createDebugOverlay();

        unregisterScrollProgressDebugItem(itemId);
        overlay.destroy();

        expect(() => {
            vi.advanceTimersToNextFrame();
        }).not.toThrow();

        expect(document.querySelector('.scroll-progress-debug-overlay')).toBeNull();
    });

    it('resets viewport root margin guides when the only selected item is unregistered', () => {
        vi.useFakeTimers();

        const target = document.createElement('div');

        const itemId = registerScrollProgressDebugItem({
            element: target,
            rootMargin: '10% 48px -6% 24px'
        });

        overlay = createDebugOverlay();

        const marginLayer = document.querySelector<HTMLElement>('[data-layer="margin"]');

        expect(marginLayer).toBeInstanceOf(HTMLDivElement);

        const sides = ['top', 'right', 'bottom', 'left'] as const;

        for (const side of sides) {
            const guideElement = marginLayer?.querySelector<HTMLElement>(
                `.spdo-margin-guide-${side}`
            );

            const labelElement = guideElement?.querySelector<HTMLElement>(
                '.spdo-margin-guide-label'
            );

            expect(guideElement?.dataset.state).not.toBe('hidden');
            expect(labelElement?.textContent).not.toBe('');

            expect(marginLayer?.style.getPropertyValue(`--spdo-margin-offset-${side}`)).not.toBe(
                ''
            );
        }

        unregisterScrollProgressDebugItem(itemId);

        vi.advanceTimersToNextFrame();

        for (const side of sides) {
            const guideElement = marginLayer?.querySelector<HTMLElement>(
                `.spdo-margin-guide-${side}`
            );

            const labelElement = guideElement?.querySelector<HTMLElement>(
                '.spdo-margin-guide-label'
            );

            expect(guideElement?.dataset.state).toBe('hidden');
            expect(labelElement?.textContent).toBe('');

            expect(marginLayer?.style.getPropertyValue(`--spdo-margin-offset-${side}`)).toBe('');
        }
    });
});

function expectOverlayLayersToBeReset(): void {
    const layerElements = Array.from(document.querySelectorAll<HTMLElement>('[data-layer]'));

    expect(layerElements).toHaveLength(5);

    for (const layerElement of layerElements) {
        expect(layerElement.dataset.hasGeometry).toBe('false');
        expect(layerElement.style.transform).toBe('');
        expect(layerElement.style.width).toBe('');
        expect(layerElement.style.height).toBe('');
    }
}
